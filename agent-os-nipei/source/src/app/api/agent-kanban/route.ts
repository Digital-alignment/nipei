import { NextResponse } from "next/server";
import { getLiveKanbanTasks } from "@/lib/kanbanGrounding";

// Read-only task list for the Hermes skill nipei-os (hermes/skills/nipei-os/SKILL.md): tasks[].id/columnStatus/priority/assignee/title.
// Writes go through /api/venu/kanban-action. Protected by the session or the NIPEI_API_TOKEN Bearer (proxy.ts).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tasks = getLiveKanbanTasks();
    return NextResponse.json({ success: true, count: tasks.length, tasks });
  } catch (err: unknown) {
    console.error("Error in agent-kanban API:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Failed to load kanban tasks" }, { status: 500 });
  }
}
