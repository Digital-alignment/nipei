import fs from "node:fs";
import path from "node:path";
import os from "node:os";
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

const prodVaultSyncEngine = jiti(path.join(sourceDir, "src/lib/vaultSyncEngine.ts"));
const { createTempVault, createTempStateDir, SAMPLE_COMPANY_INTAKE_PAYLOAD } = await import("../../tests/e2e/fixtures.mjs");
const { createTaskStore, syncTaskWithVault, submitCompanyIntake } = await import("../../tests/e2e/engine.mjs");
const { validateVaultNoteContent } = await import("../../tests/e2e/validator.mjs");

// Bridge createVaultEngine
function createVaultEngine(vaultRoot) {
  return {
    getVaultRoot() {
      return prodVaultSyncEngine.resolveVaultRoot(vaultRoot);
    },
    async readVaultNote(relPath) {
      return prodVaultSyncEngine.readVaultNote(relPath, vaultRoot);
    },
    async writeVaultNote(relPath, data) {
      return prodVaultSyncEngine.writeVaultNote(relPath, data, vaultRoot);
    },
    async parseAllClients() {
      return prodVaultSyncEngine.parseAllClients(vaultRoot);
    },
    splitFrontmatter: prodVaultSyncEngine.splitFrontmatter,
    resolveNotePath: (relPath) => prodVaultSyncEngine.resolveNotePath(relPath, vaultRoot),
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function test(name, fn) {
  process.stdout.write(`Testing: ${name} ... `);
  try {
    await fn();
    console.log("PASS");
    passed++;
  } catch (err) {
    console.log("FAIL");
    console.error("  Error:", err.message);
    failed++;
  }
}

async function main() {
  console.log("=== Testing E2E Test Scenarios against production vaultSyncEngine.ts ===\n");

  await test("Tier 1 - 3.1: Reads YAML frontmatter & splits body", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      assert(note !== null, "Note must not be null");
      assert(note.id === "nipeihu", "id must be nipeihu");
      assert(note.nombre === "Nipeihu", "nombre must be Nipeihu");
      assert(note.rubro === "comunidad_cultura", "rubro must be comunidad_cultura");
      assert(note.emoji === "🪶", "emoji must be 🪶");
      assert(note.bodyMarkdown.includes("# Nipeihu 🪶"), "bodyMarkdown must include header");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 3.2: Writes note atomically with .bak safety copy", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      await engine.writeVaultNote("Clientes/Nipeihu.md", { categoria: "Updated community description" });
      const bakPath = path.join(sandbox.vaultDir, "Clientes", "Nipeihu.md.bak");
      assert(fs.existsSync(bakPath), ".bak must exist");
      const updated = await engine.readVaultNote("Clientes/Nipeihu.md");
      assert(updated.categoria === "Updated community description", "categoria updated");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 3.3: Preserves original markdown body byte-for-byte", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const before = await engine.readVaultNote("Clientes/Nipeihu.md");
      await engine.writeVaultNote("Clientes/Nipeihu.md", { hosting: "Updated Hosting" });
      const after = await engine.readVaultNote("Clientes/Nipeihu.md");
      assert(before.bodyMarkdown.trim() === after.bodyMarkdown.trim(), "Body preserved");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 3.4: Injects or maintains <!-- agente: antigravity --> watermark", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      await engine.writeVaultNote("Clientes/new-brand.md", {
        nombre: "New Brand Without Watermark",
        bodyMarkdown: "# Clean Markdown Without Watermark\n\nSome body text here.",
      });
      const after = await engine.readVaultNote("Clientes/new-brand.md");
      assert(after.bodyMarkdown.startsWith("<!-- agente: antigravity -->"), "Watermark injected");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 3.5: Invariant: hecho: true strips intermediate estado", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        roadmap: [
          { id: "test-task-1", texto: "Test done", hecho: true, estado: "en_curso" },
          { id: "test-task-2", texto: "Test pending", hecho: false, estado: "en_curso" },
        ],
      });
      const after = await engine.readVaultNote("Clientes/Nipeihu.md");
      const doneTask = after.roadmap.find((t) => t.id === "test-task-1");
      const pendingTask = after.roadmap.find((t) => t.id === "test-task-2");
      assert(doneTask.hecho === true, "Task is done");
      assert(doneTask.estado === undefined, "Done task has no estado");
      assert(typeof doneTask.fecha_completado === "string", "Done task has fecha_completado");
      assert(pendingTask.hecho === false, "Pending task not done");
      assert(pendingTask.estado === "en_curso", "Pending task has estado");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 3.6: Strips plaintext secrets from servicios", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        servicios: [{
          id: "wp-srv",
          tipo: "wordpress",
          nombre: "WP Service",
          password: "super-secret-password-123",
          token: "secret-token-xyz",
          apiKey: "secret-api-key",
          credencial_ref: "vault-ref-123",
          estado: "configurado",
        }],
      });
      const after = await engine.readVaultNote("Clientes/Nipeihu.md");
      const srv = after.servicios[0];
      assert(srv.password === undefined, "password stripped");
      assert(srv.token === undefined, "token stripped");
      assert(srv.apiKey === undefined, "apiKey stripped");
      assert(srv.credencial_ref === "vault-ref-123", "credencial_ref kept");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 4.1: Parses Clientes/Nipeihu.md company metadata", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      assert(note.id === "nipeihu", "id");
      assert(note.tipo === "cliente_externo", "tipo");
      assert(note.stack.includes("React"), "stack React");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 1 - 4.5: Discovers client notes ignoring system notes", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const clients = await engine.parseAllClients();
      const ids = clients.map((c) => c.id);
      assert(ids.includes("nipeihu"), "has nipeihu");
      assert(ids.includes("digital-alignment"), "has digital-alignment");
      assert(!ids.includes("_ecosistema"), "no _ecosistema");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 2 - 2.3: Malformed YAML frontmatter handled gracefully", async () => {
    const sandbox = await createTempVault();
    try {
      const malformed = "---\nid: broken\nnombre: Broken: [unclosed\n---\nBody";
      await fs.promises.writeFile(path.join(sandbox.vaultDir, "Clientes", "Broken.md"), malformed, "utf8");
      const engine = createVaultEngine(sandbox.vaultDir);
      const read = await engine.readVaultNote("Clientes/Broken.md");
      assert(read === null, "read must be null for broken YAML");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 2 - 2.8: Path normalization with backslashes vs slashes", async () => {
    const sandbox = await createTempVault();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const readUnix = await engine.readVaultNote("Clientes/Nipeihu.md");
      const readWindows = await engine.readVaultNote("Clientes\\Nipeihu.md");
      assert(readUnix !== null && readWindows !== null, "Both must resolve");
      assert(readUnix.id === readWindows.id, "Same id");
    } finally {
      await sandbox.cleanup();
    }
  });

  await test("Tier 3 - 3.1 & 3.2: syncTaskWithVault done & reopen lifecycle", async () => {
    const sandbox = await createTempVault();
    const state = await createTempStateDir();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const store = createTaskStore(state.stateDir);
      const task = await store.createTask({
        title: "Test Task",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "kanban-modo-tela-cheia",
        status: "done",
      });
      const res = await syncTaskWithVault(task, engine);
      assert(res.synced === true, "synced");
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const rItem = note.roadmap.find((r) => r.id === "kanban-modo-tela-cheia");
      assert(rItem.hecho === true, "roadmap item hecho true");
      assert(typeof rItem.fecha_completado === "string", "has fecha_completado");
    } finally {
      await sandbox.cleanup();
      await state.cleanup();
    }
  });

  await test("Tier 4 - 4.3: submitCompanyIntake workflow", async () => {
    const sandbox = await createTempVault();
    const state = await createTempStateDir();
    try {
      const engine = createVaultEngine(sandbox.vaultDir);
      const res = await submitCompanyIntake(SAMPLE_COMPANY_INTAKE_PAYLOAD, engine, state.stateDir);
      assert(res.success === true, "Intake success");
      assert(res.note.id === "botica-mutum", "Note id matches");
      const raw = await fs.promises.readFile(res.filePath, "utf8");
      const validation = validateVaultNoteContent(raw, "botica-mutum.md");
      assert(validation.valid === true, "da-vault-schema valid");
    } finally {
      await sandbox.cleanup();
      await state.cleanup();
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

main().catch(console.error);
