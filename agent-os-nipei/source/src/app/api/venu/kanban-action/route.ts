import { NextRequest, NextResponse } from "next/server";
import {
  createKanbanTaskDirect,
  updateKanbanTaskDirect,
  assignKanbanTaskDirect,
  type CreateTaskOptions,
  type UpdateTaskOptions,
} from "@/lib/kanbanGrounding";

import { getEquipes, getPessoas, getProjetos, getObjetivos } from "@/lib/v2/data";

// Used by the Hermes skill nipei-os (hermes/skills/nipei-os/SKILL.md): create, update and assign tasks.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type V2Input = { equipe?: unknown; responsaveis?: unknown; projeto?: unknown; objetivo?: unknown; prazo?: unknown; project?: unknown; assignee?: unknown };

/** Checks the optional v2 fields against the vault and returns the frontmatter to add (same keys createTarefa writes). */
function validateV2Fields(input: V2Input): { fields: Record<string, string | string[]> } | { error: string } {
  const str = (v: unknown) => (v == null ? "" : String(v).trim());
  const fields: Record<string, string | string[]> = {};

  const objetivoId = str(input.objetivo);
  const objetivo = objetivoId ? getObjetivos().find((o) => o.id === objetivoId) : undefined;
  if (objetivoId && !objetivo) return { error: `objetivo "${objetivoId}" não existe. Válidos: ${getObjetivos().map((o) => o.id).join(", ")}` };

  // An objetivo already belongs to a team; use it when equipe is omitted.
  const equipe = str(input.equipe) || objetivo?.equipe || "";
  if (equipe && !getEquipes().some((e) => e.id === equipe)) {
    return { error: `equipe "${equipe}" não existe. Válidas: ${getEquipes().map((e) => e.id).join(", ")}` };
  }

  const projetoId = str(input.projeto);
  const projeto = projetoId ? getProjetos().find((p) => p.id === projetoId) : undefined;
  if (projetoId && !projeto) return { error: `projeto "${projetoId}" não existe. Válidos: ${getProjetos().map((p) => p.id).join(", ")}` };

  const responsaveis = input.responsaveis == null ? [] : (Array.isArray(input.responsaveis) ? input.responsaveis : [input.responsaveis]).map(str).filter(Boolean);
  const pessoas = getPessoas();
  const unknown = responsaveis.filter((r) => !pessoas.some((p) => p.id === r));
  if (unknown.length) return { error: `responsaveis não encontrados em Miembros/: ${unknown.join(", ")}` };

  const prazo = str(input.prazo);
  if (prazo && !(/^\d{4}-\d{2}-\d{2}$/.test(prazo) && !isNaN(Date.parse(prazo)))) {
    return { error: `prazo "${prazo}" inválido; use YYYY-MM-DD` };
  }

  if (equipe) fields.equipe = equipe;
  if (objetivoId) fields.objetivo = objetivoId;
  if (projeto) {
    fields.projeto = projeto.id;
    if (!str(input.project)) fields.project = projeto.nome;
  }
  if (responsaveis.length) {
    fields.responsaveis = responsaveis;
    if (!str(input.assignee)) fields.responsible = responsaveis.map((r) => pessoas.find((p) => p.id === r)!.name || r).join(", ");
  }
  if (prazo) fields.prazo = prazo;
  return { fields };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação ('action') é obrigatória: create | update | assign" },
        { status: 400 }
      );
    }

    if (action === "create") {
      const opts: CreateTaskOptions = payload || body;
      if (!opts.title) {
        return NextResponse.json(
          { success: false, error: "Título da tarefa é obrigatório para criação" },
          { status: 400 }
        );
      }
      const v2 = validateV2Fields(opts);
      if ("error" in v2) {
        return NextResponse.json({ success: false, error: v2.error }, { status: 400 });
      }
      if (typeof v2.fields.project === "string") opts.project = v2.fields.project;
      const res = createKanbanTaskDirect(opts, v2.fields);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        action: "create",
        task: res.task,
        message: `Tarefa "${res.task?.title}" criada com sucesso no Squad ${res.task?.squad}.`,
      });
    }

    if (action === "update") {
      const opts: UpdateTaskOptions = payload || body;
      if (!opts.idOrTitle) {
        return NextResponse.json(
          { success: false, error: "idOrTitle é obrigatório para atualização" },
          { status: 400 }
        );
      }
      const res = updateKanbanTaskDirect(opts);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        action: "update",
        task: res.task,
        message: `Tarefa "${res.task?.title}" atualizada com sucesso para a coluna ${res.task?.columnStatus}.`,
      });
    }

    if (action === "assign") {
      const { idOrTitle, agents, assignee } = payload || body;
      if (!idOrTitle) {
        return NextResponse.json(
          { success: false, error: "idOrTitle é obrigatório para atribuição" },
          { status: 400 }
        );
      }
      const res = assignKanbanTaskDirect(idOrTitle, agents, assignee);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        action: "assign",
        task: res.task,
        message: `Atribuição da tarefa "${res.task?.title}" atualizada com sucesso.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Ação desconhecida: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
