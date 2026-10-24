import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, cookieSessao, signToken } from "@/lib/auth";
import { sessionPurposeFor } from "@/lib/v2/data";
import { bloqueado, contarFalha, limparFalhas, registrarLogin, verificarSenha } from "@/lib/v2/seguranca";

export const dynamic = "force-dynamic";

const JANELA = 15 * 60_000;

// Username, e-mail or WhatsApp + password. 5 wrong tries per person (or 20 per IP) lock for 15 minutes.
export async function POST(req: Request) {
  const { username = "", password = "" } = await req.json().catch(() => ({}));
  if (!process.env.NIPEI_AUTH_SECRET) {
    return NextResponse.json({ ok: false, error: "Autenticação não configurada no servidor" }, { status: 500 });
  }
  const ident = String(username).trim().toLowerCase().slice(0, 120);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (bloqueado(`u:${ident}`, 5, JANELA) || bloqueado(`ip:${ip}`, 20, JANELA)) {
    return NextResponse.json({ ok: false, error: "Muitas tentativas. Tente de novo em 15 minutos ou receba um link pelo WhatsApp." }, { status: 429 });
  }
  const r = verificarSenha(ident, String(password));
  if (!r) {
    contarFalha(`u:${ident}`); contarFalha(`ip:${ip}`);
    return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
  }
  limparFalhas(`u:${ident}`);
  if (r.pessoa) registrarLogin(r.pessoa.id, "senha", req.headers.get("user-agent") ?? "");
  const res = NextResponse.json({ ok: true, pessoa: r.pessoa ? { id: r.pessoa.id, name: r.pessoa.name } : { id: r.sub, name: r.sub } });
  res.cookies.set(SESSION_COOKIE, signToken(r.pessoa ? sessionPurposeFor(r.pessoa) : "session", r.sub, SESSION_TTL_SECONDS), cookieSessao(SESSION_TTL_SECONDS));
  return res;
}
