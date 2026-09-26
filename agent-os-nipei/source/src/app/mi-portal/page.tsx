"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  User,
  Building2,
  Sparkles,
  HeartPulse,
  Music,
  Briefcase,
  Ticket,
  Bot,
  Home,
  Layers,
  Plus,
} from "lucide-react";
import { INITIAL_MEMBERS, MemberProfile } from "@/lib/nipeiStore";
import PortalHeader from "@/components/portal/PortalHeader";
import RadialMenuButton from "@/components/portal/RadialMenuButton";
import OrbItem, { OrbData } from "@/components/portal/OrbItem";
import OrbDetailModal from "@/components/portal/OrbDetailModal";
import InicioTimeline from "@/components/portal/InicioTimeline";
import CreateOrbModal from "@/components/portal/CreateOrbModal";
import DateNavigator from "@/components/portal/DateNavigator";
import GlobalActivityMatrix from "@/components/portal/GlobalActivityMatrix";
import TimeBudgetWidget from "@/components/portal/TimeBudgetWidget";
import TimeConfigModal, { TimeConfigSettings } from "@/components/portal/TimeConfigModal";

// ALL ORBS DATASET (PERSONAL & EMPRESA FULL EXPANSION WITH MANDATORY SYSTEM ORBS & CUSTOM ORBS)
const ALL_ORBS: OrbData[] = [
  // ─── 1. PERSONAL - FLUJO DIARIO ──────────────────────────────────────────
  {
    id: "p_matinal",
    title: "Al Despertar: Cronobiología & Mente",
    subtitle: "Desayuno sin incendios, conexión con valores & Hexaflex/ACT",
    timeframe: "07:00 - 08:30",
    phaseCategory: "Al Despertar",
    scope: "personal",
    subCategory: "flujo_diario",
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
    description: "Franja de recuperación biológica personal. Reservar energía y conectar con valores fundamentales antes de encender pantallas.",
    flowSteps: [
      { id: "p1_1", step: "Rutina biológica matinal (Desayuno & Movimiento)", completed: true, methodologyTag: "Cronobiología" },
      { id: "p1_2", step: "Identificación de estado de ánimo & autoconciencia", completed: true, methodologyTag: "Autoliderazgo" },
      { id: "p1_3", step: "Conexión con valores fundamentales (¿Por qué hago lo que hago?)", completed: true, methodologyTag: "Hexaflex / ACT" },
    ],
    notes: "Hoy me desperté con excelente energía. Rutina matinal cumplida sin apuros.",
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },
  {
    id: "p_enfoque",
    title: "Enfoque Personal & Crecimiento",
    subtitle: "Ivy Lee Personal & Deep Work Aprendizaje",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución Estratégica",
    scope: "personal",
    subCategory: "flujo_diario",
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
    description: "Bloque de 90 a 120 minutos de foco ininterrumpido dedicado a metas personales (lectura, idiomas, salud o arte).",
    flowSteps: [
      { id: "p2_1", step: "Selección de Top 3 objetivos de desarrollo personal", completed: true, methodologyTag: "Ivy Lee" },
      { id: "p2_2", step: "Bloque de 90 min de estudio sin notificaciones", completed: true, methodologyTag: "Deep Work" },
      { id: "p2_3", step: "Registro de avances en cuaderno personal", completed: false, methodologyTag: "Kaizen" },
    ],
    leadMeasure: {
      label: "Minutos de Foco Profundo Registrados",
      current: 90,
      target: 120,
      unit: "min",
    },
    isMandatory: false,
  },
  {
    id: "p_pausa",
    title: "Pausa Consciente & Regulación",
    subtitle: "Pausa estoica, dicotomía del control & nutrición",
    timeframe: "11:30 - 12:30",
    phaseCategory: "Triaje & Imprevistos",
    scope: "personal",
    subCategory: "flujo_diario",
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
    description: "Desconexión deliberada de pantallas. Pausa estoica para evaluar el nivel de estrés y mantener equilibrio interno.",
    flowSteps: [
      { id: "p3_1", step: "Desconexión total de pantallas durante el almuerzo", completed: true, methodologyTag: "Estoicismo" },
      { id: "p3_2", step: "Evaluación de dicotomía del control (lo que está en mi poder)", completed: true, methodologyTag: "Estoicismo" },
    ],
    isMandatory: false,
  },
  {
    id: "p_hobbies",
    title: "Hobbies & Naturaleza",
    subtitle: "Paseo al aire libre, recarga de energía & música",
    timeframe: "14:00 - 17:00",
    phaseCategory: "Gestión Tarde",
    scope: "personal",
    subCategory: "flujo_diario",
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
    description: "Horas de menor energía biológica ideales para recargar baterías: salir a la naturaleza o tocar música.",
    flowSteps: [
      { id: "p4_1", step: "Caminata al aire libre / ejercicio suave", completed: false, methodologyTag: "Cronobiología" },
      { id: "p4_2", step: "Escuchar música / tocar instrumento acústico", completed: false, methodologyTag: "Recarga" },
    ],
    isMandatory: false,
  },
  {
    id: "p_cierre",
    title: "Cierre Personal & Noche de Fogata",
    subtitle: "Desconexión digital total & tiempo en casa con gatos",
    timeframe: "17:00 - 22:00",
    phaseCategory: "Cierre & Desconexión",
    scope: "personal",
    subCategory: "flujo_diario",
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
    description: "Dejar el trabajo atrás por completo. Estar 100% presente en la vida personal, noche de fogata y descanso.",
    flowSteps: [
      { id: "p5_1", step: "Ritual de apagado de dispositivos", completed: false, methodologyTag: "Ritual Apagado" },
      { id: "p5_2", step: "Presencia plena en el hogar y naturaleza", completed: false, methodologyTag: "ACT / Hexaflex" },
    ],
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },

  // ─── 2. PERSONAL - ÁREAS DE VIDA ──────────────────────────────────────────
  {
    id: "p_salud",
    title: "Salud, Nutrición & Bio-Optimización",
    subtitle: "Movimiento diario, entrenamiento físico & hidratación",
    timeframe: "Área de Vida",
    phaseCategory: "Área de Vida",
    scope: "personal",
    subCategory: "areas_vida",
    status: "en_curso",
    progressPercent: 75,
    methodologies: ["Cronobiología", "Hábitos Kaizen"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "HeartPulse",
    description: "Mantenimiento continuo de la energía física y corporal: rutina de ejercicios, hidratación y sueño reparador.",
    flowSteps: [
      { id: "ps1", step: "Entrenamiento físico o movilidad (45 min)", completed: true, methodologyTag: "Salud" },
      { id: "ps2", step: "Hidratación constante (3L de agua diario)", completed: true, methodologyTag: "Bio-Opt" },
      { id: "ps3", step: "Cena ligera 3h antes de dormir", completed: false, methodologyTag: "Cronobiología" },
    ],
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },
  {
    id: "p_desarrollo",
    title: "Desarrollo Intelectual & Lectura",
    subtitle: "Lectura de libros de filosofía, IA & nuevos conceptos",
    timeframe: "Área de Vida",
    phaseCategory: "Área de Vida",
    scope: "personal",
    subCategory: "areas_vida",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Segundo Cérebro", "PARA Vault"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#3b82f6",
      border: "rgba(59, 130, 246, 0.4)",
      glow: "rgba(59, 130, 246, 0.25)",
      gradient: "from-blue-500/20 via-indigo-950/40 to-black",
      badgeBg: "bg-blue-950/80",
      badgeText: "text-blue-300",
    },
    iconName: "BookOpen",
    description: "Nutrición mental continua mediante la lectura activa y la toma de notas conceptuales en el Vault.",
    flowSteps: [
      { id: "pd1", step: "Lectura de 30 páginas de filosofía / tecnología", completed: true, methodologyTag: "Lectura" },
      { id: "pd2", step: "Sintetizar 1 nota de aprendizaje en nipei-vault", completed: true, methodologyTag: "PARA" },
    ],
    isMandatory: false,
  },

  // ─── 3. EMPRESA - FLUJO DIARIO ───────────────────────────────────────────
  {
    id: "e_matinal",
    title: "Al Despertar: Claridad & Alineación de Equipo",
    subtitle: "Revisión de mindset sin apagar incendios a ciegas",
    timeframe: "07:00 - 08:30",
    phaseCategory: "Al Despertar",
    scope: "empresa",
    subCategory: "flujo_diario",
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
    description: "Preparación mental antes de tocar el código o revisar métricas corporativas.",
    flowSteps: [
      { id: "em1", step: "Revisión de propósito de la empresa y squad active", completed: true, methodologyTag: "Autoliderazgo" },
      { id: "em2", step: "Preparación de energía para el bloque de desarrollo", completed: true, methodologyTag: "IE" },
    ],
    isMandatory: false,
  },
  {
    id: "e_ejecucion",
    title: "Ejecución Estratégica: Ivy Lee & WIG 4DX",
    subtitle: "Tarea #1 Ivy Lee, Lead Measure WIG & Deep Work (Supabase/Vercel)",
    timeframe: "08:30 - 11:30",
    phaseCategory: "Ejecución Estratégica",
    scope: "empresa",
    subCategory: "flujo_diario",
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
    description: "Foco total en la Tarea #1 (Lead Measure del WIG): estructurar arquitectura de DB en Supabase o despliegue crítico en Vercel.",
    flowSteps: [
      { id: "ee1", step: "Sin correo ni mensajería al sentarse al escritorio", completed: true, methodologyTag: "Ivy Lee" },
      { id: "ee2", step: "Ejecución directa de la Tarea #1 conectada al WIG", completed: true, methodologyTag: "4DX" },
      { id: "ee3", step: "Bloque de 90-120 min de Deep Work sin interrupciones", completed: false, methodologyTag: "Deep Work" },
    ],
    leadMeasure: {
      label: "Despliegues de Funcionalidad WIG Completados",
      current: 4,
      target: 5,
      unit: "deploys",
    },
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },
  {
    id: "e_triaje",
    title: "Imprevistos: Pausa Estoica & Triaje (N1-N5)",
    subtitle: "Fallo en Render/Hostinger, Matriz Eisenhower & Vault PARA",
    timeframe: "11:30 - 12:30",
    phaseCategory: "Triaje & Imprevistos",
    scope: "empresa",
    subCategory: "flujo_diario",
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
    description: "Revisión de canales post-foco. Alerta procesada con serenidad estoica, clasificada por triaje y guardada en el Vault.",
    flowSteps: [
      { id: "et1", step: "Pausa estoica: separar lo que controlo de lo que no", completed: true, methodologyTag: "Estoicismo" },
      { id: "et2", step: "Clasificación de severidad (Nivel 5 vs Nivel 1)", completed: true, methodologyTag: "Triaje" },
      { id: "et3", step: "Decisión Eisenhower: ¿Hacer ahora o delegar a subagente?", completed: true, methodologyTag: "Eisenhower" },
      { id: "et4", step: "Almacenamiento directo de docs/scripts en el Vault", completed: true, methodologyTag: "PARA" },
    ],
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },
  {
    id: "e_soltaoverbo",
    title: "Cliente: Solta o Verbo",
    subtitle: "Área de alumnos, regla minúsculas & VPS soltaoverbo_vps",
    timeframe: "Cliente DA",
    phaseCategory: "Cliente DA",
    scope: "empresa",
    subCategory: "clientes_da",
    status: "en_curso",
    progressPercent: 90,
    methodologies: ["Design System Strict", "Audit Skill"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#ec4899",
      border: "rgba(236, 72, 153, 0.4)",
      glow: "rgba(236, 72, 153, 0.25)",
      gradient: "from-pink-500/20 via-rose-950/40 to-black",
      badgeBg: "bg-pink-950/80",
      badgeText: "text-pink-300",
    },
    iconName: "Briefcase",
    description: "Plataforma de alumnos para Solta o Verbo auditada bajo la skill solta-o-verbo-design-auditor y VPS soltaoverbo_vps.",
    flowSteps: [
      { id: "sv1", step: "Auditoría estricta de tipografía y regla minúsculas", completed: true, methodologyTag: "Design UI" },
      { id: "sv2", step: "Sincronización de nota viva en Clientes/Solta o Verbo.md", completed: true, methodologyTag: "Vault" },
    ],
    isMandatory: false,
  },
  {
    id: "e_squad_gov",
    title: "Squad Governance & Audit (@vaultkeeper)",
    subtitle: "Auditoría de conocimiento, RAG & nipei-vault sync",
    timeframe: "Squad IA",
    phaseCategory: "Squads & Infra",
    scope: "empresa",
    subCategory: "squads_infra",
    status: "concluido",
    progressPercent: 100,
    methodologies: ["Governance", "Vaultkeeper Audit"],
    activeAgents: ["@vaultkeeper"],
    colorTheme: {
      primary: "#10b981",
      border: "rgba(16, 185, 129, 0.4)",
      glow: "rgba(16, 185, 129, 0.25)",
      gradient: "from-emerald-500/20 via-teal-950/40 to-black",
      badgeBg: "bg-emerald-950/80",
      badgeText: "text-emerald-300",
    },
    iconName: "Bot",
    description: "Squad VB Governança & Audit de Conhecimento garantizando la integridad de notas v0.1 y contratos de frontmatter.",
    flowSteps: [
      { id: "sg1", step: "Auditoría de 12 notas de metodología 0.1", completed: true, methodologyTag: "Audit" },
      { id: "sg2", step: "Verificación de firmas <!-- agente: vaultkeeper -->", completed: true, methodologyTag: "Vault Contract" },
    ],
    isMandatory: true, // PROTECTED MANDATORY SYSTEM ORB
  },
];

export default function MiPortalPage() {
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("ashuan_dev");

  // Active Scope State: "inicio" | "personal" | "empresa"
  const [activeScope, setActiveScope] = useState<"inicio" | "personal" | "empresa">("inicio");

  // Active Sub-Category State
  const [activeSubCategory, setActiveSubCategory] = useState<string>("flujo_diario");

  // Orbs State
  const [orbs, setOrbs] = useState<OrbData[]>(ALL_ORBS);

  // Modal State for inspecting inside an Orb
  const [selectedOrb, setSelectedOrb] = useState<OrbData | null>(null);

  // Modal State for creating a new Orb
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Date Navigation State
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-24");

  // Time Capacity Budget Settings State
  const [isTimeModalOpen, setIsTimeModalOpen] = useState<boolean>(false);
  const [timeSettings, setTimeSettings] = useState<TimeConfigSettings>({
    wakeTime: "07:00",
    sleepTime: "23:00",
    maxWorkHours: 8,
    maxPersonalHours: 6,
    bufferHours: 2,
  });

  // Clock State
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    try {
      const savedMemberId = localStorage.getItem("nipei_selected_member_id");
      if (savedMemberId) {
        setSelectedMemberId(savedMemberId);
      }
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

  const handleScopeChange = (newScope: "inicio" | "personal" | "empresa") => {
    setActiveScope(newScope);
    setActiveSubCategory("flujo_diario");
  };

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0];

  // Handler: Update Orb from Modal
  const handleUpdateOrb = (updatedOrb: OrbData) => {
    setOrbs((prevOrbs) =>
      prevOrbs.map((o) => (o.id === updatedOrb.id ? updatedOrb : o))
    );
    setSelectedOrb(updatedOrb);
  };

  // Handler: Create new Orb
  const handleCreateOrb = (newOrb: OrbData) => {
    setOrbs((prevOrbs) => [newOrb, ...prevOrbs]);
    // Switch scope & subCategory to match new Orb
    setActiveScope(newOrb.scope);
    setActiveSubCategory(newOrb.subCategory);
  };

  // Handler: Delete Orb (Only for Non-mandatory Orbs)
  const handleDeleteOrb = (orbId: string) => {
    setOrbs((prevOrbs) => prevOrbs.filter((o) => o.id !== orbId));
  };

  // Handler: Toggle step directly from Inicio Timeline by OrbId & StepId
  const handleToggleStepById = (orbId: string, stepId: string) => {
    setOrbs((prevOrbs) =>
      prevOrbs.map((o) => {
        if (o.id !== orbId) return o;
        const updatedSteps = o.flowSteps.map((s) =>
          s.id === stepId ? { ...s, completed: !s.completed } : s
        );
        const completedCount = updatedSteps.filter((s) => s.completed).length;
        const newPercent =
          updatedSteps.length > 0
            ? Math.round((completedCount / updatedSteps.length) * 100)
            : 0;
        const newStatus =
          newPercent === 100 ? "concluido" : newPercent > 0 ? "en_curso" : "pendiente";

        return {
          ...o,
          flowSteps: updatedSteps,
          progressPercent: newPercent,
          status: newStatus,
        };
      })
    );
  };

  // Filter Orbs by current Scope AND SubCategory (for Personal / Empresa)
  const filteredOrbs = orbs.filter(
    (o) => o.scope === activeScope && o.subCategory === activeSubCategory
  );
  const completedOrbsCount = filteredOrbs.filter((o) => o.status === "concluido").length;

  const handleSelectMemberId = (id: string) => {
    setSelectedMemberId(id);
    try {
      localStorage.setItem("nipei_selected_member_id", id);
      const found = members.find((m) => m.id === id);
      if (found) {
        localStorage.setItem("nipei_current_user", JSON.stringify(found));
      }
    } catch {
      /* fallback */
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050608] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER AISLADO COMPACTO & CON COLOR DE PERMISO
         ───────────────────────────────────────────────────────────── */}
      <PortalHeader
        currentMember={currentMember}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={handleSelectMemberId}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. CONTENIDO PRINCIPAL: INICIO TIMELINE OR ORBS CONSTELLATION
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-8">
        
        {/* GLOBAL DATE NAVIGATOR (MULTI-DAY SELECTION & HISTORY CAROUSEL) */}
        <DateNavigator selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        {/* TIME BUDGET & OVERLOAD CAPACITY CONTROL WIDGET */}
        <TimeBudgetWidget
          orbs={orbs}
          settings={timeSettings}
          onOpenConfig={() => setIsTimeModalOpen(true)}
        />

        {/* TOP SELECTOR TOGGLE HEADER */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#080b12]/95 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-900/80 to-cyan-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Portal de Productividad & Mapeo de Objetivos</span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona la vista de cronograma o esferas para sincronizar con Mission Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* BUTTON TO OPEN CREATE ORB MODAL */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 border border-emerald-400/40"
            >
              <Plus size={15} />
              <span>Crear Orbe</span>
            </button>

            {/* FUTURISTIC 3-TAB PILL SWITCHER */}
            <div className="flex items-center p-1.5 bg-[#030509]/90 border border-white/15 rounded-2xl shadow-inner">
              <button
                onClick={() => handleScopeChange("inicio")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all duration-300 ${
                  activeScope === "inicio"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Home size={15} />
                <span>Inicio</span>
              </button>

              <button
                onClick={() => handleScopeChange("personal")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all duration-300 ${
                  activeScope === "personal"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User size={15} />
                <span>Personal</span>
              </button>

              <button
                onClick={() => handleScopeChange("empresa")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all duration-300 ${
                  activeScope === "empresa"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 size={15} />
                <span>Empresa</span>
              </button>
            </div>
          </div>
        </section>

        {/* CONDITIONALLY RENDER: INICIO TIMELINE & GLOBAL MATRIX VS ORBS CONSTELLATION */}
        {activeScope === "inicio" ? (
          <div className="space-y-8 animate-fade-in">
            {/* GLOBAL ACTIVITY MATRIX (METRICS, ORBS BREAKDOWN & 30D HEATMAP) */}
            <GlobalActivityMatrix
              orbs={orbs}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            {/* PRESENT TIMELINE */}
            <InicioTimeline
              orbs={orbs}
              onToggleStep={handleToggleStepById}
              timeStr={timeStr}
            />
          </div>
        ) : (
          <>
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

            {/* SUB-CATEGORY CHIPS BAR FOR PERSONAL / EMPRESA */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                {activeScope === "personal" ? (
                  <>
                    <button
                      onClick={() => setActiveSubCategory("flujo_diario")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "flujo_diario"
                          ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>✨ Flujo Diario</span>
                    </button>

                    <button
                      onClick={() => setActiveSubCategory("areas_vida")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "areas_vida"
                          ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <HeartPulse size={14} />
                      <span>🏋️ Áreas de Vida</span>
                    </button>

                    <button
                      onClick={() => setActiveSubCategory("hobbies_filosofia")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "hobbies_filosofia"
                          ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Music size={14} />
                      <span>🎵 Hobbies & Filosofía</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setActiveSubCategory("flujo_diario")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "flujo_diario"
                          ? "bg-purple-950/90 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>✨ Flujo Diario</span>
                    </button>

                    <button
                      onClick={() => setActiveSubCategory("clientes_da")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "clientes_da"
                          ? "bg-purple-950/90 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Briefcase size={14} />
                      <span>🏢 Clientes Externos DA</span>
                    </button>

                    <button
                      onClick={() => setActiveSubCategory("productos_propios")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "productos_propios"
                          ? "bg-purple-950/90 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Ticket size={14} />
                      <span>🚀 Productos Propios</span>
                    </button>

                    <button
                      onClick={() => setActiveSubCategory("squads_infra")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
                        activeSubCategory === "squads_infra"
                          ? "bg-purple-950/90 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "bg-white/5 text-slate-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Bot size={14} />
                      <span>🤖 Squads & Infra</span>
                    </button>
                  </>
                )}
              </div>

              {/* GRID OF GLOWING 3D ORBS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrbs.map((orb, index) => (
                  <OrbItem key={orb.id} orb={orb} onClick={setSelectedOrb} index={index} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. MODALES: DETALLE / EDICIÓN & CREACIÓN DE ORBE CON IA
         ───────────────────────────────────────────────────────────── */}
      <OrbDetailModal
        orb={selectedOrb}
        onClose={() => setSelectedOrb(null)}
        onUpdateOrb={handleUpdateOrb}
        onDeleteOrb={handleDeleteOrb}
      />

      <CreateOrbModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateOrb={handleCreateOrb}
        defaultScope={activeScope === "empresa" ? "empresa" : "personal"}
      />

      <TimeConfigModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        settings={timeSettings}
        onSaveSettings={setTimeSettings}
      />

      {/* ─────────────────────────────────────────────────────────────
          4. BOTÓN Y MENÚ RADIAL CIRCULAR TIPO HUD (6 ÍCONOS)
         ───────────────────────────────────────────────────────────── */}
      <RadialMenuButton menuTitle="NIPËI MENU" />

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER DISCRETO
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-3 border-t border-white/5 text-center text-[11px] text-slate-500 font-mono">
        Nipëi OS • Creación & Edición de Orbes Asistida por IA v3.2
      </footer>
    </div>
  );
}
