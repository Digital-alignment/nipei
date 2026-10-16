"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock, Zap, Bot, ShieldCheck, CheckCircle2, Archive, Sparkles,
  User, Building2, Calendar, AlertTriangle, ArrowUpDown, ChevronDown,
  ChevronUp, ChevronRight, CheckSquare, MessageSquare, Tag, Eye, Play, Plus,
  Layers, Check, ExternalLink, HelpCircle
} from "lucide-react";
import {
  type GlobalTask,
  type KanbanColumnId,
  type SquadMeta,
  type MemberProfile
} from "@/lib/nipeiStore";
import { type ColumnDef } from "./SquadKanbanView";

export interface TaskGroup {
  key: string;
  title: string;
  badge: string;
  tasks: GlobalTask[];
  color: string;
  bg?: string;
  border?: string;
  colDef?: ColumnDef;
}

interface KanbanListViewProps {
  tasks: GlobalTask[];
  columns: ColumnDef[];
  squads: SquadMeta[];
  members: MemberProfile[];
  onOpenTask: (task: GlobalTask) => void;
  onMoveColumn: (taskId: string, targetCol: KanbanColumnId) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onDispatchAgent?: (taskId: string) => void;
  onCreateTaskInColumn?: (colId: KanbanColumnId) => void;
  getDueDateAlert: (dueDateStr?: string, columnStatus?: string) => any;
}

type SortField = "title" | "column" | "priority" | "dueDate" | "squad" | "assignee";
type SortOrder = "asc" | "desc";

export default function KanbanListView({
  tasks,
  columns,
  squads,
  members,
  onOpenTask,
  onMoveColumn,
  onToggleSubtask,
  onDispatchAgent,
  onCreateTaskInColumn,
  getDueDateAlert,
}: KanbanListViewProps) {
  const [groupBy, setGroupBy] = useState<"column" | "squad" | "priority" | "none">("column");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Column map for rapid lookup
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnDef>();
    columns.forEach((c) => map.set(c.id, c));
    return map;
  }, [columns]);

  // Squad map for quick name/color resolution
  const squadMap = useMemo(() => {
    const map = new Map<string, SquadMeta>();
    squads.forEach((s) => map.set(s.id, s));
    return map;
  }, [squads]);

  // Priority weight for sorting
  const priorityWeight: Record<string, number> = {
    urgente: 4,
    alta: 3,
    media: 2,
    baixa: 1,
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Sorted tasks list
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "");
          break;
        case "column":
          comparison = (a.columnStatus || "").localeCompare(b.columnStatus || "");
          break;
        case "priority":
          comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
          break;
        case "dueDate":
          comparison = (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
          break;
        case "squad":
          comparison = (a.squad || "").localeCompare(b.squad || "");
          break;
        case "assignee":
          comparison = (a.assignee || "").localeCompare(b.assignee || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [tasks, sortField, sortOrder]);

  // Grouped tasks
  const groups: TaskGroup[] = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", title: "Todas as Tarefas", badge: `${sortedTasks.length}`, tasks: sortedTasks, color: "#22c55e" }];
    }

    if (groupBy === "column") {
      return columns.map((col) => {
        const colTasks = sortedTasks.filter((t) => (t.columnStatus || (t as any).column) === col.id);
        return {
          key: col.id,
          title: col.label,
          badge: `${colTasks.length}`,
          tasks: colTasks,
          color: col.color,
          bg: col.bg,
          border: col.border,
          colDef: col,
        };
      });
    }

    if (groupBy === "priority") {
      const priorityOrder: ("urgente" | "alta" | "media" | "baixa")[] = ["urgente", "alta", "media", "baixa"];
      const priorityLabels: Record<string, { label: string; color: string }> = {
        urgente: { label: "Urgente", color: "#f43f5e" },
        alta: { label: "Alta", color: "#f59e0b" },
        media: { label: "Média", color: "#38bdf8" },
        baixa: { label: "Baixa", color: "#4ade80" },
      };

      return priorityOrder.map((pri) => {
        const priTasks = sortedTasks.filter((t) => t.priority === pri);
        return {
          key: pri,
          title: priorityLabels[pri].label,
          badge: `${priTasks.length}`,
          tasks: priTasks,
          color: priorityLabels[pri].color,
        };
      });
    }

    if (groupBy === "squad") {
      const allSquadIds = Array.from(new Set(sortedTasks.map((t) => t.squad || "unassigned")));
      return allSquadIds.map((sqId) => {
        const sqTasks = sortedTasks.filter((t) => (t.squad || "unassigned") === sqId);
        const sqMeta = squadMap.get(sqId);
        return {
          key: sqId,
          title: sqMeta ? sqMeta.name.split("—")[0].trim() : "Sem Squad",
          badge: `${sqTasks.length}`,
          tasks: sqTasks,
          color: sqMeta?.colorHex || "#a7f3d0",
        };
      });
    }

    return [];
  }, [groupBy, sortedTasks, columns, squadMap]);

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Grouping selector & Quick info */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#1e381e] bg-[#080f08]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-[#a7f3d0]/70 flex items-center gap-1 font-bold">
            <Layers size={13} className="text-[#22c55e]" /> Agrupar por:
          </span>
          <div className="flex items-center gap-1 bg-[#050805] p-0.5 rounded-lg border border-[#1e381e]">
            {[
              { id: "column", label: "Status / Coluna" },
              { id: "squad", label: "Squad" },
              { id: "priority", label: "Prioridade" },
              { id: "none", label: "Sem Agrupamento" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGroupBy(opt.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  groupBy === opt.id
                    ? "bg-[#22c55e] text-[#050805] font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#a7f3d0]/80">
          <span>Total: <strong className="text-[#22c55e]">{sortedTasks.length}</strong> tarefas listadas</span>
        </div>
      </div>

      {/* Main Table / Groups Container */}
      <div className="space-y-4">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group.key] || false;
          return (
            <div
              key={group.key}
              className="rounded-xl border border-[#1e381e] bg-[#070d08]/80 backdrop-blur-md overflow-hidden shadow-lg transition-all"
            >
              {/* Group Header Bar */}
              <div
                onClick={() => toggleGroupCollapse(group.key)}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-[#0a150a]/90 border-b border-[#142414] cursor-pointer hover:bg-[#0e1d0e] transition select-none"
              >
                <div className="flex items-center gap-2.5">
                  <button className="text-zinc-400 hover:text-white transition">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || "#22c55e" }}
                  />
                  <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                    {group.title}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-mono font-bold border"
                    style={{
                      borderColor: `${group.color}40`,
                      backgroundColor: `${group.color}15`,
                      color: group.color,
                    }}
                  >
                    {group.badge}
                  </span>
                </div>

                {/* Optional Quick Add in this column group */}
                {group.colDef && onCreateTaskInColumn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTaskInColumn(group.colDef!.id);
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-[#4ade80] flex items-center gap-1 px-2 py-1 rounded bg-[#050805] border border-[#1e381e] hover:border-[#22c55e]/50 transition"
                  >
                    <Plus size={12} /> Nova Tarefa
                  </button>
                )}
              </div>

              {/* Group Tasks Table (Only visible if not collapsed) */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {group.tasks.length === 0 ? (
                    <div className="px-6 py-6 text-center text-xs font-mono text-zinc-500 italic">
                      Nenhuma tarefa neste grupo.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono min-w-[760px]">
                      <thead>
                        <tr className="border-b border-[#142414] bg-[#050905]/80 text-[#a7f3d0]/60 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th
                            className="py-2.5 px-3 cursor-pointer hover:text-white transition"
                            onClick={() => handleSort("title")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Título & Projeto</span>
                              {sortField === "title" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-3 w-40 cursor-pointer hover:text-white transition"
                            onClick={() => handleSort("column")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Status / Coluna</span>
                              {sortField === "column" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-3 w-28 cursor-pointer hover:text-white transition"
                            onClick={() => handleSort("priority")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Prioridade</span>
                              {sortField === "priority" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-3 w-40 cursor-pointer hover:text-white transition"
                            onClick={() => handleSort("squad")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Squad & Atribuição</span>
                              {sortField === "squad" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th
                            className="py-2.5 px-3 w-36 cursor-pointer hover:text-white transition"
                            onClick={() => handleSort("dueDate")}
                          >
                            <div className="flex items-center gap-1">
                              <span>Prazo Limite</span>
                              {sortField === "dueDate" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 w-20 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#102010]">
                        {group.tasks.map((task, idx) => {
                          const col = columnMap.get(task.columnStatus || (task as any).column) || columns[0];
                          const sq = squadMap.get(task.squad);
                          const dueAlert = getDueDateAlert(task.dueDate);
                          const checklist = task.checklist || [];
                          const completedChecklist = checklist.filter((i) => i.completed).length;

                          return (
                            <tr
                              key={task.id}
                              onClick={() => onOpenTask(task)}
                              className="group hover:bg-[#0f210f]/70 transition-colors cursor-pointer"
                            >
                              {/* Index / ID */}
                              <td className="py-2.5 px-3 text-center text-zinc-500 font-bold group-hover:text-emerald-400">
                                {idx + 1}
                              </td>

                              {/* Title & Project & Subtasks count */}
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium group-hover:text-emerald-300 transition line-clamp-1">
                                      {task.title}
                                    </span>
                                    {task.assignedAgents && task.assignedAgents.length > 0 && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 border border-emerald-600/40 text-emerald-400">
                                        <Bot size={10} /> @{task.assignedAgents[0]}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                    <span className="text-emerald-500 font-bold">{task.id}</span>
                                    {task.project && (
                                      <span>• {task.project}</span>
                                    )}
                                    {checklist.length > 0 && (
                                      <span className="flex items-center gap-1 text-[#a7f3d0]/70">
                                        <CheckSquare size={10} className="text-emerald-400" />
                                        {completedChecklist}/{checklist.length}
                                      </span>
                                    )}
                                    {task.comments && task.comments.length > 0 && (
                                      <span className="flex items-center gap-1 text-zinc-400">
                                        <MessageSquare size={10} />
                                        {task.comments.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Column / Status Quick Select */}
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={task.columnStatus || (task as any).column}
                                  onChange={(e) => onMoveColumn(task.id, e.target.value as KanbanColumnId)}
                                  className="w-full text-xs font-mono rounded-lg px-2 py-1 border transition cursor-pointer outline-none bg-[#050805]"
                                  style={{
                                    borderColor: col?.border || "#1e381e",
                                    color: col?.color || "#22c55e",
                                  }}
                                >
                                  {columns.map((c) => (
                                    <option key={c.id} value={c.id} className="bg-[#0c160c] text-white">
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Priority Badge */}
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                    task.priority === "urgente"
                                      ? "bg-rose-950/70 text-rose-300 border-rose-600/60"
                                      : task.priority === "alta"
                                      ? "bg-amber-950/70 text-amber-300 border-amber-600/60"
                                      : task.priority === "media"
                                      ? "bg-sky-950/70 text-sky-300 border-sky-600/60"
                                      : "bg-emerald-950/70 text-emerald-300 border-emerald-600/60"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </td>

                              {/* Squad & Assignee */}
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-zinc-300 truncate max-w-[150px]">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: sq?.colorHex || "#22c55e" }}
                                    />
                                    <span className="truncate">{sq?.name ? sq.name.split("—")[0].trim() : task.squad}</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 flex items-center gap-1 truncate max-w-[150px]">
                                    <User size={10} className="shrink-0" />
                                    <span className="truncate">{task.assignee || "Não atribuído"}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Due Date with alerts */}
                              <td className="py-2.5 px-3">
                                {task.dueDate ? (
                                  <div
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                                      dueAlert.variant === "overdue"
                                        ? "bg-rose-950/60 text-rose-300 border-rose-700/60 animate-pulse"
                                        : dueAlert.variant === "due_today"
                                        ? "bg-amber-950/60 text-amber-300 border-amber-600/60 font-bold"
                                        : dueAlert.variant === "due_soon"
                                        ? "bg-yellow-950/40 text-yellow-300 border-yellow-700/40"
                                        : "bg-[#050805] text-[#a7f3d0]/80 border-[#1e381e]"
                                    }`}
                                  >
                                    <Calendar size={11} className="shrink-0" />
                                    <span>{task.dueDate}</span>
                                    {dueAlert.isOverdue && (
                                      <span className="text-[9px] font-bold text-rose-400">⚠️</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-zinc-600 text-[11px] italic">Sem data</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  {onDispatchAgent && task.columnStatus !== "done" && task.columnStatus !== "archived" && (
                                    <button
                                      onClick={() => onDispatchAgent(task.id)}
                                      title="Acionar Agente IA para resolver tarefa"
                                      className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition"
                                    >
                                      <Zap size={13} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onOpenTask(task)}
                                    title="Abrir detalhes da tarefa"
                                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
