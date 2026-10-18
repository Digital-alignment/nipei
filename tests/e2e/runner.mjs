#!/usr/bin/env node

/**
 * E2E runner for the Nipëi OS single task store (vault task notes + /api/agent-kanban).
 *
 * Usage:
 *   node tests/e2e/runner.mjs                                  # starts next dev on :3123 itself
 *   E2E_BASE_URL=http://localhost:3000 node tests/e2e/runner.mjs  # reuse a running server
 *
 * Writes only zz_e2e_* task notes / workspaces in the vault and deletes them afterwards;
 * fails if any real task note changed during the run.
 */

import { runAllSuites, clearSuites } from "./harness.mjs";
import { ensureServer, BASE_URL } from "./engine.mjs";
import { cleanupAll, snapshotRealTasks, VAULT_ROOT } from "./fixtures.mjs";
import { registerTier1Tests } from "./tier1_feature_coverage.mjs";
import { registerTier2Tests } from "./tier2_boundary_corner.mjs";
import { registerTier3Tests } from "./tier3_cross_feature.mjs";
import { registerTier4Tests } from "./tier4_real_world.mjs";

async function main() {
  const server = await ensureServer();
  console.log(`Server: ${BASE_URL}  Vault: ${VAULT_ROOT}`);

  let failed = 0;
  try {
    cleanupAll(); // leftovers from an aborted run
    const before = snapshotRealTasks();

    clearSuites();
    registerTier1Tests();
    registerTier2Tests();
    registerTier3Tests();
    registerTier4Tests();
    failed = (await runAllSuites()).failed;

    const after = snapshotRealTasks();
    const changed = Object.keys({ ...before, ...after }).filter((f) => before[f] !== after[f]);
    if (changed.length) {
      console.error(`\nReal task notes changed during the run: ${changed.join(", ")}`);
      failed++;
    }
  } finally {
    const left = cleanupAll();
    if (left.length) console.log(`Cleanup removed ${left.length} leftover e2e artifacts.`);
    server.stop();
  }

  if (failed > 0) {
    console.error(`\nTest suite finished with ${failed} failures.`);
    process.exit(1);
  }
  console.log(`\nTest suite finished successfully with 0 failures.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
