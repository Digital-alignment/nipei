"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Zap,
  User,
  Building2,
  Bot,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  KeyRound,
  Terminal,
  Cpu,
  Eye,
  EyeOff,
} from "lucide-react";
import { INITIAL_MEMBERS, MemberProfile } from "@/lib/nipeiStore";

export default function LoginPage() {
  const router = useRouter();

  // Selected preset login ID (Default to Ashuan Dev Master)
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ashuan_web");

  // Form inputs
  const [usernameInput, setUsernameInput] = useState<string>("ashuan");
  const [passwordInput, setPasswordInput] = useState<string>("ashuan2026");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<"human" | "ai_agent">("human");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Find active preset profile
  const activeMember =
    INITIAL_MEMBERS.find((m) => m.id === selectedPresetId) ||
    INITIAL_MEMBERS.find((m) => m.id === "ashuan_web") ||
    INITIAL_MEMBERS[0];

  // Helper: Verify if member is authorized for this MVP release
  const isAllowedUser = (member: MemberProfile | undefined): boolean => {
    if (!member) return false;
    const isSuperUser =
      member.globalRole === "SUPER_USER" || member.globalRole === "VETO_APPROVER";
    const isInSquad1 = member.squadAssignments?.some(
      (s) => s.squadId === "squad_1_ceo"
    );
    return isSuperUser || isInSquad1;
  };

  // Quick preset selection handler
  const handleSelectPreset = (member: MemberProfile, customUser: string, customPass: string) => {
    setSelectedPresetId(member.id);
    setUsernameInput(customUser);
    setPasswordInput(customPass);
    setErrorMessage(null);
    if (member.type === "ai_agent") {
      setLoginMode("ai_agent");
    } else {
      setLoginMode("human");
    }
  };

  // Perform Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check MVP Gatekeeper
    if (!isAllowedUser(activeMember)) {
      setErrorMessage(
        "Acceso no habilitado para esta versión MVP Online. Exclusivo para Super-Usuarios y Liderança de Squad 1 (Liderança e Estratégia)."
      );
      return;
    }

    // Store current logged-in user profile into localStorage
    try {
      localStorage.setItem("nipei_current_user", JSON.stringify(activeMember));
      localStorage.setItem("nipei_selected_member_id", activeMember.id);
    } catch {
      /* fallback */
    }

    // Redirect to /mi-portal with active user role
    router.push("/mi-portal");
  };

  return (
    <div className="min-h-screen w-full bg-[#04060a] text-white flex flex-col justify-between p-4 sm:p-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Ambient Glow Effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            🪐
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Nipëi OS</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                ONLINE MVP · V3.2
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Portal de Autenticación & Control de Acceso (Super-Users & Squad 1 Liderança)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sistema Operativo Online</span>
        </div>
      </header>

      {/* Central Login Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Quick Access User Cards Selector */}
        <div className="lg:col-span-6 space-y-4">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <Zap size={14} /> Acceso Rápido MVP (1-Click)
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Selecciona tu Perfil de Liderança o Agente
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Haz click en cualquiera de los usuarios autorizados de la Fase Online MVP para auto-llenar tus credenciales y acceder a <code className="text-cyan-300">/mi-portal</code>.
            </p>
          </div>

          {/* Quick Access Grid */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {/* 1. ASHUAN (DEV MASTER - SUPREME PERMISSIONS) */}
            <div
              onClick={() =>
                handleSelectPreset(
                  INITIAL_MEMBERS.find((m) => m.id === "ashuan_web") || INITIAL_MEMBERS[0],
                  "ashuan",
                  "ashuan2026"
                )
              }
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                selectedPresetId === "ashuan_web"
                  ? "bg-gradient-to-r from-amber-950/90 via-emerald-950/80 to-black border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] scale-[1.01]"
                  : "bg-black/50 border-slate-800 hover:border-amber-500/50 hover:bg-black/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl shrink-0 shadow-md">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">Ashuan</h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono font-black text-[9px] uppercase tracking-wider">
                      DEV MASTER
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">
                    Squad 1 & Squad 4 • Full Permisos Root
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-amber-300 block font-bold">
                  SUPER_USER
                </span>
                <span className="text-[9px] font-mono text-slate-400">user: ashuan</span>
              </div>
            </div>

            {/* 2. JORDÃO PEKUTI (CEO & SUPER USER) */}
            <div
              onClick={() =>
                handleSelectPreset(
                  INITIAL_MEMBERS.find((m) => m.id === "jordao_pekuti") || INITIAL_MEMBERS[0],
                  "jordao",
                  "jordao2026"
                )
              }
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                selectedPresetId === "jordao_pekuti"
                  ? "bg-gradient-to-r from-purple-950/90 via-indigo-950/80 to-black border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.3)] scale-[1.01]"
                  : "bg-black/50 border-slate-800 hover:border-purple-500/50 hover:bg-black/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-xl shrink-0 shadow-md">
                  🌿
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">Jordão Pekuti</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-mono font-bold text-[9px]">
                      CEO & COFUNDADOR
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">
                    Squad 1 Liderança & Squad 2 Mutum
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-purple-300 block font-bold">
                  SUPER_USER
                </span>
                <span className="text-[9px] font-mono text-slate-400">user: jordao</span>
              </div>
            </div>

            {/* 3. RODRIGO ANDRADE (HEAD ADMIN & LEGAL) */}
            <div
              onClick={() =>
                handleSelectPreset(
                  INITIAL_MEMBERS.find((m) => m.id === "rodrigo_andrade") || INITIAL_MEMBERS[0],
                  "rodrigo",
                  "rodrigo2026"
                )
              }
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                selectedPresetId === "rodrigo_andrade"
                  ? "bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-black border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] scale-[1.01]"
                  : "bg-black/50 border-slate-800 hover:border-cyan-500/50 hover:bg-black/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-xl shrink-0 shadow-md">
                  ⚖️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">Rodrigo Andrade</h3>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-[9px]">
                      HEAD ADMIN & LEGAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">
                    Squad 1 Liderança & Squad 5 Adm/Legal
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-cyan-300 block font-bold">
                  SQUAD_LEADER
                </span>
                <span className="text-[9px] font-mono text-slate-400">user: rodrigo</span>
              </div>
            </div>

            {/* 4. PPR (ESTRATEGIA & FINANZAS) */}
            <div
              onClick={() =>
                handleSelectPreset(
                  INITIAL_MEMBERS.find((m) => m.id === "ppr") || INITIAL_MEMBERS[0],
                  "ppr",
                  "ppr2026"
                )
              }
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                selectedPresetId === "ppr"
                  ? "bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-black border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.01]"
                  : "bg-black/50 border-slate-800 hover:border-emerald-500/50 hover:bg-black/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-xl shrink-0 shadow-md">
                  💼
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">PPR</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[9px]">
                      ESTRATÉGIA & FINANÇAS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">
                    Squad 1 Liderança & Squad 5 Adm/Legal
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-emerald-300 block font-bold">
                  SUPER_USER
                </span>
                <span className="text-[9px] font-mono text-slate-400">user: ppr</span>
              </div>
            </div>

            {/* 5. ANA CASTRO (TXINÍ - INSTITUTO & ALIANÇAS) */}
            <div
              onClick={() =>
                handleSelectPreset(
                  INITIAL_MEMBERS.find((m) => m.id === "ana_castro_human_api") || INITIAL_MEMBERS[0],
                  "anacastro",
                  "anacastro2026"
                )
              }
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                selectedPresetId === "ana_castro_human_api"
                  ? "bg-gradient-to-r from-pink-950/90 via-rose-950/80 to-black border-pink-400 shadow-[0_0_25px_rgba(244,114,182,0.3)] scale-[1.01]"
                  : "bg-black/50 border-slate-800 hover:border-pink-500/50 hover:bg-black/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400 flex items-center justify-center text-xl shrink-0 shadow-md">
                  🌸
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">Ana Castro (Txiní)</h3>
                    <span className="px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/40 font-mono font-bold text-[9px]">
                      COORDENAÇÃO & ALIANÇAS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">
                    Squad 1 Liderança & Squad 7 Instituto
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-pink-300 block font-bold">
                  SUPER_USER
                </span>
                <span className="text-[9px] font-mono text-slate-400">user: anacastro</span>
              </div>
            </div>

            {/* 6. AGENTES DE IA (ACCESO CON PERMISOS TOTALES DE EDICIÓN) */}
            <div className="pt-2">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Bot size={14} /> Agentes de IA Autenticados (Squad 1 & Brain)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {/* Agent @antigravity */}
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPreset(
                      INITIAL_MEMBERS.find((m) => m.id === "agente_antigravity") || INITIAL_MEMBERS[0],
                      "@antigravity",
                      "agentpass"
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    selectedPresetId === "agente_antigravity"
                      ? "bg-cyan-950/80 border-cyan-400 text-cyan-200"
                      : "bg-black/40 border-slate-800 hover:border-slate-600 text-slate-400"
                  }`}
                >
                  <span className="text-xl">🛸</span>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">@antigravity</div>
                    <div className="text-[10px] font-mono text-cyan-400">AI Mastermind</div>
                  </div>
                </button>

                {/* Agent @vaultkeeper */}
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPreset(
                      INITIAL_MEMBERS.find((m) => m.id === "agente_vaultkeeper") || INITIAL_MEMBERS[0],
                      "@vaultkeeper",
                      "agentpass"
                    )
                  }
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    selectedPresetId === "agente_vaultkeeper"
                      ? "bg-cyan-950/80 border-cyan-400 text-cyan-200"
                      : "bg-black/40 border-slate-800 hover:border-slate-600 text-slate-400"
                  }`}
                >
                  <span className="text-xl">🤖</span>
                  <div className="truncate">
                    <div className="text-xs font-bold truncate">@vaultkeeper</div>
                    <div className="text-[10px] font-mono text-cyan-400">RAG Steward</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Form & Credentials Preview */}
        <div className="lg:col-span-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#080d17]/95 border border-slate-800 shadow-2xl backdrop-blur-2xl space-y-6 relative overflow-hidden">
            {/* Top Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Shield size={16} className="text-emerald-400" />
                <span>Credenciales Autenticadas Nipëi OS</span>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono uppercase font-bold">
                Rol: {activeMember.globalRole}
              </span>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/60 text-xs text-red-200 flex items-start gap-2.5 animate-pulse">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Selected User Summary Banner */}
            <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                {activeMember.avatar}
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeMember.name}</span>
                  {activeMember.nativeName && (
                    <span className="text-[10px] font-mono text-cyan-300 px-1.5 py-0.2 rounded bg-black">
                      ({activeMember.nativeName})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {activeMember.specialityOrLineage}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Squad 1 CEO / Liderança
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                    Acceso MVP Habilitado
                  </span>
                </div>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <User size={13} className="text-emerald-400" />
                  <span>Nombre de Usuario / Identity ID</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                    className="w-full bg-black/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    placeholder="Escribe tu usuario..."
                  />
                  <CheckCircle2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-emerald-400" />
                  <span>Contraseña de Acceso</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    className="w-full bg-black/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Dev Master Permissions Box (If Ashuan or Agent) */}
              {(selectedPresetId === "ashuan_web" || activeMember.type === "ai_agent") && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    <span>MODO DEV MASTER & PERMISOS TOTALES ACTIVADO</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Permisos de edición completa sobre orbes, tareas del sistema, ajustes de tiempo y agentes de IA en <code className="text-white">/mi-portal</code>.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Iniciar Sesión en Nipëi OS</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="text-[11px] font-mono text-slate-500">
                Fase MVP Online • Módulos activos: Memoria Vault, Ingesta, Organograma, Empresas, Kanban, Venu
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-3 border-t border-white/5 text-center text-[11px] text-slate-500 font-mono relative z-10">
        Nipëi OS • Release MVP Online — Squad 1 Liderança & Super-Users
      </footer>
    </div>
  );
}
