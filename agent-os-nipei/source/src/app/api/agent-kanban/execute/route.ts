import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TAREFAS_DIR, writeTarefa } from "@/lib/tarefaNote";
import os from "node:os";
import { execSync } from "node:child_process";

import { config, defaultVault } from "@/lib/config";
import { registerProc, unregisterProc } from "@/lib/ultracodeProcs";
import { parseAgentsFrontmatter } from "@/lib/kanbanGrounding";
import { recordTaskExecutionLogs } from "@/lib/taskWorkspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ==========================================
// 1. Types & Request Payloads
// ==========================================

/**
 * Runs an agent CLI against a vault task note (Productivity/Tarefas/*.md).
 * The vault note is the only task store: status lives in its frontmatter,
 * execution logs in its Task_Workspace/_workspace_meta.json.
 */
export interface ExecuteRequestBody {
  taskId?: string;
  vaultPath?: string;
  squadId?: string;
  agent?: string;
  commandArgs?: string[];
  simulate?: boolean;
  customBinaryPath?: string;
  forceReal?: boolean;
  timeoutMs?: number;
}

type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
const CLI_AGENTS: readonly AgentCliType[] = ["claude", "openclaw", "hermes", "custom"];

interface ExecutionLogEntry {
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error" | "output";
}

interface AgentRun {
  id: string;
  title: string;
  description?: string;
  assignedAgent: AgentCliType;
  cwd: string;
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

function buildDefaultArgs(task: AgentRun, customArgs?: string[]): string[] {
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
async function runSimulatedExecution(task: AgentRun): Promise<ProcessExecutionResult> {
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
  task: AgentRun,
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
        cwd: task.cwd,
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
// 5. Vault task note helpers
// ==========================================

const TASK_DIRS = ["Productivity/Tarefas/", "Todo_Audit_Lists/"];

/** Resolves a vault-relative task path, refusing anything outside the task folders. */
function resolveTaskPath(vaultRoot: string, vaultPath: string): string | null {
  const rel = vaultPath.replace(/\\/g, "/");
  if (!rel.endsWith(".md") || !TASK_DIRS.some((d) => rel.startsWith(d))) return null;
  const abs = path.resolve(vaultRoot, rel);
  // Re-check the folder on the resolved path so "Productivity/Tarefas/../x.md" can't escape it
  const inside = path.relative(path.resolve(vaultRoot), abs).replace(/\\/g, "/");
  return TASK_DIRS.some((d) => inside.startsWith(d)) && fs.existsSync(abs) ? abs : null;
}

function setTaskStatus(absPath: string, status: string) {
  const vaultRoot = defaultVault()!;
  const rel = path.relative(vaultRoot, absPath);
  // Task notes go through the single writer (format + activity log + sync); audit lists keep their own format.
  if (rel.startsWith(TAREFAS_DIR + path.sep)) {
    writeTarefa(vaultRoot, rel, "agente IA (v1)", (d) => { d.fm.status = status; });
    return;
  }
  const content = fs.readFileSync(absPath, "utf-8");
  fs.writeFileSync(absPath, content.replace(/^status:.*$/m, `status: "${status}"`), "utf-8");
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

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, error: "Vault root not configured" }, { status: 500 });
    }
    const absPath = typeof body.vaultPath === "string" ? resolveTaskPath(vaultRoot, body.vaultPath) : null;
    if (!absPath) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'vaultPath' (must be a task note under Productivity/Tarefas or Todo_Audit_Lists)" },
        { status: 400 }
      );
    }

    // 1. Read the task note
    const content = fs.readFileSync(absPath, "utf-8");
    const title = content.match(/^title:\s*"?([^"\n\r]+)"?/m)?.[1].trim() || path.basename(absPath, ".md");
    const taskId = body.taskId?.trim() || content.match(/^id:\s*"?([^"\n\r]+)"?/m)?.[1].trim() || path.basename(absPath, ".md");
    const noteBody = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim().slice(0, 8000);

    // 2. Pick the agent: explicit request, else first CLI-capable agent assigned on the note
    const assigned = [body.agent, ...(parseAgentsFrontmatter(content) || [])];
    const agent = assigned.find((a): a is AgentCliType => CLI_AGENTS.includes(a as AgentCliType));

    const run: AgentRun = {
      id: taskId,
      title,
      description: `${noteBody}\n\n(Nota da tarefa no vault: ${body.vaultPath})`,
      assignedAgent: agent || "custom",
      cwd: vaultRoot,
    };

    // 3. Mark as running in the vault
    setTaskStatus(absPath, "IA em Execução");

    // 4. Resolve binary & execute (simulation when no CLI agent/binary is available)
    const resolvedBin = agent ? resolveAgentBinary(agent, body.customBinaryPath) : null;
    const simulationActive = isSimulationMode(body.simulate, Boolean(resolvedBin), body.forceReal);
    const timeoutMs = typeof body.timeoutMs === "number" && body.timeoutMs > 0 ? body.timeoutMs : 60_000;

    const result =
      !simulationActive && resolvedBin
        ? await runRealExecution(run, resolvedBin, buildDefaultArgs(run, sanitizeArgs(body.commandArgs)), timeoutMs)
        : await runSimulatedExecution(run);

    // 5. Persist logs in the task workspace and hand the task to human review
    const lines = result.logs.map((l) => `${l.timestamp} ${l.message}`);
    const executionLogs = recordTaskExecutionLogs(taskId, body.squadId, title, [
      `${new Date().toISOString()} [info] Run ${result.mode} via ${agent || "nenhum agente CLI atribuído"}`,
      ...lines,
    ]);
    const finalStatus = result.exitCode === 0 ? "Revisão" : "Bloqueado";
    setTaskStatus(absPath, finalStatus);

    return NextResponse.json({
      success: true,
      taskId,
      status: finalStatus,
      column: "review",
      assignedAgent: agent || null,
      mode: result.mode,
      exitCode: result.exitCode,
      logs: lines,
      executionLogs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Agent task execution failed: ${message}` },
      { status: 500 }
    );
  }
}
