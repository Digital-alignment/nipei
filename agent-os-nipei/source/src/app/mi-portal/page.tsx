"use client";

import React, { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, User, Building2, Sparkles, Clock, CheckCircle2, PlayCircle, Shield } from "lucide-react";
import { INITIAL_MEMBERS, MemberProfile } from "@/lib/nipeiStore";
import PortalHeader from "@/components/portal/PortalHeader";
import RadialMenuButton from "@/components/portal/RadialMenuButton";
import OrbItem, { OrbData } from "@/components/portal/OrbItem";
import OrbDetailModal from "@/components/portal/OrbDetailModal";

// Initial Demo Orbs Data for Personal & Empresa flows
const INITIAL_ORBS: OrbData[] = [
  // ─── PERSONAL ORBS ────────────────────────────────────────────────────────
  {
    id: "p_matinal",
    title: "Al Despertar: Cronobiología & Mente",
    subtitle: "Desayuno sin incendios, conexión con valores & Hexaflex/ACT",
    timeframe: "07:00 - 08:30",
    phaseCategory: "Al Despertar",
    scope: "personal",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Cronobiología", "Autoliderazgo", "Hexaflex / ACT"],
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
    description: "Franja de recuperación biológica personal. Tu día no empieza apagando incendios, sino reservando energía biológica y conectando con tus valores fundamentales.",
    flowSteps: [
      { step: "Rutina biológica matinal (Desayuno & Movimiento)", completed: true, methodologyTag: "Cronobiología" },
      { step: "Identificación de estado de ánimo & autoconciencia", completed: true, methodologyTag: "Autoliderazgo" },
      { step: "Conexión con valores fundamentales (¿Por qué hago lo que hago?)", completed: true, methodologyTag: "Hexaflex / ACT" },
    ],
  },
  {
    id: "p_enfoque",
    title: "Enfoque Personal & Crecimiento",
    subtitle: "Ivy Lee Personal (Top 6 Hobbies) & Deep Work Aprendizaje",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución Estratégica",
    scope: "personal",
    status: "en_curso",
    progressPercent: 65,
    methodologies: ["Ivy Lee Personal", "Deep Work", "Pomodoro"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#06b6d4",
      border: "rgba(6, 182, 212, 0.4)",
      glow: "rgba(6, 182, 212, 0.25)",
      gradient: "from-cyan-500/20 via-blue-950/40 to-black",
      badgeBg: "bg-cyan-950/80",
      badgeText: "text-cyan-300",
    },
    iconName: "Brain",
    description: "Bloque de 90 a 120 minutos de foco ininterrumpido dedicado exclusivamente a tus metas personales (lectura, idiomas, proyectos de salud o arte).",
    flowSteps: [
      { step: "Selección de Top 3 objetivos de desarrollo personal", completed: true, methodologyTag: "Ivy Lee" },
      { step: "Bloque de 90 min de lectura/estudio sin notificaciones", completed: true, methodologyTag: "Deep Work" },
      { step: "Registro de avances en cuaderno personal", completed: false, methodologyTag: "Kaizen" },
    ],
  },
  {
    id: "p_pausa",
    title: "Pausa Consciente & Regulación",
    subtitle: "Pausa estoica, dicotomía del control & nutrición",
    timeframe: "11:30 - 12:30",
    phaseCategory: "Triaje & Imprevistos",
    scope: "personal",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Estoicismo", "Mindful Break"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#a855f7",
      border: "rgba(168, 85, 247, 0.4)",
      glow: "rgba(168, 85, 247, 0.25)",
      gradient: "from-purple-500/20 via-indigo-950/40 to-black",
      badgeBg: "bg-purple-950/80",
      badgeText: "text-purple-300",
    },
    iconName: "ShieldAlert",
    description: "Desconexión deliberada de pantallas. Pausa estoica para evaluar el nivel de estrés y mantener equilibrio interno sin reaccionar de forma impulsiva.",
    flowSteps: [
      { step: "Desconexión total de pantallas durante el almuerzo", completed: true, methodologyTag: "Estoicismo" },
      { step: "Evaluación de dicotomía del control (lo que está en mi poder)", completed: true, methodologyTag: "Estoicismo" },
    ],
  },
  {
    id: "p_hobbies",
    title: "Hobbies & Naturaleza",
    subtitle: "Paseo al aire libre, recarga de energía & música",
    timeframe: "14:00 - 17:00",
    phaseCategory: "Gestión Tarde",
    scope: "personal",
    status: "pendiente",
    progressPercent: 0,
    methodologies: ["Cronobiología Hora Valle", "Recarga de Energía"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#f59e0b",
      border: "rgba(245, 158, 11, 0.4)",
      glow: "rgba(245, 158, 11, 0.25)",
      gradient: "from-amber-500/20 via-orange-950/40 to-black",
      badgeBg: "bg-amber-950/80",
      badgeText: "text-amber-300",
    },
    iconName: "Sun",
    description: "Horas de menor energía biológica ideales para recargar baterías: salir a la naturaleza, tocar música o compartir con seres queridos.",
    flowSteps: [
      { step: "Caminata al aire libre / ejercicio suave", completed: false, methodologyTag: "Cronobiología" },
      { step: "Escuchar música / tocar instrumento acústico", completed: false, methodologyTag: "Recarga" },
    ],
  },
  {
    id: "p_cierre",
    title: "Cierre Personal & Noche de Fogata",
    subtitle: "Desconexión digital total & tiempo en casa con gatos",
    timeframe: "17:00 - 22:00",
    phaseCategory: "Cierre & Desconexión",
    scope: "personal",
    status: "pendiente",
    progressPercent: 0,
    methodologies: ["ACT / Hexaflex", "Ritual de Apagado"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#ec4899",
      border: "rgba(236, 72, 153, 0.4)",
      glow: "rgba(236, 72, 153, 0.25)",
      gradient: "from-pink-500/20 via-rose-950/40 to-black",
      badgeBg: "bg-pink-950/80",
      badgeText: "text-pink-300",
    },
    iconName: "Moon",
    description: "Dejar el trabajo atrás por completo. Estar 100% presente en la vida personal, noche de fogata, lectura y descanso garantizado.",
    flowSteps: [
      { step: "Ritual de apagado de dispositivos", completed: false, methodologyTag: "Ritual Apagado" },
      { step: "Presencia plena en el hogar y naturaleza", completed: false, methodologyTag: "ACT / Hexaflex" },
    ],
  },

  // ─── EMPRESA ORBS ─────────────────────────────────────────────────────────
  {
    id: "e_matinal",
    title: "Al Despertar: Claridad & Alineación de Equipo",
    subtitle: "Revisión de mindset sin apagar incendios a ciegas",
    timeframe: "07:00 - 08:30",
    phaseCategory: "Al Despertar",
    scope: "empresa",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Autoliderazgo", "Inteligencia Emocional"],
    activeAgents: ["@vaultkeeper", "@hermes"],
    colorTheme: {
      primary: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "Sun",
    description: "Preparación mental antes de tocar el código o revisar métricas corporativas. Asegura que la visión estratégica lidere la jornada.",
    flowSteps: [
      { step: "Revisión de propósito de la empresa y squad active", completed: true, methodologyTag: "Autoliderazgo" },
      { step: "Preparación de energía para el bloque de desarrollo", completed: true, methodologyTag: "IE" },
    ],
  },
  {
    id: "e_ejecucion",
    title: "Ejecución Estratégica: Ivy Lee & WIG 4DX",
    subtitle: "Tarea #1 Ivy Lee, Lead Measure WIG & Deep Work (Supabase/Vercel)",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución Estratégica",
    scope: "empresa",
    status: "en_curso",
    progressPercent: 80,
    methodologies: ["Ivy Lee", "4DX (WIG)", "Deep Work"],
    activeAgents: ["@vaultkeeper", "@claude_code"],
    colorTheme: {
      primary: "#3b82f6",
      border: "rgba(59, 130, 246, 0.4)",
      glow: "rgba(59, 130, 246, 0.25)",
      gradient: "from-blue-500/20 via-indigo-950/40 to-black",
      badgeBg: "bg-blue-950/80",
      badgeText: "text-blue-300",
    },
    iconName: "Target",
    description: "Foco total en la Tarea #1 (Lead Measure del WIG): estructurar arquitectura de DB en Supabase o despliegue crítico en Vercel. Notificaciones apagadas.",
    flowSteps: [
      { step: "Sin correo ni mensajería al sentarse al escritorio", completed: true, methodologyTag: "Ivy Lee" },
      { step: "Ejecución directa de la Tarea #1 conectada al WIG", completed: true, methodologyTag: "4DX" },
      { step: "Bloque de 90-120 min de Deep Work sin interrupciones", completed: false, methodologyTag: "Deep Work" },
    ],
  },
  {
    id: "e_triaje",
    title: "Imprevistos: Pausa Estoica & Triaje (N1-N5)",
    subtitle: "Fallo en Render/Hostinger, Matriz Eisenhower & Vault PARA",
    timeframe: "11:30 - 12:30",
    phaseCategory: "Triaje & Imprevistos",
    scope: "empresa",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Estoicismo", "Método Triaje", "Eisenhower", "PARA Vault"],
    activeAgents: ["@vaultkeeper", "@hermes"],
    colorTheme: {
      primary: "#f43f5e",
      border: "rgba(244, 63, 94, 0.4)",
      glow: "rgba(244, 63, 94, 0.25)",
      gradient: "from-rose-500/20 via-red-950/40 to-black",
      badgeBg: "bg-rose-950/80",
      badgeText: "text-rose-300",
    },
    iconName: "ShieldAlert",
    description: "Revisión de canales post-foco. Alerta de caída en Render/Hostinger procesada con serenidad estoica, clasificada por triaje y guardada en el Vault.",
    flowSteps: [
      { step: "Pausa estoica: separar lo que controlo de lo que no", completed: true, methodologyTag: "Estoicismo" },
      { step: "Clasificación de severidad (Nivel 5 vs Nivel 1)", completed: true, methodologyTag: "Triaje" },
      { step: "Decisión Eisenhower: ¿Hacer ahora o delegar a subagente?", completed: true, methodologyTag: "Eisenhower" },
      { step: "Almacenamiento directo de docs/scripts en el Vault", completed: true, methodologyTag: "PARA" },
    ],
  },
  {
    id: "e_cadencia",
    title: "Gestión Tarde: Cadencia 4DX & Créditos APIs",
    subtitle: "Standup 15m, revisión tableros WIG & presupuesto OpenRouter",
    timeframe: "14:00 - 17:00",
    phaseCategory: "Gestión Tarde",
    scope: "empresa",
    status: "en_curso",
    progressPercent: 40,
    methodologies: ["Cronobiología Hora Valle", "Cadencia 4DX", "Agile Standup"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#8b5cf6",
      border: "rgba(139, 92, 246, 0.4)",
      glow: "rgba(139, 92, 246, 0.25)",
      gradient: "from-violet-500/20 via-purple-950/40 to-black",
      badgeBg: "bg-violet-950/80",
      badgeText: "text-violet-300",
    },
    iconName: "Clock",
    description: "Hora valle biológica destinada a tareas operativas, reuniones de 15 min de prestacion de cuentas de WIG y control de costos de APIs de IA.",
    flowSteps: [
      { step: "Reunión de 15 min de revisión de tablero WIG", completed: true, methodologyTag: "4DX" },
      { step: "Auditoría de consumo de créditos OpenRouter & infra", completed: false, methodologyTag: "Operación" },
    ],
  },
  {
    id: "e_cierre",
    title: "Cierre Operativo: Kaizen PDCA & Apagado",
    subtitle: "1% Mejora, 6 tareas Ivy Lee para mañana & 'Sistema Apagado'",
    timeframe: "17:00 - 17:30",
    phaseCategory: "Cierre & Desconexión",
    scope: "empresa",
    status: "pendiente",
    progressPercent: 0,
    methodologies: ["Kaizen / PDCA", "Ivy Lee Mañana", "Ritual Apagado"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "CheckCircle2",
    description: "Evaluación de fricciones del día (Kaizen 1%), definición innegociable de las 6 tareas del día siguiente y cierre completo del sistema.",
    flowSteps: [
      { step: "Evaluación de fricción del día (Plan de 1% mejora)", completed: false, methodologyTag: "Kaizen PDCA" },
      { step: "Escritura de las 6 tareas Ivy Lee del día siguiente", completed: false, methodologyTag: "Ivy Lee" },
      { step: "Ritual de apagado: 'Sistema apagado'", completed: false, methodologyTag: "Ritual Apagado" },
    ],
  },
];

export default function MiPortalPage() {
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("cacique_mariazinha");

  // Active Scope State: "personal" | "empresa"
  const [activeScope, setActiveScope] = useState<"personal" | "empresa">("personal");

  // Orbs State
  const [orbs, setOrbs] = useState<OrbData[]>(INITIAL_ORBS);

  // Modal State for inspecting inside an Orb
  const [selectedOrb, setSelectedOrb] = useState<OrbData | null>(null);

  // Clock State
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem("nipei_members_store");
      if (savedMembers) setMembers(JSON.parse(savedMembers));
    } catch {
      /* fallback */
    }

    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0];

  // Toggle step inside Orb Modal
  const handleToggleStep = (orbId: string, stepIndex: number) => {
    setOrbs((prevOrbs) =>
      prevOrbs.map((o) => {
        if (o.id !== orbId) return o;
        const updatedSteps = [...o.flowSteps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: !updatedSteps[stepIndex].completed,
        };
        const completedCount = updatedSteps.filter((s) => s.completed).length;
        const newPercent = Math.round((completedCount / updatedSteps.length) * 100);
        const newStatus =
          newPercent === 100 ? "concluido" : newPercent > 0 ? "en_curso" : "pendiente";

        const updatedOrb: OrbData = {
          ...o,
          flowSteps: updatedSteps,
          progressPercent: newPercent,
          status: newStatus,
        };

        if (selectedOrb?.id === orbId) setSelectedOrb(updatedOrb);
        return updatedOrb;
      })
    );
  };

  const filteredOrbs = orbs.filter((o) => o.scope === activeScope);
  const completedOrbsCount = filteredOrbs.filter((o) => o.status === "concluido").length;

  return (
    <div className="min-h-screen w-full bg-[#050608] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER AISLADO COMPACTO & CON COLOR DE PERMISO
         ───────────────────────────────────────────────────────────── */}
      <PortalHeader
        currentMember={currentMember}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. CONTENIDO PRINCIPAL: ORBS HUD & MAPPING DIARIO
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-8">
        
        {/* TOP SELECTOR TOGGLE: PERSONAL VS EMPRESA */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0d14]/90 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Vista de Objetivos & Metodologías
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona la esfera de trabajo para sincronizar con Mission Control
              </p>
            </div>
          </div>

          {/* GLOWING PILL SWITCH: PERSONAL VS EMPRESA */}
          <div className="flex items-center p-1 bg-black/60 border border-white/10 rounded-xl">
            <button
              onClick={() => setActiveScope("personal")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                activeScope === "personal"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User size={15} />
              <span>Personal</span>
            </button>

            <button
              onClick={() => setActiveScope("empresa")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                activeScope === "empresa"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-400/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 size={15} />
              <span>Empresa</span>
            </button>
          </div>
        </section>

        {/* HERO SECTION: RELOJ DIGITAL GRANDE & RESUMEN DE FASE ACTIVA */}
        <section className="bg-gradient-to-b from-[#0b131a] via-[#070b10] to-[#040608] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Phase Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              ESFERA {activeScope.toUpperCase()} • {completedOrbsCount} DE {filteredOrbs.length} ORBES CONCLUÍDOS
            </span>
          </div>

          {/* Clock Display */}
          <div className="font-mono font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400/80 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] py-2 select-none">
            {timeStr || "19:24:58"}
          </div>

          {/* Date & Flow Subtitle */}
          <div className="text-sm sm:text-base md:text-lg font-medium text-cyan-300/90 capitalize tracking-wide mt-1 flex items-center gap-2">
            <CalendarIcon size={18} className="text-cyan-400" />
            <span>{dateStr || "Jueves, 24 de Septiembre de 2026"}</span>
          </div>
        </section>

        {/* ORB GRID / CONSTELLATION SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  activeScope === "personal" ? "bg-emerald-400 shadow-[0_0_10px_#10b981]" : "bg-blue-400 shadow-[0_0_10px_#3b82f6]"
                }`}
              />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Orbes de Ejecución Metodológica ({activeScope.toUpperCase()})
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Haz click en cualquier Orbe para inspeccionar sus pasos
            </span>
          </div>

          {/* GRID OF GLOWING 3D ORBS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrbs.map((orb, index) => (
              <OrbItem key={orb.id} orb={orb} onClick={setSelectedOrb} index={index} />
            ))}
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. MODAL DE INSPECCIÓN INTERNA DEL ORBE ("VER DENTRO")
         ───────────────────────────────────────────────────────────── */}
      <OrbDetailModal
        orb={selectedOrb}
        onClose={() => setSelectedOrb(null)}
        onToggleStep={handleToggleStep}
      />

      {/* ─────────────────────────────────────────────────────────────
          4. BOTÓN Y MENÚ RADIAL CIRCULAR TIPO HUD (6 ÍCONOS)
         ───────────────────────────────────────────────────────────── */}
      <RadialMenuButton menuTitle="NIPËI MENU" />

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER DISCRETO
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-3 border-t border-white/5 text-center text-[11px] text-slate-500 font-mono">
        Nipëi OS • Esferas de Objetivos (Personal / Empresa) & HUD Orbs UI v2.0
      </footer>
    </div>
  );
}
