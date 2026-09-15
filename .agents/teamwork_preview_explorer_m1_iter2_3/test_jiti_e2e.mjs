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

console.log("Loading production vaultSyncEngine.ts via jiti...");
const prodEngine = jiti(path.join(sourceDir, "src/lib/vaultSyncEngine.ts"));
console.log("Loaded prodEngine successfully. Exports:", Object.keys(prodEngine));

const note = await prodEngine.readVaultNote("Clientes/Nipeihu.md", "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment");
console.log("Read live note test:", note ? { id: note.id, nombre: note.nombre } : null);
