"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  ArrowLeft,
  Flame,
  Clock,
  User,
  Building2,
  Sliders,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Eye,
  Check,
} from "lucide-react";
import OrbItem, { OrbSettings, StandaloneOrbSphere, OrbData } from "@/components/portal/OrbItem";

// Preset 1: Cristal Esmeralda Mate (roughness: 0.15, studioHighlights: 0, chromaticAberration: 0)
const PRESET_1: OrbSettings = {
  autoRotate: false,
  rotationSpeed: 0.1,
  ribbonOpacity: 0.1,
  ribbonThickness: 0.24,
  curveShape: "s-curve",
  ribbonFlowSpeed: 1.9,
  roughness: 0.15,
  studioHighlights: 0,
  chromaticAberration: 0,
  glowIntensity: 1.3,
  dispersion: 1.3,
  rimColor: "#34d399",
  fresnelPower: 2.5,
  spectrumPreset: "classic-prism",
  colorShift: 0,
  glassTintColor: "#071311",
  ior: 1.33,
  causticColor: "#10b981",
  causticIntensity: 0.1,
  causticSize: 1.5,
  starDensity: 0,
};

// Preset 2: Cristal Esmeralda Brillante Espectro (roughness: 0, studioHighlights: 0.3, chromaticAberration: 1.6)
const PRESET_2: OrbSettings = {
  autoRotate: false,
  rotationSpeed: 0.1,
  ribbonOpacity: 0.1,
  ribbonThickness: 0.24,
  curveShape: "s-curve",
  ribbonFlowSpeed: 1.9,
  roughness: 0,
  studioHighlights: 0.3,
  chromaticAberration: 1.6,
  glowIntensity: 1.3,
  dispersion: 1.3,
  rimColor: "#34d399",
  fresnelPower: 2.5,
  spectrumPreset: "classic-prism",
  colorShift: 0,
  glassTintColor: "#071311",
  ior: 1.33,
  causticColor: "#10b981",
  causticIntensity: 0.1,
  causticSize: 1.5,
  starDensity: 0,
};

// Preset 3: Optical Orb Example (Borde blanco #ffffff, Cáustica lavanda #d8b4fe, ior 1.52, starDensity 90)
const PRESET_3: OrbSettings = {
  autoRotate: true,
  rotationSpeed: 1,
  ribbonEnabled: false,
  ribbonOpacity: 0.85,
  ribbonThickness: 0.28,
  curveShape: "s-curve",
  ribbonFlowSpeed: 1,
  roughness: 0,
  studioHighlights: 1.1,
  chromaticAberration: 0.8,
  glowIntensity: 1.3,
  dispersion: 1.3,
  rimColor: "#ffffff",
  fresnelPower: 2.5,
  spectrumPreset: "classic-prism",
  colorShift: 0,
  glassTintColor: "#05070e",
  ior: 1.52,
  causticColor: "#d8b4fe",
  causticIntensity: 1.5,
  causticSize: 1,
  starDensity: 90,
};

// Mock timeline dataset of Orbs
const MOCK_TIMELINE_ORBS: OrbData[] = [
  {
    id: "lab_p1",
    title: "Al Despertar: Cronobiología & Mente",
    subtitle: "Desayuno sin incendios, conexión con valores & Hexaflex/ACT",
    timeframe: "07:00 - 08:30",
    phaseCategory: "Al Despertar",
    scope: "personal",
    subCategory: "flujo_diario",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Cronobiología", "Hexaflex / ACT"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "Sun",
    description: "Franja de recuperación biológica personal antes de encender pantallas.",
    flowSteps: [
      { id: "step_1", step: "Rutina biológica matinal", completed: true, methodologyTag: "Cronobiología" },
      { id: "step_2", step: "Conexión con valores de ACT", completed: true, methodologyTag: "Hexaflex" },
    ],
  },
  {
    id: "lab_e1",
    title: "Ejecución Estratégica: Ivy Lee & WIG 4DX",
    subtitle: "Tarea #1 Ivy Lee, Lead Measure WIG & Deep Work",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución Estratégica",
    scope: "empresa",
    subCategory: "flujo_diario",
    status: "en_curso",
    progressPercent: 80,
    methodologies: ["Ivy Lee", "4DX (WIG)", "Deep Work"],
    activeAgents: ["@vaultkeeper", "@antigravity"],
    colorTheme: {
      primary: "#3b82f6",
      border: "rgba(59, 130, 246, 0.4)",
      glow: "rgba(59, 130, 246, 0.25)",
      gradient: "from-blue-500/20 via-indigo-950/40 to-black",
      badgeBg: "bg-blue-950/80",
      badgeText: "text-blue-300",
    },
    iconName: "Target",
    description: "Bloque de foco ininterrumpido dedicado a la arquitectura UI de Nipëi OS.",
    flowSteps: [
      { id: "step_3", step: "Aislamiento sin correo ni notificaciones", completed: true, methodologyTag: "Ivy Lee" },
      { id: "step_4", step: "Estructurar componente holográfico OrbItem", completed: true, methodologyTag: "Design System" },
      { id: "step_5", step: "Integrar Laboratorio de UI /ui-lab", completed: false, methodologyTag: "Deep Work" },
    ],
    leadMeasure: {
      label: "Despliegues de Funcionalidad UI",
      current: 4,
      target: 5,
      unit: "componentes",
    },
  },
  {
    id: "lab_p2",
    title: "Imprevistos: Pausa Estoica & Triaje",
    subtitle: "Revisión con serenidad estoica & Vault PARA",
    timeframe: "11:30 - 12:30",
    phaseCategory: "Triaje & Imprevistos",
    scope: "empresa",
    subCategory: "flujo_diario",
    status: "pendiente",
    progressPercent: 0,
    methodologies: ["Estoicismo", "Triaje N1-N5"],
    activeAgents: ["@hermes"],
    colorTheme: {
      primary: "#f43f5e",
      border: "rgba(244, 63, 94, 0.4)",
      glow: "rgba(244, 63, 94, 0.25)",
      gradient: "from-rose-500/20 via-red-950/40 to-black",
      badgeBg: "bg-rose-950/80",
      badgeText: "text-rose-300",
    },
    iconName: "ShieldAlert",
    description: "Evaluación de notificaciones post-foco bajo matriz de triaje.",
    flowSteps: [
      { id: "step_6", step: "Evaluar severidad Nivel 1 a 5", completed: false, methodologyTag: "Triaje" },
    ],
  },
];

export default function UILabPage() {
  // Active clock state for live hero card
  const [timeStr, setTimeStr] = useState<string>("");
  
  // Custom Live Settings Inspector State
  const [customSettings, setCustomSettings] = useState<OrbSettings>(PRESET_2);

  // Collapse state for Riel de Timeline Integrado
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({
    lab_p1: true, // completed -> collapsed
    lab_e1: false, // in_progress -> expanded
    lab_p2: true, // future -> collapsed
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeOrb = MOCK_TIMELINE_ORBS.find((o) => o.status === "en_curso") || MOCK_TIMELINE_ORBS[1];

  return (
    <div className="min-h-screen w-full bg-[#04060a] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER LABORATOIRE
         ───────────────────────────────────────────────────────────── */}
      <header className="w-full bg-[#080b12]/90 border-b border-white/10 px-6 py-4 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/mi-portal"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-mono border border-white/10"
          >
            <ArrowLeft size={16} />
            <span>Volver a Mi Portal</span>
          </Link>
          <div className="h-5 w-[1px] bg-white/15" />
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <Sliders size={18} />
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Nipëi UI Component Laboratory</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                  v3.2 LIVE LAB
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Evaluación visual de componentes UI antes de aprobación final
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition"
          >
            🔑 Cambiar Usuario
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-12">
        
        {/* ─── SECCIÓN 1: ESFERA 3D ORBITEM - COMPARADOR VISUAL DE DISEÑOS ─── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Sparkles size={22} className="text-emerald-400" />
                <span>Componente Esfera 3D: `OrbItem`</span>
              </h2>
              <p className="text-xs text-slate-400">
                Comparativa directa entre el Diseño 1 (Cristal Mate) y Diseño 2 (Brillante Espectro) con inspector interactivo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DISEÑO 1 CARD */}
            <div className="p-6 rounded-3xl bg-[#080c14]/90 border border-emerald-500/30 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-between relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-xs font-mono mb-4">
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                  DISEÑO 1: MATE PRISMA
                </span>
                <span className="text-slate-400">roughness: 0.15</span>
              </div>

              <div className="w-[260px] h-[260px] flex items-center justify-center my-2">
                <OrbItem interactive={true} settings={PRESET_1} />
              </div>

              <div className="w-full text-center space-y-1 pt-4 border-t border-white/10 text-xs text-slate-300 font-mono">
                <p>• Roughness: 0.15 (Cristal esmerilado)</p>
                <p>• Highlights: 0 • Aberración: 0</p>
                <p>• Caustica Suelo: #10b981</p>
              </div>
            </div>

            {/* DISEÑO 2 CARD */}
            <div className="p-6 rounded-3xl bg-[#080c14]/90 border border-cyan-500/40 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-between relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-xs font-mono mb-4">
                <span className="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                  DISEÑO 2: BRILLANTE ESPECTRO
                </span>
                <span className="text-slate-400">chroma: 1.6</span>
              </div>

              <div className="w-[260px] h-[260px] flex items-center justify-center my-2">
                <OrbItem interactive={true} settings={PRESET_2} />
              </div>

              <div className="w-full text-center space-y-1 pt-4 border-t border-white/10 text-xs text-slate-300 font-mono">
                <p>• Roughness: 0 (Cristal espejo pulido)</p>
                <p>• Studio Highlights: 0.3 • Aberración: 1.6</p>
                <p>• Caustica Suelo: #10b981</p>
              </div>
            </div>

            {/* DISEÑO 3 CARD (NUEVO CÓDIGO) */}
            <div className="p-6 rounded-3xl bg-[#080c14]/90 border border-purple-500/40 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-between relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-xs font-mono mb-4">
                <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                  DISEÑO 3: ÓPTICO ESTELAR
                </span>
                <span className="text-slate-400">rim: #ffffff</span>
              </div>

              <div className="w-[260px] h-[260px] flex items-center justify-center my-2">
                <OrbItem interactive={true} settings={PRESET_3} />
              </div>

              <div className="w-full text-center space-y-1 pt-4 border-t border-white/10 text-xs text-slate-300 font-mono">
                <p>• Rim: #ffffff • Highlights: 1.1</p>
                <p>• Caustica: #d8b4fe • Stars: 90</p>
                <p>• autoRotate: 1 • ior: 1.52</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECCIÓN 2: HERO CARD DE LA ACTIVIDAD ACTIVA EN EL PRESENTE ─── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Flame size={22} className="text-amber-400 animate-pulse" />
                <span>Hero Card: Actividad Activa en el Presente</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tarjeta de liderazgo activo con reloj en vivo, origen Personal/Empresa, esfera 3D holográfica y tags de metodología ⚡
              </p>
            </div>
          </div>

          <div
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

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left Column */}
              <div className="space-y-3.5 text-center md:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  {/* Live Activity Badge */}
                  <span className="px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-mono font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>ACTIVIDAD ACTIVA AHORA ({timeStr || "19:35:10"})</span>
                  </span>

                  {/* Origin Badge */}
                  <span className="px-3.5 py-1 rounded-full bg-blue-950/90 border border-blue-400/50 text-blue-300 font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Building2 size={13} />
                    <span>Origen: EMPRESA</span>
                  </span>
                </div>

                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Orbe de Procedencia: <span className="text-white font-bold">{activeOrb.title}</span> ({activeOrb.timeframe})
                </div>

                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
                  <Flame size={28} className="text-amber-400 shrink-0 animate-pulse" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200">
                    {activeOrb.flowSteps[1]?.step || "Ejecutando arquitectura UI de Nipëi OS"}
                  </span>
                </h2>

                <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl">
                  {activeOrb.description}
                </p>

                {/* Methodologies Badges */}
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

              {/* Right Column: 3D Sphere */}
              <div className="shrink-0 flex flex-col items-center justify-center w-52 h-52">
                <OrbItem interactive={true} settings={PRESET_2} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECCIÓN 3: RIEL DE TIMELINE INTEGRADO (ORBES DEL DÍA) ─── */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Clock size={22} className="text-cyan-400" />
                <span>Riel de Timeline Integrado (Orbes del Día)</span>
              </h2>
              <p className="text-xs text-slate-400">
                Ordena todos los Orbes del día por hora. Colapsa automáticamente completados y futuros pero permite expandirlos manualmente.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {MOCK_TIMELINE_ORBS.map((orb) => {
              const isCollapsed = collapsedMap[orb.id] ?? true;
              const isCompleted = orb.status === "concluido";
              const isInProgress = orb.status === "en_curso";

              return (
                <div
                  key={orb.id}
                  className="rounded-2xl bg-[#070b12]/95 border border-white/10 overflow-hidden shadow-xl transition-all duration-300"
                >
                  {/* Collapsed Header Bar */}
                  <div
                    onClick={() => toggleCollapse(orb.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-black/60 border border-white/10 text-slate-300 font-mono text-xs flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span>{orb.timeframe}</span>
                      </span>

                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                          <span>{orb.title}</span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                              CONCLUÍDO
                            </span>
                          )}
                          {isInProgress && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono animate-pulse">
                              EN CURSO ({orb.progressPercent}%)
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {isCollapsed ? "Click para expandir" : "Click para colapsar"}
                      </span>
                      <button className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white">
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body Content */}
                  {!isCollapsed && (
                    <div className="p-5 border-t border-white/10 bg-black/40 space-y-4 animate-fade-in">
                      <p className="text-xs text-slate-300">{orb.description}</p>

                      <div className="space-y-2">
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">
                          Pasos del Flujo ({orb.flowSteps.length}):
                        </h4>
                        <div className="space-y-1.5">
                          {orb.flowSteps.map((step) => (
                            <div
                              key={step.id}
                              className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    step.completed
                                      ? "bg-emerald-500 text-black"
                                      : "border border-slate-600 text-transparent"
                                  }`}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </span>
                                <span className={step.completed ? "line-through text-slate-400" : "text-white"}>
                                  {step.step}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
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

      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. FOOTER
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-4 border-t border-white/10 text-center text-xs text-slate-500 font-mono bg-[#04060a]">
        Nipëi UI Component Laboratory • Sincronizado con nipei-control v3.2
      </footer>
    </div>
  );
}
