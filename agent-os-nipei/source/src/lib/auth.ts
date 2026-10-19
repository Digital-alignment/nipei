import { createHmac, timingSafeEqual } from "crypto";

// Signed, expiring tokens: base64url(JSON payload) + "." + HMAC-SHA256.
// `purpose` scopes a token so a session cookie can never be replayed as another
// kind of link (e.g. the upcoming per-member verification form: purpose "member-verify").

export const SESSION_COOKIE = "nipei_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = { purpose: string; sub: string; exp: number };

function hmac(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signToken(purpose: string, sub: string, ttlSeconds: number): string {
  const secret = process.env.NIPEI_AUTH_SECRET;
  if (!secret) throw new Error("NIPEI_AUTH_SECRET is not set");
  const payload: TokenPayload = { purpose, sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

/** Returns the subject if the token is valid, unexpired and for `purpose`; otherwise null. */
export function verifyToken(token: string | undefined, purpose: string): string | null {
  const secret = process.env.NIPEI_AUTH_SECRET;
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body, secret))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (p.purpose !== purpose || p.exp < Date.now() / 1000) return null;
    return p.sub;
  } catch {
    return null;
  }
}

/** Machine callers (Hermes/WhatsApp bridges, scripts): `Authorization: Bearer $NIPEI_API_TOKEN`. */
export function isValidApiToken(authHeader: string | null): boolean {
  const expected = process.env.NIPEI_API_TOKEN;
  if (!expected || !authHeader?.startsWith("Bearer ")) return false;
  return safeEqual(authHeader.slice(7).trim(), expected);
}

/** NIPEI_OS_USERS="ashuan:senha1,jordao:senha2" — passwords live only in the server env. */
export function checkCredentials(username: string, password: string): boolean {
  const entry = (process.env.NIPEI_OS_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .find((s) => s.slice(0, s.indexOf(":")) === username);
  if (!entry || !password) return false;
  return safeEqual(entry.slice(entry.indexOf(":") + 1), password);
}
