import { NextResponse } from "next/server";
import { SESSION_COOKIE, signToken, verifyToken } from "@/lib/auth";
import { getEquipes, getPessoas, sessionPurposeFor } from "@/lib/v2/data";

export const dynamic = "force-dynamic";

const LINK_SESSION_TTL = 60 * 60 * 24 * 30;

// Login link sent by WhatsApp: /entrar?token=<signed "login-link" token for a person id>.
// ponytail: the link works until it expires (7 days), not just once — one-time links need a used-token store.
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Behind Traefik req.url is the container address (0.0.0.0:3333): redirect to the public origin.
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const fail = (erro: string) => NextResponse.redirect(new URL(`/login?erro=${erro}`, base));
  const id = verifyToken(url.searchParams.get("token") ?? undefined, "login-link");
  if (!id) return fail("link");
  const pessoa = getPessoas().find((p) => p.id === id);
  const equipes = getEquipes();
  if (!pessoa || pessoa.suspenso || !pessoa.equipes.some((e) => equipes.find((x) => x.id === e)?.acesso)) return fail("acesso");

  const res = NextResponse.redirect(new URL("/hoje", base));
  res.cookies.set(SESSION_COOKIE, signToken(sessionPurposeFor(pessoa), pessoa.id, LINK_SESSION_TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LINK_SESSION_TTL,
  });
  return res;
}
