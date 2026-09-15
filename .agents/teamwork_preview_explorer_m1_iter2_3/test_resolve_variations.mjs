import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const { createJiti } = require(path.join(sourceDir, "node_modules/jiti"));
const jiti = createJiti(path.join(sourceDir, "package.json"), {
  alias: {
    "@": path.join(sourceDir, "src"),
  },
});

const prodVaultSyncEngine = jiti(path.join(sourceDir, "src/lib/vaultSyncEngine.ts"));
const { resolveNotePath } = prodVaultSyncEngine;

const vaultRoot = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment";

const variations = [
  "Clientes/Nipeihu.md",
  "Clientes/nipeihu.md",
  "nipeihu",
  "Clientes/NIPEHU.MD",
  path.join(vaultRoot, "Clientes", "Nipeihu.md"),
];

for (const v of variations) {
  const resolved = resolveNotePath(v, vaultRoot);
  console.log(`Variation: '${v}' -> '${resolved}'`);
}
