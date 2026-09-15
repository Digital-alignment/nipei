import { NextRequest, NextResponse } from "next/server";
import {
  readVaultNote,
  writeVaultNote,
  withFileLock,
  type VaultRoadmapItem,
} from "@/lib/vaultSyncEngine";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  resolveTaskStorePath,
  type AgentTask,
  type TaskColumnStatus,
  type AgentCliType,
  type TaskPriority,
  type TaskFilters,
  VALID_TASK_STATUSES,
  VALID_AGENTS,
  VALID_PRIORITIES,
} from "@/lib/agentTaskStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface VaultSyncResult {
  synced: boolean;
  reason?: string;
  roadmapId?: string;
  noteId?: string;
  error?: string;
}

/**
 * Synchronizes task state with corresponding Obsidian vault note roadmap item.
 * Strictly enforces da-vault-schema invariants.
 */
export async function syncTaskWithVault(
  task: AgentTask,
  customVaultRoot?: string
): Promise<VaultSyncResult> {
  if (!task.clientNoteId) {
    return { synced: false, reason: "No clientNoteId attached to task" };
  }

  const lockKey = `sync-${task.clientNoteId.toLowerCase()}`;

  return withFileLock(lockKey, async () => {
    try {
      const note = await readVaultNote(task.clientNoteId!, customVaultRoot);
      if (!note) {
        return {
          synced: false,
          reason: `Vault note '${task.clientNoteId}' not found in vault`,
        };
      }

      const roadmap: VaultRoadmapItem[] = Array.isArray(note.roadmap) ? [...note.roadmap] : [];
      const roadmapId = task.vaultRoadmapId || task.id.replace(/^task-/, "");
      const isDone = task.status === "done";
      const today = new Date().toISOString().slice(0, 10);

      const existingIdx = roadmap.findIndex((item) => item.id === roadmapId);

      if (existingIdx >= 0) {
        const item: VaultRoadmapItem = { ...roadmap[existingIdx] };
        item.hecho = isDone;

        if (isDone) {
          delete item.estado;
          item.fecha_completado = today;
        } else {
          delete item.fecha_completado;
          item.estado =
            task.status === "in_progress"
              ? "en_curso"
              : task.status === "review"
              ? "bloqueada"
              : "pendiente";
        }

        item.prioridad = task.priority;
        item.responsable = `@${task.assignedAgent}`;
        item.texto = task.title;
        roadmap[existingIdx] = item;
      } else {
        const newItem: VaultRoadmapItem = {
          id: roadmapId,
          texto: task.title,
          prioridad: task.priority,
          hecho: isDone,
          orden: roadmap.length,
          tags: task.tags || [],
          responsable: `@${task.assignedAgent}`,
          fecha_creacion: today,
        };

        if (isDone) {
          newItem.fecha_completado = today;
        } else {
          newItem.estado =
            task.status === "in_progress"
              ? "en_curso"
              : task.status === "review"
              ? "bloqueada"
              : "pendiente";
        }

        roadmap.push(newItem);
      }

      const writeResult = await writeVaultNote(
        task.clientNoteId!,
        { roadmap },
        customVaultRoot
      );

      if (!writeResult.success) {
        return {
          synced: false,
          reason: writeResult.error || "Failed to write updated roadmap to vault note",
          roadmapId,
          noteId: task.clientNoteId,
        };
      }

      return { synced: true, roadmapId, noteId: task.clientNoteId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { synced: false, error: message, noteId: task.clientNoteId };
    }
  });
}

function extractStoreOverride(url: URL, body?: Record<string, unknown>): string | undefined {
  return (
    url.searchParams.get("storePath") ||
    url.searchParams.get("tasksFile") ||
    url.searchParams.get("stateDir") ||
    (typeof body?.storePath === "string" ? body.storePath : undefined) ||
    (typeof body?.tasksFile === "string" ? body.tasksFile : undefined) ||
    (typeof body?.stateDir === "string" ? body.stateDir : undefined)
  );
}

/**
 * GET /api/agent-tasks
 * Retrieves filtered list of tasks or a single task by ?id=...
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const status = url.searchParams.get("status") as TaskColumnStatus | null;
    const assignedAgent = url.searchParams.get("assignedAgent") as AgentCliType | null;
    const priority = url.searchParams.get("priority") as TaskPriority | null;
    const clientNoteId = url.searchParams.get("clientNoteId") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const sortBy = url.searchParams.get("sortBy") as "priority" | "createdAt" | "updatedAt" | null;
    const sortOrder = (url.searchParams.get("sortOrder") as "asc" | "desc") || undefined;
    const storeOverride = extractStoreOverride(url);

    // Single task retrieval
    if (id) {
      const task = await getTaskById(id, storeOverride);
      if (!task) {
        return NextResponse.json(
          { success: false, error: `Task with id '${id}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, task });
    }

    const filters: TaskFilters = {
      ...(status && VALID_TASK_STATUSES.includes(status) ? { status } : {}),
      ...(assignedAgent && VALID_AGENTS.includes(assignedAgent) ? { assignedAgent } : {}),
      ...(priority && VALID_PRIORITIES.includes(priority) ? { priority } : {}),
      ...(clientNoteId ? { clientNoteId } : {}),
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    };

    const tasks = await getTasks(filters, storeOverride);

    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
      agentTasks: tasks, // Alias for frontend compatibility
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/agent-tasks
 * Creates a new task and optionally links it to a vault note roadmap.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate title
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ success: false, error: "Task title is required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const customVaultRoot = url.searchParams.get("vaultRoot") || (typeof body.vaultRoot === "string" ? body.vaultRoot : undefined);
    const storeOverride = extractStoreOverride(url, body);

    // Validate enums if provided
    const status: TaskColumnStatus = body.status || "backlog";
    if (!VALID_TASK_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status '${status}'. Must be one of: ${VALID_TASK_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const priority: TaskPriority = body.priority || "media";
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { success: false, error: `Invalid priority '${priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }

    const assignedAgent: AgentCliType = body.assignedAgent || "claude";
    if (!VALID_AGENTS.includes(assignedAgent)) {
      return NextResponse.json(
        { success: false, error: `Invalid assignedAgent '${assignedAgent}'. Must be one of: ${VALID_AGENTS.join(", ")}` },
        { status: 400 }
      );
    }

    const newTask = await createTask(
      {
        id: body.id,
        title: body.title.trim(),
        description: typeof body.description === "string" ? body.description : "",
        status,
        priority,
        assignedAgent,
        customBinaryPath: typeof body.customBinaryPath === "string" ? body.customBinaryPath : undefined,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        clientNoteId: typeof body.clientNoteId === "string" ? body.clientNoteId : undefined,
        vaultRoadmapId: typeof body.vaultRoadmapId === "string" ? body.vaultRoadmapId : undefined,
        executionLogs: Array.isArray(body.executionLogs) ? body.executionLogs : [],
        createdAt: typeof body.createdAt === "string" ? body.createdAt : undefined,
      },
      storeOverride
    );

    // Vault Roadmap Synchronization (if clientNoteId is attached)
    let vaultSync: VaultSyncResult = { synced: false, reason: "No clientNoteId attached" };
    if (newTask.clientNoteId) {
      vaultSync = await syncTaskWithVault(newTask, customVaultRoot);
    }

    return NextResponse.json(
      {
        success: true,
        task: newTask,
        vaultSync,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/agent-tasks
 * Updates task fields and synchronizes status changes with the Obsidian vault note roadmap.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const url = new URL(req.url);
    const id = body.id || url.searchParams.get("id");
    const customVaultRoot = url.searchParams.get("vaultRoot") || (typeof body.vaultRoot === "string" ? body.vaultRoot : undefined);
    const storeOverride = extractStoreOverride(url, body);

    if (!id) {
      return NextResponse.json({ success: false, error: "Task 'id' is required" }, { status: 400 });
    }

    // Validate enum updates
    if (body.status !== undefined && !VALID_TASK_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status '${body.status}'. Must be one of: ${VALID_TASK_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: `Invalid priority '${body.priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.assignedAgent !== undefined && !VALID_AGENTS.includes(body.assignedAgent)) {
      return NextResponse.json(
        { success: false, error: `Invalid assignedAgent '${body.assignedAgent}'. Must be one of: ${VALID_AGENTS.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.title !== undefined && (!body.title || typeof body.title !== "string" || !body.title.trim())) {
      return NextResponse.json({ success: false, error: "Task title cannot be empty" }, { status: 400 });
    }

    // Check task existence first
    const existing = await getTaskById(id, storeOverride);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Task with id '${id}' not found` },
        { status: 404 }
      );
    }

    const updatedTask = await updateTask(
      id,
      {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: String(body.description) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.assignedAgent !== undefined ? { assignedAgent: body.assignedAgent } : {}),
        ...(body.customBinaryPath !== undefined ? { customBinaryPath: body.customBinaryPath } : {}),
        ...(Array.isArray(body.tags) ? { tags: body.tags.map(String) } : {}),
        ...(body.clientNoteId !== undefined ? { clientNoteId: body.clientNoteId } : {}),
        ...(body.vaultRoadmapId !== undefined ? { vaultRoadmapId: body.vaultRoadmapId } : {}),
        ...(Array.isArray(body.executionLogs) ? { executionLogs: body.executionLogs } : {}),
      },
      storeOverride
    );

    // Vault Roadmap Synchronization
    let vaultSync: VaultSyncResult = { synced: false, reason: "No clientNoteId attached" };
    if (updatedTask.clientNoteId) {
      vaultSync = await syncTaskWithVault(updatedTask, customVaultRoot);
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      vaultSync,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/agent-tasks
 * Removes task by id (from searchParams or body).
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    const body = await req.json().catch(() => null);

    if (!id && body && typeof body === "object" && body.id) {
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Task 'id' is required" }, { status: 400 });
    }

    const storeOverride = extractStoreOverride(url, body);
    const deleted = await deleteTask(id, storeOverride);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Task with id '${id}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
