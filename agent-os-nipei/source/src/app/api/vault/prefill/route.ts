import { NextRequest, NextResponse } from "next/server";
import { readVaultNote, resolveVaultRoot, VaultRoadmapItem } from "@/lib/vaultSyncEngine";

export const dynamic = "force-dynamic";

type TaskColumnStatus = "backlog" | "in_progress" | "review" | "done";
type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
type TaskPriority = "urgente" | "alta" | "media" | "baja";

export interface ConvertedAgentTask {
  id: string;
  title: string;
  description: string;
  status: TaskColumnStatus;
  priority: TaskPriority;
  assignedAgent: AgentCliType;
  customBinaryPath?: string;
  tags: string[];
  clientNoteId: string;
  vaultRoadmapId: string;
  executionLogs: Array<{ timestamp: string; message: string; level: "info" | "warn" | "error" | "output" }>;
  createdAt: string;
  updatedAt: string;
}

export interface ConvertedGlobalTask {
  id: string;
  title: string;
  project: string;
  assignee: string;
  squad: string;
  priority: TaskPriority;
  status: "pendente" | "em_progresso" | "concluido";
  columnStatus: "triage" | "todo" | "in_progress" | "agent_executing" | "review" | "done";
  dueDate: string;
  description: string;
  assignedAgents: string[];
}

function inferAgentFromTags(tags?: string[], responsable?: string): AgentCliType {
  const t = (tags || []).map((x) => x.toLowerCase());
  const r = (responsable || "").toLowerCase();

  if (r.includes("claude") || t.includes("dev") || t.includes("ui") || t.includes("sistema")) {
    return "claude";
  }
  if (r.includes("openclaw") || t.includes("infraestructura") || t.includes("botica") || t.includes("dns")) {
    return "openclaw";
  }
  if (r.includes("hermes") || t.includes("estrategia") || t.includes("ia") || t.includes("memoria")) {
    return "hermes";
  }
  return "claude";
}

function inferSquadFromTags(tags?: string[]): string {
  const t = (tags || []).map((x) => x.toLowerCase());
  if (t.includes("dev") || t.includes("ui") || t.includes("sistema")) return "squad_1_ceo";
  if (t.includes("botica") || t.includes("desenho") || t.includes("etiqueta")) return "squad_2_mutum";
  if (t.includes("retiro") || t.includes("hospedagem")) return "squad_3_retiros";
  if (t.includes("vendas") || t.includes("mkt") || t.includes("redes")) return "squad_4_vendas_mkt";
  if (t.includes("adm") || t.includes("legal") || t.includes("fiscal")) return "squad_5_adm_legal";
  if (t.includes("infraestructura") || t.includes("infra") || t.includes("dns")) return "squad_6_infra";
  if (t.includes("contenido") || t.includes("estrategia") || t.includes("instituto")) return "squad_7_instituto";
  return "squad_1_ceo";
}

function roadmapItemToAgentTask(item: VaultRoadmapItem, clientNoteId: string): ConvertedAgentTask {
  let status: TaskColumnStatus = "backlog";
  if (item.hecho) {
    status = "done";
  } else if (item.estado === "en_curso") {
    status = "in_progress";
  } else if (item.estado === "bloqueada" || item.estado === "esperando_cliente") {
    status = "review";
  }

  const priority = (item.prioridad as TaskPriority) || "media";
  const assignedAgent = inferAgentFromTags(item.tags, item.responsable);

  const logs: Array<{ timestamp: string; message: string; level: "info" | "warn" | "error" | "output" }> = [];
  if (item.hecho && item.fecha_completado) {
    logs.push({
      timestamp: `${item.fecha_completado}T12:00:00Z`,
      message: `Tarefa concluída e registrada no vault (${item.id})`,
      level: "info",
    });
  }

  return {
    id: `task-${item.id}`,
    title: item.texto,
    description: item.texto,
    status,
    priority,
    assignedAgent,
    tags: item.tags || [],
    clientNoteId,
    vaultRoadmapId: item.id,
    executionLogs: logs,
    createdAt: item.fecha_creacion ? `${item.fecha_creacion}T00:00:00Z` : "2026-08-11T00:00:00Z",
    updatedAt: item.fecha_completado ? `${item.fecha_completado}T00:00:00Z` : new Date().toISOString(),
  };
}

function roadmapItemToGlobalTask(item: VaultRoadmapItem, index: number): ConvertedGlobalTask {
  const priority = (item.prioridad as TaskPriority) || "media";
  const agent = inferAgentFromTags(item.tags, item.responsable);
  const squad = inferSquadFromTags(item.tags);

  let columnStatus: ConvertedGlobalTask["columnStatus"] = "triage";
  let status: ConvertedGlobalTask["status"] = "pendente";

  if (item.hecho) {
    columnStatus = "done";
    status = "concluido";
  } else if (item.estado === "en_curso") {
    columnStatus = "in_progress";
    status = "em_progresso";
  } else if (item.estado === "bloqueada" || item.estado === "esperando_cliente") {
    columnStatus = "review";
    status = "em_progresso";
  } else if (index === 0) {
    columnStatus = "todo";
  }

  return {
    id: `TSK-VAULT-${item.id}`,
    title: item.texto,
    project: item.proyecto_id || "Nipëi OS",
    assignee: item.responsable || "Equipe Nipëi",
    squad,
    priority,
    status,
    columnStatus,
    dueDate: item.fecha_limite || "2026-09-30",
    description: item.texto,
    assignedAgents: [agent],
  };
}

export async function GET(req?: NextRequest) {
  try {
    let customVault: string | undefined;
    let requestedBrand: string | null = null;

    if (req) {
      try {
        const url = new URL(req.url);
        customVault = url.searchParams.get("vaultRoot") || undefined;
        requestedBrand = url.searchParams.get("brandId") || url.searchParams.get("id");
      } catch {
        // Ignore URL parsing errors
      }
    }

    const vaultRoot = resolveVaultRoot(customVault);

    // 1. Read primary client note (default to Clientes/Nipeihu.md or requested brand)
    const primaryNotePath = requestedBrand ? `Clientes/${requestedBrand}.md` : "Clientes/Nipeihu.md";
    let primaryNote = await readVaultNote(primaryNotePath, customVault);
    if (!primaryNote && requestedBrand) {
      primaryNote = await readVaultNote(`Productos/${requestedBrand}.md`, customVault);
    }

    // 2. Read Clientes/Digital Alignment.md as mother agency context
    const daNote = await readVaultNote("Clientes/Digital Alignment.md", customVault);

    if (!primaryNote && !daNote) {
      return NextResponse.json(
        {
          success: false,
          error: `Vault notes not found in ${vaultRoot}. Ensure Clientes/Nipeihu.md exists.`,
          vaultRoot,
        },
        { status: 404 }
      );
    }

    // Convert roadmap items into unified task lists
    const primaryRoadmap = primaryNote?.roadmap || [];
    const daRoadmap = daNote?.roadmap || [];

    const agentTasks: ConvertedAgentTask[] = [
      ...primaryRoadmap.map((item) => roadmapItemToAgentTask(item, primaryNote?.id || "nipeihu")),
      ...daRoadmap.map((item) => roadmapItemToAgentTask(item, daNote?.id || "digital-alignment")),
    ];

    const globalTasks: ConvertedGlobalTask[] = [
      ...primaryRoadmap.map((item, idx) => roadmapItemToGlobalTask(item, idx)),
      ...daRoadmap.map((item, idx) => roadmapItemToGlobalTask(item, idx)),
    ];

    // Build structured company profile
    const companyProfile = primaryNote
      ? {
          id: primaryNote.id,
          nombre: primaryNote.nombre,
          tipo: primaryNote.tipo,
          emoji: primaryNote.emoji || "🪶",
          estado: primaryNote.estado,
          categoria: primaryNote.categoria,
          rubro: primaryNote.rubro,
          dominio: primaryNote.dominio,
          hosting: primaryNote.hosting,
          repo_github: primaryNote.repo_github,
          repo_local: primaryNote.repo_local,
          stack: primaryNote.stack || [],
          relaciones: primaryNote.relaciones || [],
          servicios_vps: primaryNote.servicios_vps || [],
          proyectos: primaryNote.proyectos || [],
          servicios: primaryNote.servicios || [],
          historial: primaryNote.historial || [],
          canales_adquisicion: primaryNote.canales_adquisicion || [],
          vacios_detectados: primaryNote.vacios_detectados || [],
          reporte_md: primaryNote.reporte_md,
          ultima_sync: primaryNote.ultima_sync,
          parentAgency: daNote
            ? {
                id: daNote.id,
                nombre: daNote.nombre,
                tipo: daNote.tipo,
                emoji: daNote.emoji || "🏛️",
                estado: daNote.estado,
                categoria: daNote.categoria,
                rubro: daNote.rubro,
                dominio: daNote.dominio,
                hosting: daNote.hosting,
                stack: daNote.stack || [],
                proyectos: daNote.proyectos || [],
                roadmap: daNote.roadmap || [],
              }
            : null,
        }
      : null;

    return NextResponse.json({
      success: true,
      source: "obsidian_vault",
      vaultRoot,
      company: companyProfile,
      tasks: agentTasks,
      agentTasks,
      globalTasks,
      rawNotes: {
        primary: primaryNote,
        digitalAlignment: daNote,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
