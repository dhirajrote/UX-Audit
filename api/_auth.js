// /api/_auth.js
// Minimal signed-cookie session auth. No extra auth library/dependency —
// just HMAC-signed, expiring tokens stored in an HttpOnly cookie.
//
// Env vars required (set in Vercel Project Settings -> Environment Variables,
// or a local .env for `vercel dev`):
//   AUTH_USERNAME      - the login username
//   AUTH_PASSWORD      - the login password
//   SESSION_SECRET     - any long random string, used to sign session tokens
//
// This is single-user, basic auth suitable for a personal/internal tool.
// It is NOT a substitute for a real identity system if you ever need
// multiple users with separate accounts (Supabase Auth would be the
// natural upgrade path for that).

import crypto from "node:crypto";

const COOKIE_NAME = "auditlane_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signSession(username, secret) {
  const payload = { u: username, exp: Date.now() + SESSION_TTL_MS };
  const data = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig || "", "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function getSessionFromRequest(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const token = req.cookies ? req.cookies[COOKIE_NAME] : parseCookieHeader(req.headers?.cookie)[COOKIE_NAME];
  return verifySession(token, secret);
}

function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

export function requireAuth(req, res) {
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return session;
}

export { COOKIE_NAME };
