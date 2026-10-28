import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIA, chamarIATexto, type Parte } from "./ia";
import { auditarFatos } from "./auditor";
import { getEquipes, getObjetivos, getPessoas, getProjetos, noteText, readDir, slugify, updateNote, vault, type FmValue, type Me } from "./data";

// Conhecimento (K1): someone uploads a source (file, link, pasted text) → the AI reads it and splits it
// into short facts → a person confirms, edits or discards each fact. Only confirmed facts are "the truth".
// Corrected facts are never deleted (status substituido/descartado) so the auditor (K2) can spot when
// something already corrected comes back.
//
//   Conhecimento/Fontes/<id>.md            one note per source (body: summary + extracted text)
//   Conhecimento/Fontes/arquivos/<id>.ext  the original file
//   Conhecimento/Fatos/<id>.md             one note per fact

const FONTES = path.join("Conhecimento", "Fontes");
const ARQUIVOS = path.join(FONTES, "arquivos");
const FATOS = path.join("Conhecimento", "Fatos");

export const FONTE_MAX_BYTES = 10 * 1024 * 1024;
export const FONTE_TIPOS: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
};
export const TIPOS_FATO = ["fato", "decisao", "prazo", "procedimento", "contato", "valor"] as const;
export type StatusFato = "proposto" | "confirmado" | "substituido" | "descartado";

export type Fonte = {
  id: string; file: string; titulo: string; tipo: "arquivo" | "link" | "texto"; arquivo: string; url: string;
  enviadoPor: string; enviadoEm: string; status: "processando" | "pronta" | "erro"; erro: string; resumo: string; texto: string;
  acervo: string; // id of the Acervo item this source was taught from ("Ensinar à IA"), if any
  // C7: where it came from ("" = the Conhecimento page) and what it is about, when the channel knows it
  canal: Canal | ""; tarefa: string; chave: string; equipe: string; projeto: string;
};
export type Canal = "tarefa" | "pinu" | "whatsapp" | "gmail";
/** Sources sent from other places (task, Pinu, WhatsApp, Gmail) per person per day; the page itself has no limit. */
export const LIMITE_FONTES_CANAL_DIA = 20;
export type Fato = {
  id: string; file: string; texto: string; tipo: string; fonte: string; equipe: string; projetos: string[]; objetivos: string[];
  pessoas: string[]; dataReferencia: string; status: StatusFato; criadoEm: string; revisadoPor: string; revisadoEm: string; substituidoPor: string;
  motivo: string; // "duplicado" when discarded only for repeating a confirmed fact (not a correction)
  corrige: string; // id of the confirmed fact this one corrected (D10: the old one stays, "substituido")
  equipeDefinidaPor: string; equipeDefinidaEm: string;
};

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const novoId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const secao = (body: string, nome: string) => body.match(new RegExp(`## ${nome}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`))?.[1].trim() ?? "";

export function getFontes(): Fonte[] {
  return readDir(FONTES).filter(({ fm }) => fm.type === "fonte").map(({ file, fm, body }) => ({
    id: s(fm.id), file, titulo: s(fm.titulo), tipo: (s(fm.tipo) || "texto") as Fonte["tipo"], arquivo: s(fm.arquivo), url: s(fm.url),
    enviadoPor: s(fm.enviado_por), enviadoEm: s(fm.enviado_em), status: (s(fm.status) || "processando") as Fonte["status"], erro: s(fm.erro),
    // "## Texto" is always the last section (escreverFonte) and the extracted text may have its own "## " headings: read to the end
    resumo: secao(body, "Resumo"), texto: body.split(/\r?\n## Texto\r?\n/)[1]?.trim() ?? "", acervo: s(fm.acervo),
    canal: s(fm.canal) as Canal | "", tarefa: s(fm.tarefa), chave: s(fm.chave), equipe: s(fm.equipe), projeto: s(fm.projeto),
  })).sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
}

/** Identity of one piece of content sent from a channel ("d:…" description, "c:…" comment): same text = same key. */
export const chaveTrecho = (tipo: string, texto: string) => `${tipo}:${createHash("sha1").update(texto.trim()).digest("hex").slice(0, 12)}`;

/** The source's own fields that every rewrite must keep (escreverFonte replaces the whole frontmatter). */
const origemFonte = (f: Pick<Fonte, "acervo" | "canal" | "tarefa" | "chave" | "equipe" | "projeto">): Record<string, FmValue> => Object.fromEntries(
  Object.entries({ acervo: f.acervo, canal: f.canal, tarefa: f.tarefa, chave: f.chave, equipe: f.equipe, projeto: f.projeto }).filter(([, v]) => v),
);

export function getFatos(): Fato[] {
  return readDir(FATOS).filter(({ fm }) => fm.type === "fato").map(({ file, fm }) => ({
    id: s(fm.id), file, texto: s(fm.texto), tipo: s(fm.tipo) || "fato", fonte: s(fm.fonte), equipe: s(fm.equipe),
    projetos: arr(fm.projetos), objetivos: arr(fm.objetivos), pessoas: arr(fm.pessoas), dataReferencia: s(fm.data_referencia),
    status: (s(fm.status) || "proposto") as StatusFato, criadoEm: s(fm.criado_em), revisadoPor: s(fm.revisado_por), revisadoEm: s(fm.revisado_em),
    substituidoPor: s(fm.substituido_por), motivo: s(fm.descartado_motivo), corrige: s(fm.corrige),
    equipeDefinidaPor: s(fm.equipe_definida_por), equipeDefinidaEm: s(fm.equipe_definida_em),
  }));
}

// ---------------------------------------------------------------- D11: which facts the AIs used

// Every AI that reads the base goes through buscarConhecimento({ origem }) (or responderComFatos): the facts it
// got are counted here, per fact and per channel. <vault>/.jobs/ is outside git; counts only, never the question.
const USO = path.join(".jobs", "fatos-uso.json");
export type UsoFato = { n: number; ultimo: string; origens: Record<string, number> };
export function usoFatos(): Record<string, UsoFato> {
  try { return JSON.parse(fs.readFileSync(path.join(vault(), USO), "utf-8")); } catch { return {}; }
}
export function registrarUsoFatos(ids: string[], origem: string) {
  if (!ids.length) return;
  try {
    const u = usoFatos(), agora = new Date().toISOString();
    for (const id of new Set(ids)) {
      const x = u[id] ?? { n: 0, ultimo: "", origens: {} };
      u[id] = { n: x.n + 1, ultimo: agora, origens: { ...x.origens, [origem]: (x.origens[origem] ?? 0) + 1 } };
    }
    fs.mkdirSync(path.join(vault(), ".jobs"), { recursive: true });
    fs.writeFileSync(path.join(vault(), USO), JSON.stringify(u));
  } catch (e) { console.warn("[conhecimento] uso:", (e as Error).message); }
}

// ---------------------------------------------------------------- E12: knowledge map (nodes + links)

// Shaped as a graph so an interactive connections view can use it as is; today Conhecimento draws the
// team × project heat table from the "e:"–"p:" links. Ids: "e:<equipe>", "p:<projeto>", "h:<pessoa>";
// "e:-" / "p:-" = facts without a team / project (the gaps). Counts only confirmed and pending facts.
export type NoMapa = { id: string; tipo: "equipe" | "projeto" | "pessoa"; nome: string; confirmados: number; pendentes: number; usos: number };
export type LigacaoMapa = { de: string; para: string; confirmados: number; pendentes: number };
export function mapaConhecimento(): { nos: NoMapa[]; ligacoes: LigacaoMapa[] } {
  const equipes = getEquipes(), projetos = getProjetos(), pessoas = getPessoas(), uso = usoFatos();
  const nos = new Map<string, NoMapa>(), ligacoes = new Map<string, LigacaoMapa>();
  const no = (id: string, tipo: NoMapa["tipo"], nome: string) => nos.get(id) ?? nos.set(id, { id, tipo, nome, confirmados: 0, pendentes: 0, usos: 0 }).get(id)!;
  for (const e of equipes) no(`e:${e.id}`, "equipe", e.nome);
  for (const p of projetos) no(`p:${p.id}`, "projeto", p.nome);
  for (const f of getFatos()) {
    if (f.status !== "confirmado" && f.status !== "proposto") continue;
    const campo = f.status === "confirmado" ? "confirmados" : "pendentes";
    const ids = [
      f.equipe ? `e:${f.equipe}` : "e:-", ...(f.projetos.length ? f.projetos.map((p) => `p:${p}`) : ["p:-"]), ...f.pessoas.map((h) => `h:${h}`),
    ];
    for (const id of ids) {
      const [t, x] = [id.slice(0, 1), id.slice(2)];
      const n = no(id, t === "e" ? "equipe" : t === "p" ? "projeto" : "pessoa",
        x === "-" ? "" : t === "e" ? equipes.find((e) => e.id === x)?.nome ?? x : t === "p" ? projetos.find((p) => p.id === x)?.nome ?? x : pessoas.find((p) => p.id === x)?.name.split(" (")[0] ?? x);
      n[campo]++;
      n.usos += uso[f.id]?.n ?? 0;
    }
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const [de, para] = [ids[i], ids[j]].sort();
      const k = `${de}|${para}`;
      const l = ligacoes.get(k) ?? ligacoes.set(k, { de, para, confirmados: 0, pendentes: 0 }).get(k)!;
      l[campo]++;
    }
  }
  return { nos: [...nos.values()], ligacoes: [...ligacoes.values()] };
}

// ---------------------------------------------------------------- D10: correct a confirmed fact

/**
 * Correcting a confirmed fact never edits it in place: a new confirmed fact (same source and links, `corrige`)
 * takes its place and the old one becomes "substituido" → the auditor keeps seeing what was corrected.
 */
export function corrigirFato(id: string, texto: string, quem: string): string {
  const f = getFatos().find((x) => x.id === id && x.status === "confirmado");
  if (!f) throw new Error("Só um fato confirmado pode ser corrigido");
  const novo = texto.trim().slice(0, 600);
  if (!novo || novo === f.texto) throw new Error("Escreva o texto corrigido");
  const fid = novoId("fat"), agora = new Date().toISOString();
  fs.writeFileSync(path.join(vault(), FATOS, `${slugify(novo) || "fato"}_${fid.slice(4)}.md`), noteText({
    id: fid, type: "fato", texto: novo, tipo: f.tipo, fonte: f.fonte, equipe: f.equipe, projetos: f.projetos, objetivos: f.objetivos, pessoas: f.pessoas,
    data_referencia: f.dataReferencia, status: "confirmado", criado_em: agora, revisado_por: quem, revisado_em: agora, corrige: f.id,
  }, `${novo}\n\nCorrige: [[${f.id}]] · Fonte: [[${f.fonte}]]`), "utf-8");
  // keeps who confirmed it and when (its history shows it); the correction's author/date live on the new fact
  updateNote(f.file, { status: "substituido", substituido_por: fid, substituido_em: agora });
  return fid;
}

/** All versions of a fact, oldest first: follows `corrige` back and `substituidoPor` forward. */
export function versoesFato(id: string, fatos: Fato[] = getFatos()): Fato[] {
  const por = new Map(fatos.map((f) => [f.id, f]));
  let primeiro = por.get(id);
  for (let i = 0; primeiro?.corrige && por.has(primeiro.corrige) && i < 50; i++) primeiro = por.get(primeiro.corrige);
  const lista: Fato[] = [];
  for (let f = primeiro, i = 0; f && i < 50; f = f.substituidoPor ? por.get(f.substituidoPor) : undefined, i++) lista.push(f);
  return lista;
}

const PARADAS = new Set("para pela pelo como mais muito sobre entre depois antes cada todo toda todos todas deve devem será serão está estão foram ser são tem têm isso esse essa este esta quando onde qual quais também ainda what with that this from have".split(" "));
/** Significant words (≥4 letters, no accents, no stop words). */
export const palavras = (t: string) => new Set(t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !PARADAS.has(w)));

// ---------------------------------------------------------------- K3: the one knowledge search

export type Achado = { fato: Fato; fonte: string; score: number };

/**
 * The single knowledge search for every AI in the app (task AI, Hermes, Venu, /api RAG):
 * ONLY confirmed facts. Scored by how many of the question's words the fact has, plus a boost
 * for each shared team/project/objective/person; newest review first on ties.
 */
export function buscarConhecimento(pergunta: string, opts: { equipe?: string; projetos?: string[]; objetivos?: string[]; pessoas?: string[]; limite?: number; minimo?: number;
  /** which AI gets these facts (D11, "a IA usou isto"); leave out when a person only browses */ origem?: string } = {}): Achado[] {
  const q = palavras(pergunta);
  const tags = new Set([opts.equipe && `e:${opts.equipe}`, ...(opts.projetos ?? []).map((x) => `p:${x}`), ...(opts.objetivos ?? []).map((x) => `o:${x}`), ...(opts.pessoas ?? []).map((x) => `h:${x}`)].filter(Boolean) as string[]);
  const fontes = new Map(getFontes().map((f) => [f.id, f.titulo]));
  const achados = getFatos().filter((f) => f.status === "confirmado").map((f) => {
    const w = palavras(f.texto);
    const comuns = [...q].filter((x) => w.has(x)).length;
    const ft = [f.equipe && `e:${f.equipe}`, ...f.projetos.map((x) => `p:${x}`), ...f.objetivos.map((x) => `o:${x}`), ...f.pessoas.map((x) => `h:${x}`)];
    const score = (q.size ? comuns / Math.min(q.size, 8) : 0) + 0.15 * ft.filter((x) => x && tags.has(x)).length;
    return { fato: f, fonte: fontes.get(f.fonte) ?? "", score };
  }).filter((a) => a.score >= (opts.minimo ?? 0.2))
    .sort((a, b) => b.score - a.score || b.fato.revisadoEm.localeCompare(a.fato.revisadoEm))
    .slice(0, opts.limite ?? 12);
  if (opts.origem) registrarUsoFatos(achados.map((a) => a.fato.id), opts.origem);
  return achados;
}

/** Facts as prompt lines: "- [prazo] texto (fonte: …, confirmado por X em AAAA-MM-DD)". */
export const formatarConhecimento = (achados: Achado[]) =>
  achados.map(({ fato: f, fonte }) => `- [${f.tipo}] ${f.texto} (fonte: ${fonte || f.fonte}; confirmado por ${f.revisadoPor || "?"} em ${diaLocal(f.revisadoEm)})`).join("\n");

/** lower case, no accents: "Manutenção" → "manutencao" */
const semAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * The confirmed base as people browse it (Conhecimento → Base confirmada): every word of `q` must appear
 * in the fact or its source title, in any order, accents ignored; plus exact filters ("-" = without team / project,
 * the map's gap cells). Newest review first.
 */
export function filtrarConfirmados(opts: { q?: string; equipe?: string; tipo?: string; projeto?: string; pessoa?: string }): Fato[] {
  const termos = semAcento(opts.q ?? "").split(/[^a-z0-9]+/).filter((x) => x.length >= 2);
  const fontes = new Map(getFontes().map((f) => [f.id, f.titulo]));
  return getFatos().filter((f) => f.status === "confirmado"
    && (!opts.equipe || (opts.equipe === "-" ? !f.equipe : f.equipe === opts.equipe)) && (!opts.tipo || f.tipo === opts.tipo)
    && (!opts.projeto || (opts.projeto === "-" ? !f.projetos.length : f.projetos.includes(opts.projeto))) && (!opts.pessoa || f.pessoas.includes(opts.pessoa))
    && (!termos.length || ((t) => termos.every((x) => t.includes(x)))(semAcento(`${f.texto} ${fontes.get(f.fonte) ?? ""}`))))
    .sort((a, b) => b.revisadoEm.localeCompare(a.revisadoEm));
}

const SISTEMA_RESPOSTA = `Você é o Pinu, o assistente do Nipëi OS. Responda em português do Brasil, em até 6 frases.
Use SÓ os fatos numerados que recebe (a base confirmada da comunidade). Cite cada fato que usar com o número entre colchetes, ex.: [2].
Se os fatos não respondem a pergunta, diga isso claramente em uma frase e não invente. Sem títulos nem listas longas.`;

/** "Resumir com o Pinu": answer a question from the given confirmed facts, citing them as [n] (n = position + 1). */
export async function responderComFatos(pergunta: string, fatos: Fato[]): Promise<string> {
  registrarUsoFatos(fatos.map((f) => f.id), "resumo");
  const lista = fatos.map((f, i) => `[${i + 1}] (${f.tipo}) ${f.texto}`).join("\n");
  return chamarIATexto(SISTEMA_RESPOSTA, [{ type: "text", text: `Pergunta: ${pergunta.slice(0, 500)}\n\nFatos confirmados:\n${lista}` }], 800, 60_000);
}

/** ISO timestamp → its day in Bahia ("2026-10-19"), for display. */
export const diaLocal = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bahia" }) : "");

/** Gestão reviews everything; a coordinator reviews the facts of their own team. */
export const podeRevisar = (me: Me, f: Fato) => me.gestao || (!!f.equipe && me.coordena.includes(f.equipe));

// ---------------------------------------------------------------- new source

function escreverFonte(id: string, fm: Record<string, FmValue>, resumo: string, texto: string) {
  const dir = path.join(vault(), FONTES);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${id}.md`);
  const body = [`# ${fm.titulo}`, "", "## Resumo", resumo || "(processando)", "", "## Texto", texto || "(sem texto extraído)"].join("\n");
  fs.writeFileSync(file, noteText({ ...fm, id, type: "fonte", updated_at: new Date().toISOString() }, body), "utf-8");
  requestSync(vault());
}

export function criarFonte(input: {
  titulo: string; por: string; acervo?: string;
  /** C7: sent from another place; `chave` = what exactly (e.g. one comment), so the same thing isn't sent twice */
  canal?: Canal; tarefa?: string; chave?: string; equipe?: string; projeto?: string;
} & (
  { tipo: "arquivo"; nome: string; bytes: Buffer } | { tipo: "link"; url: string } | { tipo: "texto"; texto: string }
)): string {
  if (input.canal) {
    const hoje = diaLocal(new Date().toISOString());
    const n = getFontes().filter((f) => f.canal && f.enviadoPor === input.por && diaLocal(f.enviadoEm) === hoje).length;
    if (n >= LIMITE_FONTES_CANAL_DIA) throw new Error(`Limite de ${LIMITE_FONTES_CANAL_DIA} envios por dia ao Conhecimento (fora desta página) atingido`);
  }
  const id = novoId("fnt");
  const fm: Record<string, FmValue> = {
    titulo: input.titulo.slice(0, 150), tipo: input.tipo, arquivo: "", url: "", enviado_por: input.por, enviado_em: new Date().toISOString(), status: "processando", erro: "",
    ...origemFonte({ acervo: input.acervo ?? "", canal: input.canal ?? "", tarefa: input.tarefa ?? "", chave: input.chave ?? "", equipe: input.equipe ?? "", projeto: input.projeto ?? "" }),
  };
  let texto = "";
  if (input.tipo === "arquivo") {
    const ext = input.nome.split(".").pop()?.toLowerCase() ?? "";
    if (!FONTE_TIPOS[ext]) throw new Error(`Formato não aceito: .${ext} (use PDF, foto ou texto)`);
    if (input.bytes.length > FONTE_MAX_BYTES) throw new Error("Arquivo maior que 10 MB");
    fs.mkdirSync(path.join(vault(), ARQUIVOS), { recursive: true });
    const rel = path.join(ARQUIVOS, `${id}.${ext}`);
    fs.writeFileSync(path.join(vault(), rel), input.bytes);
    fm.arquivo = rel.split(path.sep).join("/");
  } else if (input.tipo === "link") {
    if (!/^https?:\/\/\S+$/.test(input.url)) throw new Error("Link inválido");
    fm.url = input.url;
  } else {
    texto = input.texto.trim().slice(0, 100_000);
    if (texto.length < 20) throw new Error("Texto muito curto");
  }
  escreverFonte(id, fm, "", texto);
  return id;
}

// ---------------------------------------------------------------- reading a source

const PRIVADO = /^(localhost|.*\.local|.*\.internal)$/i;
function ipPrivado(ip: string) {
  return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd]|fe80)/i.test(ip);
}

/**
 * Google links point at a viewer page with no readable text; use the plain export instead
 * (Docs → txt, Sheets → csv, Slides → txt, Drive file → direct download). Folders can't be read.
 */
function urlDeLeitura(url: string): string {
  const id = url.match(/\/d\/([\w-]{10,})/)?.[1] ?? url.match(/[?&]id=([\w-]{10,})/)?.[1];
  if (/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//.test(url)) throw new Error("É uma pasta do Drive: a IA lê arquivos, não pastas. Ensine cada arquivo (ou envie-o aqui em Conhecimento).");
  if (!id) return url;
  if (url.includes("docs.google.com/document/")) return `https://docs.google.com/document/d/${id}/export?format=txt`;
  if (url.includes("docs.google.com/spreadsheets/")) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  if (url.includes("docs.google.com/presentation/")) return `https://docs.google.com/presentation/d/${id}/export/txt`;
  if (url.includes("drive.google.com/")) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

/** Fetches a public web page (no internal addresses) → plain text, a PDF → base64, an image → image. */
async function lerLink(url: string): Promise<Parte[]> {
  const original = url;
  url = urlDeLeitura(url);
  const doGoogle = url !== original;
  let res: Response | null = null;
  // follow redirects by hand so every hop is checked against internal addresses
  for (let hop = 0; hop < 4 && !res; hop++) {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || PRIVADO.test(u.hostname)) throw new Error("Endereço não permitido");
    const ip = isIP(u.hostname) ? u.hostname : (await lookup(u.hostname)).address;
    if (ipPrivado(ip)) throw new Error("Endereço não permitido");
    // ponytail: DNS is checked once per hop before fetch (rebinding could slip through); fine for a team-only upload box.
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "Mozilla/5.0 (Nipei OS)" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      url = new URL(r.headers.get("location")!, url).toString();
      if (new URL(url).hostname === "accounts.google.com") throw new Error("O arquivo do Google não está público. No Drive: Compartilhar → “Qualquer pessoa com o link”, ou envie o arquivo aqui em Conhecimento.");
    } else res = r;
  }
  if (!res) throw new Error("O link redireciona demais");
  if (doGoogle && [401, 403, 404].includes(res.status)) throw new Error("O arquivo do Google não está público. No Drive: Compartilhar → “Qualquer pessoa com o link”, ou envie o arquivo aqui em Conhecimento.");
  if (!res.ok) throw new Error(`O link respondeu ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > FONTE_MAX_BYTES) throw new Error("Página grande demais");
  const tipo = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (tipo.includes("pdf")) {
    return [{ type: "file", file: { filename: "link.pdf", file_data: `data:application/pdf;base64,${buf.toString("base64")}` } }];
  }
  if (/^image\/(jpeg|png|webp|gif)$/.test(tipo)) return [{ type: "image_url", image_url: { url: `data:${tipo};base64,${buf.toString("base64")}` } }];
  // a Drive "download" that answers HTML is Google's warning page (big file) or a login wall
  if (doGoogle && tipo === "text/html" && url.includes("drive.google.com")) throw new Error("Não consegui baixar o arquivo do Drive pelo link (privado ou grande demais). Envie o arquivo aqui em Conhecimento.");
  if (tipo && !tipo.startsWith("text/") && !/json|xml|csv/.test(tipo)) throw new Error(`Formato que a IA não lê pelo link (${tipo}). Use PDF, imagem, Google Docs/Planilhas/Apresentações ou envie o arquivo.`);
  const html = buf.toString("utf-8");
  const texto = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return [{ type: "text", text: `Página ${url}:\n${texto.slice(0, 60_000)}` }];
}

function lerArquivo(rel: string): Parte[] {
  const abs = path.join(vault(), rel);
  const ext = rel.split(".").pop()!.toLowerCase();
  const buf = fs.readFileSync(abs);
  if (ext === "pdf") return [{ type: "file", file: { filename: path.basename(rel), file_data: `data:application/pdf;base64,${buf.toString("base64")}` } }];
  if (FONTE_TIPOS[ext].startsWith("image/")) return [{ type: "image_url", image_url: { url: `data:${FONTE_TIPOS[ext]};base64,${buf.toString("base64")}` } }];
  return [{ type: "text", text: buf.toString("utf-8").slice(0, 100_000) }];
}

const SISTEMA = `Você organiza a base de conhecimento do Nipëi OS (Santuário Nipeihu, povo Yawanawá, Aldeia Mutum, Inirau). Responda SEMPRE em português do Brasil.
Leia a fonte e devolva:
- "titulo": título curto e claro da fonte;
- "resumo": resumo em markdown (até 200 palavras);
- "texto": se a fonte for PDF, imagem ou página, a transcrição do texto principal (até 4000 palavras; omita menus e rodapés); senão "";
- "fatos": de 0 a 40 afirmações curtas, verificáveis e autossuficientes (cada uma entendida sozinha: nomes completos, datas absolutas AAAA-MM-DD, valores com moeda). Só o que a fonte diz: zero invenção, nada de opinião genérica.
Para cada fato: {"texto": string, "tipo": "fato"|"decisao"|"prazo"|"procedimento"|"contato"|"valor", "equipe": id|null, "projetos": [ids], "objetivos": [ids], "pessoas": [ids], "data_referencia": "AAAA-MM-DD"|null}
Use só ids do catálogo abaixo; se não souber, deixe vazio.
Responda APENAS com um objeto JSON: {"titulo": string, "resumo": string, "texto": string, "fatos": [...]}`;

function catalogo() {
  return [
    "## Catálogo de ids",
    "Equipes: " + getEquipes().map((e) => `${e.id} (${e.nome})`).join("; "),
    "Projetos: " + getProjetos().map((p) => `${p.id} (${p.nome})`).join("; "),
    "Objetivos: " + getObjetivos().map((o) => `${o.id} (${o.ano}: ${o.titulo})`).join("; "),
    "Pessoas: " + getPessoas().filter((p) => p.equipes.length).map((p) => `${p.id} (${p.name})`).join("; "),
  ].join("\n");
}

/** Reads the source with the AI and writes its summary and proposed facts. Never throws: errors go to the note. */
export async function processarFonte(id: string) {
  const f = getFontes().find((x) => x.id === id);
  if (!f) return;
  const fm = (st: string, erro = ""): Record<string, FmValue> => ({ titulo: f.titulo, tipo: f.tipo, arquivo: f.arquivo, url: f.url, enviado_por: f.enviadoPor, enviado_em: f.enviadoEm, status: st, erro, ...origemFonte(f) });
  try {
    const conteudo: Parte[] = f.tipo === "arquivo" ? lerArquivo(f.arquivo) : f.tipo === "link" ? await lerLink(f.url) : [{ type: "text", text: f.texto }];
    // C7: the channel already knows the team/project (e.g. the task it came from): say so, and use it when the AI leaves them empty
    const contexto = [f.equipe && `equipe ${f.equipe}`, f.projeto && `projeto ${f.projeto}`].filter(Boolean).join(", ");
    const { o } = await chamarIA(SISTEMA, [{ type: "text", text: `${catalogo()}\n\n## Fonte: ${f.titulo}${contexto ? `\n(Enviada a partir de: ${contexto}. Use esses ids nos fatos, salvo se o fato for claramente de outra equipe/projeto.)` : ""}` }, ...conteudo], 8000, 180_000);
    const ids = {
      equipe: new Set(getEquipes().map((e) => e.id)), projeto: new Set(getProjetos().map((p) => p.id)),
      objetivo: new Set(getObjetivos().map((x) => x.id)), pessoa: new Set(getPessoas().map((p) => p.id)),
    };
    const so = (v: unknown, ok: Set<string>) => arr(v).filter((x) => ok.has(x));
    // reprocessing replaces only the facts nobody reviewed yet
    for (const x of getFatos().filter((x) => x.fonte === id && x.status === "proposto")) fs.unlinkSync(path.join(vault(), x.file));
    const fatos = (Array.isArray(o.fatos) ? o.fatos : []).slice(0, 40) as Record<string, unknown>[];
    fs.mkdirSync(path.join(vault(), FATOS), { recursive: true });
    for (const x of fatos) {
      const texto = s(x.texto).slice(0, 600);
      if (!texto) continue;
      const fid = novoId("fat");
      const equipe = ids.equipe.has(s(x.equipe)) ? s(x.equipe) : ids.equipe.has(f.equipe) ? f.equipe : "";
      const projetos = so(x.projetos, ids.projeto);
      if (!projetos.length && ids.projeto.has(f.projeto)) projetos.push(f.projeto);
      const data = /^\d{4}-\d{2}-\d{2}$/.test(s(x.data_referencia)) ? s(x.data_referencia) : "";
      const fmf: Record<string, FmValue> = {
        id: fid, type: "fato", texto, tipo: (TIPOS_FATO as readonly string[]).includes(s(x.tipo)) ? s(x.tipo) : "fato", fonte: id, equipe,
        projetos, objetivos: so(x.objetivos, ids.objetivo), pessoas: so(x.pessoas, ids.pessoa),
        data_referencia: data, status: "proposto", criado_em: new Date().toISOString(), revisado_por: "", revisado_em: "",
      };
      fs.writeFileSync(path.join(vault(), FATOS, `${slugify(texto) || "fato"}_${fid.slice(4)}.md`), noteText(fmf, `${texto}\n\nFonte: [[${id}]]`), "utf-8");
    }
    escreverFonte(id, { ...fm("pronta"), titulo: f.titulo || s(o.titulo).slice(0, 150) || "Sem título" }, s(o.resumo), f.tipo === "texto" ? f.texto : s(o.texto));
    // K2: check the new facts against what the base already knows (alerts show up during review)
    const novos = getFatos().filter((x) => x.fonte === id && x.status === "proposto").map((x) => x.id);
    await auditarFatos(novos).catch((e) => console.warn("[conhecimento] auditoria falhou:", (e as Error).message));
  } catch (e) {
    escreverFonte(id, fm("erro", (e as Error).message.slice(0, 200)), "", f.texto);
  }
}

// ---------------------------------------------------------------- review

/**
 * The passage of the source a fact most likely came from (most shared words), to review it next to the
 * original. Lines and sentences (markdown bullets/headings marks dropped); capped at 400 characters.
 */
export function trechoOriginal(fonteTexto: string, fatoTexto: string): string {
  const alvo = palavras(fatoTexto);
  const partes = fonteTexto.split(/\r?\n|(?<=[.!?])\s+(?=[A-ZÀ-Ú])/).map((x) => x.replace(/^[#>*\-\s]+/, "").trim()).filter((x) => x.length > 20);
  let melhor = "", nota = 0;
  for (const x of partes) {
    let n = 0;
    for (const w of palavras(x)) if (alvo.has(w)) n++;
    if (n > nota) { nota = n; melhor = x; }
  }
  return melhor.length > 400 ? melhor.slice(0, 400).replace(/\s\S*$/, "") + "…" : melhor;
}

/** Team of a fact (decides who may review it: gestão or that team's coordination). "" = no team. */
export function definirEquipeFato(id: string, equipe: string, quem: string) {
  const f = getFatos().find((x) => x.id === id);
  if (!f) throw new Error("Fato não encontrado");
  if (equipe && !getEquipes().some((e) => e.id === equipe)) throw new Error("Equipe não encontrada");
  updateNote(f.file, { equipe, equipe_definida_por: quem, equipe_definida_em: new Date().toISOString() });
}

export function revisarFato(id: string, acao: "confirmar" | "descartar", quem: string, texto?: string) {
  const f = getFatos().find((x) => x.id === id);
  if (!f) throw new Error("Fato não encontrado");
  const items: Record<string, FmValue> = { status: acao === "confirmar" ? "confirmado" : "descartado", revisado_por: quem, revisado_em: new Date().toISOString() };
  const novo = texto?.trim().slice(0, 600);
  if (acao === "confirmar" && novo && novo !== f.texto) items.texto = novo;
  updateNote(f.file, items);
}
