import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, checkCredentials, signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { username = "", password = "" } = await req.json().catch(() => ({}));
  if (!process.env.NIPEI_AUTH_SECRET) {
    return NextResponse.json({ ok: false, error: "Autenticação não configurada no servidor" }, { status: 500 });
  }
  if (!checkCredentials(String(username), String(password))) {
    return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, signToken("session", String(username), SESSION_TTL_SECONDS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
