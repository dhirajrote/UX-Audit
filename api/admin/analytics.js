// /api/admin/analytics.js
// GET /api/admin/analytics -> subscription analytics for the admin dashboard.

import { requireAdmin } from "../_auth.js";
import { getSupabase } from "../_supabase.js";

const MS_DAY = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const [{ data: users }, { data: subs }, { data: packages }, { data: payments }, { data: recentHistory }] = await Promise.all([
    supabase.from("users").select("id, username, created_at"),
    supabase.from("subscriptions").select("*"),
    supabase.from("packages").select("id, name, price, is_trial, is_enterprise"),
    supabase.from("payments").select("*"),
    supabase.from("subscription_history").select("*").in("action", ["upgraded", "downgraded"]).order("created_at", { ascending: false }).limit(15),
  ]);

  const usersById = new Map((users || []).map((u) => [u.id, u]));
  const pkgById = new Map((packages || []).map((p) => [p.id, p]));

  const totalTrialUsers = (subs || []).filter((s) => s.status === "trial").length;
  const activePaidUsers = (subs || []).filter((s) => s.status === "active" && !pkgById.get(s.package_id)?.is_trial).length;
  const totalUsers = (users || []).length;
  const conversionRate = totalUsers ? Math.round((activePaidUsers / totalUsers) * 1000) / 10 : 0;

  const byPackage = {};
  (subs || []).forEach((s) => {
    const pkg = pkgById.get(s.package_id);
    const name = pkg ? pkg.name : "(no package)";
    byPackage[name] = (byPackage[name] || 0) + 1;
  });
  const packageWiseCounts = Object.entries(byPackage).map(([name, count]) => ({ name, count }));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const paidPayments = (payments || []).filter((p) => p.status === "paid" && p.paid_at);
  const monthlyRevenue = paidPayments.filter((p) => new Date(p.paid_at) >= startOfMonth).reduce((s, p) => s + Number(p.amount || 0), 0);
  const annualRevenue = paidPayments.filter((p) => new Date(p.paid_at) >= startOfYear).reduce((s, p) => s + Number(p.amount || 0), 0);

  const soon = new Date(Date.now() + 7 * MS_DAY);
  const expiringSubscriptions = (subs || [])
    .filter((s) => ["trial", "active"].includes(s.status))
    .map((s) => {
      const dateStr = s.status === "trial" ? s.trial_ends_at : s.current_period_end;
      return { ...s, expiresAt: dateStr };
    })
    .filter((s) => s.expiresAt && new Date(s.expiresAt) <= soon && new Date(s.expiresAt) >= now)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    .map((s) => ({
      userId: s.user_id,
      username: usersById.get(s.user_id)?.username || s.user_id,
      status: s.status,
      package: pkgById.get(s.package_id)?.name || null,
      expiresAt: s.expiresAt,
    }));

  const recentChanges = (recentHistory || []).map((h) => ({
    userId: h.user_id,
    username: usersById.get(h.user_id)?.username || h.user_id,
    action: h.action,
    toPackage: pkgById.get(h.to_package_id)?.name || null,
    fromPackage: pkgById.get(h.from_package_id)?.name || null,
    createdAt: h.created_at,
  }));

  return res.status(200).json({
    totalTrialUsers,
    activePaidUsers,
    totalUsers,
    conversionRate,
    packageWiseCounts,
    monthlyRevenue,
    annualRevenue,
    expiringSubscriptions,
    recentlyUpgraded: recentChanges.filter((c) => c.action === "upgraded"),
    recentlyDowngraded: recentChanges.filter((c) => c.action === "downgraded"),
  });
}
