"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  User,
  Building2,
  Sparkles,
  Flame,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Bot,
  Zap,
} from "lucide-react";
import OrbItem, { OrbData, StandaloneOrbSphere } from "./OrbItem";

interface InicioTimelineProps {
  orbs: OrbData[];
  onToggleStep: (orbId: string, stepId: string) => void;
  timeStr: string;
}

export default function InicioTimeline({ orbs, onToggleStep, timeStr }: InicioTimelineProps) {
  // Find active orb ("en_curso" or first pending)
  const activeOrb =
    orbs.find((o) => o.status === "en_curso") ||
    orbs.find((o) => o.status === "pendiente") ||
    orbs[0];

  // Find active task step inside active orb
  const activeStep =
    activeOrb?.flowSteps.find((s) => !s.completed) || activeOrb?.flowSteps[0];

  // Group all Orbs chronologically by phase & timeframe
  const sortedOrbs = [...orbs].sort((a, b) => {
    const timeA = a.timeframe.split(" - ")[0] || "00:00";
    const timeB = b.timeframe.split(" - ")[0] || "00:00";
    return timeA.localeCompare(timeB);
  });

  // State for manual collapse/expand overrides
  // Initial state: "en_curso" is expanded (NOT in collapsedSet), completed and pending are collapsed (IN collapsedSet)
  const [collapsedSet, setCollapsedSet] = useState<Record<string, boolean>>(() => {
    const initialMap: Record<string, boolean> = {};
    orbs.forEach((o) => {
      if (o.status === "concluido" || o.status === "pendiente") {
        initialMap[o.id] = true; // collapsed
      } else {
        initialMap[o.id] = false; // expanded
      }
    });
    return initialMap;
  });

  const toggleCollapse = (orbId: string) => {
    setCollapsedSet((prev) => ({
      ...prev,
      [orbId]: !prev[orbId],
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO CARD: ACTIVIDAD ACTIVA EN EL PRESENTE (UI REDISEÑADA)
         ───────────────────────────────────────────────────────────── */}
      {activeOrb && (
        <section className="relative w-full rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-[#0a0f18]/80 border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-500">
          {/* Ambient Multi-Stop Radial Aura */}
          <div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: activeOrb.colorTheme.primary }}
          />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none bg-cyan-500" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Left Column: Active Badges, Title & Methodologies */}
            <div className="space-y-3.5 text-center md:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                {/* Live Activity Pulse Badge */}
                <span className="px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-space-mono font-medium text-xs flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span>ACTIVIDAD ACTIVA AHORA ({timeStr})</span>
                </span>

                {/* Scope Origin Badge */}
                <span
                  className={`px-3.5 py-1 rounded-full border text-xs font-space-mono font-medium flex items-center gap-1.5 ${
                    activeOrb.scope === "personal"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm"
                      : "bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-sm"
                  }`}
                >
                  {activeOrb.scope === "personal" ? (
                    <>
                      <User size={13} className="shrink-0" />
                      <span>PERSONAL</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={13} className="shrink-0" />
                      <span>EMPRESA</span>
                    </>
                  )}
                </span>
              </div>

              {/* Parent Orb Context */}
              <div className="text-xs font-space-mono uppercase tracking-wider text-slate-400 truncate">
                Orbe: <span className="text-white font-semibold font-google-sans">{activeOrb.title}</span> (
                <span className="font-alata">{activeOrb.timeframe}</span>)
              </div>

              {/* Active Task Main Title */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-3 font-google-sans">
                <Flame size={26} className="text-amber-400 shrink-0 animate-pulse" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200 leading-tight">
                  {activeStep?.step || "Ejecutando tareas del Orbe activo"}
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl font-google-sans">
                {activeOrb.description}
              </p>

              {/* Active Methodologies Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {activeOrb.methodologies.map((m, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-space-mono font-medium px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200 shadow-sm"
                  >
                    ⚡ {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Pure 3D Holographic Sphere */}
            <div className="shrink-0 flex flex-col items-center justify-center pt-2 md:pt-0">
              <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
                <StandaloneOrbSphere
                  interactive={true}
                  primaryColor={activeOrb.colorTheme.primary}
                  glowColor={activeOrb.colorTheme.glow}
                />
              </div>
              <span className="text-xs font-alata font-bold text-cyan-300 mt-2 bg-cyan-500/15 px-3.5 py-1 rounded-full border border-cyan-400/30 shadow-sm">
                {activeOrb.progressPercent}% CONCLUÍDO
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. RIEL DE TIMELINE INTEGRADO DEL DÍA (DISEÑO FUTURISTA)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight uppercase font-space-mono">
                Riel de Timeline Integrado del Día
              </h2>
              <p className="text-xs text-slate-400 font-google-sans">
                Cronograma ordenado por horas • Colapso inteligente automático
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Spine Container */}
        <div className="relative pl-6 sm:pl-10 space-y-5 before:absolute before:left-3 sm:before:left-4.5 before:top-4 before:bottom-4 before:w-0.5 sm:before:w-1 before:rounded-full before:bg-gradient-to-b before:from-emerald-500 before:via-cyan-500 before:to-purple-600 before:shadow-[0_0_12px_rgba(6,182,212,0.4)]">
          {sortedOrbs.map((orb) => {
            const isCompleted = orb.status === "concluido";
            const isInProgress = orb.status === "en_curso";
            const isCollapsed = collapsedSet[orb.id] ?? false;
            const completedStepCount = orb.flowSteps.filter((s) => s.completed).length;

            return (
              <div key={orb.id} className="relative group">
                {/* Node Dot Icon on Vertical Timeline Spine */}
                <div
                  onClick={() => toggleCollapse(orb.id)}
                  className={`absolute -left-6 sm:-left-10 top-3.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 z-10 ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-300 text-black shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-100 hover:scale-110"
                      : isInProgress
                      ? "bg-cyan-500 border-cyan-300 text-black animate-pulse shadow-[0_0_25px_rgba(6,182,212,0.8)] scale-110"
                      : "bg-[#090d16] border-slate-700 text-slate-400 hover:border-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isInProgress ? (
                    <PlayCircle size={14} />
                  ) : (
                    <Clock size={12} />
                  )}
                </div>

                {/* ─── CASE A: COLLAPSED VIEW (Completados o Futuros) ─── */}
                {isCollapsed ? (
                  <div
                    onClick={() => toggleCollapse(orb.id)}
                    className="bg-[#080c14]/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl shadow-lg cursor-pointer hover:border-slate-400 hover:bg-[#0a0f1c] transition duration-300 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                  >
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      {/* Origin Badge */}
                      <span
                        className={`text-[9px] sm:text-[10px] font-space-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          orb.scope === "personal"
                            ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
                            : "bg-blue-950/90 border-blue-500/50 text-blue-300"
                        }`}
                      >
                        {orb.scope === "personal" ? (
                          <>
                            <User size={10} />
                            <span>PERSONAL</span>
                          </>
                        ) : (
                          <>
                            <Building2 size={10} />
                            <span>EMPRESA</span>
                          </>
                        )}
                      </span>

                      {/* Timeframe */}
                      <span className="text-[11px] sm:text-xs font-alata font-bold text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 border border-white/10">
                        <Clock size={11} className="text-cyan-400" />
                        <span>{orb.timeframe}</span>
                      </span>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight font-google-sans truncate">
                        {orb.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                      {/* Active Agents Badges */}
                      {orb.activeAgents && orb.activeAgents.length > 0 && (
                        <div className="hidden md:flex items-center gap-1">
                          {orb.activeAgents.map((ag, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[9px] font-space-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1"
                            >
                              <Bot size={10} />
                              <span>{ag}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Status Summary Pill */}
                      {isCompleted ? (
                        <span className="text-[10px] font-alata font-extrabold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={11} />
                          <span>100% CONCLUÍDO</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-alata font-semibold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 flex items-center gap-1">
                          <Layers size={11} />
                          <span>{completedStepCount}/{orb.flowSteps.length} PASOS</span>
                        </span>
                      )}

                      <button className="p-1 text-slate-400 group-hover:text-white transition">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─── CASE B: EXPANDED VIEW (Orbe Activo o Expandido Manualmente) ─── */
                  <div
                    className="bg-[#080d18]/95 border rounded-2xl p-5 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-5 transition-all duration-300"
                    style={{
                      borderColor: orb.colorTheme.border,
                      boxShadow: `0 15px 40px -10px ${orb.colorTheme.glow}`,
                    }}
                  >
                    {/* Card Top Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Origin Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                            orb.scope === "personal"
                              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
                              : "bg-blue-950/90 border-blue-500/50 text-blue-300"
                          }`}
                        >
                          {orb.scope === "personal" ? (
                            <>
                              <User size={11} />
                              <span>PERSONAL</span>
                            </>
                          ) : (
                            <>
                              <Building2 size={11} />
                              <span>EMPRESA</span>
                            </>
                          )}
                        </span>

                        {/* Timeframe */}
                        <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 border border-white/10">
                          <Clock size={12} className="text-cyan-400" />
                          <span>{orb.timeframe}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white/10 border border-white/15 text-slate-300">
                          {orb.phaseCategory}
                        </span>

                        {/* Collapse Button */}
                        <button
                          onClick={() => toggleCollapse(orb.id)}
                          className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition"
                          title="Colapsar Orbe"
                        >
                          <ChevronUp size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>{orb.title}</span>
                      </h3>
                      <p className="text-xs text-slate-300/90 leading-relaxed">
                        {orb.subtitle}
                      </p>
                    </div>

                    {/* Outer Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400">Porcentaje de Ejecución</span>
                        <span className="font-bold text-emerald-300">{orb.progressPercent}% CONCLUÍDO</span>
                      </div>
                      <div className="w-full h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          style={{ width: `${orb.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Active Agents & Methodologies Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {orb.activeAgents?.map((ag, aIdx) => (
                        <span
                          key={aIdx}
                          className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 flex items-center gap-1"
                        >
                          <Bot size={11} />
                          <span>{ag}</span>
                        </span>
                      ))}

                      {orb.methodologies.map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1"
                        >
                          <Zap size={10} className="text-amber-400" />
                          <span>{m}</span>
                        </span>
                      ))}
                    </div>

                    {/* Tasks Checklist */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Pasos del Flujo ({completedStepCount}/{orb.flowSteps.length}):
                      </h4>
                      <div className="space-y-2">
                        {orb.flowSteps.map((step) => (
                          <div
                            key={step.id}
                            onClick={() => onToggleStep(orb.id, step.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                              step.completed
                                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-sm"
                                : "bg-white/5 border-white/10 text-slate-200 hover:border-slate-400 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  step.completed
                                    ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    : "border-slate-500 bg-black/40"
                                }`}
                              >
                                {step.completed && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className={`text-xs font-medium ${step.completed ? "line-through opacity-80" : ""}`}>
                                {step.step}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-black/50 text-slate-300 border border-white/10">
                              ⚡ {step.methodologyTag}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

