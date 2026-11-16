// Task shape of the old Kanban API, still returned by GET /api/agent-kanban and read by the Hermes skill
// nipei-os (tasks[].id/columnStatus/priority/assignee/title). Was in the v1 store (lib/nipeiStore.ts), removed.
export type SquadId = string;
export type KanbanColumnId = "triage" | "todo" | "in_progress" | "agent_executing" | "review" | "done" | "archived";

export interface GlobalTask {
  id: string;
  title: string;
  project?: string;
  assignee: string;
  squad: SquadId;
  priority: "urgente" | "alta" | "media" | "baixa";
  status: "pendente" | "em_progresso" | "concluido";
  columnStatus: KanbanColumnId;
  dueDate: string;
  description?: string;
  assignedAgents: string[];
  vaultPath?: string;
}
