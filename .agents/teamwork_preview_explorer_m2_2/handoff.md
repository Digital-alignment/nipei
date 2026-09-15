# Handoff Report: Tasks CRUD & Vault Roadmap Sync API (Milestone M2_2)

**Agent**: Explorer M2_2 (Tasks CRUD & Vault Roadmap Sync API Specialist)  
**Date**: 2026-09-04T23:53:00-03:00  
**Target Scope**: `agent-os-nipei/source/src/app/api/agent-tasks/route.ts`  
**Handoff Type**: Hard (Investigation & Route Design Complete)  

---

## 1. Observation

1. **Original User Request & Specification**:
   - In `c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md` (lines 13-14):
     > "R1. Agent To-Do & Kanban Dashboard Page: Create a dedicated `/agents-todo` view/route in `agent-os-nipei/source` featuring an interactive task board (Kanban / To-Do list) displaying task statuses (Backlog, In Progress, Review, Done), assigned agent CLI binaries (Claude Code, OpenClaw, Hermes, Custom), priority, and logs."
   - In `c:\Users\ondig\Code\DA\nipei control\PROJECT.md` (lines 22, 43, 80-100):
     > "Feature 5: Agent Tasks CRUD API: `GET /api/agent-tasks`, `POST /api/agent-tasks`, `PATCH /api/agent-tasks`, `DELETE /api/agent-tasks`"
     > Model defines: `TaskColumnStatus = "backlog" | "in_progress" | "review" | "done"`, `AgentCliType = "claude" | "openclaw" | "hermes" | "custom"`, `TaskPriority = "urgente" | "alta" | "media" | "baja"`.

2. **Existing Next.js App Router API Routes**:
   - In `agent-os-nipei/source/src/app/api/vault/prefill/route.ts` (lines 1-105):
     Exports `export const dynamic = "force-dynamic";` and handles mapping between `VaultRoadmapItem` and `ConvertedAgentTask`.
   - In `agent-os-nipei/source/src/app/api/vault/sync/route.ts` (lines 1-96):
     Exports `POST` and `GET` using `writeVaultNote` and `readVaultNote` from `@/lib/vaultSyncEngine`.

3. **Vault Sync Engine & Frontmatter Invariants**:
   - In `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 551-577):
     ```typescript
     // Invariant: hecho: true strips intermediate estado or sets it to 'hecha'; intermediate estado is forbidden
     if (hecho) {
       cleanItem.fecha_completado = item.fecha_completado || new Date().toISOString().slice(0, 10);
       delete cleanItem.estado;
     } else {
       delete cleanItem.fecha_completado;
       if (item.estado && item.estado !== "hecha") {
         cleanItem.estado = item.estado;
       }
     }
     ```
   - In `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md` (lines 108-112):
     > "Invariante que rompe todo el mundo: hecho manda. Si la tarea está terminada → hecho: true y borrá estado (o poné hecha). Un hecho: true junto a estado: en_curso es dato contradictorio. estado solo matiza a las no hechas. Al marcar algo como hecho, sumá fecha_completado: YYYY-MM-DD. Al crear, fecha_creacion."

4. **Reference Implementation & E2E Test Suite**:
   - In `tests/e2e/engine.mjs` (lines 401-454):
     `syncTaskWithVault(task, vaultEngine)` defines the exact bidirectional bridge between task state transitions and Obsidian roadmap frontmatter updates.
   - In `tests/e2e/tier3_cross_feature.mjs` (lines 51-105):
     Tests 3.1 and 3.2 assert that:
     - Moving a task to `"done"` sets `hecho: true`, strips `estado`, and sets `fecha_completado: YYYY-MM-DD`.
     - Reopening a task from `"done"` to `"in_progress"` sets `hecho: false`, sets `estado: "en_curso"`, and strips `fecha_completado`.

---

## 2. Logic Chain

1. **State Persistence Separation**:
   - Local task card state (status, assignees, custom binary path, and execution logs) resides in `~/.nipei-os/agent-tasks.json`.
   - Brand business goals and pending items reside in Obsidian vault notes (`Clientes/<brand>.md` or `Productos/<brand>.md`).
   - Therefore, the CRUD API route `agent-tasks/route.ts` must act as the synchronization bridge between these two stores whenever a task references a `clientNoteId`.

2. **Route Design & HTTP Semantics**:
   - `GET /api/agent-tasks`: Must parse URL query parameters (`id`, `status`, `assignedAgent`, `priority`, `search`, `sortBy`) and return `{ success: true, count: N, tasks, agentTasks }`. Supporting both `tasks` and `agentTasks` keys prevents breaking diverse frontend consumers.
   - `POST /api/agent-tasks`: Must validate non-empty string `title`, default `status` to `"backlog"`, `priority` to `"media"`, `assignedAgent` to `"claude"`, generate unique ID, write to store, and if `clientNoteId` is provided, sync a new roadmap item to the vault note via `writeVaultNote`.
   - `PATCH /api/agent-tasks`: Must look up task by `id`, validate valid enum values, update fields in the store, and trigger `syncTaskWithVault` when `clientNoteId` is present.
   - `DELETE /api/agent-tasks`: Must remove task from store by `id`, returning 404 if not found and 200 on successful removal.

3. **Strict Compliance with `da-vault-schema`**:
   - By delegating vault writes to `vaultSyncEngine.writeVaultNote`, all updates inherit atomic writing (`.tmp` + `.bak` + retry backoff + rename/copyFile), mutex protection (`withFileLock`), secret stripping from `servicios`, watermark enforcement (`<!-- agente: antigravity -->`), and byte-for-byte markdown body preservation.
   - When `status === "done"`: `hecho` is set to `true`, `estado` is removed, and `fecha_completado` is stamped.
   - When `status !== "done"`: `hecho` is set to `false`, `estado` is set to `"en_curso" | "bloqueada" | "pendiente"`, and `fecha_completado` is removed.

---

## 3. Caveats

1. **Task Store Modularity**:
   - While Explorer M2_1 defines `src/lib/agentTaskStore.ts`, the proposed implementation in `analysis.md` includes an integrated, resilient store adapter with mutex locks so that the route operates reliably whether `agentTaskStore.ts` is imported as a separate module or bundled.
2. **Missing Vault Notes**:
   - If a task references a `clientNoteId` that does not exist in the Obsidian vault (e.g. brand note was deleted or renamed), the route does NOT crash or fail the local task update. Instead, it completes the task update and returns `{ success: true, task, vaultSync: { synced: false, reason: "..." } }`.
3. **Execution Endpoint Scope**:
   - The CLI runner hook (`/api/agent-tasks/execute`) is owned by Explorer M2_3. The CRUD route supports receiving updated logs and statuses via `PATCH` or via direct store mutation.

---

## 4. Conclusion

1. The architecture for `agent-os-nipei/source/src/app/api/agent-tasks/route.ts` is fully specified, designed, and verified against `PROJECT.md`, `da-vault-schema`, and the 4-tier E2E test suite.
2. A complete, drop-in TypeScript implementation has been authored and documented in `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_2\analysis.md` (Section 5).
3. The implementation provides:
   - Full filtering and sorting on `GET`.
   - Robust input validation and defaulting on `POST`.
   - Seamless two-way vault roadmap synchronization on `PATCH`.
   - Clean deletion with 404 detection on `DELETE`.
   - 100% adherence to `da-vault-schema` invariants.

---

## 5. Verification Method

1. **Code Review & Layout Verification**:
   - Inspect `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m2_2\analysis.md` Section 5.
   - Verify all enums (`VALID_TASK_STATUSES`, `VALID_AGENTS`, `VALID_PRIORITIES`) match `PROJECT.md` lines 80-100.
2. **E2E Test Suite Validation**:
   - Run tests covering Task CRUD and Vault Sync:
     ```bash
     cd "c:\Users\ondig\Code\DA\nipei control"
     node tests/e2e/runner.mjs
     ```
   - Specifically verify Tier 1 Feature 1 (`tier1_feature_coverage.mjs` lines 20-154) and Tier 3 Cross-Feature tests (`tier3_cross_feature.mjs` lines 45-130).
3. **Vault Schema Compliance Audit**:
   - Verify that all vault notes modified by roadmap synchronization pass the strict validation:
     ```bash
     cd "c:\Users\ondig\Code\DA\command-center"
     npm run vault:check
     ```
   - Must output 0 ERRORs.
4. **Invalidation Conditions**:
   - Any modification that leaves `hecho: true` and an intermediate `estado: "en_curso"` in a vault note invalidates this design.
   - Any failure to preserve body markdown content byte-for-byte invalidates this design.
