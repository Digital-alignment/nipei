import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import type { GlobalTask, SquadId, KanbanColumnId } from "@/lib/nipeiStore";

// Helper: load project-to-squad dictionary from Squads/squad_*.md
function loadProjectToSquadMap(vaultRoot: string): Record<string, string> {
  const map: Record<string, string> = {};
  const squadsDir = path.join(vaultRoot, "Squads");
  if (!fs.existsSync(squadsDir)) return map;

  try {
    const files = fs.readdirSync(squadsDir).filter((f) => f.startsWith("squad_") && f.endsWith(".md"));
    for (const file of files) {
      const squadId = file.replace(".md", "");
      try {
        const content = fs.readFileSync(path.join(squadsDir, file), "utf-8");
        const matches = content.match(/\[\[(?:Nipei OS\/Projetos\/|Projetos\/)([^\|\]]+)(?:\|([^\]]+))?\]\]/g) || [];
        for (const m of matches) {
          const raw = m.replace(/\[\[/, "").replace(/\]\]/, "");
          const parts = raw.split("|");
          const projName = parts[parts.length - 1].trim().toLowerCase();
          map[projName] = squadId;
        }
      } catch {
        /* ignore single file read errors */
      }
    }
  } catch {
    /* ignore dir read error */
  }
  return map;
}

/**
 * Reads all live tasks from the Vault (Productivity/Tarefas and Todo_Audit_Lists)
 */
export function getLiveKanbanTasks(): GlobalTask[] {
  const vaultRoot = defaultVault();
  if (!vaultRoot) return [];

  const projectToSquad = loadProjectToSquadMap(vaultRoot);
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
          const responsible = responsibleMatch && responsibleMatch[1].trim() ? responsibleMatch[1].trim() : "Time Liderança";
          const dueDate = prazoMatch && prazoMatch[1].trim() ? prazoMatch[1].trim() : "2026-10-30";
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

          const squad = (fileSquad || projectToSquad[projectName.toLowerCase()] || "squad_1_ceo") as SquadId;

          // Assigned Agents default mapping
          let assignedAgents = ["antigravity", "hermes"];
          if (squad === "squad_2_mutum") assignedAgents = ["openclaw", "hermes"];
          else if (squad === "squad_4_vendas_mkt") assignedAgents = ["claude", "antigravity"];
          else if (squad === "squad_5_adm_legal") assignedAgents = ["antigravity", "hermes"];
          else if (squad === "squad_6_infra") assignedAgents = ["claude", "antigravity"];

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

  // 2. Load audit tasks from Todo_Audit_Lists
  const todoDir = path.join(vaultRoot, "Todo_Audit_Lists");
  if (fs.existsSync(todoDir)) {
    try {
      const files = fs.readdirSync(todoDir).filter((f) => f.endsWith(".md"));
      files.forEach((filename, index) => {
        const filePath = path.join(todoDir, filename);
        let content = "";
        try {
          content = fs.readFileSync(filePath, "utf-8");
        } catch {
          /* ignore */
        }

        let title = filename
          .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, "")
          .replace(/_vacios\.md$/, "")
          .replace(/_/g, " ");
        title = title.charAt(0).toUpperCase() + title.slice(1);

        let squad: SquadId = "squad_1_ceo";
        if (filename.includes("squad_02")) squad = "squad_2_mutum";
        else if (filename.includes("squad_03") || filename.includes("squad_06")) squad = "squad_4_vendas_mkt";
        else if (filename.includes("squad_04")) squad = "squad_5_adm_legal";
        else if (filename.includes("squad_05")) squad = "squad_6_infra";
        else if (filename.includes("squad_07")) squad = "squad_7_instituto";

        let column: KanbanColumnId = "triage";
        const isResolved = content.includes("RESUELTO_Y_VERIFICADO") || content.includes("[x]");
        if (isResolved) column = "done";
        else if (index % 6 === 0) column = "in_progress";

        tasks.push({
          id: `VAC-${(index + 1).toString().padStart(3, "0")}`,
          title: `Auditoria: ${title}`,
          project: "Auditoria do Vault Nipëi",
          squad,
          columnStatus: column,
          status: isResolved ? "concluido" : "pendente",
          assignee: "Vaultkeeper AI",
          priority: "alta",
          dueDate: "2026-10-31",
          assignedAgents: ["antigravity", "hermes"],
          vaultPath: `Todo_Audit_Lists/${filename}`,
          description: content.slice(0, 200) || "Auditoria de integridade e vacíos de informação.",
        });
      });
    } catch {
      /* ignore */
    }
  }

  return tasks;
}

export interface KanbanStats {
  total: number;
  byColumn: Record<KanbanColumnId, number>;
  bySquad: Record<string, number>;
  byPriority: Record<string, number>;
  urgentCount: number;
  inProgressCount: number;
  agentExecutingCount: number;
  reviewCount: number;
  doneCount: number;
}

export function getKanbanStats(tasks?: GlobalTask[]): KanbanStats {
  const list = tasks || getLiveKanbanTasks();
  const byColumn: Record<KanbanColumnId, number> = {
    triage: 0,
    todo: 0,
    in_progress: 0,
    agent_executing: 0,
    review: 0,
    done: 0,
    archived: 0,
  };
  const bySquad: Record<string, number> = {};
  const byPriority: Record<string, number> = {
    urgente: 0,
    alta: 0,
    media: 0,
    baixa: 0,
  };

  for (const t of list) {
    const col = t.columnStatus || "todo";
    if (byColumn[col] !== undefined) byColumn[col]++;
    else byColumn.todo++;

    const sq = t.squad || "squad_1_ceo";
    bySquad[sq] = (bySquad[sq] || 0) + 1;

    const pri = t.priority || "media";
    byPriority[pri] = (byPriority[pri] || 0) + 1;
  }

  return {
    total: list.length,
    byColumn,
    bySquad,
    byPriority,
    urgentCount: byPriority.urgente || 0,
    inProgressCount: byColumn.in_progress || 0,
    agentExecutingCount: byColumn.agent_executing || 0,
    reviewCount: byColumn.review || 0,
    doneCount: byColumn.done || 0,
  };
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

/**
 * Returns top urgent or actively executing tasks
 */
export function getTopUrgentTasks(limit = 6): GlobalTask[] {
  const tasks = getLiveKanbanTasks();
  return tasks
    .filter((t) => (t.priority === "urgente" || t.priority === "alta") && t.columnStatus !== "done" && t.columnStatus !== "archived")
    .slice(0, limit);
}

/**
 * Formats a clean, high-density Markdown context block for Venu's LLM prompt
 */
export function formatKanbanGroundingForPrompt(userQuery?: string): string {
  try {
    const tasks = getLiveKanbanTasks();
    if (tasks.length === 0) return "O Kanban de Nipëi OS está atualmente vazio ou o Vault não foi detectado.";

    const stats = getKanbanStats(tasks);
    const urgent = getTopUrgentTasks(5);

    let context = `### 📋 Nipëi OS Kanban Live Intelligence (${stats.total} tarefas no total)\n`;
    context += `- **Distribuição por Status**: A Fazer: ${stats.byColumn.todo} | Em Andamento: ${stats.inProgressCount} | Execução por IA: ${stats.agentExecutingCount} | Revisão/Veto: ${stats.reviewCount} | Concluído: ${stats.doneCount} | Triagem: ${stats.byColumn.triage} | Arquivado: ${stats.byColumn.archived}\n`;
    context += `- **Prioridades**: Urgentes: ${stats.urgentCount} | Altas: ${stats.byPriority.alta || 0} | Médias: ${stats.byPriority.media || 0}\n`;
    context += `- **Squads com demandas**: ${Object.entries(stats.bySquad).map(([sq, cnt]) => `${sq}: ${cnt}`).join(", ")}\n\n`;

    if (urgent.length > 0) {
      context += `**Tarefas Críticas Imediatas**:\n`;
      for (const t of urgent) {
        context += `- [${t.id}] **${t.title}** (${t.squad} | ${t.priority.toUpperCase()} | Coluna: \`${t.columnStatus}\` | Resp: ${t.assignee})\n`;
      }
      context += "\n";
    }

    if (userQuery && userQuery.trim()) {
      const matches = searchKanbanTasks(userQuery, 6);
      if (matches.length > 0) {
        context += `**Tarefas Correspondentes à Consulta do Usuário ("${userQuery.trim()}")**:\n`;
        for (const m of matches) {
          context += `- **${m.id}**: "${m.title}" | Squad: ${m.squad} | Status: \`${m.columnStatus}\` | Prioridade: ${m.priority} | Prazo: ${m.dueDate} | Resp: ${m.assignee}\n`;
          if (m.description && m.description.length > 10) {
            context += `  > Resumo: ${m.description.slice(0, 160)}...\n`;
          }
        }
        context += "\n";
      }
    }

    return context.trim();
  } catch (err) {
    return "Falha ao extrair contexto em tempo real do Kanban.";
  }
}
