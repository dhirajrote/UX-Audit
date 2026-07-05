// /api/auth.js
// POST { username, password }  -> logs in, sets session cookie
// GET                          -> reports current session ({ authenticated, username })
// DELETE                       -> logs out (clears cookie)

import crypto from "node:crypto";
import { signSession, setSessionCookie, clearSessionCookie, getSessionFromRequest } from "./_auth.js";

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
  const authUser = process.env.AUTH_USERNAME;
  const authPass = process.env.AUTH_PASSWORD;

  if (req.method === "GET") {
    const session = getSessionFromRequest(req);
    return res.status(200).json({ authenticated: !!session, username: session?.u || null });
  }

  if (req.method === "POST") {
    if (!secret || !authUser || !authPass) {
      return res.status(500).json({
        error: "Auth is not configured on the server. Set AUTH_USERNAME, AUTH_PASSWORD, and SESSION_SECRET.",
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
