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
    "js-yaml": path.join(sourceDir, "node_modules/js-yaml"),
  },
});

const proposedEngine = jiti(path.join(__dirname, "proposed_vaultSyncEngine.ts"));

// Test bridging createVaultEngine
const bridgedEngine = proposedEngine.createVaultEngine("C:\\Users\\ondig\\Desktop\\DA\\digitalalignment");
const liveNipeihu = await bridgedEngine.readVaultNote("Clientes/Nipeihu.md");
console.log("Bridged engine read live note:", liveNipeihu ? { id: liveNipeihu.id, nombre: liveNipeihu.nombre, roadmapCount: liveNipeihu.roadmap?.length } : null);
