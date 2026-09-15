# Handoff Report — Explorer M1 Iteration 2 (Windows Retry Backoff Specialist)

**Date**: 2026-09-05  
**Agent**: Explorer M1 Iteration 2  
**Role**: Teamwork Explorer (Read-only investigation & synthesis)  
**Milestone**: M1 Iteration 2 (Vault Engine & Concurrency Hardening)  
**Status**: COMPLETE  

---

## 1. Observation

1. **Production Code Analysis (`agent-os-nipei/source/src/lib/vaultSyncEngine.ts`)**:
   - Lines 112–118:
     ```typescript
     const fileLocks = new Map<string, Promise<unknown>>();
     function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
       const current = fileLocks.get(filePath) || Promise.resolve();
       const next = current.then(fn, fn);
       fileLocks.set(filePath, next as Promise<unknown>);
       return next;
     }
     ```
     `filePath` is evaluated via direct string equality without path canonicalization or Windows case folding.
   - Lines 545–575:
     ```typescript
     // Ensure directory exists
     const dir = path.dirname(targetPath);
     if (!fs.existsSync(dir)) {
       await fs.promises.mkdir(dir, { recursive: true });
     }

     // Atomic write: write to unique .tmp, backup to .bak if target exists, then rename
     const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
     const bakPath = `${targetPath}.bak`;

     await fs.promises.writeFile(tmpPath, fullContent, "utf8");

     if (fs.existsSync(targetPath)) {
       try {
         await fs.promises.copyFile(targetPath, bakPath);
       } catch {
         // Backup failure non-fatal
       }
     }

     try {
       await fs.promises.rename(tmpPath, targetPath);
     } catch {
       // Fallback for Windows file locks
       await fs.promises.copyFile(tmpPath, targetPath);
       await fs.promises.unlink(tmpPath).catch(() => {});
     }

     return { success: true, filePath: targetPath };
     ```
     - `rename` has 0 retries. Any transient lock immediately enters the `catch` block.
     - Fallback `copyFile` executes with 0 delay and has 0 retries. If `copyFile` fails, line 568 (`unlink`) is bypassed, leaving `.tmp` files orphaned.
     - `bakPath` is static (`targetPath.bak`) across all concurrent processes, causing backup contention.
     - In-memory `withFileLock` provides no cross-process synchronization.

2. **Challenger M1_2 Empirical Failure Observations**:
   - In `tests/challenger_m1_2/test_case_race.mjs`:
     ```
     Result 1 (absPath): { success: true, filePath: '...\\Clientes\\Nipeihu.md' }
     Result 2 (relPath): { success: true, filePath: '...\\Clientes\\nipeihu.md' }
     Final note categoria: UPDATE_FROM_ABSOLUTE_PATH
     Final note dominio: nipeihu.org
     ```
     *Observed Result*: The update to `dominio: "update-from-relpath.org"` was completely overwritten and permanently destroyed because `absPath` and `relPath` bypassed `fileLocks`.
   - In `tests/challenger_m1_2/debug_proc.mjs` and Test 3.4 of `stress_runner.mjs`:
     ```
     CHILD ERROR in P1 iter 1: EBUSY: resource busy or locked, open '...\\Clientes\\Nipeihu.md'
     CHILD ERROR in P2 iter 3: ENOENT: no such file or directory, copyfile '...\\Nipeihu.md.1788570095723.v1hq.tmp' -> '...\\Nipeihu.md'
     FAILED multi-process test: Process exited with code 1
     ```

3. **Node.js / Libuv and Win32 Semantics**:
   - `MoveFileExW(src, dst, MOVEFILE_REPLACE_EXISTING)` on Windows requires delete/write sharing permissions. If any process (antivirus `WdFilter.sys`, Obsidian file watcher, `SearchIndexer.exe`, or another Node.js process reading/copying) holds an open handle on `dst`, Windows returns `ERROR_SHARING_VIOLATION` (0x20) or `ERROR_ACCESS_DENIED` (0x5), mapped by libuv to `EBUSY` and `EPERM`.
   - When a file is undergoing atomic rename replacement, Windows briefly places the entry in `STATUS_DELETE_PENDING` (0xC0000056). A concurrent `CreateFileW` call (as in `copyFile`) fails with `ERROR_FILE_NOT_FOUND` (0x2), mapped by libuv to `ENOENT`.

---

## 2. Logic Chain

1. From Observation 1: `withFileLock` relies on raw JavaScript string key equality (`fileLocks.get(filePath)`). On Windows NTFS, case variations (`Nipeihu.md` vs `nipeihu.md`) and relative vs absolute paths resolve to the same underlying file handle.
2. From Observation 2 (Test 3.2): Because different path representations map to distinct keys, parallel asynchronous operations execute un-serialized read-modify-write loops on the same file, resulting in silent data loss (lost updates).
3. From Observation 1: In multi-process scenarios (Next.js server, CLI agent runner, child processes), `withFileLock` is completely invisible across process boundaries.
4. From Observation 1 & 3: When multiple processes write concurrently, Windows locks open file handles during `readFile`, `copyFile`, and `MoveFileExW`.
5. Because lines 563–569 do not retry `rename` and immediately attempt `copyFile` with 0ms delay, the transient lock on `targetPath` remains active, causing `copyFile` to throw `EBUSY` or `ENOENT`.
6. From Observation 3: Adding an exponential backoff retry loop with proportional jitter ($25\text{ms} \times 2^k$ scaled by $[0.75 - 1.25]$) decorrelates competing processes, allows transient OS handles and antivirus scans to close, and enables atomic replacement without throwing exceptions.
7. Wrapping the operation in `try ... finally` guarantees `unlink(tmpPath)` always executes, preventing dangling `.tmp` files.

---

## 3. Caveats

- **Cross-Volume Renames**: If `targetPath` and `tmpPath` are on different filesystem mount points, `rename` throws `EXDEV`. Our formulation creates `tmpPath` in the exact same directory as `targetPath` (`${targetPath}.${Date.now()}...tmp`), guaranteeing identical volume locality.
- **Extreme Sustained Contention (>1 second)**: With 6 retries capping at 200ms with jitter, total retry window spans ~600ms–900ms. If an external process holds an exclusive lock continuously for >1 second, the operation will exhaust retries and fail gracefully with an error rather than hanging indefinitely.

---

## 4. Conclusion

1. **Root Causes**:
   - Single-process lost updates: Caused by lack of lock key canonicalization (`toLowerCase()` on Windows).
   - Multi-process crashes: Caused by zero-retry atomic replacement failing on transient Windows `EBUSY` and `ENOENT` (`STATUS_DELETE_PENDING`) lock states.
2. **Actionable Recommendations**:
   - **Recommendation 1**: Export and apply `getLockKey(filePath: string): string` in `withFileLock`:
     ```typescript
     export function getLockKey(filePath: string): string {
       const resolved = path.resolve(filePath);
       return process.platform === "win32" ? resolved.toLowerCase() : resolved;
     }
     ```
   - **Recommendation 2**: Implement `isTransientFsError` covering `EBUSY`, `EPERM`, `EACCES`, `ENOENT`, `EMFILE`, and `ENFILE`.
   - **Recommendation 3**: Implement `atomicReplaceWithRetry(tmpPath, targetPath, maxRetries = 6)` utilizing exponential backoff ($25\text{ms}$ base, $200\text{ms}$ max) with proportional jitter ($[0.75 - 1.25]$) across two tiers (Tier 1: `rename`, Tier 2: `copyFile`).
   - **Recommendation 4**: Wrap `writeVaultNote` atomic replace in `try ... finally` to ensure `unlink(tmpPath)` unconditionally cleans up temp files.
   - **Recommendation 5**: Implement `readFileWithRetry` to make concurrent reads resilient to transient rename locks.

The exact code edits are documented in `analysis.md` and compiled into `proposed_vaultSyncEngine.patch`.

---

## 5. Verification Method

To independently verify that the retry backoff and mutex canonicalization resolve all issues:

1. **Verify Mutex Case & Representation Serialization**:
   ```pwsh
   node tests/challenger_m1_2/test_case_race.mjs
   ```
   *Expected result*:
   ```
   SUCCESS: Both updates preserved (no lost updates)!
   ```

2. **Verify Multi-Process Concurrency**:
   ```pwsh
   node tests/challenger_m1_2/debug_proc.mjs
   ```
   *Expected result*:
   ```
   Both child processes succeeded!
   ```

3. **Verify Full Challenger Stress Suite**:
   ```pwsh
   node tests/challenger_m1_2/stress_runner.mjs
   ```
   *Expected result*:
   All 13 tests in Suites 1, 2, 3, and 4 pass cleanly (0 failed, exit code 0).

4. **Verify TypeScript Compilation**:
   ```pwsh
   cd agent-os-nipei/source
   npm run build
   ```
   *Expected result*: Zero compilation or type errors.

5. **Invalidation Condition**:
   If any stress test in `stress_runner.mjs` throws `EBUSY`, `ENOENT`, or leaves `.tmp` files in `Clientes/`, the implementation must be considered invalid.
