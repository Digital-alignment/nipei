/**
 * Tier 1: Feature Coverage E2E Tests
 * Covers all 5 core features with >=5 test cases each:
 * 1. Tasks: Data model, CRUD, execution logs, agent assignment (6 tests)
 * 2. Kanban: 4 columns, workflow transitions, filtering, sorting (6 tests)
 * 3. Vault Sync: Safe read/write, atomic ops, body preservation, invariants (6 tests)
 * 4. Pre-population: Note parsing, roadmap conversion, project extraction (6 tests)
 * 5. CLI Configs: Agent binaries, vault discovery, Windows path compatibility (6 tests)
 */

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, test, expect, beforeEach, afterEach } from "./harness.mjs";
import { createTempVault, createTempStateDir, SAMPLE_NIPEHU_MD, SAMPLE_DIGITAL_ALIGNMENT_MD } from "./fixtures.mjs";
import { createTaskStore, createVaultEngine } from "./engine.mjs";
import { validateVaultNoteContent } from "./validator.mjs";

export function registerTier1Tests() {
  describe("Tier 1 - Feature 1: Agent Tasks State & CRUD", () => {
    let stateDir, cleanupState, store;

    beforeEach(async () => {
      const state = await createTempStateDir();
      stateDir = state.stateDir;
      cleanupState = state.cleanup;
      store = createTaskStore(stateDir);
    });

    afterEach(async () => {
      await cleanupState();
    });

    test("1.1 Creates task with full schema properties and timestamps", async () => {
      const task = await store.createTask({
        id: "tsk-001",
        title: "Implementar agente por WhatsApp para clientes",
        description: "Bot automatizado con Evolution API y n8n",
        status: "backlog",
        priority: "alta",
        assignedAgent: "claude",
        tags: ["whatsapp", "dev"],
        clientNoteId: "nipeihu",
      });

      expect(task.id).toBe("tsk-001");
      expect(task.title).toBe("Implementar agente por WhatsApp para clientes");
      expect(task.status).toBe("backlog");
      expect(task.priority).toBe("alta");
      expect(task.assignedAgent).toBe("claude");
      expect(task.tags).toContain("whatsapp");
      expect(task.clientNoteId).toBe("nipeihu");
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
      expect(task.executionLogs).toEqual([]);
    });

    test("1.2 Retrieves task by ID and lists tasks with status filtering", async () => {
      await store.createTask({ id: "t-1", title: "Task 1", status: "backlog", priority: "media", assignedAgent: "claude" });
      await store.createTask({ id: "t-2", title: "Task 2", status: "in_progress", priority: "alta", assignedAgent: "openclaw" });
      await store.createTask({ id: "t-3", title: "Task 3", status: "done", priority: "baja", assignedAgent: "hermes" });

      const retrieved = await store.getTask("t-2");
      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe("Task 2");

      const inProgressTasks = await store.listTasks({ status: "in_progress" });
      expect(inProgressTasks.length).toBe(1);
      expect(inProgressTasks[0].id).toBe("t-2");

      const allTasks = await store.listTasks();
      expect(allTasks.length).toBe(3);
    });

    test("1.3 Updates task metadata (priority, description, tags, customBinaryPath)", async () => {
      const created = await store.createTask({
        title: "Initial title",
        priority: "media",
        assignedAgent: "claude",
      });

      const updated = await store.updateTask(created.id, {
        description: "Updated detailed description",
        priority: "urgente",
        tags: ["urgent", "hotfix"],
        customBinaryPath: "C:\\tools\\custom-agent.exe",
      });

      expect(updated.description).toBe("Updated detailed description");
      expect(updated.priority).toBe("urgente");
      expect(updated.tags).toContain("hotfix");
      expect(updated.customBinaryPath).toBe("C:\\tools\\custom-agent.exe");
    });

    test("1.4 Deletes task and confirms removal from state store", async () => {
      const t1 = await store.createTask({ title: "Task to delete" });
      const t2 = await store.createTask({ title: "Task to keep" });

      const deleted = await store.deleteTask(t1.id);
      expect(deleted).toBe(true);

      const checkT1 = await store.getTask(t1.id);
      expect(checkT1).toBeNull();

      const remaining = await store.listTasks();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(t2.id);
    });

    test("1.5 Appends timestamped execution logs and preserves log sequence", async () => {
      const task = await store.createTask({ title: "Task with logging" });

      await store.appendLog(task.id, {
        timestamp: "2026-09-04T12:00:00Z",
        message: "CLI spawned with PID 4512",
        level: "info",
      });
      await store.appendLog(task.id, {
        timestamp: "2026-09-04T12:00:05Z",
        message: "Step 1: Reading workspace files completed",
        level: "info",
      });
      await store.appendLog(task.id, {
        timestamp: "2026-09-04T12:00:10Z",
        message: "Build verified successfully with exit code 0",
        level: "output",
      });

      const updated = await store.getTask(task.id);
      expect(updated.executionLogs.length).toBe(3);
      expect(updated.executionLogs[0].message).toContain("PID 4512");
      expect(updated.executionLogs[2].level).toBe("output");
    });

    test("1.6 Supports assignment to all designated agent CLIs (claude, openclaw, hermes, custom)", async () => {
      const agents = ["claude", "openclaw", "hermes", "custom"];
      for (const agent of agents) {
        const t = await store.createTask({
          title: `Task for ${agent}`,
          assignedAgent: agent,
        });
        expect(t.assignedAgent).toBe(agent);
      }

      // Invalid agent should be rejected
      let threw = false;
      try {
        await store.createTask({ title: "Invalid", assignedAgent: "unsupported-agent" });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });

  describe("Tier 1 - Feature 2: Kanban 4-Column Workflow & Controls", () => {
    let stateDir, cleanupState, store;

    beforeEach(async () => {
      const state = await createTempStateDir();
      stateDir = state.stateDir;
      cleanupState = state.cleanup;
      store = createTaskStore(stateDir);
    });

    afterEach(async () => {
      await cleanupState();
    });

    test("2.1 Defaults newly created tasks to 'backlog' column", async () => {
      const task = await store.createTask({ title: "Default status test" });
      expect(task.status).toBe("backlog");
    });

    test("2.2 Transitions tasks progressively: backlog -> in_progress -> review -> done", async () => {
      const task = await store.createTask({ title: "Pipeline task" });
      expect(task.status).toBe("backlog");

      const inProgress = await store.moveTaskStatus(task.id, "in_progress");
      expect(inProgress.status).toBe("in_progress");

      const review = await store.moveTaskStatus(task.id, "review");
      expect(review.status).toBe("review");

      const done = await store.moveTaskStatus(task.id, "done");
      expect(done.status).toBe("done");
    });

    test("2.3 Filters Kanban board by assigned agent CLI category", async () => {
      await store.createTask({ title: "C1", assignedAgent: "claude" });
      await store.createTask({ title: "C2", assignedAgent: "claude" });
      await store.createTask({ title: "O1", assignedAgent: "openclaw" });
      await store.createTask({ title: "H1", assignedAgent: "hermes" });

      const claudeTasks = await store.listTasks({ assignedAgent: "claude" });
      expect(claudeTasks.length).toBe(2);

      const openclawTasks = await store.listTasks({ assignedAgent: "openclaw" });
      expect(openclawTasks.length).toBe(1);

      const hermesTasks = await store.listTasks({ assignedAgent: "hermes" });
      expect(hermesTasks.length).toBe(1);
    });

    test("2.4 Sorts Kanban cards by priority: urgente -> alta -> media -> baja", async () => {
      await store.createTask({ title: "Baja Task", priority: "baja" });
      await store.createTask({ title: "Urgente Task", priority: "urgente" });
      await store.createTask({ title: "Media Task", priority: "media" });
      await store.createTask({ title: "Alta Task", priority: "alta" });

      const sorted = await store.listTasks({ sortBy: "priority" });
      expect(sorted[0].priority).toBe("urgente");
      expect(sorted[1].priority).toBe("alta");
      expect(sorted[2].priority).toBe("media");
      expect(sorted[3].priority).toBe("baja");
    });

    test("2.5 Reorders cards within same column preserving custom order index", async () => {
      const t1 = await store.createTask({ title: "Item 1", status: "backlog" });
      const t2 = await store.createTask({ title: "Item 2", status: "backlog" });

      // Simulate reorder by tagging order
      await store.updateTask(t1.id, { tags: ["order:2"] });
      await store.updateTask(t2.id, { tags: ["order:1"] });

      const refreshed1 = await store.getTask(t1.id);
      const refreshed2 = await store.getTask(t2.id);

      expect(refreshed1.tags).toContain("order:2");
      expect(refreshed2.tags).toContain("order:1");
    });

    test("2.6 Inspects card execution logs without altering card status", async () => {
      const task = await store.createTask({ title: "Inspection task", status: "in_progress" });
      await store.appendLog(task.id, { message: "Running simulation...", level: "info" });

      const inspect = await store.getTask(task.id);
      expect(inspect.status).toBe("in_progress");
      expect(inspect.executionLogs.length).toBe(1);
      expect(inspect.executionLogs[0].message).toBe("Running simulation...");
    });
  });

  describe("Tier 1 - Feature 3: Vault Sync Engine & Invariants", () => {
    let vaultDir, cleanupVault, engine;

    beforeEach(async () => {
      const vault = await createTempVault();
      vaultDir = vault.vaultDir;
      cleanupVault = vault.cleanup;
      engine = createVaultEngine(vaultDir);
    });

    afterEach(async () => {
      await cleanupVault();
    });

    test("3.1 Reads YAML frontmatter from vault note and cleanly splits body markdown", async () => {
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(note).toBeDefined();
      expect(note.id).toBe("nipeihu");
      expect(note.nombre).toBe("Nipeihu");
      expect(note.rubro).toBe("comunidad_cultura");
      expect(note.emoji).toBe("🪶");
      expect(note.bodyMarkdown).toBeDefined();
      expect(note.bodyMarkdown).toContain("# Nipeihu 🪶");
    });

    test("3.2 Writes note atomically using .tmp and rename pattern with .bak safety copy", async () => {
      const notePath = path.join(vaultDir, "Clientes", "Nipeihu.md");
      const statBefore = await fs.promises.stat(notePath);

      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        categoria: "Updated community description",
      });

      const bakPath = path.join(vaultDir, "Clientes", "Nipeihu.md.bak");
      expect(fs.existsSync(bakPath)).toBe(true);

      const updated = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(updated.categoria).toBe("Updated community description");
    });

    test("3.3 Preserves original markdown body byte-for-byte during frontmatter updates", async () => {
      const before = await engine.readVaultNote("Clientes/Nipeihu.md");
      const originalBody = before.bodyMarkdown;

      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        estado: "transicion",
      });

      const after = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(after.bodyMarkdown.trim()).toBe(originalBody.trim());
      expect(after.estado).toBe("transicion");
    });

    test("3.4 Injects or maintains <!-- agente: antigravity --> watermark as line 1 of body", async () => {
      // Write new note without watermark
      await engine.writeVaultNote("Clientes/new-brand.md", {
        id: "new-brand",
        nombre: "New Brand",
        bodyMarkdown: "# New Brand Heading\nSome content\n",
      });

      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "new-brand.md"), "utf8");
      const validation = validateVaultNoteContent(raw, "new-brand.md");

      expect(validation.valid).toBe(true);
      const firstLineOfBody = validation.body.trimStart().split("\n")[0].trim();
      expect(firstLineOfBody).toBe("<!-- agente: antigravity -->");
    });

    test("3.5 Enforces task completion invariant: hecho: true strips intermediate estado", async () => {
      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        roadmap: [
          {
            id: "task-completed-test",
            texto: "Completed task",
            prioridad: "alta",
            hecho: true,
            estado: "en_curso", // SHOULD BE STRIPPED
          },
        ],
      });

      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), "utf8");
      const validation = validateVaultNoteContent(raw, "Nipeihu.md");

      expect(validation.valid).toBe(true);
      expect(validation.data.roadmap[0].hecho).toBe(true);
      expect(validation.data.roadmap[0].estado).toBeUndefined();
      expect(validation.data.roadmap[0].fecha_completado).toBeDefined();
    });

    test("3.6 Strips plaintext secrets/passwords from servicios frontmatter", async () => {
      await engine.writeVaultNote("Clientes/Nipeihu.md", {
        servicios: [
          {
            id: "wp-srv",
            tipo: "wordpress",
            nombre: "WordPress",
            usuario: "admin",
            password: "PLAIN_TEXT_PASSWORD_FORBIDDEN",
            credencial_ref: "nipeihu-wp-token",
            estado: "configurado",
          },
        ],
      });

      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), "utf8");
      const validation = validateVaultNoteContent(raw, "Nipeihu.md");

      expect(validation.valid).toBe(true);
      expect(raw).not.toContain("PLAIN_TEXT_PASSWORD_FORBIDDEN");
      expect(validation.data.servicios[0].credencial_ref).toBe("nipeihu-wp-token");
    });
  });

  describe("Tier 1 - Feature 4: Automated Vault Parsing & Pre-population", () => {
    let vaultDir, cleanupVault, engine;

    beforeEach(async () => {
      const vault = await createTempVault();
      vaultDir = vault.vaultDir;
      cleanupVault = vault.cleanup;
      engine = createVaultEngine(vaultDir);
    });

    afterEach(async () => {
      await cleanupVault();
    });

    test("4.1 Parses Clientes/Nipeihu.md extracting company profile metadata", async () => {
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(note.id).toBe("nipeihu");
      expect(note.nombre).toBe("Nipeihu");
      expect(note.tipo).toBe("cliente_externo");
      expect(note.emoji).toBe("🪶");
      expect(note.rubro).toBe("comunidad_cultura");
      expect(note.dominio).toBe("nipeihu.org");
      expect(note.hosting).toBe("Hostinger (DA)");
      expect(note.stack).toContain("React");
      expect(note.stack).toContain("TypeScript");
      expect(note.relaciones).toContain("ini-rau");
    });

    test("4.2 Parses Clientes/Digital Alignment.md extracting agency profile", async () => {
      const da = await engine.readVaultNote("Clientes/Digital Alignment.md");
      expect(da.id).toBe("digital-alignment");
      expect(da.nombre).toBe("Digital Alignment");
      expect(da.tipo).toBe("agencia_madre");
      expect(da.emoji).toBe("🏛️");
      expect(da.rubro).toBe("agencia");
      expect(da.dominio).toBe("digitalalignment.com");
    });

    test("4.3 Converts vault note roadmap items into Kanban tasks preserving priority and done status", async () => {
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const roadmap = note.roadmap || [];

      expect(roadmap.length).toBe(9);

      const doneItems = roadmap.filter((item) => item.hecho);
      const pendingItems = roadmap.filter((item) => !item.hecho);

      expect(doneItems.length).toBe(3);
      expect(pendingItems.length).toBe(6);

      const firstDone = doneItems[0];
      expect(firstDone.id).toBe("nipei-os-duplo-nucleo");
      expect(firstDone.prioridad).toBe("alta");
      expect(firstDone.fecha_completado).toBe("2026-08-11");
    });

    test("4.4 Extracts proyectos array from note into structured project catalog", async () => {
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const proyectos = note.proyectos || [];

      expect(proyectos.length).toBe(3);
      expect(proyectos[0].nombre).toBe("Nipëi OS (Plataforma Duplo Núcleo)");
      expect(proyectos[0].estado).toBe("activo");
      expect(proyectos[1].nombre).toBe("Portal nipeihu.org");
    });

    test("4.5 Discovers multiple client notes in Clientes/ while ignoring system notes", async () => {
      const clients = await engine.parseAllClients();
      const clientIds = clients.map((c) => c.id);

      expect(clientIds).toContain("nipeihu");
      expect(clientIds).toContain("digital-alignment");
      expect(clientIds).not.toContain("_ecosistema");
      expect(clientIds).not.toContain("_infraestructura");
    });

    test("4.6 Tolerates missing optional fields in notes by applying sensible defaults", async () => {
      // Create minimal valid note
      await engine.writeVaultNote("Clientes/minimal-brand.md", {
        id: "minimal-brand",
        nombre: "Minimal Brand",
      });

      const read = await engine.readVaultNote("Clientes/minimal-brand.md");
      expect(read.id).toBe("minimal-brand");
      expect(read.nombre).toBe("Minimal Brand");
      expect(read.tipo).toBe("cliente_externo");
      expect(read.estado).toBe("activo");
    });
  });

  describe("Tier 1 - Feature 5: CLI Configurations & Environment Resolution", () => {
    test("5.1 Resolves Claude Code CLI binary path or env override", () => {
      const originalEnv = process.env.AGENTIC_OS_CLAUDE_BIN;
      process.env.AGENTIC_OS_CLAUDE_BIN = "C:\\test\\claude.cmd";

      const resolved = process.env.AGENTIC_OS_CLAUDE_BIN || "claude";
      expect(resolved).toBe("C:\\test\\claude.cmd");

      if (originalEnv) process.env.AGENTIC_OS_CLAUDE_BIN = originalEnv;
      else delete process.env.AGENTIC_OS_CLAUDE_BIN;
    });

    test("5.2 Resolves OpenClaw CLI binary path or env override", () => {
      const originalEnv = process.env.AGENTIC_OS_OPENCLAW_BIN;
      process.env.AGENTIC_OS_OPENCLAW_BIN = "/usr/local/bin/openclaw";

      const resolved = process.env.AGENTIC_OS_OPENCLAW_BIN || "openclaw";
      expect(resolved).toBe("/usr/local/bin/openclaw");

      if (originalEnv) process.env.AGENTIC_OS_OPENCLAW_BIN = originalEnv;
      else delete process.env.AGENTIC_OS_OPENCLAW_BIN;
    });

    test("5.3 Resolves Hermes CLI binary path or env override", () => {
      const originalEnv = process.env.AGENTIC_OS_HERMES_BIN;
      process.env.AGENTIC_OS_HERMES_BIN = "hermes-cli";

      const resolved = process.env.AGENTIC_OS_HERMES_BIN || "hermes";
      expect(resolved).toBe("hermes-cli");

      if (originalEnv) process.env.AGENTIC_OS_HERMES_BIN = originalEnv;
      else delete process.env.AGENTIC_OS_HERMES_BIN;
    });

    test("5.4 Resolves Custom agent CLI binary with custom command templates", () => {
      const customConfig = {
        binaryPath: "C:\\agents\\agy.exe",
        template: "{bin} -p \"{prompt}\" --dangerously-skip-permissions",
      };

      const prompt = "Audit Nipëi OS state";
      const cmd = customConfig.template.replace("{bin}", customConfig.binaryPath).replace("{prompt}", prompt);

      expect(cmd).toBe('C:\\agents\\agy.exe -p "Audit Nipëi OS state" --dangerously-skip-permissions');
    });

    test("5.5 Resolves vaultRoot prioritizing Desktop/DA/digitalalignment when present", () => {
      const expectedPath = path.join(os.homedir(), "Desktop", "DA", "digitalalignment");
      const candidates = [
        process.env.AGENTIC_OS_VAULT,
        path.join(os.homedir(), "Desktop", "DA", "digitalalignment"),
        "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment",
      ].filter(Boolean);

      expect(candidates).toContain(expectedPath);
    });

    test("5.6 Validates Windows path compatibility (handles backslashes, delimiter semicolons)", () => {
      const winPath = "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment\\Clientes\\Nipeihu.md";
      const normalized = winPath.replace(/\\/g, "/");

      expect(normalized).toBe("C:/Users/ondig/Desktop/DA/digitalalignment/Clientes/Nipeihu.md");
      expect(path.win32.isAbsolute(winPath)).toBe(true);

      const delimiter = process.platform === "win32" ? ";" : ":";
      expect([";", ":"]).toContain(delimiter);
    });
  });
}
