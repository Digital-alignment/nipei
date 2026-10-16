import { NextRequest, NextResponse } from "next/server";
import {
  createKanbanTaskDirect,
  updateKanbanTaskDirect,
  assignKanbanTaskDirect,
  type CreateTaskOptions,
  type UpdateTaskOptions,
} from "@/lib/kanbanGrounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      const res = createKanbanTaskDirect(opts);
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
