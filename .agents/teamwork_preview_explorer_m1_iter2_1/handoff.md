# Handoff Report — Explorer M1 Iteration 2 (Agent 1 - Mutex Canonicalization)

**Date**: 2026-09-04  
**Agent**: Explorer M1 Iteration 2 (Agent 1 - Mutex Canonicalization)  
**Role**: explorer (investigation, synthesis)  
**Milestone**: M1 (Vault Engine & Auto-population)  
**Artifacts**: `analysis.md`, `handoff.md`  

---

## 1. Observation

1. **Production Mutex Implementation in `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 111–118)**:
   ```typescript
   // Concurrency mutex per file path to prevent race conditions during atomic writes
   const fileLocks = new Map<string, Promise<unknown>>();
   function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
     const current = fileLocks.get(filePath) || Promise.resolve();
     const next = current.then(fn, fn);
     fileLocks.set(filePath, next as Promise<unknown>);
     return next;
   }
   ```
   and line 503:
   ```typescript
     // Serialize writes to the same file path using mutex
     return withFileLock(targetPath, async () => {
   ```

2. **Target Path Resolution Divergence in `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 189–212, 480–500)**:
   - When `writeVaultNote` is invoked with an absolute path:
     `path.isAbsolute(relPath)` returns true at line 194, returning the verbatim path (e.g. `C:\...\Clientes\Nipeihu.md`).
   - When `writeVaultNote` is invoked with a relative lowercase path:
     Line 202 generates candidate `path.join(root, "Clientes", "nipeihu.md")`. Because Windows NTFS is case-insensitive, `fs.existsSync(candidate)` evaluates to `true`, returning `C:\...\Clientes\nipeihu.md`.
   - JavaScript `Map.prototype.get` uses `SameValueZero` equality: `"C:\\...\\Clientes\\Nipeihu.md" !== "C:\\...\\Clientes\\nipeihu.md"`.
   - Consequently, `fileLocks.get(...)` returns `undefined` for differing path representations of the identical underlying file.

3. **Challenger 2 Empirical Verification Output (`tests/challenger_m1_2/handoff.md` lines 55–66)**:
   - Reproduction script `tests/challenger_m1_2/test_case_race.mjs`:
     ```
     Result 1 (absPath): { success: true, filePath: '...\\Clientes\\Nipeihu.md' }
     Result 2 (relPath): { success: true, filePath: '...\\Clientes\\nipeihu.md' }
     Final note categoria: UPDATE_FROM_ABSOLUTE_PATH
     Final note dominio: nipeihu.org
     ```
     Observed: `dominio: "update-from-relpath.org"` was completely overwritten and permanently lost.
   - Adversarial stress runner `tests/challenger_m1_2/stress_runner.mjs` Test 3.2:
     ```
     Error: Variation #4 failed: EBUSY: resource busy or locked, open '...\\Clientes\\Nipeihu.md'
     ```
     Observed: Concurrent file replacement caused Windows kernel file-sharing violations (`ERROR_SHARING_VIOLATION` -> `EBUSY`).

---

## 2. Logic Chain

1. From Observation 1: `withFileLock` relies strictly on `fileLocks.get(filePath)` where keys are raw string arguments without canonicalization.
2. From Observation 2: On Windows NTFS, file paths are case-insensitive and support both `/` and `\` separators. Callers can supply absolute paths (`C:\...\Clientes\Nipeihu.md`), relative lowercase paths (`Clientes/nipeihu.md`), uppercase variations (`Clientes/NIPEHU.MD`), or slash variations (`C:/.../Nipeihu.md`), all referring to the exact same file handle on disk.
3. From Observation 2 & 3: Because string equality in V8 treats `"Nipeihu.md"` and `"nipeihu.md"` as distinct keys, `withFileLock` creates independent Promise chains for each variation.
4. From Observation 3: When two independent Promise chains execute concurrently on the same file, both read the pre-existing frontmatter before either completes writing back. The final write overwrites the earlier write, producing silent data loss (lost update anomaly).
5. From Observation 3: Concurrent filesystem operations (`fs.promises.rename` / `fs.promises.copyFile`) against the same Windows file handle fail with `EBUSY: resource busy or locked`.
6. Therefore: Normalizing and lowercasing the mutex lock key on Windows (`path.resolve(filePath).toLowerCase()`) maps all variations of a path to the identical string key in `fileLocks`, guaranteeing that all concurrent operations against that physical file queue behind the exact same Promise chain.

---

## 3. Caveats

- **Multi-Process Concurrency**: In-process mutex canonicalization guarantees strict FIFO serialization for all asynchronous tasks within the Node.js / Next.js process. Cross-process contention (e.g. Next.js server vs external CLI worker vs Obsidian desktop) cannot be coordinated via an in-memory `Map`; for cross-process safety, Worker Iteration 2 must combine this mutex fix with retry loops on `rename`/`copyFile` as recommended by Challenger 2.
- **Filesystem Creation Timing**: Canonicalization MUST NOT call `fs.realpathSync` because new vault notes (e.g. created during company intake) do not exist prior to lock acquisition; calling `fs.realpathSync` on a non-existent path throws `ENOENT`. Pure path resolution via `path.resolve` avoids this failure mode.
- **Operating System Scope**: Lowercasing is conditionally scoped to `process.platform === "win32"`. On POSIX platforms (Linux), case is preserved to maintain standard POSIX case-sensitivity.

---

## 4. Conclusion

The mutex lock bypass on Windows is caused by raw string keys in `fileLocks.get(filePath)` failing to account for Windows NTFS case-insensitivity and path formatting variations.

### Concrete Actionable Recommendation for Implementation:
In `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`:
1. Add the exported canonicalization helper:
   ```typescript
   export function getLockKey(filePath: string): string {
     const resolved = path.resolve(filePath);
     return process.platform === "win32" ? resolved.toLowerCase() : resolved;
   }
   ```
2. Update `withFileLock` to canonicalize keys internally and self-clean completed queues:
   ```typescript
   export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
     const key = getLockKey(filePath);
     const current = fileLocks.get(key) || Promise.resolve();
     const next = current.then(fn, fn);
     fileLocks.set(key, next as Promise<unknown>);
     next.finally(() => {
       if (fileLocks.get(key) === next) {
         fileLocks.delete(key);
       }
     });
     return next;
   }
   ```

---

## 5. Verification Method

1. **Unit Verification of Key Canonicalization**:
   Verify that all path representations map to the identical key:
   ```typescript
   const k1 = getLockKey("Clientes/Nipeihu.md");
   const k2 = getLockKey("Clientes/nipeihu.md");
   const k3 = getLockKey("Clientes/NIPEHU.MD");
   const k4 = getLockKey("C:/Users/ondig/Code/DA/nipei control/Clientes/Nipeihu.md");
   assert(k1 === k2 && k2 === k3 && k3 === k4);
   ```
2. **Empirical Race Condition Verification**:
   Execute the dedicated race test:
   ```pwsh
   node tests/challenger_m1_2/test_case_race.mjs
   ```
   *Expected outcome*: Both updates (`categoria` and `dominio`) persist; zero lost updates.
3. **Adversarial Concurrency Stress Suite**:
   Execute Challenger 2's stress suite:
   ```pwsh
   node tests/challenger_m1_2/stress_runner.mjs
   ```
   *Expected outcome*: Test 3.2 passes with 0 `EBUSY` errors across all 5 concurrent path variations.
4. **Invalidation Condition**:
   If any path pointing to the same file produces differing keys in `fileLocks`, or if concurrent writes with casing variations yield `EBUSY` or lost updates, this finding is invalidated.
