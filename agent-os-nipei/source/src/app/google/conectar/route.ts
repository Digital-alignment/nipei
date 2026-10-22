import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { googleConfigurado, linkConsentimento } from "@/lib/v2/google";

export const dynamic = "force-dynamic";

// "Conectar Google" on the person's own profile → Google's consent screen (each person connects only themselves).
export async function GET(req: Request) {
  // Behind Traefik req.url is the container address: use the public origin (must match the OAuth redirect URI).
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const me = await currentUser();
  if (!me?.pessoa) return NextResponse.redirect(new URL("/login", base));
  const volta = `/pessoas/${me.pessoa.id}?aba=conexoes`;
  if (!googleConfigurado()) return NextResponse.redirect(new URL(`${volta}&erro=${encodeURIComponent("Integração com o Google ainda não configurada no servidor")}`, base));
  return NextResponse.redirect(linkConsentimento(me.pessoa.id, base));
}
