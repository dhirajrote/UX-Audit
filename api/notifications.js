// /api/notifications.js
// GET /api/notifications          -> the caller's own notifications (newest first, limit 30)
// PUT /api/notifications  body: { id } | { all: true } -> mark as read

import { requireAuth, ADMIN_UID } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  const session = requireAuth(req, res);
  if (!session) return;

  if (session.uid === ADMIN_UID) {
    return res.status(200).json({ notifications: [], unreadCount: 0 });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("notifications").select("*").eq("user_id", session.uid)
      .order("created_at", { ascending: false }).limit(30);
    if (error) return res.status(500).json({ error: error.message });
    const unreadCount = (data || []).filter((n) => !n.read).length;
    return res.status(200).json({ notifications: data || [], unreadCount });
  }

  if (req.method === "PUT") {
    const { id, all } = req.body || {};
    if (all) {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", session.uid).eq("read", false);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (id) {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", session.uid);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "id or all is required." });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
