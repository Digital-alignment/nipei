# Project: Nipëi OS — Agent To-Do Kanban & Company Intake Vault Sync

## Architecture
Nipëi OS (`agent-os-nipei/source`) is a Next.js 16 (App Router) + React 19 + TypeScript 5 system styled with Tailwind CSS v4 using a Solid Dark & Dark Green Matrix design system.
The system connects to:
1. **Obsidian Vault** at `C:\Users\ondig\Desktop\DA\digitalalignment\` as the live single source of truth for business and brand operational data, adhering to the contract defined in `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`.
2. **Local Nipëi OS State** at `~/.nipei-os/` storing agent tasks (`agent-tasks.json`), CLI configuration (`config.json`), and process execution telemetry.
3. **Agent CLI Orchestration** interfacing with Claude Code (`claude`), OpenClaw (`openclaw`), Hermes (`hermes`), and Custom (`agy` / custom binaries) via `runner.ts` and `ultracodeProcs.ts`.

### Data Flow
- **Vault Pre-population**: At startup or on demand, `vaultSyncEngine.ts` scans `Clientes/*.md` and `Productos/*.md`, extracts YAML frontmatter (preserving body markdown and `<!-- agente: antigravity -->`), and converts roadmap items and company profiles into live Nipëi OS state.
- **Agent Tasks**: The `/agents-todo` interactive Kanban board manages tasks across 4 canonical statuses (`backlog`, `in_progress`, `review`, `done`), persists changes to `~/.nipei-os/agent-tasks.json`, triggers execution via `/api/agent-tasks/execute`, and synchronizes with corresponding `roadmap` items in Obsidian vault notes.
- **Company Intake**: The `/company-intake` UI wizard captures multi-department company profiles, team roles, services, financial metrics, and agent instructions, persisting to Obsidian notes via safe atomic write operations and updating local runtime configs.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Vault Discovery & Default Path | Update `defaultVault()` in `src/lib/config.ts` to include `Desktop/DA/digitalalignment` | M1 | Survey 2 & 3 |
| 2 | Vault Sync & Parser Engine | Implement `src/lib/vaultSyncEngine.ts` to parse and serialize `da-vault-schema` YAML notes safely without corrupting markdown bodies | M1 | Survey 3 |
| 3 | Automated Vault Pre-population API | `GET /api/vault/prefill` endpoint reading `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md` to pre-fill live company and task state | M1 | Original Request R3 |
| 4 | Agent Tasks Data Model & Storage | Define `AgentTask` schema and atomic storage at `~/.nipei-os/agent-tasks.json` with mutex and backup safety | M2 | Survey 2 |
| 5 | Agent Tasks CRUD API | `GET /api/agent-tasks`, `POST /api/agent-tasks`, `PATCH /api/agent-tasks`, `DELETE /api/agent-tasks` | M2 | Original Request R1 |
| 6 | Agent CLI Execution & Logs Hook | `POST /api/agent-tasks/execute` supporting Claude Code, OpenClaw, Hermes, and Custom with process streaming and simulation fallback | M2 | Survey 2 |
| 7 | Dedicated `/agents-todo` Route | Implement `src/app/agents-todo/page.tsx` with full Shell layout support | M3 | Original Request R1 |
| 8 | Navigation & TopBar Registration | Register `/agents-todo` in `src/components/Sidebar.tsx` and `src/components/TopBar.tsx` | M3 | Survey 1 |
| 9 | 4-Column Kanban Task Board | Interactive drag/drop or move board: Backlog, In Progress, Review, Done | M3 | Original Request R1 |
| 10 | Agent Assignment Dropdown | Assign tasks to Claude Code, OpenClaw, Hermes, or Custom with avatar badges | M3 | Original Request R1 |
| 11 | Priority Badges & Filtering | Urgent, High, Medium, Low badges, live search, agent filter, and sorting | M3 | Original Request R1 |
| 12 | Execution Logs Drawer | Slide-over monospace viewer with timestamped execution logs and copy-to-clipboard | M3 | Original Request R1 |
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
| 2 | Agent Tasks Backend & Execution | `agent-tasks` store, CRUD API routes, execution hook, vault roadmap sync | M1 | PLANNED |
| 3 | Agent To-Do Kanban View | `/agents-todo` page, Sidebar/TopBar integration, 4 columns, agent dropdown, logs viewer | M2 | PLANNED |
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

### Agent Task Store (`src/lib/agentTaskStore.ts`)
```typescript
export type TaskColumnStatus = "backlog" | "in_progress" | "review" | "done";
export type AgentCliType = "claude" | "openclaw" | "hermes" | "custom";
export type TaskPriority = "urgente" | "alta" | "media" | "baja";

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: TaskColumnStatus;
  priority: TaskPriority;
  assignedAgent: AgentCliType;
  customBinaryPath?: string;
  tags?: string[];
  clientNoteId?: string; // e.g. "nipeihu"
  vaultRoadmapId?: string; // e.g. "agente-whatsapp-clientes"
  executionLogs?: Array<{ timestamp: string; message: string; level: "info" | "warn" | "error" | "output" }>;
  createdAt: string;
  updatedAt: string;
}
```

## Code Layout
- `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` — Core vault parsing and serialization with `da-vault-schema` guarantees.
- `agent-os-nipei/source/src/lib/agentTaskStore.ts` — Task state management and local atomic storage.
- `agent-os-nipei/source/src/lib/config.ts` — Enhanced vault root discovery and Windows CLI path compatibility.
- `agent-os-nipei/source/src/app/api/vault/prefill/route.ts` — Pre-population endpoint for startup company data.
- `agent-os-nipei/source/src/app/api/agent-tasks/route.ts` — Task CRUD API.
- `agent-os-nipei/source/src/app/api/agent-tasks/execute/route.ts` — Agent CLI execution and log streaming hook.
- `agent-os-nipei/source/src/app/api/company/intake/route.ts` — Company intake persistence API.
- `agent-os-nipei/source/src/app/agents-todo/page.tsx` — Agent To-Do & Kanban interactive dashboard.
- `agent-os-nipei/source/src/app/company-intake/page.tsx` — Company information intake UI wizard.
- `agent-os-nipei/source/src/components/Sidebar.tsx` — Navigation panel route registration.
- `agent-os-nipei/source/src/components/TopBar.tsx` — Top bar page metadata registration.
- `tests/e2e/` — E2E test suite and verification runners.
