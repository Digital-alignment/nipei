## 2026-09-04T23:52:45-03:00

You are Worker M2_1 (Agent Tasks Backend & Execution Worker).
Your working directory is: `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_worker_m2_1`.
You MUST read the original request verbatim at:
`c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md`

Read the project architecture and interface contracts at:
`c:\Users\ondig\Code\DA\nipei control\PROJECT.md`

Read the vault schema contract at:
`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`

Read the 3 Explorer technical analyses and proposed implementations:
- Explorer M2_1 (Task Store & Persistence): `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_1\analysis.md` and `handoff.md`
- Explorer M2_2 (Tasks CRUD & Vault Sync API): `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_2\analysis.md` and `handoff.md`
- Explorer M2_3 (CLI Execution Hook & Telemetry): `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_3\analysis.md` and `handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `agent-os-nipei/source/src/lib/agentTaskStore.ts`
- `agent-os-nipei/source/src/app/api/agent-tasks/route.ts`
- `agent-os-nipei/source/src/app/api/agent-tasks/execute/route.ts`

Implementation Requirements:
1. `agent-os-nipei/source/src/lib/agentTaskStore.ts`:
   - Implement the complete production task store using the architecture in Explorer M2_1's analysis.
   - Enforce types: `TaskColumnStatus`, `AgentCliType`, `TaskPriority`, `ExecutionLogEntry`, and `AgentTask`.
   - Store tasks in `~/.nipei-os/agent-tasks.json` (respecting `NIPEI_TASKS_FILE` or `NIPEI_STATE_DIR` env vars). Automatically create the directory if missing.
   - Concurrency & Atomic File Operations: Incorporate mutex locking (`getLockKey`, `withFileLock`), transient fs error detection, exponential backoff with jitter, and two-tier atomic replacement (`.tmp` + `.bak` -> rename/copyFile) ensuring zero corrupted reads or writes on Windows NTFS.
   - Provide standalone functions (`getTasks`, `getTaskById`, `createTask`, `updateTask`, `deleteTask`, `appendLog`, `moveTaskStatus`) AND export the factory `createTaskStore(stateDirOrFilePath)` for isolated testing.
   - Support filtering (by `status`, `assignedAgent`, `priority`, `search`) and sorting (by `priority` [urgente > alta > media > baja] and `createdAt`).

2. `agent-os-nipei/source/src/app/api/agent-tasks/route.ts`:
   - Implement Next.js App Router API endpoints for `GET`, `POST`, `PATCH`, and `DELETE`.
   - `GET`: Return `{ success: true, count: N, tasks, agentTasks }` with query filters.
   - `POST`: Validate required `title`, assign defaults (`status: "backlog"`, `priority: "media"`, `assignedAgent: "claude"`), create task, and return `{ success: true, task }`. If `clientNoteId` is attached, sync initial item to vault note.
   - `PATCH`: Update task fields (`status`, `priority`, `assignedAgent`, `title`, `description`, `tags`, etc.).
     - Two-way vault roadmap sync: When `clientNoteId` is present, call `vaultSyncEngine.writeVaultNote` to synchronize with the note's `roadmap`.
     - When `status === "done"`: set `hecho: true`, remove intermediate `estado`, and stamp `fecha_completado: YYYY-MM-DD`.
     - When `status !== "done"`: set `hecho: false`, set `estado: "en_curso" | "bloqueada" | "pendiente"`, and strip `fecha_completado`.
     - Strict `da-vault-schema` compliance: byte-for-byte body markdown preservation, `<!-- agente: antigravity -->` watermark, secret stripping from `servicios`.
   - `DELETE`: Remove task by ID and return `{ success: true, deleted: true }`.

3. `agent-os-nipei/source/src/app/api/agent-tasks/execute/route.ts`:
   - Implement `POST` endpoint accepting `{ taskId, commandArgs? }`.
   - Lookup task in `agentTaskStore`. Return 404 if not found.
   - Transition task status to `"in_progress"`.
   - Cross-platform agent CLI resolution for Claude Code (`claude`), OpenClaw (`openclaw`), Hermes (`hermes`), and Custom (`customBinaryPath` or `agy`).
   - If real CLI binary is available, execute with Windows path safety and stream output.
   - If binary is missing or in test/simulation mode, run robust simulated telemetry workflow emitting the 4 required logs:
     - `[info] Initialized agent runtime: ${task.assignedAgent}`
     - `[output] Loading context for task: ${task.title}`
     - `[output] Processing task specifications and executing automated routines...`
     - `[info] Execution finished successfully with exit code 0.`
   - Append all logs to task's `executionLogs`.
   - Transition status to `"review"` (or `"done"`).
   - If `clientNoteId` is attached, sync updated status to Obsidian vault note.
   - Return `{ success: true, taskId, status: task.status, logs: task.executionLogs, assignedAgent: task.assignedAgent, mode: "real" | "simulation" }`.

Verification Commands:
- Run `npm run build` in `agent-os-nipei/source` (must compile with 0 TypeScript/lint errors).
- Run `node tests/e2e/runner.mjs` in project root (must pass 50/50 tests).
- Run `npm run vault:check` in `c:\Users\ondig\Code\DA\command-center` (must verify 0 errors).
