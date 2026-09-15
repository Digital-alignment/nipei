import fs from "node:fs";
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

// Load the proposed production vaultSyncEngine.ts
export const prodVaultEngine = jiti(path.join(__dirname, "proposed_vaultSyncEngine.ts"));

// Re-export task store, sync, and intake from the real engine.mjs
const originalEngine = jiti(path.resolve(__dirname, "../../tests/e2e/engine.mjs"));
export const VALID_TASK_STATUSES = originalEngine.VALID_TASK_STATUSES;
export const VALID_AGENTS = originalEngine.VALID_AGENTS;
export const VALID_PRIORITIES = originalEngine.VALID_PRIORITIES;
export const createTaskStore = originalEngine.createTaskStore;
export const syncTaskWithVault = originalEngine.syncTaskWithVault;
export const submitCompanyIntake = originalEngine.submitCompanyIntake;

// Export bridged createVaultEngine
export function createVaultEngine(vaultRoot) {
  return prodVaultEngine.createVaultEngine(vaultRoot);
}
