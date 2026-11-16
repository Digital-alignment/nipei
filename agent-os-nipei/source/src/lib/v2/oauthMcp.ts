import fs from "fs";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { signToken, verifyToken } from "@/lib/auth";
import { vault } from "./data";

// OAuth 2.1 for Nipëi's MCP server (Claude, ChatGPT, Gemini…): dynamic client registration, the person
// approves in their own Nipëi session, PKCE (S256) code exchange, 1 h access tokens tied to a grant, and
// rotating refresh tokens stored only as hashes. Revoking the grant (Conexões tab) cuts access at once; a grant
// unused for 90 days expires, and registered apps that never got (or lost) a grant are dropped after 30 days.
// Files in <vault>/.jobs/oauth/ (outside git).

export type Cliente = { id: string; nome: string; redirects: string[]; criadoEm: string };
export type Concessao = { id: string; pessoa: string; cliente: string; nomeCliente: string; criadoEm: string; usadoEm: string; refresh: string; refreshAnterior?: string; rotadoEm?: string };

const DIR = () => path.join(vault(), ".jobs", "oauth");
const ler = <T,>(f: string): T[] => { try { return JSON.parse(fs.readFileSync(path.join(DIR(), f), "utf-8")); } catch { return []; } };
// write to a temp file and rename, so a crash or a concurrent read never sees half a file
const gravar = (f: string, v: unknown) => {
  fs.mkdirSync(DIR(), { recursive: true });
  const tmp = path.join(DIR(), `${f}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(v, null, 1), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(tmp, path.join(DIR(), f));
};
const hash = (s: string) => createHash("sha256").update(s).digest("base64url");
const aleatorio = () => randomBytes(32).toString("base64url");
const ACESSO_TTL = 3600;
const DIA = 86_400_000;
const INATIVA = 90 * DIA;     // grant unused this long → expired
const CLIENTE_ORFAO = 30 * DIA; // registered app with no live grant this long → dropped
const GRACA = 60_000;        // an app that retries a refresh (lost response) may reuse the previous token this long
const viva = (g: Concessao, agora = Date.now()) => agora - Date.parse(g.usadoEm) < INATIVA;
/** Live grants only; expired ones are dropped from the file the next time it is written. */
const concessoes = () => ler<Concessao>("concessoes.json").filter((g) => viva(g));

export const base = (origin: string) => process.env.NEXT_PUBLIC_APP_URL || origin;

export function metadadosServidor(b: string) {
  return {
    issuer: b, authorization_endpoint: `${b}/oauth/authorize`, token_endpoint: `${b}/oauth/token`, registration_endpoint: `${b}/oauth/register`,
    response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"], scopes_supported: ["nipei"],
  };
}
export const metadadosRecurso = (b: string) => ({ resource: `${b}/mcp`, authorization_servers: [b], scopes_supported: ["nipei"], bearer_methods_supported: ["header"], resource_name: "Nipëi OS" });

/** Only https redirects (plus localhost for desktop clients and tests). */
const redirectOk = (u: string) => { try { const x = new URL(u); return x.protocol === "https:" || (x.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(x.hostname)); } catch { return false; } };

export function registrarCliente(b: { client_name?: string; redirect_uris?: string[] }) {
  const redirects = (b.redirect_uris ?? []).filter(redirectOk).slice(0, 10);
  if (!redirects.length) throw new Error("redirect_uris inválidos");
  const comConcessao = new Set(concessoes().map((g) => g.cliente));
  const todos = ler<Cliente>("clientes.json").filter((c) => comConcessao.has(c.id) || Date.now() - Date.parse(c.criadoEm) < CLIENTE_ORFAO);
  if (todos.length >= 500) throw new Error("limite de clientes");
  const c: Cliente = { id: `nipei-${aleatorio().slice(0, 22)}`, nome: String(b.client_name ?? "App").slice(0, 60), redirects, criadoEm: new Date().toISOString() };
  gravar("clientes.json", [...todos, c]);
  return c;
}
export const getCliente = (id: string) => ler<Cliente>("clientes.json").find((c) => c.id === id) ?? null;

/** After the person approves: a 5-minute, single-use code carrying who, which app, where to and the PKCE challenge. */
export function emitirCodigo(pessoa: string, cliente: string, redirect: string, challenge: string) {
  return signToken("mcp-code", JSON.stringify({ p: pessoa, c: cliente, r: redirect, ch: challenge, n: aleatorio().slice(0, 12) }), 300);
}

const usados = new Set<string>(); // ponytail: single-use codes in memory; a restart within 5 min could allow one replay (PKCE still required)
function novaConcessao(pessoa: string, cliente: Cliente) {
  const refresh = aleatorio();
  const g: Concessao = { id: `g${aleatorio().slice(0, 16)}`, pessoa, cliente: cliente.id, nomeCliente: cliente.nome, criadoEm: new Date().toISOString(), usadoEm: new Date().toISOString(), refresh: hash(refresh) };
  gravar("concessoes.json", [...concessoes(), g]);
  return { access_token: signToken("mcp-access", g.id, ACESSO_TTL), token_type: "Bearer", expires_in: ACESSO_TTL, refresh_token: refresh, scope: "nipei" };
}

export function trocarCodigo(code: string, verifier: string, clienteId: string, redirect: string) {
  const raw = verifyToken(code, "mcp-code");
  if (!raw || usados.has(code)) throw new Error("invalid_grant");
  const d = JSON.parse(raw) as { p: string; c: string; r: string; ch: string };
  const cliente = getCliente(d.c);
  if (!cliente || d.c !== clienteId || d.r !== redirect || hash(verifier) !== d.ch) throw new Error("invalid_grant");
  usados.add(code);
  return novaConcessao(d.p, cliente);
}

/** Refresh token rotation: the old one stops working once a new one is issued, except for a 60 s grace so an app
 *  whose first refresh response got lost can retry (it then gets a fresh pair; the lost one is dead). */
export function renovar(refresh: string, clienteId: string) {
  const todas = concessoes(), h = hash(refresh), agora = Date.now();
  const g = todas.find((x) => x.cliente === clienteId && (x.refresh === h || (x.refreshAnterior === h && agora - Date.parse(x.rotadoEm ?? "") < GRACA)));
  if (!g) throw new Error("invalid_grant");
  const novo = aleatorio();
  if (g.refresh === h) { g.refreshAnterior = h; g.rotadoEm = new Date(agora).toISOString(); }
  g.refresh = hash(novo);
  g.usadoEm = new Date(agora).toISOString();
  gravar("concessoes.json", todas);
  return { access_token: signToken("mcp-access", g.id, ACESSO_TTL), token_type: "Bearer", expires_in: ACESSO_TTL, refresh_token: novo, scope: "nipei" };
}

/** Bearer → the live grant (null if expired, forged or revoked). Marks last use at most every 10 min. */
export function concessaoDoToken(auth: string | null): Concessao | null {
  const id = verifyToken(auth?.replace(/^Bearer\s+/i, ""), "mcp-access");
  if (!id) return null;
  const todas = concessoes();
  const g = todas.find((x) => x.id === id);
  if (g && Date.now() - Date.parse(g.usadoEm) > 600_000) { g.usadoEm = new Date().toISOString(); gravar("concessoes.json", todas); }
  return g ?? null;
}

export const concessoesDe = (pessoa: string) => concessoes().filter((g) => g.pessoa === pessoa);
export function revogar(pessoa: string, id: string) {
  gravar("concessoes.json", concessoes().filter((g) => !(g.pessoa === pessoa && g.id === id)));
}
