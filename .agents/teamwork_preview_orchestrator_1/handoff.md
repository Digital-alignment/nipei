# Orchestrator Soft Handoff — Generation 1 to Generation 2

**Context**: Project Orchestration for Nipëi OS — Agent To-Do Kanban & Company Intake Vault Sync.
**Spawn Threshold**: Reached 20 / 16. All 20 subagents completed and retired. Zero active subagents. Executing self-succession.

---

## 1. Milestone State

| Milestone | Status | Details |
|---|---|---|
| **E2E Testing Track** | **DONE** | Standalone opaque-box test suite under `tests/e2e/`. All 50/50 test cases passing. `TEST_INFRA.md` & `TEST_READY.md` published. |
| **Milestone 1: Vault Engine & Auto-population** | **DONE (PASSED GATE)** | Implemented in `src/lib/vaultSyncEngine.ts`, `src/lib/config.ts`, `api/vault/prefill`, `api/vault/sync`. Certified PASS in Gate Iteration 2 by 2 Reviewers, 2 Challengers (17/17 Unicode & 13/13 multi-process stress tests passed), and Forensic Auditor (CLEAN, 0 vault check errors across 12 brands). |
| **Milestone 2: Agent Tasks Backend & Execution API** | **NOT STARTED (NEXT UP)** | Ready for immediate dispatch. Needs `src/lib/agentTaskStore.ts`, `api/agent-tasks/route.ts`, and `api/agent-tasks/execute/route.ts`. |
| **Milestone 3: Agent To-Do & Kanban Dashboard View** | **NOT STARTED** | `/agents-todo` route with 4 columns, agent dropdown, priority badges, logs drawer, and navigation links. |
| **Milestone 4: Company Information Intake UI & Sync** | **NOT STARTED** | `/company-intake` route with multi-section form, live vault persistence, and navigation links. |
| **Milestone 5: Acceptance & Hardening** | **NOT STARTED** | Run full 50 E2E tests, Next.js production build (`npm run build`), Obsidian vault check (`npm run vault:check`), adversarial review, and final forensic audit. |

---

## 2. Active Subagents
- **None**. All 20 spawned subagents have completed and delivered their handoffs. Per the Iron Rule, no subagent may be reused. Successor will spawn fresh agents for Milestone 2.

---

## 3. Observation & Logic Chain
1. **Milestone 1 Journey & Hardening**:
   - In Iteration 1, Challenger 2 identified two critical Windows-specific concurrency edge cases:
     - Mutex lock bypass due to case-insensitivity differences on NTFS (`Clientes/Nipeihu.md` vs `Clientes/nipeihu.md`).
     - Windows kernel sharing violations (`EBUSY`/`EPERM`/`ENOENT`) during rapid atomic rename/copy operations under multi-process contention.
   - In Iteration 2, we dispatched 3 focused Explorers, followed by Worker M1_3.
   - Worker M1_3 implemented:
     - `getLockKey(filePath)`: Lowercases resolved paths on Windows.
     - `withFileLock`: Ensures identical Promise chain for all path variants and unregisters drained queues.
     - `isTransientFsError`: Identifies Windows transient error codes.
     - `calculateBackoffWithJitter`: Exponential backoff with jitter.
     - `readFileWithRetry` & `atomicReplaceWithRetry`: Tier 1 rename retries + Tier 2 copyFile fallback in `try ... finally` blocks (zero orphaned `.tmp` files).
   - Gate Iteration 2 resulted in unanimous **PASS**:
     - Reviewer 1: APPROVE
     - Reviewer 2: APPROVE
     - Challenger 1: APPROVE (17/17 stress assertions passed)
     - Challenger 2: APPROVE (13/13 multi-process stress tests passed, zero lost updates)
     - Forensic Auditor: CLEAN (`npm run vault:check` 0 errors, no hardcoding, strict `da-vault-schema` compliance)
2. **Next Milestone Architecture**:
   - The foundation is solid. Successor can now proceed directly to Milestone 2: Agent Tasks Backend & Execution API.

---

## 4. Pending Decisions & Caveats
- **DISPATCH-ONLY Rule**: You are a dispatch-only orchestrator. NEVER write application code or run build/test commands directly. You only write/edit metadata `.md` files in your `.agents/` folder.
- **Mandatory Worker Integrity Warning**: Always include the verbatim integrity warning ("DO NOT CHEAT...") in all Worker dispatches.
- **da-vault-schema Rules**: Always uphold the schema invariants: frontmatter YAML only, closed enums, task completion invariant (`hecho: true` strips `estado` and sets `fecha_completado`), byte-for-byte markdown body preservation, `<!-- agente: antigravity -->` watermark as line 1 of body, and plaintext secret stripping.

---

## 5. Remaining Work & Concrete Next Steps for Successor

### Immediate Next Step: Execute Milestone 2 (Agent Tasks Backend & Execution API)

1. **Working Directory & Subagents**:
   - Create directories under `.agents/` for M2 subagents (e.g. `teamwork_preview_worker_m2_1/`, `teamwork_preview_reviewer_m2_1/`, etc.).
2. **Milestone 2 Scope**:
   - **`src/lib/agentTaskStore.ts`**:
     - Define `AgentTask` interface:
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
     - Implement task CRUD functions: `getTasks()`, `getTaskById(id)`, `createTask(data)`, `updateTask(id, data)`, `deleteTask(id)`.
     - Persist tasks to `~/.nipei-os/agent-tasks.json` with directory creation (`fs.mkdirSync(dir, { recursive: true })`), atomic replacement (`.tmp` -> rename), and mutex protection via `withFileLock`.
     - Seed default initial tasks if the file doesn't exist yet (or load tasks pre-populated from `api/vault/prefill`).
     - Bidirectional vault sync: When a task with `clientNoteId` and `vaultRoadmapId` transitions to `done`, call `vaultSyncEngine.writeVaultNote` to mark the corresponding roadmap item `hecho: true` (which strips `estado` and sets `fecha_completado`).
   - **`src/app/api/agent-tasks/route.ts`**:
     - `GET`: Return list of tasks with optional query filters (`status`, `assignedAgent`, `priority`).
     - `POST`: Validate and create a new task.
     - `PATCH`: Update task status, priority, agent, or append execution log.
     - `DELETE`: Delete a task by ID.
   - **`src/app/api/agent-tasks/execute/route.ts`**:
     - `POST`: Accept `{ taskId, commandArgs? }`.
     - Lookup task in `agentTaskStore`.
     - Inspect `assignedAgent` (`claude`, `openclaw`, `hermes`, `custom`).
     - Check if binary exists using `which` from `src/lib/config.ts`. If CLI binary is installed on machine, spawn process; if not or if simulated/development, stream/append simulated realistic telemetry log output:
       - `[info] Starting agent: claude for task: ...`
       - `[output] Analyzing target repository...`
       - `[output] Executing action items...`
       - `[info] Task execution completed successfully.`
     - Update task status to `in_progress` during execution, then `review` or `done` upon completion.
     - Append timestamped logs to task's `executionLogs`.
3. **Dispatch Worker M2**:
   - Spawn `teamwork_preview_worker` with M2 scope, write ownership, and mandatory integrity warning.
   - Worker must verify by running `npm run build` in `agent-os-nipei/source` and `node tests/e2e/runner.mjs`.
4. **Gate Review**:
   - Spawn 2 Reviewers, 2 Challengers, and 1 Forensic Auditor.
   - Evaluate all verdicts in `GATE_STATUS.md`.
5. **Subsequent Milestones**:
   - Milestone 3: Agent To-Do Kanban View (`/agents-todo`, `Sidebar.tsx`, `TopBar.tsx`).
   - Milestone 4: Company Information Intake UI & Sync (`/company-intake`).
   - Milestone 5: Final Acceptance & Audit.

---

## 6. Key Artifacts
- `c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_orchestrator_1\DISPATCH.md`
- `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_orchestrator_1\BRIEFING.md`
- `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_orchestrator_1\progress.md`
- `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_orchestrator_1\GATE_STATUS.md`
- `c:\Users\ondig\Code\DA\nipei control\PROJECT.md`
- `c:\Users\ondig\Code\DA\nipei control\TEST_INFRA.md`
- `c:\Users\ondig\Code\DA\nipei control\TEST_READY.md`

---

## 7. Parent Passthrough Reminder
- Your parent is: **`10169454-f756-4dc8-b4f1-dadad7e97e9d`**.
- All status reporting, escalations, and completion messages MUST be sent to this ID.
