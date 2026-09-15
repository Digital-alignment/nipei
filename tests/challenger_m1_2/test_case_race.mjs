import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const { createJiti } = require("../../agent-os-nipei/source/node_modules/jiti");
const jiti = createJiti(path.join(sourceDir, "package.json"), {
  alias: {
    "@": path.join(sourceDir, "src"),
  },
});

const vaultSyncEngine = jiti("./src/lib/vaultSyncEngine.ts");
const { readVaultNote, writeVaultNote } = vaultSyncEngine;

async function main() {
  console.log("Testing path representation race condition on Windows...");
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-case-race-"));
  const clientesDir = path.join(tempDir, "Clientes");
  await fs.promises.mkdir(clientesDir, { recursive: true });

  const liveVault = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";
  await fs.promises.copyFile(path.join(liveVault, "Clientes", "Nipeihu.md"), path.join(clientesDir, "Nipeihu.md"));

  const absPath = path.join(tempDir, "Clientes", "Nipeihu.md");
  const relPath = "Clientes/nipeihu.md"; // lowercase

  // Both point to the exact same file on Windows disk
  const p1 = writeVaultNote(absPath, { categoria: "UPDATE_FROM_ABSOLUTE_PATH" }, tempDir);
  const p2 = writeVaultNote(relPath, { dominio: "update-from-relpath.org" }, tempDir);

  const [res1, res2] = await Promise.all([p1, p2]);
  console.log("Result 1 (absPath):", res1);
  console.log("Result 2 (relPath):", res2);

  const finalNote = await readVaultNote("Clientes/Nipeihu.md", tempDir);
  console.log("Final note categoria:", finalNote?.categoria);
  console.log("Final note dominio:", finalNote?.dominio);

  await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

main().catch(console.error);
