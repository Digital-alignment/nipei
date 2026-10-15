import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";

export const dynamic = "force-dynamic";

interface GlobalTask {
  id: string;
  title: string;
  project: string;
  squad: string;
  column: string;
  columnStatus?: string;
  status?: string;
  assignee: string;
  priority: "urgente" | "alta" | "media" | "baixa";
  dueDate: string;
  assignedAgents: string[];
  vaultPath: string;
  description: string;
}

// Helper: load project-to-squad dictionary from Squads/squad_*.md
function loadProjectToSquadMap(vaultRoot: string): Record<string, string> {
  const map: Record<string, string> = {};
  const squadsDir = path.join(vaultRoot, "Squads");
  if (!fs.existsSync(squadsDir)) return map;

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
      /* ignore */
    }
  }
  return map;
}

export async function GET() {
  try {
    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, tasks: [] });
    }

    const projectToSquad = loadProjectToSquadMap(vaultRoot);
    const tasks: GlobalTask[] = [];

    // 1. Load operational 243 tasks from Productivity/Tarefas
    const tarefasDir = path.join(vaultRoot, "Productivity", "Tarefas");
    if (fs.existsSync(tarefasDir)) {
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

          const taskId = idMatch ? idMatch[1].trim() : filename.replace(".md", "");
          const title = titleMatch ? titleMatch[1].trim() : filename.replace(".md", "").replace(/_/g, " ");
          const statusRaw = statusMatch ? statusMatch[1].trim() : "A fazer";
          const priorityRaw = priorityMatch ? priorityMatch[1].trim().toLowerCase() : "media";
          const projectName = projectMatch ? projectMatch[1].trim() : "Geral Nipëi OS";
          const responsible = responsibleMatch && responsibleMatch[1].trim() ? responsibleMatch[1].trim() : "Time Liderança";
          const dueDate = prazoMatch && prazoMatch[1].trim() ? prazoMatch[1].trim() : "2026-10-30";

          // Normalize priority
          let priority: "urgente" | "alta" | "media" | "baixa" = "media";
          if (priorityRaw.includes("urgente")) priority = "urgente";
          else if (priorityRaw.includes("alta")) priority = "alta";
          else if (priorityRaw.includes("baixa")) priority = "baixa";

          // Map status to Kanban column
          let column = "todo";
          const sLower = statusRaw.toLowerCase();
          if (sLower.includes("conclu") || sLower.includes("done")) {
            column = "done";
          } else if (sLower.includes("andamento") || sLower.includes("fazendo") || sLower.includes("progress")) {
            column = "in_progress";
          } else if (sLower.includes("bloque") || sLower.includes("revis") || sLower.includes("veto")) {
            column = "review";
          } else if (sLower.includes("triag") || sLower.includes("idea")) {
            column = "triage";
          } else {
            column = "todo";
          }

          // Lookup squad from project mapping
          const squad = projectToSquad[projectName.toLowerCase()] || "squad_1_ceo";

          // Assigned Agents
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
            column,
            columnStatus: column as any,
            status: column === "done" ? "concluido" : column === "in_progress" ? "em_progresso" : "pendente",
            assignee: responsible,
            priority,
            dueDate,
            assignedAgents,
            vaultPath: `Productivity/Tarefas/${filename}`,
            description: `Tarefa operacional vinculada ao projeto [[${projectName}]]. Status original: ${statusRaw}.`,
          });
        } catch (fileErr) {
          console.error("Error reading tarefa file:", filename, fileErr);
        }
      }
    }

    // 2. Load audit tasks from Todo_Audit_Lists (if present)
    const todoDir = path.join(vaultRoot, "Todo_Audit_Lists");
    if (fs.existsSync(todoDir)) {
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

        let squad = "squad_1_ceo";
        if (filename.includes("squad_02")) squad = "squad_2_mutum";
        else if (filename.includes("squad_03") || filename.includes("squad_06")) squad = "squad_4_vendas_mkt";
        else if (filename.includes("squad_04")) squad = "squad_5_adm_legal";
        else if (filename.includes("squad_05")) squad = "squad_6_infra";
        else if (filename.includes("squad_07")) squad = "squad_7_instituto";

        let column = "triage";
        const isResolved = content.includes("RESUELTO_Y_VERIFICADO") || content.includes("[x]");
        if (isResolved) column = "done";
        else if (index % 6 === 0) column = "in_progress";

        tasks.push({
          id: `VAC-${(index + 1).toString().padStart(3, "0")}`,
          title: `Auditoria: ${title}`,
          project: "Auditoria do Vault Nipëi",
          squad,
          column,
          columnStatus: column as any,
          status: isResolved ? "concluido" : "pendente",
          assignee: "Vaultkeeper AI",
          priority: "alta",
          dueDate: "2026-10-31",
          assignedAgents: ["antigravity", "hermes"],
          vaultPath: `Todo_Audit_Lists/${filename}`,
          description: content.slice(0, 200) || "Auditoria de integridade e vacíos de informação.",
        });
      });
    }

    return NextResponse.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    console.error("Error in agent-kanban API:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load kanban tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, squad, priority, assignedAgents, project } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, error: "Vault root not configured" }, { status: 500 });
    }

    const tarefasDir = path.join(vaultRoot, "Productivity", "Tarefas");
    if (!fs.existsSync(tarefasDir)) {
      fs.mkdirSync(tarefasDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 35);
    const filename = `task_${Date.now().toString().slice(-4)}_${cleanTitle}.md`;
    const filePath = path.join(tarefasDir, filename);

    const taskId = `task_${Date.now().toString().slice(-6)}`;
    const projectName = project || "Demanda Geral Squad 1";

    const content = `---
id: "${taskId}"
title: "${title}"
type: "tarefa"
status: "A fazer"
priority: "${priority === "urgente" ? "Urgente" : priority === "alta" ? "Alta" : "Média"}"
project: "${projectName}"
tags:
  - tarefa
  - nipei-os
  - status-a-fazer
updated_at: "${new Date().toISOString()}"
---

<!-- agente: hermes-task-manager -->
# Tarefa: ${title}

**Status**: \`A fazer\` | **Prioridade**: \`${priority || "Média"}\`

> 📋 **Ação Operacional do Ecossistema Nipëi OS**

## 📁 Projeto Vinculado
- [[${projectName}]]

## 👥 Responsáveis & Time Vinculado
- Squad: \`${squad || "squad_1_ceo"}\`
- Agentes: ${Array.isArray(assignedAgents) ? assignedAgents.map((a: string) => `@${a}`).join(", ") : "@hermes, @antigravity"}

## 📌 Descrição & Notas
${description || "Criada via Nipëi OS Kanban / Hermes Task Assistant."}
`;

    fs.writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        title,
        project: projectName,
        squad: squad || "squad_1_ceo",
        column: "todo",
        assignee: "Time Liderança",
        priority: priority || "alta",
        dueDate: "2026-10-30",
        assignedAgents: assignedAgents || ["antigravity", "hermes"],
        vaultPath: `Productivity/Tarefas/${filename}`,
        description,
      },
    });
  } catch (err: any) {
    console.error("Error creating task in vault:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { vaultPath, executionLog, status, column } = body;

    if (!vaultPath) {
      return NextResponse.json({ success: false, error: "vaultPath is required" }, { status: 400 });
    }

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, error: "Vault root not configured" }, { status: 500 });
    }
    const fullPath = path.join(vaultRoot, vaultPath);

    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, "utf-8");

      // Update status in frontmatter if moving columns
      if (column) {
        let newStatus = "A fazer";
        if (column === "done") newStatus = "Concluído";
        else if (column === "in_progress") newStatus = "Em andamento";
        else if (column === "review") newStatus = "Bloqueado";
        else if (column === "triage" || column === "todo") newStatus = "A fazer";

        if (content.includes("status:")) {
          content = content.replace(/status:\s*"?([^"\n\r]+)"?/, `status: "${newStatus}"`);
        }
      }

      if (executionLog) {
        content += `\n\n### 🤖 Registro de Execução de Agente IA (${new Date().toLocaleString()})\n${executionLog}\n`;
      }

      if (status === "done" && !content.includes("RESUELTO_Y_VERIFICADO")) {
        content = content.replace(/status:\s*"?([^"\n\r]+)"?/, `status: "Concluído"`);
        content += `\n- **Estado**: 🟢 Concluído e verificado via Nipëi OS (${new Date().toLocaleString()})\n`;
      }

      fs.writeFileSync(fullPath, content, "utf-8");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating task in vault:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update task" },
      { status: 500 }
    );
  }
}
