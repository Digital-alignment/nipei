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
  console.log("Testing lost updates under concurrent writes...");
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "nipei-lost-updates-"));
  const clientesDir = path.join(tempDir, "Clientes");
  await fs.promises.mkdir(clientesDir, { recursive: true });

  const liveVault = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";
  await fs.promises.copyFile(path.join(liveVault, "Clientes", "Nipeihu.md"), path.join(clientesDir, "Nipeihu.md"));

  // Write 1 wants to update categoria
  // Write 2 wants to update dominio
  // Both are fired at the exact same millisecond
  const p1 = writeVaultNote("Clientes/Nipeihu.md", { categoria: "NEW_CATEGORIA_A" }, tempDir);
  const p2 = writeVaultNote("Clientes/Nipeihu.md", { dominio: "new-dominio-b.org" }, tempDir);

  const [res1, res2] = await Promise.all([p1, p2]);
  console.log("Write 1 result:", res1);
  console.log("Write 2 result:", res2);

  const finalNote = await readVaultNote("Clientes/Nipeihu.md", tempDir);
  console.log("Final note categoria:", finalNote.categoria);
  console.log("Final note dominio:", finalNote.dominio);

  if (finalNote.categoria === "NEW_CATEGORIA_A" && finalNote.dominio === "new-dominio-b.org") {
    console.log("SUCCESS: Both updates preserved (no lost updates)!");
  } else {
    console.log("FAILURE: LOST UPDATE DETECTED!");
    if (finalNote.categoria !== "NEW_CATEGORIA_A") console.log("Lost update: categoria was overwritten or lost!");
    if (finalNote.dominio !== "new-dominio-b.org") console.log("Lost update: dominio was overwritten or lost!");
  }

  await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

main().catch(console.error);
