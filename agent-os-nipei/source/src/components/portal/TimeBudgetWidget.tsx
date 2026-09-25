"use client";

import React from "react";
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, Sliders, Zap, Sparkles } from "lucide-react";
import { OrbData } from "./OrbItem";
import { TimeConfigSettings } from "./TimeConfigModal";

interface TimeBudgetWidgetProps {
  orbs: OrbData[];
  settings: TimeConfigSettings;
  onOpenConfig: () => void;
}

// Calculate duration in minutes from timeframe string like "08:30 - 11:30" or default to 90 min
export function getOrbTimeframeMinutes(timeframe: string): number {
  if (!timeframe.includes(" - ")) return 90; // Default area of life or non-timed orb
  const [start, end] = timeframe.split(" - ");
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  if (isNaN(sH) || isNaN(eH)) return 90;
  let startMin = sH * 60 + (sM || 0);
  let endMin = eH * 60 + (eM || 0);
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

// Estimate total minutes of tasks inside an orb (default 30 min per step if unassigned)
export function getOrbTasksMinutes(orb: OrbData): number {
  return orb.flowSteps.length * 35; // Average 35 minutes per task step
}

export default function TimeBudgetWidget({
  orbs,
  settings,
  onOpenConfig,
}: TimeBudgetWidgetProps) {
  // Calculate total waking minutes from settings
  const [wH, wM] = settings.wakeTime.split(":").map(Number);
  const [sH, sM] = settings.sleepTime.split(":").map(Number);
  let wakeMin = wH * 60 + (wM || 0);
  let sleepMin = sH * 60 + (sM || 0);
  if (sleepMin <= wakeMin) sleepMin += 24 * 60;
  const totalWakingMin = sleepMin - wakeMin;

  // Allocated minutes per scope
  const personalOrbs = orbs.filter((o) => o.scope === "personal");
  const empresaOrbs = orbs.filter((o) => o.scope === "empresa");

  const personalMinAllocated = personalOrbs.reduce((acc, o) => acc + getOrbTasksMinutes(o), 0);
  const empresaMinAllocated = empresaOrbs.reduce((acc, o) => acc + getOrbTasksMinutes(o), 0);
  const totalAllocatedMin = personalMinAllocated + empresaMinAllocated;

  const bufferMin = totalWakingMin - totalAllocatedMin;

  const isDayOverloaded = totalAllocatedMin > totalWakingMin;
  const isEmpresaOverloaded = empresaMinAllocated > settings.maxWorkHours * 60;
  const isPersonalOverloaded = personalMinAllocated > settings.maxPersonalHours * 60;

  // Find individual Orbs where task duration exceeds timeframe duration
  const overloadedOrbs = orbs.filter((o) => {
    const timeframeMin = getOrbTimeframeMinutes(o.timeframe);
    const tasksMin = getOrbTasksMinutes(o);
    return tasksMin > timeframeMin;
  });

  return (
    <div className="w-full bg-[#080d17]/95 border border-slate-800 rounded-3xl p-5 backdrop-blur-xl shadow-2xl space-y-4">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-md ${
              isDayOverloaded
                ? "bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse"
                : "bg-cyan-950/80 border-cyan-500/40 text-cyan-300"
            }`}
          >
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Control de Capacidad & Presupuesto de Tiempo</span>
              {isDayOverloaded ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/50 text-[10px] font-mono font-bold animate-pulse flex items-center gap-1">
                  <ShieldAlert size={10} /> 🔴 SOBRECARGA (+{Math.abs(bufferMin)} min)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} /> 🟢 EQUILIBRADO (+{bufferMin} min libres)
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Despierto: {settings.wakeTime} hs a {settings.sleepTime} hs ({Math.round(totalWakingMin / 60)}h total)
            </p>
          </div>
        </div>

        {/* Config Button */}
        <button
          onClick={onOpenConfig}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition flex items-center gap-1.5"
        >
          <Sliders size={13} />
          <span>Ajustar Tiempo</span>
        </button>
      </div>

      {/* Visual Capacity Bar Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-2">
            <span>Asignado: <strong className="text-white">{Math.round(totalAllocatedMin / 60)}h {totalAllocatedMin % 60}m</strong></span>
            <span>/</span>
            <span>Disponible: <strong className="text-white">{Math.round(totalWakingMin / 60)}h</strong></span>
          </span>
          <span className={`font-bold ${isDayOverloaded ? "text-rose-400" : "text-emerald-400"}`}>
            {Math.round((totalAllocatedMin / totalWakingMin) * 100)}% Capacidad Usada
          </span>
        </div>

        {/* Multi-Segment Capacity Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
          {/* Empresa Segment */}
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (empresaMinAllocated / totalWakingMin) * 100)}%` }}
            title={`Empresa: ${Math.round(empresaMinAllocated / 60)}h`}
          />
          {/* Personal Segment */}
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (personalMinAllocated / totalWakingMin) * 100)}%` }}
            title={`Personal: ${Math.round(personalMinAllocated / 60)}h`}
          />
          {/* Remaining / Buffer Segment */}
          {!isDayOverloaded && (
            <div
              className="h-full bg-slate-800 opacity-60 transition-all duration-500"
              style={{ width: `${Math.max(0, (bufferMin / totalWakingMin) * 100)}%` }}
              title={`Buffer libre: ${Math.round(bufferMin / 60)}h`}
            />
          )}
        </div>

        {/* Scope Breakdown Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Empresa: <strong>{Math.round(empresaMinAllocated / 60)}h</strong> {isEmpresaOverloaded && "⚠️ Max excedido"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Personal: <strong>{Math.round(personalMinAllocated / 60)}h</strong> {isPersonalOverloaded && "⚠️ Max excedido"}</span>
            </span>
          </div>

          <span className="text-slate-500">
            {isDayOverloaded
              ? `🔴 Faltan ${Math.abs(bufferMin)} min en el día`
              : `🟢 Quedan ${bufferMin} min para imprevistos / descanso`}
          </span>
        </div>
      </div>

      {/* Overloaded Orbs Alert List (If any Orb has task overflow) */}
      {overloadedOrbs.length > 0 && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-300">
            <AlertTriangle size={14} />
            <span>Atención: {overloadedOrbs.length} Orbe(s) superan su ventana de tiempo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overloadedOrbs.map((o) => {
              const diff = getOrbTasksMinutes(o) - getOrbTimeframeMinutes(o.timeframe);
              return (
                <span
                  key={o.id}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold"
                >
                  ⚠️ {o.title}: +{diff} min acumulados
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
