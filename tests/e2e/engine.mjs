/**
 * HTTP client for the real Nipëi OS task store (agent-os-nipei/source, Next dev server).
 * The vault task notes are the only task store; every call here goes through the API routes.
 *
 * Env:
 *   E2E_BASE_URL  use an already-running server (e.g. http://localhost:3000)
 *   E2E_PORT      port for the dev server the runner starts itself (default 3123)
 */

import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VAULT_ROOT } from "./fixtures.mjs";

const SOURCE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../agent-os-nipei/source");
const PORT = Number(process.env.E2E_PORT || 3123);
export const BASE_URL = (process.env.E2E_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

async function call(method, route, body) {
  const res = await fetch(BASE_URL + route, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, body: json };
}

export const api = {
  listTasks: () => call("GET", "/api/agent-kanban"),
  createTask: (payload) => call("POST", "/api/agent-kanban", payload),
  patchTask: (payload) => call("PATCH", "/api/agent-kanban", payload),
  execute: (payload) => call("POST", "/api/agent-kanban/execute", payload),
  workspace: (taskId) => call("GET", `/api/agent-kanban/attachments?taskId=${encodeURIComponent(taskId)}`),
  raw: call,
};

/** Simulated run of a note. Always passes a zz_e2e taskId so the workspace folder is ours to delete. */
export const simRun = (note, extra = {}) =>
  api.execute({ vaultPath: note.vaultPath, taskId: note.id, simulate: true, ...extra });

/** Finds a task in GET /api/agent-kanban by vaultPath. */
export async function findTask(vaultPath) {
  const { body } = await api.listTasks();
  return body.tasks.find((t) => t.vaultPath === vaultPath);
}

async function isUp() {
  try {
    const res = await fetch(BASE_URL + "/api/agent-kanban");
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Makes sure a server answers on BASE_URL. Starts `next dev` (pointed at VAULT_ROOT) when none does.
 * Returns a stop() function (no-op when the server was already running).
 */
export async function ensureServer({ timeoutMs = 240_000 } = {}) {
  if (await isUp()) return { started: false, stop: () => {} };
  if (process.env.E2E_BASE_URL) throw new Error(`E2E_BASE_URL ${BASE_URL} is not answering /api/agent-kanban`);

  console.log(`Starting next dev on :${PORT} (VAULT_PATH=${VAULT_ROOT})...`);
  const child = spawn(`npx next dev -p ${PORT}`, {
    cwd: SOURCE_DIR,
    env: { ...process.env, VAULT_PATH: VAULT_ROOT },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));

  const stop = () => {
    if (child.exitCode !== null) return;
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
      } catch {
        /* already gone */
      }
    } else {
      child.kill("SIGTERM");
    }
  };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next dev exited (${child.exitCode}):\n${output.slice(-2000)}`);
    if (await isUp()) return { started: true, stop };
    await new Promise((r) => setTimeout(r, 1000));
  }
  stop();
  throw new Error(`next dev did not answer within ${timeoutMs}ms:\n${output.slice(-2000)}`);
}
