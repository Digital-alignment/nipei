/**
 * EMPIRICAL CHALLENGER M2_1 — ADVERSARIAL STRESS TEST HARNESS
 * Target:
 *  - agent-os-nipei/source/src/lib/agentTaskStore.ts
 *  - agent-os-nipei/source/src/app/api/agent-tasks/route.ts
 *  - agent-os-nipei/source/src/app/api/agent-tasks/execute/route.ts
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sourceDir = path.resolve(__dirname, "../../agent-os-nipei/source");
const { createJiti } = require(path.join(sourceDir, "node_modules/jiti"));
const jiti = createJiti(path.join(sourceDir, "package.json"), {
  alias: {
    "@": path.join(sourceDir, "src"),
  },
});

// Load production modules
const agentTaskStore = jiti("./src/lib/agentTaskStore.ts");
const {
  getTasks,
  getTaskById,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  appendLog,
  moveTaskStatus,
  createTaskStore,
  resolveTaskStorePath,
  ensureTaskStoreDir,
  getLockKey,
  withFileLock,
  PRIORITY_WEIGHT,
  VALID_TASK_STATUSES,
  VALID_AGENTS,
  VALID_PRIORITIES,
} = agentTaskStore;

const tasksRoute = jiti("./src/app/api/agent-tasks/route.ts");
const executeRoute = jiti("./src/app/api/agent-tasks/execute/route.ts");
const vaultSyncEngine = jiti("./src/lib/vaultSyncEngine.ts");
const { readVaultNote, writeVaultNote } = vaultSyncEngine;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function runTest(name, fn) {
  totalTests++;
  process.stdout.write(`  [TEST ${totalTests}] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`PASSED (${duration}ms)`);
    passedTests++;
    testResults.push({ name, status: "PASS", duration });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAILED (${duration}ms)`);
    console.error(`    Error: ${err.message}`);
    if (err.stack) {
      console.error(`    Stack: ${err.stack.split("\n").slice(1, 4).join("\n")}`);
    }
    failedTests++;
    testResults.push({ name, status: "FAIL", duration, error: err.message });
  }
}

async function createTempSandbox() {
  const sandboxDir = path.join(os.tmpdir(), `challenger-m2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  await fs.promises.mkdir(sandboxDir, { recursive: true });

  const tasksFilePath = path.join(sandboxDir, "agent-tasks.json");
  const vaultDir = path.join(sandboxDir, "vault");
  const clientesDir = path.join(vaultDir, "Clientes");
  await fs.promises.mkdir(clientesDir, { recursive: true });

  // Seed sample client note in temp vault
  const sampleNoteContent = `---
id: nipeihu
nombre: Nipeihu
tipo: cliente_externo
estado: activo
rubro: comunidad_cultura
roadmap:
  - id: agente-whatsapp-clientes
    texto: Implementar agente WhatsApp
    prioridad: alta
    hecho: false
    estado: pendiente
---
<!-- agente: antigravity -->

# Nipeihu 🪶
Contenido de prueba.
`;
  await fs.promises.writeFile(path.join(clientesDir, "Nipeihu.md"), sampleNoteContent, "utf8");

  return {
    sandboxDir,
    tasksFilePath,
    vaultDir,
    clientesDir,
    cleanup: async () => {
      try {
        await fs.promises.rm(sandboxDir, { recursive: true, force: true });
      } catch {}
    },
  };
}

async function main() {
  console.log("======================================================================");
  console.log("   EMPIRICAL CHALLENGER M2_1 — ADVERSARIAL STRESS TEST HARNESS        ");
  console.log("======================================================================\n");

  const sandbox = await createTempSandbox();

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: BOUNDARY CONDITIONS & STRING RIGOR
    // -------------------------------------------------------------------------
    console.log("--- SUITE 1: Boundary Conditions & String Rigor ---");

    await runTest("1.1 Empty title throws error in createTask", async () => {
      let threw = false;
      try {
        await createTask({ title: "" }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("Task title is required"), `Expected error message, got: ${err.message}`);
      }
      assert(threw, "createTask should throw for empty title");
    });

    await runTest("1.2 Whitespace-only title throws error in createTask", async () => {
      let threw = false;
      try {
        await createTask({ title: "   \t\r\n  " }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("Task title is required"), `Expected error message, got: ${err.message}`);
      }
      assert(threw, "createTask should throw for whitespace title");
    });

    await runTest("1.3 Non-string or null title throws error in createTask", async () => {
      let threw = false;
      try {
        await createTask({ title: null }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
      }
      assert(threw, "createTask should throw for null title");

      threw = false;
      try {
        await createTask({ title: 12345 }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
      }
      assert(threw, "createTask should throw for numeric title");
    });

    await runTest("1.4 Title whitespace trimming", async () => {
      const task = await createTask({ title: "   Clean Trimmed Title   " }, sandbox.tasksFilePath);
      assertEqual(task.title, "Clean Trimmed Title", "Title was not trimmed");
    });

    await runTest("1.5 Oversized title (10,000 chars) & description (50,000 chars)", async () => {
      const hugeTitle = "A".repeat(10_000);
      const hugeDesc = "# Huge Description\n" + "B".repeat(50_000) + "\nEnd of description.";
      const task = await createTask({ title: hugeTitle, description: hugeDesc }, sandbox.tasksFilePath);
      assertEqual(task.title.length, 10_000, "Title length mismatch");
      assertEqual(task.description.length, hugeDesc.length, "Description length mismatch");

      const readBack = await getTaskById(task.id, sandbox.tasksFilePath);
      assert(readBack !== null, "Failed to retrieve task with large payload");
      assertEqual(readBack.title.length, 10_000);
      assertEqual(readBack.description.length, hugeDesc.length);
    });

    await runTest("1.6 Unicode international characters in title and description", async () => {
      const unicodeTitle = "Nipëi 🪶 ñ á é í ó ú - Привет мир - 中文任务测试 - 日本語タスク - مهمة تجريبية";
      const unicodeDesc = "Multi-script: Здравствуйте / こんにちは / مرحبا / España / Ça va / Grüezi 🚀";
      const task = await createTask({ title: unicodeTitle, description: unicodeDesc }, sandbox.tasksFilePath);

      const readBack = await getTaskById(task.id, sandbox.tasksFilePath);
      assertEqual(readBack.title, unicodeTitle, "Unicode title corrupted");
      assertEqual(readBack.description, unicodeDesc, "Unicode description corrupted");
    });

    await runTest("1.7 Complex Emojis and ZWJ sequences in title, description, and tags", async () => {
      const emojiTitle = "🚀 Launch 💻 Agent 👨‍💻 Programmer 👩‍🔬 Scientist 🏳️‍🌈 Flag 🔥";
      const emojiTags = ["🔥urgent", "🚀m2", "🤖agent-os", "👨‍💻dev"];
      const task = await createTask(
        { title: emojiTitle, tags: emojiTags, description: "Testing emojis: ⚡ ✨ 🌟 💡 🎯" },
        sandbox.tasksFilePath
      );

      const readBack = await getTaskById(task.id, sandbox.tasksFilePath);
      assertEqual(readBack.title, emojiTitle, "Emoji title corrupted");
      assertEqual(readBack.tags.length, 4, "Tags length mismatch");
      assertEqual(readBack.tags[0], "🔥urgent");
      assertEqual(readBack.tags[2], "🤖agent-os");
    });

    await runTest("1.8 Markdown code blocks, script injection, and horizontal rules in description", async () => {
      const maliciousPayload = `<script>alert('XSS')</script>
\`\`\`typescript
const a = 1;
// Dangerous regex: /([a-z]+)+$/
\`\`\`
---
Horizontal Rule Above and Below
***
[Click Here](javascript:alert(1))
`;
      const task = await createTask(
        { title: "Special Content Task", description: maliciousPayload },
        sandbox.tasksFilePath
      );

      const readBack = await getTaskById(task.id, sandbox.tasksFilePath);
      assertEqual(readBack.description, maliciousPayload, "Special markdown corrupted or truncated");
    });

    await runTest("1.9 Empty or missing description defaults to empty string", async () => {
      const task = await createTask({ title: "No description task" }, sandbox.tasksFilePath);
      assertEqual(task.description, "", "Default description should be empty string");
    });

    // -------------------------------------------------------------------------
    // SUITE 2: STRICT ENUM VALIDATION & DEFAULTS
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 2: Strict Enum Validation & Defaults ---");

    await runTest("2.1 Invalid status in createTask throws error", async () => {
      const invalidStatuses = ["TODO", "pending", "in-progress", "completed", ""];
      for (const st of invalidStatuses) {
        let threw = false;
        try {
          await createTask({ title: "Task", status: st }, sandbox.tasksFilePath);
        } catch (err) {
          threw = true;
          assert(err.message.includes("Invalid status"), `Expected invalid status error, got: ${err.message}`);
        }
        assert(threw, `createTask should throw for invalid status '${st}'`);
      }
    });

    await runTest("2.2 Invalid priority in createTask throws error", async () => {
      const invalidPriorities = ["P0", "critical", "urgent", "high", "low", ""];
      for (const pr of invalidPriorities) {
        let threw = false;
        try {
          await createTask({ title: "Task", priority: pr }, sandbox.tasksFilePath);
        } catch (err) {
          threw = true;
          assert(err.message.includes("Invalid priority"), `Expected invalid priority error, got: ${err.message}`);
        }
        assert(threw, `createTask should throw for invalid priority '${pr}'`);
      }
    });

    await runTest("2.3 Invalid assignedAgent in createTask throws error", async () => {
      const invalidAgents = ["gpt4", "copilot", "gemini", "CLAUDE", ""];
      for (const ag of invalidAgents) {
        let threw = false;
        try {
          await createTask({ title: "Task", assignedAgent: ag }, sandbox.tasksFilePath);
        } catch (err) {
          threw = true;
          assert(err.message.includes("Invalid assignedAgent"), `Expected invalid agent error, got: ${err.message}`);
        }
        assert(threw, `createTask should throw for invalid assignedAgent '${ag}'`);
      }
    });

    await runTest("2.4 Default values applied when optional enums are omitted", async () => {
      const task = await createTask({ title: "Default Values Task" }, sandbox.tasksFilePath);
      assertEqual(task.status, "backlog", "Default status must be 'backlog'");
      assertEqual(task.priority, "media", "Default priority must be 'media'");
      assertEqual(task.assignedAgent, "claude", "Default assignedAgent must be 'claude'");
    });

    await runTest("2.5 All valid enums succeed in createTask", async () => {
      for (const st of VALID_TASK_STATUSES) {
        for (const ag of VALID_AGENTS) {
          for (const pr of VALID_PRIORITIES) {
            const task = await createTask(
              { title: `Valid ${st}-${ag}-${pr}`, status: st, assignedAgent: ag, priority: pr },
              sandbox.tasksFilePath
            );
            assertEqual(task.status, st);
            assertEqual(task.assignedAgent, ag);
            assertEqual(task.priority, pr);
          }
        }
      }
    });

    await runTest("2.6 Invalid enum in updateTask throws error", async () => {
      const task = await createTask({ title: "Update Enum Test" }, sandbox.tasksFilePath);

      let threw = false;
      try {
        await updateTask(task.id, { status: "invalid_status" }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("Invalid status"));
      }
      assert(threw, "updateTask should throw for invalid status");

      threw = false;
      try {
        await updateTask(task.id, { priority: "super_high" }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("Invalid priority"));
      }
      assert(threw, "updateTask should throw for invalid priority");

      threw = false;
      try {
        await updateTask(task.id, { assignedAgent: "deepseek" }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("Invalid assignedAgent"));
      }
      assert(threw, "updateTask should throw for invalid agent");
    });

    await runTest("2.7 updateTask on non-existent task ID throws error", async () => {
      let threw = false;
      try {
        await updateTask("non-existent-task-9999", { title: "New" }, sandbox.tasksFilePath);
      } catch (err) {
        threw = true;
        assert(err.message.includes("not found"), `Expected 'not found' error, got: ${err.message}`);
      }
      assert(threw, "updateTask should throw for missing task id");
    });

    // -------------------------------------------------------------------------
    // SUITE 3: PRIORITY SORTING UNDER DIVERSE COMBINATIONS
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 3: Priority & Timestamp Sorting Under Diverse Combinations ---");

    // Dedicated clean store for sorting tests
    const sortSandboxDir = path.join(os.tmpdir(), `challenger-m2-sort-${Date.now()}`);
    await fs.promises.mkdir(sortSandboxDir, { recursive: true });
    const sortStorePath = path.join(sortSandboxDir, "sort-tasks.json");

    await runTest("3.1 Descending priority sort returns strictly urgente > alta > media > baja", async () => {
      // Seed tasks in arbitrary order
      await createTask({ title: "Task Baja", priority: "baja" }, sortStorePath);
      await createTask({ title: "Task Urgente", priority: "urgente" }, sortStorePath);
      await createTask({ title: "Task Media", priority: "media" }, sortStorePath);
      await createTask({ title: "Task Alta", priority: "alta" }, sortStorePath);

      const sorted = await getTasks({ sortBy: "priority", sortOrder: "desc" }, sortStorePath);
      assertEqual(sorted.length, 4);
      assertEqual(sorted[0].priority, "urgente");
      assertEqual(sorted[1].priority, "alta");
      assertEqual(sorted[2].priority, "media");
      assertEqual(sorted[3].priority, "baja");
    });

    await runTest("3.2 Ascending priority sort returns strictly baja < media < alta < urgente", async () => {
      const sorted = await getTasks({ sortBy: "priority", sortOrder: "asc" }, sortStorePath);
      assertEqual(sorted.length, 4);
      assertEqual(sorted[0].priority, "baja");
      assertEqual(sorted[1].priority, "media");
      assertEqual(sorted[2].priority, "alta");
      assertEqual(sorted[3].priority, "urgente");
    });

    await runTest("3.3 Shuffled multi-item priority sorting (20 tasks across 4 tiers)", async () => {
      const tiers = ["baja", "media", "alta", "urgente"];
      // Add 16 more tasks in pseudo-random order
      for (let i = 0; i < 16; i++) {
        const pr = tiers[i % 4];
        await createTask({ title: `Multi ${pr} #${i}`, priority: pr }, sortStorePath);
      }

      const desc = await getTasks({ sortBy: "priority", sortOrder: "desc" }, sortStorePath);
      assertEqual(desc.length, 20);

      // Verify every element's weight is >= the next element's weight
      for (let i = 0; i < desc.length - 1; i++) {
        const wCurrent = PRIORITY_WEIGHT[desc[i].priority];
        const wNext = PRIORITY_WEIGHT[desc[i + 1].priority];
        assert(
          wCurrent >= wNext,
          `Sort order invariant violated at index ${i}: ${desc[i].priority} (${wCurrent}) < ${desc[i + 1].priority} (${wNext})`
        );
      }
    });

    await runTest("3.4 CreatedAt sorting asc and desc", async () => {
      const t1 = await createTask({ title: "Time 1", createdAt: "2026-01-01T00:00:00Z" }, sortStorePath);
      const t2 = await createTask({ title: "Time 2", createdAt: "2026-02-01T00:00:00Z" }, sortStorePath);
      const t3 = await createTask({ title: "Time 3", createdAt: "2026-03-01T00:00:00Z" }, sortStorePath);

      const asc = await getTasks({ sortBy: "createdAt", sortOrder: "asc" }, sortStorePath);
      const ascTimes = asc.map((t) => new Date(t.createdAt).getTime());
      for (let i = 0; i < ascTimes.length - 1; i++) {
        assert(ascTimes[i] <= ascTimes[i + 1], "CreatedAt asc sort violated");
      }

      const desc = await getTasks({ sortBy: "createdAt", sortOrder: "desc" }, sortStorePath);
      const descTimes = desc.map((t) => new Date(t.createdAt).getTime());
      for (let i = 0; i < descTimes.length - 1; i++) {
        assert(descTimes[i] >= descTimes[i + 1], "CreatedAt desc sort violated");
      }
    });

    await runTest("3.5 Combined filtering (status + priority + assignedAgent + search)", async () => {
      await createTask(
        {
          title: "Specific Target Task",
          status: "in_progress",
          priority: "alta",
          assignedAgent: "openclaw",
          tags: ["feature", "matrix"],
        },
        sortStorePath
      );

      const results = await getTasks(
        {
          status: "in_progress",
          priority: "alta",
          assignedAgent: "openclaw",
          search: "matrix",
        },
        sortStorePath
      );

      assertEqual(results.length, 1, `Expected 1 match, got ${results.length}`);
      assertEqual(results[0].title, "Specific Target Task");
    });

    // -------------------------------------------------------------------------
    // SUITE 4: RAPID SEQUENTIAL & CONCURRENT STRESS
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 4: Rapid Sequential & Concurrent Task Stress ---");

    const stressDir = path.join(os.tmpdir(), `challenger-m2-stress-${Date.now()}`);
    await fs.promises.mkdir(stressDir, { recursive: true });
    const stressStorePath = path.join(stressDir, "stress-tasks.json");

    await runTest("4.1 Rapid sequential task creation (50 tasks)", async () => {
      for (let i = 1; i <= 50; i++) {
        const t = await createTask({ title: `Sequential Task #${i}` }, stressStorePath);
        assert(t.id && t.id.length > 0, `Task #${i} missing id`);
      }
      const all = await getTasks({}, stressStorePath);
      assertEqual(all.length, 50, `Expected 50 tasks in store, found ${all.length}`);
    });

    await runTest("4.2 Rapid sequential updates on a single task (50 updates)", async () => {
      const target = await createTask({ title: "Initial Title", status: "backlog" }, stressStorePath);
      const statuses = ["in_progress", "review", "done", "backlog"];

      for (let i = 1; i <= 50; i++) {
        const nextStatus = statuses[i % 4];
        await updateTask(
          target.id,
          {
            title: `Updated Title #${i}`,
            status: nextStatus,
          },
          stressStorePath
        );
      }

      const final = await getTaskById(target.id, stressStorePath);
      assertEqual(final.title, "Updated Title #50");
      assertEqual(final.status, statuses[50 % 4]);
    });

    await runTest("4.3 High-concurrency creation race (25 concurrent Promise.all createTask calls)", async () => {
      const concurrentStorePath = path.join(stressDir, "concurrent-create.json");
      const promises = [];

      for (let i = 1; i <= 25; i++) {
        promises.push(
          createTask(
            {
              title: `Concurrent Task #${i}`,
              priority: i % 2 === 0 ? "urgente" : "alta",
              assignedAgent: i % 2 === 0 ? "openclaw" : "claude",
            },
            concurrentStorePath
          )
        );
      }

      const results = await Promise.all(promises);
      assertEqual(results.length, 25, "Not all createTask promises resolved");

      // Verify on disk
      const stored = await getTasks({}, concurrentStorePath);
      assertEqual(stored.length, 25, `Expected exactly 25 tasks stored, but found ${stored.length} (lost updates!)`);

      // Verify file is valid JSON
      const raw = await fs.promises.readFile(concurrentStorePath, "utf8");
      const parsed = JSON.parse(raw);
      assertEqual(parsed.length, 25);
    });

    await runTest("4.4 High-concurrency mixed updates & log appends (20 concurrent calls)", async () => {
      const targetTask = await createTask({ title: "Concurrency Target" }, stressStorePath);
      const promises = [];

      // 10 concurrent status/title updates
      for (let i = 1; i <= 10; i++) {
        promises.push(
          updateTask(
            targetTask.id,
            {
              description: `Concurrent description update #${i}`,
            },
            stressStorePath
          )
        );
      }

      // 10 concurrent log appends
      for (let i = 1; i <= 10; i++) {
        promises.push(
          appendLog(
            targetTask.id,
            {
              message: `Concurrent log #${i}`,
              level: "output",
            },
            stressStorePath
          )
        );
      }

      await Promise.all(promises);

      const final = await getTaskById(targetTask.id, stressStorePath);
      assert(final !== null, "Target task not found after concurrent mutations");
      assertEqual(final.executionLogs?.length, 10, `Expected 10 appended logs, got ${final.executionLogs?.length}`);
    });

    await runTest("4.5 Concurrent deletion and creation race (10 creates + 10 deletes in parallel)", async () => {
      const mixedStorePath = path.join(stressDir, "mixed-race.json");

      // Pre-seed 10 tasks to delete
      const toDeleteIds = [];
      for (let i = 1; i <= 10; i++) {
        const t = await createTask({ title: `To Delete #${i}` }, mixedStorePath);
        toDeleteIds.push(t.id);
      }

      const promises = [];
      // 10 deletes
      for (const id of toDeleteIds) {
        promises.push(deleteTask(id, mixedStorePath));
      }
      // 10 new creates
      for (let i = 1; i <= 10; i++) {
        promises.push(createTask({ title: `Newly Created #${i}` }, mixedStorePath));
      }

      const results = await Promise.all(promises);
      assertEqual(results.length, 20);

      const remaining = await getTasks({}, mixedStorePath);
      assertEqual(remaining.length, 10, `Expected 10 remaining tasks, found ${remaining.length}`);
      for (const t of remaining) {
        assert(!toDeleteIds.includes(t.id), `Task ${t.id} was supposed to be deleted!`);
      }
    });

    await runTest("4.6 Atomic replacement & temporary file cleanup verification", async () => {
      // Check that no lingering .tmp files exist in stressDir
      const files = await fs.promises.readdir(stressDir);
      const tmpFiles = files.filter((f) => f.includes(".tmp"));
      assertEqual(tmpFiles.length, 0, `Found ${tmpFiles.length} leftover .tmp files in store dir: ${tmpFiles.join(", ")}`);
    });

    await runTest("4.7 Path casing collision under concurrent writes (Windows NTFS)", async () => {
      const pathStore1 = path.join(stressDir, "casing-test.json");
      const pathStore2 = process.platform === "win32"
        ? path.join(stressDir, "CASING-TEST.JSON")
        : pathStore1;

      // Both paths point to the same physical file on Windows
      await createTask({ title: "Casing Baseline" }, pathStore1);

      const p1 = createTask({ title: "Lower Case Write" }, pathStore1);
      const p2 = createTask({ title: "Upper Case Write" }, pathStore2);

      await Promise.all([p1, p2]);

      const stored = await getTasks({}, pathStore1);
      assertEqual(stored.length, 3, `Expected 3 tasks after casing-insensitive writes, got ${stored.length}`);
    });

    // -------------------------------------------------------------------------
    // SUITE 5: API ROUTE HANDLERS & VAULT SYNCHRONIZATION
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 5: API Route Handlers Integration & Vault Sync ---");

    const apiStorePath = path.join(sandbox.sandboxDir, "api-store.json");

    await runTest("5.1 GET /api/agent-tasks returns task list with count and filters", async () => {
      await createTask({ title: "API Task 1", priority: "urgente", assignedAgent: "hermes" }, apiStorePath);
      await createTask({ title: "API Task 2", priority: "baja", assignedAgent: "claude" }, apiStorePath);

      const req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}&assignedAgent=hermes`,
      };
      const res = await tasksRoute.GET(req);
      assertEqual(res.status, 200);
      const body = await res.json();
      assert(body.success === true);
      assertEqual(body.count, 1);
      assertEqual(body.tasks[0].title, "API Task 1");
    });

    await runTest("5.2 GET /api/agent-tasks?id=<id> returns single task or 404", async () => {
      const task = await createTask({ title: "Single Retrieval Task" }, apiStorePath);

      const reqSuccess = {
        url: `http://localhost:3000/api/agent-tasks?id=${task.id}&storePath=${encodeURIComponent(apiStorePath)}`,
      };
      const resSuccess = await tasksRoute.GET(reqSuccess);
      assertEqual(resSuccess.status, 200);
      const bodySuccess = await resSuccess.json();
      assertEqual(bodySuccess.task.id, task.id);

      const req404 = {
        url: `http://localhost:3000/api/agent-tasks?id=unknown-id-xyz&storePath=${encodeURIComponent(apiStorePath)}`,
      };
      const res404 = await tasksRoute.GET(req404);
      assertEqual(res404.status, 404);
    });

    await runTest("5.3 POST /api/agent-tasks validation (missing title, invalid enums)", async () => {
      // Missing title -> 400
      let req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ title: "" }),
      };
      let res = await tasksRoute.POST(req);
      assertEqual(res.status, 400);

      // Invalid status -> 400
      req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ title: "Valid Title", status: "NOT_A_STATUS" }),
      };
      res = await tasksRoute.POST(req);
      assertEqual(res.status, 400);

      // Invalid priority -> 400
      req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ title: "Valid Title", priority: "SUPER_HIGH" }),
      };
      res = await tasksRoute.POST(req);
      assertEqual(res.status, 400);

      // Invalid assignedAgent -> 400
      req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ title: "Valid Title", assignedAgent: "unknown-ai" }),
      };
      res = await tasksRoute.POST(req);
      assertEqual(res.status, 400);
    });

    await runTest("5.4 POST /api/agent-tasks with clientNoteId synchronizes with Obsidian vault roadmap", async () => {
      const payload = {
        title: "Nuevo Agente WhatsApp para Clientes",
        status: "backlog",
        priority: "alta",
        assignedAgent: "claude",
        clientNoteId: "Clientes/Nipeihu.md",
        vaultRoadmapId: "nuevo-agente-whatsapp-roadmap",
        tags: ["whatsapp", "soporte"],
      };

      const req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}&vaultRoot=${encodeURIComponent(sandbox.vaultDir)}`,
        json: async () => payload,
      };

      const res = await tasksRoute.POST(req);
      assertEqual(res.status, 201);
      const body = await res.json();
      assert(body.success === true);
      assert(body.vaultSync?.synced === true, `Vault sync failed: ${body.vaultSync?.error || body.vaultSync?.reason}`);

      // Verify Obsidian note frontmatter updated
      const updatedNote = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      assert(updatedNote !== null);
      const syncedItem = updatedNote.roadmap?.find((r) => r.id === "nuevo-agente-whatsapp-roadmap");
      assert(syncedItem !== undefined, "Roadmap item not found in vault note");
      assertEqual(syncedItem.hecho, false);
      assertEqual(syncedItem.estado, "pendiente");
      assertEqual(syncedItem.prioridad, "alta");
    });

    await runTest("5.5 PATCH /api/agent-tasks validation (missing id -> 400, unknown id -> 404)", async () => {
      // Missing id -> 400
      let req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ title: "New Title" }),
      };
      let res = await tasksRoute.PATCH(req);
      assertEqual(res.status, 400);

      // Unknown id -> 404
      req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({ id: "ghost-task-12345", title: "New Title" }),
      };
      res = await tasksRoute.PATCH(req);
      assertEqual(res.status, 404);
    });

    await runTest("5.6 PATCH /api/agent-tasks marking task done enforces da-vault-schema invariants", async () => {
      // First create a task linked to vault
      const task = await createTask(
        {
          title: "Implementar pasarela Stripe",
          status: "in_progress",
          priority: "urgente",
          assignedAgent: "openclaw",
          clientNoteId: "Clientes/Nipeihu.md",
          vaultRoadmapId: "pasarela-stripe-id",
        },
        apiStorePath
      );

      // Update to 'done' via PATCH
      const req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}&vaultRoot=${encodeURIComponent(sandbox.vaultDir)}`,
        json: async () => ({
          id: task.id,
          status: "done",
        }),
      };

      const res = await tasksRoute.PATCH(req);
      assertEqual(res.status, 200);
      const body = await res.json();
      assertEqual(body.task.status, "done");
      assert(body.vaultSync?.synced === true);

      // Inspect vault note
      const note = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      const roadmapItem = note.roadmap?.find((r) => r.id === "pasarela-stripe-id");
      assert(roadmapItem !== undefined);
      assertEqual(roadmapItem.hecho, true, "Roadmap hecho must be true");
      assertEqual(roadmapItem.estado, undefined, "Roadmap item with hecho: true must NOT have intermediate estado!");
      assert(roadmapItem.fecha_completado !== undefined, "Roadmap item must have fecha_completado");
    });

    await runTest("5.7 PATCH /api/agent-tasks reopening task from done to in_progress", async () => {
      // Find the task from 5.6
      const tasks = await getTasks({ search: "pasarela Stripe" }, apiStorePath);
      assertEqual(tasks.length, 1);
      const taskId = tasks[0].id;

      const req = {
        url: `http://localhost:3000/api/agent-tasks?storePath=${encodeURIComponent(apiStorePath)}&vaultRoot=${encodeURIComponent(sandbox.vaultDir)}`,
        json: async () => ({
          id: taskId,
          status: "in_progress",
        }),
      };

      const res = await tasksRoute.PATCH(req);
      assertEqual(res.status, 200);

      // Inspect vault note
      const note = await readVaultNote("Clientes/Nipeihu.md", sandbox.vaultDir);
      const roadmapItem = note.roadmap?.find((r) => r.id === "pasarela-stripe-id");
      assertEqual(roadmapItem.hecho, false, "Roadmap hecho must be false");
      assertEqual(roadmapItem.estado, "en_curso", "Roadmap estado must be 'en_curso'");
      assertEqual(roadmapItem.fecha_completado, undefined, "fecha_completado must be deleted when reopened");
    });

    await runTest("5.8 DELETE /api/agent-tasks deletes existing task, returns 404 on repeat", async () => {
      const task = await createTask({ title: "Temporary Delete Task" }, apiStorePath);

      const req = {
        url: `http://localhost:3000/api/agent-tasks?id=${task.id}&storePath=${encodeURIComponent(apiStorePath)}`,
      };
      const res1 = await tasksRoute.DELETE(req);
      assertEqual(res1.status, 200);

      // Repeat should 404
      const res2 = await tasksRoute.DELETE(req);
      assertEqual(res2.status, 404);
    });

    await runTest("5.9 POST /api/agent-tasks/execute in simulation mode generates 4 canonical logs & updates status", async () => {
      const task = await createTask(
        {
          title: "Run automated analytics sync",
          assignedAgent: "claude",
          status: "backlog",
          priority: "media",
        },
        apiStorePath
      );

      const req = {
        url: `http://localhost:3000/api/agent-tasks/execute?simulate=true&storePath=${encodeURIComponent(apiStorePath)}`,
        json: async () => ({
          taskId: task.id,
          simulate: true,
          targetStatus: "review",
        }),
      };

      const res = await executeRoute.POST(req);
      assertEqual(res.status, 200);
      const body = await res.json();
      assert(body.success === true);
      assertEqual(body.status, "review");
      assertEqual(body.mode, "simulation");
      assert(Array.isArray(body.logs), "Logs must be an array");
      assert(body.logs.length >= 4, `Expected at least 4 logs, got ${body.logs.length}`);

      // Verify the 4 canonical logs
      const logMessages = body.logs.map((l) => l.message);
      assert(logMessages.some((m) => m.includes("Initialized agent runtime: claude")), "Missing log 1");
      assert(logMessages.some((m) => m.includes("Loading context for task")), "Missing log 2");
      assert(logMessages.some((m) => m.includes("Processing task specifications")), "Missing log 3");
      assert(logMessages.some((m) => m.includes("Execution finished successfully with exit code 0")), "Missing log 4");

      // Verify persisted in store
      const updated = await getTaskById(task.id, apiStorePath);
      assertEqual(updated.status, "review");
      assert(updated.executionLogs && updated.executionLogs.length >= 4);
    });

    // -------------------------------------------------------------------------
    // SUITE 6: FAULT TOLERANCE & DEGRADED STORE RESILIENCE
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 6: Fault Tolerance & Degraded Store Edge Cases ---");

    const degradedDir = path.join(os.tmpdir(), `challenger-m2-degraded-${Date.now()}`);
    await fs.promises.mkdir(degradedDir, { recursive: true });

    await runTest("6.1 Missing store file returns empty array without throwing", async () => {
      const nonExistent = path.join(degradedDir, "does-not-exist.json");
      const tasks = await getTasks({}, nonExistent);
      assert(Array.isArray(tasks) && tasks.length === 0, "Missing store should return []");
    });

    await runTest("6.2 Empty store file returns empty array without throwing", async () => {
      const emptyFile = path.join(degradedDir, "empty.json");
      await fs.promises.writeFile(emptyFile, "   \n  \t  ", "utf8");
      const tasks = await getTasks({}, emptyFile);
      assert(Array.isArray(tasks) && tasks.length === 0, "Empty store should return []");
    });

    await runTest("6.3 Corrupted store file returns empty array gracefully without crash", async () => {
      const corruptFile = path.join(degradedDir, "corrupt.json");
      await fs.promises.writeFile(corruptFile, "{ this is definitely not valid json [}}", "utf8");
      const tasks = await getTasks({}, corruptFile);
      assert(Array.isArray(tasks) && tasks.length === 0, "Corrupted store should gracefully return []");
    });

    await runTest("6.4 ensureTaskStoreDir automatically creates nested non-existent directory", async () => {
      const deepNested = path.join(degradedDir, "level1", "level2", "level3", "tasks.json");
      await ensureTaskStoreDir(deepNested);
      assert(fs.existsSync(path.dirname(deepNested)), "Deeply nested directory was not created");
      const task = await createTask({ title: "Nested Dir Task" }, deepNested);
      assert(fs.existsSync(deepNested), "Tasks file was not created in nested dir");
      assertEqual(task.title, "Nested Dir Task");
    });

    await runTest("6.5 createTaskStore factory returns fully functional isolated store instance", async () => {
      const factoryDir = path.join(os.tmpdir(), `challenger-m2-factory-${Date.now()}`);
      const store = createTaskStore(factoryDir);
      const created = await store.createTask({ title: "Factory Task", priority: "urgente" });
      assertEqual(created.title, "Factory Task");

      const retrieved = await store.getTask(created.id);
      assertEqual(retrieved?.id, created.id);

      const list = await store.listTasks();
      assertEqual(list.length, 1);

      await store.appendLog(created.id, { message: "Factory log test" });
      const withLog = await store.getTaskById(created.id);
      assertEqual(withLog?.executionLogs?.length, 1);

      await store.deleteTask(created.id);
      const afterDelete = await store.getTask(created.id);
      assertEqual(afterDelete, null);
    });

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log("\n======================================================================");
    console.log("                        STRESS TEST SUMMARY                           ");
    console.log("======================================================================");
    console.log(`Total Stress Tests Executed: ${totalTests}`);
    console.log(`Passed:                      ${passedTests}`);
    console.log(`Failed:                      ${failedTests}`);
    console.log("======================================================================\n");

    if (failedTests > 0) {
      console.error(`VERDICT: REQUEST_CHANGES (${failedTests} tests failed)`);
      process.exit(1);
    } else {
      console.log("VERDICT: APPROVE (100% of stress tests passed with 0 failures)");
      process.exit(0);
    }

  } finally {
    await sandbox.cleanup();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN STRESS HARNESS:", err);
  process.exit(1);
});
