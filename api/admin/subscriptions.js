// /api/admin/subscriptions.js
// Admin-only. Manage every registered user's subscription.
//
// GET  /api/admin/subscriptions               -> overview list, all users + their subscription/package
// GET  /api/admin/subscriptions?userId=...    -> one user's full detail: subscription, package, history, payments
// PUT  /api/admin/subscriptions                body: { userId, action, ...params }
//   action: "assign_package" | "convert_trial_to_paid"  params: { packageId, billingCycle }
//   action: "extend_trial"                              params: { days }
//   action: "end_trial"
//   action: "activate"
//   action: "deactivate"
//   action: "extend_subscription"                        params: { days }
//   action: "record_payment"                             params: { amount, billingCycle, status, notes }

import { requireAdmin } from "../_auth.js";
import { getSupabase } from "../_supabase.js";
import { reconcileSubscriptionStatus, daysUntil, notify } from "../_billing.js";

const MS_DAY = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const userId = req.query && req.query.userId;

    if (userId) {
      const { data: user } = await supabase.from("users").select("id, username, created_at").eq("id", userId).maybeSingle();
      if (!user) return res.status(404).json({ error: "User not found." });
      let { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
      if (sub) sub = await reconcileSubscriptionStatus(supabase, sub);
      const pkg = sub?.package_id ? (await supabase.from("packages").select("*").eq("id", sub.package_id).maybeSingle()).data : null;
      const { data: history } = await supabase.from("subscription_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      const { data: payments } = await supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      return res.status(200).json({ user, subscription: sub, package: pkg, history: history || [], payments: payments || [] });
    }

    const { data: users } = await supabase.from("users").select("id, username, created_at").order("created_at", { ascending: false });
    const { data: subs } = await supabase.from("subscriptions").select("*");
    const { data: packages } = await supabase.from("packages").select("id, name, price, yearly_price, is_trial, is_enterprise");

    const subsByUser = new Map((subs || []).map((s) => [s.user_id, s]));
    const pkgById = new Map((packages || []).map((p) => [p.id, p]));

    const rows = (users || []).map((u) => {
      const sub = subsByUser.get(u.id) || null;
      const pkg = sub?.package_id ? pkgById.get(sub.package_id) : null;
      return {
        id: u.id,
        username: u.username,
        createdAt: u.created_at,
        subscription: sub,
        package: pkg || null,
        trialDaysRemaining: sub?.status === "trial" ? Math.max(0, daysUntil(sub.trial_ends_at) ?? 0) : null,
      };
    });
    return res.status(200).json({ users: rows });
  }

  if (req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, action } = req.body || {};
  if (!userId || !action) return res.status(400).json({ error: "userId and action are required." });

  const { data: current } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();

  if (action === "assign_package" || action === "convert_trial_to_paid") {
    const { packageId, billingCycle } = req.body || {};
    if (!packageId) return res.status(400).json({ error: "packageId is required." });
    const { data: target } = await supabase.from("packages").select("*").eq("id", packageId).maybeSingle();
    if (!target) return res.status(404).json({ error: "Package not found." });

    const cycle = target.is_trial || target.is_enterprise ? null : (billingCycle === "yearly" && target.yearly_price != null ? "yearly" : "monthly");
    const patch = {
      package_id: target.id,
      status: target.is_trial ? "trial" : "active",
      billing_cycle: cycle,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    };
    if (target.is_trial) {
      patch.trial_ends_at = new Date(Date.now() + (target.trial_days || 15) * MS_DAY).toISOString();
      patch.current_period_end = null;
    } else {
      patch.trial_ends_at = null;
      patch.current_period_end = target.is_enterprise ? null : new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * MS_DAY).toISOString();
    }

    let updated;
    if (current) {
      const r = await supabase.from("subscriptions").update(patch).eq("user_id", userId).select("*").single();
      updated = r.data;
      if (r.error) return res.status(500).json({ error: r.error.message });
    } else {
      const r = await supabase.from("subscriptions").insert({ user_id: userId, started_at: new Date().toISOString(), ...patch }).select("*").single();
      updated = r.data;
      if (r.error) return res.status(500).json({ error: r.error.message });
    }

    await supabase.from("subscription_history").insert({
      user_id: userId, from_package_id: current?.package_id || null, to_package_id: target.id,
      action: action === "convert_trial_to_paid" ? "upgraded" : "admin_assigned", actor: "admin",
      notes: `Admin assigned ${target.name}${cycle ? ` (${cycle})` : ""}.`,
    });
    await notify(supabase, userId, "package_changed", `An admin moved your account to ${target.name}.`);
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (!current) return res.status(404).json({ error: "This user has no subscription yet." });

  if (action === "extend_trial") {
    const days = Number((req.body || {}).days) || 7;
    const base = current.trial_ends_at && new Date(current.trial_ends_at).getTime() > Date.now() ? new Date(current.trial_ends_at).getTime() : Date.now();
    const newEnd = new Date(base + days * MS_DAY).toISOString();
    const { data: updated, error } = await supabase.from("subscriptions").update({ trial_ends_at: newEnd, status: "trial", updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: userId, from_package_id: current.package_id, to_package_id: current.package_id, action: "trial_extended", actor: "admin", notes: `Trial extended by ${days} day(s).` });
    await notify(supabase, userId, "package_changed", `Your trial was extended by ${days} day(s).`);
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "end_trial") {
    const { data: updated, error } = await supabase.from("subscriptions").update({ trial_ends_at: new Date().toISOString(), status: "expired", updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: userId, from_package_id: current.package_id, to_package_id: current.package_id, action: "trial_ended", actor: "admin", notes: "Trial ended immediately by admin." });
    await notify(supabase, userId, "package_changed", "Your trial has ended.");
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "activate") {
    const { data: updated, error } = await supabase.from("subscriptions").update({ status: "active", cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: userId, from_package_id: current.package_id, to_package_id: current.package_id, action: "reactivated", actor: "admin", notes: "Activated by admin." });
    await notify(supabase, userId, "package_changed", "Your subscription has been activated.");
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "deactivate") {
    const { data: updated, error } = await supabase.from("subscriptions").update({ status: "cancelled", cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: userId, from_package_id: current.package_id, to_package_id: current.package_id, action: "cancelled", actor: "admin", notes: "Deactivated by admin." });
    await notify(supabase, userId, "package_changed", "Your subscription has been deactivated by an admin.");
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "extend_subscription") {
    const days = Number((req.body || {}).days) || 30;
    const base = current.current_period_end && new Date(current.current_period_end).getTime() > Date.now() ? new Date(current.current_period_end).getTime() : Date.now();
    const newEnd = new Date(base + days * MS_DAY).toISOString();
    const { data: updated, error } = await supabase.from("subscriptions").update({ current_period_end: newEnd, status: "active", updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    await supabase.from("subscription_history").insert({ user_id: userId, from_package_id: current.package_id, to_package_id: current.package_id, action: "renewed", actor: "admin", notes: `Extended by ${days} day(s).` });
    await notify(supabase, userId, "renewal", `Your subscription was extended by ${days} day(s).`);
    return res.status(200).json({ ok: true, subscription: updated });
  }

  if (action === "record_payment") {
    const { amount, billingCycle, status, notes } = req.body || {};
    const { error } = await supabase.from("payments").insert({
      user_id: userId, package_id: current.package_id, amount: Number(amount) || 0,
      billing_cycle: billingCycle || current.billing_cycle || null,
      status: status || "paid", paid_at: (status || "paid") === "paid" ? new Date().toISOString() : null,
      notes: notes || "Recorded manually by admin.",
    });
    if (error) return res.status(500).json({ error: error.message });
    await notify(supabase, userId, (status || "paid") === "paid" ? "payment_success" : "payment_failed", (status || "paid") === "paid" ? "Payment received — thank you!" : "A payment on your account needs attention.");
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown action." });
}
