import { signToken, verifyToken } from "@/lib/auth";
import { getConexoes, salvarConexoes, type ConexaoGoogle } from "./conexoes";

// Each person's own Google account (OAuth "web" client, offline access). Scopes kept minimal:
// drive.file = only files Nipëi itself creates (backup folder, exports) — never the rest of the Drive;
// calendar.events = read the person's agenda and create events they confirm. No Gmail here (restricted
// scope; see the plan). NIPEI_GOOGLE_MOCK=<url> sends every Google host to <url>/<host> (local tests).

export const ESCOPOS = ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/calendar.events"];
const TZ = "America/Bahia";

export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const url = (host: string, p: string) => process.env.NIPEI_GOOGLE_MOCK ? `${process.env.NIPEI_GOOGLE_MOCK}/${host}${p}` : `https://${host}${p}`;
const redirectUri = (origin: string) => `${origin}/google/callback`;

/** Where the "Conectar Google" button sends the person (state = signed person id, 10 min). */
export function linkConsentimento(pessoaId: string, origin: string, extras: string[] = []) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "", redirect_uri: redirectUri(origin), response_type: "code", scope: [...ESCOPOS, ...extras].join(" "),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: signToken("google-oauth", pessoaId, 600),
  });
  return url("accounts.google.com", `/o/oauth2/v2/auth?${q}`);
}

async function token(form: Record<string, string>) {
  const r = await fetch(url("oauth2.googleapis.com", "/token"), {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...form }),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j: j as Record<string, string | number> };
}

/** OAuth callback: checks the state, keeps the refresh token (encrypted) and the account e-mail. */
export async function concluirConexao(state: string, code: string, origin: string, logado: string): Promise<string> {
  const pessoaId = verifyToken(state, "google-oauth");
  if (!pessoaId) throw new Error("Link expirado; tente de novo");
  // the logged-in person must be the one who started it: nobody attaches a Google account to someone else
  if (pessoaId !== logado) throw new Error("Esta conexão foi iniciada por outra pessoa");
  const { ok, j } = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
  if (!ok || !j.access_token) throw new Error("O Google recusou a conexão");
  const atual = getConexoes(pessoaId);
  const refresh = String(j.refresh_token ?? atual.google?.refreshToken ?? "");
  if (!refresh) throw new Error("O Google não devolveu acesso permanente; desconecte o Nipëi em myaccount.google.com/permissions e conecte de novo");
  const eu = await fetch(url("openidconnect.googleapis.com", "/v1/userinfo"), { headers: { Authorization: `Bearer ${j.access_token}` } }).then((r) => r.json()).catch(() => ({}));
  salvarConexoes(pessoaId, {
    ...atual,
    google: {
      email: String(eu.email ?? ""), refreshToken: refresh, accessToken: String(j.access_token), expiraEm: Date.now() + Number(j.expires_in ?? 3600) * 1000,
      escopos: String(j.scope ?? "").split(" ").filter(Boolean), conectadoEm: new Date().toISOString(), backup: atual.google?.backup,
    },
  });
  return pessoaId;
}

export async function desconectarGoogle(pessoaId: string) {
  const c = getConexoes(pessoaId);
  if (c.google) await fetch(url("oauth2.googleapis.com", `/revoke?token=${encodeURIComponent(c.google.refreshToken)}`), { method: "POST" }).catch(() => null);
  delete c.google;
  salvarConexoes(pessoaId, c);
}

export const temEscopo = (g: ConexaoGoogle | undefined, s: string) => !!g && g.escopos.some((x) => x === s || x === `https://www.googleapis.com/auth/${s}`);

/** A valid access token, refreshed when needed. A revoked/expired grant disconnects (the page asks to reconnect). */
async function acesso(pessoaId: string): Promise<string> {
  const c = getConexoes(pessoaId);
  const g = c.google;
  if (!g) throw new Error("Conta Google não conectada");
  if (g.accessToken && (g.expiraEm ?? 0) > Date.now() + 60_000) return g.accessToken;
  const { ok, j } = await token({ refresh_token: g.refreshToken, grant_type: "refresh_token" });
  if (!ok) {
    if (j.error === "invalid_grant") { delete c.google; salvarConexoes(pessoaId, c); throw new Error("A conexão com o Google expirou; conecte de novo no seu perfil"); }
    throw new Error("Google indisponível agora");
  }
  g.accessToken = String(j.access_token);
  g.expiraEm = Date.now() + Number(j.expires_in ?? 3600) * 1000;
  salvarConexoes(pessoaId, c);
  return g.accessToken;
}

/** Authenticated call to a Google API; JSON back. */
export async function gapi<T = Record<string, unknown>>(pessoaId: string, host: string, p: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url(host, p), { ...init, headers: { Authorization: `Bearer ${await acesso(pessoaId)}`, ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init.headers }, signal: AbortSignal.timeout(30_000) });
  if (r.status === 404) throw Object.assign(new Error("não encontrado no Google"), { status: 404 });
  if (!r.ok) throw new Error(`Google respondeu ${r.status}`);
  return (r.status === 204 ? {} : await r.json()) as T;
}

// ---------------------------------------------------------------- Calendar

export type EventoGoogle = { id: string; titulo: string; dia: string; hora: string; fim: string; link: string };
const cache = new Map<string, { em: number; evs: EventoGoogle[] }>();

/** The person's own Google events between two days (inclusive), cached 5 min. */
export async function eventosGoogle(pessoaId: string, de: string, ate: string): Promise<EventoGoogle[]> {
  const k = `${pessoaId}|${de}|${ate}`;
  const c = cache.get(k);
  if (c && Date.now() - c.em < 300_000) return c.evs;
  const q = new URLSearchParams({ timeMin: `${de}T00:00:00-03:00`, timeMax: `${ate}T23:59:59-03:00`, singleEvents: "true", orderBy: "startTime", maxResults: "250", timeZone: TZ });
  const j = await gapi<{ items?: { id: string; summary?: string; status?: string; htmlLink?: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } }[] }>(pessoaId, "www.googleapis.com", `/calendar/v3/calendars/primary/events?${q}`);
  const local = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: TZ });
  const evs = (j.items ?? []).filter((e) => e.status !== "cancelled").map((e) => {
    const ini = e.start?.dateTime ? local(e.start.dateTime) : e.start?.date ?? "";
    return { id: e.id, titulo: e.summary || "(sem título)", dia: ini.slice(0, 10), hora: e.start?.dateTime ? ini.slice(11, 16) : "", fim: e.end?.dateTime ? local(e.end.dateTime).slice(11, 16) : "", link: e.htmlLink ?? "" };
  });
  cache.set(k, { em: Date.now(), evs });
  return evs;
}

/** Creates an event in the person's primary calendar (always after a confirmation card or form). */
export async function criarEventoGoogle(pessoaId: string, e: { titulo: string; dia: string; hora?: string; duracaoMin?: number; descricao?: string; convidados?: string[] }) {
  const corpo: Record<string, unknown> = { summary: e.titulo, description: e.descricao || undefined };
  if (e.hora) {
    const ini = new Date(`${e.dia}T${e.hora}:00-03:00`), fim = new Date(ini.getTime() + (e.duracaoMin ?? 60) * 60_000);
    corpo.start = { dateTime: ini.toISOString(), timeZone: TZ };
    corpo.end = { dateTime: fim.toISOString(), timeZone: TZ };
  } else {
    corpo.start = { date: e.dia };
    corpo.end = { date: new Date(Date.parse(`${e.dia}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10) };
  }
  if (e.convidados?.length) corpo.attendees = e.convidados.map((email) => ({ email }));
  const r = await gapi<{ htmlLink?: string }>(pessoaId, "www.googleapis.com", `/calendar/v3/calendars/primary/events${e.convidados?.length ? "?sendUpdates=all" : ""}`, { method: "POST", body: JSON.stringify(corpo) });
  for (const k of cache.keys()) if (k.startsWith(`${pessoaId}|`)) cache.delete(k);
  return r.htmlLink ?? "";
}

// ---------------------------------------------------------------- Drive (only Nipëi's own files)

export const PASTA = "Nipëi";
const MIME = { doc: "application/vnd.google-apps.document", sheet: "application/vnd.google-apps.spreadsheet", pasta: "application/vnd.google-apps.folder" };

/** The person's "Nipëi" folder (created once; recreated if they deleted it). */
export async function pastaNipei(pessoaId: string): Promise<string> {
  const c = getConexoes(pessoaId);
  const id = c.google?.backup?.pastaId;
  if (id) {
    try { const f = await gapi<{ trashed?: boolean }>(pessoaId, "www.googleapis.com", `/drive/v3/files/${id}?fields=id,trashed`); if (!f.trashed) return id; } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  }
  const f = await gapi<{ id: string }>(pessoaId, "www.googleapis.com", "/drive/v3/files?fields=id", { method: "POST", body: JSON.stringify({ name: PASTA, mimeType: MIME.pasta }) });
  const d = getConexoes(pessoaId);
  if (d.google) { d.google.backup = { ...d.google.backup, pastaId: f.id, arquivos: {} }; salvarConexoes(pessoaId, d); }
  return f.id;
}

/**
 * Creates (or overwrites, when `id` is given and still exists) a file in the Nipëi folder.
 * `converter` turns markdown into a Google Doc and CSV into a Google Sheet.
 */
export async function salvarArquivo(pessoaId: string, a: { nome: string; conteudo: string; tipo: "text/markdown" | "text/csv"; converter?: boolean; id?: string }): Promise<{ id: string; link: string }> {
  const pasta = await pastaNipei(pessoaId);
  const meta: Record<string, unknown> = { name: a.nome, ...(a.converter ? { mimeType: a.tipo === "text/csv" ? MIME.sheet : MIME.doc } : {}) };
  const envio = (metodo: string, caminho: string, m: Record<string, unknown>) => {
    const b = `nipei${Date.now()}`;
    const corpo = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(m)}\r\n--${b}\r\nContent-Type: ${a.tipo}; charset=UTF-8\r\n\r\n${a.conteudo}\r\n--${b}--`;
    return gapi<{ id: string; webViewLink?: string }>(pessoaId, "www.googleapis.com", `${caminho}?uploadType=multipart&fields=id,webViewLink`, { method: metodo, body: corpo, headers: { "Content-Type": `multipart/related; boundary=${b}` } });
  };
  let f: { id: string; webViewLink?: string } | null = null;
  if (a.id) {
    try { f = await envio("PATCH", `/upload/drive/v3/files/${a.id}`, { name: a.nome }); } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  }
  f ??= await envio("POST", "/upload/drive/v3/files", { ...meta, parents: [pasta] });
  return { id: f.id, link: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view` };
}

/** A Google Slides deck: one title slide, then one slide per section (title + bullet text). */
export async function criarApresentacao(pessoaId: string, titulo: string, secoes: { titulo: string; texto: string }[]): Promise<string> {
  const p = await gapi<{ presentationId: string; slides?: { objectId: string }[] }>(pessoaId, "slides.googleapis.com", "/v1/presentations", { method: "POST", body: JSON.stringify({ title: titulo }) });
  const reqs: unknown[] = [];
  const capa = p.slides?.[0]?.objectId;
  if (capa) reqs.push({ deleteObject: { objectId: capa } });
  [{ titulo, texto: new Date().toLocaleDateString("pt-BR", { timeZone: TZ }) }, ...secoes].forEach((s, i) => {
    const id = `s${i}`, tt = `s${i}t`, tb = `s${i}b`;
    reqs.push({ createSlide: { objectId: id, slideLayoutReference: { predefinedLayout: i === 0 ? "TITLE" : "TITLE_AND_BODY" }, placeholderIdMappings: [{ layoutPlaceholder: { type: i === 0 ? "CENTERED_TITLE" : "TITLE" }, objectId: tt }, { layoutPlaceholder: { type: i === 0 ? "SUBTITLE" : "BODY" }, objectId: tb }] } });
    reqs.push({ insertText: { objectId: tt, text: s.titulo.slice(0, 120) } });
    if (s.texto.trim()) reqs.push({ insertText: { objectId: tb, text: s.texto.slice(0, 1200) } });
  });
  await gapi(pessoaId, "slides.googleapis.com", `/v1/presentations/${p.presentationId}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: reqs }) });
  // keep it with the person's other Nipëi files
  const pasta = await pastaNipei(pessoaId);
  await gapi(pessoaId, "www.googleapis.com", `/drive/v3/files/${p.presentationId}?addParents=${pasta}&fields=id`, { method: "PATCH", body: "{}" }).catch(() => null);
  return `https://docs.google.com/presentation/d/${p.presentationId}/edit`;
}

// ---------------------------------------------------------------- Gmail (separate opt-in, Equipe 1)
// Restricted scopes, asked only when the person turns Gmail on. E-mail content is external data: the assistant
// reads it to answer, never obeys it, and sending always goes through a confirmation.

export const ESCOPOS_GMAIL = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose"];
export const temGmail = (g: ConexaoGoogle | undefined) => ESCOPOS_GMAIL.every((s) => temEscopo(g, s));

type Parte = { mimeType?: string; body?: { data?: string }; parts?: Parte[]; headers?: { name: string; value: string }[] };
const b64 = (s = "") => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
const cab = (p: Parte | undefined, nome: string) => p?.headers?.find((h) => h.name.toLowerCase() === nome.toLowerCase())?.value ?? "";
function corpoTexto(p: Parte): string {
  if (p.mimeType === "text/plain" && p.body?.data) return b64(p.body.data);
  for (const x of p.parts ?? []) { const t = corpoTexto(x); if (t) return t; }
  if (p.mimeType === "text/html" && p.body?.data) return b64(p.body.data).replace(/<(style|script)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n");
  return "";
}

/** Gmail search (same syntax as the Gmail box, e.g. "is:unread newer_than:2d"). */
export async function gmailBuscar(pessoaId: string, q: string, max = 10) {
  const l = await gapi<{ messages?: { id: string; threadId: string }[] }>(pessoaId, "gmail.googleapis.com", `/gmail/v1/users/me/messages?${new URLSearchParams({ q: q || "in:inbox", maxResults: String(Math.min(20, Math.max(1, max))) })}`);
  return Promise.all((l.messages ?? []).map(async (m) => {
    const d = await gapi<{ id: string; threadId: string; snippet?: string; labelIds?: string[]; payload?: Parte }>(pessoaId, "gmail.googleapis.com", `/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
    return { id: d.id, de: cab(d.payload, "From"), assunto: cab(d.payload, "Subject"), data: cab(d.payload, "Date"), trecho: d.snippet ?? "", nao_lido: !!d.labelIds?.includes("UNREAD") };
  }));
}

export async function gmailLer(pessoaId: string, id: string) {
  const d = await gapi<{ id: string; threadId: string; payload?: Parte }>(pessoaId, "gmail.googleapis.com", `/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`);
  return { id: d.id, de: cab(d.payload, "From"), para: cab(d.payload, "To"), assunto: cab(d.payload, "Subject"), data: cab(d.payload, "Date"), texto: corpoTexto(d.payload ?? {}).trim().slice(0, 6000) };
}

const mimeAssunto = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`);

/** Sends (or saves as a draft) a new e-mail or a reply in the same thread. Returns a link to Gmail. */
export async function gmailEnviar(pessoaId: string, e: { para?: string; assunto?: string; texto: string; responderA?: string; rascunho?: boolean }) {
  let para = e.para ?? "", assunto = e.assunto ?? "", threadId: string | undefined, extra = "";
  if (e.responderA) {
    const o = await gapi<{ threadId: string; payload?: Parte }>(pessoaId, "gmail.googleapis.com", `/gmail/v1/users/me/messages/${encodeURIComponent(e.responderA)}?format=metadata&metadataHeaders=From&metadataHeaders=Reply-To&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`);
    threadId = o.threadId;
    para ||= cab(o.payload, "Reply-To") || cab(o.payload, "From");
    const s = cab(o.payload, "Subject");
    assunto ||= /^re:/i.test(s) ? s : `Re: ${s}`;
    const mid = cab(o.payload, "Message-ID");
    if (mid) extra = `In-Reply-To: ${mid}\r\nReferences: ${[cab(o.payload, "References"), mid].filter(Boolean).join(" ")}\r\n`;
  }
  // no line breaks in headers (header injection)
  para = para.replace(/[\r\n]+/g, " ").trim(); assunto = assunto.replace(/[\r\n]+/g, " ").trim();
  if (!para) throw new Error("Falta o destinatário");
  const raw = Buffer.from(`To: ${para}\r\nSubject: ${mimeAssunto(assunto)}\r\n${extra}MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(e.texto).toString("base64")}`).toString("base64url");
  if (e.rascunho) {
    await gapi(pessoaId, "gmail.googleapis.com", "/gmail/v1/users/me/drafts", { method: "POST", body: JSON.stringify({ message: { raw, threadId } }) });
    return "https://mail.google.com/mail/u/0/#drafts";
  }
  const r = await gapi<{ threadId: string }>(pessoaId, "gmail.googleapis.com", "/gmail/v1/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw, threadId }) });
  return `https://mail.google.com/mail/u/0/#all/${r.threadId}`;
}
