# Analysis: Mutex Lock Key Canonicalization & Concurrency Safety

**Agent**: Explorer M1 Iteration 2 (Agent 1 - Mutex Canonicalization)  
**Target Module**: `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`  
**Lines Analyzed**: 110–125 and line 503 (`withFileLock` and `writeVaultNote`)  
**Date**: 2026-09-04  

---

## Executive Summary

During Milestone 1 stress testing, Challenger 2 discovered a **Critical Concurrency Vulnerability** in `vaultSyncEngine.ts`: when concurrent writes were dispatched against the same file using different path representations (e.g. absolute path `C:\...\Clientes\Nipeihu.md` vs relative path `Clientes/nipeihu.md`), the internal mutex `withFileLock` was bypassed. This resulted in:
1. **Silent Data Loss (Lost Updates)**: Two writes read the original note concurrently before either wrote back; the last writer overwrote and erased the first writer's updates.
2. **Uncaught Windows `EBUSY` Crashes**: Concurrent processes/threads attempted simultaneous `rename`/`copyFile` operations on the same Windows file handle, throwing `EBUSY: resource busy or locked`.

This analysis details the exact root cause, inspects the JavaScript and Windows NTFS mechanics, evaluates edge cases (case-folding, slash normalization, relative vs absolute paths), and formulates the exact canonicalization logic (`getLockKey`) with an automatic self-cleaning Promise queue.

---

## 1. Codebase Inspection

### 1.1 Current Mutex Implementation (`vaultSyncEngine.ts:111–118`)
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

### 1.2 Current Call Site in `writeVaultNote` (`vaultSyncEngine.ts:502–504`)
```typescript
  // Serialize writes to the same file path using mutex
  return withFileLock(targetPath, async () => {
```

### 1.3 How `targetPath` is Derived (`vaultSyncEngine.ts:480–500`)
```typescript
  const root = resolveVaultRoot(customRoot);
  let targetPath = resolveNotePath(noteRelativePath, customRoot);

  if (!targetPath) {
    const folder = (data.tipo === "producto_propio") ? "Productos" : "Clientes";
    const folderPath = path.join(root, folder);
    if (!fs.existsSync(folderPath)) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }

    let normalized = noteRelativePath.replace(/\\/g, "/").trim();
    if (!normalized.toLowerCase().endsWith(".md")) {
      normalized = `${normalized}.md`;
    }
    if (normalized.includes("/")) {
      targetPath = path.join(root, normalized);
    } else {
      const baseName = data.nombre || data.id || path.basename(normalized, ".md");
      targetPath = path.join(folderPath, `${baseName}.md`);
    }
  }
```

And in `resolveNotePath` (`vaultSyncEngine.ts:189–212`):
```typescript
  if (path.isAbsolute(relPath)) {
    if (fs.existsSync(relPath)) return relPath;
  }

  const candidates = [
    path.join(root, normalized),
    path.join(root, `${normalized}.md`),
    path.join(root, "Clientes", normalized),
    path.join(root, "Clientes", `${normalized}.md`),
    path.join(root, "Productos", normalized),
    path.join(root, "Productos", `${normalized}.md`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
```

---

## 2. Root Cause Analysis: Why Lock Bypass Occurs

### 2.1 The Disconnect Between JavaScript Map and Windows NTFS
1. **JavaScript Map Key Semantics**:
   - `fileLocks` is a JavaScript `Map<string, Promise<unknown>>`.
   - Key lookup (`Map.prototype.get`) uses ECMAScript `SameValueZero` equality.
   - For strings, this requires exact, byte-by-byte code-unit equality:
     - `"C:\\...\\Nipeihu.md" !== "C:\\...\\nipeihu.md"`
     - `"C:/.../Nipeihu.md" !== "C:\\...\\Nipeihu.md"`
     - `"c:\\...\\Nipeihu.md" !== "C:\\...\\Nipeihu.md"`
     - `"Clientes/Nipeihu.md" !== "C:\\...\\Clientes\\Nipeihu.md"`

2. **Windows NTFS Semantics**:
   - The Windows NTFS filesystem is **case-insensitive and case-preserving**.
   - Win32 APIs accept both `/` and `\` as path delimiters.
   - Drive letters are case-insensitive (`c:` == `C:`).
   - Therefore, `C:\...\Clientes\Nipeihu.md` and `C:\...\Clientes\nipeihu.md` refer to the **identical physical file on disk**.

3. **The Bypass Trigger**:
   When caller A calls `writeVaultNote` with absolute path `C:\...\Clientes\Nipeihu.md`:
   - `resolveNotePath` returns `C:\...\Clientes\Nipeihu.md`.
   - `withFileLock` keys on `"C:\\...\\Clientes\\Nipeihu.md"`.
   When caller B calls `writeVaultNote` concurrently with relative path `Clientes/nipeihu.md`:
   - Because `fs.existsSync("C:\\...\\Clientes\\nipeihu.md")` evaluates to `true` on NTFS, `resolveNotePath` returns `C:\...\Clientes\nipeihu.md`.
   - `withFileLock` keys on `"C:\\...\\Clientes\\nipeihu.md"`.

Because `"C:\\...\\Clientes\\Nipeihu.md"` and `"C:\\...\\Clientes\\nipeihu.md"` are distinct string keys:
- `fileLocks.get(keyB)` returns `undefined`.
- Both caller A and caller B obtain their own independent Promise chains (`Promise.resolve()`).
- **The mutex is bypassed completely.**

### 2.2 Consequence 1: Silent Lost Updates
When two writes execute concurrently on the same note:
1. Caller A reads `Nipeihu.md` from disk: `{ categoria: "A", dominio: "nipeihu.org" }`.
2. Caller B reads `Nipeihu.md` from disk before Caller A writes back: `{ categoria: "A", dominio: "nipeihu.org" }`.
3. Caller A updates `categoria` to `"UPDATE_FROM_ABSOLUTE_PATH"`, writes `.tmp`, copies `.bak`, and renames `.tmp` -> `Nipeihu.md`.
4. Caller B updates `dominio` to `"update-from-relpath.org"` based on the stale state it read in step 2 (where `categoria` is `"A"`).
5. Caller B writes to disk, completely overwriting Caller A's update.
6. **Result**: Caller A's change to `categoria` is permanently lost, with no error thrown.

### 2.3 Consequence 2: Windows `EBUSY` File Locking Contention
When two writers attempt to replace or write to the same file at the exact same millisecond:
- Writer A opens `Nipeihu.md` or executes `rename(tmp, targetPath)` / `copyFile(tmp, targetPath)`.
- Windows locks the file handle with exclusive access (`FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`).
- Writer B simultaneously calls `readFile` or `copyFile` / `rename`.
- Windows kernel throws `ERROR_SHARING_VIOLATION` (error 32), which Node.js surfaces as:
  ```
  EBUSY: resource busy or locked, open 'C:\...\Clientes\Nipeihu.md'
  ```

---

## 3. Path Variations Requiring Canonicalization

Any robust solution must handle the full spectrum of path representations:

| Path Variation Type | Example Input 1 | Example Input 2 | NTFS Target | Mutex Result Without Fix |
|---|---|---|---|---|
| **Case Sensitivity** | `Clientes/Nipeihu.md` | `Clientes/nipeihu.md` | Same file | **BYPASS** |
| **Full Upper vs Lower** | `Clientes/NIPEHU.MD` | `Clientes/nipeihu.md` | Same file | **BYPASS** |
| **Drive Letter Case** | `C:\...\Clientes\Nipeihu.md` | `c:\...\Clientes\Nipeihu.md` | Same file | **BYPASS** |
| **Slashes vs Backslashes** | `C:/Users/.../Nipeihu.md` | `C:\Users\...\Nipeihu.md` | Same file | **BYPASS** |
| **Relative vs Absolute** | `Clientes/Nipeihu.md` | `C:\...\Clientes\Nipeihu.md` | Same file | **BYPASS** |
| **Relative Dot Segments** | `Clientes/./Nipeihu.md` | `Clientes/../Clientes/Nipeihu.md` | Same file | **BYPASS** |
| **Extension Omission** | `nipeihu` | `Clientes/Nipeihu.md` | Same file | **BYPASS** |

---

## 4. Proposed Solution: Canonical Key Logic

### 4.1 Canonicalization Function Specification
To guarantee that every representation maps to the identical mutex chain:
1. **Absolute Resolution**: Use `path.resolve(filePath)` to:
   - Convert relative paths to absolute paths.
   - Standardize slashes to the host platform separator (`\` on Windows).
   - Collapse relative dot segments (`.` and `..`).
   - Remove trailing slashes and redundant separators.
2. **Platform-Specific Case Normalization**:
   - On Windows (`process.platform === "win32"`): apply `.toLowerCase()` to the resolved path.
   - On POSIX/Linux (`process.platform !== "win32"`): preserve case (since ext4/xfs filesystems are case-sensitive).
3. **Pure String Operation (No Filesystem I/O)**:
   - Do NOT call `fs.realpathSync` or `fs.statSync`.
   - Rationale: The mutex must be acquirable *before* a file is created (e.g. initial note creation). Calling `fs.realpathSync` on a non-existent file throws `ENOENT`. `path.resolve` is pure, synchronous, deterministic, and never throws on missing files.

### 4.2 Exact Implementation of `getLockKey`
```typescript
/**
 * Canonicalizes a file path for use as a mutex lock key.
 * Resolves to an absolute normalized path and lowercases on Windows (case-insensitive NTFS).
 */
export function getLockKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
```

### 4.3 Enhanced `withFileLock` with Internal Canonicalization & Self-Cleaning
Rather than relying on callers to remember `getLockKey`, encapsulate canonicalization directly inside `withFileLock`:

```typescript
// Concurrency mutex per file path to prevent race conditions during atomic writes
const fileLocks = new Map<string, Promise<unknown>>();

/**
 * Executes an asynchronous function under an exclusive per-file mutex lock.
 * Automatically canonicalizes the file path key to prevent Windows NTFS casing and path-format bypasses.
 * Self-cleans idle promise chains to prevent memory leakage in long-running processes.
 */
export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = getLockKey(filePath);
  const current = fileLocks.get(key) || Promise.resolve();
  const next = current.then(fn, fn);
  fileLocks.set(key, next as Promise<unknown>);

  // Self-cleaning: remove entry when queue settles if no new task was queued behind it
  next.finally(() => {
    if (fileLocks.get(key) === next) {
      fileLocks.delete(key);
    }
  });

  return next;
}
```

### 4.4 Why Internal Canonicalization is Superior
1. **Zero Caller Burden**: Line 503 (`return withFileLock(targetPath, async () => { ... })`) is immediately secured without requiring refactoring.
2. **Future-Proof**: Any new code in `vaultSyncEngine.ts` or other modules calling `withFileLock` is automatically protected against casing collisions.
3. **Idempotence**: `getLockKey(getLockKey(p)) === getLockKey(p)`. If a caller passes an already canonicalized key, the result is identical.
4. **Memory Hygiene**: The `.finally()` cleanup guarantees that `fileLocks` does not accumulate thousands of resolved promise references over long uptime periods.

---

## 5. Verification & Test Plan

### 5.1 Deterministic Key Mapping Verification
Verify that all 5 variations tested by Challenger 2 produce the identical key:
```typescript
const root = "C:\\Users\\ondig\\AppData\\Local\\Temp\\vault";
const variations = [
  path.join(root, "Clientes", "Nipeihu.md"),
  path.join(root, "Clientes", "nipeihu.md"),
  path.join(root, "Clientes", "NIPEHU.MD"),
  "C:/Users/ondig/AppData/Local/Temp/vault/Clientes/Nipeihu.md",
  "c:\\users\\ondig\\appdata\\local\\temp\\vault\\clientes\\nipeihu.md"
];

const keys = variations.map(getLockKey);
const uniqueKeys = new Set(keys);
assert(uniqueKeys.size === 1, "All variations must produce exactly 1 canonical key");
```

### 5.2 Concurrency Race Test (`test_case_race.mjs`)
Run:
```pwsh
node tests/challenger_m1_2/test_case_race.mjs
```
- Write 1: updates `categoria: "UPDATE_FROM_ABSOLUTE_PATH"` using absolute path.
- Write 2: updates `dominio: "update-from-relpath.org"` using relative lowercase path.
- **Expected Outcome**:
  - Result 1 succeeds.
  - Result 2 succeeds.
  - Final note contains `categoria: "UPDATE_FROM_ABSOLUTE_PATH"` AND `dominio: "update-from-relpath.org"`.
  - Zero lost updates.

### 5.3 Adversarial Stress Suite (`stress_runner.mjs`)
Run:
```pwsh
node tests/challenger_m1_2/stress_runner.mjs
```
- Test 3.1: 20 concurrent writes to same file path -> PASS.
- Test 3.2: 5 path variations under concurrent writes -> PASS (0 `EBUSY` errors).
- Test 3.3: 50 interleaved reads and writes -> PASS.

---

## 6. Implementation Patch Recommendation

A minimal, targeted code patch for `agent-os-nipei/source/src/lib/vaultSyncEngine.ts`:

```diff
--- a/agent-os-nipei/source/src/lib/vaultSyncEngine.ts
+++ b/agent-os-nipei/source/src/lib/vaultSyncEngine.ts
@@ -111,9 +111,26 @@ const KNOWN_DA_FIELDS = new Set([
 // Concurrency mutex per file path to prevent race conditions during atomic writes
 const fileLocks = new Map<string, Promise<unknown>>();
+
+/**
+ * Canonicalizes a file path for use as a mutex lock key.
+ * Resolves to an absolute normalized path and lowercases on Windows (case-insensitive NTFS).
+ */
+export function getLockKey(filePath: string): string {
+  const resolved = path.resolve(filePath);
+  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
+}
+
-function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
-  const current = fileLocks.get(filePath) || Promise.resolve();
+export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
+  const key = getLockKey(filePath);
+  const current = fileLocks.get(key) || Promise.resolve();
   const next = current.then(fn, fn);
-  fileLocks.set(filePath, next as Promise<unknown>);
+  fileLocks.set(key, next as Promise<unknown>);
+  next.finally(() => {
+    if (fileLocks.get(key) === next) {
+      fileLocks.delete(key);
+    }
+  });
   return next;
 }
```
