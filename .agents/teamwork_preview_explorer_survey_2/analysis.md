# Technical Analysis: Agent CLI & Task Execution Architecture in Nipëi OS

**Investigator:** Explorer Survey 2 (Agent CLI & Task Execution Investigator)  
**Target Repository:** `c:\Users\ondig\Code\DA\nipei control`  
**Application Subsystem:** `agent-os-nipei/source` (Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4)  
**Date:** 2026-09-04  

---

## 1. Executive Summary

Nipëi OS is a Next.js (App Router) command center designed to orchestrate local and cloud AI agent CLIs (Claude Code, OpenClaw, Hermes, Antigravity, Codex, Kimi, GLM, Grok, Ruflo) alongside business operations for Digital Alignment and its client ecosystem (Nipeihu, Inî Rau, MUV Gráfica, Oca Yary).

The original user request demands:
1. **R1: Dedicated `/agents-todo` View**: An interactive Kanban/To-Do board displaying statuses (**Backlog**, **In Progress**, **Review**, **Done**), assigned agent CLI binaries (**Claude Code**, **OpenClaw**, **Hermes**, **Custom**), priority, and logs.
2. **R2: Company Information Intake & Vault Synchronization Engine**: A structured UI form/wizard and API route persisting company operational data (Departments, Roles, Services, Active Clients, Financial Metrics, and Agent Instructions) directly to the Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`) and local Nipëi OS config.
3. **R3: Automated Vault Parsing & Pre-population**: Pre-filling Nipëi OS with live company data from existing vault notes (`Clientes/Nipeihu.md`, `Clientes/Digital Alignment.md`).

This investigation examines the exact CLI runtime mechanics, task models, process supervision, logging pipelines, and persistence contracts required to implement these requirements reliably.

---

## 2. Agent CLI Configurations, References, and Runtime Engines

### 2.1 Configuration Hierarchy & Resolution (`src/lib/config.ts`)

Nipëi OS resolves configuration through a 4-tier precedence chain:
1. **Environment Variables**: e.g., `AGENTIC_OS_CLAUDE_BIN`, `AGENTIC_OS_OPENCLAW_BIN`, `AGENTIC_OS_HERMES_BIN`, `AGENTIC_OS_ANTIGRAVITY_BIN`, `AGENTIC_OS_VAULT`.
2. **User JSON Configuration File**: Resolved via `loadFileConfig()` in order:
   - `process.env.AGENTIC_OS_CONFIG`
   - `~/.nipei-os/config.json`
   - `nipei-os.config.json` (in project working directory)
3. **Auto-Detection (`which`)**: Runs `which(cmd)` via child process execution.
4. **Hardcoded Guess Fallbacks**: e.g., `nlmBinGuess()`, `kimiBinGuess()`, `grokBinGuess()`, `defaultVault()`.

#### Configuration Interface (`AgenticConfig`):
```typescript
export interface AgenticConfig {
  claude: string | null;
  openclaw: string | null;
  hermes: string | null;
  antigravity: string | null;
  codex: string | null;
  kimi: string | null;
  grok: string | null;
  ruflo: string | null;
  ant: string | null;
  nlmBin: string | null;
  vaultRoot: string | null;
  hermesHome?: string | null;
  userName: string;
  youtubeChannel: string;
  seoSites: string[];
  furnaceChannels: string[];
  openclawLogs: string;
  hermesLogs: string;
  openclawAgent: string;
  goalCategories: string[];
  roomAgents: Record<string, {
    model?: string;
    provider?: "openrouter" | "ollama" | "openai";
    baseUrl?: string;
    apiKeyEnv?: string;
    noReasoning?: boolean;
  }>;
  locationLabel: string;
}
```

### 2.2 CLI Execution Harness (`src/lib/runner.ts`)

The central execution engine exports:
- `run(agent, args, opts)`: Synchronous Promise returning `RunResult` (`{ ok, code, stdout, stderr, durationMs }`).
- `spawnStream(agent, args, opts)`: Returns a live `ChildProcessWithoutNullStreams` for streaming stdout/stderr/json.
- `agentEnv(extra)`: Injects default `PATH`, `SHELL`, `HOME`, `NO_COLOR=1`, `FORCE_COLOR=0`.

### 2.3 Individual Agent CLI Invocations

| Agent | Binary Name | Default Invocation Command & Flags | Working Directory | Output Format |
|---|---|---|---|---|
| **Claude Code** | `claude` | `claude -p --model <model> [--resume <id>] [--effort xhigh --include-hook-events] --output-format=stream-json --include-partial-messages --verbose "<prompt>"` | `~/.nipei-os/claude-projects/<project>/` | NDJSON stream (`system/task_*`, `result/success`) |
| **OpenClaw** | `openclaw` | `openclaw agent --local --agent <agentId> -m "<prompt>" --json --timeout 120` | `~/.openclaw/workspace/` | JSON object containing `payloads[0].text` or `meta.finalAssistantVisibleText` |
| **Hermes** | `hermes` | `hermes [-p <profile>] -z "<prompt>" --yolo --accept-hooks` | `HERMES_HOME` (default `~/.hermes` or `%LOCALAPPDATA%\hermes`) | Plain text with ANSI codes (stripped by regex) |
| **Antigravity** | `agy` | `agy -p "<prompt>" --model "<model>" [--dangerously-skip-permissions]` | `~/.gemini/antigravity-cli/scratch/` | Final text output |
| **Codex** | `codex` | `codex exec --json "<prompt>"` | `~/codex-scratch/<project>/` | NDJSON stream |
| **Custom** | User script / binary | Configurable via command template or custom adapter | Configurable workspace | STDOUT / STDERR capture |

### 2.4 Critical Windows Platform Compatibility Findings

During code review of `src/lib/config.ts` and `src/lib/runner.ts`, three platform compatibility issues were identified that impact Windows execution:
1. **`which()` in `config.ts` (lines 83-88)**:
   ```typescript
   function which(cmd: string): string | null {
     try {
       const out = execSync(`command -v ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
       return out.trim() || null;
     } catch { return null; }
   }
   ```
   *Issue*: On Windows `cmd.exe` / `powershell.exe`, `command -v` does not exist, causing `which()` to always return `null`.  
   *Remedy*: Check `process.platform === "win32"` and run `where.exe ${cmd}` as a fallback.
2. **`agentEnv()` in `runner.ts` (lines 25-50)**:
   *Issue*: Hardcodes Unix path separators (`:`) instead of `path.delimiter` (`;` on Windows), and defaults to `/bin/zsh` and `/Users/juliangoldie`.  
   *Remedy*: Use `path.delimiter`, detect `process.env.ComSpec` or `pwsh.exe` on Windows.
3. **`FLAG_PATTERN` in `runner.ts` (line 52)**:
   *Issue*: Regex `^[A-Za-z0-9_\-./:=,@+%]+$` does not include `\` (Windows backslash). File paths passed as arguments on Windows get rejected by `validateFlagArgs()`.  
   *Remedy*: Include `\\` in `FLAG_PATTERN`.
4. **`defaultVault()` in `config.ts` (lines 162-175)**:
   *Issue*: Fallback search only checks `Documents/Obsidian Vault`, `Obsidian`, `Obsidian Vault`. The actual Digital Alignment vault is located at `C:\Users\ondig\Desktop\DA\digitalalignment`.  
   *Remedy*: Add `path.join(os.homedir(), "Desktop", "DA", "digitalalignment")` to default guesses and configure `~/.nipei-os/config.json`.

---

## 3. Task Data Structures & State Management Analysis

### 3.1 Existing Task Implementations

1. **`GlobalTask` in `src/lib/nipeiStore.ts`**:
   - Primary state model currently used by `SquadKanbanView.tsx`:
     ```typescript
     export type KanbanColumnId = "triage" | "todo" | "in_progress" | "agent_executing" | "review" | "done";

     export interface GlobalTask {
       id: string;
       title: string;
       project?: string;
       assignee: string;
       squad: SquadId;
       priority: "urgente" | "alta" | "media" | "baixa";
       status: "pendente" | "em_progresso" | "concluido";
       columnStatus: KanbanColumnId;
       dueDate: string;
       description?: string;
       assignedAgents: string[]; // ["antigravity", "hermes", "claude"]
       executionLogs?: string[];
       comments?: TaskComment[];
       checklist?: TaskChecklistItem[];
     }
     ```
   - *Current Limitation*: `SquadKanbanView` stores tasks only in memory via React `useState(INITIAL_TASKS)`. Dispatched agents run mock `setTimeout()` timers with hardcoded log messages. Any card creation, column move, or comment is wiped on browser refresh.
2. **`Todo` in `src/app/api/todos/route.ts`**:
   - Stored at `~/.nipei-os/todos/YYYY-MM-DD.json`.
   - Features atomic writes (`.tmp` + rename) and promise serialization (`serialize()`) to prevent race conditions.
   - Only supports simple day-based personal checklist tasks (`id`, `text`, `done`, `ts`, `status`, `kind`, `indent`).
3. **`PipelineItem` in `src/lib/pipeline.ts`**:
   - Stored as Markdown files with YAML frontmatter in the Obsidian vault at `Nipei OS/Pipeline/items/<slug>.md`.
   - Demonstrates working vault read/write integration using `js-yaml`.
4. **Hermes Kanban DB (`src/lib/kanbanDb.ts`)**:
   - Reads SQLite database at `~/.hermes/kanban.db`.
   - `TaskRow`: contains `id`, `title`, `body`, `assignee`, `status`, `priority`, `result`, `skills`.

### 3.2 Required Status Mapping for R1

Requirement R1 specifies 4 canonical task board columns:
- **Backlog** (maps to `backlog` / `triage` / `todo`)
- **In Progress** (maps to `in_progress` / `agent_executing`)
- **Review** (maps to `review`)
- **Done** (maps to `done`)

And assigned agent CLI binaries:
- `claude` (Claude Code)
- `openclaw` (OpenClaw)
- `hermes` (Hermes)
- `custom` (Custom CLI / Antigravity / Shell Script)

---

## 4. Logging Handling, Telemetry, and Process Management

### 4.1 Process Lifecycle Supervision (`src/lib/ultracodeProcs.ts`)

Nipëi OS implements an in-process registry pattern for controlling agent subprocesses:
```typescript
interface Entry { child: ChildProcess; stopped: boolean; }
const procs = new Map<string, Entry>();

export function registerProc(runId: string, child: ChildProcess): void;
export function unregisterProc(runId: string): void;
export function isStopped(runId: string): boolean;
export function killProc(runId: string): boolean {
  // SIGTERM first, then SIGKILL after 2500ms
}
export function isLive(runId: string): boolean;
```
*Application for R1*: When a user clicks "Dispatch Agent" or "Stop Agent" on a task card in `/agents-todo`, this exact mechanism allows cross-request process termination.

### 4.2 Stream Telemetry & Storage (`src/lib/ultracodeRuns.ts`)

Ultracode parses Claude's `stream-json` events into a structured timeline and persists completed or in-flight runs to `~/.nipei-os/ultracode-runs/<id>.json`.
Events captured include:
- `system/task_started`: Tool/task invocation details.
- `system/task_progress`: Token usage, execution duration, active tool.
- `system/task_notification`: Task completion/failure notification.
- `system/post_turn_summary`: High-level operational verdict.
- `result/success`: Total cost, turns, final result text.

### 4.3 Activity Log Ingestion (`src/app/api/activity/route.ts`)

Nipëi OS provides an activity feed by tailing the newest `.log` files in `config.openclawLogs` (`~/.openclaw/logs`) and `config.hermesLogs` (`~/.hermes/cache`).

### 4.4 Diagnostic Error Recovery

Both Hermes (`hermes/chat/route.ts`) and Antigravity (`antigravity/chat/route.ts`) implement robust output sanitization:
1. Strip ANSI escape sequences: `/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\]\d+;[^\x07\x1b]*(\x07|\x1b\\)/g`.
2. Inspect `durationMs` against `TIMEOUT_MS` to differentiate between clean timeouts, crashes (exit code ≠ 0), and authentication failures (missing API keys / login tokens).

---

## 5. Agent Instructions, Roles, and Operational Rules Representation

### 5.1 Current Representations in Nipëi OS

1. **AI Agent Room Personas (`src/lib/agentRoom.ts`)**:
   - Keyed in `ROOM_AGENTS` with `id`, `name`, `color`, `provider`, `model`, `persona`:
     - **Claude**: "You are Claude — thoughtful, careful, balanced..."
     - **Hermes**: "You are Hermes — direct, action-oriented, a little unfiltered..."
     - **OpenClaw**: "You are OpenClaw — open-source, bold, a little cheeky..."
     - **Codex**: "You are Codex — OpenAI's coding agent..."
   - Overridable via `config.roomAgents` in `~/.nipei-os/config.json`.
2. **Organizational Squads & Roles (`src/components/OrganogramaView.tsx`)**:
   - `ORGANIGRAM_DATA` maps the 7 operational squads of the Dual Nucleus (Sagrado vs Comercial):
     - **Squad I (CEO/Estratégia)**: Lead Ana Castro, Agents @antigravity, @hermes.
     - **Squad II (Produção Mutum)**: Lead Pajé Mutum, Agent @openclaw (Traceability).
     - **Squad III (Retiros & Hospitalidade)**: Lead Coord. Serra Grande, Agent @claude.
     - **Squad IV (Vendas & Marketing)**: Lead Gestor Botica Inî Rau, Agent @glm.
     - **Squad V (Adm/Legal/Financeiro)**: Lead Controlador Financeiro, Agent @claude.
     - **Squad VI (Infraestrutura)**: Lead Supervisora Manutenção, Agent @hermes.
     - **Squad VII (Instituto Nipëihu)**: Lead Conselho de Pajés, Agent @antigravity (Ethical Veto Gate).

### 5.2 Obsidian Vault Schema Contract (`da-vault-schema/SKILL.md`)

The Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`) is the single source of truth for business and client state. Command Center and Nipëi OS read it directly from disk.
- **Client Notes (`Clientes/<Empresa>.md`)**:
  - Frontmatter fields: `id`, `nombre`, `tipo` (`cliente_externo` | `producto_propio` | `agencia_madre`), `estado` (`activo` | `transicion` | `pausado` | `archivado`), `emoji`, `categoria`, `rubro`, `dominio`, `hosting`, `stack`, `relaciones`, `proyectos`, `roadmap`, `historial`, `servicios`, `ultima_sync`.
  - **Roadmap Item Format**:
    ```yaml
    roadmap:
      - id: slug-unico-tarea
        texto: Descripcion de la tarea
        prioridad: alta # urgente | alta | media | baja
        tags: [tag1, tag2]
        orden: 1
        hecho: false # canonical boolean flag
        proyecto_id: slug-proyecto
        estado: en_curso # opcional si hecho es false
        fecha_limite: '2026-09-30'
        responsable: '@claude' # Persona o agente
        fecha_creacion: '2026-09-04'
    ```
  - **Body Marker**: The first line of the markdown body must be `<!-- agente: antigravity -->` for newly created notes.
  - **Schema Extensibility**: Any unknown YAML frontmatter key (such as `agentes`, `departamentos`, or `reglas_operativas`) is preserved without breaking the vault validator (`npm run vault:check`).

---

## 6. Technical Recommendations & System Architecture

### 6.1 Unified Task Data Model (`AgentTask`)

To satisfy R1 while maintaining compatibility with both `GlobalTask` and Obsidian vault roadmap items, the following data model is recommended:

```typescript
export type TaskStatus = "backlog" | "in_progress" | "review" | "done";
export type TaskPriority = "urgente" | "alta" | "media" | "baixa";
export type AgentCliId = "claude" | "openclaw" | "hermes" | "custom";

export interface TaskLogEntry {
  timestamp: string; // ISO 8601
  level: "info" | "warn" | "error" | "agent";
  message: string;
}

export interface TaskComment {
  id: string;
  author: string;
  role?: string;
  text: string;
  createdAt: string;
  isAgent?: boolean;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface AgentTask {
  id: string; // e.g. "TSK-01" or "tsk-1725500000"
  title: string;
  description: string;
  status: TaskStatus; // "backlog" | "in_progress" | "review" | "done"
  priority: TaskPriority; // "urgente" | "alta" | "media" | "baixa"
  assignedAgent: AgentCliId; // primary CLI binary
  assignedAgents?: string[]; // secondary agents or team members
  squad?: string; // e.g. "squad_1_ceo", "squad_2_mutum"
  project?: string; // Associated project slug
  clientNoteId?: string; // e.g. "nipeihu", "digital-alignment"
  roadmapItemId?: string; // Link to vault roadmap item id
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  checklist: TaskChecklistItem[];
  comments: TaskComment[];
  executionLogs: string[]; // Or TaskLogEntry[]
}
```

### 6.2 Dual-Layer Persistence Strategy

1. **Local Persistent JSON Store (`~/.nipei-os/agent-tasks.json`)**:
   - Stores the full operational state of all tasks including real-time execution logs, agent subprocess telemetry, and checklist details.
   - Provides sub-5ms reads and writes using atomic write patterns (`.tmp` + rename) with promise chaining (`serialize()`) to prevent concurrent write corruption.
   - Seeded on initial startup from `INITIAL_TASKS` and parsed vault notes if the file does not yet exist.
2. **Obsidian Vault Synchronization (`C:\Users\ondig\Desktop\DA\digitalalignment`)**:
   - When a task is marked `done`, updated, or created with a client reference (e.g., `clientNoteId: "nipeihu"`), the synchronization engine updates the corresponding note in `Clientes/` or `Productos/`.
   - Specifically updates the `roadmap:` array in frontmatter according to `da-vault-schema`:
     - Updates `hecho: true` when `status === "done"`.
     - Updates `fecha_completado: YYYY-MM-DD`.
     - Sets `responsable: "@" + task.assignedAgent`.
   - Emits audit log entries into `Nipei OS/Memories/` or note `historial:` list.

### 6.3 Agent Task Execution Hook (`POST /api/agent-tasks/execute`)

A dedicated execution endpoint should be added to manage real and semi-automated agent runs:
1. **Endpoint**: `POST /api/agent-tasks/execute`  
   - Payload: `{ taskId: string, agent: AgentCliId, prompt?: string, customCommand?: string }`
2. **Execution Steps**:
   - Look up task in `agent-tasks.json`.
   - Update status to `"in_progress"`.
   - Append log: `"[System] Dispatched agent CLI: <agent>"`.
   - If CLI binary is installed:
     - Spawn process using `spawnStream` (`runner.ts`).
     - Register process in `ultracodeProcs` registry under `taskId`.
     - Stream stdout/stderr chunks and append to `executionLogs`.
     - On process exit code 0: Append completion log, add assistant comment with output summary, update status to `"review"`.
   - If CLI binary is not installed:
     - Fall back to intelligent autonomous simulation mode or local model (Ollama / OpenRouter via `agentRoom.ts`), logging execution steps and generating output artifacts.
3. **Stop Endpoint**: `POST /api/agent-tasks/stop`  
   - Payload: `{ taskId: string }`  
   - Calls `killProc(taskId)`.

### 6.4 Company Intake & Vault Synchronization Engine (R2 & R3)

1. **Backend Route (`/api/company/intake`)**:
   - `GET /api/company/intake`: Reads `Clientes/Nipeihu.md`, `Clientes/Digital Alignment.md`, and other vault notes using `js-yaml`, parsing frontmatter properties (Company Profile, Projects, Roadmap, Services, Stack) and returning aggregated company data.
   - `POST /api/company/intake`: Accepts structured updates for:
     - **Company Profile**: Name, category, rubro, domain, hosting, stack.
     - **Client Accounts**: Active clients list.
     - **Departments & Roles**: Squads, leads, team members, agent assignments.
     - **Financial Metrics**: DRE entries, cost center assignments.
     - **Agent Instructions & Rules**: System prompt overrides, operational SOPs.
   - Updates target Markdown file frontmatter safely without destroying body content or frontmatter comments.
   - Persists agent instructions and system config to `~/.nipei-os/config.json`.
2. **Frontmatter Codec Protocol**:
   - Must use `js-yaml.load` and `js-yaml.dump`.
   - Preserve `<!-- agente: antigravity -->` tag as first line of body.
   - Never write sensitive credentials directly to markdown (reference `credencial_ref`).

---

## 7. Next Implementation Steps

1. Implement `src/lib/agentTaskStore.ts` providing JSON persistence at `~/.nipei-os/agent-tasks.json` with auto-seeding from `INITIAL_TASKS` and vault notes.
2. Implement `src/app/api/agent-tasks/route.ts` supporting `GET` (list with filters) and `POST` (create, update status, reorder, add comment, add checklist item).
3. Implement `src/app/api/agent-tasks/execute/route.ts` for real and simulated agent task dispatching.
4. Build `src/app/agents-todo/page.tsx` rendering the dedicated Kanban/To-Do board with Backlog, In Progress, Review, Done columns and agent CLI filtering.
5. Update `src/components/Sidebar.tsx` to include `/agents-todo` in the primary navigation list.
6. Build `src/app/company-intake/page.tsx` and `/api/company/intake` for full vault ingestion and synchronization.
