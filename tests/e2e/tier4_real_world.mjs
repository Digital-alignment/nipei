/**
 * Tier 4: Real-world scenarios against the live vault (only zz_e2e notes are written).
 */

import fs from "node:fs";
import { describe, test, expect, afterAll } from "./harness.mjs";
import { api, simRun, findTask } from "./engine.mjs";
import { writeTempNote, cleanupAll, abs, uid, MARKER, TAREFAS_REL } from "./fixtures.mjs";
import { readNote, validateTaskNote, KANBAN_COLUMNS } from "./validator.mjs";

export function registerTier4Tests() {
  describe("Tier 4: Real-World Scenarios & Production Acceptance", () => {
    afterAll(cleanupAll);

    test("4.1 GET lists every real Tarefas note, each with a resolvable vaultPath and known column", async () => {
      const { body } = await api.listTasks();
      const onDisk = fs.readdirSync(abs(TAREFAS_REL)).filter((f) => f.endsWith(".md"));
      const listed = body.tasks.filter((t) => t.vaultPath.startsWith(`${TAREFAS_REL}/`));
      expect(listed.length).toBe(onDisk.length);
      for (const t of body.tasks) {
        expect(fs.existsSync(abs(t.vaultPath))).toBe(true);
        expect(KANBAN_COLUMNS).toContain(t.columnStatus);
      }
    });

    test("4.2 Full lifecycle: create -> assign -> in progress -> run -> review -> done -> archived", async () => {
      const created = await api.createTask({ title: `${uid()} ciclo completo`, priority: "alta" });
      const note = { id: uid(), vaultPath: created.body.task.vaultPath };
      const column = async () => (await findTask(note.vaultPath)).columnStatus;

      expect(await column()).toBe("todo");
      await api.patchTask({ vaultPath: note.vaultPath, assignedAgents: ["claude"] });
      await api.patchTask({ vaultPath: note.vaultPath, column: "in_progress" });
      expect(await column()).toBe("in_progress");

      const run = await simRun(note);
      expect(run.body.assignedAgent).toBe("claude");
      expect(await column()).toBe("review");
      expect((await api.workspace(note.id)).body.executionLogs.length).toBeGreaterThan(0);

      await api.patchTask({ vaultPath: note.vaultPath, status: "done" });
      expect(await column()).toBe("done");
      await api.patchTask({ vaultPath: note.vaultPath, status: "archived" });
      expect(await column()).toBe("archived");

      expect(validateTaskNote(note.vaultPath)).toEqual([]);
      expect(readNote(note.vaultPath).body).toContain("Arquivado no histórico");
    });

    test("4.3 Parallel POSTs create distinct notes", async () => {
      const titles = Array.from({ length: 5 }, (_, i) => `${uid()} paralela ${i}`);
      const results = await Promise.all(titles.map((title) => api.createTask({ title })));
      const paths = new Set(results.map((r) => r.body.task.vaultPath));
      expect(paths.size).toBe(5);
      for (const p of paths) expect(validateTaskNote(p)).toEqual([]);
    });

    test("4.4 Parallel runs on different notes keep their own status and logs", async () => {
      const notes = Array.from({ length: 3 }, () => writeTempNote({ agents: ["hermes"] }));
      const runs = await Promise.all(notes.map((n) => simRun(n)));
      for (const r of runs) expect(r.body.status).toBe("Revisão");
      for (const n of notes) {
        const ws = await api.workspace(n.id);
        expect(ws.body.executionLogs.filter((l) => l.includes("Run simulation")).length).toBe(1);
        expect(ws.body.executionLogs.some((l) => l.includes(n.title))).toBe(true);
      }
    });

    test("4.5 Cleanup removes every zz_e2e note and workspace", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      await simRun(note);
      const ws = (await api.workspace(note.id)).body.workspacePath;
      cleanupAll();
      expect(fs.existsSync(abs(note.vaultPath))).toBe(false);
      expect(fs.existsSync(abs(ws))).toBe(false);
      expect(fs.readdirSync(abs(TAREFAS_REL)).some((f) => f.includes(MARKER))).toBe(false);
    });
  });
}
