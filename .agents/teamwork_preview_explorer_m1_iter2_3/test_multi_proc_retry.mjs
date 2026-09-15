import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-test-proc-"));
  const clientesDir = path.join(tempDir, "Clientes");
  await fs.promises.mkdir(clientesDir, { recursive: true });

  const initialNote = `---
id: nipeihu
nombre: Nipeihu
tipo: cliente_externo
estado: activo
---
<!-- agente: antigravity -->

# Nipeihu 🪶
`;
  await fs.promises.writeFile(path.join(clientesDir, "Nipeihu.md"), initialNote, "utf8");

  const workerScript = path.join(tempDir, "worker.mjs");
  const code = `
    import fs from "node:fs";
    import path from "node:path";

    const [,, targetPath, id] = process.argv;

    async function retryOp(fn, maxRetries = 15, baseDelay = 20) {
      let lastErr;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          if (err && (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES")) {
            const jitter = Math.floor(Math.random() * 20);
            const delay = baseDelay * Math.pow(1.3, i) + jitter;
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw err;
          }
        }
      }
      throw lastErr;
    }

    async function safeWrite(iter) {
      // Step 1: read with retry
      const content = await retryOp(() => fs.promises.readFile(targetPath, "utf8"));

      // Step 2: write tmp
      const tmpPath = targetPath + "." + Date.now() + "." + Math.random().toString(36).slice(2, 6) + ".tmp";
      const newContent = content.replace(/estado: .*/, "estado: active_" + id + "_" + iter);
      await fs.promises.writeFile(tmpPath, newContent, "utf8");

      // Step 3: atomic commit with retry
      await retryOp(async () => {
        try {
          await fs.promises.rename(tmpPath, targetPath);
        } catch {
          await fs.promises.copyFile(tmpPath, targetPath);
          await fs.promises.unlink(tmpPath).catch(() => {});
        }
      });
      // Cleanup tmp if still exists
      await fs.promises.unlink(tmpPath).catch(() => {});
    }

    async function run() {
      for (let i = 0; i < 10; i++) {
        await safeWrite(i);
      }
      process.exit(0);
    }
    run().catch(err => {
      console.error("Worker " + id + " failed:", err);
      process.exit(1);
    });
  `;
  await fs.promises.writeFile(workerScript, code, "utf8");

  const filePath = path.join(clientesDir, "Nipeihu.md");

  // Launch 3 parallel processes
  const p1 = fork(workerScript, [filePath, "P1"], { stdio: "inherit" });
  const p2 = fork(workerScript, [filePath, "P2"], { stdio: "inherit" });
  const p3 = fork(workerScript, [filePath, "P3"], { stdio: "inherit" });

  const waitExit = p => new Promise((resolve, reject) => {
    p.on("exit", code => code === 0 ? resolve() : reject(new Error("Exit code " + code)));
    p.on("error", reject);
  });

  try {
    await Promise.all([waitExit(p1), waitExit(p2), waitExit(p3)]);
    console.log("SUCCESS: All 3 processes completed 10 concurrent writes each with 0 errors!");
  } catch (err) {
    console.error("FAILURE:", err.message);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(console.error);
