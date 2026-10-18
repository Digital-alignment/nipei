# Project: Nipëi OS — Agent To-Do Kanban & Company Intake Vault Sync

## Architecture
Nipëi OS (`agent-os-nipei/source`) is a Next.js 16 (App Router) + React 19 + TypeScript 5 system styled with Tailwind CSS v4 using a Solid Dark & Dark Green Matrix design system.
The system connects to:
1. **Obsidian Vault** at `C:\Users\ondig\Desktop\DA\digitalalignment\` as the live single source of truth for business and brand operational data, adhering to the contract defined in `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`.
2. **Local Nipëi OS State** at `~/.nipei-os/` — CLI configuration (`config.json`) and runtime telemetry only. **No tasks live here.**
3. **Agent CLI Orchestration** interfacing with Claude Code (`claude`), OpenClaw (`openclaw`), Hermes (`hermes`), and Custom (`agy` / custom binaries) via `runner.ts` and `ultracodeProcs.ts`.
4. **Nipëi Vault (canonical)** at `C:\Users\ondig\Code\Nipei\nipei-vault` — the single source of truth for tasks (`Productivity/Tarefas/*.md`, `Todo_Audit_Lists/*.md`) and task workspaces (`Task_Workspace/YYYY/SQ-XX/TASK_ID/`). The DA vault in item 1 only holds the living notes (`Productos\Nipei OS.md`, `Clientes\Nipeihu.md`); it is not a task store.

### Single task store decision (2026-10-18)
There is ONE Kanban and ONE task store: the vault task notes, shown by the squad Kanban (`/kanban`, `SquadKanbanView`).
- Agent assignment is the `agents: ["claude", "hermes"]` frontmatter line on the task note (falls back to a per-squad default when absent). Written by the Kanban UI, `PATCH /api/agent-kanban` and Venu `assign`.
- `POST /api/agent-kanban/execute` `{ vaultPath, taskId?, squadId?, agent?, simulate? }` runs the first CLI-capable assigned agent against the note: status → `IA em Execução` → `Revisão` (exit 0) or `Bloqueado` (failure). Logs are appended to `executionLogs` in the task's `_workspace_meta.json` and returned by `GET /api/agent-kanban/attachments?taskId=…`.
- The old parallel store (`~/.nipei-os/agent-tasks.json`, `lib/agentTaskStore.ts`, `/api/agent-tasks`) was removed. The planned `/agents-todo` page is dropped: the squad Kanban already has the agent filter and the `IA em Execução` column.
- Hermes' own `kanban.db` (`lib/kanbanDb.ts`) stays read-only — it is Hermes' internal run queue, not an editable board.
- `tests/e2e/` still models the removed JSON store in its own engine; it needs rewriting against `/api/agent-kanban*` before M5.

### Data Flow
- **Vault Pre-population**: At startup or on demand, `vaultSyncEngine.ts` scans `Clientes/*.md` and `Productos/*.md`, extracts YAML frontmatter (preserving body markdown and `<!-- agente: antigravity -->`), and converts roadmap items and company profiles into live Nipëi OS state.
- **Agent Tasks**: vault task notes on the squad Kanban; agents assigned via `agents:` frontmatter and executed via `/api/agent-kanban/execute` (see "Single task store decision").
- **Company Intake**: The `/company-intake` UI wizard captures multi-department company profiles, team roles, services, financial metrics, and agent instructions, persisting to Obsidian notes via safe atomic write operations and updating local runtime configs.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Vault Discovery & Default Path | Update `defaultVault()` in `src/lib/config.ts` to include `Desktop/DA/digitalalignment` | M1 | Survey 2 & 3 |
| 2 | Vault Sync & Parser Engine | Implement `src/lib/vaultSyncEngine.ts` to parse and serialize `da-vault-schema` YAML notes safely without corrupting markdown bodies | M1 | Survey 3 |
| 3 | Automated Vault Pre-population API | `GET /api/vault/prefill` endpoint reading `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md` to pre-fill live company and task state | M1 | Original Request R3 |
| 4 | Agent Assignment in Vault | `agents:` frontmatter on task notes (`parseAgentsFrontmatter` / `setAgentsFrontmatter` in `kanbanGrounding.ts`) | M2 | Single-store decision |
| 5 | ~~Agent Tasks CRUD API~~ | Dropped — `/api/agent-kanban` GET/POST/PATCH is the CRUD | M2 | Single-store decision |
| 6 | Agent CLI Execution & Logs Hook | `POST /api/agent-kanban/execute` on vault task notes; logs in `_workspace_meta.json` | M2 | Survey 2 |
| 7 | ~~`/agents-todo` Route~~ | Dropped — squad Kanban `/kanban` covers it | M3 | Single-store decision |
| 8 | ~~`/agents-todo` Navigation~~ | Dropped | M3 | Single-store decision |
| 9 | ~~4-Column Kanban Task Board~~ | Dropped — squad Kanban columns incl. `IA em Execução` | M3 | Single-store decision |
| 10 | Agent Assignment Dropdown | Existing squad Kanban agent toggles, now persisted to `agents:` | M3 | Original Request R1 |
| 11 | Priority Badges & Filtering | Urgent, High, Medium, Low badges, live search, agent filter, and sorting | M3 | Original Request R1 |
| 12 | Execution Logs Drawer | Existing "Histórico IA" tab in task detail, now fed by real runs | M3 | Original Request R1 |
| 13 | Dedicated `/company-intake` Route | Multi-step interactive wizard in `src/app/company-intake/page.tsx` | M4 | Original Request R2 |
| 14 | Navigation Registration for Intake | Register `/company-intake` in `Sidebar.tsx` and `TopBar.tsx` | M4 | Survey 1 |
| 15 | Company Intake 4-Section Form | Company Profile, Client Accounts, Team & Agent Roles, Operational Procedures & Financials | M4 | Original Request R2 |
| 16 | Company Intake Persistence API | `POST /api/company/intake` writing to Obsidian vault notes (`Clientes/*.md`) and local config | M4 | Original Request R2 |
| 17 | Zero TS Errors Build Verification | `npm run build` cleanly compiles in `agent-os-nipei/source` | M5 | Verification Plan |
| 18 | Vault Schema Compliance Check | `npm run vault:check` verifies zero errors against modified notes | M5 | Verification Plan |
| 19 | Opaque-Box E2E Test Suite | 4-Tier requirement-driven test suite validating all functionality | E2E Track | Verification Plan |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Test harness, 4-tier opaque-box test suite, publish `TEST_READY.md` | none | IN_PROGRESS |
| 1 | Vault Engine & Auto-population | `vaultSyncEngine.ts`, `config.ts` vault path, `GET /api/vault/prefill`, `Clientes/Nipeihu.md` parsing | none | IN_PROGRESS |
| 2 | Agent Tasks Backend & Execution | vault `agents:` field, `/api/agent-kanban/execute`, workspace logs | M1 | DONE (2026-10-18) |
| 3 | Agent Kanban View | Squad Kanban dispatch wired to real runner, agent toggles persisted, logs loaded | M2 | DONE (2026-10-18) |
| 4 | Company Intake UI & Sync | `/company-intake` wizard, intake form sections, persistence to vault & config | M1, M2 | PLANNED |
| 5 | Dual-Track Acceptance & Audit | Run full E2E test suite, `npm run build`, `npm run vault:check`, adversarial review & audit | E2E, M3, M4 | PLANNED |

## Interface Contracts

### Vault Sync Engine (`src/lib/vaultSyncEngine.ts`)
```typescript
export interface VaultNoteData {
  id: string;
  nombre: string;
  tipo?: "cliente_externo" | "producto_propio" | "agencia_madre";
  estado?: "activo" | "transicion" | "pausado" | "archivado";
  emoji?: string;
  categoria?: string;
  rubro?: "ecommerce" | "turismo_retiros" | "comunidad_cultura" | "producto_saas" | "agencia";
  dominio?: string;
  hosting?: string;
  repo_github?: string;
  repo_local?: string;
  stack?: string[];
  relaciones?: string[];
  servicios_vps?: string[];
  proyectos?: Array<{ id: string; nombre: string; estado?: string; objetivo?: string; tecnologias?: string[] }>;
  roadmap?: Array<{ id: string; texto: string; prioridad?: "urgente" | "alta" | "media" | "baja"; hecho?: boolean; estado?: string; orden?: number }>;
  historial?: Array<{ fecha: string; texto: string; tags?: string[] }>;
  servicios?: Array<{ id: string; tipo: "wordpress" | "hosting" | "email" | "elearning" | "otro"; nombre: string; url?: string; credencial_ref?: string; estado?: "configurado" | "pendiente" }>;
  extra?: Record<string, unknown>;
  bodyMarkdown: string;
}

export function readVaultNote(noteRelativePath: string): Promise<VaultNoteData | null>;
export function writeVaultNote(noteRelativePath: string, data: Partial<VaultNoteData>): Promise<{ success: boolean; error?: string }>;
export function parseAllClients(): Promise<VaultNoteData[]>;
```

### Vault task note (agent fields) — `Productivity/Tarefas/*.md`
```yaml
---
id: "task_123456"
title: "..."
status: "A fazer"   # A fazer | Em andamento | IA em Execução | Revisão | Bloqueado | Concluído | Arquivado
priority: "Alta"
squad: "squad_6_infra"
agents: ["claude", "hermes"]   # first CLI-capable one (claude|openclaw|hermes|custom) is run by /api/agent-kanban/execute
---
```

## Code Layout
- `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` — Core vault parsing and serialization with `da-vault-schema` guarantees.
- `agent-os-nipei/source/src/lib/config.ts` — Enhanced vault root discovery and Windows CLI path compatibility.
- `agent-os-nipei/source/src/app/api/vault/prefill/route.ts` — Pre-population endpoint for startup company data.
- `agent-os-nipei/source/src/app/api/agent-kanban/execute/route.ts` — Agent CLI execution on vault task notes.
- `agent-os-nipei/source/src/app/api/company/intake/route.ts` — Company intake persistence API.
- `agent-os-nipei/source/src/app/company-intake/page.tsx` — Company information intake UI wizard.
- `agent-os-nipei/source/src/components/Sidebar.tsx` — Navigation panel route registration.
- `agent-os-nipei/source/src/components/TopBar.tsx` — Top bar page metadata registration.
- `tests/e2e/` — E2E test suite and verification runners.
