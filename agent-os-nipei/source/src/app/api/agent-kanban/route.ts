import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import type { TaskAttachment, TaskDeliverable } from "@/lib/nipeiStore";

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
  attachments?: TaskAttachment[];
  deliverables?: TaskDeliverable[];
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

import { getLiveKanbanTasks, setAgentsFrontmatter } from "@/lib/kanbanGrounding";

export async function GET() {
  try {
    const tasks = getLiveKanbanTasks();
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
squad: "${squad || "squad_1_ceo"}"
agents: [${(Array.isArray(assignedAgents) && assignedAgents.length ? assignedAgents : ["antigravity", "hermes"]).map((a: string) => JSON.stringify(a)).join(", ")}]
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
    const { vaultPath, executionLog, status, column, squad, assignedAgents } = body;

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

      // Update squad if provided
      if (squad) {
        if (content.includes("squad:")) {
          content = content.replace(/squad:\s*"?([^"\n\r]+)"?/, `squad: "${squad}"`);
        } else {
          content = content.replace(/---\n/, `---\nsquad: "${squad}"\n`);
        }
        if (content.match(/-\s*Squad:\s*`?[^`\n\r]+`?/i)) {
          content = content.replace(/-\s*Squad:\s*`?[^`\n\r]+`?/i, `- Squad: \`${squad}\``);
        }
      }

      if (Array.isArray(assignedAgents)) {
        content = setAgentsFrontmatter(content, assignedAgents);
      }

      // Update status in frontmatter if moving columns
      if (column) {
        let newStatus = "A fazer";
        if (column === "archived") newStatus = "Arquivado";
        else if (column === "done") newStatus = "Concluído";
        else if (column === "agent_executing") newStatus = "IA em Execução";
        else if (column === "in_progress") newStatus = "Em andamento";
        else if (column === "review") newStatus = "Revisão / Bloqueado";
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
      } else if (status === "archived") {
        content = content.replace(/status:\s*"?([^"\n\r]+)"?/, `status: "Arquivado"`);
        content += `\n- **Estado**: 📦 Arquivado no histórico Nipëi OS (${new Date().toLocaleString()})\n`;
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
