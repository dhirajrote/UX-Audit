// /api/packages.js
// GET    /api/packages          -> list packages. PUBLIC (no login required) so the marketing
//                                   landing page can show pricing; admins additionally see inactive ones.
// POST   /api/packages          -> create a package (admin only)
// PUT    /api/packages          -> update a package (admin only), body: { id, ...fields }
// DELETE /api/packages?id=...   -> delete a package (admin only) — blocked if any subscription references it

import { requireAdmin, getSessionFromRequest } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

export default async function handler(req, res) {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const session = getSessionFromRequest(req); // may be null — that's fine, GET is public
    let query = supabase.from("packages").select("*").order("display_order", { ascending: true });
    if (!session?.a) query = query.eq("status", "active");
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ packages: data || [] });
  }

  const session = requireAdmin(req, res);
  if (!session) return; // requireAdmin already sent 401/403

  if (req.method === "POST") {
    const b = req.body || {};
    if (!b.name || !b.name.trim()) return res.status(400).json({ error: "Package name is required." });

    if (b.is_default) {
      await supabase.from("packages").update({ is_default: false }).eq("is_default", true);
    }
    const { data, error } = await supabase
      .from("packages")
      .insert({
        name: b.name.trim(),
        description: b.description || "",
        price: b.price ?? 0,
        yearly_price: b.yearly_price ?? null,
        billing_cycle: b.billing_cycle || "monthly",
        features: b.features || [],
        user_limit: b.user_limit ?? null,
        storage_limit: b.storage_limit || null,
        is_trial: !!b.is_trial,
        is_enterprise: !!b.is_enterprise,
        is_default: !!b.is_default,
        trial_days: b.trial_days ?? 15,
        status: b.status || "active",
        display_order: b.display_order ?? 0,
      })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ package: data });
  }

  if (req.method === "PUT") {
    const b = req.body || {};
    if (!b.id) return res.status(400).json({ error: "id is required." });

    if (b.is_default) {
      await supabase.from("packages").update({ is_default: false }).eq("is_default", true);
    }
    const patch = { updated_at: new Date().toISOString() };
    [
      "name", "description", "price", "yearly_price", "billing_cycle", "features",
      "user_limit", "storage_limit", "is_trial", "is_enterprise", "is_default",
      "trial_days", "status", "display_order",
    ].forEach((key) => { if (key in b) patch[key] = b[key]; });

    const { data, error } = await supabase.from("packages").update(patch).eq("id", b.id).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ package: data });
  }

  if (req.method === "DELETE") {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: "id is required." });

    const { count, error: countErr } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("package_id", id);
    if (countErr) return res.status(500).json({ error: countErr.message });
    if (count && count > 0) {
      return res.status(409).json({
        error: `${count} user(s) are currently on this package. Reassign them first, or archive it instead (set Status to Inactive).`,
      });
    }

    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
