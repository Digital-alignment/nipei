/**
 * Tier 2: Boundary, corner and adversarial cases for the task store API.
 */

import fs from "node:fs";
import { describe, test, expect, afterAll } from "./harness.mjs";
import { api, simRun, findTask } from "./engine.mjs";
import { writeTempNote, cleanupAll, abs, uid, MARKER } from "./fixtures.mjs";
import { readNote } from "./validator.mjs";

export function registerTier2Tests() {
  describe("Tier 2: Boundary, Corner Cases & Adversarial Verification", () => {
    // A task-shaped note one folder above Tarefas: execute must refuse it even via "..".
    const outsideRel = `Productivity/${MARKER}_outside.md`;
    afterAll(() => {
      fs.rmSync(abs(outsideRel), { force: true });
      cleanupAll();
    });

    test("2.1 POST without title returns 400 and writes nothing", async () => {
      const { status, body } = await api.createTask({ description: "sem titulo" });
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    test("2.2 PATCH without vaultPath returns 400", async () => {
      const { status } = await api.patchTask({ column: "done" });
      expect(status).toBe(400);
    });

    test("2.3 PATCH on a missing note is a no-op and creates no file", async () => {
      const vaultPath = `Productivity/Tarefas/${uid()}.md`;
      const { status } = await api.patchTask({ vaultPath, column: "done" });
      expect(status).toBe(200);
      expect(fs.existsSync(abs(vaultPath))).toBe(false);
    });

    test("2.4 execute rejects missing, non-.md, absolute and nonexistent paths", async () => {
      const note = writeTempNote();
      const bad = [
        undefined,
        note.vaultPath.replace(/\.md$/, ".txt"),
        abs(note.vaultPath),
        `Productivity/Tarefas/${uid()}.md`,
        `Clientes/${uid()}.md`,
      ];
      for (const vaultPath of bad) {
        const { status, body } = await api.execute({ vaultPath, taskId: note.id, simulate: true });
        expect(status).toBe(400);
        expect(body.success).toBe(false);
      }
      expect(readNote(note.vaultPath).fm.status).toBe("A fazer");
    });

    test("2.5 execute refuses '..' traversal out of the task folders", async () => {
      fs.writeFileSync(abs(outsideRel), `---\nid: "${MARKER}_outside"\ntitle: "fora"\nstatus: "A fazer"\n---\n`, "utf-8");
      const paths = [
        `Productivity/Tarefas/../${MARKER}_outside.md`,
        `Productivity/Tarefas/../../../nipei-control/CLAUDE.md`,
      ];
      for (const vaultPath of paths) {
        const { status } = await api.execute({ vaultPath, taskId: uid(), simulate: true });
        expect(status).toBe(400);
      }
      expect(fs.readFileSync(abs(outsideRel), "utf-8")).toContain('status: "A fazer"');
    });

    test("2.6 execute with an invalid JSON body returns 400", async () => {
      const { status } = await api.raw("POST", "/api/agent-kanban/execute", "{not json");
      expect(status).toBe(400);
    });

    test("2.7 execute accepts Windows backslash vault paths", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      const { status, body } = await simRun(note, { vaultPath: note.vaultPath.replace(/\//g, "\\") });
      expect(status).toBe(200);
      expect(body.status).toBe("Revisão");
    });

    test("2.8 Unicode title (accents, emoji) survives POST and GET", async () => {
      const title = `${uid()} Ação Yawanawá ñandú 🌿`;
      const { body } = await api.createTask({ title });
      expect(readNote(body.task.vaultPath).fm.title).toBe(title);
      expect((await findTask(body.task.vaultPath)).title).toBe(title);
    });

    test("2.9 Empty assignedAgents writes agents: [] and GET falls back to squad default", async () => {
      const note = writeTempNote({ agents: ["claude"], squad: "squad_2_mutum" });
      await api.patchTask({ vaultPath: note.vaultPath, assignedAgents: [] });
      expect(readNote(note.vaultPath).fm.agents).toBe("[]");
      expect((await findTask(note.vaultPath)).assignedAgents).toEqual(["openclaw", "hermes"]);
    });

    test("2.10 Note without frontmatter id falls back to filename as task id", async () => {
      const id = uid();
      const vaultPath = `Productivity/Tarefas/${id}.md`;
      fs.writeFileSync(abs(vaultPath), `---\ntitle: "${id} sem id"\nstatus: "A fazer"\n---\ncorpo\n`, "utf-8");
      expect((await findTask(vaultPath)).id).toBe(id);
      const { body } = await api.execute({ vaultPath, simulate: true });
      expect(body.taskId).toBe(id);
    });
  });
}
