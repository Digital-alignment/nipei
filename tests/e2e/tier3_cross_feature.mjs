/**
 * Tier 3: Cross-feature flows — create/assign (kanban API) feeding execute and the workspace logs.
 */

import { describe, test, expect, afterAll } from "./harness.mjs";
import { api, simRun, findTask } from "./engine.mjs";
import { writeTempNote, cleanupAll, uid } from "./fixtures.mjs";
import { readNote } from "./validator.mjs";

export function registerTier3Tests() {
  describe("Tier 3: Cross-Feature Combinations", () => {
    afterAll(cleanupAll);

    test("3.1 Agents set on POST drive which agent execute runs", async () => {
      const { body } = await api.createTask({ title: `${uid()} post exec`, assignedAgents: ["antigravity", "openclaw"] });
      const note = { id: uid(), vaultPath: body.task.vaultPath };
      const run = await simRun(note);
      expect(run.body.assignedAgent).toBe("openclaw");
      const ws = await api.workspace(note.id);
      expect(ws.body.executionLogs[0]).toContain("via openclaw");
    });

    test("3.2 Re-assigning via PATCH changes the agent of the next run", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      expect((await simRun(note)).body.assignedAgent).toBe("claude");
      await api.patchTask({ vaultPath: note.vaultPath, assignedAgents: ["hermes"] });
      expect((await simRun(note)).body.assignedAgent).toBe("hermes");
    });

    test("3.3 Repeated runs accumulate executionLogs in the workspace", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      const first = await simRun(note);
      const second = await simRun(note);
      expect(second.body.executionLogs.length).toBe(first.body.executionLogs.length * 2);
      const ws = await api.workspace(note.id);
      expect(ws.body.executionLogs.filter((l) => l.includes("Run simulation")).length).toBe(2);
    });

    test("3.4 execute only rewrites the status line; body and other frontmatter stay intact", async () => {
      const note = writeTempNote({ agents: ["claude"], squad: "squad_6_infra", body: "## Corpo\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n[[Projetos/X]]" });
      const before = readNote(note.vaultPath).raw;
      await simRun(note);
      const after = readNote(note.vaultPath).raw;
      expect(after).toBe(before.replace('status: "A fazer"', 'status: "Revisão"'));
    });

    test("3.5 PATCH to agent_executing then execute lands in review", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      await api.patchTask({ vaultPath: note.vaultPath, column: "agent_executing" });
      expect((await findTask(note.vaultPath)).columnStatus).toBe("agent_executing");
      await simRun(note);
      expect((await findTask(note.vaultPath)).columnStatus).toBe("review");
    });

    test("3.6 Workspace follows squadId into its squad folder", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      await simRun(note, { squadId: "squad_6_infra" });
      const ws = await api.workspace(note.id);
      expect(ws.body.workspacePath).toContain("/SQ-06_Infra/");
      expect(ws.body.executionLogs.length).toBeGreaterThan(0);
    });
  });
}
