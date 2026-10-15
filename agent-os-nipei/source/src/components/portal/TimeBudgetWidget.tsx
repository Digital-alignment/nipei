"use client";

import React, { useState } from "react";
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, Sliders, Zap, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { OrbData } from "./OrbItem";
import { TimeConfigSettings } from "./TimeConfigModal";
import { useLanguage } from "@/context/LanguageContext";

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

// Estimate total minutes of tasks inside an orb (default 35 min per step)
export function getOrbTasksMinutes(orb: OrbData): number {
  return orb.flowSteps.length * 35;
}

export default function TimeBudgetWidget({
  orbs,
  settings,
  onOpenConfig,
}: TimeBudgetWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { t } = useLanguage();

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

  // Find individual Orbs where task duration exceeds timeframe duration
  const overloadedOrbs = orbs.filter((o) => {
    const timeframeMin = getOrbTimeframeMinutes(o.timeframe);
    const tasksMin = getOrbTasksMinutes(o);
    return tasksMin > timeframeMin;
  });

  return (
    <div className="w-full bg-[#0a0f18]/80 border border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4 transition-all duration-300 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div
        className={`absolute -top-24 -left-24 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500 ${
          isDayOverloaded ? "bg-rose-500" : "bg-cyan-500"
        }`}
      />

      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors shrink-0 ${
              isDayOverloaded
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            }`}
          >
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white tracking-tight font-google-sans">
                {t.capacityTitle}
              </h3>
              {isDayOverloaded ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-space-mono font-medium flex items-center gap-1.5 shrink-0">
                  <ShieldAlert size={11} className="text-rose-400" />
                  <span>+<span className="font-alata">{Math.abs(bufferMin)}m</span> {t.overloaded}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-space-mono font-medium flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>+<span className="font-alata">{bufferMin}m</span> {t.available}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Config Button */}
          <button
            onClick={onOpenConfig}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-google-sans text-xs font-medium transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title={t.configureSchedule}
          >
            <Sliders size={13} className="text-slate-400" />
            <span className="hidden sm:inline">{t.configureSchedule}</span>
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10"
            title={isCollapsed ? "Expandir Presupuesto" : "Colapsar Presupuesto"}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded Body Content */}
      {!isCollapsed && (
        <div className="space-y-4 pt-1 animate-fade-in relative z-10">
          {/* Visual Capacity Bar Meter */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-google-sans">
              <span className="text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>Asignado: <strong className="text-white font-alata font-normal">{Math.round(totalAllocatedMin / 60)}h {totalAllocatedMin % 60}m</strong></span>
                <span className="text-slate-600">•</span>
                <span>Disponible: <strong className="text-slate-300 font-alata font-normal">{Math.round(totalWakingMin / 60)}h</strong></span>
              </span>
              <span className={`font-alata font-semibold text-xs sm:text-sm ${isDayOverloaded ? "text-rose-400" : "text-emerald-400"}`}>
                {Math.round((totalAllocatedMin / totalWakingMin) * 100)}% Capacidad Usada
              </span>
            </div>

            {/* Multi-Segment Capacity Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900/90 border border-white/5 overflow-hidden flex p-0.5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-l-full transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                style={{ width: `${Math.min(100, (empresaMinAllocated / totalWakingMin) * 100)}%` }}
                title={`Empresa: ${Math.round(empresaMinAllocated / 60)}h`}
              />
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                style={{ width: `${Math.min(100, (personalMinAllocated / totalWakingMin) * 100)}%` }}
                title={`Personal: ${Math.round(personalMinAllocated / 60)}h`}
              />
              {!isDayOverloaded && (
                <div
                  className="h-full bg-slate-800/40 rounded-r-full transition-all duration-500"
                  style={{ width: `${Math.max(0, (bufferMin / totalWakingMin) * 100)}%` }}
                  title={`Buffer libre: ${Math.round(bufferMin / 60)}h`}
                />
              )}
            </div>

            {/* Scope Breakdown Legend */}
            <div className="flex flex-wrap items-center justify-between text-xs font-google-sans text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
                  <span>Empresa: <strong className="text-white font-alata font-normal">{Math.round(empresaMinAllocated / 60)}h</strong></span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  <span>Personal: <strong className="text-white font-alata font-normal">{Math.round(personalMinAllocated / 60)}h</strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Overloaded Orbs Alert Drawer */}
          {overloadedOrbs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#160a10]/70 border border-rose-500/20 text-xs space-y-2.5 shadow-sm">
              <div className="font-medium text-rose-300 flex items-center justify-between font-google-sans">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Atención: <strong className="font-alata text-white">{overloadedOrbs.length}</strong> Orbes superan su ventana de tiempo</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {overloadedOrbs.map((o) => {
                  const tfMin = getOrbTimeframeMinutes(o.timeframe);
                  const tkMin = getOrbTasksMinutes(o);
                  const diff = tkMin - tfMin;
                  return (
                    <span
                      key={o.id}
                      className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-google-sans flex items-center gap-1.5"
                    >
                      <span className="text-slate-300">{o.title}</span>
                      <span className="text-rose-400 font-alata">+{diff}m</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
