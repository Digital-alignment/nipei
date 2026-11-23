import fs from "fs";
import { createTarefaNote, nomesDoVault, writeTarefa } from "./tarefaNote";
import path from "path";
import { defaultVault } from "@/lib/config";
import type { GlobalTask, SquadId, KanbanColumnId } from "@/lib/tiposKanban";

const MONTHS: Record<string, number> = {
  enero: 1, janeiro: 1, febrero: 2, fevereiro: 2, marzo: 3, "março": 3, marco: 3, abril: 4, mayo: 5, maio: 5,
  junio: 6, junho: 6, julio: 7, julho: 7, agosto: 8, septiembre: 9, setiembre: 9, setembro: 9,
  octubre: 10, outubro: 10, noviembre: 11, novembro: 11, diciembre: 12, dezembro: 12,
};

/**
 * Normalizes a task deadline to YYYY-MM-DD. Notion exports store "8 de junio de 2026";
 * the UI (overdue badges, calendar, sorting) only understands ISO dates.
 * Returns the raw text when it can't be parsed, "" when absent.
 */
export function normalizeDueDate(raw: string): string {
  const v = raw.trim();
  if (!v || /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de)?\s+(\d{4})/);
  const month = m && MONTHS[m[2]];
  if (!m || !month) return v;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/**
 * Parses the `agents:` frontmatter line of a task note, e.g. `agents: ["claude", "hermes"]`.
 * Returns null when the task has no explicit assignment.
 */
export function parseAgentsFrontmatter(content: string): string[] | null {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = fm?.[1].match(/^agents:\s*(.+)$/m);
  if (!line) return null;
  const agents = line[1].replace(/[\[\]"']/g, "").split(",").map((a) => a.trim()).filter(Boolean);
  return agents.length ? agents : null;
}

/**
 * Reads all live tasks from the Vault (Productivity/Tarefas). Squads/ and Todo_Audit_Lists/ were v1 and are archived.
 */
export function getLiveKanbanTasks(): GlobalTask[] {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return [];

  const tasks: GlobalTask[] = [];

  // 1. Load operational tasks from Productivity/Tarefas
  const tarefasDir = path.join(vaultRoot, "Productivity", "Tarefas");
  if (fs.existsSync(tarefasDir)) {
    try {
      const tarefaFiles = fs.readdirSync(tarefasDir).filter((f) => f.endsWith(".md"));
      for (const filename of tarefaFiles) {
        try {
          const filePath = path.join(tarefasDir, filename);
          const content = fs.readFileSync(filePath, "utf-8");

          const idMatch = content.match(/id:\s*"?([^"\n\r]+)"?/);
          const titleMatch = content.match(/title:\s*"?([^"\n\r]+)"?/);
          const statusMatch = content.match(/status:\s*"?([^"\n\r]+)"?/);
          const priorityMatch = content.match(/priority:\s*"?([^"\n\r]+)"?/);
          const projectMatch = content.match(/project:\s*"?([^"\n\r]+)"?/);
          const responsibleMatch = content.match(/responsible:\s*"?([^"\n\r]+)"?/);
          const prazoMatch = content.match(/prazo:\s*"?([^"\n\r]+)"?/);
          const squadMatch = content.match(/squad:\s*"?([^"\n\r]+)"?/i) || content.match(/Squad:\s*`?([a-zA-Z0-9_-]+)`?/i);

          const taskId = idMatch ? idMatch[1].trim() : filename.replace(".md", "");
          const title = titleMatch ? titleMatch[1].trim() : filename.replace(".md", "").replace(/_/g, " ");
          const statusRaw = statusMatch ? statusMatch[1].trim() : "A fazer";
          const priorityRaw = priorityMatch ? priorityMatch[1].trim().toLowerCase() : "media";
          const projectName = projectMatch ? projectMatch[1].trim() : "Geral Nipëi OS";
          // No fallbacks: an empty owner/deadline is shown as such, never invented
          const responsible = responsibleMatch ? responsibleMatch[1].trim() : "";
          const dueDate = prazoMatch ? normalizeDueDate(prazoMatch[1]) : "";
          const fileSquad = squadMatch ? squadMatch[1].trim() : null;

          // Normalize priority
          let priority: "urgente" | "alta" | "media" | "baixa" = "media";
          if (priorityRaw.includes("urgente")) priority = "urgente";
          else if (priorityRaw.includes("alta")) priority = "alta";
          else if (priorityRaw.includes("baixa")) priority = "baixa";

          // Map status to Kanban column
          let column: KanbanColumnId = "todo";
          const sLower = statusRaw.toLowerCase();
          if (sLower.includes("arquiv") || sLower.includes("archiv")) {
            column = "archived";
          } else if (sLower.includes("conclu") || sLower.includes("done")) {
            column = "done";
          } else if (sLower.includes("agente") || sLower.includes("ia") || sLower.includes("execut")) {
            column = "agent_executing";
          } else if (sLower.includes("andamento") || sLower.includes("fazendo") || sLower.includes("progress")) {
            column = "in_progress";
          } else if (sLower.includes("bloque") || sLower.includes("revis") || sLower.includes("veto")) {
            column = "review";
          } else if (sLower.includes("triag") || sLower.includes("idea")) {
            column = "triage";
          } else {
            column = "todo";
          }

          const squad = (fileSquad || "squad_1_ceo") as SquadId;

          // Assigned agents: frontmatter `agents:` wins, else squad default mapping
          const assignedAgents =
            parseAgentsFrontmatter(content) ??
            (squad === "squad_2_mutum" ? ["openclaw", "hermes"]
              : squad === "squad_4_vendas_mkt" || squad === "squad_6_infra" ? ["claude", "antigravity"]
              : ["antigravity", "hermes"]);

          tasks.push({
            id: taskId,
            title,
            project: projectName,
            squad,
            columnStatus: column,
            status: column === "done" ? "concluido" : column === "in_progress" ? "em_progresso" : "pendente",
            assignee: responsible,
            priority,
            dueDate,
            assignedAgents,
            vaultPath: `Productivity/Tarefas/${filename}`,
            description: `Tarefa operacional vinculada ao projeto [[${projectName}]]. Status original: ${statusRaw}.`,
          });
        } catch {
          /* ignore single file error */
        }
      }
    } catch {
      /* ignore directory read error */
    }
  }

  return tasks;
}

/**
 * Search tasks by keyword matching title, project, squad, assignee, description, id
 */
export function searchKanbanTasks(query: string, maxResults = 8): GlobalTask[] {
  if (!query || !query.trim()) return [];
  const tasks = getLiveKanbanTasks();
  const terms = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  const scored = tasks.map((t) => {
    const text = `${t.id} ${t.title} ${t.project || ""} ${t.squad} ${t.assignee} ${t.description || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    let score = 0;
    for (const term of terms) {
      if (text.includes(term)) {
        score += 1;
        if (t.title.toLowerCase().includes(term)) score += 2;
        if (t.id.toLowerCase() === term) score += 5;
      }
    }
    return { task: t, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.task);
}

export interface CreateTaskOptions {
  title: string;
  squad?: string;
  priority?: "urgente" | "alta" | "media" | "baixa";
  project?: string;
  description?: string;
  assignedAgents?: string[];
  assignee?: string;
}

export function createKanbanTaskDirect(
  opts: CreateTaskOptions,
  extraFm: Record<string, unknown> = {},
  actor = "API (Venu/Hermes)",
): { success: boolean; task?: GlobalTask; error?: string } {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return { success: false, error: "Vault root not configured" };

  const projectName = opts.project || "Geral";
  const squad = (opts.squad || "squad_1_ceo") as SquadId;
  const priority = opts.priority || "alta";
  const assignedAgents = (opts.assignedAgents || ["antigravity", "hermes"]).map((a) => a.replace(/^@/, ""));
  const assignee = opts.assignee || "";

  // One writer for every task note (lib/tarefaNote.ts): same format, activity log, immediate sync.
  const { id, relFile } = createTarefaNote(vaultRoot, {
    title: opts.title,
    priority: priority === "urgente" ? "Urgente" : priority === "alta" ? "Alta" : priority === "baixa" ? "Baixa" : "Média",
    project: projectName, squad, agents: assignedAgents, responsible: assignee,
    ...extraFm,
  }, actor, { descricao: opts.description || "", origem: `Criada por ${actor}.` });

  const task: GlobalTask = {
    id,
    title: opts.title,
    project: projectName,
    squad,
    columnStatus: "todo",
    status: "pendente",
    assignee,
    priority,
    dueDate: typeof extraFm.prazo === "string" ? extraFm.prazo : "",
    assignedAgents,
    vaultPath: relFile.split(path.sep).join("/"),
    description: opts.description,
  };

  return { success: true, task };
}

/** Status string written for each v1 kanban column (the v1 parser maps these back). */
export const COLUMN_STATUS: Record<KanbanColumnId, string> = {
  triage: "A fazer", todo: "A fazer", in_progress: "Em andamento", agent_executing: "IA em Execução",
  review: "Revisão / Bloqueado", done: "Concluído", archived: "Arquivado",
};

export interface UpdateTaskOptions {
  idOrTitle: string;
  column?: KanbanColumnId;
  priority?: "urgente" | "alta" | "media" | "baixa";
  squad?: string;
  executionLog?: string;
}

export function updateKanbanTaskDirect(opts: UpdateTaskOptions, actor = "API (Venu/Hermes)"): { success: boolean; task?: GlobalTask; error?: string } {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return { success: false, error: "Vault root not configured" };

  const tasks = getLiveKanbanTasks();
  const search = opts.idOrTitle.toLowerCase().trim();
  const found = tasks.find((t) => t.id.toLowerCase() === search) ||
                tasks.find((t) => t.title.toLowerCase().includes(search)) ||
                searchKanbanTasks(opts.idOrTitle, 1)[0];

  if (!found || !found.vaultPath) {
    return { success: false, error: `Tarefa "${opts.idOrTitle}" não encontrada no Kanban.` };
  }
  if (!fs.existsSync(path.join(vaultRoot, found.vaultPath))) {
    return { success: false, error: `Arquivo da tarefa não encontrado: ${found.vaultPath}` };
  }

  writeTarefa(vaultRoot, found.vaultPath, actor, (d) => {
    if (opts.column) {
      d.fm.status = COLUMN_STATUS[opts.column];
      found.columnStatus = opts.column;
      found.status = opts.column === "done" ? "concluido" : opts.column === "in_progress" ? "em_progresso" : "pendente";
    }
    if (opts.priority) {
      d.fm.priority = opts.priority === "urgente" ? "Urgente" : opts.priority === "alta" ? "Alta" : opts.priority === "baixa" ? "Baixa" : "Média";
      found.priority = opts.priority;
    }
    if (opts.squad) {
      d.fm.squad = opts.squad;
      found.squad = opts.squad as SquadId;
    }
  }, opts.executionLog ? [`registro: ${opts.executionLog.replace(/\s+/g, " ").slice(0, 500)}`] : []);
  return { success: true, task: found };
}

export function assignKanbanTaskDirect(idOrTitle: string, agents?: string[], assignee?: string, actor = "API (Venu/Hermes)"): { success: boolean; task?: GlobalTask; error?: string } {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return { success: false, error: "Vault root not configured" };

  const tasks = getLiveKanbanTasks();
  const search = idOrTitle.toLowerCase().trim();
  const found = tasks.find((t) => t.id.toLowerCase() === search) ||
                tasks.find((t) => t.title.toLowerCase().includes(search)) ||
                searchKanbanTasks(idOrTitle, 1)[0];

  if (!found || !found.vaultPath) {
    return { success: false, error: `Tarefa "${idOrTitle}" não encontrada no Kanban.` };
  }
  if (!fs.existsSync(path.join(vaultRoot, found.vaultPath))) {
    return { success: false, error: `Arquivo da tarefa não encontrado: ${found.vaultPath}` };
  }

  writeTarefa(vaultRoot, found.vaultPath, actor, (d) => {
    if (assignee) {
      // A Miembros id becomes a v2 owner and the v1 text lists everyone by name; free text stays as given.
      const ids = Array.isArray(d.fm.responsaveis) ? (d.fm.responsaveis as string[]) : [];
      if (fs.existsSync(path.join(vaultRoot, "Miembros", `${assignee}.md`))) {
        const todos = ids.includes(assignee) ? ids : [...ids, assignee];
        const nomes = nomesDoVault(vaultRoot);
        d.fm.responsaveis = todos;
        d.fm.responsible = todos.map((i) => nomes[i] ?? i).join(", ");
      } else {
        d.fm.responsible = assignee;
      }
      found.assignee = String(d.fm.responsible);
    }
    if (agents && agents.length > 0) {
      found.assignedAgents = agents.map((a) => a.replace(/^@/, ""));
      d.fm.agents = found.assignedAgents;
    }
  });
  return { success: true, task: found };
}

