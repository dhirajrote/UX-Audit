// /api/subscription.js
// GET  /api/subscription -> the caller's own subscription + package + trial
//                            days remaining + recent history + payments.
//                            Admin account gets a fixed "not billed" shape.
// POST /api/subscription -> self-service actions:
//   { action: "change_plan", packageId, billingCycle }
//     - Only allowed for non-trial, non-enterprise packages (Individual).
//     - Marks the change effective immediately, and records a PENDING
//       payment for the admin to manually confirm/mark paid, since no
//       payment gateway is connected.
//   { action: "cancel" }
//     - Trial: ends immediately. Paid: cancels at the end of the current period.
//   { action: "reactivate" }
//     - Undoes a pending cancel-at-period-end.
//   { action: "request_enterprise", message }
//     - Creates a sales_requests row for the admin to follow up on.

import { requireAuth, ADMIN_UID } from "./_auth.js";
import { getSupabase } from "./_supabase.js";
import { ensureSubscription, reconcileSubscriptionStatus, maybeNotifyTrialExpiring, daysUntil, notify } from "./_billing.js";

const MS_DAY = 24 * 60 * 60 * 1000;

async function loadView(supabase, userId) {
  const sub = await ensureSubscription(supabase, userId);
  if (sub) await maybeNotifyTrialExpiring(supabase, userId, sub);

  let pkg = null;
  if (sub?.package_id) {
    const { data } = await supabase.from("packages").select("*").eq("id", sub.package_id).maybeSingle();
    pkg = data || null;
  }
  const { data: history } = await supabase
    .from("subscription_history").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);
  const { data: payments } = await supabase
    .from("payments").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(20);

  return {
    subscription: sub,
    package: pkg,
    trialDaysRemaining: sub?.status === "trial" ? Math.max(0, daysUntil(sub.trial_ends_at) ?? 0) : null,
    history: history || [],
    payments: payments || [],
  };
}

export default async function handler(req, res) {
  const session = requireAuth(req, res);
  if (!session) return;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (session.uid === ADMIN_UID) {
    if (req.method === "GET") {
      return res.status(200).json({ isAdminAccount: true, subscription: null, package: null, trialDaysRemaining: null, history: [], payments: [] });
    }
    return res.status(400).json({ error: "The admin account isn't billed and has no subscription to change." });
  }

  if (req.method === "GET") {
    const view = await loadView(supabase, session.uid);
    return res.status(200).json({ isAdminAccount: false, ...view });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body || {};
  const current = await ensureSubscription(supabase, session.uid);

  if (action === "change_plan") {
    const { packageId, billingCycle } = req.body || {};
    if (!packageId) return res.status(400).json({ error: "packageId is required." });
    const { data: target } = await supabase.from("packages").select("*").eq("id", packageId).maybeSingle();
    if (!target || target.status !== "active") return res.status(404).json({ error: "That package isn't available." });
    if (target.is_enterprise) return res.status(400).json({ error: "Enterprise plans are set up by our sales team — use \"Contact Sales\" instead." });
    if (target.is_trial) return res.status(400).json({ error: "Trials can't be self-selected — contact the admin if you need trial access restored." });

    const cycle = billingCycle === "yearly" && target.yearly_price != null ? "yearly" : "monthly";
    const amount = cycle === "yearly" ? target.yearly_price : target.price;
    const periodEnd = new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * MS_DAY);

    const { data: currentPkg } = current?.package_id
      ? await supabase.from("packages").select("price").eq("id", current.package_id).maybeSingle()
      : { data: null };
    const actionType = currentPkg && currentPkg.price > (amount || 0) ? "downgraded" : "upgraded";

    const { data: updated, error } = await supabase
      .from("subscriptions")
      .update({
        package_id: target.id,
        status: "active",
        billing_cycle: cycle,
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.uid)
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });

    await supabase.from("subscription_history").insert({
      user_id: session.uid, from_package_id: current?.package_id || null, to_package_id: target.id,
      action: actionType, actor: "user", notes: `Self-service ${actionType} to ${target.name} (${cycle}).`,
    });
    await supabase.from("payments").insert({
      user_id: session.uid, package_id: target.id, amount: amount || 0, billing_cycle: cycle,
      status: "pending", notes: "Awaiting manual confirmation by admin — no payment gateway is connected.",
    });
    await notify(supabase, session.uid, "package_changed", `You're now on ${target.name} (${cycle}). Payment is pending admin confirmation.`);

    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "cancel") {
    if (!current) return res.status(404).json({ error: "No subscription found." });
    if (current.status === "trial") {
      const { data: updated, error } = await supabase
        .from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", session.uid).select("*").single();
      if (error) return res.status(500).json({ error: error.message });
      await supabase.from("subscription_history").insert({ user_id: session.uid, from_package_id: current.package_id, to_package_id: current.package_id, action: "cancelled", actor: "user", notes: "Trial cancelled by user." });
      await notify(supabase, session.uid, "package_changed", "Your trial has been cancelled.");
      return res.status(200).json({ ok: true, subscription: updated });
    }
    const { data: updated, error } = await supabase
      .from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", session.uid).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: session.uid, from_package_id: current.package_id, to_package_id: current.package_id, action: "cancelled", actor: "user", notes: "Cancellation scheduled for end of current billing period." });
    await notify(supabase, session.uid, "package_changed", "Your subscription will end at the close of the current billing period.");
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "reactivate") {
    if (!current) return res.status(404).json({ error: "No subscription found." });
    const { data: updated, error } = await supabase
      .from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq("user_id", session.uid).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: session.uid, from_package_id: current.package_id, to_package_id: current.package_id, action: "reactivated", actor: "user", notes: "Scheduled cancellation undone." });
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "request_enterprise") {
    const { packageId, message } = req.body || {};
    const { error } = await supabase.from("sales_requests").insert({ user_id: session.uid, package_id: packageId || null, message: message || "" });
    if (error) return res.status(500).json({ error: error.message });
    await notify(supabase, session.uid, "package_changed", "Your request was sent — our team will be in touch soon.");
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action." });
}
