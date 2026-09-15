# Handoff Report — Challenger M1_2 (Empirical Concurrency & Stress Specialist)

**Date**: 2026-09-04  
**Challenger**: Challenger M1_2  
**Role**: critic, specialist (Empirical Challenger)  
**Milestone**: M1 (Vault Engine & Auto-population)  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

1. **Production Code vs E2E Mock Divergence**:
   - `tests/e2e/engine.mjs` at lines 215–396 implements a duplicate, standalone JavaScript version of `createVaultEngine` rather than importing and exercising the production TypeScript implementation at `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`.
   - The 50 E2E tests reported by Worker M1_2 executed against the test fixture adapter, leaving the real Next.js/TypeScript production code unverified by that test run.

2. **Live Note Parsing & Prefill Accuracy (Verified via `tests/challenger_m1_2/stress_runner.mjs`)**:
   - `readVaultNote("Clientes/Nipeihu.md")` executed against the live Obsidian vault at `C:\Users\ondig\Desktop\DA\digitalalignment`:
     - Accurately extracted: `id: "nipeihu"`, `nombre: "Nipeihu"`, `tipo: "cliente_externo"`, `estado: "activo"`, `rubro: "comunidad_cultura"`, `emoji: "🪶"`, `dominio: "nipeihu.org"`.
     - 8 stack technologies, 4 proyectos, 9 roadmap items (3 with `hecho: true`, intermediate `estado` cleanly stripped, valid `fecha_completado`, and 6 pending), and 1 historial item.
     - Preserved `<!-- agente: antigravity -->` watermark and body markdown byte-for-byte.
   - `readVaultNote("Clientes/Digital Alignment.md")`:
     - Accurately parsed YAML block folded multiline scalars (`>-`) in roadmap item `repo-dotfiles-config-agentes` and historial without leakage.
     - Preserved `notebook_id: 5ffd7044-bdde-410e-b096-b65fd0c3838c` and 6 projects.
   - Prefill endpoint `GET /api/vault/prefill`:
     - Returned HTTP 200 with 12 converted `agentTasks` (9 Nipeihu + 3 DA), 3 done tasks, and structured `company` profile with `parentAgency`.

3. **Markdown Body Preservation & Boundary Conditions**:
   - Across 5 sequential frontmatter updates, `bodyMarkdown` remained byte-for-byte exact.
   - Markdown documents containing internal horizontal rules (`---`) in the body did NOT truncate.
   - Multiple writes did NOT duplicate `<!-- agente: antigravity -->`.
   - Plaintext credentials (`password`, `token`, `apiKey`, `contraseña`) in `servicios` were correctly stripped.

4. **Critical Vulnerability 1: Mutex Key Case-Sensitivity & Normalization Failure (Silent Data Loss & EBUSY)**:
   - In `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` lines 112–118:
     ```typescript
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
     return withFileLock(targetPath, async () => {
     ```
   - In `tests/challenger_m1_2/stress_runner.mjs` (Test 3.2) and standalone reproduction `tests/challenger_m1_2/test_case_race.mjs`:
     - Call 1 used absolute path: `C:\Users\ondig\AppData\Local\Temp\...\Clientes\Nipeihu.md` (updating `categoria: "UPDATE_FROM_ABSOLUTE_PATH"`).
     - Call 2 used relative path: `Clientes/nipeihu.md` (updating `dominio: "update-from-relpath.org"`).
     - Because Windows NTFS filesystem is case-insensitive, both calls point to the identical file on disk.
     - However, in JavaScript, `fileLocks` keys on the raw string: `"C:\\...\\Nipeihu.md"` !== `"C:\\...\\nipeihu.md"`.
     - The mutex was bypassed. Both writes ran in parallel without serialization.
     - **Verbatim output from `node tests/challenger_m1_2/test_case_race.mjs`**:
       ```
       Result 1 (absPath): { success: true, filePath: '...\\Clientes\\Nipeihu.md' }
       Result 2 (relPath): { success: true, filePath: '...\\Clientes\\nipeihu.md' }
       Final note categoria: UPDATE_FROM_ABSOLUTE_PATH
       Final note dominio: nipeihu.org
       ```
     - **Observed Result**: The update to `dominio: "update-from-relpath.org"` was completely overwritten and permanently lost!
     - In Test 3.2 of `stress_runner.mjs`, when 5 case/representation variations were fired concurrently:
       ```
       Error: Variation #4 failed: EBUSY: resource busy or locked, open '...\\Clientes\\Nipeihu.md'
       ```

5. **High Vulnerability 2: Multi-Process Windows Contention Crash (EBUSY / ENOENT)**:
   - In `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` lines 563–569:
     ```typescript
     try {
       await fs.promises.rename(tmpPath, targetPath);
     } catch {
       // Fallback for Windows file locks
       await fs.promises.copyFile(tmpPath, targetPath);
       await fs.promises.unlink(tmpPath).catch(() => {});
     }
     ```
   - In `tests/challenger_m1_2/debug_proc.mjs`, when two separate Node processes concurrently wrote to the same note:
     - Verbatim output:
       ```
       CHILD ERROR in P1 iter 1: EBUSY: resource busy or locked, open '...\\Clientes\\Nipeihu.md'
       CHILD ERROR in P2 iter 3: ENOENT: no such file or directory, copyfile '...\\Nipeihu.md.1788570095723.v1hq.tmp' -> '...\\Nipeihu.md'
       FAILED multi-process test: Process exited with code 1
       ```
     - `withFileLock` only exists in memory within a single Node.js process. When multiple processes (Next.js server, CLI agent runner, Command Center, Obsidian) access the note, Windows locks the file during copy/rename. The current fallback lacks retry loops with backoff.

---

## 2. Logic Chain

1. From Observation 4: `withFileLock` relies on strict equality of string keys (`fileLocks.get(filePath)`). On Windows, `Clientes/Nipeihu.md`, `Clientes/nipeihu.md`, and absolute paths refer to the exact same physical inode/file.
2. Because `targetPath` is not normalized (e.g. via `path.normalize(path.resolve(targetPath)).toLowerCase()`), differing callers create multiple independent Promise queues in `fileLocks`.
3. Simultaneous execution against the same file on disk causes two reads to occur before either write finishes. The last writer wins and overwrites the first writer's changes, destroying data silently (Observation 4).
4. Simultaneously, Windows file locking forbids concurrent write/rename handles on the same file, throwing unhandled `EBUSY: resource busy or locked` (Observation 4 and 5).
5. From Observation 5: In multi-process scenarios (such as concurrent agent CLI executions or Next.js background workers), the absence of a retry loop with exponential backoff on `rename`/`copyFile` causes write failures with exit code 1.
6. Therefore, while single-caller sequential operations and prefill parsing are functioning properly (Observation 2 & 3), concurrent write safety and race-condition immunity are broken.

---

## 3. Caveats

- Live Obsidian vault files (`Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md`) were read directly to verify production parsing, but write stress testing was executed against an exact copy in an isolated sandbox directory (`os.tmpdir()`) to protect live business data in accordance with project safety guidelines.
- Cloud sync latency from Google Drive on `Desktop\DA\digitalalignment` was not directly simulated, but local multi-process contention reproduces identical Windows file-handle locking semantics.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 satisfies the read and prefill parsing requirements on live notes, but FAILS the empirical concurrency and race-condition robustness requirements:
1. **Critical Bug**: Path variations bypass `withFileLock` leading to silent data loss (lost updates) and Windows `EBUSY` crashes.
2. **High Bug**: Multi-process concurrent writes fail with unhandled `EBUSY` and `ENOENT` due to lack of retry with backoff on file operations.

### Required Actionable Changes for Worker:
1. In `src/lib/vaultSyncEngine.ts`, canonicalize the mutex lock key:
   ```typescript
   function getLockKey(filePath: string): string {
     const resolved = path.resolve(filePath);
     return process.platform === "win32" ? resolved.toLowerCase() : resolved;
   }
   ```
   Use `withFileLock(getLockKey(targetPath), ...)` so all casing and relative/absolute path representations share the exact same mutex chain.
2. In `writeVaultNote`, wrap the atomic rename/copy operations in a retry loop with exponential backoff and jitter (e.g., 5 retries, 20ms–200ms delay) to gracefully absorb Windows file lock contention.
3. Re-run `node tests/challenger_m1_2/stress_runner.mjs` to ensure 100% of stress tests pass.

---

## 5. Verification Method

To independently verify these empirical findings:
1. **Run Full Challenger Stress Suite**:
   ```pwsh
   node tests/challenger_m1_2/stress_runner.mjs
   ```
   *Expected outcome*: 13 tests run; Tests 3.2 and 3.4 fail with `EBUSY` and exit code 1.
2. **Run Dedicated Lost Update / Case Race Reproduction**:
   ```pwsh
   node tests/challenger_m1_2/test_case_race.mjs
   ```
   *Expected outcome*: Confirms silent data loss where `dominio: "update-from-relpath.org"` is lost and overwritten.
3. **Run Multi-Process Contention Reproduction**:
   ```pwsh
   node tests/challenger_m1_2/debug_proc.mjs
   ```
   *Expected outcome*: Child process crashes with `EBUSY: resource busy or locked`.
4. **Invalidation Condition**:
   - Applying the canonicalized lock key and retry backoff allows all 13 stress tests in `node tests/challenger_m1_2/stress_runner.mjs` to pass with 0 failures and exit code 0.
