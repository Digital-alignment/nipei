## 2026-09-05T01:51:18Z

You are Worker M1_3 (Vault Engine Remediation Worker).
Your working directory is: `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_worker_m1_3`.
You MUST read the original request verbatim at:
`c:\Users\ondig\Code\DA\nipei control\.agents\ORIGINAL_REQUEST.md`

Read the project specification at:
`c:\Users\ondig\Code\DA\nipei control\PROJECT.md`

Read the vault schema contract at:
`C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`

Read Challenger 2's failure report at:
`c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_challenger_m1_2\handoff.md`

Read Explorer 1's report (Mutex Canonicalization) at:
`c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m1_iter2_1\handoff.md`

Read Explorer 2's report (Windows Retry Backoff & Jitter) at:
`c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m1_iter2_2\handoff.md`

Read Explorer 3's proposed engine implementation and tests at:
`c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_explorer_m1_iter2_3\proposed_vaultSyncEngine.ts`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your exclusive write ownership:
- `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`

Your mission:
1. Update `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`:
   - Implement `getLockKey(filePath: string): string`:
     ```typescript
     export function getLockKey(filePath: string): string {
       const resolved = path.resolve(filePath);
       return process.platform === "win32" ? resolved.toLowerCase() : resolved;
     }
     ```
   - Update `withFileLock` to use `getLockKey(filePath)` and clean up resolved queues upon completion.
   - Implement `isTransientFsError(code?: string): boolean` covering EBUSY, EPERM, EACCES, ENOENT, EMFILE, ENFILE.
   - Implement `calculateBackoffWithJitter(attempt: number, initialDelayMs = 25, maxDelayMs = 200): number`.
   - Implement `readFileWithRetry(filePath: string, maxRetries = 6): Promise<string>` to absorb transient file locks.
   - Implement `atomicReplaceWithRetry(tmpPath: string, targetPath: string, maxRetries = 6): Promise<void>` with two tiers (Tier 1: rename retries, Tier 2: copyFile retries).
   - In `writeVaultNote`:
     - Read existing note using `readFileWithRetry(targetPath)`.
     - In multi-process scenarios, if existing content is read, verify that if the file had content, `splitFrontmatter` parsed it before proceeding (or retry if empty read was returned during an in-flight write).
     - Protect the atomic replacement inside a `try ... finally` block ensuring `fs.promises.unlink(tmpPath).catch(() => {})` runs unconditionally.
     - Strictly preserve all `da-vault-schema` invariants:
       - YAML frontmatter only (closed enums, strict keys).
       - Task invariant: `hecho: true` strips intermediate `estado` and ensures `fecha_completado`.
       - Secret stripping: remove password, token, api_key, clave fields.
       - Markdown body preserved byte-for-byte with `<!-- agente: antigravity -->` watermark as line 1 of body.
2. Verification commands:
   - Run `node tests/challenger_m1_2/test_case_race.mjs` (must show zero lost updates).
   - Run `node tests/challenger_m1_2/stress_runner.mjs` (all 13 stress tests must pass).
   - Run `node tests/e2e/runner.mjs` (all 50 E2E tests must pass).
   - Run `npm run build` in `agent-os-nipei/source` (must exit code 0 with zero errors).
3. Write your handoff report to `c:\Users\ondig\Code\DA\nipei control\.agents\teamwork_preview_worker_m1_3\handoff.md`.
4. Send a message to the orchestrator with your results and verification evidence.
