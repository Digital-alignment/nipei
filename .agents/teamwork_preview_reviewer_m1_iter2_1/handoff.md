# Review & Adversarial Challenge Report — Reviewer M1_Iter2_1

**Date**: 2026-09-05  
**Reviewer**: Reviewer M1_Iter2_1  
**Roles**: reviewer, critic  
**Milestone**: Milestone 1 Iteration 2 (Vault Sync Engine & Concurrency Remediation)  
**Target File**: `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **Mutex Canonicalization & Key Normalization**:
   - `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 112–115):
     ```typescript
     export function getLockKey(filePath: string): string {
       const resolved = path.resolve(filePath);
       return process.platform === "win32" ? resolved.toLowerCase() : resolved;
     }
     ```
   - `withFileLock` (lines 118–137) resolves lock keys via `getLockKey(filePath)` and chains pending operations into a Promise queue.

2. **Memory Hygiene & Queue Cleanup**:
   - `withFileLock` (lines 124–135):
     ```typescript
     next.then(
       () => {
         if (fileLocks.get(key) === next) {
           fileLocks.delete(key);
         }
       },
       () => {
         if (fileLocks.get(key) === next) {
           fileLocks.delete(key);
         }
       }
     );
     ```
   - The map entry is deleted upon queue drain (settlement of the tail Promise), avoiding unbounded memory growth.

3. **Transient Filesystem Error Detection & Backoff with Jitter**:
   - `isTransientFsError` (lines 143–153) explicitly matches `EBUSY`, `EPERM`, `EACCES`, `ENOENT`, `EMFILE`, and `ENFILE`.
   - `calculateBackoffWithJitter` (lines 158–167) applies exponential backoff (`initialDelayMs * Math.pow(2, attempt)`) capped at `maxDelayMs` (200ms) modulated by randomized proportional jitter `0.75 + Math.random() * 0.5`.
   - `readFileWithRetry` (lines 175–191) and `atomicReplaceWithRetry` (lines 197–237) employ this mechanism across up to 6 retry attempts per tier (Tier 1 `rename`, Tier 2 `copyFile`).

4. **Atomic Replacement & Guaranteed Temp File Cleanup**:
   - `writeVaultNote` (lines 744–778):
     ```typescript
     const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
     const bakPath = `${targetPath}.bak`;
     try {
       await fs.promises.writeFile(tmpPath, fullContent, "utf8");
       ...
       await atomicReplaceWithRetry(tmpPath, targetPath, 6);
       return { success: true, filePath: targetPath };
     } finally {
       try {
         if (fs.existsSync(tmpPath)) {
           await fs.promises.unlink(tmpPath).catch(() => {});
         }
       } catch {
         // Ignore unlink errors in finally
       }
     }
     ```
   - Guarantees `unlink(tmpPath)` executes unconditionally in all normal and error paths.

5. **Markdown Body & Watermark Preservation**:
   - `splitFrontmatter` (lines 269–303) matches frontmatter with regex `/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/` and extracts body via `cleaned.slice(bodyStartIndex)`, preserving all body text verbatim even when the body contains internal `---` horizontal rules.
   - `ensureAgentWatermark` (lines 616–627) and `writeVaultNote` (lines 731–735) guarantee `<!-- agente: antigravity -->` is placed as line 1 of the body without duplicate insertions.

6. **Plaintext Credential Stripping**:
   - `sanitizeForVault` (lines 586–602) destructures and deletes `password`, `pass`, `token`, `secret`, `apiKey`, `api_key`, `contraseña`, `clave`, and only permits schema-whitelisted properties (`id`, `tipo`, `nombre`, `url`, `usuario`, `credencial_ref`, `estado`).

7. **Task Completion Invariant**:
   - `sanitizeForVault` (lines 568–577):
     ```typescript
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
   - Confirms strict compliance with `da-vault-schema` contract: `hecho: true` strips `estado` and sets `fecha_completado`.

8. **Independent Execution Verification Commands**:
   - `node tests/e2e/runner.mjs`:
     - Result: 8 test suites, 50 test cases, 50 passed, 0 failed. Duration: 502ms.
   - `npm run build` in `agent-os-nipei/source`:
     - Result: Clean compilation, 0 TypeScript errors, 0 lint errors, exit code 0.
   - `node tests/challenger_m1_iter2/stress_iter2.mjs`:
     - Result: 17 stress tests, 17 passed, 0 failed.
   - `node tests/challenger_m1_2/stress_runner.mjs`:
     - Result: 13 stress tests, 13 passed, 0 failed.
   - `node tests/challenger_m1_2/test_case_race.mjs`:
     - Result: Both absolute path and relative path concurrent writes succeeded, preserving both updates (`categoria` and `dominio`).
   - `node tests/challenger_m1_2/debug_proc.mjs`:
     - Result: Both child processes succeeded without contention crash.
   - `npm run vault:check` in `command-center`:
     - Result: Evaluated live Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`), returned 0 errors.

---

## 2. Logic Chain

1. From Observation 1: Windows NTFS file paths can be represented with differing casing (e.g., `Clientes/Nipeihu.md` vs `clientes/nipeihu.md`) or relativity (relative vs absolute). Because JavaScript `Map.prototype.get` uses strict reference/value equality, prior un-normalized keys allowed parallel write executions to bypass the mutex and race on the filesystem.
2. By implementing `getLockKey(filePath)` with `path.resolve` and `.toLowerCase()` on `win32`, all representations of the same file resolve to an identical canonical string key.
3. This guarantees that all concurrent writes to the file wait in the same Promise sequence, as confirmed empirically by Observation 8 (`test_case_race.mjs` and `stress_runner.mjs` Suite 3).
4. From Observation 2: Cleaning up resolved Promise entries via `next.then` ensures that once the Promise queue drains, the map entry is deleted. The equality check `fileLocks.get(key) === next` ensures active subsequent calls are not accidentally detached. This resolves the memory leak concern.
5. From Observation 3: In a multi-process environment (or under Windows Search indexing and antivirus activity), file handles can be briefly held with sharing violations (`EBUSY`, `EPERM`, `ENOENT`). By catching these transient codes and applying exponential backoff with randomized jitter (`calculateBackoffWithJitter`), contending operations back off and succeed on subsequent attempts, as demonstrated by Observation 8 (`debug_proc.mjs` and multi-process test 3.4).
6. From Observation 4: Wrapping `writeFile` and `atomicReplaceWithRetry` in a `try ... finally` block guarantees that the temporary file `tmpPath` is unlinked unconditionally, even if an exception occurs during execution.
7. From Observation 5, 6, and 7: The implementation enforces every requirement of `da-vault-schema`: markdown bodies and horizontal rules are preserved byte-for-byte; the watermark `<!-- agente: antigravity -->` is maintained on line 1; plaintext credentials are eliminated; and task completion invariants (`hecho: true` deletes `estado` and sets `fecha_completado`) are strictly enforced.
8. Therefore, the implementation is correct, complete, robust, secure, and compliant with all project requirements.

---

## 3. Caveats

- **Cross-Volume Operation**: Node's `fs.promises.rename` throws `EXDEV` across physical drive boundaries. The implementation creates `tmpPath` directly within the directory of `targetPath` (`${targetPath}.${Date.now()}...tmp`), guaranteeing that both files are always on the exact same filesystem volume.
- **Prolonged External Locks**: If an external program locks a vault note exclusively for longer than the maximum retry duration (~1.2 seconds across 6 retries per tier), `writeVaultNote` will return `{ success: false, error: ... }` rather than hanging indefinitely. This fail-safe error return is desirable in production.

---

## 4. Conclusion

The implementation of `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` meets all acceptance criteria and quality requirements with zero integrity violations.
- Mutex canonicalization, memory hygiene, retry/jitter, atomic file replacement, credential stripping, and schema compliance are verified both analytically and empirically.
- Build and tests pass cleanly with 0 errors across 50 E2E tests, 30 stress tests, and `npm run build`.
- Verdict: **APPROVE**.

---

## 5. Verification Method

To independently reproduce and verify this review:

1. **Verify E2E Test Suite**:
   ```pwsh
   node tests/e2e/runner.mjs
   ```
   *Expected*: 50/50 test cases pass, 0 failures.

2. **Verify Next.js TypeScript Build**:
   ```pwsh
   cd agent-os-nipei/source
   npm run build
   ```
   *Expected*: Zero errors, clean compile.

3. **Verify Stress & Concurrency Suites**:
   ```pwsh
   node tests/challenger_m1_iter2/stress_iter2.mjs
   node tests/challenger_m1_2/stress_runner.mjs
   ```
   *Expected*: All 17 iter2 tests and all 13 m1_2 tests pass.

4. **Verify Windows Mutex Path Race Condition**:
   ```pwsh
   node tests/challenger_m1_2/test_case_race.mjs
   ```
   *Expected*: Output shows both `categoria` and `dominio` updates preserved without data loss.

5. **Verify Live Vault Schema Check**:
   ```pwsh
   cd C:\Users\ondig\Code\DA\command-center
   npm run vault:check
   ```
   *Expected*: 0 errors.

6. **Invalidation Conditions**:
   - Any concurrent write resulting in a lost update.
   - Any unhandled `EBUSY` or `ENOENT` crash during multi-process file operations.
   - Any lingering `.tmp` file left on disk following a failed write.
   - Any plaintext password or API key persisted in the vault YAML frontmatter.
