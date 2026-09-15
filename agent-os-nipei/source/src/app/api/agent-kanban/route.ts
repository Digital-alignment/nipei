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
  assignee: string;
  priority: "urgente" | "alta" | "media" | "baixa";
  dueDate: string;
  assignedAgents: string[];
  vaultPath: string;
  description: string;
}

export async function GET() {
  try {
    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, tasks: [] });
    }
    const todoDir = path.join(vaultRoot, "Todo_Audit_Lists");

    if (!fs.existsSync(todoDir)) {
      return NextResponse.json({ success: false, tasks: [] });
    }

    const files = fs.readdirSync(todoDir).filter((f) => f.endsWith(".md"));

    const tasks: GlobalTask[] = files.map((filename, index) => {
      const filePath = path.join(todoDir, filename);
      let content = "";
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch (err) {
        console.error("Error reading file:", filename, err);
      }

      // Clean title from filename
      let title = filename
        .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, "")
        .replace(/_vacios\.md$/, "")
        .replace(/_/g, " ");
      title = title.charAt(0).toUpperCase() + title.slice(1);

      // Determine Squad mapping
      let squad = "squad_1_ceo";
      let assignee = "Prime Agent";
      let assignedAgents = ["antigravity", "hermes"];

      if (filename.includes("squad_01") || filename.includes("governan") || filename.includes("ceo")) {
        squad = "squad_1_ceo";
        assignee = "Prime Agent (CEO)";
        assignedAgents = ["antigravity", "hermes"];
      } else if (filename.includes("squad_02") || filename.includes("log_stica") || filename.includes("opera")) {
        squad = "squad_2_mutum";
        assignee = "OpenClaw (Logística)";
        assignedAgents = ["openclaw", "hermes"];
      } else if (filename.includes("squad_03") || filename.includes("marketing") || filename.includes("m_dias")) {
        squad = "squad_4_vendas_mkt";
        assignee = "Content Studio (Mkt)";
        assignedAgents = ["antigravity", "claude"];
      } else if (filename.includes("squad_04") || filename.includes("finan") || filename.includes("gastos")) {
        squad = "squad_5_adm_legal";
        assignee = "Finance Agent";
        assignedAgents = ["antigravity", "hermes"];
      } else if (filename.includes("squad_05") || filename.includes("infra") || filename.includes("tech") || filename.includes("vps")) {
        squad = "squad_6_infra";
        assignee = "Antigravity / Claude Code";
        assignedAgents = ["antigravity", "claude"];
      } else if (filename.includes("squad_06") || filename.includes("ventas") || filename.includes("crm") || filename.includes("atendimento")) {
        squad = "squad_4_vendas_mkt";
        assignee = "Hermes Dedicated";
        assignedAgents = ["hermes", "antigravity"];
      } else if (filename.includes("squad_07") || filename.includes("instituto") || filename.includes("espirituais")) {
        squad = "squad_7_instituto";
        assignee = "Brain Vault Agent";
        assignedAgents = ["antigravity", "hermes"];
      }

      // Column mapping based on content and resolution status
      let column = "triage";
      const isResolved = content.includes("RESUELTO_Y_VERIFICADO") || content.includes("[x]") || content.includes("leader-");
      if (isResolved) {
        column = "done";
      } else if (index % 5 === 0) {
        column = "agent_executing";
      } else if (index % 3 === 0) {
        column = "todo";
      } else if (index % 7 === 0) {
        column = "in_progress";
      }

      return {
        id: `VAC-${(index + 1).toString().padStart(3, "0")}`,
        title: `Vacío de Información: ${title}`,
        project: "Nipëi OS Vault Audit",
        squad,
        column,
        assignee,
        priority: index % 2 === 0 ? "alta" : "media",
        dueDate: "2026-09-30",
        assignedAgents,
        vaultPath: `Todo_Audit_Lists/${filename}`,
        description: content.slice(0, 300) || "Auditoria de vacuidad de información detectada en el Vault."
      };
    });

    return NextResponse.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    console.error("Error in agent-kanban API:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to load kanban tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, squad, priority, assignedAgents } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, error: "Vault root not configured" }, { status: 500 });
    }
    const todoDir = path.join(vaultRoot, "Todo_Audit_Lists");
    if (!fs.existsSync(todoDir)) {
      fs.mkdirSync(todoDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const filename = `${timestamp}_task_${cleanTitle}_vacios.md`;
    const filePath = path.join(todoDir, filename);

    const content = `<!-- agente: user-manual -->
# 📋 Tarea Creada: ${title}
- **Fecha Creación**: ${new Date().toLocaleString()}
- **Squad**: ${squad || "squad_1_ceo"}
- **Prioridad**: ${priority || "alta"}

---

## 📝 Descripción
${description || "Sin descripción proporcionada."}

---

## 🤖 Agentes Asignados
${Array.isArray(assignedAgents) ? assignedAgents.map((a: string) => `@${a}`).join(", ") : "@antigravity"}
`;

    fs.writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({
      success: true,
      task: {
        id: `VAC-${Date.now().toString().slice(-4)}`,
        title: `Tarea: ${title}`,
        project: "Nipëi OS Vault Audit",
        squad: squad || "squad_1_ceo",
        column: "todo",
        assignee: "Agente Asignado",
        priority: priority || "alta",
        dueDate: "2026-09-30",
        assignedAgents: assignedAgents || ["antigravity"],
        vaultPath: `Todo_Audit_Lists/${filename}`,
        description
      }
    });
  } catch (err: any) {
    console.error("Error creating manual task in vault:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { vaultPath, executionLog, status } = body;

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
      if (executionLog) {
        content += `\n\n### 🤖 Registro de Ejecución de Agente IA (${new Date().toLocaleString()})\n${executionLog}\n`;
      }
      if (status === "done" && !content.includes("RESUELTO_Y_VERIFICADO")) {
        content = `<!-- agente: antigravity-auditor -->\n${content}\n- **Estado**: 🟢 RESUELTO_Y_VERIFICADO\n`;
      }
      fs.writeFileSync(fullPath, content, "utf-8");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating task in vault:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to update task" }, { status: 500 });
  }
}

