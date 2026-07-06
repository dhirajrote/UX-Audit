// /api/register.js
// POST { username, password } -> creates a new user account, then logs them
// in immediately (sets the session cookie), same as api/auth.js would.
//
// Registration is open to anyone who can reach this endpoint (no invite
// code, no admin approval). Each registered user gets a private `uid` used
// to scope their own data in api/state.js — accounts never see each other's
// projects.

import bcrypt from "bcryptjs";
import { signSession, setSessionCookie } from "./_auth.js";
import { getSupabase } from "./_supabase.js";
import { buildInitialState } from "./_seedData.js";

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "Auth is not fully configured on the server. Set SESSION_SECRET." });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const cleanUsername = String(username).trim().toLowerCase();
  if (!USERNAME_RE.test(cleanUsername)) {
    return res.status(400).json({ error: "Username must be 3-32 characters: letters, numbers, dots, dashes, or underscores." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (cleanUsername === "admin" || cleanUsername === "dheerajrote") {
    return res.status(400).json({ error: "That username is reserved." });
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { data: existing, error: lookupErr } = await supabase
    .from("users")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();
  if (lookupErr) return res.status(500).json({ error: lookupErr.message });
  if (existing) return res.status(409).json({ error: "That username is already taken." });

  const passwordHash = await bcrypt.hash(password, 10);
  const { data: created, error: insertErr } = await supabase
    .from("users")
    .insert({ username: cleanUsername, password_hash: passwordHash })
    .select("id, username")
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Best-effort: give every new account 2 sample projects to start from,
  // so the app isn't a blank slate on first login. Never blocks registration
  // if this write fails for some reason — the account itself is already created.
  try {
    await supabase.from("app_state").upsert(
      { id: created.id, data: buildInitialState(), updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  } catch (e) { /* non-fatal — user just starts with an empty workspace */ }

  const token = signSession({ uid: created.id, username: created.username, isAdmin: false }, secret);
  setSessionCookie(res, token);
  return res.status(201).json({ ok: true, username: created.username, isAdmin: false });
}
