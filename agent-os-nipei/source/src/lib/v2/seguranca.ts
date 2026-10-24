import fs from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getEquipes, getPessoas, vault, type Pessoa } from "./data";

// Login security per person, in <vault>/.jobs/seguranca/<pessoa>.json (outside git):
// - password as scrypt hash (moved there from the NIPEI_OS_USERS env on the first login that uses it);
// - "corte": sessions issued before this moment no longer count (password change, "sign out everywhere");
// - last logins (when, how, which device) for the person's Segurança tab.
// Attempt limits live in memory (one container).

type Registro = { senha?: string; senhaEm?: string; corte?: number; acessos?: { em: string; metodo: string; disp: string }[] };
const arq = (id: string) => path.join(vault(), ".jobs", "seguranca", `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
const ler = (id: string): Registro => { try { return JSON.parse(fs.readFileSync(arq(id), "utf-8")); } catch { return {}; } };
const gravar = (id: string, r: Registro) => { fs.mkdirSync(path.dirname(arq(id)), { recursive: true }); fs.writeFileSync(arq(id), JSON.stringify(r, null, 1), { encoding: "utf-8", mode: 0o600 }); };
const igual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const digitos = (s: string) => s.replace(/\D/g, "");
// tokens carry whole seconds: a cut-off rounded down to the second keeps the session issued right after it
const agoraCorte = () => Math.floor(Date.now() / 1000) * 1000;

/** Username, e-mail, person id or WhatsApp number → the person. */
export function resolverPessoa(ident: string): Pessoa | null {
  const q = ident.trim().toLowerCase();
  if (!q) return null;
  const ps = getPessoas();
  const d = digitos(q), sem9 = (x: string) => (/^55\d{2}9\d{8}$/.test(x) ? x.slice(0, 4) + x.slice(5) : x);
  return ps.find((p) => p.usuario.toLowerCase() === q || p.id.toLowerCase() === q) ?? ps.find((p) => !!p.email && p.email.toLowerCase() === q)
    ?? (d.length >= 8 ? ps.find((p) => p.whatsapp && (digitos(p.whatsapp) === d || sem9(digitos(p.whatsapp)) === sem9(d))) ?? null : null);
}

/** Can this person enter right now (not suspended, in a team with access)? */
export function podeEntrar(p: Pessoa) {
  const equipes = getEquipes();
  return !p.suspenso && p.equipes.some((e) => { const x = equipes.find((y) => y.id === e); return x?.acesso || x?.gestao; });
}

const envSenha = (usuario: string) => {
  const e = (process.env.NIPEI_OS_USERS || "").split(",").map((s) => s.trim()).find((s) => s.slice(0, s.indexOf(":")) === usuario);
  return e ? e.slice(e.indexOf(":") + 1) : null;
};
const hashSenha = (senha: string) => { const sal = randomBytes(16).toString("base64url"); return `scrypt$${sal}$${scryptSync(senha, sal, 64).toString("base64url")}`; };
const confere = (senha: string, h: string) => { const [, sal, dig] = h.split("$"); return igual(scryptSync(senha, sal, 64).toString("base64url"), dig); };

export const temSenha = (p: Pessoa) => !!ler(p.id).senha || (!!p.usuario && envSenha(p.usuario) !== null);

/**
 * Password check. The stored hash wins; without one, the old env password still works once and is then
 * stored as a hash (automatic migration). Env-only logins (no person note) keep working as before.
 */
export function verificarSenha(ident: string, senha: string): { sub: string; pessoa: Pessoa | null } | null {
  if (!senha) return null;
  const p = resolverPessoa(ident);
  if (p) {
    const r = ler(p.id);
    if (r.senha) return confere(senha, r.senha) ? { sub: p.id, pessoa: p } : null;
    const env = p.usuario ? envSenha(p.usuario) : null;
    if (env === null || !igual(env, senha)) return null;
    gravar(p.id, { ...r, senha: hashSenha(senha), senhaEm: new Date().toISOString() });
    return { sub: p.id, pessoa: p };
  }
  const env = envSenha(ident.trim());
  return env !== null && igual(env, senha) ? { sub: ident.trim(), pessoa: null } : null;
}

/** New password (≥ 10 characters); every other session ends. */
export function definirSenha(pessoaId: string, nova: string) {
  if (nova.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres");
  if (nova.length > 200) throw new Error("Senha longa demais");
  gravar(pessoaId, { ...ler(pessoaId), senha: hashSenha(nova), senhaEm: new Date().toISOString(), corte: agoraCorte() });
}
export function conferirSenhaAtual(p: Pessoa, senha: string) {
  const r = ler(p.id);
  if (r.senha) return confere(senha, r.senha);
  const env = p.usuario ? envSenha(p.usuario) : null;
  return env !== null && igual(env, senha);
}

export const corteSessao = (pessoaId: string) => ler(pessoaId).corte ?? 0;
export function cortarSessoes(pessoaId: string) { gravar(pessoaId, { ...ler(pessoaId), corte: agoraCorte() }); }
export const senhaAlteradaEm = (pessoaId: string) => ler(pessoaId).senhaEm ?? "";

const dispositivo = (ua: string) => {
  const so = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [nav, so].filter(Boolean).join(" · ") || "aparelho desconhecido";
};
export function registrarLogin(pessoaId: string, metodo: "senha" | "google" | "link", ua: string) {
  const r = ler(pessoaId);
  gravar(pessoaId, { ...r, acessos: [{ em: new Date().toISOString(), metodo, disp: dispositivo(ua) }, ...(r.acessos ?? [])].slice(0, 15) });
}
export const acessosRecentes = (pessoaId: string) => ler(pessoaId).acessos ?? [];

// ---------------------------------------------------------------- attempt limits (memory)
const falhas = new Map<string, number[]>();
/** true = blocked for now (max failures inside the window). */
export function bloqueado(chave: string, max: number, janelaMs: number) {
  const agora = Date.now(), lista = (falhas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  falhas.set(chave, lista);
  return lista.length >= max;
}
export function contarFalha(chave: string) { falhas.set(chave, [...(falhas.get(chave) ?? []), Date.now()]); if (falhas.size > 5000) falhas.clear(); }
export function limparFalhas(chave: string) { falhas.delete(chave); }
