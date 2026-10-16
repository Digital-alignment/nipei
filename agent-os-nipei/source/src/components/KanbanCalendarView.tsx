"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
  AlertTriangle, CheckSquare, Bot, Plus, Tag, Layers, Filter
} from "lucide-react";
import {
  type GlobalTask,
  type KanbanColumnId,
  type SquadMeta,
  type MemberProfile
} from "@/lib/nipeiStore";
import { type ColumnDef } from "./SquadKanbanView";

interface KanbanCalendarViewProps {
  tasks: GlobalTask[];
  columns: ColumnDef[];
  squads: SquadMeta[];
  onOpenTask: (task: GlobalTask) => void;
  onMoveColumn: (taskId: string, targetCol: KanbanColumnId) => void;
  onCreateTaskOnDate?: (dateStr: string) => void;
  getDueDateAlert: (dueDateStr?: string, columnStatus?: string) => any;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function KanbanCalendarView({
  tasks,
  columns,
  squads,
  onOpenTask,
  onMoveColumn,
  onCreateTaskOnDate,
  getDueDateAlert,
}: KanbanCalendarViewProps) {
  // Calendar current view month and year
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayTasksModal, setSelectedDayTasksModal] = useState<{ dateStr: string; tasks: GlobalTask[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Quick lookup map for columns
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnDef>();
    columns.forEach((c) => map.set(c.id, c));
    return map;
  }, [columns]);

  // Tasks grouped by dueDate (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, GlobalTask[]> = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const cleanDate = t.dueDate.trim();
      if (!map[cleanDate]) {
        map[cleanDate] = [];
      }
      map[cleanDate].push(t);
    });
    return map;
  }, [tasks]);

  // Tasks without a dueDate
  const undatedTasks = useMemo(() => {
    return tasks.filter((t) => !t.dueDate || t.dueDate.trim() === "");
  }, [tasks]);

  // Build grid days for the current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = new Date().toISOString().split("T")[0];

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      tasks: GlobalTask[];
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const prevMonthNum = month === 0 ? 12 : month;
      const prevYearNum = month === 0 ? year - 1 : year;
      const dateStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
      days.push({
        dayNumber: prevDay,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        tasks: tasksByDate[dateStr] || [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        tasks: tasksByDate[dateStr] || [],
      });
    }

    // Next month padding to fill a 35 or 42 grid
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remainingSlots; day++) {
      const nextMonthNum = month + 2 > 12 ? 1 : month + 2;
      const nextYearNum = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        tasks: tasksByDate[dateStr] || [],
      });
    }

    return days;
  }, [year, month, tasksByDate]);

  return (
    <div className="space-y-4">
      {/* Calendar Navigation Topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#1e381e] bg-[#080f08]/90 backdrop-blur-md">
        {/* Month & Year Title with Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              title="Mês anterior"
              className="p-1.5 rounded-lg bg-[#050805] hover:bg-[#142414] border border-[#1e381e] text-[#a7f3d0] hover:text-white transition active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              title="Próximo mês"
              className="p-1.5 rounded-lg bg-[#050805] hover:bg-[#142414] border border-[#1e381e] text-[#a7f3d0] hover:text-white transition active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2 pl-2">
            <CalendarIcon size={18} className="text-[#22c55e]" />
            <span>{MONTH_NAMES[month]} {year}</span>
          </h2>

          <button
            onClick={handleToday}
            className="ml-2 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#142414] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#1e381e] hover:text-white transition"
          >
            Hoje
          </button>
        </div>

        {/* Legend / Counters */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Com prazo: <strong className="text-white">{tasks.length - undatedTasks.length}</strong></span>
          </div>
          {undatedTasks.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              <Clock size={12} />
              <span>Sem data definida: <strong>{undatedTasks.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar Grid Container (Responsive with horizontal scroll on small viewports) */}
      <div className="rounded-xl border border-[#1e381e] bg-[#070d08]/80 backdrop-blur-md overflow-x-auto shadow-xl scrollbar-thin">
        <div className="min-w-[680px]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[#142414] bg-[#050905]">
            {WEEKDAY_NAMES.map((name, idx) => (
              <div
                key={name}
                className={`py-2 text-center text-[11px] font-mono font-bold tracking-wider uppercase ${
                  idx === 0 || idx === 6 ? "text-emerald-500/70" : "text-[#a7f3d0]/80"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#122212] bg-[#050905]/40">
          {calendarDays.map((slot, idx) => {
            const hasTasks = slot.tasks.length > 0;
            return (
              <div
                key={`${slot.dateStr}-${idx}`}
                className={`min-h-[105px] sm:min-h-[125px] p-1.5 flex flex-col transition-colors group relative ${
                  slot.isCurrentMonth ? "bg-[#070d08]/60" : "bg-[#040604]/80 opacity-40"
                } ${
                  slot.isToday
                    ? "ring-1 ring-inset ring-emerald-500/80 bg-[#0a180a]/80"
                    : "hover:bg-[#0b170b]/60"
                }`}
              >
                {/* Day Header: Date Number + Quick Add */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      slot.isToday
                        ? "bg-[#22c55e] text-[#050805] shadow-sm"
                        : slot.isCurrentMonth
                        ? "text-zinc-300 group-hover:text-white"
                        : "text-zinc-600"
                    }`}
                  >
                    {slot.dayNumber}
                  </span>

                  {onCreateTaskOnDate && slot.isCurrentMonth && (
                    <button
                      onClick={() => onCreateTaskOnDate(slot.dateStr)}
                      title={`Criar nova tarefa para ${slot.dateStr}`}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-emerald-400 hover:bg-[#142414] transition"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {/* Tasks List inside day */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                  {slot.tasks.slice(0, 3).map((task) => {
                    const col = columnMap.get(task.columnStatus || (task as any).column);
                    const dueAlert = getDueDateAlert(task.dueDate);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        title={`${task.title} (${col?.label || "Pendente"})`}
                        className="p-1 rounded bg-[#091409] hover:bg-[#112411] border text-left cursor-pointer transition flex items-center justify-between gap-1 shadow-xs group/item"
                        style={{
                          borderColor: dueAlert.isOverdue ? "#e11d48" : col?.border || "#1e381e",
                        }}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: col?.color || "#22c55e" }}
                          />
                          <span className="text-[10px] font-mono text-zinc-200 truncate group-hover/item:text-white">
                            {task.title}
                          </span>
                        </div>

                        {dueAlert.isOverdue && (
                          <span className="text-[9px] text-rose-400 font-bold shrink-0">!</span>
                        )}
                      </div>
                    );
                  })}

                  {/* If more than 3 tasks, show overflow indicator */}
                  {slot.tasks.length > 3 && (
                    <button
                      onClick={() => setSelectedDayTasksModal({ dateStr: slot.dateStr, tasks: slot.tasks })}
                      className="w-full text-center text-[9px] font-mono font-bold text-emerald-400 bg-[#0a180a] hover:bg-[#142414] py-0.5 rounded border border-[#1e381e] transition"
                    >
                      + {slot.tasks.length - 3} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Undated Tasks Drawer / Strip (if any) */}
      {undatedTasks.length > 0 && (
        <div className="p-3 rounded-xl border border-dashed border-amber-900/50 bg-[#120f06]/60 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              Tarefas sem prazo definido ({undatedTasks.length})
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Clique para definir uma data limite no modal de edição
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {undatedTasks.map((task) => {
              const col = columnMap.get(task.columnStatus || (task as any).column);
              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#091409] hover:bg-[#112411] border border-[#1e381e] hover:border-emerald-500/60 transition cursor-pointer flex items-center gap-2 shrink-0 max-w-[240px]"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: col?.color || "#22c55e" }}
                  />
                  <span className="text-xs font-mono text-zinc-200 truncate">{task.title}</span>
                  <span className="text-[9px] font-mono text-zinc-500 font-bold">{task.id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Tasks Overflow Modal */}
      {selectedDayTasksModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
          onClick={() => setSelectedDayTasksModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1e381e] bg-[#070d08] p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#142414] pb-2">
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <CalendarIcon size={15} className="text-[#22c55e]" />
                Tarefas para {selectedDayTasksModal.dateStr}
              </h3>
              <button
                onClick={() => setSelectedDayTasksModal(null)}
                className="text-xs text-zinc-400 hover:text-white font-mono"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {selectedDayTasksModal.tasks.map((task) => {
                const col = columnMap.get(task.columnStatus || (task as any).column);
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedDayTasksModal(null);
                      onOpenTask(task);
                    }}
                    className="p-2.5 rounded-xl bg-[#0a150a] border border-[#1e381e] hover:border-emerald-500 cursor-pointer transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{task.title}</span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          color: col?.color || "#22c55e",
                          borderColor: col?.border || "#1e381e",
                          backgroundColor: col?.bg || "transparent",
                        }}
                      >
                        {col?.label || "Status"}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                      <span className="text-emerald-500">{task.id}</span>
                      {task.project && <span>• {task.project}</span>}
                      {task.assignee && <span>• {task.assignee}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
