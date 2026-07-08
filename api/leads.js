// /api/leads.js
// POST /api/leads   -> PUBLIC, no login required. Landing page lead capture
//                      (name, email, company, message, interestedPackage).
// GET  /api/leads   -> admin only. List all leads, newest first.
// PUT  /api/leads   -> admin only. body: { id, status?, notes? }

import { requireAdmin } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "POST") {
    const { name, email, company, message, interestedPackage } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: "A valid email is required." });

    const { error } = await supabase.from("leads").insert({
      name: name.trim(), email: email.trim(), company: (company || "").trim() || null,
      message: (message || "").trim() || null, interested_package: interestedPackage || null,
      source: "landing_page",
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true });
  }

  const session = requireAdmin(req, res);
  if (!session) return; // requireAdmin already sent 401/403

  if (req.method === "GET") {
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ leads: data || [] });
  }

  if (req.method === "PUT") {
    const { id, status, notes } = req.body || {};
    if (!id) return res.status(400).json({ error: "id is required." });
    const patch = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (notes !== undefined) patch.notes = notes;
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
