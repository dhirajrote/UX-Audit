// /api/_billing.js
// Shared helpers for subscription/package endpoints.

import { ADMIN_UID } from "./_auth.js";

const MS_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / MS_DAY);
}

// Recomputes a subscription's status against the current date (trial/period
// expiry) and persists the change if it drifted. Returns the (possibly
// updated) subscription row.
export async function reconcileSubscriptionStatus(supabase, sub) {
  if (!sub) return sub;
  const now = Date.now();
  let status = sub.status;

  if (sub.status === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at).getTime() < now) {
    status = "expired";
  } else if (sub.status === "active" && sub.current_period_end && new Date(sub.current_period_end).getTime() < now && !sub.cancel_at_period_end) {
    // Past due with no renewal recorded — in a real system a payment gateway
    // would renew this automatically. Without one, mark it expired so the
    // user is prompted, rather than silently pretending it's still active.
    status = "expired";
  } else if (sub.status === "active" && sub.cancel_at_period_end && sub.current_period_end && new Date(sub.current_period_end).getTime() < now) {
    status = "cancelled";
  }

  if (status !== sub.status) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", sub.id)
      .select("*")
      .single();
    if (!error && data) return data;
  }
  return sub;
}

// Ensures a subscription row exists for this user, creating a trial
// subscription against the default package if none exists yet (covers
// accounts created before this feature shipped, and the admin account is
// exempt entirely — callers should special-case ADMIN_UID before this).
export async function ensureSubscription(supabase, userId) {
  const { data: existing } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return reconcileSubscriptionStatus(supabase, existing);

  const { data: defaultPkg } = await supabase
    .from("packages")
    .select("*")
    .eq("is_default", true)
    .eq("status", "active")
    .maybeSingle();

  const now = new Date();
  const trialDays = defaultPkg?.trial_days ?? 15;
  const trialEnds = new Date(now.getTime() + trialDays * MS_DAY);

  const { data: created, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      package_id: defaultPkg?.id || null,
      status: defaultPkg ? "trial" : "expired",
      billing_cycle: null,
      started_at: now.toISOString(),
      trial_ends_at: defaultPkg ? trialEnds.toISOString() : null,
      current_period_end: null,
    })
    .select("*")
    .single();

  if (!error && created) {
    await supabase.from("subscription_history").insert({
      user_id: userId,
      from_package_id: null,
      to_package_id: defaultPkg?.id || null,
      action: "trial_started",
      actor: "user",
      notes: "Auto-assigned on first access.",
    });
  }
  return created || existing;
}

export async function notify(supabase, userId, type, message) {
  await supabase.from("notifications").insert({ user_id: userId, type, message });
}

// Lazily creates a "trial expiring soon" notification at most once per day
// per user, called whenever we load their subscription view.
export async function maybeNotifyTrialExpiring(supabase, userId, sub) {
  if (!sub || sub.status !== "trial" || !sub.trial_ends_at) return;
  const remaining = daysUntil(sub.trial_ends_at);
  if (remaining === null || remaining > 3 || remaining < 0) return;

  const since = new Date(Date.now() - MS_DAY).toISOString();
  const { data: recent } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "trial_expiring")
    .gte("created_at", since)
    .maybeSingle();
  if (recent) return;

  await notify(supabase, userId, "trial_expiring", `Your free trial ends in ${remaining} day${remaining === 1 ? "" : "s"}. Upgrade anytime from Billing.`);
}

export function isAdminUser(userId) {
  return userId === ADMIN_UID;
}
