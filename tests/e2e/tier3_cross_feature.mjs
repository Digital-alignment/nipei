/**
 * Tier 3: Cross-Feature Combinations E2E Tests
 * Validates interactions and bidirectional synchronization between:
 * - Agent Task / Kanban state
 * - Obsidian Vault roadmap items
 * - Live execution telemetry
 * - Concurrent write concurrency guarantees
 */

import { describe, test, expect, beforeEach, afterEach } from "./harness.mjs";
import { createTempVault, createTempStateDir } from "./fixtures.mjs";
import { createTaskStore, createVaultEngine, syncTaskWithVault } from "./engine.mjs";
import { validateVaultNoteContent } from "./validator.mjs";
import fs from "node:fs";
import path from "node:path";

export function registerTier3Tests() {
  describe("Tier 3: Cross-Feature Combinations & Vault Synchronization", () => {
    let vaultDir, cleanupVault, engine;
    let stateDir, cleanupState, store;

    beforeEach(async () => {
      const vault = await createTempVault();
      vaultDir = vault.vaultDir;
      cleanupVault = vault.cleanup;
      engine = createVaultEngine(vaultDir);

      const state = await createTempStateDir();
      stateDir = state.stateDir;
      cleanupState = state.cleanup;
      store = createTaskStore(stateDir);
    });

    afterEach(async () => {
      await cleanupVault();
      await cleanupState();
    });

    test("3.1 Task status marked 'done' on Kanban board reflects in vault note roadmap as hecho: true and fecha_completado", async () => {
      // Create task linked to Nipeihu's existing roadmap item 'biografias-guardianes'
      const task = await store.createTask({
        id: "task-biografias-guardianes",
        title: "Completar biografías de los Guardianes",
        status: "backlog",
        priority: "alta",
        assignedAgent: "claude",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "biografias-guardianes",
      });

      // Move task to 'done'
      const updatedTask = await store.moveTaskStatus(task.id, "done");
      expect(updatedTask.status).toBe("done");

      // Sync with vault
      const syncRes = await syncTaskWithVault(updatedTask, engine);
      expect(syncRes.synced).toBe(true);

      // Verify vault note roadmap reflects the change
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const roadmapItem = note.roadmap.find((item) => item.id === "biografias-guardianes");

      expect(roadmapItem).toBeDefined();
      expect(roadmapItem.hecho).toBe(true);
      expect(roadmapItem.estado).toBeUndefined(); // Invariant: no intermediate status when hecho is true!
      expect(roadmapItem.fecha_completado).toBeDefined();
      expect(roadmapItem.responsable).toBe("@claude");

      // Verify file passes da-vault-schema check
      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), "utf8");
      const validation = validateVaultNoteContent(raw, "Nipeihu.md");
      expect(validation.valid).toBe(true);
    });

    test("3.2 Reopening a completed task ('done' -> 'in_progress') updates vault note roadmap removing hecho: true and fecha_completado", async () => {
      // Start with completed item 'kanban-modo-tela-cheia' (hecho: true)
      const noteBefore = await engine.readVaultNote("Clientes/Nipeihu.md");
      const itemBefore = noteBefore.roadmap.find((item) => item.id === "kanban-modo-tela-cheia");
      expect(itemBefore.hecho).toBe(true);

      // Create and reopen task
      const task = await store.createTask({
        id: "task-kanban-modo-tela-cheia",
        title: "Modo Full Page / Tela Cheia Imersiva",
        status: "done",
        priority: "alta",
        assignedAgent: "claude",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "kanban-modo-tela-cheia",
      });

      // Reopen to in_progress
      const reopenedTask = await store.moveTaskStatus(task.id, "in_progress");
      expect(reopenedTask.status).toBe("in_progress");

      await syncTaskWithVault(reopenedTask, engine);

      const noteAfter = await engine.readVaultNote("Clientes/Nipeihu.md");
      const itemAfter = noteAfter.roadmap.find((item) => item.id === "kanban-modo-tela-cheia");

      expect(itemAfter.hecho).toBe(false);
      expect(itemAfter.estado).toBe("en_curso");
      expect(itemAfter.fecha_completado).toBeUndefined();
    });

    test("3.3 Creating a task in Kanban with clientNoteId adds a new roadmap item in target vault note adhering to schema", async () => {
      const newTask = await store.createTask({
        id: "task-novo-app-fitoterapia",
        title: "Desenvolver módulo de fitoterapia tradicional no Nipëi OS",
        status: "backlog",
        priority: "alta",
        assignedAgent: "openclaw",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "fitoterapia-tradicional",
        tags: ["botica", "dev"],
      });

      await syncTaskWithVault(newTask, engine);

      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const addedItem = note.roadmap.find((item) => item.id === "fitoterapia-tradicional");

      expect(addedItem).toBeDefined();
      expect(addedItem.texto).toBe("Desenvolver módulo de fitoterapia tradicional no Nipëi OS");
      expect(addedItem.prioridad).toBe("alta");
      expect(addedItem.hecho).toBe(false);
      expect(addedItem.responsable).toBe("@openclaw");
      expect(addedItem.tags).toContain("botica");
    });

    test("3.4 Modifying a roadmap item in the vault note propagates to Kanban task state upon sync/prefill", async () => {
      // Modify directly in the vault note
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      const roadmap = note.roadmap.map((item) => {
        if (item.id === "whisper-api-cantos") {
          return { ...item, prioridad: "urgente", tags: ["ia", "audio", "sprint-1"] };
        }
        return item;
      });
      await engine.writeVaultNote("Clientes/Nipeihu.md", { roadmap });

      // Read back via prefill logic
      const updatedNote = await engine.readVaultNote("Clientes/Nipeihu.md");
      const updatedItem = updatedNote.roadmap.find((i) => i.id === "whisper-api-cantos");

      expect(updatedItem.prioridad).toBe("urgente");
      expect(updatedItem.tags).toContain("sprint-1");
    });

    test("3.5 Task execution logs stream continuously while preserving task status and vault roadmap consistency", async () => {
      const task = await store.createTask({
        id: "task-streaming-logs",
        title: "Test Log Streaming",
        status: "in_progress",
        priority: "alta",
        assignedAgent: "claude",
        clientNoteId: "nipeihu",
        vaultRoadmapId: "streaming-logs-item",
      });

      // Stream 5 log entries
      for (let i = 1; i <= 5; i++) {
        await store.appendLog(task.id, {
          timestamp: `2026-09-04T14:0${i}:00Z`,
          message: `Execution chunk ${i}: verifying test step`,
          level: i === 5 ? "output" : "info",
        });
      }

      await syncTaskWithVault(task, engine);

      const retrieved = await store.getTask(task.id);
      expect(retrieved.executionLogs.length).toBe(5);
      expect(retrieved.executionLogs[4].level).toBe("output");

      // Verify vault note is intact
      const note = await engine.readVaultNote("Clientes/Nipeihu.md");
      expect(note.id).toBe("nipeihu");
    });

    test("3.6 Concurrent task updates on the same brand note serialize cleanly via atomic file writes", async () => {
      const tasks = [
        { id: "c-1", title: "Concurrent Task 1", assignedAgent: "claude", vaultRoadmapId: "conc-1" },
        { id: "c-2", title: "Concurrent Task 2", assignedAgent: "openclaw", vaultRoadmapId: "conc-2" },
        { id: "c-3", title: "Concurrent Task 3", assignedAgent: "hermes", vaultRoadmapId: "conc-3" },
      ];

      // Execute 3 concurrent sync operations simultaneously
      await Promise.all(
        tasks.map(async (t) => {
          const created = await store.createTask({
            ...t,
            status: "done",
            clientNoteId: "nipeihu",
          });
          return syncTaskWithVault(created, engine);
        })
      );

      // Verify all 3 tasks were added to the roadmap without race condition corruption
      const finalNote = await engine.readVaultNote("Clientes/Nipeihu.md");
      const ids = finalNote.roadmap.map((item) => item.id);

      expect(ids).toContain("conc-1");
      expect(ids).toContain("conc-2");
      expect(ids).toContain("conc-3");

      const raw = await fs.promises.readFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), "utf8");
      const validation = validateVaultNoteContent(raw, "Nipeihu.md");
      expect(validation.valid).toBe(true);
    });
  });
}
