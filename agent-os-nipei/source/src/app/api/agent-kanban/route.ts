import { NextResponse } from "next/server";
import fs from "fs";
import { createTarefaNote, resolveTarefa, writeTarefa } from "@/lib/tarefaNote";
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

import { COLUMN_STATUS, getLiveKanbanTasks } from "@/lib/kanbanGrounding";

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

    const projectName = project || "Geral";
    const { id: taskId, relFile } = createTarefaNote(vaultRoot, {
      title,
      priority: priority === "urgente" ? "Urgente" : priority === "alta" ? "Alta" : priority === "baixa" ? "Baixa" : "Média",
      project: projectName,
      squad: squad || "squad_1_ceo",
      agents: Array.isArray(assignedAgents) && assignedAgents.length ? assignedAgents : ["antigravity", "hermes"],
    }, "Kanban v1", { descricao: description || "" });
    const filename = path.basename(relFile);

    return NextResponse.json({
      success: true,
      task: {
        id: taskId,
        title,
        project: projectName,
        squad: squad || "squad_1_ceo",
        column: "todo",
        assignee: "",
        priority: priority || "alta",
        dueDate: "",
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
    // resolveTarefa refuses any path outside Productivity/Tarefas (it used to accept any vaultPath).
    if (fs.existsSync(resolveTarefa(vaultRoot, vaultPath))) {
      const extra: string[] = [];
      if (executionLog) extra.push(`registro do agente: ${String(executionLog).replace(/\s+/g, " ").slice(0, 500)}`);
      writeTarefa(vaultRoot, vaultPath, "Kanban v1", (d) => {
        if (squad) d.fm.squad = squad;
        if (Array.isArray(assignedAgents)) d.fm.agents = assignedAgents.map((a: string) => String(a).replace(/^@/, ""));
        if (column && column in COLUMN_STATUS) d.fm.status = COLUMN_STATUS[column as keyof typeof COLUMN_STATUS];
        if (status === "done") d.fm.status = "Concluído";
        else if (status === "archived") d.fm.status = "Arquivado";
      }, extra);
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
