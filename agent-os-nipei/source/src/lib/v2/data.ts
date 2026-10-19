import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { cookies } from "next/headers";
import { defaultVault } from "@/lib/config";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { normalizeDueDate } from "@/lib/kanbanGrounding";

// v2 data layer: everything is read straight from the vault notes on each request.
// Source of truth per concept: Equipes/, Projetos/, Objetivos/, Eventos/, Miembros/, Productivity/Tarefas/.

export type Status = "todo" | "doing" | "done";

export type Equipe = { id: string; nome: string; cor: string; areas: string[]; coordenadores: string[]; membros: string[] };
export type Projeto = { id: string; nome: string; equipes: string[]; descricao: string };
export type Objetivo = { id: string; titulo: string; ano: number; equipe: string; apoio: string[]; projeto: string; descricao: string };
export type Evento = { id: string; titulo: string; inicio: string; status: string; equipe: string };
export type Pessoa = {
  id: string; name: string; equipes: string[]; coordena: string[]; usuario: string;
  whatsapp: string; email: string; incompleta: boolean;
};
export type Tarefa = {
  id: string; file: string; title: string; status: Status; statusRaw: string; prazo: string; priority: string;
  equipe: string; area: string; projeto: string; objetivo: string; responsaveis: string[]; responsible: string;
};

const vault = () => {
  const v = defaultVault();
  if (!v) throw new Error("Vault não configurado (VAULT_PATH)");
  return v;
};

type Note = { file: string; fm: Record<string, unknown>; body: string };

function readDir(dir: string): Note[] {
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
  if (v.includes("conclu") || v.includes("done") || v.includes("feito")) return "done";
  if (v.includes("andamento") || v.includes("fazendo") || v.includes("progress")) return "doing";
  return "todo";
}
// Strings the v1 kanban already understands, so both UIs read the same note.
export const STATUS_RAW: Record<Status, string> = { todo: "A fazer", doing: "Em andamento", done: "Concluído" };

export function getEquipes(): Equipe[] {
  return readDir("Equipes")
    .map(({ fm }) => ({ id: s(fm.id), nome: s(fm.nome), cor: s(fm.cor) || "#737373", areas: arr(fm.areas), coordenadores: arr(fm.coordenadores), membros: arr(fm.membros) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getProjetos(): Projeto[] {
  return readDir("Projetos").map(({ fm, body }) => ({ id: s(fm.id), nome: s(fm.nome), equipes: arr(fm.equipes), descricao: desc(body) }));
}

export function getObjetivos(): Objetivo[] {
  return readDir("Objetivos")
    .map(({ fm, body }) => ({ id: s(fm.id), titulo: s(fm.titulo), ano: Number(fm.ano) || 0, equipe: s(fm.equipe), apoio: arr(fm.apoio), projeto: s(fm.projeto), descricao: desc(body) }))
    .sort((a, b) => a.ano - b.ano || a.id.localeCompare(b.id));
}

export function getEventos(): Evento[] {
  return readDir("Eventos")
    .map(({ fm }) => ({ id: s(fm.id), titulo: s(fm.titulo), inicio: s(fm.inicio), status: s(fm.status), equipe: s(fm.equipe) }))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function getPessoas(): Pessoa[] {
  return readDir("Miembros")
    .filter(({ fm }) => !s(fm.type).startsWith("ai") && !s(fm.id).startsWith("agente_"))
    .map(({ fm, file }) => ({
      id: s(fm.id) || path.basename(file, ".md"),
      name: s(fm.name),
      equipes: arr(fm.equipes),
      coordena: arr(fm.coordena),
      usuario: s(fm.usuario),
      whatsapp: s(fm.whatsapp),
      email: s(fm.email),
      incompleta: fm.has_missing_info === true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function getTarefas(): Tarefa[] {
  return readDir(path.join("Productivity", "Tarefas")).map(({ fm, file }) => {
    const statusRaw = s(fm.status);
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
    };
  });
}

/** The logged-in person (session cookie → `usuario:` in their Miembros note). */
export async function currentUser(): Promise<{ username: string; pessoa: Pessoa | null } | null> {
  const username = verifyToken((await cookies()).get(SESSION_COOKIE)?.value, "session");
  if (!username) return null;
  return { username, pessoa: getPessoas().find((p) => p.usuario === username) ?? null };
}

export const today = () => new Date().toISOString().slice(0, 10);

/** Done / total of the tasks linked to an objective (null when none are linked yet). */
export function progresso(objetivoId: string, tarefas: Tarefa[]) {
  const ts = tarefas.filter((t) => t.objetivo === objetivoId);
  return ts.length ? { done: ts.filter((t) => t.status === "done").length, total: ts.length } : null;
}

// ---------------------------------------------------------------- writes

function yamlValue(v: string | string[]) {
  return Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : JSON.stringify(v);
}

/** Sets single-line top-level frontmatter keys, leaving every other line untouched. */
export function setFrontmatter(text: string, items: Record<string, string | string[]>): string {
  return text.replace(/^---\r?\n([\s\S]*?)(\r?\n---)/, (_, fm: string, close: string) => {
    for (const [k, v] of Object.entries(items)) {
      const line = `${k}: ${yamlValue(v)}`;
      const re = new RegExp(`^${k}:.*$`, "m");
      fm = re.test(fm) ? fm.replace(re, () => line) : `${fm}\n${line}`;
    }
    return `---\n${fm}${close}`;
  });
}

function updateNote(relFile: string, items: Record<string, string | string[]>) {
  const full = path.join(vault(), relFile);
  fs.writeFileSync(full, setFrontmatter(fs.readFileSync(full, "utf-8"), { ...items, updated_at: new Date().toISOString() }), "utf-8");
}

export function setTarefaStatus(id: string, status: Status) {
  const t = getTarefas().find((x) => x.id === id);
  if (!t) throw new Error("Tarefa não encontrada");
  updateNote(t.file, { status: STATUS_RAW[status] });
}

export function createTarefa(input: { title: string; equipe: string; prazo: string; responsaveis: string[]; projeto: string; objetivo: string }) {
  const ids = getTarefas().map((t) => Number(t.id.match(/^task_(\d+)$/)?.[1] ?? 0));
  const n = Math.max(0, ...ids) + 1;
  const slug = input.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").slice(0, 40).replace(/^_|_$/g, "");
  const projeto = getProjetos().find((p) => p.id === input.projeto);
  const fm: Record<string, string | string[]> = {
    id: `task_${n}`, title: input.title, type: "tarefa", status: STATUS_RAW.todo, priority: "Média",
    prazo: input.prazo, responsible: input.responsaveis.map((r) => getPessoas().find((p) => p.id === r)?.name ?? r).join(", "),
    project: projeto?.nome ?? "Geral", tags: ["tarefa", "nipei-os"], updated_at: new Date().toISOString(),
    equipe: input.equipe, projeto: input.projeto, objetivo: input.objetivo, responsaveis: input.responsaveis,
  };
  const text = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${yamlValue(v)}`).join("\n")}\n---\n\n<!-- agente: nipei-os v2 -->\n# Tarefa: ${input.title}\n`;
  fs.writeFileSync(path.join(vault(), "Productivity", "Tarefas", `${n}_${slug || "tarefa"}.md`), text, { encoding: "utf-8", flag: "wx" });
}

/** Adds a person to a team: both the person's `equipes` and the team's `membros`. */
export function addToEquipe(pessoaId: string, equipeId: string) {
  const pessoa = readDir("Miembros").find(({ fm, file }) => (s(fm.id) || path.basename(file, ".md")) === pessoaId);
  const equipe = readDir("Equipes").find(({ fm }) => s(fm.id) === equipeId);
  if (!pessoa || !equipe) throw new Error("Pessoa ou equipe não encontrada");
  updateNote(pessoa.file, { equipes: [...new Set([...arr(pessoa.fm.equipes), equipeId])] });
  updateNote(equipe.file, { membros: [...new Set([...arr(equipe.fm.membros), pessoaId])] });
}
