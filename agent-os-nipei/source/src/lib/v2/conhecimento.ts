import fs from "fs";
import path from "path";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIA, type Parte } from "./ia";
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
};
export type Fato = {
  id: string; file: string; texto: string; tipo: string; fonte: string; equipe: string; projetos: string[]; objetivos: string[];
  pessoas: string[]; dataReferencia: string; status: StatusFato; criadoEm: string; revisadoPor: string; revisadoEm: string; substituidoPor: string;
  motivo: string; // "duplicado" when discarded only for repeating a confirmed fact (not a correction)
};

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const novoId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const secao = (body: string, nome: string) => body.match(new RegExp(`## ${nome}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`))?.[1].trim() ?? "";

export function getFontes(): Fonte[] {
  return readDir(FONTES).filter(({ fm }) => fm.type === "fonte").map(({ file, fm, body }) => ({
    id: s(fm.id), file, titulo: s(fm.titulo), tipo: (s(fm.tipo) || "texto") as Fonte["tipo"], arquivo: s(fm.arquivo), url: s(fm.url),
    enviadoPor: s(fm.enviado_por), enviadoEm: s(fm.enviado_em), status: (s(fm.status) || "processando") as Fonte["status"], erro: s(fm.erro),
    resumo: secao(body, "Resumo"), texto: secao(body, "Texto"),
  })).sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));
}

export function getFatos(): Fato[] {
  return readDir(FATOS).filter(({ fm }) => fm.type === "fato").map(({ file, fm }) => ({
    id: s(fm.id), file, texto: s(fm.texto), tipo: s(fm.tipo) || "fato", fonte: s(fm.fonte), equipe: s(fm.equipe),
    projetos: arr(fm.projetos), objetivos: arr(fm.objetivos), pessoas: arr(fm.pessoas), dataReferencia: s(fm.data_referencia),
    status: (s(fm.status) || "proposto") as StatusFato, criadoEm: s(fm.criado_em), revisadoPor: s(fm.revisado_por), revisadoEm: s(fm.revisado_em),
    substituidoPor: s(fm.substituido_por), motivo: s(fm.descartado_motivo),
  }));
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
export function buscarConhecimento(pergunta: string, opts: { equipe?: string; projetos?: string[]; objetivos?: string[]; pessoas?: string[]; limite?: number; minimo?: number } = {}): Achado[] {
  const q = palavras(pergunta);
  const tags = new Set([opts.equipe && `e:${opts.equipe}`, ...(opts.projetos ?? []).map((x) => `p:${x}`), ...(opts.objetivos ?? []).map((x) => `o:${x}`), ...(opts.pessoas ?? []).map((x) => `h:${x}`)].filter(Boolean) as string[]);
  const fontes = new Map(getFontes().map((f) => [f.id, f.titulo]));
  return getFatos().filter((f) => f.status === "confirmado").map((f) => {
    const w = palavras(f.texto);
    const comuns = [...q].filter((x) => w.has(x)).length;
    const ft = [f.equipe && `e:${f.equipe}`, ...f.projetos.map((x) => `p:${x}`), ...f.objetivos.map((x) => `o:${x}`), ...f.pessoas.map((x) => `h:${x}`)];
    const score = (q.size ? comuns / Math.min(q.size, 8) : 0) + 0.15 * ft.filter((x) => x && tags.has(x)).length;
    return { fato: f, fonte: fontes.get(f.fonte) ?? "", score };
  }).filter((a) => a.score >= (opts.minimo ?? 0.2))
    .sort((a, b) => b.score - a.score || b.fato.revisadoEm.localeCompare(a.fato.revisadoEm))
    .slice(0, opts.limite ?? 12);
}

/** Facts as prompt lines: "- [prazo] texto (fonte: …, confirmado por X em AAAA-MM-DD)". */
export const formatarConhecimento = (achados: Achado[]) =>
  achados.map(({ fato: f, fonte }) => `- [${f.tipo}] ${f.texto} (fonte: ${fonte || f.fonte}; confirmado por ${f.revisadoPor || "?"} em ${diaLocal(f.revisadoEm)})`).join("\n");

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

export function criarFonte(input: { titulo: string; por: string } & (
  { tipo: "arquivo"; nome: string; bytes: Buffer } | { tipo: "link"; url: string } | { tipo: "texto"; texto: string }
)): string {
  const id = novoId("fnt");
  const fm: Record<string, FmValue> = { titulo: input.titulo.slice(0, 150), tipo: input.tipo, arquivo: "", url: "", enviado_por: input.por, enviado_em: new Date().toISOString(), status: "processando", erro: "" };
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

/** Fetches a public web page (no internal addresses) → plain text, or a PDF → base64. */
async function lerLink(url: string): Promise<Parte[]> {
  let res: Response | null = null;
  // follow redirects by hand so every hop is checked against internal addresses
  for (let hop = 0; hop < 4 && !res; hop++) {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || PRIVADO.test(u.hostname)) throw new Error("Endereço não permitido");
    const ip = isIP(u.hostname) ? u.hostname : (await lookup(u.hostname)).address;
    if (ipPrivado(ip)) throw new Error("Endereço não permitido");
    // ponytail: DNS is checked once per hop before fetch (rebinding could slip through); fine for a team-only upload box.
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000), headers: { "User-Agent": "Mozilla/5.0 (Nipei OS)" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) url = new URL(r.headers.get("location")!, url).toString();
    else res = r;
  }
  if (!res) throw new Error("O link redireciona demais");
  if (!res.ok) throw new Error(`O link respondeu ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > FONTE_MAX_BYTES) throw new Error("Página grande demais");
  if ((res.headers.get("content-type") ?? "").includes("pdf")) {
    return [{ type: "file", file: { filename: "link.pdf", file_data: `data:application/pdf;base64,${buf.toString("base64")}` } }];
  }
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
  const fm = (st: string, erro = ""): Record<string, FmValue> => ({ titulo: f.titulo, tipo: f.tipo, arquivo: f.arquivo, url: f.url, enviado_por: f.enviadoPor, enviado_em: f.enviadoEm, status: st, erro });
  try {
    const conteudo: Parte[] = f.tipo === "arquivo" ? lerArquivo(f.arquivo) : f.tipo === "link" ? await lerLink(f.url) : [{ type: "text", text: f.texto }];
    const { o } = await chamarIA(SISTEMA, [{ type: "text", text: `${catalogo()}\n\n## Fonte: ${f.titulo}` }, ...conteudo], 8000, 180_000);
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
      const equipe = ids.equipe.has(s(x.equipe)) ? s(x.equipe) : "";
      const data = /^\d{4}-\d{2}-\d{2}$/.test(s(x.data_referencia)) ? s(x.data_referencia) : "";
      const fmf: Record<string, FmValue> = {
        id: fid, type: "fato", texto, tipo: (TIPOS_FATO as readonly string[]).includes(s(x.tipo)) ? s(x.tipo) : "fato", fonte: id, equipe,
        projetos: so(x.projetos, ids.projeto), objetivos: so(x.objetivos, ids.objetivo), pessoas: so(x.pessoas, ids.pessoa),
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

export function revisarFato(id: string, acao: "confirmar" | "descartar", quem: string, texto?: string) {
  const f = getFatos().find((x) => x.id === id);
  if (!f) throw new Error("Fato não encontrado");
  const items: Record<string, FmValue> = { status: acao === "confirmar" ? "confirmado" : "descartado", revisado_por: quem, revisado_em: new Date().toISOString() };
  const novo = texto?.trim().slice(0, 600);
  if (acao === "confirmar" && novo && novo !== f.texto) items.texto = novo;
  updateNote(f.file, items);
}
