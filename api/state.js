// /api/state.js
// Vercel serverless function: reads/writes one user's whole app state
// (projects, screen types, areas, severities, theme) as a single JSON
// document in Supabase Postgres.
//
// The row id is ALWAYS derived from the caller's own authenticated session
// (session.uid) — never from a client-supplied id/query param — so one
// account can never read or write another account's data.
//
// GET  /api/state   -> { data: {...} } or { data: null }
// PUT  /api/state   -> body: {...}  -> upserts, returns { ok: true }

import { getSupabase } from "./_supabase.js";
import { requireAuth } from "./_auth.js";

const TABLE = "app_state";

export default async function handler(req, res) {
  const session = requireAuth(req, res);
  if (!session) return; // requireAuth already sent the 401 response

  const id = session.uid;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase.from(TABLE).select("data").eq("id", id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: data ? data.data : null });
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = req.body || {};
    const { error } = await supabase.from(TABLE).upsert(
      { id, data: body, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
