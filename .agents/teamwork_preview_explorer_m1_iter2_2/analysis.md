# In-Depth Analysis: Windows File Locking, EBUSY/ENOENT Concurrency Failures, and Retry Backoff Formulation in `vaultSyncEngine.ts`

**Date**: 2026-09-05  
**Author**: Explorer M1 Iteration 2 (Windows Retry Backoff Specialist)  
**Target File**: `agent-os-nipei/source/src/lib/vaultSyncEngine.ts` (lines 545–575, lines 112–118, lines 240–255)  
**Related Findings**: Challenger M1_2 Handoff Report (`.agents/teamwork_preview_challenger_m1_2/handoff.md`)  

---

## 1. Executive Summary

Empirical stress testing conducted by Challenger M1_2 demonstrated that while sequential vault parsing and single-caller updates adhere strictly to `da-vault-schema`, concurrent and multi-process file modifications on Windows trigger two severe failure modes:
1. **Mutex Bypass & Silent Data Loss (Test 3.2)**: `withFileLock` keyed on raw string paths without case-normalization or path resolution. Because NTFS is case-insensitive, differing path representations (e.g. `Clientes/Nipeihu.md` vs `Clientes/nipeihu.md` vs absolute paths) generated independent lock queues, allowing overlapping read-modify-write cycles where updates were permanently overwritten.
2. **Multi-Process Windows Contention Crash (Test 3.4 & `debug_proc.mjs`)**: During rapid concurrent writes across Node.js processes or between Node.js and external OS processes (Obsidian, Windows Search Indexer, Antivirus), Windows throws `EBUSY` (`ERROR_SHARING_VIOLATION`), `EPERM` (`ERROR_ACCESS_DENIED`), or `ENOENT` (`STATUS_DELETE_PENDING`). Because `vaultSyncEngine.ts` lines 563–569 attempted a single non-retried `rename` followed by a single non-retried `copyFile`, any transient lock lasting even 1 millisecond caused immediate unhandled exceptions, child process crashes, and orphaned `.tmp` files.

This report provides the exact root-cause breakdown of Windows Win32/libuv file handle semantics, formulates a mathematically sound exponential backoff with proportional jitter retry model, and supplies complete, drop-in replacement code for `vaultSyncEngine.ts`.

---

## 2. Examination of `vaultSyncEngine.ts` (Lines 545–575)

### 2.1 Existing Implementation

```typescript
// agent-os-nipei/source/src/lib/vaultSyncEngine.ts:544-576
544:       const dir = path.dirname(targetPath);
545:       if (!fs.existsSync(dir)) {
546:         await fs.promises.mkdir(dir, { recursive: true });
547:       }
548: 
549:       // Atomic write: write to unique .tmp, backup to .bak if target exists, then rename
550:       const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
551:       const bakPath = `${targetPath}.bak`;
552: 
553:       await fs.promises.writeFile(tmpPath, fullContent, "utf8");
554: 
555:       if (fs.existsSync(targetPath)) {
556:         try {
557:           await fs.promises.copyFile(targetPath, bakPath);
558:         } catch {
559:           // Backup failure non-fatal
560:         }
561:       }
562: 
563:       try {
564:         await fs.promises.rename(tmpPath, targetPath);
565:       } catch {
566:         // Fallback for Windows file locks
567:         await fs.promises.copyFile(tmpPath, targetPath);
568:         await fs.promises.unlink(tmpPath).catch(() => {});
569:       }
570: 
571:       return { success: true, filePath: targetPath };
572:     } catch (err: unknown) {
573:       const message = err instanceof Error ? err.message : String(err);
574:       return { success: false, error: message };
575:     }
```

### 2.2 Critical Vulnerabilities in Lines 545–575

1. **Zero-Delay Fallback Without Retry**:
   In line 563, when `fs.promises.rename(tmpPath, targetPath)` fails due to an active lock on `targetPath`, the `catch` block (line 565) immediately executes `fs.promises.copyFile(tmpPath, targetPath)` with **0 milliseconds** of delay. If `targetPath` was locked during `rename`, it is virtually guaranteed to still be locked a fraction of a microsecond later during `copyFile`.
2. **Unhandled `copyFile` Failure & Unprotected Unlink**:
   If `copyFile` in line 567 throws (e.g. `EBUSY` or `ENOENT`), line 568 (`unlink(tmpPath)`) is skipped entirely. Execution jumps to line 572, returning `{ success: false, error: message }` while leaving the `.tmp` file dangling on disk. This directly triggers assertions in test suites checking for clean directories (e.g., `stress_runner.mjs:298`).
3. **Collision on Static Backup Filename (`targetPath.bak`)**:
   In lines 551 and 557, all concurrent writers attempt to copy to the exact same static path `${targetPath}.bak`. When Process A is writing to `${targetPath}.bak`, Process B attempting `copyFile(targetPath, bakPath)` encounters an immediate sharing violation. While line 558 swallows the error, the concurrent handle held on `targetPath` for reading creates lock contention that triggers `EBUSY` on Process A's `rename`.
4. **In-Memory Mutex Scope Limitation**:
   `withFileLock` (line 503) only synchronizes asynchronous operations within the *same* JavaScript event loop in a *single* Node.js process. When multiple processes (Next.js server worker, agent CLI execution runners, Obsidian vault indexer, external scripts) execute concurrently, `withFileLock` offers zero protection. Concurrency safety across processes must be enforced at the filesystem I/O boundary.

---

## 3. Analysis: Why Windows Throws EBUSY and ENOENT

### 3.1 Win32 Kernel Handle Architecture vs POSIX Inodes

In POSIX operating systems (Linux, macOS), filesystem namespace entries (dentries) are decoupled from file data blocks (inodes). When Process A has an open file descriptor to `file.txt`, Process B can invoke `rename("file.tmp", "file.txt")` via the `rename(2)` system call. The kernel atomically alters the directory pointer to refer to the new inode. Process A continues to read from the old inode until its descriptor is closed, and new opens immediately see the new inode. No locking exception is generated.

In Windows NT (NTFS / ReFS), file system objects are represented by kernel `FILE_OBJECT` structures managed via `HANDLE`s opened with Win32 `CreateFileW`.
Every file open specifies a sharing mask:
- `FILE_SHARE_READ` (0x00000001)
- `FILE_SHARE_WRITE` (0x00000002)
- `FILE_SHARE_DELETE` (0x00000004)

If an application or system service opens a file without `FILE_SHARE_DELETE`, Windows enforces **mandatory delete/rename locking**:
- Any call to `MoveFileExW(src, dst, MOVEFILE_REPLACE_EXISTING)` attempting to replace `dst` fails with Win32 error code `0x20` (`ERROR_SHARING_VIOLATION`) or `0x05` (`ERROR_ACCESS_DENIED`).
- Libuv (Node.js I/O layer in `src/win/fs.c`) maps `ERROR_SHARING_VIOLATION` directly to `UV_EBUSY` (`EBUSY: resource busy or locked`).
- Libuv maps `ERROR_ACCESS_DENIED` to `UV_EPERM` (`EPERM: operation not permitted`) or `UV_EACCES`.

### 3.2 External System Actors on Windows

Even in a single-process application, files on a Windows developer workstation are continuously inspected by external background services:
1. **Windows Defender / Antivirus Filter Drivers**: Windows Defender uses a filesystem minifilter driver (`WdFilter.sys`). When `writeFile(tmpPath)` completes, the filesystem emits an `IRP_MJ_CLEANUP` notification. The antivirus engine immediately opens a handle to scan the new payload. If `rename(tmpPath, targetPath)` is called while `WdFilter.sys` is inspecting `tmpPath`, the rename fails with `EBUSY` or `EPERM`.
2. **Windows Search Indexer (`SearchIndexer.exe`)**: Monitors user directories (including `Desktop` and `Documents` where Obsidian vaults reside) via `ReadDirectoryChangesW`. It opens transient read handles upon directory modifications.
3. **Obsidian Vault File Watcher**: The Obsidian desktop app runs a background watcher across all notes. When a note is modified, Obsidian immediately opens the file to re-index internal links, tags, and block references.

### 3.3 The Root Cause of `ENOENT` During Atomic Replace

Why did Challenger M1_2 observe:
```
CHILD ERROR in P2 iter 3: ENOENT: no such file or directory, copyfile '...Nipeihu.md.1788570095723.v1hq.tmp' -> '...Nipeihu.md'
```
when the directory undeniably existed and `tmpPath` was just written?

On Windows NTFS, replacing an existing file via `MoveFileExW(..., MOVEFILE_REPLACE_EXISTING)` is not a single instantaneous atomic swap under the hood:
1. The kernel marks the target directory entry with `STATUS_DELETE_PENDING`.
2. If another process concurrently attempts to open `targetPath` using `CreateFileW` with `OPEN_ALWAYS` or `CREATE_ALWAYS` (as `fs.promises.copyFile` does via libuv `uv_fs_copyfile`), Windows detects the `DELETE_PENDING` state and returns `STATUS_DELETE_PENDING` (`0xC0000056`) or `ERROR_FILE_NOT_FOUND` (`0x2`).
3. Libuv translates `ERROR_FILE_NOT_FOUND` to `UV_ENOENT` (`ENOENT: no such file or directory`).
4. Therefore, on Windows, **`ENOENT` during an atomic write or replacement is a transient state indicator**, signifying that a prior rename/replace operation on the target path is still completing its filesystem flush!

---

## 4. Mathematical & Algorithmic Formulation of Retry Backoff with Jitter

### 4.1 The Flaw of Fixed Sleep (Lock Convoy / Thundering Herd)

If multiple processes (e.g. Process P1 and Process P2 in `debug_proc.mjs`) collide on a file lock and both execute a fixed sleep `await sleep(50)`, they wake up simultaneously at $T + 50\text{ms}$ and attempt to acquire the lock at the exact same instant. They collide again, leading to lock convoying, high CPU utilization, and eventual timeout failure.

### 4.2 Exponential Backoff with Proportional Jitter Formulation

To prevent lock convoys while ensuring fast resolution:
1. **Exponential Base Delay**:
   $$\text{baseDelay}(k) = \min\left(t_{\max}, t_{\text{init}} \cdot \alpha^k\right)$$
   Where:
   - $k \in \{0, 1, \dots, N-1\}$ is the zero-indexed retry attempt number.
   - $t_{\text{init}} = 25\text{ms}$ (initial retry delay).
   - $\alpha = 2$ (exponential backoff factor).
   - $t_{\max} = 200\text{ms}$ (upper cap on individual delay).
   - $N = 6$ (maximum retry attempts, giving 7 total tries).

2. **Proportional Full Jitter**:
   $$\text{jitteredDelay}(k) = \text{Math.floor}\left(\text{baseDelay}(k) \cdot (0.75 + 0.5 \cdot \text{random}())\right)$$
   Where $\text{random}() \sim U(0, 1)$.
   
   This scales the delay within $[0.75 \times \text{baseDelay}, 1.25 \times \text{baseDelay}]$.
   
   **Retry Delay Trajectory**:
   - **Attempt 0**: Base $25\text{ms} \implies [18\text{ms} - 31\text{ms}]$
   - **Attempt 1**: Base $50\text{ms} \implies [37\text{ms} - 62\text{ms}]$
   - **Attempt 2**: Base $100\text{ms} \implies [75\text{ms} - 125\text{ms}]$
   - **Attempt 3**: Base $200\text{ms} \implies [150\text{ms} - 250\text{ms}]$
   - **Attempt 4**: Base $200\text{ms} \implies [150\text{ms} - 250\text{ms}]$
   - **Attempt 5**: Base $200\text{ms} \implies [150\text{ms} - 250\text{ms}]$

   **Cumulative Wait Time**:
   $$\sum_{k=0}^{5} \text{delay}(k) \approx 600\text{ms} - 900\text{ms}$$
   This is well within any 5–10 second test or HTTP timeout, yet provides ample opportunity for any transient antivirus scan (typically 10–50ms) or competing process file handle (typically 2–20ms) to release.

### 4.3 Classification of Transient vs Fatal Errors

A retry loop must only retry errors known to be transient lock/state contention. Fatal errors must throw immediately:

```typescript
export function isTransientFsError(code?: string): boolean {
  if (!code) return false;
  return (
    code === "EBUSY" ||   // Win32 ERROR_SHARING_VIOLATION / ERROR_LOCK_VIOLATION
    code === "EPERM" ||   // Win32 ERROR_ACCESS_DENIED during MoveFileEx replacement
    code === "EACCES" ||  // Win32 permission denied during open handle transition
    code === "ENOENT" ||  // Win32 STATUS_DELETE_PENDING transient rename state
    code === "EMFILE" ||  // Process file descriptor exhaustion
    code === "ENFILE"     // System file descriptor exhaustion
  );
}
```

Errors such as `EISDIR`, `ENOTDIR`, `EROFS`, or `EINVAL` are fatal and fail fast on attempt 0 without retrying.

---

## 5. Architectural Recommendation & Exact Code

### 5.1 Proposed Code Structure

We define four specialized helpers in `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`:
1. `getLockKey(filePath: string): string`: Normalizes and resolves file paths to lowercase on Windows, ensuring single-process mutex chains cannot be bypassed by path casing or relative vs absolute representations.
2. `calculateBackoffWithJitter(attempt: number, initMs?: number, maxMs?: number): number`: Computes backoff with jitter.
3. `atomicReplaceWithRetry(tmpPath: string, targetPath: string): Promise<void>`: Two-tiered atomic replacement:
   - **Tier 1**: Retries `rename(tmpPath, targetPath)` up to 6 times.
   - **Tier 2**: If rename fails after all retries, retries `copyFile(tmpPath, targetPath)` up to 6 times.
   - **Guarantee**: Wrapped with a `finally` block ensuring `tmpPath` is unlinked unconditionally.
4. `readFileWithRetry(filePath: string): Promise<string>`: Absorbs transient read contention during concurrent writes (protects Test 3.3).

### 5.2 Drop-In Replacement Implementation

#### Part 1: Mutex Canonicalization (lines 112–118)

**Before**:
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

**After**:
```typescript
// Concurrency mutex per file path to prevent race conditions during atomic writes.
// Canonicalizes path to prevent casing and format variations from bypassing mutex on Windows NTFS.
export function getLockKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

const fileLocks = new Map<string, Promise<unknown>>();
export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = getLockKey(filePath);
  const current = fileLocks.get(key) || Promise.resolve();
  const next = current
    .then(fn, fn)
    .finally(() => {
      // Memory hygiene: clean up resolved queue entries when idle
      if (fileLocks.get(key) === next) {
        fileLocks.delete(key);
      }
    });
  fileLocks.set(key, next as Promise<unknown>);
  return next;
}
```

#### Part 2: Retry Helpers and Windows Resilient Primitives (Add above line 240)

```typescript
/**
 * Detects transient filesystem error codes commonly caused by Windows file lock contention,
 * antivirus filter drivers, or delete-pending directory operations.
 */
export function isTransientFsError(code?: string): boolean {
  if (!code) return false;
  return (
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "EACCES" ||
    code === "ENOENT" ||
    code === "EMFILE" ||
    code === "ENFILE"
  );
}

/**
 * Calculates exponential backoff with proportional jitter.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  initialDelayMs = 25,
  maxDelayMs = 200
): number {
  const base = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
  // Jitter factor between 0.75 and 1.25 to prevent lock convoy synchronization
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.max(10, Math.floor(base * jitter));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads file with retry backoff to survive transient locks when other processes
 * are in the middle of atomic replacement or backup copy.
 */
export async function readFileWithRetry(filePath: string, maxRetries = 5): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fs.promises.readFile(filePath, "utf8");
    } catch (err: any) {
      lastErr = err;
      if (!isTransientFsError(err?.code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 20, 150);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Replaces targetPath with tmpPath using an atomic rename loop with exponential backoff & jitter.
 * Falls back to copyFile with backoff retry if rename is blocked by OS security / cross-link policies.
 */
export async function atomicReplaceWithRetry(
  tmpPath: string,
  targetPath: string,
  maxRetries = 6
): Promise<void> {
  let lastErr: unknown = null;

  // Tier 1: Try atomic rename with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.rename(tmpPath, targetPath);
      return; // Atomic rename succeeded
    } catch (err: any) {
      lastErr = err;
      if (!isTransientFsError(err?.code) || attempt === maxRetries) {
        break; // Fall through to Tier 2 copyFile fallback
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  // Tier 2: Windows fallback — copyFile + unlink with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.copyFile(tmpPath, targetPath);
      return; // Copy succeeded; tmpPath cleanup is guaranteed in caller finally block
    } catch (err: any) {
      lastErr = err;
      if (!isTransientFsError(err?.code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  throw lastErr;
}
```

#### Part 3: Resilient `readVaultNote` (lines 240–255)

**Before**:
```typescript
  let content: string;
  try {
    content = await fs.promises.readFile(notePath, "utf8");
  } catch {
    return null;
  }
```

**After**:
```typescript
  let content: string;
  try {
    content = await readFileWithRetry(notePath);
  } catch {
    return null;
  }
```

#### Part 4: Resilient `writeVaultNote` (lines 545–575)

**Before**:
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });
```

**After**:
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

      try {
        // Safe backup with transient error absorption (non-fatal)
        if (fs.existsSync(targetPath)) {
          try {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await fs.promises.copyFile(targetPath, bakPath);
                break;
              } catch (bErr: any) {
                if (!isTransientFsError(bErr?.code) || attempt === 2) break;
                await sleep(calculateBackoffWithJitter(attempt, 20, 80));
              }
            }
          } catch {
            // Backup failure is non-fatal
          }
        }

        // Perform atomic replace with exponential backoff & jitter retry loop
        await atomicReplaceWithRetry(tmpPath, targetPath, 6);

        return { success: true, filePath: targetPath };
      } finally {
        // Unconditional cleanup: ensures no orphaned .tmp files remain on disk under any error
        if (fs.existsSync(tmpPath)) {
          await fs.promises.unlink(tmpPath).catch(() => {});
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });
```

---

## 6. Synthesis & Invalidation Conditions

| Concern | Flaw in Challenger Report | Addressed in Proposed Design |
|---|---|---|
| **Case Collision Race (Test 3.2)** | `withFileLock` checked raw path string | `getLockKey` normalizes and lowers path casing on Windows. All representation variations serialize into one Promise chain. |
| **Lost Updates** | Unserialized writes overwrote each other | Serialization ensures read-modify-write runs strictly sequentially per file. |
| **Multi-Process EBUSY (Test 3.4)** | `rename` and `copyFile` failed on 1st lock | `atomicReplaceWithRetry` retries up to 6 times with 25ms–200ms backoff and jitter. |
| **Multi-Process ENOENT** | `copyFile` hit `STATUS_DELETE_PENDING` | `ENOENT` is classified as transient in `isTransientFsError`, allowing the pending delete to settle before retrying. |
| **Orphaned `.tmp` files** | `unlink` skipped if `copyFile` failed | `finally` block guarantees `unlink(tmpPath)` runs unconditionally. |
| **Concurrent Read Drops (Test 3.3)** | `readFile` returned `null` on transient lock | `readFileWithRetry` retries reads during write contention. |

### Invalidation Conditions
The fix is verified if:
1. `node tests/challenger_m1_2/test_case_race.mjs` outputs `SUCCESS: Both updates preserved (no lost updates)!`
2. `node tests/challenger_m1_2/debug_proc.mjs` outputs `Both child processes succeeded!` with 0 errors.
3. `node tests/challenger_m1_2/stress_runner.mjs` runs all 13 tests with **13 passed, 0 failed** and exit code 0.
