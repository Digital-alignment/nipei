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
} from "lucide-react";
import { OrbData } from "./OrbItem";

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
          1. HERO CARD: ACTIVIDAD ACTIVA EN EL PRESENTE (DISEÑO MEJORADO)
         ───────────────────────────────────────────────────────────── */}
      {activeOrb && (
        <section
          className="relative w-full rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            backgroundColor: "#070c14",
            borderColor: activeOrb.colorTheme.border,
            boxShadow: `0 20px 60px -15px ${activeOrb.colorTheme.glow}`,
          }}
        >
          {/* Ambient Multi-Stop Radial Aura */}
          <div
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: activeOrb.colorTheme.primary }}
          />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none bg-cyan-500" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left Column: Active Badges, Title & Methodologies */}
            <div className="space-y-3.5 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                {/* Live Activity Pulse Badge */}
                <span className="px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-mono font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>ACTIVIDAD ACTIVA AHORA ({timeStr})</span>
                </span>

                {/* Scope Origin Badge */}
                <span
                  className={`px-3.5 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${
                    activeOrb.scope === "personal"
                      ? "bg-emerald-950/90 border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-blue-950/90 border-blue-400/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  }`}
                >
                  {activeOrb.scope === "personal" ? (
                    <>
                      <User size={13} />
                      <span>Origen: PERSONAL</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={13} />
                      <span>Origen: EMPRESA</span>
                    </>
                  )}
                </span>
              </div>

              {/* Parent Orb Context */}
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Orbe de Procedencia:{" "}
                <span className="text-white font-bold">{activeOrb.title}</span> (
                {activeOrb.timeframe})
              </div>

              {/* Active Task Main Title */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
                <Flame size={28} className="text-amber-400 shrink-0 animate-pulse" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
                  {activeStep?.step || "Ejecutando tareas del Orbe activo"}
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl">
                {activeOrb.description}
              </p>

              {/* Active Methodologies Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {activeOrb.methodologies.map((m, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono font-semibold px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-slate-200 shadow-sm"
                  >
                    ⚡ {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: 3D Holographic Sphere */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center relative shadow-2xl transition-transform duration-500 hover:scale-105"
                style={{
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${activeOrb.colorTheme.primary} 60%, rgba(0,0,0,0.95))`,
                  boxShadow: `0 0 60px ${activeOrb.colorTheme.glow}, inset 0 0 30px rgba(255,255,255,0.35)`,
                }}
              >
                <div className="text-center text-white drop-shadow-lg">
                  <Sparkles size={28} className="animate-spin-slow opacity-90 mx-auto text-amber-200" />
                  <span className="text-lg font-black tracking-tighter block mt-1">
                    {activeOrb.progressPercent}%
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-slate-200">
                    COMPLETADO
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TIMELINE PASO A PASO CON COLAPSO AUTOMÁTICO (COMPLETADOS & PENDIENTES)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4]" />
            <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              Guía Paso a Paso — Cronograma Integrado del Día
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
            Orbes completados y futuros colapsados automáticamente
          </span>
        </div>

        {/* Timeline Rail */}
        <div className="relative pl-6 sm:pl-10 space-y-6 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-cyan-500 before:to-pink-500">
          {sortedOrbs.map((orb) => {
            const isCompleted = orb.status === "concluido";
            const isInProgress = orb.status === "en_curso";
            const isCollapsed = collapsedSet[orb.id] ?? false;

            return (
              <div key={orb.id} className="relative group">
                {/* Node Icon on Timeline Rail */}
                <div
                  onClick={() => toggleCollapse(orb.id)}
                  className={`absolute -left-6 sm:-left-10 top-3.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-transform duration-300 group-hover:scale-110 ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_#10b981]"
                      : isInProgress
                      ? "bg-cyan-500 border-cyan-400 text-black animate-pulse shadow-[0_0_15px_#06b6d4]"
                      : "bg-[#0b1017] border-slate-600 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} />
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
                    className="bg-[#0a0e17]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-md cursor-pointer hover:border-slate-400 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Origin Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          orb.scope === "personal"
                            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                            : "bg-blue-950/80 border-blue-500/40 text-blue-300"
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
                      <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        <span>{orb.timeframe}</span>
                      </span>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        Orbe: {orb.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Summary Tag */}
                      {isCompleted ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30">
                          ✓ 100% CONCLUÍDO
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30">
                          ⏳ PENDIENTE
                        </span>
                      )}

                      <button className="p-1 text-slate-400 hover:text-white transition">
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ─── CASE B: EXPANDED VIEW (Orbe Activo o Expandido Manualmente) ─── */
                  <div
                    className="bg-[#0a0e17]/95 border rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4 transition-all duration-300"
                    style={{ borderColor: orb.colorTheme.border }}
                  >
                    {/* Card Top Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Origin Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                            orb.scope === "personal"
                              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                              : "bg-blue-950/80 border-blue-500/40 text-blue-300"
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
                        <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>{orb.timeframe}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {orb.phaseCategory}
                        </span>

                        {/* Collapse Button */}
                        <button
                          onClick={() => toggleCollapse(orb.id)}
                          className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition"
                          title="Colapsar Orbe"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Orbe: {orb.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {orb.subtitle}
                      </p>
                    </div>

                    {/* Tasks Checklist */}
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Pasos & Tareas del Orbe:
                      </h4>
                      {orb.flowSteps.map((step) => (
                        <div
                          key={step.id}
                          onClick={() => onToggleStep(orb.id, step.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            step.completed
                              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                              : "bg-white/5 border-white/5 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                step.completed
                                  ? "bg-emerald-500 border-emerald-400 text-black"
                                  : "border-slate-500"
                              }`}
                            >
                              {step.completed && <CheckCircle2 size={12} />}
                            </div>
                            <span className="text-xs font-medium">{step.step}</span>
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                            {step.methodologyTag}
                          </span>
                        </div>
                      ))}
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
