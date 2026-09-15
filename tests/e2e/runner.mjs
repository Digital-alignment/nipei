#!/usr/bin/env node

/**
 * Master Standalone E2E Test Runner for Nipëi OS
 * Runs the complete 4-Tier Opaque-Box E2E Test Suite:
 * - Tier 1: Feature Coverage (30 test cases across 5 features)
 * - Tier 2: Boundary & Corner Cases (9 test cases)
 * - Tier 3: Cross-Feature Combinations (6 test cases)
 * - Tier 4: Real-World Scenarios (5 test cases)
 * Total: 50 automated tests
 *
 * Usage:
 *   node tests/e2e/runner.mjs
 */

import { runAllSuites, clearSuites } from "./harness.mjs";
import { registerTier1Tests } from "./tier1_feature_coverage.mjs";
import { registerTier2Tests } from "./tier2_boundary_corner.mjs";
import { registerTier3Tests } from "./tier3_cross_feature.mjs";
import { registerTier4Tests } from "./tier4_real_world.mjs";

async function main() {
  clearSuites();

  // Register all 4 tiers
  registerTier1Tests();
  registerTier2Tests();
  registerTier3Tests();
  registerTier4Tests();

  const results = await runAllSuites();

  if (results.failed > 0) {
    console.error(`\nTest suite finished with ${results.failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\nTest suite finished successfully with 0 failures.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
