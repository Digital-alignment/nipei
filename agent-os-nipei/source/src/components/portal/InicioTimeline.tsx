"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  User,
  Building2,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
  Check,
} from "lucide-react";
import { OrbData, FlowStepItem } from "./OrbItem";

interface InicioTimelineProps {
  orbs: OrbData[];
  onToggleStep: (orbId: string, stepId: string) => void;
  timeStr: string;
}

export default function InicioTimeline({ orbs, onToggleStep, timeStr }: InicioTimelineProps) {
  // Find current active orb (status: "en_curso" or first non-completed orb)
  const activeOrb =
    orbs.find((o) => o.status === "en_curso") ||
    orbs.find((o) => o.status === "pendiente") ||
    orbs[0];

  // Find active step inside active orb
  const activeStep =
    activeOrb?.flowSteps.find((s) => !s.completed) || activeOrb?.flowSteps[0];

  // Group all Orbs chronologically by phase & timeframe
  const sortedOrbs = [...orbs].sort((a, b) => {
    const timeA = a.timeframe.split(" - ")[0] || "00:00";
    const timeB = b.timeframe.split(" - ")[0] || "00:00";
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO CARD: ACTIVIDAD ACTIVA EN EL PRESENTE (Inspirada en Imagen 1)
         ───────────────────────────────────────────────────────────── */}
      {activeOrb && (
        <section
          className="relative w-full rounded-3xl p-6 sm:p-8 backdrop-blur-2xl border overflow-hidden shadow-2xl transition-all duration-500"
          style={{
            backgroundColor: "#070a0f",
            borderColor: activeOrb.colorTheme.border,
            boxShadow: `0 20px 50px -15px ${activeOrb.colorTheme.glow}`,
          }}
        >
          {/* Ambient Glow Background */}
          <div
            className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: activeOrb.colorTheme.primary }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left Content: Active State Header & Info */}
            <div className="space-y-3 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {/* Live Pulse Badge */}
                <span className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-mono font-bold text-xs flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>ACTIVIDAD ACTIVA AHORA ({timeStr})</span>
                </span>

                {/* Scope Badge (Personal vs Empresa) */}
                <span
                  className={`px-3 py-1 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${
                    activeOrb.scope === "personal"
                      ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                      : "bg-blue-950/80 border-blue-500/40 text-blue-300"
                  }`}
                >
                  {activeOrb.scope === "personal" ? (
                    <>
                      <User size={12} />
                      <span>Origen: PERSONAL</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={12} />
                      <span>Origen: EMPRESA</span>
                    </>
                  )}
                </span>
              </div>

              {/* Parent Orb Title */}
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Orbe: <span className="text-white font-bold">{activeOrb.title}</span> ({activeOrb.timeframe})
              </div>

              {/* Current Active Task Title */}
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
                <Flame size={24} className="text-amber-400 shrink-0" />
                <span>{activeStep?.step || "En ejecución de rutina diaria"}</span>
              </h2>

              <p className="text-xs text-slate-300 max-w-xl">
                {activeOrb.description}
              </p>

              {/* Active Methodologies */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                {activeOrb.methodologies.map((m, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-slate-300"
                  >
                    ⚡ {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Side: Glowing Sphere Ring Progress */}
            <div className="shrink-0 flex flex-col items-center justify-center">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center relative shadow-2xl transition-transform duration-500 hover:scale-105"
                style={{
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${activeOrb.colorTheme.primary} 60%, rgba(0,0,0,0.9))`,
                  boxShadow: `0 0 50px ${activeOrb.colorTheme.glow}, inset 0 0 25px rgba(255,255,255,0.3)`,
                }}
              >
                <div className="text-center text-white drop-shadow-md">
                  <Sparkles size={24} className="animate-spin-slow opacity-90 mx-auto" />
                  <span className="text-base font-black tracking-tighter block mt-1">
                    {activeOrb.progressPercent}%
                  </span>
                  <span className="text-[9px] font-mono uppercase text-slate-300">
                    Completado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TIMELINE VERTICAL PASO A PASO DEL DÍA (Inspirada en Imagen 3)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Guía Paso a Paso — Cronograma Integrado del Día
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Mapeo unificado de tareas (Personal & Empresa)
          </span>
        </div>

        {/* Vertical Timeline Rail */}
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-cyan-500 before:to-pink-500">
          {sortedOrbs.map((orb) => {
            const isCompleted = orb.status === "concluido";
            const isInProgress = orb.status === "en_curso";

            return (
              <div key={orb.id} className="relative group">
                {/* Node Circle on Timeline Rail */}
                <div
                  className={`absolute -left-6 sm:-left-10 top-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform duration-300 group-hover:scale-110 ${
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

                {/* Orb Phase Task Card */}
                <div
                  className="bg-[#0a0e17]/90 border rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4 transition-all duration-300 hover:border-slate-500"
                  style={{ borderColor: orb.colorTheme.border }}
                >
                  {/* Card Top: Time, Origin Badge, Title */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
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

                    {/* Category Tag */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                      {orb.phaseCategory}
                    </span>
                  </div>

                  {/* Parent Orb Title & Subtitle */}
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Orbe: {orb.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {orb.subtitle}
                    </p>
                  </div>

                  {/* Steps Checklist for this Orb */}
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
