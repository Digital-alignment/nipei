import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { cookies } from "next/headers";
import { defaultVault } from "@/lib/config";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { normalizeDueDate } from "@/lib/kanbanGrounding";
import { createTarefaNote, parseTarefa, requestSync, writeTarefa, type ChecklistItem, type TarefaDoc } from "@/lib/tarefaNote";

// v2 data layer: everything is read straight from the vault notes on each request.
// Source of truth per concept: Equipes/, Projetos/, Objetivos/, Eventos/, Miembros/, Productivity/Tarefas/.

export type Status = "todo" | "doing" | "done";

export type Equipe = {
  id: string; nome: string; cor: string; areas: string[]; coordenadores: string[]; membros: string[];
  acesso: boolean; // members of this team can log in
  gestao: boolean; // members of this team manage everything (full session, v1 included)
  avisos: boolean; // members get WhatsApp notices (scripts/avisos on the VPS)
};
export type Projeto = { id: string; nome: string; equipes: string[]; descricao: string; atualizacoes: string[] };
export type Objetivo = { id: string; file: string; titulo: string; ano: number; equipe: string; apoio: string[]; projeto: string; descricao: string; donoConfirmado: boolean };
export type Evento = { id: string; file: string; titulo: string; inicio: string; fim: string; status: string; equipe: string };
export type Pessoa = {
  id: string; nipeiId: string; name: string; nativeName: string; equipes: string[]; coordena: string[]; usuario: string;
  whatsapp: string; email: string; area: string; funcao: string; disponibilidade: string; incompleta: boolean; cadastroEm: string;
  avisosWhatsapp: boolean; // false = the person switched WhatsApp notices off
  // "Meu perfil" (lib/v2/perfil.ts): private fields are shown only to the person and gestão.
  apelido: string; dataNascimento: string; nacionalidade: string; cidade: string; pais: string; idioma: string;
  emergenciaNome: string; emergenciaWhatsapp: string; foto: string;
  whatsappVerificado: boolean; whatsappVerificadoEm: string; dadosConfirmadosEm: string;
};
export type Tarefa = {
  id: string; file: string; title: string; status: Status; statusRaw: string; prazo: string; priority: string;
  equipe: string; area: string; projeto: string; objetivo: string; responsaveis: string[]; responsible: string;
  checklist: { feitos: number; total: number }; anexos: number; recorrencia: string;
};

export const vault = () => {
  const v = defaultVault();
  if (!v) throw new Error("Vault não configurado (VAULT_PATH)");
  return v;
};

export type Note = { file: string; fm: Record<string, unknown>; body: string };

export function readDir(dir: string): Note[] {
  const full = path.join(vault(), dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).flatMap((file) => {
    const text = fs.readFileSync(path.join(full, file), "utf-8");
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    try {
      const fm = (m && yaml.load(m[1])) || {};
      return typeof fm === "object" ? [{ file: path.join(dir, file), fm: fm as Record<string, unknown>, body: m?.[2] ?? text }] : [];
    } catch {
      console.warn(`[v2] frontmatter inválido: ${dir}/${file}`);
      return [];
    }
  });
}

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
/** Body text without the H1 and agent comments: the description shown in the UI. */
const desc = (body: string) =>
  body.replace(/<!--[\s\S]*?-->/g, "").replace(/^#\s.*$/m, "").trim();

export function statusOf(raw: string): Status {
  const v = raw.toLowerCase();
  if (v.includes("conclu") || v.includes("done") || v.includes("feito") || v.includes("arquiv")) return "done";
  if (v.includes("andamento") || v.includes("fazendo") || v.includes("progress")) return "doing";
  return "todo";
}
// Strings the v1 kanban already understands, so both UIs read the same note.
export const STATUS_RAW: Record<Status, string> = { todo: "A fazer", doing: "Em andamento", done: "Concluído" };

export function getEquipes(): Equipe[] {
  return readDir("Equipes")
    .map(({ fm }) => ({
      id: s(fm.id), nome: s(fm.nome), cor: s(fm.cor) || "#737373", areas: arr(fm.areas), coordenadores: arr(fm.coordenadores),
      membros: arr(fm.membros), acesso: fm.acesso === true, gestao: fm.gestao === true, avisos: fm.avisos === true,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getProjetos(): Projeto[] {
  return readDir("Projetos").map(({ fm, body }) => ({
    id: s(fm.id), nome: s(fm.nome), equipes: arr(fm.equipes), descricao: desc(body.split(/\r?\n## /)[0]),
    atualizacoes: (body.match(/## Atualizações\r?\n([\s\S]*?)(?=\r?\n## |$)/)?.[1] ?? "").split(/\r?\n/).filter((l) => l.startsWith("- ")).map((l) => l.slice(2)),
  }));
}

export function getObjetivos(): Objetivo[] {
  return readDir("Objetivos")
    .map(({ fm, body, file }) => ({
      id: s(fm.id), file, titulo: s(fm.titulo), ano: Number(fm.ano) || 0, equipe: s(fm.equipe), apoio: arr(fm.apoio), projeto: s(fm.projeto),
      descricao: desc(body), donoConfirmado: fm.dono_confirmado === true,
    }))
    .sort((a, b) => a.ano - b.ano || a.id.localeCompare(b.id));
}

export function getEventos(): Evento[] {
  return readDir("Eventos")
    .map(({ fm, file }) => ({ id: s(fm.id), file, titulo: s(fm.titulo), inicio: s(fm.inicio), fim: s(fm.fim), status: s(fm.status), equipe: s(fm.equipe) }))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function getPessoas(): Pessoa[] {
  return readDir("Miembros")
    .filter(({ fm }) => !s(fm.type).startsWith("ai") && !s(fm.id).startsWith("agente_"))
    .map(({ fm, file }) => ({
      id: s(fm.id) || path.basename(file, ".md"),
      nipeiId: s(fm.nipei_id),
      name: s(fm.name),
      nativeName: s(fm.native_name),
      equipes: arr(fm.equipes),
      coordena: arr(fm.coordena),
      usuario: s(fm.usuario),
      whatsapp: s(fm.whatsapp),
      email: s(fm.email),
      area: s(fm.area),
      funcao: s(fm.funcao),
      disponibilidade: s(fm.disponibilidade),
      incompleta: fm.has_missing_info === true,
      cadastroEm: s(fm.cadastro_em),
      avisosWhatsapp: fm.avisos_whatsapp !== false,
      apelido: s(fm.apelido), dataNascimento: s(fm.data_nascimento), nacionalidade: s(fm.nacionalidade),
      cidade: s(fm.cidade), pais: s(fm.pais), idioma: s(fm.idioma),
      emergenciaNome: s(fm.emergencia_nome), emergenciaWhatsapp: s(fm.emergencia_whatsapp), foto: s(fm.foto),
      whatsappVerificado: fm.whatsapp_verificado === true, whatsappVerificadoEm: s(fm.whatsapp_verificado_em),
      dadosConfirmadosEm: s(fm.dados_confirmados_em),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function getTarefas(): Tarefa[] {
  return readDir(path.join("Productivity", "Tarefas")).map(({ fm, file, body }) => {
    const statusRaw = s(fm.status);
    const itens = body.match(/^- \[( |x|X)\] /gm) ?? [];
    return {
      id: s(fm.id) || path.basename(file, ".md"),
      file,
      title: s(fm.title) || path.basename(file, ".md"),
      status: statusOf(statusRaw),
      statusRaw,
      prazo: normalizeDueDate(s(fm.prazo)).match(/^\d{4}-\d{2}-\d{2}$/) ? normalizeDueDate(s(fm.prazo)) : "",
      priority: s(fm.priority).toLowerCase(),
      equipe: s(fm.equipe),
      area: s(fm.area),
      projeto: s(fm.projeto),
      objetivo: s(fm.objetivo),
      responsaveis: arr(fm.responsaveis),
      responsible: s(fm.responsible),
      checklist: { feitos: itens.filter((i) => i[3] !== " ").length, total: itens.length },
      anexos: Array.isArray(fm.anexos) ? fm.anexos.length : 0,
      recorrencia: s(fm.recorrencia),
    };
  });
}

// Two kinds of session cookie (same name, different token purpose — see src/proxy.ts):
//   "session": gestão — everything, v1 pages and /api included
//   "member":  everyone else — v2 pages only
export const MEMBER_PURPOSE = "member";

export type Me = { username: string; pessoa: Pessoa | null; gestao: boolean; coordena: string[]; equipes: string[] };

/**
 * The logged-in person, or null when not logged in or when none of their teams has access
 * (so turning a team's access off takes effect on the next request, not when the cookie expires).
 */
export async function currentUser(): Promise<Me | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const full = verifyToken(token, "session");
  const sub = full ?? verifyToken(token, MEMBER_PURPOSE);
  if (!sub) return null;
  const pessoa = getPessoas().find((p) => p.usuario === sub || p.id === sub) ?? null;
  const equipes = getEquipes();
  // A full session is only ever issued to gestão (NIPEI_OS_USERS passwords or a gestão login link).
  // ponytail: it stays full until it expires even if the person leaves gestão; rotate NIPEI_AUTH_SECRET to cut all sessions.
  const gestao = !!full || !!pessoa?.equipes.some((id) => equipes.find((e) => e.id === id)?.gestao);
  const acesso = gestao || !!pessoa?.equipes.some((id) => equipes.find((e) => e.id === id)?.acesso);
  if (!acesso) return null;
  return { username: sub, pessoa, gestao, coordena: pessoa?.coordena ?? [], equipes: pessoa?.equipes ?? [] };
}

/** Which session a person gets from a login link: full for gestão, v2-only for everyone else. */
export function sessionPurposeFor(pessoa: Pessoa) {
  return pessoa.equipes.some((id) => getEquipes().find((e) => e.id === id)?.gestao) ? "session" : MEMBER_PURPOSE;
}

// Permissions (plan §4.4): gestão edits everything; a coordinator everything of their team;
// a member their own tasks, and creates tasks in their own teams.
export const can = {
  editTarefa: (me: Me, t: Tarefa) => me.gestao || (!!t.equipe && me.coordena.includes(t.equipe)) || (!!me.pessoa && t.responsaveis.includes(me.pessoa.id)),
  criarEm: (me: Me, equipe: string) => me.gestao || (!!equipe && (me.equipes.includes(equipe) || me.coordena.includes(equipe))),
  gerirEquipe: (me: Me, equipe: string) => me.gestao || me.coordena.includes(equipe),
  gerirPessoa: (me: Me, p: Pessoa) => me.gestao || p.equipes.some((e) => me.coordena.includes(e)),
  // A task with no team can be claimed by a coordinator into their own team ("Sem equipe" triage).
  assumir: (me: Me, t: Tarefa) => !t.equipe && me.coordena.length > 0,
  editEvento: (me: Me, e: Evento) => me.gestao || (!!e.equipe && me.coordena.includes(e.equipe)),
  editObjetivo: (me: Me) => me.gestao,
  // T2: AI on tasks is Equipe 1 (gestão) only for now.
  usarIA: (me: Me, t: Tarefa) => me.gestao && (can.editTarefa(me, t) || can.assumir(me, t)),
};

// The community lives in Bahia: "today" must not flip to tomorrow at 21:00 (UTC).
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bahia" });

/** Done / total of the tasks linked to an objective (null when none are linked yet). */
export function progresso(objetivoId: string, tarefas: Tarefa[]) {
  const ts = tarefas.filter((t) => t.objetivo === objetivoId);
  return ts.length ? { done: ts.filter((t) => t.status === "done").length, total: ts.length } : null;
}

// ---------------------------------------------------------------- writes

export type FmValue = string | string[] | boolean | number;

function yamlValue(v: FmValue) {
  return Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : typeof v === "string" ? JSON.stringify(v) : String(v);
}

/** "Ligar p/ Melo — urgente" → "ligar_p_melo_urgente" (file names) */
export const slugify = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "_").slice(0, 40).replace(/^_|_$/g, "");

export const noteText = (fm: Record<string, FmValue>, body: string) =>
  ["---", ...Object.entries(fm).map(([k, v]) => `${k}: ${yamlValue(v)}`), "---", "", "<!-- agente: nipei-os v2 -->", body, ""].join("\n");

/** Sets single-line top-level frontmatter keys, leaving every other line untouched. */
export function setFrontmatter(text: string, items: Record<string, FmValue>): string {
  return text.replace(/^---\r?\n([\s\S]*?)(\r?\n---)/, (_, fm: string, close: string) => {
    for (const [k, v] of Object.entries(items)) {
      const line = `${k}: ${yamlValue(v)}`;
      const re = new RegExp(`^${k}:.*$`, "m");
      fm = re.test(fm) ? fm.replace(re, () => line) : `${fm}\n${line}`;
    }
    return `---\n${fm}${close}`;
  });
}

/** Vault-relative note file of a person (for lib/v2/perfil.ts). */
export const arquivoPessoa = (pessoaId: string) =>
  readDir("Miembros").find(({ fm, file }) => (s(fm.id) || path.basename(file, ".md")) === pessoaId)?.file ?? null;

export function updateNote(relFile: string, items: Record<string, FmValue>) {
  const full = path.join(vault(), relFile);
  fs.writeFileSync(full, setFrontmatter(fs.readFileSync(full, "utf-8"), { ...items, updated_at: new Date().toISOString() }), "utf-8");
  requestSync(vault());
}

export function setTarefaStatus(id: string, status: Status, actor: string) {
  const t = getTarefas().find((x) => x.id === id);
  if (!t) throw new Error("Tarefa não encontrada");
  writeTarefa(vault(), t.file, actor, (d) => { d.fm.status = STATUS_RAW[status]; });
}

export function createTarefa(input: { title: string; equipe: string; prazo: string; responsaveis: string[]; projeto: string; objetivo: string; recorrencia: string }, actor: string) {
  const projeto = getProjetos().find((p) => p.id === input.projeto);
  createTarefaNote(vault(), {
    title: input.title, prazo: input.prazo, project: projeto?.nome ?? "Geral",
    responsible: input.responsaveis.map((r) => getPessoas().find((p) => p.id === r)?.name ?? r).join(", "),
    equipe: input.equipe, projeto: input.projeto, objetivo: input.objetivo, responsaveis: input.responsaveis,
    ...(input.recorrencia ? { recorrencia: input.recorrencia } : {}),
  }, actor);
}

/** Adds a person to a team: both the person's `equipes` and the team's `membros`. */
export function addToEquipe(pessoaId: string, equipeId: string) {
  const pessoa = readDir("Miembros").find(({ fm, file }) => (s(fm.id) || path.basename(file, ".md")) === pessoaId);
  const equipe = readDir("Equipes").find(({ fm }) => s(fm.id) === equipeId);
  if (!pessoa || !equipe) throw new Error("Pessoa ou equipe não encontrada");
  updateNote(pessoa.file, { equipes: [...new Set([...arr(pessoa.fm.equipes), equipeId])] });
  updateNote(equipe.file, { membros: [...new Set([...arr(equipe.fm.membros), pessoaId])] });
}

/** K4: news line at the top of the project's "## Atualizações" section (created if missing). */
export function anotarProjeto(projetoId: string, texto: string, quem: string) {
  const note = readDir("Projetos").find(({ fm }) => s(fm.id) === projetoId);
  if (!note) throw new Error("Projeto não encontrado");
  const full = path.join(vault(), note.file);
  const linha = `- ${today()} · ${quem} · ${texto.replace(/\s+/g, " ").trim()}`;
  let t = fs.readFileSync(full, "utf-8");
  t = /\n## Atualizações\r?\n/.test(t) ? t.replace(/(\n## Atualizações\r?\n)/, `$1${linha}\n`) : `${t.trimEnd()}\n\n## Atualizações\n${linha}\n`;
  fs.writeFileSync(full, setFrontmatter(t, { updated_at: new Date().toISOString() }), "utf-8");
  requestSync(vault());
}

/** New person note with the next NIP id; optionally already in a team. Returns the new id. */
export function createPessoa(name: string, equipeId: string) {
  const slug = slugify(name) || "pessoa";
  const ids = new Set(getPessoas().map((p) => p.id));
  let id = slug;
  for (let i = 2; ids.has(id); i++) id = `${slug}_${i}`;
  const n = Math.max(0, ...getPessoas().map((p) => Number(p.nipeiId.slice(4)) || 0)) + 1;
  const fm: Record<string, FmValue> = {
    id, nipei_id: `NIP-${String(n).padStart(4, "0")}`, name, native_name: "", type: "human_staff", status: "APPROVED",
    global_role: "OPERATOR", whatsapp: "", email: "", equipes: [], has_missing_info: true,
    missing_info_details: "Falta: email, WhatsApp.", updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(vault(), "Miembros", `${id}.md`), noteText(fm, `# ${name}`), { encoding: "utf-8", flag: "wx" });
  requestSync(vault());
  if (equipeId) addToEquipe(id, equipeId);
  return id;
}

export function setEquipeAcesso(equipeId: string, acesso: boolean) {
  const note = readDir("Equipes").find(({ fm }) => s(fm.id) === equipeId);
  if (!note) throw new Error("Equipe não encontrada");
  updateNote(note.file, { acesso });
}

// ---------------------------------------------------------------- finanças (gestão only)
// One note per entry in Financeiro/Lancamentos/ — readable in Obsidian, versioned by the vault sync.
// An entry is never deleted from the app: "anular" keeps it (and who did it) out of the totals.

const LANC_DIR = path.join("Financeiro", "Lancamentos");
export const CATEGORIAS = {
  entrada: ["Retiros e eventos", "Vendas Inirau / loja", "Doações e grants", "Cursos", "Outras entradas"],
  despesa: ["Alimentação", "Transporte e combustível", "Manutenção e obras", "Materiais e insumos", "Serviços e honorários",
    "Ajudas de custo / equipe", "Impostos e taxas", "Comunicação e internet", "Outras despesas"],
} as const;

export type Lancamento = {
  id: string; file: string; data: string; tipo: "entrada" | "despesa"; valor: number; categoria: string; descricao: string;
  projeto: string; equipe: string; registradoPor: string; anulado: boolean;
};

export function getLancamentos(): Lancamento[] {
  return readDir(LANC_DIR)
    .map(({ fm, file }) => ({
      id: s(fm.id), file, data: s(fm.data), tipo: (s(fm.tipo) === "entrada" ? "entrada" : "despesa") as Lancamento["tipo"],
      valor: Number(fm.valor) || 0, categoria: s(fm.categoria), descricao: s(fm.descricao), projeto: s(fm.projeto),
      equipe: s(fm.equipe), registradoPor: s(fm.registrado_por), anulado: fm.anulado === true,
    }))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id));
}

export function createLancamento(input: Omit<Lancamento, "id" | "file" | "anulado">) {
  const dir = path.join(vault(), LANC_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const id = `lanc_${Date.now().toString(36)}`;
  const fm: Record<string, FmValue> = {
    id, type: "lancamento", data: input.data, tipo: input.tipo, valor: Math.round(input.valor * 100) / 100, categoria: input.categoria,
    descricao: input.descricao, projeto: input.projeto, equipe: input.equipe, registrado_por: input.registradoPor,
    anulado: false, updated_at: new Date().toISOString(),
  };
  const titulo = `${input.tipo === "entrada" ? "Entrada" : "Despesa"}: ${input.descricao || input.categoria}`;
  fs.writeFileSync(path.join(dir, `${input.data}_${slugify(input.descricao || input.categoria) || "lancamento"}_${id.slice(5)}.md`), noteText(fm, `# ${titulo}`), { encoding: "utf-8", flag: "wx" });
  requestSync(vault());
}

export function anularLancamento(id: string, por: string) {
  const l = getLancamentos().find((x) => x.id === id);
  if (!l) throw new Error("Lançamento não encontrado");
  updateNote(l.file, { anulado: true, anulado_por: por, anulado_em: new Date().toISOString().slice(0, 10) });
}

// ---------------------------------------------------------------- acervo (links to Drive folders/files)

export const ACERVO_TIPOS = ["fotos", "videos", "audios", "cursos", "documentos", "marca", "outros"] as const;
export type AcervoItem = { id: string; titulo: string; url: string; tipo: string; projeto: string; ano: string; descricao: string };

export function getAcervo(): AcervoItem[] {
  return readDir("Acervo")
    .map(({ fm }) => ({ id: s(fm.id), titulo: s(fm.titulo), url: s(fm.url), tipo: s(fm.tipo) || "outros", projeto: s(fm.projeto), ano: s(fm.ano), descricao: s(fm.descricao) }))
    .sort((a, b) => b.ano.localeCompare(a.ano) || a.titulo.localeCompare(b.titulo, "pt"));
}

export function createAcervo(input: Omit<AcervoItem, "id">, por: string) {
  const dir = path.join(vault(), "Acervo");
  fs.mkdirSync(dir, { recursive: true });
  const id = `acv_${Date.now().toString(36)}`;
  const fm: Record<string, FmValue> = { ...input, id, type: "acervo", adicionado_por: por, updated_at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, `${slugify(input.titulo) || "item"}_${id.slice(4)}.md`), noteText(fm, `# ${input.titulo}\n\n${input.url}`), { encoding: "utf-8", flag: "wx" });
  requestSync(vault());
}

// ---------------------------------------------------------------- edits (tarefa, evento, objetivo)

export function updateTarefa(id: string, input: { title: string; equipe: string; area: string; projeto: string; objetivo: string; prazo: string; responsaveis: string[]; status: Status; recorrencia: string }, actor: string) {
  const t = getTarefas().find((x) => x.id === id);
  if (!t) throw new Error("Tarefa não encontrada");
  const pessoas = getPessoas();
  writeTarefa(vault(), t.file, actor, (d) => {
    // Status and date are rewritten only when they really change, so saving an untouched form
    // doesn't log "A Fazer → A fazer" or turn "5 de junio de 2026" into its ISO form for nothing.
    if (statusOf(String(d.fm.status ?? "")) !== input.status) d.fm.status = STATUS_RAW[input.status];
    if (normalizeDueDate(String(d.fm.prazo ?? "")) !== input.prazo) d.fm.prazo = input.prazo;
    Object.assign(d.fm, {
      title: input.title, equipe: input.equipe, area: input.area, projeto: input.projeto, objetivo: input.objetivo,
      responsaveis: input.responsaveis, recorrencia: input.recorrencia,
      // keep the v1 free-text owner in sync so the old kanban shows the same people
      responsible: input.responsaveis.map((r) => pessoas.find((p) => p.id === r)?.name ?? r).join(", "),
    });
  });
}

export function createEvento(input: { titulo: string; inicio: string; fim: string; status: string; equipe: string }) {
  const dir = path.join(vault(), "Eventos");
  const base = `${input.inicio || "sem_data"}_${slugify(input.titulo) || "evento"}`;
  const fm: Record<string, FmValue> = { id: `evt_${base}`, type: "evento", ...input, projeto: "santuario", updated_at: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, `${base}.md`), noteText(fm, `# ${input.titulo}`), { encoding: "utf-8", flag: "wx" });
  requestSync(vault());
}

export function updateEvento(id: string, input: { titulo: string; inicio: string; fim: string; status: string; equipe: string }) {
  const e = getEventos().find((x) => x.id === id);
  if (!e) throw new Error("Evento não encontrado");
  updateNote(e.file, input);
}

export function updateObjetivo(id: string, input: { equipe: string; apoio: string[] }) {
  const o = getObjetivos().find((x) => x.id === id);
  if (!o) throw new Error("Objetivo não encontrado");
  updateNote(o.file, { ...input, dono_confirmado: true });
}

// ---------------------------------------------------------------- task detail (T1)
// Attachments live in the vault: links in frontmatter `anexos`, files in Task_Workspace/<task id>/.
// ponytail: files ≤ 10 MB in git; move big ones to Drive when the vault repo grows (see Analisis_Tareas_v2 §4).

export const ANEXO_MAX_BYTES = 10 * 1024 * 1024;
export const ANEXO_TIPOS: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", txt: "text/plain", md: "text/markdown", csv: "text/csv",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp3: "audio/mpeg", m4a: "audio/mp4", ogg: "audio/ogg", opus: "audio/ogg",
};

export type Anexo = { id: string; tipo: "link" | "arquivo"; titulo: string; url: string; path: string; tamanho: number; por: string; em: string };

/** Accepts both the v2 shape and the v1 workspace shape ({id, nome, tipo, path}). */
function toAnexo(x: unknown, i: number): Anexo {
  const o = (x ?? {}) as Record<string, unknown>;
  const url = s(o.url) || (/^https?:\/\//.test(s(o.path)) ? s(o.path) : "");
  return {
    id: s(o.id) || `anexo_${i}`, tipo: url ? "link" : "arquivo", titulo: s(o.titulo) || s(o.nome) || url || path.basename(s(o.path)),
    url, path: url ? "" : s(o.path), tamanho: Number(o.tamanho) || 0, por: s(o.por), em: s(o.em),
  };
}

export const tarefaDir = (taskId: string) => path.join("Task_Workspace", taskId.replace(/[^a-zA-Z0-9_-]/g, "_"));

export function getTarefaDetalhe(id: string): { tarefa: Tarefa; doc: TarefaDoc; anexos: Anexo[] } | null {
  const tarefa = getTarefas().find((t) => t.id === id);
  if (!tarefa) return null;
  const doc = parseTarefa(fs.readFileSync(path.join(vault(), tarefa.file), "utf-8"));
  return { tarefa, doc, anexos: (Array.isArray(doc.fm.anexos) ? doc.fm.anexos : []).map(toAnexo) };
}

function editarTarefa(id: string, actor: string, mutate: (d: TarefaDoc) => void, extra: string[] = []) {
  const t = getTarefas().find((x) => x.id === id);
  if (!t) throw new Error("Tarefa não encontrada");
  return writeTarefa(vault(), t.file, actor, mutate, extra);
}

export const setDescricao = (id: string, texto: string, actor: string) =>
  editarTarefa(id, actor, (d) => { d.descricao = texto.trim(); });

export function editChecklist(id: string, actor: string, op: { tipo: "add"; texto: string } | { tipo: "toggle" | "remove"; idx: number }) {
  editarTarefa(id, actor, (d) => {
    const c: ChecklistItem[] = d.checklist;
    if (op.tipo === "add" && op.texto.trim() && !c.some((x) => x.texto === op.texto.trim())) c.push({ feito: false, texto: op.texto.trim() });
    if (op.tipo === "toggle" && c[op.idx]) c[op.idx].feito = !c[op.idx].feito;
    if (op.tipo === "remove" && c[op.idx]) c.splice(op.idx, 1);
  });
}

export const comentar = (id: string, texto: string, actor: string) =>
  editarTarefa(id, actor, () => {}, [`comentou “${texto.replace(/\s+/g, " ").trim().slice(0, 1000)}”`]);

const novoAnexoId = () => `anx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const hoje = () => new Date().toISOString().slice(0, 10);

export function addLink(id: string, titulo: string, url: string, actor: string, por: string) {
  editarTarefa(id, actor, (d) => {
    d.fm.anexos = [...(Array.isArray(d.fm.anexos) ? d.fm.anexos : []), { id: novoAnexoId(), tipo: "link", titulo: titulo || url, url, por, em: hoje() }];
  });
}

/** Saves the file under Task_Workspace/<task id>/ (never overwrites) and lists it in the note. */
export function addArquivo(id: string, file: { nome: string; bytes: Buffer }, actor: string, por: string) {
  const ext = file.nome.split(".").pop()?.toLowerCase() ?? "";
  if (!ANEXO_TIPOS[ext]) throw new Error(`Tipo de arquivo não permitido: .${ext}`);
  if (file.bytes.length > ANEXO_MAX_BYTES) throw new Error("Arquivo maior que 10 MB");
  const dirRel = tarefaDir(id);
  fs.mkdirSync(path.join(vault(), dirRel), { recursive: true });
  const base = slugify(file.nome.replace(/\.[^.]+$/, "")) || "arquivo";
  let nome = `${base}.${ext}`;
  for (let i = 2; fs.existsSync(path.join(vault(), dirRel, nome)); i++) nome = `${base}_${i}.${ext}`;
  fs.writeFileSync(path.join(vault(), dirRel, nome), file.bytes);
  const rel = path.join(dirRel, nome).split(path.sep).join("/");
  editarTarefa(id, actor, (d) => {
    d.fm.anexos = [...(Array.isArray(d.fm.anexos) ? d.fm.anexos : []), {
      id: novoAnexoId(), tipo: "arquivo", titulo: file.nome, path: rel, tamanho: file.bytes.length, por, em: hoje(),
    }];
  });
  return rel;
}

/** Removes an attachment from the note; a file of this task is deleted too (the vault git history keeps it). */
export function removeAnexo(id: string, anexoId: string, actor: string) {
  const det = getTarefaDetalhe(id);
  const a = det?.anexos.find((x) => x.id === anexoId);
  if (!det || !a) return;
  editarTarefa(id, actor, (d) => {
    d.fm.anexos = (Array.isArray(d.fm.anexos) ? d.fm.anexos : []).filter((x, i) => toAnexo(x, i).id !== anexoId);
  });
  const own = path.resolve(vault(), tarefaDir(id));
  const abs = a.path ? path.resolve(vault(), a.path) : "";
  if (abs && abs.startsWith(own + path.sep) && fs.existsSync(abs)) fs.unlinkSync(abs);
}

/** Absolute path of a file attached to this task, or null (only files inside the task's own folder are served). */
export function arquivoDaTarefa(id: string, nome: string): { abs: string; tipo: string } | null {
  const own = path.resolve(vault(), tarefaDir(id));
  const abs = path.resolve(own, nome);
  if (!abs.startsWith(own + path.sep) || !fs.existsSync(abs)) return null;
  return { abs, tipo: ANEXO_TIPOS[nome.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream" };
}

/** Applies the parts of an AI suggestion a person ticked, in one write; the log says it came from the AI. */
export function aplicarSugestao(id: string, actor: string, sug: {
  descricao: string | null; adicionar: string[]; concluir: string[]; status: Status | null; prazo: string | null; proximo: string | null; origem: string;
}) {
  const extra = [`aplicou sugestão da IA (${sug.origem})`];
  if (sug.proximo) extra.push(`comentou “Próximo passo (IA): ${sug.proximo.replace(/\s+/g, " ").slice(0, 800)}”`);
  editarTarefa(id, actor, (d) => {
    if (sug.descricao != null) d.descricao = sug.descricao.trim();
    for (const texto of sug.adicionar) if (texto.trim() && !d.checklist.some((c) => c.texto === texto.trim())) d.checklist.push({ feito: false, texto: texto.trim() });
    for (const c of d.checklist) if (sug.concluir.includes(c.texto)) c.feito = true;
    if (sug.status) d.fm.status = STATUS_RAW[sug.status];
    if (sug.prazo) d.fm.prazo = sug.prazo;
  }, extra);
}

export function setEquipeAvisos(equipeId: string, avisos: boolean) {
  const note = readDir("Equipes").find(({ fm }) => s(fm.id) === equipeId);
  if (!note) throw new Error("Equipe não encontrada");
  updateNote(note.file, { avisos });
}

export function setAvisosPessoa(pessoaId: string, ligado: boolean) {
  const note = readDir("Miembros").find(({ fm, file }) => (s(fm.id) || path.basename(file, ".md")) === pessoaId);
  if (!note) throw new Error("Pessoa não encontrada");
  updateNote(note.file, { avisos_whatsapp: ligado });
}
