import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, cookieSessao, signToken } from "@/lib/auth";
import { sessionPurposeFor, type Pessoa } from "./data";
import { getConexoes, pessoasConectadas } from "./conexoes";
import { registrarLogin, resolverPessoa } from "./seguranca";

/** Puts the person's session cookie on a response and records how they came in. */
export function abrirSessao(res: NextResponse, p: Pessoa, metodo: "senha" | "google" | "link", ua: string, ttl = SESSION_TTL_SECONDS) {
  res.cookies.set(SESSION_COOKIE, signToken(sessionPurposeFor(p), p.id, ttl), cookieSessao(ttl));
  registrarLogin(p.id, metodo, ua);
  return res;
}

/** A Google e-mail → the person: the e-mail on their profile, or the Google account they connected in Conexões. */
export function pessoaDoGoogle(email: string): Pessoa | null {
  const porFicha = resolverPessoa(email);
  if (porFicha?.email.toLowerCase() === email) return porFicha;
  const id = pessoasConectadas().find((pid) => getConexoes(pid).google?.email.toLowerCase() === email);
  return id ? resolverPessoa(id) : null;
}
