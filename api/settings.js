// /api/settings.js
// GET /api/settings -> PUBLIC (no login required). Returns { primaryColor, defaultTheme }.
//                      Needed before anyone is logged in (landing page, login screen).
// PUT /api/settings -> admin only. body: { primaryColor?, defaultTheme? }

import { requireAdmin } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

const DEFAULTS = { primaryColor: "#3B5BDB", defaultTheme: "dark" };
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default async function handler(req, res) {
  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    // No Supabase configured — fall back to defaults rather than erroring the
    // landing/login screens out.
    if (req.method === "GET") return res.status(200).json(DEFAULTS);
    return res.status(500).json({ error: err.message });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", "global").maybeSingle();
    if (error) return res.status(200).json(DEFAULTS); // don't break the landing page over a DB hiccup
    return res.status(200).json({
      primaryColor: data?.primary_color || DEFAULTS.primaryColor,
      defaultTheme: data?.default_theme || DEFAULTS.defaultTheme,
    });
  }

  const session = requireAdmin(req, res);
  if (!session) return; // requireAdmin already sent 401/403

  if (req.method === "PUT") {
    const { primaryColor, defaultTheme } = req.body || {};
    if (primaryColor && !HEX_RE.test(primaryColor)) return res.status(400).json({ error: "primaryColor must be a hex color like #3B5BDB." });
    if (defaultTheme && !["light", "dark"].includes(defaultTheme)) return res.status(400).json({ error: "defaultTheme must be 'light' or 'dark'." });

    const patch = { id: "global", updated_at: new Date().toISOString() };
    if (primaryColor) patch.primary_color = primaryColor;
    if (defaultTheme) patch.default_theme = defaultTheme;

    const { error } = await supabase.from("app_settings").upsert(patch, { onConflict: "id" });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
