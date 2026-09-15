# Analysis & Technical Specification: Tasks CRUD & Vault Roadmap Sync API

**Explorer M2_2**: Tasks CRUD & Vault Roadmap Sync API Specialist  
**Working Directory**: `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_2`  
**Target Route**: `agent-os-nipei/source/src/app/api/agent-tasks/route.ts`  
**Date**: 2026-09-04T23:52:00-03:00  

---

## 1. Executive Summary & Context

### 1.1 Objective
Design and specify the complete CRUD Next.js App Router API route (`agent-tasks/route.ts`) for Nipëi OS. This route provides the backend API for the interactive Kanban task board (`/agents-todo`), interfacing with:
1. **Local Persistent Task Store (`agentTaskStore`)**: Managing task states, assignments, priorities, tags, and execution logs in `~/.nipei-os/agent-tasks.json`.
2. **Obsidian Vault (`digitalalignment`)**: Providing two-way synchronization between Kanban task cards and brand `roadmap` frontmatter items in `Clientes/<Brand>.md` (and `Productos/<Brand>.md`), strictly adhering to `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`.

### 1.2 Key Architectural Requirements
- **`GET /api/agent-tasks`**: Retrieve all tasks with support for URL query parameters:
  - `id`: Retrieve a specific task by ID.
  - `status`: Filter by canonical status (`backlog`, `in_progress`, `review`, `done`).
  - `assignedAgent`: Filter by assigned agent CLI (`claude`, `openclaw`, `hermes`, `custom`).
  - `priority`: Filter by priority (`urgente`, `alta`, `media`, `baja`).
  - `clientNoteId`: Filter by associated Obsidian note (e.g. `nipeihu`).
  - `search`: Case-insensitive text search matching across `title`, `description`, and `tags`.
  - `sortBy`: Sort cards by `priority` (urgente > alta > media > baja), `createdAt` (newest first), or `updatedAt`.
  - `vaultRoot` / `stateDir`: Isolation overrides for test harness and multi-tenant environments.
- **`POST /api/agent-tasks`**: Create a new task:
  - Validates `title` (required, non-empty after trimming).
  - Validates and defaults `status` (`backlog`), `priority` (`media`), `assignedAgent` (`claude`).
  - Accepts `description`, `customBinaryPath`, `tags`, `clientNoteId`, and `vaultRoadmapId`.
  - If `clientNoteId` is provided, automatically establishes a two-way link by creating/updating a roadmap item in the target Obsidian note via `vaultSyncEngine.writeVaultNote`.
- **`PATCH /api/agent-tasks`**: Update task fields:
  - Accepts `{ id, ...patch }` (or `id` in searchParams).
  - Validates `id` exists in `agentTaskStore`, returning 404 if missing.
  - Validates any patched enum values (`status`, `priority`, `assignedAgent`).
  - **Vault Roadmap Synchronization**: When `clientNoteId` is present (either on the task or in the patch), automatically synchronizes status and metadata to the Obsidian note:
    - When `status === "done"`: set `hecho: true`, remove/strip `estado`, set `fecha_completado: YYYY-MM-DD`.
    - When `status !== "done"`: set `hecho: false`, map status to `estado` (`"in_progress"` -> `"en_curso"`, `"review"` -> `"bloqueada"`, `"backlog"` -> `"pendiente"`), strip `fecha_completado`.
    - Updates `prioridad: task.priority`, `responsable: "@" + task.assignedAgent`, and `texto: task.title`.
    - Preserves markdown body byte-for-byte, maintains `<!-- agente: antigravity -->` watermark, and strips secrets from `servicios`.
- **`DELETE /api/agent-tasks`**: Delete a task by `id` (from query string or body), returning confirmation `{ success: true, deleted: true, id }`.

---

## 2. Investigation of Existing Patterns

### 2.1 Next.js App Router API Patterns in `agent-os-nipei/source/src/app/api/`
1. **Route Segment Config**:
   - Both `vault/prefill/route.ts` and `vault/sync/route.ts` specify:
     ```typescript
     export const dynamic = "force-dynamic";
     export const runtime = "nodejs";
     ```
     This is critical in Next.js 16 to prevent static prerendering of API routes that read/write local filesystem state.
2. **Request Parsing**:
   - URL parsing uses standard `new URL(req.url).searchParams`.
   - Body parsing wraps `req.json()` in a `.catch(() => null)` to handle invalid JSON payloads without unhandled runtime exceptions.
3. **Response Schema**:
   - Standard response pattern: `{ success: boolean, ...data, error?: string }`.
   - Status codes:
     - `200 OK`: Successful reads, updates, and deletes.
     - `201 Created`: Successful creation of a new task.
     - `400 Bad Request`: Validation failures (e.g. missing title, invalid status enum).
     - `404 Not Found`: Task or vault note not found.
     - `500 Internal Server Error`: Unhandled errors with error message.

### 2.2 Vault Sync Engine & `da-vault-schema` Invariants
`src/lib/vaultSyncEngine.ts` exports:
- `readVaultNote(noteRelativePath: string, customRoot?: string): Promise<VaultNoteData | null>`
- `writeVaultNote(noteRelativePath: string, data: Partial<VaultNoteData>, customRoot?: string): Promise<{ success: boolean; error?: string; filePath?: string }>`
- `resolveVaultRoot(overrideRoot?: string): string`
- `withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T>`

#### The Strict `da-vault-schema` Invariants:
1. **The Golden Rule: Frontmatter vs Body**:
   - Command Center and Nipëi OS read the YAML frontmatter. The markdown body is preserved for human notes.
   - Any write to an Obsidian note MUST preserve the exact bytes of the body following the closing `---` delimiter.
   - The first line of the body must have the agent watermark: `<!-- agente: antigravity -->` (or `<!-- agente: claude-code -->`).
2. **The Canonical `hecho` Invariant**:
   - `hecho: true` is the canonical indicator of completion.
   - When `hecho: true`: **NEVER** keep an intermediate `estado` (like `en_curso`, `pendiente`, `bloqueada`). An item with `hecho: true` and `estado: en_curso` is considered contradictory and invalid by `npm run vault:check`.
   - When completing an item: `hecho: true`, delete `estado`, set `fecha_completado: YYYY-MM-DD`.
   - When reopening an item: `hecho: false`, set `estado: "en_curso" | "bloqueada" | "pendiente"`, delete `fecha_completado`.
3. **Security Invariant**:
   - Secrets (`password`, `token`, `secret`, `apiKey`) must NEVER be written to the vault frontmatter; only `credencial_ref`.
4. **Concurrency & Resilience**:
   - Writes are serialized with mutex file locks (`withFileLock`).
   - Temporary file writing (`.tmp`), `.bak` backup copy, and atomic rename with retry backoff and Windows `copyFile` fallback to survive antivirus and OS file-locking contention.

---

## 3. Data Models & Type Definitions

### 3.1 Nipëi OS Task Types
```typescript
export type TaskColumnStatus = "backlog" | "in_progress" | "review" | "done";
export type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
export type TaskPriority = "urgente" | "alta" | "media" | "baja";

export interface TaskExecutionLog {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error" | "output";
}

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskColumnStatus;
  priority: TaskPriority;
  assignedAgent: AgentCliType;
  customBinaryPath?: string;
  tags?: string[];
  clientNoteId?: string;       // e.g. "nipeihu", "digital-alignment"
  vaultRoadmapId?: string;     // e.g. "biografias-guardianes"
  executionLogs?: TaskExecutionLog[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Mapping Matrix: Nipëi OS Kanban <-> Obsidian Vault Roadmap
| Nipëi OS `AgentTask` Field | Target `VaultRoadmapItem` Field | Logic & Invariants |
|---|---|---|
| `status === "done"` | `hecho: true`<br>`estado: undefined`<br>`fecha_completado: YYYY-MM-DD` | `estado` is explicitly deleted; `fecha_completado` stamped with today's date. |
| `status === "in_progress"` | `hecho: false`<br>`estado: "en_curso"`<br>`fecha_completado: undefined` | Reopens task; sets `en_curso`; removes completion date. |
| `status === "review"` | `hecho: false`<br>`estado: "bloqueada"`<br>`fecha_completado: undefined` | Indicates pending review / external quality gate. |
| `status === "backlog"` | `hecho: false`<br>`estado: "pendiente"`<br>`fecha_completado: undefined` | Initial unstarted state. |
| `priority` | `prioridad` | Exact enum mapping: `"urgente" \| "alta" \| "media" \| "baja"`. |
| `assignedAgent` | `responsable` | Formatted as `@${task.assignedAgent}` (e.g. `@claude`, `@openclaw`). |
| `title` | `texto` | Verbatim text title. |
| `tags` | `tags` | Array of strings preserved. |
| `vaultRoadmapId` | `id` | Slug identifier in note. Defaults to `task.id.replace(/^task-/, "")`. |

---

## 4. Vault Roadmap Synchronization Engine (`syncTaskWithVault`)

### 4.1 Synchronization Algorithm
When a task is created or updated:
1. Check if `task.clientNoteId` is defined. If undefined, synchronization is skipped (`synced: false, reason: "No clientNoteId attached"`).
2. Acquire mutex lock on `sync-${task.clientNoteId}` to prevent concurrent race conditions when multiple tasks sync against the same brand note.
3. Read current vault note using `readVaultNote(task.clientNoteId, customVault)`.
   - If note does not exist, return `{ synced: false, reason: "Vault note not found" }`.
4. Locate roadmap item in `note.roadmap`:
   - Match by `item.id === (task.vaultRoadmapId || task.id.replace(/^task-/, ""))`.
5. If found:
   - Update `hecho`, `estado`, `fecha_completado`, `prioridad`, `responsable`, and optionally `texto`.
6. If NOT found:
   - Create new `VaultRoadmapItem`:
     - `id: roadmapId`
     - `texto: task.title`
     - `prioridad: task.priority`
     - `hecho: isDone`
     - `orden: note.roadmap.length`
     - `tags: task.tags || []`
     - `responsable: "@" + task.assignedAgent`
     - `fecha_creacion: today`
     - If done: `fecha_completado: today`
     - If not done: `estado: mappedEstado`
   - Append to `note.roadmap`.
7. Write back using `writeVaultNote(task.clientNoteId, { roadmap: updatedRoadmap }, customVault)`.
8. Return `{ synced: true, roadmapId, noteId: task.clientNoteId }`.

---

## 5. Complete Proposed Route Implementation

Below is the complete, drop-in TypeScript implementation for `agent-os-nipei/source/src/app/api/agent-tasks/route.ts`.

It includes:
- Seamless integration with `@/lib/agentTaskStore` (or self-contained fallback store adapter if store module is loading).
- Full GET / POST / PATCH / DELETE HTTP handlers.
- Robust parameter filtering, validation, and sorting.
- Production-grade vault roadmap two-way synchronization.
- Resilience against missing notes, empty strings, and concurrent updates.

```typescript
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  readVaultNote,
  writeVaultNote,
  withFileLock,
  VaultRoadmapItem,
} from "@/lib/vaultSyncEngine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- Types & Enums ---
export type TaskColumnStatus = "backlog" | "in_progress" | "review" | "done";
export type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
export type TaskPriority = "urgente" | "alta" | "media" | "baja";

export const VALID_TASK_STATUSES: TaskColumnStatus[] = ["backlog", "in_progress", "review", "done"];
export const VALID_AGENTS: AgentCliType[] = ["claude", "openclaw", "hermes", "custom"];
export const VALID_PRIORITIES: TaskPriority[] = ["urgente", "alta", "media", "baja"];

export interface TaskExecutionLog {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error" | "output";
}

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskColumnStatus;
  priority: TaskPriority;
  assignedAgent: AgentCliType;
  customBinaryPath?: string;
  tags?: string[];
  clientNoteId?: string;
  vaultRoadmapId?: string;
  executionLogs?: TaskExecutionLog[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: TaskColumnStatus;
  assignedAgent?: AgentCliType;
  priority?: TaskPriority;
  clientNoteId?: string;
  search?: string;
  sortBy?: "priority" | "createdAt" | "updatedAt";
}

export interface VaultSyncResult {
  synced: boolean;
  reason?: string;
  roadmapId?: string;
  noteId?: string;
  error?: string;
}

// --- Store Adapter (uses ~/.nipei-os/agent-tasks.json with mutex & atomic writes) ---
function resolveStorePath(customDir?: string): string {
  if (customDir) {
    return path.join(customDir, "agent-tasks.json");
  }
  const stateDir = process.env.AGENTIC_OS_STATE_DIR || path.join(os.homedir(), ".nipei-os");
  return path.join(stateDir, "agent-tasks.json");
}

async function loadTasksFromDisk(storePath: string): Promise<AgentTask[]> {
  if (!fs.existsSync(storePath)) {
    return [];
  }
  try {
    const raw = await fs.promises.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveTasksToDisk(storePath: string, tasks: AgentTask[]): Promise<void> {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  const tmpPath = `${storePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  const bakPath = `${storePath}.bak`;
  const json = JSON.stringify(tasks, null, 2);

  await fs.promises.writeFile(tmpPath, json, "utf8");
  if (fs.existsSync(storePath)) {
    try {
      await fs.promises.copyFile(storePath, bakPath);
    } catch {
      // Non-fatal backup copy
    }
  }

  try {
    await fs.promises.rename(tmpPath, storePath);
  } catch {
    // Windows file-lock fallback
    await fs.promises.copyFile(tmpPath, storePath);
    await fs.promises.unlink(tmpPath).catch(() => {});
  }
}

// --- Vault Roadmap Synchronizer ---
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

// --- HTTP Handlers ---

/**
 * GET /api/agent-tasks
 * Retrieves filtered list of tasks or a single task by ?id=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status") as TaskColumnStatus | null;
    const assignedAgent = searchParams.get("assignedAgent") as AgentCliType | null;
    const priority = searchParams.get("priority") as TaskPriority | null;
    const clientNoteId = searchParams.get("clientNoteId");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") as "priority" | "createdAt" | "updatedAt" | null;
    const stateDir = searchParams.get("stateDir") || undefined;

    const storePath = resolveStorePath(stateDir);
    const tasks = await loadTasksFromDisk(storePath);

    // Single task retrieval
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (!task) {
        return NextResponse.json(
          { success: false, error: `Task with id '${id}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, task });
    }

    let filtered = [...tasks];

    // Status filter
    if (status && VALID_TASK_STATUSES.includes(status)) {
      filtered = filtered.filter((t) => t.status === status);
    }

    // Assigned agent filter
    if (assignedAgent && VALID_AGENTS.includes(assignedAgent)) {
      filtered = filtered.filter((t) => t.assignedAgent === assignedAgent);
    }

    // Priority filter
    if (priority && VALID_PRIORITIES.includes(priority)) {
      filtered = filtered.filter((t) => t.priority === priority);
    }

    // Client note filter
    if (clientNoteId) {
      filtered = filtered.filter((t) => t.clientNoteId?.toLowerCase() === clientNoteId.toLowerCase());
    }

    // Text search filter (title, description, tags)
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    // Sorting
    if (sortBy === "priority") {
      const priorityWeight: Record<TaskPriority, number> = {
        urgente: 4,
        alta: 3,
        media: 2,
        baja: 1,
      };
      filtered.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
    } else if (sortBy === "createdAt") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "updatedAt") {
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      tasks: filtered,
      agentTasks: filtered, // Alias for frontend compatibility
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

    const { searchParams } = new URL(req.url);
    const customVaultRoot = searchParams.get("vaultRoot") || body.vaultRoot;
    const customStateDir = searchParams.get("stateDir") || body.stateDir;

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

    const storePath = resolveStorePath(customStateDir);
    const now = new Date().toISOString();
    const id = body.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newTask: AgentTask = {
      id,
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description : "",
      status,
      priority,
      assignedAgent,
      customBinaryPath: body.customBinaryPath,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      clientNoteId: body.clientNoteId,
      vaultRoadmapId: body.vaultRoadmapId,
      executionLogs: Array.isArray(body.executionLogs) ? body.executionLogs : [],
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    // Save to task store with file lock
    await withFileLock(storePath, async () => {
      const tasks = await loadTasksFromDisk(storePath);
      tasks.push(newTask);
      await saveTasksToDisk(storePath, tasks);
    });

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

    const { searchParams } = new URL(req.url);
    const id = body.id || searchParams.get("id");
    const customVaultRoot = searchParams.get("vaultRoot") || body.vaultRoot;
    const customStateDir = searchParams.get("stateDir") || body.stateDir;

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

    const storePath = resolveStorePath(customStateDir);
    let updatedTask: AgentTask | null = null;

    // Mutex write to store
    await withFileLock(storePath, async () => {
      const tasks = await loadTasksFromDisk(storePath);
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return;
      }

      const existing = tasks[index];
      const now = new Date().toISOString();

      const merged: AgentTask = {
        ...existing,
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
        updatedAt: now,
      };

      tasks[index] = merged;
      await saveTasksToDisk(storePath, tasks);
      updatedTask = merged;
    });

    if (!updatedTask) {
      return NextResponse.json(
        { success: false, error: `Task with id '${id}' not found` },
        { status: 404 }
      );
    }

    // Vault Roadmap Synchronization
    let vaultSync: VaultSyncResult = { synced: false, reason: "No clientNoteId attached" };
    if ((updatedTask as AgentTask).clientNoteId) {
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
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    const customStateDir = searchParams.get("stateDir") || undefined;

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === "object" && body.id) {
        id = body.id;
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "Task 'id' is required" }, { status: 400 });
    }

    const storePath = resolveStorePath(customStateDir);
    let deleted = false;

    await withFileLock(storePath, async () => {
      const tasks = await loadTasksFromDisk(storePath);
      const filtered = tasks.filter((t) => t.id !== id);
      if (filtered.length !== tasks.length) {
        deleted = true;
        await saveTasksToDisk(storePath, filtered);
      }
    });

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
```

---

## 6. Verification and Acceptance Matrix

| Verification Test | Expected Output | Method |
|---|---|---|
| **GET without filters** | Returns `{ success: true, count: N, tasks: [...] }` with 200 OK | `curl http://localhost:3000/api/agent-tasks` |
| **GET with filters** | Filters correctly by status, agent, priority, and text search | `curl http://localhost:3000/api/agent-tasks?status=in_progress&assignedAgent=claude` |
| **POST invalid title** | Returns 400 Bad Request with `{ success: false, error: "Task title is required" }` | `curl -X POST http://localhost:3000/api/agent-tasks -d '{"title": ""}'` |
| **POST valid task** | Returns 201 Created with `{ success: true, task: {...} }` | `curl -X POST http://localhost:3000/api/agent-tasks -d '{"title": "Valid Task"}'` |
| **PATCH status to "done"** | Updates task and sets `hecho: true`, strips `estado`, and sets `fecha_completado: YYYY-MM-DD` in target Obsidian note | `curl -X PATCH http://localhost:3000/api/agent-tasks -d '{"id": "...", "status": "done"}'` |
| **PATCH status to "in_progress"** | Sets `hecho: false`, sets `estado: "en_curso"`, and strips `fecha_completado` | `curl -X PATCH http://localhost:3000/api/agent-tasks -d '{"id": "...", "status": "in_progress"}'` |
| **DELETE existing task** | Returns 200 OK with `{ success: true, deleted: true, id }` | `curl -X DELETE http://localhost:3000/api/agent-tasks?id=...` |
| **DELETE non-existing task** | Returns 404 Not Found with `{ success: false, error: "Task with id ... not found" }` | `curl -X DELETE http://localhost:3000/api/agent-tasks?id=nonexistent` |
| **TypeScript Compilation** | `npm run build` cleanly compiles without any type errors | `cd agent-os-nipei/source && npm run build` |
| **Vault Schema Audit** | Modifying tasks leaves vault note passing all `npm run vault:check` checks | `cd command-center && npm run vault:check` |

---

## 7. Inter-Agent Recommendations & Dependencies

1. **For Worker M2_2 (Implementation)**:
   - Create `agent-os-nipei/source/src/app/api/agent-tasks/route.ts` using the proposed code in Section 5.
   - If Explorer/Worker M2_1 establishes `@/lib/agentTaskStore`, the store helpers can seamlessly delegate to `agentTaskStore.createTask(...)`, etc., while retaining `syncTaskWithVault`.
2. **For Explorer M2_3 (Agent CLI Execution Hook)**:
   - The execution route `POST /api/agent-tasks/execute` can directly invoke `PATCH /api/agent-tasks` or update via `agentTaskStore`, appending `executionLogs` and setting status to `review` or `done`.
3. **For Milestone 3 (Frontend Kanban Board `/agents-todo`)**:
   - The React frontend should call `GET /api/agent-tasks` to hydrate the Kanban columns.
   - Moving cards across columns triggers `PATCH /api/agent-tasks` with `{ id, status: newStatus }`, providing instant optimistic UI updates and live Obsidian vault persistence.
