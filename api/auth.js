// /api/auth.js
// POST { username, password }  -> logs in, sets session cookie
// GET                          -> reports current session ({ authenticated, username })
// DELETE                       -> logs out (clears cookie)
//
// NOTE: AUTH_USERNAME / AUTH_PASSWORD are hardcoded below at the user's
// explicit request. Because this repo is public, that means these
// credentials are visible to anyone who reads the source — they function
// as a light gate, not a secret. If you want them private again later,
// set AUTH_USERNAME / AUTH_PASSWORD as environment variables instead;
// those take priority over the hardcoded values below.
//
// SESSION_SECRET is intentionally NOT hardcoded here — it's the key used to
// sign session cookies. If it were in the public source, anyone could forge
// a valid "logged in" cookie without ever knowing the password. It must
// stay a private environment variable (see .env.example / README).

import crypto from "node:crypto";
import { signSession, setSessionCookie, clearSessionCookie, getSessionFromRequest } from "./_auth.js";

const DEFAULT_AUTH_USERNAME = "dheerajrote";
const DEFAULT_AUTH_PASSWORD = "Qwerty123!@#";

function timingSafeStringEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    // still run a comparison of equal length to avoid leaking length via timing
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default async function handler(req, res) {
  const secret = process.env.SESSION_SECRET;
  const authUser = process.env.AUTH_USERNAME || DEFAULT_AUTH_USERNAME;
  const authPass = process.env.AUTH_PASSWORD || DEFAULT_AUTH_PASSWORD;

  if (req.method === "GET") {
    const session = getSessionFromRequest(req);
    return res.status(200).json({ authenticated: !!session, username: session?.u || null });
  }

  if (req.method === "POST") {
    if (!secret) {
      return res.status(500).json({
        error: "Auth is not fully configured on the server. Set SESSION_SECRET.",
      });
    }
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    const userOk = timingSafeStringEqual(username, authUser);
    const passOk = timingSafeStringEqual(password, authPass);
    if (!userOk || !passOk) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const token = signSession(username, secret);
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true, username });
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
