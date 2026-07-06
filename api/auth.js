// /api/auth.js
// POST { username, password }  -> logs in (admin or registered user), sets session cookie
// GET                          -> reports current session ({ authenticated, username, isAdmin })
// DELETE                       -> logs out (clears cookie)
//
// Login checks, in order:
//   1. The built-in admin account (username/password hardcoded below at the
//      user's explicit request — see the note in the original commit; this
//      repo is public, so these are a light gate, not a secret. Override with
//      AUTH_USERNAME / AUTH_PASSWORD env vars if you want them private again).
//   2. Registered users in the `users` Supabase table (see api/register.js),
//      verified with bcrypt.
//
// SESSION_SECRET is intentionally NOT hardcoded — see api/_auth.js.

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { signSession, setSessionCookie, clearSessionCookie, getSessionFromRequest, ADMIN_UID } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

const DEFAULT_AUTH_USERNAME = "dheerajrote";
const DEFAULT_AUTH_PASSWORD = "Qwerty123!@#";

function timingSafeStringEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf); // keep timing consistent even on length mismatch
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default async function handler(req, res) {
  const secret = process.env.SESSION_SECRET;
  const adminUser = process.env.AUTH_USERNAME || DEFAULT_AUTH_USERNAME;
  const adminPass = process.env.AUTH_PASSWORD || DEFAULT_AUTH_PASSWORD;

  if (req.method === "GET") {
    const session = getSessionFromRequest(req);
    return res.status(200).json({ authenticated: !!session, username: session?.u || null, isAdmin: !!session?.a });
  }

  if (req.method === "POST") {
    if (!secret) {
      return res.status(500).json({ error: "Auth is not fully configured on the server. Set SESSION_SECRET." });
    }
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    // 1) Built-in admin account
    if (timingSafeStringEqual(username, adminUser) && timingSafeStringEqual(password, adminPass)) {
      const token = signSession({ uid: ADMIN_UID, username: adminUser, isAdmin: true }, secret);
      setSessionCookie(res, token);
      return res.status(200).json({ ok: true, username: adminUser, isAdmin: true });
    }

    // 2) Registered users
    let supabase;
    try {
      supabase = getSupabase();
    } catch (e) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password_hash")
      .eq("username", String(username).trim().toLowerCase())
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const passOk = await bcrypt.compare(password, user.password_hash);
    if (!passOk) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const token = signSession({ uid: user.id, username: user.username, isAdmin: false }, secret);
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true, username: user.username, isAdmin: false });
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
