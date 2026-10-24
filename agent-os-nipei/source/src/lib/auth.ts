import { createHmac, timingSafeEqual } from "crypto";

// Signed, expiring tokens: base64url(JSON payload) + "." + HMAC-SHA256.
// `purpose` scopes a token so a session cookie can never be replayed as another
// kind of link (e.g. the upcoming per-member verification form: purpose "member-verify").

export const SESSION_COOKIE = "nipei_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = { purpose: string; sub: string; exp: number; iat?: number };

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
  const agora = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { purpose, sub, exp: agora + ttlSeconds, iat: agora };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret)}`;
}

/** Returns the subject if the token is valid, unexpired and for `purpose`; otherwise null. */
export function verifyToken(token: string | undefined, purpose: string): string | null {
  return lerToken(token, purpose)?.sub ?? null;
}

/** Same check, plus when it was issued (seconds; 0 for tokens made before `iat` existed). */
export function lerToken(token: string | undefined, purpose: string): { sub: string; iat: number } | null {
  const secret = process.env.NIPEI_AUTH_SECRET;
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body, secret))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (p.purpose !== purpose || p.exp < Date.now() / 1000) return null;
    return { sub: p.sub, iat: p.iat ?? 0 };
  } catch {
    return null;
  }
}

/** Session cookie options shared by every way of logging in. */
export const cookieSessao = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });

/** Machine callers (Hermes/WhatsApp bridges, scripts): `Authorization: Bearer $NIPEI_API_TOKEN`. */
export function isValidApiToken(authHeader: string | null): boolean {
  const expected = process.env.NIPEI_API_TOKEN;
  if (!expected || !authHeader?.startsWith("Bearer ")) return false;
  return safeEqual(authHeader.slice(7).trim(), expected);
}

// Passwords: lib/v2/seguranca.ts (scrypt hashes; NIPEI_OS_USERS is only read to migrate them).
