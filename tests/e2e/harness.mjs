/**
 * E2E Test Harness for Nipëi OS
 * Lightweight, zero-dependency async test framework supporting:
 * describe, test/it, expect assertions, before/after hooks, and structured reporting.
 */

// Color codes for terminal output
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be" : "to be"} ${JSON.stringify(expected)}`,
          actual,
          expected
        );
      }
    },
    toEqual(expected) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected deep equality: ${isNot ? "NOT equal to" : "equal to"}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual:   ${JSON.stringify(actual, null, 2)}`,
          actual,
          expected
        );
      }
    },
    toContain(item) {
      let pass = false;
      if (typeof actual === "string") {
        pass = actual.includes(item);
      } else if (Array.isArray(actual)) {
        pass = actual.some((el) => deepEqual(el, item));
      } else if (actual instanceof Set) {
        pass = actual.has(item);
      } else if (typeof actual === "object" && actual !== null) {
        pass = Object.prototype.hasOwnProperty.call(actual, item);
      }
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected collection ${isNot ? "NOT to contain" : "to contain"} ${JSON.stringify(item)}`,
          actual,
          item
        );
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected value ${isNot ? "to be undefined" : "to be defined"}, but got ${actual}`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected value ${isNot ? "not to be undefined" : "to be undefined"}, but got ${actual}`);
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected value ${isNot ? "not to be null" : "to be null"}, but got ${actual}`);
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be truthy" : "to be truthy"}`);
      }
    },
    toBeFalsy() {
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be falsy" : "to be falsy"}`);
      }
    },
    toBeGreaterThan(expected) {
      const pass = actual > expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? "<=" : ">"} ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      const pass = actual >= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? "<" : ">="} ${expected}`);
      }
    },
    toBeLessThan(expected) {
      const pass = actual < expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? ">=" : "<"} ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      const pass = actual <= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${actual} ${isNot ? ">" : "<="} ${expected}`);
      }
    },
    toMatch(regex) {
      const r = typeof regex === "string" ? new RegExp(regex) : regex;
      const pass = r.test(String(actual));
      if (isNot ? pass : !pass) {
        throw new AssertionError(`Expected ${String(actual)} ${isNot ? "NOT to match" : "to match"} ${r}`);
      }
    },
    toThrow(expectedError) {
      let threw = false;
      let thrownError = null;
      if (typeof actual !== "function") {
        throw new AssertionError("expect(fn).toThrow() requires a function");
      }
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }
      if (isNot ? threw : !threw) {
        throw new AssertionError(
          isNot
            ? `Expected function NOT to throw, but threw: ${thrownError?.message}`
            : "Expected function to throw, but it did not throw"
        );
      }
      if (threw && expectedError) {
        if (typeof expectedError === "string") {
          if (!thrownError.message.includes(expectedError)) {
            throw new AssertionError(
              `Expected error message to contain "${expectedError}", but was: "${thrownError.message}"`
            );
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(thrownError.message)) {
            throw new AssertionError(
              `Expected error message to match ${expectedError}, but was: "${thrownError.message}"`
            );
          }
        }
      }
    },
  });

  const base = matchers(false);
  base.not = matchers(true);
  return base;
}

// Global registry of test suites
const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
  };
  suites.push(suite);

  const prevSuite = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

export function test(name, fn) {
  if (!currentSuite) {
    describe("Default Suite", () => {
      currentSuite.tests.push({ name, fn });
    });
  } else {
    currentSuite.tests.push({ name, fn });
  }
}

export const it = test;

export function beforeAll(fn) {
  if (currentSuite) currentSuite.beforeAllHooks.push(fn);
}

export function afterAll(fn) {
  if (currentSuite) currentSuite.afterAllHooks.push(fn);
}

export function beforeEach(fn) {
  if (currentSuite) currentSuite.beforeEachHooks.push(fn);
}

export function afterEach(fn) {
  if (currentSuite) currentSuite.afterEachHooks.push(fn);
}

export function clearSuites() {
  suites.length = 0;
  currentSuite = null;
}

export async function runAllSuites() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}            NIPËI OS — OPAQUE-BOX E2E TEST RUNNER                      ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  let totalCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  const failures = [];
  const startTime = Date.now();

  for (const suite of suites) {
    console.log(`\n${BOLD}${YELLOW}► Suite: ${suite.name}${RESET}`);

    // Run beforeAll
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    for (const t of suite.tests) {
      totalCount++;
      const testStart = Date.now();

      // Run beforeEach
      for (const hook of suite.beforeEachHooks) {
        await hook();
      }

      try {
        await t.fn();
        const duration = Date.now() - testStart;
        passedCount++;
        console.log(`  ${GREEN}✔${RESET} ${t.name} ${GRAY}(${duration}ms)${RESET}`);
      } catch (err) {
        const duration = Date.now() - testStart;
        failedCount++;
        console.log(`  ${RED}✖${RESET} ${t.name} ${GRAY}(${duration}ms)${RESET}`);
        failures.push({
          suite: suite.name,
          test: t.name,
          error: err,
        });
      } finally {
        // Run afterEach
        for (const hook of suite.afterEachHooks) {
          try {
            await hook();
          } catch (hookErr) {
            console.error(`Error in afterEach hook:`, hookErr);
          }
        }
      }
    }

    // Run afterAll
    for (const hook of suite.afterAllHooks) {
      try {
        await hook();
      } catch (hookErr) {
        console.error(`Error in afterAll hook:`, hookErr);
      }
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log(`\n${BOLD}----------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}                       EXECUTION SUMMARY                              ${RESET}`);
  console.log(`${BOLD}----------------------------------------------------------------------${RESET}`);
  console.log(`Total Test Suites: ${suites.length}`);
  console.log(`Total Test Cases:  ${totalCount}`);
  console.log(`Passed:            ${GREEN}${passedCount}${RESET}`);
  console.log(`Failed:            ${failedCount > 0 ? RED + failedCount : "0"}${RESET}`);
  console.log(`Duration:          ${totalDuration}ms`);

  if (failures.length > 0) {
    console.log(`\n${BOLD}${RED}FAILURES DETAIL (${failures.length}):${RESET}`);
    for (let i = 0; i < failures.length; i++) {
      const f = failures[i];
      console.log(`\n${RED}${i + 1}) [${f.suite}] ${f.test}${RESET}`);
      console.log(GRAY + (f.error?.stack || f.error?.message || String(f.error)) + RESET);
    }
  } else {
    console.log(`\n${BOLD}${GREEN}✔ ALL E2E TESTS PASSED SUCCESSFULLY!${RESET}\n`);
  }

  return {
    total: totalCount,
    passed: passedCount,
    failed: failedCount,
    durationMs: totalDuration,
    failures,
  };
}
