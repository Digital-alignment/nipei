import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getPessoas } from "@/lib/v2/data";
import { podeEntrar } from "@/lib/v2/seguranca";
import { abrirSessao } from "@/lib/v2/sessao";

export const dynamic = "force-dynamic";

const LINK_SESSION_TTL = 60 * 60 * 24 * 30;

// Login link sent by WhatsApp: /entrar?token=<signed "login-link" token for a person id>
// (7 days from the Gestão tab, 15 minutes from "Receber link no WhatsApp" on the login page).
// ponytail: the link works until it expires, not just once — one-time links need a used-token store.
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Behind Traefik req.url is the container address (0.0.0.0:3333): redirect to the public origin.
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const fail = (erro: string) => NextResponse.redirect(new URL(`/login?erro=${erro}`, base));
  const id = verifyToken(url.searchParams.get("token") ?? undefined, "login-link");
  if (!id) return fail("link");
  const pessoa = getPessoas().find((p) => p.id === id);
  if (!pessoa || !podeEntrar(pessoa)) return fail("acesso");
  return abrirSessao(NextResponse.redirect(new URL("/hoje", base)), pessoa, "link", req.headers.get("user-agent") ?? "", LINK_SESSION_TTL);
}
