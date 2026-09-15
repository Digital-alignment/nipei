import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const testsDir = path.resolve(__dirname, "../../tests/e2e");

const { createJiti } = require(path.join(sourceDir, "node_modules/jiti"));
const jiti = createJiti(path.join(testsDir, "runner.mjs"), {
  alias: {
    "./engine.mjs": path.join(__dirname, "bridged_engine.mjs"),
  },
});

const { runAllSuites, clearSuites } = jiti(path.join(testsDir, "harness.mjs"));

const tier1 = jiti(path.join(testsDir, "tier1_feature_coverage.mjs"));
const tier2 = jiti(path.join(testsDir, "tier2_boundary_corner.mjs"));
const tier3 = jiti(path.join(testsDir, "tier3_cross_feature.mjs"));
const tier4 = jiti(path.join(testsDir, "tier4_real_world.mjs"));

clearSuites();

tier1.registerTier1Tests();
tier2.registerTier2Tests();
tier3.registerTier3Tests();
tier4.registerTier4Tests();

const results = await runAllSuites();
console.log(`\nBridged 50 E2E Run: ${results.passed} passed, ${results.failed} failed out of ${results.total}`);
if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
