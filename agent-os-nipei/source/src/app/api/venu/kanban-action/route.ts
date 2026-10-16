import { NextRequest, NextResponse } from "next/server";
import {
  createKanbanTaskDirect,
  updateKanbanTaskDirect,
  assignKanbanTaskDirect,
  getLiveKanbanTasks,
  searchKanbanTasks,
  type CreateTaskOptions,
  type UpdateTaskOptions,
} from "@/lib/kanbanGrounding";
import { executeGenerateDeliverable } from "@/app/api/agent-kanban/deliverables/route";
import { executeDispatchCommunication } from "@/app/api/agent-kanban/dispatch/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação ('action') é obrigatória: create | update | assign | deliverable | dispatch" },
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

    if (action === "deliverable") {
      const opts = payload || body;
      const idOrTitle = opts.idOrTitle || opts.taskId || opts.taskTitle;
      if (!idOrTitle) {
        return NextResponse.json(
          { success: false, error: "idOrTitle (ou taskId) é obrigatório para gerar entregável" },
          { status: 400 }
        );
      }

      const tasks = getLiveKanbanTasks();
      const search = String(idOrTitle).toLowerCase().trim();
      const found =
        tasks.find((t) => t.id.toLowerCase() === search) ||
        tasks.find((t) => t.title.toLowerCase().includes(search)) ||
        searchKanbanTasks(idOrTitle, 1)[0];

      if (!found) {
        return NextResponse.json(
          { success: false, error: `Tarefa "${idOrTitle}" não encontrada no Kanban.` },
          { status: 404 }
        );
      }

      const res = await executeGenerateDeliverable({
        taskId: found.id,
        taskTitle: found.title,
        taskSquad: found.squad,
        taskDescription: found.description,
        taskPriority: found.priority,
        taskAssignee: found.assignee,
        format: opts.format || "executive_report",
        customInstructions: opts.instructions || opts.customInstructions,
        agentId: opts.agentId || "@apollo",
        vaultPath: found.vaultPath,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "deliverable",
        task: found,
        deliverable: res.deliverable,
        message: res.message || `Entregável gerado para "${found.title}".`,
      });
    }

    if (action === "dispatch") {
      const opts = payload || body;
      const idOrTitle = opts.idOrTitle || opts.taskId || opts.taskTitle;
      if (!idOrTitle) {
        return NextResponse.json(
          { success: false, error: "idOrTitle é obrigatório para despacho" },
          { status: 400 }
        );
      }

      const tasks = getLiveKanbanTasks();
      const search = String(idOrTitle).toLowerCase().trim();
      const found =
        tasks.find((t) => t.id.toLowerCase() === search) ||
        tasks.find((t) => t.title.toLowerCase().includes(search)) ||
        searchKanbanTasks(idOrTitle, 1)[0];

      if (!found) {
        return NextResponse.json(
          { success: false, error: `Tarefa "${idOrTitle}" não encontrada no Kanban.` },
          { status: 404 }
        );
      }

      const channel = opts.channel || "whatsapp";
      let recipient = opts.recipient;
      if (!recipient) {
        if (channel === "whatsapp") recipient = "5511999999999";
        else if (channel === "email") recipient = "lideranca@nipei.org";
        else recipient = "https://n8n.digital-alignment.com/webhook/test";
      }

      const messageText =
        opts.messageText ||
        `[Nipëi OS] Relatório da Tarefa [${found.id}] "${found.title}": Status atual "${found.columnStatus}", Prioridade "${found.priority}". Squad: ${found.squad}.`;

      const res = await executeDispatchCommunication({
        taskId: found.id,
        taskTitle: found.title,
        taskSquad: found.squad,
        channel,
        recipient,
        recipientName: opts.recipientName || found.assignee || "Responsável Squad",
        subject: opts.subject,
        messageText,
        deliverableId: opts.deliverableId,
        agentId: opts.agentId || "@apollo",
        simulate: opts.simulate !== undefined ? opts.simulate : false,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "dispatch",
        task: found,
        communication: res.communication,
        message: res.message || `Despacho registrado para "${found.title}".`,
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
