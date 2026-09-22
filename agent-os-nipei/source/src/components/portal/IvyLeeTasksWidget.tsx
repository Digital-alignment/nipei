"use client";

import React, { useState, useEffect } from "react";
import { ListOrdered, Plus, CheckSquare, Square, AlertCircle, ArrowUpRight, Tag, Layers, Trash2 } from "lucide-react";

export type EisenhowerQuadrant = "Q1" | "Q2" | "Q3" | "Q4";
export type ParaCategory = "Projects" | "Areas" | "Resources" | "Archives";
export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface IvyLeeTask {
  id: string;
  order: number; // 1 to 6
  title: string;
  triageLevel: TriageLevel;
  eisenhower: EisenhowerQuadrant;
  para: ParaCategory;
  completed: boolean;
}

const DEFAULT_IVY_TASKS: IvyLeeTask[] = [
  { id: "t1", order: 1, title: "Auditoria final de notas do Vault com @vaultkeeper", triageLevel: 5, eisenhower: "Q1", para: "Projects", completed: false },
  { id: "t2", order: 2, title: "Revisar permissões de acessos e squads institucionais", triageLevel: 4, eisenhower: "Q2", para: "Areas", completed: false },
  { id: "t3", order: 3, title: "Actualizar mapa de produtos e roadmap comercial", triageLevel: 3, eisenhower: "Q2", para: "Projects", completed: false },
  { id: "t4", order: 4, title: "Sincronização de catálogo de medicinas da floresta", triageLevel: 2, eisenhower: "Q3", para: "Resources", completed: false },
];

interface IvyLeeTasksWidgetProps {
  memberId: string;
}

export default function IvyLeeTasksWidget({ memberId }: IvyLeeTasksWidgetProps) {
  const dateKey = new Date().toISOString().split("T")[0];
  const storageKey = `nipei.portal.ivylee.${memberId}.${dateKey}`;

  const [tasks, setTasks] = useState<IvyLeeTask[]>(DEFAULT_IVY_TASKS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTriage, setNewTriage] = useState<TriageLevel>(3);
  const [newEisenhower, setNewEisenhower] = useState<EisenhowerQuadrant>("Q2");
  const [newPara, setNewPara] = useState<ParaCategory>("Projects");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setTasks(JSON.parse(saved));
      } else {
        setTasks(DEFAULT_IVY_TASKS);
      }
    } catch {
      setTasks(DEFAULT_IVY_TASKS);
    }
  }, [memberId, dateKey]);

  const saveTasks = (updated: IvyLeeTask[]) => {
    setTasks(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || tasks.length >= 6) return;

    const newTask: IvyLeeTask = {
      id: `task_${Date.now()}`,
      order: tasks.length + 1,
      title: newTitle.trim(),
      triageLevel: newTriage,
      eisenhower: newEisenhower,
      para: newPara,
      completed: false,
    };

    saveTasks([...tasks, newTask]);
    setNewTitle("");
    setIsAdding(false);
  };

  const deleteTask = (id: string) => {
    const updated = tasks
      .filter((t) => t.id !== id)
      .map((t, idx) => ({ ...t, order: idx + 1 }));
    saveTasks(updated);
  };

  const getEisenhowerBadge = (q: EisenhowerQuadrant) => {
    switch (q) {
      case "Q1":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700/50">Q1 Fazer Já</span>;
      case "Q2":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50">Q2 Agendar</span>;
      case "Q3":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/50">Q3 Delegar</span>;
      case "Q4":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700">Q4 Eliminar</span>;
    }
  };

  return (
    <div className="bg-[#0b170c] border border-[#1e381e] rounded-xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#183019]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ListOrdered size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Top 6 Tareas (Método Ivy Lee + Triaje)</h3>
            <p className="text-[11px] text-slate-400">Priorização diaria (Máx 6 tarefas por día)</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
          {tasks.filter((t) => t.completed).length} / {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto max-h-[340px] pr-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`group p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
              task.completed
                ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300/60"
                : "bg-[#102012] border-[#1c391f] text-slate-100 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="w-6 h-6 rounded-md bg-[#162e18] text-emerald-400 text-xs font-bold font-mono flex items-center justify-center border border-emerald-500/30 shrink-0 mt-0.5">
                  #{task.order}
                </span>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${task.completed ? "line-through text-emerald-400/60" : "text-white"}`}>
                    {task.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.completed ? (
                  <CheckSquare size={18} className="text-emerald-400" />
                ) : (
                  <Square size={18} className="text-slate-500 group-hover:text-emerald-400 transition" />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
                  title="Excluir tarefa"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Task Tags & Metadata */}
            <div className="flex items-center gap-2 pl-9 flex-wrap text-[10px]">
              {getEisenhowerBadge(task.eisenhower)}

              <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-[#142916] text-emerald-400 border border-emerald-500/30">
                Triaje: Lvl {task.triageLevel}
              </span>

              <span className="px-1.5 py-0.5 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                PARA: {task.para}
              </span>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs italic">
            Nenhuma tarefa cadastrada para hoje. Adicione até 6 tarefas prioritárias.
          </div>
        )}
      </div>

      {/* Add Task Form / Button */}
      <div className="mt-4 pt-3 border-t border-[#183019]">
        {isAdding ? (
          <form onSubmit={handleAddTask} className="flex flex-col gap-2.5 bg-[#122414] p-3 rounded-lg border border-[#234725]">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da tarefa importante (Ivy Lee)..."
              className="bg-[#0b170c] border border-[#1e381e] text-white text-xs rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              autoFocus
            />

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <select
                value={newEisenhower}
                onChange={(e) => setNewEisenhower(e.target.value as EisenhowerQuadrant)}
                className="bg-[#0b170c] border border-[#1e381e] text-slate-200 text-[11px] rounded px-2 py-1"
              >
                <option value="Q1">Q1 (Urgente & Importante)</option>
                <option value="Q2">Q2 (Planejamento & Estratégico)</option>
                <option value="Q3">Q3 (Delegar)</option>
                <option value="Q4">Q4 (Descartar)</option>
              </select>

              <select
                value={newTriage}
                onChange={(e) => setNewTriage(Number(e.target.value) as TriageLevel)}
                className="bg-[#0b170c] border border-[#1e381e] text-slate-200 text-[11px] rounded px-2 py-1"
              >
                <option value={5}>Nivel 5 (Crítico)</option>
                <option value={4}>Nivel 4 (Alto)</option>
                <option value={3}>Nivel 3 (Médio)</option>
                <option value={2}>Nivel 2 (Baixo)</option>
                <option value={1}>Nivel 1 (Mínimo)</option>
              </select>

              <select
                value={newPara}
                onChange={(e) => setNewPara(e.target.value as ParaCategory)}
                className="bg-[#0b170c] border border-[#1e381e] text-slate-200 text-[11px] rounded px-2 py-1"
              >
                <option value="Projects">Projects (Projetos)</option>
                <option value="Areas">Areas (Áreas Responsáveis)</option>
                <option value="Resources">Resources (Recursos)</option>
                <option value="Archives">Archives (Arquivos)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition"
              >
                Adicionar Tarefa #{tasks.length + 1}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            disabled={tasks.length >= 6}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition ${
              tasks.length >= 6
                ? "bg-[#122414]/50 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-[#122414] hover:bg-[#1a331c] text-emerald-400 border-[#204022]"
            }`}
          >
            <Plus size={14} />
            <span>{tasks.length >= 6 ? "Limite de 6 Tarefas Atingido" : "Adicionar Tarefa Ivy Lee"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
