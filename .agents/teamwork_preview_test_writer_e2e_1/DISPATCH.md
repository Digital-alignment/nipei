## 2026-09-04T23:46:39Z

You are the E2E Test Writer for Nipëi OS.
Your working directory is: `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_test_writer_e2e_1`.
You MUST read the original request verbatim at:
`c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md`

Read the project specification at:
`c:\Users\ondig\Code\DA\nipei control\PROJECT.md`

Read the vault schema contract at:
`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`

Your mission:
1. Design and implement the complete E2E testing framework under `c:\Users\ondig\Code\DA\nipei control\tests\e2e\`.
2. Follow the 4-tier opaque-box methodology:
   - Tier 1: Feature Coverage (>=5 test cases per feature for tasks, kanban, vault sync, pre-population, CLI configs).
   - Tier 2: Boundary & Corner Cases (empty tasks, invalid yaml, missing frontmatter, edge status transitions).
   - Tier 3: Cross-Feature Combinations (task board status updates reflected into vault roadmap items and vice-versa).
   - Tier 4: Real-World Scenarios (full startup prefill from Clientes/Nipeihu.md, company intake submission, and vault check).
3. Create a reliable, standalone test runner script (e.g. `tests/e2e/runner.mjs` or `ts-node`/`node`) that can be executed with exit code 0 when all tests pass.
4. Create `c:\Users\ondig\Code\DA\nipei control\TEST_INFRA.md` adhering to the standard template.
5. When all test suites and runners are built and ready, publish `c:\Users\ondig\Code\DA\nipei control\TEST_READY.md`.
6. Write your handoff report to `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_test_writer_e2e_1\handoff.md`.
7. Send a message to the orchestrator upon completion.
