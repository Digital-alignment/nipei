// The one place that reads and writes task notes (Productivity/Tarefas/*.md).
// Every writer — v2 pages, v1 kanban, Venu/Hermes API, agents — goes through writeTarefa /
// createTarefaNote, so a note always has the same shape and every change leaves a line in
// "## Atividade". Dependency-free on purpose (only fs/path/js-yaml, vault root passed in) so the
// bulk migration script can import it with plain `node`.
//
// Note shape:
//   ---  frontmatter: every structured field (single source)  ---
//   # <title>
//   ## Descrição      free text written by people (or applied from an AI suggestion)
//   ## Checklist      "- [ ] item" / "- [x] item"
//   <other sections people add in Obsidian are kept as they are>
//   ## Atividade      newest first: "- 2026-10-19 18:40 · Bruna · Status A fazer → Em andamento"
//   ## Origem         where the task came from (Notion import, Venu, Hermes…)

import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export const TAREFAS_DIR = path.join("Productivity", "Tarefas");

export type ChecklistItem = { feito: boolean; texto: string };
export type TarefaDoc = {
  fm: Record<string, unknown>;
  descricao: string;
  checklist: ChecklistItem[];
  atividade: string[];
  origem: string;
  outras: { titulo: string; corpo: string }[];
};

// ---------------------------------------------------------------- parsing (new + legacy formats)

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// CORE_SCHEMA: no timestamp type, so "2026-10-19" stays a string.
const loadFm = (raw: string) => (yaml.load(raw, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>) || {};

/** Boilerplate the old importers wrote; never treated as a real description. */
const BOILERPLATE = [
  /^Sem notas adicionais informadas\.?$/i,
  /^Registrada via comando de linguagem natural no Nipëi OS\.?$/i,
  /^Criada por comando vocal\/executivo em Venu\.?$/i,
  /^Criada via Nipëi OS Kanban \/ Hermes Task Assistant\.?$/i,
];
const isBoilerplate = (line: string) => BOILERPLATE.some((re) => re.test(line.replace(/^[-*]\s*/, "").trim()));

/** Notion import keys that are already frontmatter fields (dropped from Origem). */
const NOTION_REDUNDANT = /^(Status|Responsável|Prioridade|Prazo|Esfera|Assigned|Completed|Priority)\s*:|^Sem conteúdo de página adicional\.?$/i;

/** "16/10/2026, 00:00:24" (old toLocaleString) → "2026-10-16 00:00"; anything else unchanged. */
const normDate = (v: string) => {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")} ${m[4].padStart(2, "0")}:${m[5]}` : v;
};

export function parseTarefa(text: string): TarefaDoc {
  const m = text.match(FM_RE);
  const fm = m ? loadFm(m[1]) : {};
  const body = m ? text.slice(m[0].length) : text;
  const doc: TarefaDoc = { fm, descricao: "", checklist: [], atividade: [], origem: "", outras: [] };

  // Split into "## " sections; legacy "### 🤖 …" logs and trailing "- **Estado**" lines become activity.
  const sections: { titulo: string; linhas: string[] }[] = [];
  let cur: { titulo: string; linhas: string[] } = { titulo: "", linhas: [] };
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)$/) ?? line.match(/^###\s+(🤖.*|💬.*)$/);
    if (h) { sections.push(cur); cur = { titulo: h[1].trim(), linhas: [] }; continue; }
    cur.linhas.push(line);
  }
  sections.push(cur);

  const desc: string[] = [];
  const legacyLog: string[] = [];
  for (const sec of sections) {
    // Status lines old writers appended at the end of a note, wherever it ended:
    // "- ⚡ **Actualizado por Hermes 2.0**: …", "- **Estado**: 🟢 Concluído … (16/10/2026, 00:00:24)".
    sec.linhas = sec.linhas.filter((l) => {
      if (!/^\s*-\s*(⚡|\*\*Estado\*\*)/.test(l)) return true;
      legacyLog.push(`- ${normDate(l.match(/\(([^)]+)\)\s*$/)?.[1] ?? "")} · ${/⚡/.test(l) ? "Hermes (v1)" : "v1"} · ${l.replace(/^\s*-\s*/, "").replace(/\*\*/g, "").replace(/\s*\([^)]*\)\s*$/, "").trim()}`);
      return false;
    });
  }
  for (const { titulo, linhas } of sections) {
    const t = titulo.replace(/^[^\p{L}]+/u, "").toLowerCase(); // strip emoji prefix
    const corpo = linhas.join("\n").trim();
    if (!titulo) {
      // Preamble: H1, agent comments, old status line — all derived from frontmatter, dropped.
      // Legacy "- **Estado**: …" lines appended at the end of old notes land here or in a section.
      continue;
    }
    if (t.startsWith("descrição") || t.startsWith("descricao")) {
      // Legacy sections are "Descrição & Notas" / "Descrição & Instruções" — keep real text only.
      const real = linhas.filter((l) => l.trim() && !isBoilerplate(l));
      if (/^descri[çc][ãa]o\s*&/.test(t) && real.length === 1 && real[0].replace(/^[-*]\s*/, "").trim() === String(fm.title ?? "").trim()) continue;
      if (real.length) desc.push(real.join("\n").trim());
    } else if (t.startsWith("checklist")) {
      for (const l of linhas) {
        const c = l.match(/^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/);
        if (c) doc.checklist.push({ feito: c[1] !== " ", texto: c[2].trim() });
      }
    } else if (t.startsWith("atividade")) {
      doc.atividade.push(...linhas.filter((l) => /^\s*-\s+/.test(l)).map((l) => l.trim()));
    } else if (t.startsWith("origem")) {
      doc.origem = corpo;
    } else if (t.startsWith("detalhes importados do notion")) {
      const inner = corpo.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      const linhasNotion = inner.split("\n").map((l) => l.trim()).filter(Boolean);
      const projeto = linhasNotion.find((l) => /^Projeto:/i.test(l));
      const extra = linhasNotion.filter((l) => !/^Projeto:/i.test(l) && !NOTION_REDUNDANT.test(l));
      const pm = projeto?.match(/^Projeto:\s*(.+?)\s*\((https?:\/\/[^)]+)\)/i);
      doc.origem = [
        "Importada do Notion.",
        pm ? `Projeto no Notion: [${pm[1]}](${pm[2]})` : projeto ? projeto : "",
        extra.length ? "\n" + extra.join("\n") : "",
      ].filter(Boolean).join("\n");
    } else if (/^(🤖|💬)/.test(titulo) || t.startsWith("registro de execução") || t.startsWith("atualização via venu") || t.startsWith("nota de seguimiento")) {
      const when = normDate(titulo.match(/\(([^)]+)\)/)?.[1] ?? "");
      const texto = linhas.filter((l) => l.trim() && !/^\s*-\s*\*\*Estado\*\*/.test(l)).map((l) => l.replace(/^>\s*/, "").trim()).join(" ");
      legacyLog.push(`- ${when} · ${/seguimiento|💬/i.test(titulo) ? "comentário (v1)" : "agente IA (v1)"} · ${texto || "registro de execução"}`.replace(/\s+/g, " "));
    } else if (/^(projeto vinculado|responsáveis|rastreabilidade|trazabilidad)/.test(t)) {
      // Derived from frontmatter (project, responsible, file path): dropped.
    } else {
      doc.outras.push({ titulo, corpo });
    }
  }
  doc.descricao = desc.join("\n\n").trim();
  // Old notes logged verbatim duplicates ("Registro … 00:00:24" twice): keep one of each.
  doc.atividade.push(...[...new Set(legacyLog)]);
  return doc;
}

// ---------------------------------------------------------------- rendering

const dumpFm = (fm: Record<string, unknown>) =>
  yaml.dump(fm, { schema: yaml.CORE_SCHEMA, lineWidth: -1, quotingType: '"', forceQuotes: true, flowLevel: 1, noRefs: true }).trimEnd();

export function renderTarefa(doc: TarefaDoc): string {
  const out = ["---", dumpFm(doc.fm), "---", "", `# ${String(doc.fm.title ?? "").trim() || "Tarefa"}`, ""];
  out.push("## Descrição", doc.descricao.trim(), "");
  out.push("## Checklist", ...doc.checklist.map((c) => `- [${c.feito ? "x" : " "}] ${c.texto}`), "");
  for (const o of doc.outras) out.push(`## ${o.titulo}`, o.corpo, "");
  out.push("## Atividade", ...doc.atividade, "");
  if (doc.origem.trim()) out.push("## Origem", doc.origem.trim(), "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

// ---------------------------------------------------------------- activity

/** "2026-10-19 18:40" in the sanctuary's time zone. */
export function agora(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// Labels avoid "key:" so no legacy regex (status:, prazo:, squad:…) ever matches activity text.
const LABELS: Record<string, string> = {
  title: "Título", status: "Status", priority: "Prioridade", prazo: "Prazo", equipe: "Equipe", area: "Área",
  projeto: "Projeto", objetivo: "Objetivo", responsaveis: "Responsáveis", agents: "Agentes", recorrencia: "Repetição",
};
/** id → display name for people, teams, projects and goals, so the log reads "Bruna", not "bruna_retiros". */
export function nomesDoVault(vaultRoot: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [dir, key] of [["Miembros", "name"], ["Equipes", "nome"], ["Projetos", "nome"], ["Objetivos", "titulo"]] as const) {
    const full = path.join(vaultRoot, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith(".md")) continue;
      const head = fs.readFileSync(path.join(full, f), "utf-8").slice(0, 2000);
      const id = head.match(/^id:\s*"?([^"\n]+)"?\s*$/m)?.[1] ?? f.slice(0, -3);
      const nome = head.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?\\s*$`, "m"))?.[1];
      if (nome) out[id] = nome.split(" (")[0];
    }
  }
  return out;
}

const show = (v: unknown, nomes: Record<string, string> = {}) => {
  const one = (x: unknown) => nomes[String(x)] ?? String(x ?? "").trim();
  return Array.isArray(v) ? (v.length ? v.map(one).join(", ") : "—") : one(v) || "—";
};

function diffLines(antes: TarefaDoc, depois: TarefaDoc, nomes: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, label] of Object.entries(LABELS)) {
    if (show(antes.fm[k]) !== show(depois.fm[k])) out.push(`${label} ${show(antes.fm[k], nomes)} → ${show(depois.fm[k], nomes)}`);
  }
  // Attachments and checklist: say which item, not just a count.
  const anexoNome = (x: unknown) => { const o = (x ?? {}) as Record<string, unknown>; return String(o.titulo ?? o.nome ?? o.url ?? o.path ?? "anexo"); };
  const anexoKey = (x: unknown) => { const o = (x ?? {}) as Record<string, unknown>; return String(o.id ?? o.path ?? o.url ?? JSON.stringify(o)); };
  const lista = (v: unknown) => (Array.isArray(v) ? v : []);
  const keysA = new Set(lista(antes.fm.anexos).map(anexoKey)), keysD = new Set(lista(depois.fm.anexos).map(anexoKey));
  for (const x of lista(depois.fm.anexos)) if (!keysA.has(anexoKey(x))) out.push(`anexou “${anexoNome(x)}”`);
  for (const x of lista(antes.fm.anexos)) if (!keysD.has(anexoKey(x))) out.push(`removeu o anexo “${anexoNome(x)}”`);
  if (antes.descricao.trim() !== depois.descricao.trim()) out.push("Descrição atualizada");
  const itensA = new Map(antes.checklist.map((c) => [c.texto, c.feito])), itensD = new Map(depois.checklist.map((c) => [c.texto, c.feito]));
  for (const [texto, feito] of itensD) {
    if (!itensA.has(texto)) out.push(`adicionou à checklist “${texto}”`);
    else if (itensA.get(texto) !== feito) out.push(`${feito ? "concluiu" : "reabriu"} “${texto}”`);
  }
  for (const texto of itensA.keys()) if (!itensD.has(texto)) out.push(`removeu da checklist “${texto}”`);
  return out;
}

/** "- 2026-10-19 18:40 · Bruna · comentou “…”" → parts for the UI (null for free-form lines). */
export function parseAtividade(line: string): { quando: string; quem: string; texto: string; comentario: string | null } | null {
  const m = line.match(/^-\s*(.*?)\s+·\s+(.*?)\s+·\s+([\s\S]*)$/);
  if (!m) return null;
  const c = m[3].match(/^comentou “([\s\S]*)”$/);
  return { quando: m[1], quem: m[2], texto: m[3], comentario: c ? c[1] : null };
}

// ---------------------------------------------------------------- read / write

/** Resolves a vault-relative task note path; refuses anything outside Productivity/Tarefas. */
export function resolveTarefa(vaultRoot: string, relFile: string): string {
  const abs = path.resolve(vaultRoot, relFile);
  const dir = path.resolve(vaultRoot, TAREFAS_DIR);
  if (!abs.startsWith(dir + path.sep) || !abs.endsWith(".md")) throw new Error(`Caminho de tarefa inválido: ${relFile}`);
  return abs;
}

/**
 * Asks the VPS to sync the vault now (a systemd path unit watches this file; see
 * nipei-control/scripts/vault-sync-on-write/). Harmless locally: the file is gitignored.
 */
export function requestSync(vaultRoot: string) {
  try { fs.writeFileSync(path.join(vaultRoot, ".sync-request"), new Date().toISOString()); } catch { /* best effort */ }
}

/**
 * Read → change → write a task note. `mutate` edits the parsed doc; activity lines are derived
 * from what changed, plus any `extra` lines (comments, "IA sugeriu…"). Always writes the new format.
 */
export function writeTarefa(vaultRoot: string, relFile: string, actor: string, mutate: (doc: TarefaDoc) => void, extra: string[] = []) {
  const abs = resolveTarefa(vaultRoot, relFile);
  const antes = parseTarefa(fs.readFileSync(abs, "utf-8"));
  const doc = parseTarefa(fs.readFileSync(abs, "utf-8"));
  mutate(doc);
  const linhas = [...diffLines(antes, doc, nomesDoVault(vaultRoot)), ...extra];
  // A repeating task just marked done spawns its next occurrence — here, so every writer gets it.
  // `proxima` guards against a second copy when someone reopens and closes the same task again.
  if (!concluida(antes.fm.status) && concluida(doc.fm.status) && !doc.fm.proxima && RECORRENCIAS.includes(String(doc.fm.recorrencia ?? "") as Recorrencia)) {
    const prox = criarProxima(vaultRoot, doc, actor);
    doc.fm.proxima = prox.id;
    linhas.push(`repetição criada: ${prox.id} (prazo ${prox.prazo})`);
  }
  if (!linhas.length) return doc;
  // when it was finished (Participação, "done in the last 30 days"); reopening clears it
  if (!concluida(antes.fm.status) && concluida(doc.fm.status)) doc.fm.concluido_em = new Date().toISOString();
  else if (concluida(antes.fm.status) && !concluida(doc.fm.status)) doc.fm.concluido_em = "";
  doc.fm.updated_at = new Date().toISOString();
  doc.fm.updated_by = actor;
  avisarMudancas(vaultRoot, antes, doc, actor, extra);
  const quando = agora();
  doc.atividade.unshift(...linhas.map((l) => `- ${quando} · ${actor} · ${l}`));
  fs.writeFileSync(abs, renderTarefa(doc), "utf-8");
  requestSync(vaultRoot);
  return doc;
}

// ---------------------------------------------------------------- WhatsApp notices (queue)
// Writers only enqueue; the sender on the VPS host (nipei-control/scripts/avisos/) decides who may
// receive (team with `avisos: true`, WhatsApp in the person's note, no `avisos_whatsapp: false`) and sends.

function enfileirarAviso(vaultRoot: string, aviso: Record<string, unknown>) {
  try {
    const dir = path.join(vaultRoot, ".jobs", "avisos");
    fs.mkdirSync(dir, { recursive: true });
    const id = `av_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const tmp = path.join(vaultRoot, ".jobs", `${id}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify({ id, criado: new Date().toISOString(), ...aviso }), "utf-8");
    fs.renameSync(tmp, path.join(dir, `${id}.json`)); // the sender never sees a half-written file
  } catch { /* a notice must never break a task write */ }
}

/** New owners → "atribuicao"; a comment with "@Nome" → "mencao". */
function avisarMudancas(vaultRoot: string, antes: TarefaDoc, depois: TarefaDoc, actor: string, extra: string[]) {
  const base = { tarefaId: String(depois.fm.id ?? ""), titulo: String(depois.fm.title ?? ""), prazo: String(depois.fm.prazo ?? ""), autor: actor };
  const ids = (d: TarefaDoc) => (Array.isArray(d.fm.responsaveis) ? (d.fm.responsaveis as unknown[]).map(String) : []);
  const novos = ids(depois).filter((x) => !ids(antes).includes(x));
  if (novos.length) enfileirarAviso(vaultRoot, { tipo: "atribuicao", para: novos, ...base });
  for (const l of extra) {
    const c = l.match(/^comentou “([\s\S]*)”$/);
    if (c && c[1].includes("@")) enfileirarAviso(vaultRoot, { tipo: "mencao", texto: c[1], ...base });
  }
}

// ---------------------------------------------------------------- recurring tasks

export const RECORRENCIAS = ["semanal", "quinzenal", "mensal"] as const;
export type Recorrencia = (typeof RECORRENCIAS)[number];
/** Done, not archived: archiving a repeating task stops the series. */
const concluida = (v: unknown) => /conclu|done|feito/i.test(String(v ?? ""));

export function proximoPrazo(prazo: string, rec: Recorrencia, hoje = new Date()): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? new Date(prazo + "T12:00:00Z") : hoje;
  const d = new Date(base);
  if (rec === "mensal") {
    d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getUTCDate() !== base.getUTCDate()) d.setUTCDate(0); // 31 Jan → 28/29 Feb, not 3 Mar
  }
  else d.setUTCDate(d.getUTCDate() + (rec === "semanal" ? 7 : 14));
  return d.toISOString().slice(0, 10);
}

function criarProxima(vaultRoot: string, doc: TarefaDoc, actor: string) {
  const fm = doc.fm;
  const rec = String(fm.recorrencia) as Recorrencia;
  const prazo = proximoPrazo(String(fm.prazo ?? ""), rec);
  const copiar = ["priority", "project", "responsible", "equipe", "area", "projeto", "objetivo", "responsaveis", "squad", "agents"];
  const { id } = createTarefaNote(vaultRoot, {
    title: String(fm.title ?? "Tarefa"),
    ...Object.fromEntries(copiar.filter((k) => k in fm).map((k) => [k, fm[k]])),
    prazo, recorrencia: rec, recorrencia_de: String(fm.recorrencia_de ?? fm.id ?? ""),
  }, actor, {
    descricao: doc.descricao,
    checklist: doc.checklist.map((c) => ({ ...c, feito: false })),
    origem: `Repetição ${rec} de ${String(fm.id ?? "")}.`,
    semAviso: true, // the same people already own the series; the morning reminder covers it
  });
  return { id, prazo };
}

/** Next sequential id (task_N) and a file name for it. */
export function novoTarefaId(vaultRoot: string, title: string) {
  const dir = path.join(vaultRoot, TAREFAS_DIR);
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const id = fs.readFileSync(path.join(dir, f), "utf-8").match(/^id:\s*"?task_(\d+)"?\s*$/m)?.[1];
    if (id) n = Math.max(n, Number(id));
  }
  n += 1;
  const slug = title.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "_").slice(0, 40).replace(/^_|_$/g, "");
  return { id: `task_${n}`, relFile: path.join(TAREFAS_DIR, `${n}_${slug || "tarefa"}.md`) };
}

/** Creates a task note in the new format. Missing standard fields get empty values so legacy regexes always hit frontmatter first. */
export function createTarefaNote(
  vaultRoot: string,
  fm: Record<string, unknown> & { title: string },
  actor: string,
  opts: { descricao?: string; checklist?: ChecklistItem[]; origem?: string; semAviso?: boolean } = {},
) {
  const { id, relFile } = novoTarefaId(vaultRoot, fm.title);
  const now = new Date().toISOString();
  const { title, ...rest } = fm;
  const doc: TarefaDoc = {
    fm: {
      id, title, type: "tarefa", status: "A fazer", priority: "Média", prazo: "", project: "Geral", responsible: "",
      equipe: "", area: "", projeto: "", objetivo: "", responsaveis: [], anexos: [], tags: ["tarefa", "nipei-os"],
      ...rest, created_at: now, created_by: actor, updated_at: now, updated_by: actor,
    },
    descricao: opts.descricao ?? "",
    checklist: opts.checklist ?? [],
    atividade: [`- ${agora()} · ${actor} · criou a tarefa`],
    origem: opts.origem ?? "",
    outras: [],
  };
  doc.fm.id = id;
  fs.writeFileSync(path.join(vaultRoot, relFile), renderTarefa(doc), { encoding: "utf-8", flag: "wx" });
  requestSync(vaultRoot);
  if (!opts.semAviso) avisarMudancas(vaultRoot, { ...doc, fm: { ...doc.fm, responsaveis: [] } }, doc, actor, []);
  return { id, relFile, doc };
}

/** Rewrites a legacy note in the new format without changing any data (used by the bulk migration). */
export function migrarTarefa(text: string, quando = agora()): string {
  const doc = parseTarefa(text);
  const base = { responsible: "", prazo: "", equipe: "", area: "", projeto: "", objetivo: "", responsaveis: [], anexos: [] };
  for (const [k, v] of Object.entries(base)) if (!(k in doc.fm)) doc.fm[k] = v; // missing keys go last, existing order kept
  if (!doc.atividade.some((l) => l.includes("formato v2"))) doc.atividade.unshift(`- ${quando} · migração · nota convertida ao formato v2 (versão anterior no histórico do git)`);
  return renderTarefa(doc);
}
