"use client";

import React, { useState } from "react";
import {
  Flame,
  Award,
  TrendingUp,
  Clock,
  Check,
  CheckCircle2,
  Calendar,
  Grid,
  ChevronRight,
  Sparkles,
  BarChart2,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { OrbData } from "./OrbItem";

interface GlobalActivityMatrixProps {
  orbs: OrbData[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

// Generate realistic historical daily activity for the past 35 days based on orb ID
function generateOrbHistory(orbId: string, daysCount: number = 35) {
  const result: { dateStr: string; dayName: string; dayNum: number; completed: boolean; percent: number }[] = [];
  const today = new Date();
  
  // Seed pseudo-random state deterministically per orbId
  let seed = 0;
  for (let i = 0; i < orbId.length; i++) seed += orbId.charCodeAt(i);

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    
    // Day 0 is today, past days use deterministic pseudo-random completion pattern
    const pseudoVal = (seed * (i + 1) * 37) % 100;
    // Higher probability of completion for a nice realistic streak
    const completed = i === 0 ? false : pseudoVal > 25;
    const percent = completed ? 100 : (pseudoVal > 50 ? 50 : 0);

    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    result.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      completed,
      percent,
    });
  }
  return result;
}

export default function GlobalActivityMatrix({
  orbs,
  selectedDate,
  onSelectDate,
}: GlobalActivityMatrixProps) {
  const [viewMode, setViewMode] = useState<"semana" | "mes" | "heatmap">("semana");
  const [scopeFilter, setScopeFilter] = useState<"todos" | "personal" | "empresa">("todos");

  // Filter Orbs based on scope filter
  const filteredOrbs = orbs.filter((o) => {
    if (scopeFilter === "todos") return true;
    return o.scope === scopeFilter;
  });

  // Top KPIs calculations
  const totalOrbsCount = orbs.length;
  const completedOrbsCount = orbs.filter((o) => o.status === "concluido").length;
  const todayPercent = Math.round((completedOrbsCount / (totalOrbsCount || 1)) * 100);

  // Generate week days (last 7 days ending today or around selected date)
  const historyDays35 = generateOrbHistory("global_system", 35);
  const weekDays7 = historyDays35.slice(-7);

  // Calculate simulated streak
  const streakDays = 14;
  const monthlyConsistency = 88;

  return (
    <section className="w-full space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TOP KPI CARDS (INSPIRED BY REFERENCE IMAGES 2 & 4)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 font-google-sans">
            <ActivityIcon size={20} className="text-emerald-400 shrink-0" />
            <span>Matriz de Actividad & Consistencia Global</span>
          </h2>
          <p className="text-xs text-slate-400 font-google-sans">
            Seguimiento longitudinal de la ejecución de Orbes en Personal y Empresa
          </p>
        </div>

        {/* View Mode Pill Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode("semana")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-space-mono transition-all ${
              viewMode === "semana"
                ? "bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setViewMode("mes")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-space-mono transition-all ${
              viewMode === "mes"
                ? "bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-space-mono transition-all ${
              viewMode === "heatmap"
                ? "bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Heatmap 30D
          </button>
        </div>
      </div>

      {/* 4 TOP STAT CARDS (2x2 GRID IN SIDEBAR TO PREVENT SQUISHING) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Streak */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a0f16]/90 border border-orange-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 font-space-mono">
            <span className="text-[10px] sm:text-xs">RACHA ACTIVA</span>
            <Flame size={15} className="text-orange-400 animate-bounce shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-white font-alata tracking-tight">
              {streakDays}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-orange-400 uppercase font-google-sans">Días seguidos</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 font-google-sans">Mejor racha: 21d</p>
        </div>

        {/* Card 2: Consistencia Mensual */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a0f16]/90 border border-emerald-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 font-space-mono">
            <span className="text-[10px] sm:text-xs">CONSISTENCIA</span>
            <Award size={15} className="text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-white font-alata tracking-tight">
              {monthlyConsistency}%
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 font-google-sans">Meta 30D</span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${monthlyConsistency}%` }} />
          </div>
        </div>

        {/* Card 3: Orbes Completados Hoy */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a0f16]/90 border border-cyan-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 font-space-mono">
            <span className="text-[10px] sm:text-xs">HOY (PRESENTE)</span>
            <CheckCircle2 size={15} className="text-cyan-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-white font-alata tracking-tight">
              {completedOrbsCount}/{totalOrbsCount}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-cyan-400 font-alata">Orbes ({todayPercent}%)</span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${todayPercent}%` }} />
          </div>
        </div>

        {/* Card 4: Tiempo de Foco */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0a0f16]/90 border border-purple-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 font-space-mono">
            <span className="text-[10px] sm:text-xs">DEEP WORK</span>
            <Clock size={15} className="text-purple-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-white font-alata tracking-tight">
              18.5
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-purple-400 font-google-sans">hrs / semana</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 font-google-sans">Meta: 20 hrs</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SCOPE FILTER & BREAKDOWN TABLE (IMAGE 3 & 4 HABIT ROWS)
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#070b12]/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Grid size={16} className="text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight font-google-sans">
              Desglose de Orbes & Registro Semanal
            </h3>
          </div>

          {/* Scope Filter Buttons */}
          <div className="flex items-center gap-1.5 text-xs font-space-mono">
            <span className="text-slate-500 flex items-center gap-1 mr-1 text-[10px]">
              <Filter size={11} /> Ámbito:
            </span>
            <button
              onClick={() => setScopeFilter("todos")}
              className={`px-2 py-0.5 rounded-full transition text-[10px] ${
                scopeFilter === "todos"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-black/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setScopeFilter("personal")}
              className={`px-2 py-0.5 rounded-full transition text-[10px] ${
                scopeFilter === "personal"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold"
                  : "bg-black/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setScopeFilter("empresa")}
              className={`px-2 py-0.5 rounded-full transition text-[10px] ${
                scopeFilter === "empresa"
                  ? "bg-blue-950 text-blue-300 border border-blue-500/50 font-bold"
                  : "bg-black/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              Empresa
            </button>
          </div>
        </div>

        {/* ORB ROWS */}
        <div className="space-y-3">
          {filteredOrbs.map((orb) => {
            const history = generateOrbHistory(orb.id, 7);
            const orbStreak = (orb.id.length * 3) % 12 + 4;

            return (
              <div
                key={orb.id}
                className="p-3.5 rounded-2xl bg-black/40 border border-slate-800/80 hover:border-slate-700 transition flex flex-col gap-3 group"
              >
                {/* Top Row: Orb Title, Scope Badge & Streak/Progress */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-md"
                      style={{
                        backgroundColor: `${orb.colorTheme.primary}20`,
                        borderColor: orb.colorTheme.border,
                        boxShadow: `0 0 10px ${orb.colorTheme.glow}`,
                      }}
                    >
                      <Sparkles size={12} style={{ color: orb.colorTheme.primary }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors font-google-sans truncate">
                        {orb.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-space-mono text-slate-400">
                        <span
                          className={`px-1.5 py-0.2 rounded border ${
                            orb.scope === "personal"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-950/60 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {orb.scope.toUpperCase()}
                        </span>
                        <span className="truncate">• {orb.timeframe}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Streak & Progress Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-300 font-space-mono text-[10px] font-bold flex items-center gap-1">
                      <Flame size={11} className="text-orange-400 fill-orange-400" />
                      <span className="font-alata">{orbStreak}d</span>
                    </span>

                    <div className="w-12 sm:w-14 flex flex-col items-end">
                      <span className="text-[10px] font-alata font-bold text-slate-200">
                        {orb.progressPercent}%
                      </span>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${orb.progressPercent}%`,
                            backgroundColor: orb.colorTheme.primary,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: 7-Day Matrix Strip (L M X J V S D) */}
                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/5 w-full">
                  {history.map((h, i) => {
                    const isSelectedDate = h.dateStr === selectedDate;
                    const isToday = i === 6;

                    return (
                      <button
                        key={h.dateStr}
                        onClick={() => onSelectDate(h.dateStr)}
                        title={`${h.dayName} ${h.dayNum}: ${
                          h.completed ? "Concluido (100%)" : "Incompleto"
                        }`}
                        className={`flex flex-col items-center gap-0.5 p-1 rounded-xl border transition-all flex-1 ${
                          isSelectedDate
                            ? "border-emerald-400 bg-emerald-500/20 scale-105"
                            : "border-slate-800/80 bg-black/40 hover:border-slate-600"
                        }`}
                      >
                        <span className="text-[8px] font-space-mono text-slate-400 uppercase">
                          {h.dayName}
                        </span>

                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-alata font-bold transition-all ${
                            h.completed
                              ? "bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : isToday
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-400/50"
                              : "bg-slate-800/80 text-slate-500 border border-slate-700/50"
                          }`}
                        >
                          {h.completed ? (
                            <Check size={11} strokeWidth={3} />
                          ) : (
                            <span>{h.dayNum}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. HEATMAP MATRIZ ANUAL / 30 DÍAS (INSPIRED BY IMAGE 1 & 4)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === "heatmap" && (
        <div className="p-6 rounded-3xl bg-[#070b12]/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 size={16} className="text-emerald-400" />
              <span>Matriz Anual de Contribución & Ejecución</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Últimos 35 días de actividad
            </span>
          </div>

          {/* Dot Matrix Heatmap Grid */}
          <div className="grid grid-cols-7 gap-2 pt-2">
            {historyDays35.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              let bgClass = "bg-slate-900 border-slate-800 text-slate-600";
              if (day.percent === 100) {
                bgClass =
                  "bg-emerald-500 border-emerald-400 text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]";
              } else if (day.percent >= 50) {
                bgClass = "bg-emerald-900/80 border-emerald-600/50 text-emerald-300";
              } else if (day.percent > 0) {
                bgClass = "bg-emerald-950/40 border-emerald-800/40 text-emerald-400";
              }

              return (
                <button
                  key={day.dateStr}
                  onClick={() => onSelectDate(day.dateStr)}
                  className={`aspect-square p-2 rounded-xl border flex flex-col items-center justify-center transition-all transform hover:scale-105 ${bgClass} ${
                    isSelected ? "ring-2 ring-white scale-105" : ""
                  }`}
                >
                  <span className="text-[9px] font-mono uppercase">{day.dayName}</span>
                  <span className="text-xs font-bold font-mono">{day.dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-slate-400 pt-2">
            <span>Menos</span>
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
            <span className="w-3 h-3 rounded bg-emerald-950/40 border border-emerald-800/40" />
            <span className="w-3 h-3 rounded bg-emerald-900/80 border border-emerald-600/50" />
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400" />
            <span>Más</span>
          </div>
        </div>
      )}
    </section>
  );
}

// Simple Helper Icon component
function ActivityIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
