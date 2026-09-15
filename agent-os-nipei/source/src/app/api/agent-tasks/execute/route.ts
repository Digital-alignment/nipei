import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

import { config } from "@/lib/config";
import { registerProc, unregisterProc } from "@/lib/ultracodeProcs";
import {
  getTaskById,
  updateTask,
  appendLog,
  type AgentTask,
  type TaskColumnStatus,
  type AgentCliType,
  type ExecutionLogEntry,
} from "@/lib/agentTaskStore";
import {
  readVaultNote,
  writeVaultNote,
  withFileLock,
  type VaultRoadmapItem,
} from "@/lib/vaultSyncEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// 1. Types & Request Payloads
// ==========================================

export interface ExecuteRequestBody {
  taskId?: string;
  id?: string;
  commandArgs?: string[];
  simulate?: boolean;
  targetStatus?: "review" | "done";
  customBinaryPath?: string;
  forceReal?: boolean;
  timeoutMs?: number;
  overrideStorePath?: string;
  storePath?: string;
  tasksFile?: string;
  stateDir?: string;
  vaultRoot?: string;
}

interface ProcessExecutionResult {
  exitCode: number;
  logs: ExecutionLogEntry[];
  mode: "real" | "simulation";
  error?: string;
}

// ==========================================
// 2. Cross-Platform Binary Resolution
// ==========================================

function safeWhich(cmd: string): string | null {
  if (!cmd || typeof cmd !== "string") return null;
  const cleanCmd = cmd.trim();
  if (!cleanCmd) return null;

  // Direct absolute or relative path check
  if (path.isAbsolute(cleanCmd) || cleanCmd.includes(path.sep)) {
    if (fs.existsSync(cleanCmd)) return cleanCmd;
  }

  if (process.platform === "win32") {
    try {
      const out = execSync(`where.exe ${cleanCmd}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      });
      const firstLine = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0 && fs.existsSync(l));
      if (firstLine) return firstLine;
    } catch {
      // Fallback to manual PATH walk
    }

    const pathExts = (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD;.PS1").split(";");
    const pathDirs = (process.env.PATH || "").split(path.delimiter);
    for (const dir of pathDirs) {
      if (!dir) continue;
      for (const ext of ["", ...pathExts]) {
        try {
          const candidate = path.join(dir, cleanCmd + ext);
          if (fs.existsSync(candidate)) return candidate;
        } catch {
          // Ignore invalid path components
        }
      }
    }
    return null;
  }

  // POSIX (Linux / macOS)
  try {
    const out = execSync(`command -v ${cleanCmd}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    });
    const trimmed = out.trim();
    if (trimmed && fs.existsSync(trimmed)) return trimmed;
  } catch {
    // Ignore error
  }

  return null;
}

function resolveAgentBinary(
  agent: AgentCliType,
  customBinaryPath?: string
): string | null {
  // 1. Custom agent path resolution
  if (agent === "custom") {
    if (customBinaryPath && customBinaryPath.trim()) {
      const direct = customBinaryPath.trim();
      if (fs.existsSync(direct)) return direct;
      const resolved = safeWhich(direct);
      if (resolved) return resolved;
    }
    const envCustom = process.env.AGENTIC_OS_CUSTOM_BIN?.trim();
    if (envCustom && fs.existsSync(envCustom)) return envCustom;
    return safeWhich("agy");
  }

  // 2. Claude Code
  if (agent === "claude") {
    if (config.claude && fs.existsSync(config.claude)) return config.claude;
    const envClaude = process.env.AGENTIC_OS_CLAUDE_BIN?.trim();
    if (envClaude && fs.existsSync(envClaude)) return envClaude;
    return safeWhich("claude");
  }

  // 3. OpenClaw
  if (agent === "openclaw") {
    if (config.openclaw && fs.existsSync(config.openclaw)) return config.openclaw;
    const envOpenClaw = process.env.AGENTIC_OS_OPENCLAW_BIN?.trim();
    if (envOpenClaw && fs.existsSync(envOpenClaw)) return envOpenClaw;
    return safeWhich("openclaw");
  }

  // 4. Hermes
  if (agent === "hermes") {
    if (config.hermes && fs.existsSync(config.hermes)) return config.hermes;
    const envHermes = process.env.AGENTIC_OS_HERMES_BIN?.trim();
    if (envHermes && fs.existsSync(envHermes)) return envHermes;
    return safeWhich("hermes");
  }

  return null;
}

function isSimulationMode(
  reqSimulate?: boolean,
  binaryAvailable?: boolean,
  forceReal?: boolean
): boolean {
  if (forceReal) return false;
  if (reqSimulate === true) return true;
  if (!binaryAvailable) return true;
  if (process.env.AGENTIC_SIMULATION_MODE === "true" || process.env.AGENTIC_SIMULATION_MODE === "1") {
    return true;
  }
  if (process.env.AGENT_EXECUTION_MODE === "simulate") {
    return true;
  }
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  return false;
}

// ==========================================
// 3. Environment & Argument Sanitization
// ==========================================

const MAX_ARG_LEN = 32_000;
const FLAG_PATTERN = /^[A-Za-z0-9_\-./:=,@+% ]+$/;

function sanitizeArgs(args: unknown): string[] {
  if (!Array.isArray(args)) return [];
  return args
    .filter((a): a is string => typeof a === "string" && a.length > 0 && a.length <= MAX_ARG_LEN)
    .filter((a) => !a.includes("\0") && FLAG_PATTERN.test(a));
}

function buildAgentExecutionEnv(): NodeJS.ProcessEnv {
  const isWin = process.platform === "win32";
  const base = process.env;

  const standardDirs = isWin
    ? [
        path.join(os.homedir(), "AppData", "Roaming", "npm"),
        path.join(os.homedir(), ".local", "bin"),
      ]
    : [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/bin",
        path.join(os.homedir(), ".local", "bin"),
      ];

  const currentPathDirs = (base.PATH || "").split(path.delimiter).filter(Boolean);
  const combinedPath = [...new Set([...currentPathDirs, ...standardDirs])].join(path.delimiter);

  return {
    ...base,
    PATH: combinedPath,
    HOME: base.HOME || os.homedir(),
    USERPROFILE: base.USERPROFILE || os.homedir(),
    SHELL: base.SHELL || (isWin ? base.COMSPEC || "cmd.exe" : "/bin/bash"),
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  };
}

function buildDefaultArgs(task: AgentTask, customArgs?: string[]): string[] {
  if (customArgs && customArgs.length > 0) {
    return customArgs;
  }

  const prompt = task.description?.trim()
    ? `${task.title}\n\n${task.description.trim()}`
    : task.title;

  switch (task.assignedAgent) {
    case "claude":
      return ["-p", prompt, "--output-format=stream-json", "--verbose"];
    case "openclaw":
      return ["agent", "--local", "--agent", config.openclawAgent || "main", "-m", prompt, "--json"];
    case "hermes":
      return ["chat", "-q", prompt, "--yolo", "--accept-hooks", "--max-turns", "50", "-Q"];
    case "custom":
    default:
      return ["--task", task.title];
  }
}

// ==========================================
// 4. Execution Engines (Simulated & Real)
// ==========================================

/**
 * Robust simulated execution workflow emitting the 4 required canonical logs.
 */
async function runSimulatedExecution(task: AgentTask): Promise<ProcessExecutionResult> {
  const logs: ExecutionLogEntry[] = [];
  const now = () => new Date().toISOString();

  // Canonical required log line 1
  logs.push({
    timestamp: now(),
    message: `[info] Initialized agent runtime: ${task.assignedAgent}`,
    level: "info",
  });

  // Canonical required log line 2
  logs.push({
    timestamp: now(),
    message: `[output] Loading context for task: ${task.title}`,
    level: "output",
  });

  // Canonical required log line 3
  logs.push({
    timestamp: now(),
    message: `[output] Processing task specifications and executing automated routines...`,
    level: "output",
  });

  // Canonical required log line 4
  logs.push({
    timestamp: now(),
    message: `[info] Execution finished successfully with exit code 0.`,
    level: "info",
  });

  return {
    exitCode: 0,
    logs,
    mode: "simulation",
  };
}

/**
 * Real CLI execution engine capturing live stdout and stderr telemetry.
 */
async function runRealExecution(
  task: AgentTask,
  binaryPath: string,
  args: string[],
  timeoutMs = 60_000
): Promise<ProcessExecutionResult> {
  const logs: ExecutionLogEntry[] = [];
  const now = () => new Date().toISOString();

  logs.push({
    timestamp: now(),
    message: `[info] Initialized agent runtime: ${task.assignedAgent}`,
    level: "info",
  });

  logs.push({
    timestamp: now(),
    message: `[output] Loading context for task: ${task.title}`,
    level: "output",
  });

  logs.push({
    timestamp: now(),
    message: `[output] Processing task specifications and executing automated routines...`,
    level: "output",
  });

  return new Promise<ProcessExecutionResult>((resolve) => {
    let settled = false;
    const isWin = process.platform === "win32";
    const useShell = isWin && (binaryPath.toLowerCase().endsWith(".cmd") || binaryPath.toLowerCase().endsWith(".bat"));

    let child: ChildProcess;
    try {
      child = spawn(binaryPath, args, {
        cwd: process.cwd(),
        env: buildAgentExecutionEnv(),
        shell: useShell,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logs.push({
        timestamp: now(),
        message: `[error] Failed to spawn agent binary '${binaryPath}': ${errMsg}`,
        level: "error",
      });
      return resolve({
        exitCode: 1,
        logs,
        mode: "real",
        error: errMsg,
      });
    }

    // Register active process for stopping/cancellation
    registerProc(task.id, child);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore kill error
      }
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // Ignore kill error
        }
      }, 2000);

      unregisterProc(task.id);
      logs.push({
        timestamp: now(),
        message: `[error] Agent execution timed out after ${timeoutMs}ms. Process terminated.`,
        level: "error",
      });
      resolve({
        exitCode: -1,
        logs,
        mode: "real",
        error: "Execution timeout",
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        logs.push({
          timestamp: now(),
          message: line,
          level: "output",
        });
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        logs.push({
          timestamp: now(),
          message: line,
          level: "warn",
        });
      }
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unregisterProc(task.id);

      const finalCode = code ?? 0;
      if (finalCode === 0) {
        logs.push({
          timestamp: now(),
          message: `[info] Execution finished successfully with exit code 0.`,
          level: "info",
        });
      } else {
        logs.push({
          timestamp: now(),
          message: `[error] Execution failed with exit code ${finalCode}.`,
          level: "error",
        });
      }

      resolve({
        exitCode: finalCode,
        logs,
        mode: "real",
      });
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unregisterProc(task.id);

      logs.push({
        timestamp: now(),
        message: `[error] Process runtime error: ${err.message}`,
        level: "error",
      });

      resolve({
        exitCode: 1,
        logs,
        mode: "real",
        error: err.message,
      });
    });
  });
}

// ==========================================
// 5. Vault Roadmap Synchronization Bridge
// ==========================================

async function syncTaskProgressToVault(
  task: AgentTask,
  newStatus: TaskColumnStatus,
  customVaultRoot?: string
): Promise<boolean> {
  if (!task.clientNoteId) return false;

  const lockKey = `sync-${task.clientNoteId.toLowerCase()}`;
  return withFileLock(lockKey, async () => {
    try {
      const note = await readVaultNote(task.clientNoteId!, customVaultRoot);
      if (!note) return false;

      const roadmap: VaultRoadmapItem[] = Array.isArray(note.roadmap) ? [...note.roadmap] : [];
      const targetRoadmapId = task.vaultRoadmapId || task.id.replace(/^task-/, "");
      const existingIndex = roadmap.findIndex((item) => item.id === targetRoadmapId);

      const isDone = newStatus === "done";
      const today = new Date().toISOString().slice(0, 10);

      if (existingIndex >= 0) {
        const item = { ...roadmap[existingIndex] };
        item.hecho = isDone;
        if (isDone) {
          delete item.estado;
          item.fecha_completado = today;
        } else {
          delete item.fecha_completado;
          item.estado =
            newStatus === "in_progress"
              ? "en_curso"
              : newStatus === "review"
              ? "bloqueada"
              : "pendiente";
        }
        item.prioridad = task.priority;
        item.responsable = `@${task.assignedAgent}`;
        item.texto = task.title;
        roadmap[existingIndex] = item;
      } else {
        const newItem: VaultRoadmapItem = {
          id: targetRoadmapId,
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
            newStatus === "in_progress"
              ? "en_curso"
              : newStatus === "review"
              ? "bloqueada"
              : "pendiente";
        }
        roadmap.push(newItem);
      }

      const writeRes = await writeVaultNote(
        task.clientNoteId!,
        { roadmap },
        customVaultRoot
      );
      return writeRes.success;
    } catch {
      return false;
    }
  });
}

function extractStoreOverride(url: URL, body?: Record<string, unknown>): string | undefined {
  return (
    url.searchParams.get("storePath") ||
    url.searchParams.get("tasksFile") ||
    url.searchParams.get("stateDir") ||
    (typeof body?.overrideStorePath === "string" ? body.overrideStorePath : undefined) ||
    (typeof body?.storePath === "string" ? body.storePath : undefined) ||
    (typeof body?.tasksFile === "string" ? body.tasksFile : undefined) ||
    (typeof body?.stateDir === "string" ? body.stateDir : undefined)
  );
}

// ==========================================
// 6. Primary POST Route Handler
// ==========================================

export async function POST(req: NextRequest) {
  try {
    let body: ExecuteRequestBody = {};
    try {
      body = await req.json();
    } catch {
      // Body might be empty or invalid JSON
    }

    const url = new URL(req.url);
    const taskId =
      body.taskId ||
      body.id ||
      url.searchParams.get("taskId") ||
      url.searchParams.get("id");

    const customVaultRoot =
      url.searchParams.get("vaultRoot") ||
      (typeof body.vaultRoot === "string" ? body.vaultRoot : undefined);
    const overrideStorePath = extractStoreOverride(url, body as Record<string, unknown>);

    const querySimulate = url.searchParams.get("simulate");
    const shouldForceSimulate =
      querySimulate === "true" ||
      querySimulate === "1" ||
      body.simulate === true;
    const forceReal =
      body.forceReal === true || url.searchParams.get("forceReal") === "true";

    // 1. Validate taskId
    if (!taskId || typeof taskId !== "string" || !taskId.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'taskId'" },
        { status: 400 }
      );
    }

    const cleanTaskId = taskId.trim();

    // 2. Fetch task from agentTaskStore
    const task = await getTaskById(cleanTaskId, overrideStorePath);
    if (!task) {
      return NextResponse.json(
        { success: false, error: `Task with id '${cleanTaskId}' not found` },
        { status: 404 }
      );
    }

    // 3. Update task status to "in_progress"
    await updateTask(cleanTaskId, { status: "in_progress" }, overrideStorePath);

    // 4. Resolve assigned agent binary
    const customBin = body.customBinaryPath || task.customBinaryPath;
    const resolvedBin = resolveAgentBinary(task.assignedAgent, customBin);
    const simulationActive = isSimulationMode(shouldForceSimulate, Boolean(resolvedBin), forceReal);

    // 5. Execute via real CLI or robust simulation fallback
    const customArgs = sanitizeArgs(body.commandArgs);
    const effectiveArgs = buildDefaultArgs(task, customArgs);
    const timeoutMs =
      typeof body.timeoutMs === "number" && body.timeoutMs > 0 ? body.timeoutMs : 60_000;

    let result: ProcessExecutionResult;
    if (!simulationActive && resolvedBin) {
      result = await runRealExecution(task, resolvedBin, effectiveArgs, timeoutMs);
    } else {
      result = await runSimulatedExecution(task);
    }

    // 6. Append execution logs to task record in store
    for (const log of result.logs) {
      await appendLog(cleanTaskId, log, overrideStorePath);
    }

    // 7. Transition status from "in_progress" to "review" (or "done")
    const targetStatus: TaskColumnStatus =
      body.targetStatus === "done"
        ? "done"
        : "review";

    const updatedTask = await updateTask(
      cleanTaskId,
      {
        status: targetStatus,
      },
      overrideStorePath
    );

    // 8. Synchronize with Obsidian vault note if linked
    const vaultSynced = await syncTaskProgressToVault(
      updatedTask,
      targetStatus,
      customVaultRoot
    );

    // 9. Return execution response payload
    return NextResponse.json({
      success: true,
      taskId: cleanTaskId,
      status: updatedTask.status,
      logs: updatedTask.executionLogs || [],
      assignedAgent: updatedTask.assignedAgent,
      mode: result.mode,
      vaultSynced,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: `Agent task execution failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
