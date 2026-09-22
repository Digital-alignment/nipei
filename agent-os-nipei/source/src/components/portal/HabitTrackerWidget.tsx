"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Circle, Flame, Plus, Trash2, Award } from "lucide-react";

export interface HabitItem {
  id: string;
  title: string;
  category: "sagrado" | "foco" | "kaizen" | "corpo" | "squad";
  completed: boolean;
}

const DEFAULT_HABITS: HabitItem[] = [
  { id: "h1", title: "Rezo & Meditação Matinal (Sagrado)", category: "sagrado", completed: false },
  { id: "h2", title: "Deep Work 2 horas sem distrações", category: "foco", completed: false },
  { id: "h3", title: "Revisão Kaizen diario (Registro PDCA)", category: "kaizen", completed: false },
  { id: "h4", title: "Exercício Físico / Caminhada", category: "corpo", completed: false },
  { id: "h5", title: "Check-in de Squad & Vault Update", category: "squad", completed: false },
];

interface HabitTrackerWidgetProps {
  memberId: string;
}

export default function HabitTrackerWidget({ memberId }: HabitTrackerWidgetProps) {
  const dateKey = new Date().toISOString().split("T")[0];
  const storageKey = `nipei.portal.habits.${memberId}.${dateKey}`;

  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHabits(JSON.parse(saved));
      } else {
        setHabits(DEFAULT_HABITS);
      }
    } catch {
      setHabits(DEFAULT_HABITS);
    }
  }, [memberId, dateKey]);

  const saveHabits = (updated: HabitItem[]) => {
    setHabits(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  const toggleHabit = (id: string) => {
    const updated = habits.map((h) =>
      h.id === id ? { ...h, completed: !h.completed } : h
    );
    saveHabits(updated);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newHabit: HabitItem = {
      id: `h_${Date.now()}`,
      title: newTitle.trim(),
      category: "foco",
      completed: false,
    };
    saveHabits([...habits, newHabit]);
    setNewTitle("");
    setIsAdding(false);
  };

  const deleteHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id));
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const progressPercent = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="bg-[#0b170c] border border-[#1e381e] rounded-xl p-5 shadow-lg flex flex-col h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#183019]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Habit Tracker Diário</h3>
            <p className="text-[11px] text-slate-400">Hábitos e disciplina diária</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
            {completedCount} / {habits.length} ({progressPercent}%)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#122414] h-2 rounded-full mt-4 overflow-hidden border border-[#1e381e]">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Habit List */}
      <div className="flex-1 mt-4 space-y-2 overflow-y-auto max-h-[300px] pr-1">
        {habits.map((habit) => (
          <div
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className={`group flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${
              habit.completed
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-[#102012] border-[#1b361d] text-slate-200 hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center gap-3">
              {habit.completed ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <Circle size={18} className="text-slate-500 group-hover:text-emerald-400 shrink-0 transition" />
              )}
              <span className={`text-xs font-medium ${habit.completed ? "line-through text-emerald-400/70" : ""}`}>
                {habit.title}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteHabit(habit.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
              title="Excluir hábito"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Habit Form / Button */}
      <div className="mt-4 pt-3 border-t border-[#183019]">
        {isAdding ? (
          <form onSubmit={handleAddHabit} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Novo hábito diario..."
              className="flex-1 bg-[#122414] border border-[#234725] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2 py-2 text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#122414] hover:bg-[#1a331c] text-emerald-400 border border-[#204022] text-xs font-semibold transition"
          >
            <Plus size={14} />
            <span>Adicionar Novo Hábito</span>
          </button>
        )}
      </div>
    </div>
  );
}
