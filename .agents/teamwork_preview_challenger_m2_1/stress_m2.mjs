/**
 * EMPIRICAL CHALLENGER M2_1 — ADVERSARIAL STRESS TEST HARNESS (Local Runner)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testRunner = path.resolve(__dirname, "../../tests/challenger_m2_1/stress_m2.mjs");

// Re-export / run the root test suite
import(testRunner);
