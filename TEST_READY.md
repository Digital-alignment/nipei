# TEST_READY — Nipëi OS E2E Suite

**Date**: 2026-10-18
**Command**: `node tests/e2e/runner.mjs` (from `nipei-control/`)
**Result**: 46/46 passing, exit code 0 (self-started `next dev -p 3123`, canonical vault)

The suite was rewritten after the single-task-store consolidation: it no longer models the removed
`~/.nipei-os/agent-tasks.json` store, `/api/agent-tasks` or `/agents-todo`. It drives the real
`/api/agent-kanban` routes over HTTP against vault task notes. Setup, safety rules and layout: `TEST_INFRA.md`.

```
► Tier 1 - Feature 1: GET /api/agent-kanban lists vault notes          5/5
► Tier 1 - Feature 2: POST /api/agent-kanban creates a vault note      5/5
► Tier 1 - Feature 3: PATCH /api/agent-kanban updates the note         6/6
► Tier 1 - Feature 4: POST /api/agent-kanban/execute (simulate)        5/5
► Tier 1 - Feature 5: GET /api/agent-kanban/attachments workspace      4/4
► Tier 2: Boundary, Corner Cases & Adversarial Verification           10/10
► Tier 3: Cross-Feature Combinations                                   6/6
► Tier 4: Real-World Scenarios & Production Acceptance                 5/5
Total: 46 passed, 0 failed (~6 s after server warm-up)
```

## Bug found and fixed by the suite

`POST /api/agent-kanban/execute` checked the `Productivity/Tarefas/` prefix on the raw request string, so
`Productivity/Tarefas/../other.md` passed and the route rewrote the `status:` line of a note outside the task
folders. `resolveTaskPath` now re-checks the folder on the resolved path (test 2.5).

## Known gaps (not covered)

- `POST /api/agent-kanban` writes `title` unescaped into YAML; a title containing `"` breaks the frontmatter.
- Real CLI runs (`forceReal`) and the `Todo_Audit_Lists` path of `execute` are not exercised (they would spawn
  agents or write to real audit notes).
- Attachments upload/deliverables/dispatch routes are not covered.
