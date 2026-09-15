import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-debug-proc-"));
  const clientesDir = path.join(tempDir, "Clientes");
  await fs.promises.mkdir(clientesDir, { recursive: true });

  const liveVault = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";
  await fs.promises.copyFile(path.join(liveVault, "Clientes", "Nipeihu.md"), path.join(clientesDir, "Nipeihu.md"));

  const workerScript = path.join(tempDir, "worker_writer.mjs");
  const jitiPath = path.resolve(__dirname, "../../agent-os-nipei/source/node_modules/jiti");
  const sourcePath = path.resolve(__dirname, "../../agent-os-nipei/source");

  const code = `
    import path from "node:path";
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);
    const { createJiti } = require(${JSON.stringify(jitiPath)});
    const jiti = createJiti(${JSON.stringify(path.join(sourcePath, "package.json"))}, {
      alias: { "@": ${JSON.stringify(path.join(sourcePath, "src"))} }
    });
    const { writeVaultNote } = jiti("./src/lib/vaultSyncEngine.ts");

    const [,, vaultDir, id] = process.argv;

    async function run() {
      for (let i = 0; i < 5; i++) {
        const res = await writeVaultNote("Clientes/Nipeihu.md", {
          categoria: "Process " + id + " iteration " + i
        }, vaultDir);
        if (!res.success) {
          console.error("CHILD ERROR in " + id + " iter " + i + ":", res.error);
          process.exit(1);
        }
      }
      process.exit(0);
    }
    run().catch(err => {
      console.error("FATAL CHILD ERR:", err);
      process.exit(1);
    });
  `;
  await fs.promises.writeFile(workerScript, code, "utf8");

  const p1 = fork(workerScript, [tempDir, "P1"], { stdio: "inherit" });
  const p2 = fork(workerScript, [tempDir, "P2"], { stdio: "inherit" });

  const waitForExit = (p) =>
    new Promise((resolve, reject) => {
      p.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Process exited with code ${code}`));
      });
      p.on("error", reject);
    });

  try {
    await Promise.all([waitForExit(p1), waitForExit(p2)]);
    console.log("Both child processes succeeded!");
  } catch (err) {
    console.error("FAILED multi-process test:", err.message);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(console.error);
