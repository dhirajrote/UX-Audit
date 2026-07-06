// /api/users.js
// Admin-only user management. Every request here requires an authenticated
// session with isAdmin=true (the built-in dheerajrote account) — registered
// users get a 403 if they try to hit this endpoint directly.
//
// GET    /api/users                          -> { users: [{ id, username, createdAt }] }
// PUT    /api/users   body: { id, newPassword } -> admin-resets a user's password
// DELETE /api/users?id=...                    -> deletes the user AND their app_state row

import bcrypt from "bcryptjs";
import { requireAdmin, ADMIN_UID } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  const session = requireAdmin(req, res);
  if (!session) return; // requireAdmin already sent 401/403

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, created_at")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Best-effort: attach whether each user has any saved app state yet.
    const { data: stateRows } = await supabase.from("app_state").select("id");
    const stateIds = new Set((stateRows || []).map((r) => r.id));

    const users = (data || []).map((u) => ({
      id: u.id,
      username: u.username,
      createdAt: u.created_at,
      hasData: stateIds.has(u.id),
    }));
    return res.status(200).json({ users });
  }

  if (req.method === "PUT") {
    const { id, newPassword } = req.body || {};
    if (!id || !newPassword) return res.status(400).json({ error: "id and newPassword are required." });
    if (String(newPassword).length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    if (id === ADMIN_UID) return res.status(400).json({ error: "The admin account's password is set via environment variables, not here." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: "id is required." });
    if (id === ADMIN_UID) return res.status(400).json({ error: "The admin account can't be deleted." });

    const { error: userErr } = await supabase.from("users").delete().eq("id", id);
    if (userErr) return res.status(500).json({ error: userErr.message });
    // Clean up their saved audit data too, so it doesn't linger orphaned.
    await supabase.from("app_state").delete().eq("id", id);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
