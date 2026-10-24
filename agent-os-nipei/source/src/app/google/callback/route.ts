import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { currentUser } from "@/lib/v2/data";
import { concluirConexao, identidadeGoogle } from "@/lib/v2/google";
import { backupPessoa } from "@/lib/v2/backup";
import { podeEntrar } from "@/lib/v2/seguranca";
import { abrirSessao, pessoaDoGoogle } from "@/lib/v2/sessao";
import { cookieAdmin, ehAdmin, registrarAdmin } from "@/lib/v2/admin";

export const dynamic = "force-dynamic";

// Google comes back here for two things, told apart by the signed state:
// "google-login" = "Entrar com Google" (public), otherwise = connecting the logged-in person's account.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const state = url.searchParams.get("state") ?? "", code = url.searchParams.get("code") ?? "";

  const adminDe = verifyToken(state, "google-admin");
  if (adminDe !== null) {
    // admin panel re-confirmation: same logged-in person, same Google account as their profile/connection
    const me = await currentUser();
    const voltar = (q = "") => NextResponse.redirect(new URL(`/controle${q}`, base));
    if (!me || !ehAdmin(me) || me.pessoa!.id !== adminDe || !code) return voltar("?erro=google");
    try {
      const { email, verificado } = await identidadeGoogle(code, base);
      if (!verificado || pessoaDoGoogle(email)?.id !== adminDe) { registrarAdmin(adminDe, "confirmação com Google FALHOU"); return voltar("?erro=google"); }
      registrarAdmin(adminDe, "abriu o painel (Google)");
      const res = voltar();
      res.cookies.set(cookieAdmin(adminDe));
      return res;
    } catch { return voltar("?erro=google"); }
  }

  const next = verifyToken(state, "google-login");
  if (next !== null) {
    const falha = (e: string) => NextResponse.redirect(new URL(`/login?erro=${e}`, base));
    if (url.searchParams.get("error") || !code) return falha("google-cancelado");
    try {
      const { email, verificado } = await identidadeGoogle(code, base);
      const p = verificado && email ? pessoaDoGoogle(email) : null;
      if (!p) return falha("google-conta");
      if (!podeEntrar(p)) return falha("acesso");
      return abrirSessao(NextResponse.redirect(new URL(next || "/hoje", base)), p, "google", req.headers.get("user-agent") ?? "");
    } catch {
      return falha("google");
    }
  }

  const me = await currentUser();
  const volta = (q: string) => NextResponse.redirect(new URL(`/pessoas/${me?.pessoa?.id ?? ""}?aba=conexoes${q}`, base));
  if (!me?.pessoa) return NextResponse.redirect(new URL("/login", base));
  if (url.searchParams.get("error")) return volta(`&erro=${encodeURIComponent("Conexão cancelada no Google")}`);
  try {
    const pessoaId = await concluirConexao(state, code, base, me.pessoa.id);
    backupPessoa(pessoaId).catch(() => null); // first copy right away, in the background
    return volta("&google=ok");
  } catch (e) {
    return volta(`&erro=${encodeURIComponent((e as Error).message)}`);
  }
}
