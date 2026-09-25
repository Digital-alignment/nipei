"use client";

import React from "react";
import { CheckCircle2, Clock, PlayCircle, Layers, Sparkles, Lock, Flame, Check, AlertTriangle } from "lucide-react";

export interface FlowStepItem {
  id: string;
  step: string;
  completed: boolean;
  methodologyTag: string;
}

export interface OrbData {
  id: string;
  title: string;
  subtitle: string;
  timeframe: string;
  phaseCategory: string;
  scope: "personal" | "empresa";
  subCategory: string; // "flujo_diario" | "areas_vida" | "hobbies_filosofia" | "clientes_da" | "productos_propios" | "squads_infra"
  status: "concluido" | "en_curso" | "pendiente";
  progressPercent: number;
  methodologies: string[];
  activeAgents: string[];
  colorTheme: {
    primary: string;
    border: string;
    glow: string;
    gradient: string;
    badgeBg: string;
    badgeText: string;
  };
  iconName: string;
  description: string;
  flowSteps: FlowStepItem[];
  leadMeasure?: {
    label: string;
    current: number;
    target: number;
    unit: string;
  };
  notes?: string;
  isMandatory?: boolean; // Protected system Orbs
}

interface OrbItemProps {
  orb: OrbData;
  onClick: (orb: OrbData) => void;
  index: number;
}

// Generate simple mock 7-day completion history for orb card
function getOrbMiniHistory(orbId: string) {
  let seed = 0;
  for (let i = 0; i < orbId.length; i++) seed += orbId.charCodeAt(i);
  const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  return dayLabels.map((day, idx) => {
    const isCompleted = idx === 6 ? false : (seed * (idx + 1) * 19) % 100 > 30;
    return { day, isCompleted };
  });
}

// Time budget helper for individual orb
function getOrbTimeframeMinutes(timeframe: string): number {
  if (!timeframe.includes(" - ")) return 90;
  const [start, end] = timeframe.split(" - ");
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  if (isNaN(sH) || isNaN(eH)) return 90;
  let startMin = sH * 60 + (sM || 0);
  let endMin = eH * 60 + (eM || 0);
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

export default function OrbItem({ orb, onClick }: OrbItemProps) {
  const isCompleted = orb.status === "concluido";
  const isInProgress = orb.status === "en_curso";
  const miniHistory = getOrbMiniHistory(orb.id);
  const orbStreak = (orb.id.length * 3) % 12 + 4;

  // Time budget calculation for this specific Orb
  const timeframeMin = getOrbTimeframeMinutes(orb.timeframe);
  const tasksEstMin = orb.flowSteps.length * 35; // 35 min per task average
  const isTimeOverloaded = tasksEstMin > timeframeMin;
  const overloadDiffMin = tasksEstMin - timeframeMin;

  return (
    <div
      onClick={() => onClick(orb)}
      className={`group relative cursor-pointer select-none flex flex-col items-center justify-between p-5 rounded-3xl backdrop-blur-xl bg-[#090b10]/80 border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-2xl overflow-hidden min-h-[310px] ${
        isTimeOverloaded ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]" : ""
      }`}
      style={{
        borderColor: isTimeOverloaded ? undefined : orb.colorTheme.border,
        boxShadow: isTimeOverloaded ? undefined : `0 10px 30px -10px ${orb.colorTheme.glow}`,
      }}
    >
      {/* Background Radial Glow Effect */}
      <div
        className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"
        style={{ backgroundColor: isTimeOverloaded ? "#f43f5e" : orb.colorTheme.primary }}
      />

      {/* Mandatory Lock Icon if protected */}
      {orb.isMandatory && (
        <div
          className="absolute top-3 right-3 text-slate-400 opacity-60 group-hover:opacity-100 transition"
          title="Orbe Obligatorio Protegido por el Sistema"
        >
          <Lock size={13} />
        </div>
      )}

      {/* Overload Alert Badge on Top Left */}
      {isTimeOverloaded && (
        <div className="absolute top-3 left-3 z-20">
          <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-300 text-[9px] font-mono font-bold flex items-center gap-1 animate-pulse shadow-lg">
            <AlertTriangle size={10} />
            <span>+{overloadDiffMin}m EXCEDIDO</span>
          </span>
        </div>
      )}

      {/* Top Bar: Timeframe & Status Badge */}
      <div className={`w-full flex items-center justify-between z-10 text-[11px] font-mono pr-4 ${isTimeOverloaded ? "mt-4" : ""}`}>
        <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-slate-300 flex items-center gap-1.5">
          <Clock size={11} className="text-slate-400" />
          <span>{orb.timeframe}</span>
        </span>

        {/* Status Indicator */}
        {isCompleted && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>CONCLUÍDO</span>
          </span>
        )}
        {isInProgress && (
          <span className="px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1 animate-pulse">
            <PlayCircle size={12} className="text-cyan-400" />
            <span>EN CURSO ({orb.progressPercent}%)</span>
          </span>
        )}
        {!isCompleted && !isInProgress && (
          <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1">
            <Layers size={12} className="text-amber-400" />
            <span>PENDIENTE</span>
          </span>
        )}
      </div>

      {/* CENTRAL 3D GLOWING SPHERE / ORB UI */}
      <div className="relative my-3 flex flex-col items-center justify-center">
        {/* Outer Pulsing Aura Ring */}
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center relative transition-transform duration-500 group-hover:scale-110 ${
            isInProgress ? "animate-pulse" : ""
          }`}
          style={{
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${
              isTimeOverloaded ? "#f43f5e" : orb.colorTheme.primary
            } 60%, rgba(0,0,0,0.9))`,
            boxShadow: `0 0 40px ${
              isTimeOverloaded ? "rgba(244,63,94,0.4)" : orb.colorTheme.glow
            }, inset 0 0 20px rgba(255,255,255,0.3)`,
          }}
        >
          {/* Internal Liquid Sheen Ring */}
          <div className="absolute inset-1 rounded-full border border-white/30 pointer-events-none" />

          {/* Icon inside Sphere */}
          <div className="text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex flex-col items-center">
            <Sparkles size={28} className="animate-spin-slow opacity-90" />
            <span className="text-[10px] font-black tracking-widest mt-1 uppercase text-white/90">
              {orb.progressPercent}%
            </span>
          </div>

          {/* Circular Progress Ring Overlay */}
          <svg className="absolute -inset-2 w-32 h-32 transform -rotate-90 pointer-events-none">
            <circle
              cx="64"
              cy="64"
              r="58"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r="58"
              stroke={isTimeOverloaded ? "#f43f5e" : orb.colorTheme.primary}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray="364"
              strokeDashoffset={364 - (364 * orb.progressPercent) / 100}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
        </div>
      </div>

      {/* Bottom Info: Title & Subtitle */}
      <div className="w-full text-center z-10 space-y-1">
        <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5">
          <span>{orb.title}</span>
        </h3>
        <p className="text-xs text-slate-400 line-clamp-1">{orb.subtitle}</p>

        {/* Methodologies Badges */}
        <div className="pt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {orb.methodologies.map((m, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MINI WEEKLY USER ACTIVITY STRIP & STREAK (IMAGE 2, 3 & 4)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full mt-3 pt-2.5 border-t border-white/10 z-10 flex items-center justify-between gap-2">
        {/* Streak Flame Badge */}
        <span
          className="px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-300 font-mono text-[10px] font-bold flex items-center gap-1 shrink-0"
          title="Racha de constancia en este Orbe"
        >
          <Flame size={11} className="text-orange-400 fill-orange-400" />
          <span>{orbStreak}d</span>
        </span>

        {/* 7-Day Dot Matrix Pill Strip (L M X J V S D) */}
        <div className="flex items-center gap-1">
          {miniHistory.map((item, idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-bold transition-all ${
                item.isCompleted
                  ? "bg-emerald-500 text-black shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                  : idx === 6
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-400/50"
                  : "bg-slate-800/80 text-slate-500 border border-slate-700/50"
              }`}
              title={`Día ${item.day}: ${item.isCompleted ? "Completado" : "Pendiente"}`}
            >
              {item.isCompleted ? <Check size={10} strokeWidth={3} /> : item.day}
            </div>
          ))}
        </div>
      </div>

      {/* Hover CTA Hint */}
      <div className="w-full mt-2 text-[10px] font-mono text-center text-slate-400 group-hover:text-white transition flex items-center justify-center gap-1">
        <span>Click para ver dentro del Orbe</span>
        <span>→</span>
      </div>
    </div>
  );
}
