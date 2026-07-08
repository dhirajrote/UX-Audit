// /api/_auth.js
// Minimal signed-cookie session auth. No extra auth library/dependency for
// sessions themselves — just HMAC-signed, expiring tokens in an HttpOnly
// cookie. Password hashing for registered users uses bcryptjs (see
// api/register.js and api/auth.js).
//
// Env vars required (Vercel Project Settings -> Environment Variables, or a
// local .env for `vercel dev`):
//   SESSION_SECRET       - any long random string, used to sign session tokens (required, private)
//   AUTH_USERNAME        - optional override for the built-in admin username (defaults to "dheerajrote")
//   AUTH_PASSWORD        - optional override for the built-in admin password (defaults to "Qwerty123!@#")
//
// Session payload: { uid, u (username), a (isAdmin), exp }
// `uid` is what api/state.js uses to scope each user's data — the admin
// account always uses uid "admin"; registered users use their users.id.

import crypto from "node:crypto";

const COOKIE_NAME = "annotex_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ADMIN_UID = "admin";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signSession({ uid, username, isAdmin }, secret) {
  const payload = { uid, u: username, a: !!isAdmin, exp: Date.now() + SESSION_TTL_MS };
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

export function requireAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null; // requireAuth already sent the 401
  if (!session.a) {
    res.status(403).json({ error: "Admin access required." });
    return null;
  }
  return session;
}

export { COOKIE_NAME };
