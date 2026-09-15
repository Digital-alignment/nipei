# Handoff Report: Agent CLI & Task Execution Architecture

**Agent:** Explorer Survey 2 (Agent CLI & Task Execution Investigator)  
**Parent Agent:** `db5829cb-b9fa-4416-8191-811aed79573e` (Orchestrator)  
**Working Directory:** `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_survey_2`  
**Handoff Type:** Hard (Task complete)  
**Date:** 2026-09-04  

---

## 1. Observation

1. **Agent CLI Configurations & Binary Resolution (`agent-os-nipei/source/src/lib/config.ts`)**:
   - `config.ts` (lines 16-81) defines `AgenticConfig` containing CLI binary fields: `claude`, `openclaw`, `hermes`, `antigravity`, `codex`, `kimi`, `grok`, `ruflo`, `ant`, `nlmBin`, plus `roomAgents`, `openclawAgent`, `openclawLogs`, `hermesLogs`, and `vaultRoot`.
   - `loadFileConfig()` (lines 128-142) reads from `process.env.AGENTIC_OS_CONFIG`, `~/.nipei-os/config.json`, or `nipei-os.config.json` in the current working directory.
   - `which()` (lines 83-88) executes:
     ```typescript
     function which(cmd: string): string | null {
       try {
         const out = execSync(`command -v ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
         return out.trim() || null;
       } catch { return null; }
     }
     ```
     On native Windows PowerShell/CMD, `command -v` returns an error, resulting in `which()` returning `null` unless the binary path is explicitly set in config or env vars.
   - `defaultVault()` (lines 162-175) searches for `Documents/Obsidian Vault`, `Obsidian`, `Obsidian Vault`. The actual Digital Alignment vault is located at `C:\Users\ondig\Desktop\DA\digitalalignment`. Currently, neither `~/.nipei-os/config.json` nor `nipei-os.config.json` exists in `C:\Users\ondig\.nipei-os\`.

2. **Agent CLI Execution Engine (`agent-os-nipei/source/src/lib/runner.ts`)**:
   - `AgentName` type (line 8): `"claude" | "openclaw" | "hermes" | "antigravity" | "fcc" | "codex" | "kimi" | "grok" | "ruflo" | "ant"`.
   - `agentEnv()` (lines 25-50): Configures PATH using Unix `:` delimiter and sets default `SHELL` to `/bin/zsh` and `HOME` to `/Users/juliangoldie`.
   - `FLAG_PATTERN` (line 52): `/^[A-Za-z0-9_\-./:=,@+%]+$/` does not allow backslashes (`\`), causing Windows paths passed to `validateFlagArgs()` to be stripped.
   - `spawnStream()` (lines 115-133): Spawns child process with pipes for streaming stdout/stderr.

3. **Existing CLI Chat & Execution API Routes**:
   - `claude` (`src/app/api/claude/chat/route.ts`): Invokes `claude -p --model <model> [--resume <id>] [--effort xhigh --include-hook-events] --output-format=stream-json --include-partial-messages --verbose "<prompt>"` inside `~/.nipei-os/claude-projects/<project>/`. Emits NDJSON events.
   - `openclaw` (`src/app/api/openclaw/chat/route.ts`): Invokes `openclaw agent --local --agent <id> -m "<prompt>" --json --timeout 120`. Parses JSON payload from stdout.
   - `hermes` (`src/app/api/hermes/chat/route.ts`): Invokes `hermes [-p <profile>] -z "<prompt>" --yolo --accept-hooks`. Strips ANSI terminal codes (`ANSI_STRIP`).
   - `antigravity` (`src/app/api/antigravity/chat/route.ts`): Invokes `agy -p "<prompt>" --model "<model>" [--dangerously-skip-permissions]`.
   - `codex` (`src/app/api/codex/chat/route.ts`): Invokes `codex exec --json "<prompt>"`.

4. **Task Models & Kanban Implementations**:
   - `GlobalTask` (`src/lib/nipeiStore.ts`, lines 168-183):
     ```typescript
     export type KanbanColumnId = "triage" | "todo" | "in_progress" | "agent_executing" | "review" | "done";
     export interface GlobalTask {
       id: string; title: string; project?: string; assignee: string; squad: SquadId;
       priority: "urgente" | "alta" | "media" | "baixa"; status: "pendente" | "em_progresso" | "concluido";
       columnStatus: KanbanColumnId; dueDate: string; description?: string;
       assignedAgents: string[]; executionLogs?: string[]; comments?: TaskComment[]; checklist?: TaskChecklistItem[];
     }
     ```
   - `SquadKanbanView.tsx` (`src/components/SquadKanbanView.tsx`):
     - Uses in-memory state: `const [tasks, setTasks] = useState<GlobalTask[]>(INITIAL_TASKS)`.
     - `handleDispatchAgent` (lines 139-196) simulates execution using client-side `setTimeout()` timers with mock logs. Changes are lost on refresh.
   - `src/app/api/agent-kanban/state/route.ts`: Stores board card lists to `~/.nipei-os/agent-kanban/board.json`.
   - `src/app/api/todos/route.ts`: Stores daily todo items in `~/.nipei-os/todos/YYYY-MM-DD.json`.
   - `src/lib/pipeline.ts`: Reads/writes Markdown files with YAML frontmatter in `Nipei OS/Pipeline/items/<slug>.md` using `js-yaml`.

5. **Process Management & Logging**:
   - `src/lib/ultracodeProcs.ts`: Provides an in-process process registry (`procs = new Map<string, Entry>()`) with `registerProc`, `killProc` (SIGTERM then SIGKILL), `isStopped`, and `isLive`.
   - `src/lib/ultracodeRuns.ts`: Captures and persists full telemetry to `~/.nipei-os/ultracode-runs/<id>.json`.
   - `src/app/api/activity/route.ts`: Reads tail log lines from `openclawLogs` and `hermesLogs`.

6. **Obsidian Vault Contract (`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`)**:
   - Vault at `C:\Users\ondig\Desktop\DA\digitalalignment\`.
   - Notes in `Clientes/` and `Productos/` must have YAML frontmatter with `id`, `nombre`, `tipo`, `estado`, `roadmap`, `proyectos`, `historial`, `servicios`.
   - `roadmap` items must have `id`, `texto`, `prioridad` (`urgente` | `alta` | `media` | `baja`), `hecho` (boolean), `orden`.
   - The first line of the markdown body must be `<!-- agente: antigravity -->` for created notes.
   - Validator command: `npm run vault:check` in `C:\Users\ondig\Code\DA\command-center`.

---

## 2. Logic Chain

1. **Status & Column Mapping (Observation 4 & Original Request R1)**:
   - The original request requires 4 statuses: Backlog, In Progress, Review, Done.
   - Currently, `SquadKanbanView.tsx` uses 6 columns: `triage`, `todo`, `in_progress`, `agent_executing`, `review`, `done`.
   - Therefore, a dedicated `/agents-todo` route can either use a 4-column layout (`backlog`, `in_progress`, `review`, `done`) or map `triage`/`todo` to Backlog, and `in_progress`/`agent_executing` to In Progress, seamlessly preserving compatibility with `GlobalTask`.

2. **Agent Assignment Mapping (Observations 1, 2, 3 & Original Request R1)**:
   - The original request requires assigning agent CLI binaries: Claude Code (`claude`), OpenClaw (`openclaw`), Hermes (`hermes`), and Custom (`custom` / `antigravity`).
   - `runner.ts` already knows `claude`, `openclaw`, `hermes`, and `antigravity`.
   - By creating a unified `AgentCliId = "claude" | "openclaw" | "hermes" | "custom"`, the task board can filter and dispatch to these specific CLI handlers.

3. **Real vs Simulated Execution Hooks (Observations 3, 5 & Original Request R1)**:
   - Currently, `handleDispatchAgent` is purely client-side with fake `setTimeout` logs.
   - The backend already has `spawnStream` in `runner.ts` and process supervision in `ultracodeProcs.ts`.
   - By creating `POST /api/agent-tasks/execute`, Nipëi OS can accept a `taskId` and `agent`, spawn the CLI or execute a task prompt, stream logs into `executionLogs`, and update the task status to `review` or `done`. If the binary is unavailable, it can gracefully fall back to local Ollama / OpenRouter model execution or structured mock logs with clear diagnostic indicators.

4. **Persistence Strategy (Observations 1, 4, 6 & Original Request R1, R2, R3)**:
   - In-memory state in `SquadKanbanView` is insufficient.
   - A dual-layer persistence strategy solves both requirements:
     - Layer 1: `~/.nipei-os/agent-tasks.json` provides low-latency local JSON persistence for tasks, checklists, comments, and real-time execution logs (using the atomic write and serialize pattern from `todos/route.ts`).
     - Layer 2: Bi-directional synchronization with the Obsidian vault (`Clientes/Nipeihu.md`, `Clientes/Digital Alignment.md`) parses roadmap items on startup into the task board, and writes back updates to the `roadmap` frontmatter adhering to `da-vault-schema`.
     - Company Intake (`/api/company/intake`) reads and writes the company profile, squad roles, financial metrics, and agent instructions into `Clientes/*.md` frontmatter and `~/.nipei-os/config.json`.

---

## 3. Caveats

1. **CLI Binary Availability**: On Windows, the actual binaries (`claude`, `openclaw`, `hermes`, `agy`) may or may not be in system `PATH`. The system must handle missing binaries gracefully by offering diagnostic instructions and fallback mock/local model modes.
2. **Windows Platform Fixes**: If `runner.ts` and `config.ts` are not patched for Windows (`where.exe`, `path.delimiter`, backslash in `FLAG_PATTERN`), direct invocation of CLIs with Windows file paths may fail.
3. **Vault File Locking / Concurrency**: While Obsidian does not lock files exclusively, rapid concurrent writes to the same `.md` file should be serialized to avoid torn writes.

---

## 4. Conclusion

1. Nipëi OS has existing foundational infrastructure for multi-agent CLI orchestration (`runner.ts`, `ultracodeProcs.ts`, `ultracodeRuns.ts`) and multi-squad Kanban rendering (`SquadKanbanView.tsx`, `nipeiStore.ts`), but lacks:
   - A dedicated `/agents-todo` route.
   - Server-side task persistence (currently in React memory).
   - Real backend execution hooks for tasks (currently client `setTimeout`).
   - Company information intake and vault synchronization endpoints.
2. The recommended architecture:
   - Route `/agents-todo` backed by `agentTaskStore.ts` persisting to `~/.nipei-os/agent-tasks.json`.
   - Task execution endpoint `POST /api/agent-tasks/execute` hooked into `runner.ts` and `ultracodeProcs.ts`.
   - Vault parsing and intake engine `src/lib/vaultCompanySync.ts` + `POST /api/company/intake` supporting bi-directional synchronization with `C:\Users\ondig\Desktop\DA\digitalalignment\Clientes\*.md` complying with `da-vault-schema`.
   - Sidebar navigation update in `src/components/Sidebar.tsx` adding `/agents-todo`.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Source Files**:
   - Verify `config.ts` resolution: `view_file` on `agent-os-nipei/source/src/lib/config.ts`.
   - Verify CLI runner: `view_file` on `agent-os-nipei/source/src/lib/runner.ts`.
   - Verify in-memory task state: `view_file` on `agent-os-nipei/source/src/components/SquadKanbanView.tsx` lines 34 & 139-196.
   - Verify vault contract: `view_file` on `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`.
2. **Build Verification**:
   - In `c:\Users\ondig\Code\DA\nipei control\agent-os-nipei\source`:
     Run `npm run build` to confirm TypeScript and Next.js compilation status.
3. **Invalidation Conditions**:
   - If `npm run build` fails on new route definitions, check TypeScript types in `AgentTask` and Next.js page conventions.
   - If Obsidian vault parser fails, verify frontmatter using `npm run vault:check` in `C:\Users\ondig\Code\DA\command-center`.
