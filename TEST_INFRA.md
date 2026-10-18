# TEST_INFRA — Nipëi OS E2E Tests

**What is tested**: the single task store — markdown task notes in the canonical vault
(`C:\Users\ondig\Code\Nipei\nipei-vault\Productivity\Tarefas`) — through the real API routes of
`agent-os-nipei/source` (Next.js 16). No reimplementation of the store lives in the tests.

The removed JSON store (`~/.nipei-os/agent-tasks.json`, `/api/agent-tasks`, `/agents-todo`) is not tested;
see `PROJECT.md` → "Single task store decision" and `CLAUDE.md` Fase 6.

## Run

```bash
node tests/e2e/runner.mjs
```

- With nothing on `:3123`, the runner starts `npx next dev -p 3123` in `agent-os-nipei/source`
  with `VAULT_PATH` set, waits for `/api/agent-kanban`, and kills it at the end (first compile ~30–90 s).
- `E2E_BASE_URL=http://localhost:3000` reuses a running dev server instead (it must use the same vault).
- `E2E_PORT` changes the port of the self-started server; `VAULT_PATH` changes the vault (default the canonical one).
- Exit code 0 = all passed.

## Safety (the vault is live)

- Tests create only notes/folders containing `zz_e2e` (`Productivity/Tarefas/zz_e2e_<hex>.md`,
  POST-created `task_NNNN_zz_e2e_….md`, `Task_Workspace/<year>/<squad>/zz_e2e_…`).
- Every executed run passes an explicit `taskId: zz_e2e_…` so its workspace folder is ours.
- `execute` is always called with `simulate: true` — no agent CLI is ever spawned.
- `cleanupAll()` deletes only names containing `zz_e2e`; it runs after each suite, before the run
  (leftovers from an aborted run) and in the runner's `finally`.
- The runner snapshots size+mtime of every real Tarefas note before and after; any change fails the run.

## Layout (`tests/e2e/`)

| File | Role |
|---|---|
| `runner.mjs` | Starts/reuses the server, real-task snapshot guard, runs tiers, cleanup |
| `harness.mjs` | Zero-dependency `describe/test/expect` + hooks + report |
| `engine.mjs` | HTTP client (`api.listTasks/createTask/patchTask/execute/workspace`, `simRun`, `findTask`), `ensureServer` |
| `fixtures.mjs` | `VAULT_ROOT`, `writeTempNote`, `uid`, `cleanupAll`, `snapshotRealTasks` |
| `validator.mjs` | `readNote` (frontmatter/body/agents from disk), `validateTaskNote`, `KANBAN_COLUMNS` |
| `tier1_feature_coverage.mjs` | GET list, POST create, PATCH update, execute, attachments (25 tests) |
| `tier2_boundary_corner.mjs` | 400s, path rejection/traversal, backslashes, unicode, empty agents, id fallback (10) |
| `tier3_cross_feature.mjs` | POST/PATCH agents → execute agent choice, log accumulation, body preservation (6) |
| `tier4_real_world.mjs` | Real vault listing, full lifecycle, parallel POST/execute, cleanup check (5) |

## Endpoints covered

| Endpoint | Contract checked |
|---|---|
| `GET /api/agent-kanban` | `{success, count, tasks}`; `agents:` frontmatter wins over squad defaults; status → column mapping |
| `POST /api/agent-kanban` | 400 without title; note in `Productivity/Tarefas`; `agents:` from `assignedAgents` (default antigravity+hermes); priority/squad |
| `PATCH /api/agent-kanban` | 400 without `vaultPath`; `assignedAgents` replaces/adds `agents:` line; column → status; squad; `executionLog`; `status: done/archived`; missing note = no-op |
| `POST /api/agent-kanban/execute` | `simulate:true` → `IA em Execução` → `Revisão`; first CLI agent (claude/openclaw/hermes/custom) or request `agent`; 400 for paths outside `Productivity/Tarefas` / `Todo_Audit_Lists`, `..` traversal, non-.md, absolute, missing |
| `GET /api/agent-kanban/attachments?taskId=` | `executionLogs` match the run; `workspacePath` under `Task_Workspace/<year>/<squad>/`; 400 without params |
