import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

try {
  const { createJiti } = require("../../agent-os-nipei/source/node_modules/jiti");
  const jiti = createJiti(import.meta.url, {
    alias: {
      "@/*": path.resolve(__dirname, "../../agent-os-nipei/source/src/*"),
    },
  });

  const vaultSyncEngine = jiti("../../agent-os-nipei/source/src/lib/vaultSyncEngine.ts");
  console.log("SUCCESS loading vaultSyncEngine.ts!");
  console.log("Exported keys:", Object.keys(vaultSyncEngine));
} catch (err) {
  console.error("FAIL loading:", err);
}
