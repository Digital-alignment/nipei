/**
 * Tier 1: Feature coverage of the single task store (vault task notes) through its API.
 * 1. GET  /api/agent-kanban               — lists vault notes as kanban tasks
 * 2. POST /api/agent-kanban               — creates a note in Productivity/Tarefas
 * 3. PATCH /api/agent-kanban              — agents, column/status, squad, logs
 * 4. POST /api/agent-kanban/execute       — simulated agent run, status transitions
 * 5. GET  /api/agent-kanban/attachments   — workspace executionLogs
 */

import fs from "node:fs";
import { describe, test, expect, afterAll } from "./harness.mjs";
import { api, simRun, findTask } from "./engine.mjs";
import { writeTempNote, cleanupAll, abs, uid, TAREFAS_REL } from "./fixtures.mjs";
import { readNote, validateTaskNote } from "./validator.mjs";

export function registerTier1Tests() {
  describe("Tier 1 - Feature 1: GET /api/agent-kanban lists vault notes", () => {
    afterAll(cleanupAll);

    test("1.1 Returns success with count matching tasks array", async () => {
      const { status, body } = await api.listTasks();
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.count).toBe(body.tasks.length);
    });

    test("1.2 A new task note appears with id, title, vaultPath and todo column", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      const t = await findTask(note.vaultPath);
      expect(t).toBeDefined();
      expect(t.id).toBe(note.id);
      expect(t.title).toBe(note.title);
      expect(t.columnStatus).toBe("todo");
      expect(t.assignedAgents).toEqual(["claude"]);
    });

    test("1.3 Frontmatter agents line wins over squad default", async () => {
      const note = writeTempNote({ squad: "squad_2_mutum", agents: ["hermes", "custom"] });
      expect((await findTask(note.vaultPath)).assignedAgents).toEqual(["hermes", "custom"]);
    });

    test("1.4 Without agents line, squad default agents apply", async () => {
      const mutum = writeTempNote({ squad: "squad_2_mutum" });
      const infra = writeTempNote({ squad: "squad_6_infra" });
      const ceo = writeTempNote({ squad: "squad_1_ceo" });
      expect((await findTask(mutum.vaultPath)).assignedAgents).toEqual(["openclaw", "hermes"]);
      expect((await findTask(infra.vaultPath)).assignedAgents).toEqual(["claude", "antigravity"]);
      expect((await findTask(ceo.vaultPath)).assignedAgents).toEqual(["antigravity", "hermes"]);
    });

    test("1.5 Status text maps to kanban columns", async () => {
      const cases = {
        "A fazer": "todo",
        "Em andamento": "in_progress",
        "IA em Execução": "agent_executing",
        "Revisão": "review",
        "Bloqueado": "review",
        "Concluído": "done",
        "Arquivado": "archived",
      };
      const notes = Object.entries(cases).map(([status, col]) => ({ note: writeTempNote({ status }), col }));
      const { body } = await api.listTasks();
      for (const { note, col } of notes) {
        expect(body.tasks.find((t) => t.vaultPath === note.vaultPath).columnStatus).toBe(col);
      }
    });
  });

  describe("Tier 1 - Feature 2: POST /api/agent-kanban creates a vault note", () => {
    afterAll(cleanupAll);

    test("2.1 Creates the note under Productivity/Tarefas with valid frontmatter", async () => {
      const { status, body } = await api.createTask({ title: `${uid()} criar tarefa`, description: "desc e2e" });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.task.vaultPath.startsWith(`${TAREFAS_REL}/`)).toBe(true);
      expect(fs.existsSync(abs(body.task.vaultPath))).toBe(true);
      expect(validateTaskNote(body.task.vaultPath)).toEqual([]);
      const note = readNote(body.task.vaultPath);
      expect(note.fm.status).toBe("A fazer");
      expect(note.body).toContain("desc e2e");
    });

    test("2.2 Persists assignedAgents as the agents: frontmatter line", async () => {
      const { body } = await api.createTask({ title: `${uid()} agentes`, assignedAgents: ["claude", "openclaw"] });
      expect(readNote(body.task.vaultPath).agents).toEqual(["claude", "openclaw"]);
    });

    test("2.3 Defaults agents to antigravity + hermes when none given", async () => {
      const { body } = await api.createTask({ title: `${uid()} sem agentes` });
      expect(readNote(body.task.vaultPath).agents).toEqual(["antigravity", "hermes"]);
    });

    test("2.4 Maps priority and squad into frontmatter", async () => {
      const { body } = await api.createTask({ title: `${uid()} prioridade`, priority: "urgente", squad: "squad_6_infra" });
      const { fm } = readNote(body.task.vaultPath);
      expect(fm.priority).toBe("Urgente");
      expect(fm.squad).toBe("squad_6_infra");
    });

    test("2.5 Created task is listed by GET with its agents", async () => {
      const { body } = await api.createTask({ title: `${uid()} listada`, assignedAgents: ["hermes"] });
      const t = await findTask(body.task.vaultPath);
      expect(t).toBeDefined();
      expect(t.assignedAgents).toEqual(["hermes"]);
      expect(t.columnStatus).toBe("todo");
    });
  });

  describe("Tier 1 - Feature 3: PATCH /api/agent-kanban updates the note", () => {
    afterAll(cleanupAll);

    test("3.1 assignedAgents replaces the existing agents line (no duplicate)", async () => {
      const note = writeTempNote({ agents: ["antigravity"] });
      const { status, body } = await api.patchTask({ vaultPath: note.vaultPath, assignedAgents: ["claude", "hermes"] });
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(readNote(note.vaultPath).agents).toEqual(["claude", "hermes"]);
      expect(validateTaskNote(note.vaultPath)).toEqual([]);
    });

    test("3.2 assignedAgents adds an agents line when the note has none", async () => {
      const note = writeTempNote();
      await api.patchTask({ vaultPath: note.vaultPath, assignedAgents: ["openclaw"] });
      expect(readNote(note.vaultPath).agents).toEqual(["openclaw"]);
      expect((await findTask(note.vaultPath)).assignedAgents).toEqual(["openclaw"]);
    });

    test("3.3 column moves write the matching status and round-trip through GET", async () => {
      const note = writeTempNote();
      const expected = {
        in_progress: "Em andamento",
        agent_executing: "IA em Execução",
        review: "Revisão / Bloqueado",
        done: "Concluído",
        archived: "Arquivado",
        todo: "A fazer",
      };
      for (const [column, status] of Object.entries(expected)) {
        await api.patchTask({ vaultPath: note.vaultPath, column });
        expect(readNote(note.vaultPath).fm.status).toBe(status);
        expect((await findTask(note.vaultPath)).columnStatus).toBe(column);
      }
    });

    test("3.4 squad update rewrites frontmatter squad", async () => {
      const note = writeTempNote({ squad: "squad_1_ceo" });
      await api.patchTask({ vaultPath: note.vaultPath, squad: "squad_4_vendas_mkt" });
      expect(readNote(note.vaultPath).fm.squad).toBe("squad_4_vendas_mkt");
      expect((await findTask(note.vaultPath)).squad).toBe("squad_4_vendas_mkt");
    });

    test("3.5 executionLog is appended to the note body", async () => {
      const note = writeTempNote();
      await api.patchTask({ vaultPath: note.vaultPath, executionLog: "linha de log e2e" });
      const { body } = readNote(note.vaultPath);
      expect(body).toContain("Registro de Execução de Agente IA");
      expect(body).toContain("linha de log e2e");
    });

    test("3.6 status done / archived set Concluído / Arquivado", async () => {
      const note = writeTempNote();
      await api.patchTask({ vaultPath: note.vaultPath, status: "done" });
      expect(readNote(note.vaultPath).fm.status).toBe("Concluído");
      await api.patchTask({ vaultPath: note.vaultPath, status: "archived" });
      expect(readNote(note.vaultPath).fm.status).toBe("Arquivado");
    });
  });

  describe("Tier 1 - Feature 4: POST /api/agent-kanban/execute (simulate)", () => {
    afterAll(cleanupAll);

    test("4.1 Simulated run ends in Revisão with exit code 0 and logs", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      const { status, body } = await simRun(note);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.mode).toBe("simulation");
      expect(body.exitCode).toBe(0);
      expect(body.status).toBe("Revisão");
      expect(body.column).toBe("review");
      expect(body.taskId).toBe(note.id);
      expect(body.logs.length).toBeGreaterThanOrEqual(4);
      expect(readNote(note.vaultPath).fm.status).toBe("Revisão");
    });

    test("4.2 Picks the first CLI-capable agent from the agents line", async () => {
      const note = writeTempNote({ agents: ["antigravity", "hermes", "claude"] });
      expect((await simRun(note)).body.assignedAgent).toBe("hermes");
    });

    test("4.3 Explicit agent in the request overrides the note", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      expect((await simRun(note, { agent: "openclaw" })).body.assignedAgent).toBe("openclaw");
    });

    test("4.4 No CLI-capable agent still simulates, with assignedAgent null", async () => {
      const note = writeTempNote({ agents: ["antigravity"] });
      const { body } = await simRun(note);
      expect(body.assignedAgent).toBeNull();
      expect(body.mode).toBe("simulation");
      expect(body.status).toBe("Revisão");
    });

    test("4.5 Executed task shows in the review column via GET", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      await simRun(note);
      expect((await findTask(note.vaultPath)).columnStatus).toBe("review");
    });
  });

  describe("Tier 1 - Feature 5: GET /api/agent-kanban/attachments workspace data", () => {
    afterAll(cleanupAll);

    test("5.1 Fresh task has an empty workspace under Task_Workspace", async () => {
      const id = uid();
      const { status, body } = await api.workspace(id);
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.executionLogs).toEqual([]);
      expect(body.attachments).toEqual([]);
      expect(body.workspacePath).toMatch(/^Task_Workspace\/\d{4}\/[^/]+\/zz_e2e_/);
    });

    test("5.2 executionLogs contain the run header and the simulated lines", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      const run = await simRun(note);
      const { body } = await api.workspace(note.id);
      expect(body.executionLogs).toEqual(run.body.executionLogs);
      expect(body.executionLogs[0]).toContain("Run simulation via claude");
      expect(body.executionLogs.some((l) => l.includes("exit code 0"))).toBe(true);
    });

    test("5.3 Workspace folder is created on disk with _workspace_meta.json", async () => {
      const note = writeTempNote({ agents: ["claude"] });
      await simRun(note);
      const { body } = await api.workspace(note.id);
      expect(fs.existsSync(abs(`${body.workspacePath}/_workspace_meta.json`))).toBe(true);
    });

    test("5.4 Missing taskId and path returns 400", async () => {
      const { status } = await api.raw("GET", "/api/agent-kanban/attachments");
      expect(status).toBe(400);
    });
  });
}
