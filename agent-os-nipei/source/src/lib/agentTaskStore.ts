/**
 * Nipëi OS — Production Agent Task Store
 * Manages local persistent task state (~/.nipei-os/agent-tasks.json) with:
 * - Mutex-protected file operations
 * - Windows-hardened atomic file replacement
 * - Transient lock exponential backoff with jitter
 * - Rich filtering, sorting, validation, and log streaming
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ==========================================
// 1. Interfaces & Type Definitions
// ==========================================

export type TaskColumnStatus = "backlog" | "in_progress" | "review" | "done";
export type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
export type TaskPriority = "urgente" | "alta" | "media" | "baja";
export type ExecutionLogLevel = "info" | "warn" | "error" | "output";

export const VALID_TASK_STATUSES: readonly TaskColumnStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
] as const;

export const VALID_AGENTS: readonly AgentCliType[] = [
  "claude",
  "openclaw",
  "hermes",
  "custom",
] as const;

export const VALID_PRIORITIES: readonly TaskPriority[] = [
  "urgente",
  "alta",
  "media",
  "baja",
] as const;

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgente: 4,
  alta: 3,
  media: 2,
  baja: 1,
};

export interface ExecutionLogEntry {
  timestamp: string;
  message: string;
  level: ExecutionLogLevel;
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
  executionLogs?: ExecutionLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  id?: string;
  title: string;
  description?: string;
  status?: TaskColumnStatus;
  priority?: TaskPriority;
  assignedAgent?: AgentCliType;
  customBinaryPath?: string;
  tags?: string[];
  clientNoteId?: string;
  vaultRoadmapId?: string;
  executionLogs?: ExecutionLogEntry[];
  createdAt?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskColumnStatus;
  priority?: TaskPriority;
  assignedAgent?: AgentCliType;
  customBinaryPath?: string;
  tags?: string[];
  clientNoteId?: string;
  vaultRoadmapId?: string;
  executionLogs?: ExecutionLogEntry[];
}

export interface TaskFilters {
  status?: TaskColumnStatus;
  assignedAgent?: AgentCliType;
  priority?: TaskPriority;
  clientNoteId?: string;
  search?: string;
  sortBy?: "priority" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

// ==========================================
// 2. Concurrency, Mutex & Atomic File System
// ==========================================

const fileLocks = new Map<string, Promise<unknown>>();

export function getLockKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = getLockKey(filePath);
  const current = fileLocks.get(key) || Promise.resolve();
  const next = current.then(fn, fn);
  fileLocks.set(key, next as Promise<unknown>);
  next.then(
    () => {
      if (fileLocks.get(key) === next) {
        fileLocks.delete(key);
      }
    },
    () => {
      if (fileLocks.get(key) === next) {
        fileLocks.delete(key);
      }
    }
  );
  return next;
}

export function isTransientFsError(code?: string): boolean {
  if (!code) return false;
  return (
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "EACCES" ||
    code === "ENOENT" ||
    code === "EMFILE" ||
    code === "ENFILE"
  );
}

export function calculateBackoffWithJitter(
  attempt: number,
  initialDelayMs = 25,
  maxDelayMs = 200
): number {
  const base = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.max(10, Math.floor(base * jitter));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function readFileWithRetry(filePath: string, maxRetries = 6): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fs.promises.readFile(filePath, "utf8");
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export async function atomicReplaceWithRetry(
  tmpPath: string,
  targetPath: string,
  maxRetries = 6
): Promise<void> {
  let lastErr: unknown = null;

  // Tier 1: Try atomic rename with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.rename(tmpPath, targetPath);
      return;
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        break;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  // Tier 2: Windows fallback — copyFile with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.copyFile(tmpPath, targetPath);
      return;
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  throw lastErr;
}

// ==========================================
// 3. Path Resolution & Directory Management
// ==========================================

export function resolveTaskStorePath(overridePath?: string): string {
  if (overridePath && overridePath.trim()) {
    const trimmed = overridePath.trim();
    if (trimmed.endsWith(".json")) {
      return path.resolve(trimmed);
    }
    return path.join(path.resolve(trimmed), "agent-tasks.json");
  }
  const envFile = process.env.NIPEI_TASKS_FILE?.trim();
  if (envFile) {
    return path.resolve(envFile);
  }
  const envStateDir = process.env.NIPEI_STATE_DIR?.trim() || process.env.AGENTIC_OS_STATE_DIR?.trim();
  if (envStateDir) {
    return path.join(path.resolve(envStateDir), "agent-tasks.json");
  }
  return path.join(os.homedir(), ".nipei-os", "agent-tasks.json");
}

export async function ensureTaskStoreDir(filePath: string): Promise<string> {
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  return dir;
}

// ==========================================
// 4. Low-Level Store Reader and Writer
// ==========================================

async function readRawTasks(storePath: string): Promise<AgentTask[]> {
  if (!fs.existsSync(storePath)) {
    return [];
  }
  try {
    const raw = await readFileWithRetry(storePath);
    if (!raw.trim()) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") {
      return [];
    }
    return [];
  }
}

async function writeRawTasks(storePath: string, tasks: AgentTask[]): Promise<void> {
  await ensureTaskStoreDir(storePath);
  const tmpPath = `${storePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  const bakPath = `${storePath}.bak`;
  const jsonContent = JSON.stringify(tasks, null, 2);

  await fs.promises.writeFile(tmpPath, jsonContent, "utf8");

  if (fs.existsSync(storePath)) {
    try {
      await fs.promises.copyFile(storePath, bakPath);
    } catch {
      // Backup creation is best-effort
    }
  }

  try {
    await atomicReplaceWithRetry(tmpPath, storePath);
  } finally {
    if (fs.existsSync(tmpPath)) {
      try {
        await fs.promises.unlink(tmpPath);
      } catch {
        // Cleanup best effort
      }
    }
  }
}

// ==========================================
// 5. Validation Helpers
// ==========================================

function validateTitle(title: unknown): string {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("Task title is required");
  }
  return title.trim();
}

function validateStatus(status: unknown): TaskColumnStatus {
  if (typeof status !== "string" || !VALID_TASK_STATUSES.includes(status as TaskColumnStatus)) {
    throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_TASK_STATUSES.join(", ")}`);
  }
  return status as TaskColumnStatus;
}

function validatePriority(priority: unknown): TaskPriority {
  if (typeof priority !== "string" || !VALID_PRIORITIES.includes(priority as TaskPriority)) {
    throw new Error(`Invalid priority '${priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
  }
  return priority as TaskPriority;
}

function validateAgent(agent: unknown): AgentCliType {
  if (typeof agent !== "string" || !VALID_AGENTS.includes(agent as AgentCliType)) {
    throw new Error(`Invalid assignedAgent '${agent}'. Must be one of: ${VALID_AGENTS.join(", ")}`);
  }
  return agent as AgentCliType;
}

// ==========================================
// 6. Public Store Operations
// ==========================================

/**
 * Retrieves tasks matching optional filters and sorting options.
 */
export async function getTasks(
  filters: TaskFilters = {},
  overridePath?: string
): Promise<AgentTask[]> {
  const storePath = resolveTaskStorePath(overridePath);
  const tasks = await readRawTasks(storePath);

  let filtered = [...tasks];

  if (filters.status) {
    filtered = filtered.filter((t) => t.status === filters.status);
  }
  if (filters.assignedAgent) {
    filtered = filtered.filter((t) => t.assignedAgent === filters.assignedAgent);
  }
  if (filters.priority) {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }
  if (filters.clientNoteId) {
    filtered = filtered.filter(
      (t) => t.clientNoteId?.toLowerCase() === filters.clientNoteId?.toLowerCase()
    );
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  }

  // Sorting
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
  if (filters.sortBy === "priority") {
    filtered.sort(
      (a, b) =>
        ((PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0)) * (sortOrder === 1 ? -1 : 1)
    );
  } else if (filters.sortBy === "createdAt") {
    filtered.sort(
      (a, b) =>
        (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (sortOrder === 1 ? -1 : 1)
    );
  } else if (filters.sortBy === "updatedAt") {
    filtered.sort(
      (a, b) =>
        (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * (sortOrder === 1 ? -1 : 1)
    );
  }

  return filtered;
}

/**
 * Retrieves a single task by ID.
 */
export async function getTaskById(id: string, overridePath?: string): Promise<AgentTask | null> {
  const storePath = resolveTaskStorePath(overridePath);
  const tasks = await readRawTasks(storePath);
  return tasks.find((t) => t.id === id) || null;
}

/**
 * Alias for getTaskById for test engine compatibility.
 */
export async function getTask(id: string, overridePath?: string): Promise<AgentTask | null> {
  return getTaskById(id, overridePath);
}

/**
 * Creates a new task with validation and atomic persistence.
 */
export async function createTask(
  data: CreateTaskInput,
  overridePath?: string
): Promise<AgentTask> {
  const title = validateTitle(data.title);
  const status = data.status ? validateStatus(data.status) : "backlog";
  const priority = data.priority ? validatePriority(data.priority) : "media";
  const assignedAgent = data.assignedAgent ? validateAgent(data.assignedAgent) : "claude";

  const storePath = resolveTaskStorePath(overridePath);

  return withFileLock(storePath, async () => {
    const tasks = await readRawTasks(storePath);
    const now = new Date().toISOString();
    const id = data.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newTask: AgentTask = {
      id,
      title,
      description: data.description || "",
      status,
      priority,
      assignedAgent,
      customBinaryPath: data.customBinaryPath,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      clientNoteId: data.clientNoteId,
      vaultRoadmapId: data.vaultRoadmapId,
      executionLogs: Array.isArray(data.executionLogs) ? data.executionLogs : [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    tasks.push(newTask);
    await writeRawTasks(storePath, tasks);
    return newTask;
  });
}

/**
 * Updates an existing task with partial patches.
 */
export async function updateTask(
  id: string,
  patch: UpdateTaskInput,
  overridePath?: string
): Promise<AgentTask> {
  const storePath = resolveTaskStorePath(overridePath);

  return withFileLock(storePath, async () => {
    const tasks = await readRawTasks(storePath);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task with id '${id}' not found`);
    }

    if (patch.title !== undefined) {
      validateTitle(patch.title);
    }
    if (patch.status !== undefined) {
      validateStatus(patch.status);
    }
    if (patch.priority !== undefined) {
      validatePriority(patch.priority);
    }
    if (patch.assignedAgent !== undefined) {
      validateAgent(patch.assignedAgent);
    }

    const updatedTask: AgentTask = {
      ...tasks[index],
      ...patch,
      title: patch.title !== undefined ? patch.title.trim() : tasks[index].title,
      tags: Array.isArray(patch.tags) ? patch.tags.map(String) : tasks[index].tags,
      executionLogs: Array.isArray(patch.executionLogs) ? patch.executionLogs : tasks[index].executionLogs,
      updatedAt: new Date().toISOString(),
    };

    tasks[index] = updatedTask;
    await writeRawTasks(storePath, tasks);
    return updatedTask;
  });
}

/**
 * Deletes a task by ID.
 */
export async function deleteTask(id: string, overridePath?: string): Promise<boolean> {
  const storePath = resolveTaskStorePath(overridePath);

  return withFileLock(storePath, async () => {
    const tasks = await readRawTasks(storePath);
    const filtered = tasks.filter((t) => t.id !== id);
    const deleted = tasks.length !== filtered.length;

    if (deleted) {
      await writeRawTasks(storePath, filtered);
    }
    return deleted;
  });
}

/**
 * Appends a structured log entry to the task's execution history.
 */
export async function appendLog(
  id: string,
  logEntry: { timestamp?: string; message: string; level?: ExecutionLogLevel },
  overridePath?: string
): Promise<AgentTask> {
  const storePath = resolveTaskStorePath(overridePath);

  return withFileLock(storePath, async () => {
    const tasks = await readRawTasks(storePath);
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`Task '${id}' not found`);
    }

    const entry: ExecutionLogEntry = {
      timestamp: logEntry.timestamp || new Date().toISOString(),
      message: logEntry.message || "",
      level: logEntry.level || "info",
    };

    if (!task.executionLogs) {
      task.executionLogs = [];
    }
    task.executionLogs.push(entry);
    task.updatedAt = new Date().toISOString();

    await writeRawTasks(storePath, tasks);
    return task;
  });
}

/**
 * Moves a task to a different Kanban status column.
 */
export async function moveTaskStatus(
  id: string,
  newStatus: TaskColumnStatus,
  overridePath?: string
): Promise<AgentTask> {
  return updateTask(id, { status: newStatus }, overridePath);
}

// ==========================================
// 7. Store Factory for E2E & Multi-Tenant
// ==========================================

export interface TaskStoreInstance {
  getStorePath(): string;
  getTasks(filters?: TaskFilters): Promise<AgentTask[]>;
  listTasks(filters?: TaskFilters): Promise<AgentTask[]>;
  getTask(id: string): Promise<AgentTask | null>;
  getTaskById(id: string): Promise<AgentTask | null>;
  createTask(data: CreateTaskInput): Promise<AgentTask>;
  updateTask(id: string, patch: UpdateTaskInput): Promise<AgentTask>;
  deleteTask(id: string): Promise<boolean>;
  appendLog(id: string, logEntry: { timestamp?: string; message: string; level?: ExecutionLogLevel }): Promise<AgentTask>;
  moveTaskStatus(id: string, newStatus: TaskColumnStatus): Promise<AgentTask>;
}

/**
 * Factory creating an isolated task store instance rooted in a specific state directory.
 * Fully compatible with tests/e2e/engine.mjs test harness.
 */
export function createTaskStore(stateDirOrFilePath?: string): TaskStoreInstance {
  const targetFile = resolveTaskStorePath(stateDirOrFilePath);

  return {
    getStorePath() {
      return targetFile;
    },
    getTasks(filters) {
      return getTasks(filters, targetFile);
    },
    listTasks(filters) {
      return getTasks(filters, targetFile);
    },
    getTask(id) {
      return getTaskById(id, targetFile);
    },
    getTaskById(id) {
      return getTaskById(id, targetFile);
    },
    createTask(data) {
      return createTask(data, targetFile);
    },
    updateTask(id, patch) {
      return updateTask(id, patch, targetFile);
    },
    deleteTask(id) {
      return deleteTask(id, targetFile);
    },
    appendLog(id, log) {
      return appendLog(id, log, targetFile);
    },
    moveTaskStatus(id, newStatus) {
      return moveTaskStatus(id, newStatus, targetFile);
    },
  };
}
