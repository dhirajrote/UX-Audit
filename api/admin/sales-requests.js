// /api/admin/sales-requests.js
// Admin-only. View and update "Contact Sales" / "Request a Demo" submissions
// (created by users via POST /api/subscription with action "request_enterprise").
//
// GET /api/admin/sales-requests            -> list all requests, newest first
// PUT /api/admin/sales-requests  body: { id, status } -> status: 'new' | 'contacted' | 'closed'

import { requireAdmin } from "../_auth.js";
import { getSupabase } from "../_supabase.js";

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
    const { data: requests, error } = await supabase.from("sales_requests").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const userIds = [...new Set((requests || []).map((r) => r.user_id))];
    const { data: users } = userIds.length ? await supabase.from("users").select("id, username").in("id", userIds) : { data: [] };
    const usersById = new Map((users || []).map((u) => [u.id, u.username]));

    const { data: packages } = await supabase.from("packages").select("id, name");
    const pkgById = new Map((packages || []).map((p) => [p.id, p.name]));

    const rows = (requests || []).map((r) => ({
      id: r.id,
      username: usersById.get(r.user_id) || r.user_id,
      package: pkgById.get(r.package_id) || null,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));
    return res.status(200).json({ requests: rows });
  }

  if (req.method === "PUT") {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: "id and status are required." });
    const { error } = await supabase.from("sales_requests").update({ status }).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
