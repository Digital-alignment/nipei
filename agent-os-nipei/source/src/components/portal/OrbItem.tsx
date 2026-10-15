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

export interface OrbSettings {
  autoRotate?: boolean;
  rotationSpeed?: number;

  // Banda Curva Espectral Interna
  ribbonEnabled?: boolean;
  ribbonOpacity?: number;
  ribbonThickness?: number;
  curveShape?: "s-curve" | "helix" | "ring" | string;
  ribbonFlowSpeed?: number;

  // Acabado del Cristal & Lente
  roughness?: number;
  studioHighlights?: number;
  chromaticAberration?: number;

  // Resplandor & Borde
  glowIntensity?: number;
  dispersion?: number;
  rimColor?: string;
  fresnelPower?: number;
  spectrumPreset?: string;
  colorShift?: number;
  glassTintColor?: string;
  ior?: number;

  // Reflejo Cáustico del Suelo
  causticColor?: string;
  causticIntensity?: number;
  causticSize?: number;

  // Entorno
  starDensity?: number;
}

export interface OrbItemProps {
  orb?: OrbData;
  onClick?: (orb: OrbData) => void;
  index?: number;
  interactive?: boolean;
  settings?: OrbSettings;
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

/**
 * 3D Holographic Glass Sphere renderer component (Pure Sphere - No text or overlays inside)
 */
export function StandaloneOrbSphere({
  settings = {},
  interactive = true,
  primaryColor = "#34d399",
  glowColor = "rgba(52, 211, 153, 0.4)",
}: {
  settings?: OrbSettings;
  interactive?: boolean;
  primaryColor?: string;
  glowColor?: string;
  progressPercent?: number;
}) {
  const {
    roughness = 0.15,
    studioHighlights = 0,
    chromaticAberration = 0,
    glowIntensity = 1.3,
    rimColor = "#34d399",
    glassTintColor = "#071311",
    causticColor = "#10b981",
    causticIntensity = 0.1,
    causticSize = 1.5,
    ribbonEnabled = true,
    ribbonOpacity = 0.1,
    ribbonFlowSpeed = 1.9,
    autoRotate = false,
    starDensity = 0,
  } = settings;

  // Derive blur and reflection based on roughness
  const blurVal = Math.round(roughness * 12);
  const isChroma = chromaticAberration > 0;

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center ${interactive ? "group cursor-pointer select-none" : ""}`}>
      {/* 1. Ground Caustic Reflection Shadow */}
      <div
        className="absolute -bottom-6 w-48 h-10 rounded-full blur-xl pointer-events-none transition-all duration-500"
        style={{
          backgroundColor: causticColor,
          opacity: causticIntensity,
          transform: `scale(${causticSize})`,
          boxShadow: `0 0 30px ${causticColor}`,
        }}
      />

      {/* 2. Outer Glow Aura Ring */}
      <div
        className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-500 ${
          interactive ? "group-hover:scale-105" : ""
        } ${autoRotate ? "animate-spin-slow" : ""}`}
        style={{
          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,${0.3 + (studioHighlights || 0)}), ${glassTintColor} 55%, rgba(0,0,0,0.95))`,
          boxShadow: `0 0 ${40 * glowIntensity}px ${glowColor}, inset 0 0 25px ${rimColor}55`,
          backdropFilter: blurVal > 0 ? `blur(${blurVal}px)` : "none",
        }}
      >
        {/* Star Density Particles Field */}
        {starDensity > 0 && (
          <div className="absolute inset-2 rounded-full overflow-hidden pointer-events-none opacity-80">
            <div className="absolute top-3 left-6 w-1 h-1 bg-white rounded-full animate-ping opacity-75" />
            <div className="absolute top-10 right-8 w-1.5 h-1.5 bg-purple-300 rounded-full animate-pulse opacity-90" />
            <div className="absolute bottom-8 left-10 w-1 h-1 bg-cyan-200 rounded-full animate-pulse opacity-80" />
            <div className="absolute bottom-5 right-6 w-1 h-1 bg-emerald-200 rounded-full animate-ping opacity-60" />
          </div>
        )}

        {/* Chromatic Aberration RGB Edge Fringe Effect */}
        {isChroma && (
          <>
            <div
              className="absolute inset-0 rounded-full border border-red-500/50 pointer-events-none mix-blend-screen animate-pulse"
              style={{ transform: `translate(${chromaticAberration * 2}px, -${chromaticAberration}px)` }}
            />
            <div
              className="absolute inset-0 rounded-full border border-cyan-400/50 pointer-events-none mix-blend-screen"
              style={{ transform: `translate(-${chromaticAberration * 2}px, ${chromaticAberration}px)` }}
            />
          </>
        )}

        {/* Studio Highlight Top Glint */}
        {studioHighlights > 0 && (
          <div
            className="absolute top-4 left-6 w-12 h-6 rounded-full bg-gradient-to-b from-white/90 to-transparent blur-[1px] transform -rotate-45 pointer-events-none"
            style={{ opacity: studioHighlights }}
          />
        )}

        {/* Fresnel Rim Glow Border */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `2px solid ${rimColor}`,
            boxShadow: `inset 0 0 20px ${rimColor}88`,
          }}
        />

        {/* Animated Internal Ribbon S-Curve Flow */}
        {ribbonEnabled && (
          <svg className="absolute inset-2 w-40 h-40 pointer-events-none" viewBox="0 0 100 100">
            <path
              d="M 20,50 Q 35,20 50,50 T 80,50"
              fill="none"
              stroke={rimColor}
              strokeWidth="3"
              strokeDasharray="120"
              strokeDashoffset="0"
              style={{
                opacity: ribbonOpacity,
                animation: `dash ${6 / ribbonFlowSpeed}s linear infinite`,
              }}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function OrbItem({ orb, onClick, index, interactive = true, settings }: OrbItemProps) {
  // If used purely with settings (no orb data object), render standalone sphere canvas
  if (!orb && settings) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <StandaloneOrbSphere settings={settings} interactive={interactive} />
      </div>
    );
  }

  // Fallback default orb if omitted
  const activeOrb = orb || {
    id: "default_orb",
    title: "Orbe de Ejemplo",
    subtitle: "Configuración Holográfica",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución",
    scope: "empresa" as const,
    subCategory: "flujo_diario",
    status: "en_curso" as const,
    progressPercent: 75,
    methodologies: ["Ivy Lee", "Deep Work"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: settings?.rimColor || "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "Target",
    description: "Orbe de desarrollo de software y arquitectura.",
    flowSteps: [],
  };

  const isCompleted = activeOrb.status === "concluido";
  const isInProgress = activeOrb.status === "en_curso";
  const miniHistory = getOrbMiniHistory(activeOrb.id);
  const orbStreak = (activeOrb.id.length * 3) % 12 + 4;

  const timeframeMin = getOrbTimeframeMinutes(activeOrb.timeframe);
  const tasksEstMin = activeOrb.flowSteps.length * 35;
  const isTimeOverloaded = tasksEstMin > timeframeMin;
  const overloadDiffMin = tasksEstMin - timeframeMin;

  return (
    <div
      onClick={() => onClick && onClick(activeOrb)}
      className={`group relative cursor-pointer select-none flex flex-col items-center justify-between p-5 rounded-3xl backdrop-blur-xl bg-[#0a0f16]/90 border transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-2xl overflow-hidden min-h-[310px] ${
        isTimeOverloaded ? "border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]" : ""
      }`}
      style={{
        borderColor: isTimeOverloaded ? undefined : activeOrb.colorTheme.border,
        boxShadow: isTimeOverloaded ? undefined : `0 10px 30px -10px ${activeOrb.colorTheme.glow}`,
      }}
    >
      {/* Background Radial Glow Effect */}
      <div
        className="absolute -top-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"
        style={{ backgroundColor: isTimeOverloaded ? "#f43f5e" : activeOrb.colorTheme.primary }}
      />

      {/* Mandatory Lock Icon if protected */}
      {activeOrb.isMandatory && (
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
          <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-300 text-[9px] font-space-mono font-bold flex items-center gap-1 animate-pulse shadow-lg">
            <AlertTriangle size={10} />
            <span>+{overloadDiffMin}m EXCEDIDO</span>
          </span>
        </div>
      )}

      {/* Top Bar: Timeframe & Status Badge */}
      <div className={`w-full flex items-center justify-between z-10 text-[11px] pr-4 ${isTimeOverloaded ? "mt-4" : ""}`}>
        <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-slate-300 flex items-center gap-1.5 font-alata">
          <Clock size={11} className="text-slate-400" />
          <span>{activeOrb.timeframe}</span>
        </span>

        {/* Status Indicator */}
        {isCompleted && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1 font-space-mono text-[10px]">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <span>CONCLUÍDO</span>
          </span>
        )}
        {isInProgress && (
          <span className="px-2.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1 animate-pulse font-space-mono text-[10px]">
            <PlayCircle size={12} className="text-cyan-400" />
            <span>EN CURSO (<span className="font-alata">{activeOrb.progressPercent}%</span>)</span>
          </span>
        )}
        {!isCompleted && !isInProgress && (
          <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1 font-space-mono text-[10px]">
            <Layers size={12} className="text-amber-400" />
            <span>PENDIENTE</span>
          </span>
        )}
      </div>

      {/* CENTRAL 3D GLOWING SPHERE / ORB UI */}
      <div className="relative my-3 flex flex-col items-center justify-center w-36 h-36">
        <StandaloneOrbSphere
          settings={settings}
          interactive={interactive}
          primaryColor={activeOrb.colorTheme.primary}
          glowColor={activeOrb.colorTheme.glow}
          progressPercent={activeOrb.progressPercent}
        />
      </div>

      {/* Bottom Info: Title & Subtitle */}
      <div className="w-full text-center z-10 space-y-1">
        <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 font-google-sans">
          <span>{activeOrb.title}</span>
        </h3>
        <p className="text-xs text-slate-400 line-clamp-1 font-google-sans">{activeOrb.subtitle}</p>

        {/* Methodologies Badges */}
        <div className="pt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          {activeOrb.methodologies.map((m, idx) => (
            <span
              key={idx}
              className="text-[10px] font-space-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* MINI WEEKLY USER ACTIVITY STRIP & STREAK */}
      <div className="w-full mt-3 pt-2.5 border-t border-white/10 z-10 flex items-center justify-between gap-2">
        <span
          className="px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-500/40 text-orange-300 font-space-mono text-[10px] font-bold flex items-center gap-1 shrink-0"
          title="Racha de constancia en este Orbe"
        >
          <Flame size={11} className="text-orange-400 fill-orange-400" />
          <span className="font-alata">{orbStreak}d</span>
        </span>

        <div className="flex items-center gap-1">
          {miniHistory.map((item, idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-alata font-bold transition-all ${
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
      <div className="w-full mt-2 text-[10px] font-google-sans text-center text-slate-400 group-hover:text-white transition flex items-center justify-center gap-1">
        <span>Click para ver dentro del Orbe</span>
        <span>→</span>
      </div>
    </div>
  );
}

