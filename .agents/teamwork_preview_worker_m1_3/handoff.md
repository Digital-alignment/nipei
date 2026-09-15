# Handoff Report — Worker M1_3 (Vault Engine Remediation Worker)

**Date**: 2026-09-05  
**Worker**: Worker M1_3  
**Role**: implementer, qa, specialist (Vault Engine Remediation)  
**Milestone**: M1 (Vault Engine & Concurrency Hardening)  
**Status**: COMPLETE  

---

## 1. Observation

1. **Mutex Key Bypassing in Prior Code**:
   - In `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 112–118 prior to remediation), `withFileLock` checked raw JavaScript string equality `fileLocks.get(filePath)`.
   - In `tests/challenger_m1_2/test_case_race.mjs`, when one call used absolute path `C:\...\Clientes\Nipeihu.md` (updating `categoria: "UPDATE_FROM_ABSOLUTE_PATH"`) and a concurrent call used relative lowercase path `Clientes/nipeihu.md` (updating `dominio: "update-from-relpath.org"`), the two calls ran in un-serialized parallel Promise chains.
   - Prior verbatim output demonstrated lost updates:
     ```
     Final note categoria: UPDATE_FROM_ABSOLUTE_PATH
     Final note dominio: nipeihu.org
     ```
     The `dominio` update was completely overwritten and lost.

2. **Transient Windows File Contention in Multi-Process Execution**:
   - Prior atomic file replace in lines 563–569 executed a single non-retried `rename` followed by a single non-retried `copyFile`.
   - In `tests/challenger_m1_2/debug_proc.mjs` and Test 3.4 of `stress_runner.mjs`, multi-process concurrent writes failed with:
     ```
     CHILD ERROR in P1 iter 1: EBUSY: resource busy or locked, open '...\\Clientes\\Nipeihu.md'
     CHILD ERROR in P2 iter 3: ENOENT: no such file or directory, copyfile '...\\Nipeihu.md.1788570095723.v1hq.tmp' -> '...\\Nipeihu.md'
     ```
   - In addition, if `copyFile` threw an error, line 568 (`unlink`) was bypassed, leaving orphaned `.tmp` files on disk.

3. **Remediation Implementation in `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`**:
   - Implemented `getLockKey(filePath: string): string` (lines 112–115):
     ```typescript
     export function getLockKey(filePath: string): string {
       const resolved = path.resolve(filePath);
       return process.platform === "win32" ? resolved.toLowerCase() : resolved;
     }
     ```
   - Updated `withFileLock` to use canonical key `getLockKey(filePath)` and self-clean completed queue entries (`next.then(...)`) to prevent memory leaks (lines 118–138).
   - Implemented `isTransientFsError(code?: string): boolean` classifying `EBUSY`, `EPERM`, `EACCES`, `ENOENT`, `EMFILE`, and `ENFILE` (lines 144–155).
   - Implemented `calculateBackoffWithJitter(attempt, initialDelayMs = 25, maxDelayMs = 200)` with exponential backoff and `[0.75, 1.25]` proportional jitter factor (lines 160–170).
   - Implemented `readFileWithRetry(filePath: string, maxRetries = 6)` (lines 177–193) and two-tiered `atomicReplaceWithRetry(tmpPath, targetPath, maxRetries = 6)` (lines 199–238; Tier 1 rename retries, Tier 2 copyFile retries).
   - In `writeVaultNote` (lines 521–649):
     - Wrapped atomic replace and backup inside `try ... finally` guaranteeing `fs.promises.unlink(tmpPath).catch(() => {})` runs unconditionally (lines 636–645).
     - Read existing note using `readFileWithRetry(targetPath, 6)` with in-flight retry loop to verify that if content is read, `splitFrontmatter` parsed it before proceeding (lines 564–600).
   - In `readVaultNote` (lines 286–395):
     - Added retry loop with backoff and jitter up to 6 attempts to absorb in-flight atomic replacements and transient locks.
   - Strictly preserved all `da-vault-schema` invariants:
     - Closed enums and strict schema fields (`sanitizeForVault`).
     - Task invariant: `hecho: true` strips intermediate `estado` and sets `fecha_completado`.
     - Strips plaintext credentials (`password`, `token`, `apiKey`, `contraseña`, `clave`).
     - Markdown body preserved byte-for-byte with `<!-- agente: antigravity -->` watermark on line 1.

4. **Empirical Verification Results**:
   - Command: `node tests/challenger_m1_2/test_case_race.mjs`
     - Exit code: 0
     - Verbatim output:
       ```
       Testing path representation race condition on Windows...
       Result 1 (absPath): { success: true, filePath: '...\\Clientes\\Nipeihu.md' }
       Result 2 (relPath): { success: true, filePath: '...\\Clientes\\Nipeihu.md' }
       Final note categoria: UPDATE_FROM_ABSOLUTE_PATH
       Final note dominio: update-from-relpath.org
       ```
     - Zero lost updates: both updates were preserved.
   - Command: `node tests/challenger_m1_2/stress_runner.mjs`
     - Exit code: 0
     - Verbatim output:
       ```
       Total Stress Tests: 13
       Passed:             13
       Failed:             0
       ```
     - Includes 100% pass on Suite 3 (20 concurrent writes, casing/path variation collisions, 25 interleaved read/write operations, multi-process child process writes).
   - Command: `node tests/challenger_m1_2/debug_proc.mjs`
     - Exit code: 0
     - Verbatim output:
       ```
       Both child processes succeeded!
       ```
   - Command: `node tests/e2e/runner.mjs`
     - Exit code: 0
     - Verbatim output:
       ```
       Total Test Suites: 8
       Total Test Cases:  50
       Passed:            50
       Failed:            0
       ✔ ALL E2E TESTS PASSED SUCCESSFULLY!
       ```
   - Command: `npm run build` in `agent-os-nipei/source`
     - Exit code: 0
     - Zero TypeScript or lint errors.

---

## 2. Logic Chain

1. From Observation 1: In-memory mutex serialization failed when paths differed in casing or relative/absolute formatting on Windows NTFS because `Map.prototype.get` relies on exact string equality.
2. From Observation 3: Adding `getLockKey(filePath)` resolves the full path via `path.resolve` and transforms it to lowercase on `win32`. Consequently, `Clientes/Nipeihu.md`, `Clientes/nipeihu.md`, and absolute paths resolve to the exact same key.
3. From Observation 4 (`test_case_race.mjs`): All concurrent calls queue behind the identical Promise chain, eliminating race conditions and preserving 100% of concurrent updates.
4. From Observation 2: Multi-process concurrency triggers Win32 `ERROR_SHARING_VIOLATION` (`EBUSY`), `ERROR_ACCESS_DENIED` (`EPERM`), and `STATUS_DELETE_PENDING` (`ENOENT`) due to mandatory Windows file handle locks during rename/copy operations.
5. From Observation 3: Implementing `isTransientFsError` and `atomicReplaceWithRetry` with exponential backoff and jitter (`calculateBackoffWithJitter`) introduces asynchronous delays allowing competing process handles and antivirus scanners to release.
6. From Observation 4 (`debug_proc.mjs` and Test 3.4): Multi-process child processes run to completion without any `EBUSY` or `ENOENT` crashes.
7. From Observation 3: Wrapping atomic file operations in `try ... finally` guarantees `unlink(tmpPath)` runs unconditionally, preventing orphaned `.tmp` files.
8. Therefore, the production vault engine in `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` is fully remediated and hardened for high-concurrency production operation on Windows.

---

## 3. Caveats

- **Cross-Volume Rename**: If `targetPath` and `tmpPath` resided on different disk volumes, `rename` would throw `EXDEV`. Our implementation writes `tmpPath` in the exact directory of `targetPath` (`${targetPath}.${Date.now()}...tmp`), guaranteeing identical volume locality.
- **Continuous External Locking >1.5 Seconds**: With 6 retries per tier capping at 200ms with jitter, the total retry window spans ~800ms–1200ms. If an external application holds an exclusive, non-shared handle for longer than that window, the call fails gracefully with a caught error rather than deadlocking.

---

## 4. Conclusion

All requirements of Milestone 1 Vault Engine Concurrency Hardening are satisfied.
1. `getLockKey` normalizes and canonicalizes lock keys across all path representations on Windows, preventing mutex bypass and silent data loss.
2. `atomicReplaceWithRetry` and `readFileWithRetry` absorb transient Windows filesystem locks (`EBUSY`, `EPERM`, `ENOENT`, `EACCES`, `EMFILE`, `ENFILE`) via exponential backoff with proportional jitter.
3. `try ... finally` blocks guarantee zero orphaned `.tmp` files on disk.
4. All `da-vault-schema` invariants remain intact and verified.
5. All verification commands (`test_case_race.mjs`, `stress_runner.mjs`, `debug_proc.mjs`, `e2e/runner.mjs`, `npm run build`) pass cleanly with 0 errors.

---

## 5. Verification Method

To independently verify this work:

1. **Verify Race Condition Immunity & Zero Lost Updates**:
   ```pwsh
   node tests/challenger_m1_2/test_case_race.mjs
   ```
   *Expected output*: `Final note categoria: UPDATE_FROM_ABSOLUTE_PATH`, `Final note dominio: update-from-relpath.org`.

2. **Verify Full Challenger Concurrency & Stress Suite**:
   ```pwsh
   node tests/challenger_m1_2/stress_runner.mjs
   ```
   *Expected output*: 13 tests run, 13 passed, 0 failed.

3. **Verify Multi-Process Contention**:
   ```pwsh
   node tests/challenger_m1_2/debug_proc.mjs
   ```
   *Expected output*: `Both child processes succeeded!`, exit code 0.

4. **Verify Opaque-Box E2E Test Suite**:
   ```pwsh
   node tests/e2e/runner.mjs
   ```
   *Expected output*: 50 test cases, 50 passed, 0 failed.

5. **Verify TypeScript Compilation**:
   ```pwsh
   cd agent-os-nipei/source
   npm run build
   ```
   *Expected output*: Clean Next.js compilation, 0 errors, exit code 0.

6. **Invalidation Condition**:
   If any concurrent write to the same note results in lost updates, or if `stress_runner.mjs` fails any of the 13 stress tests, this remediation is invalidated.
