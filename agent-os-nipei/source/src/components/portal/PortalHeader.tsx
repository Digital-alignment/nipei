"use client";

import React from "react";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRight, User, LogIn, Sparkles } from "lucide-react";
import { MemberProfile } from "@/lib/nipeiStore";

interface PortalHeaderProps {
  currentMember: MemberProfile;
  members: MemberProfile[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
}

export function getRoleColorTheme(role: string = "OPERATOR") {
  switch (role) {
    case "VETO_APPROVER":
      return {
        headerBg: "bg-[#041007]/90",
        headerBorder: "border-emerald-500/30",
        badgeBg: "bg-emerald-950/90",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        avatarBorder: "border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
        glow: "shadow-[0_2px_15px_rgba(16,185,129,0.1)]",
        buttonBg: "from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400",
        roleLabel: "SAGRADO / VETO APPROVER",
        shortLabel: "VETO",
      };
    case "SUPER_USER":
      return {
        headerBg: "bg-[#0b0514]/90",
        headerBorder: "border-purple-500/30",
        badgeBg: "bg-purple-950/90",
        badgeText: "text-purple-300",
        badgeBorder: "border-purple-500/40",
        avatarBorder: "border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
        glow: "shadow-[0_2px_15px_rgba(168,85,247,0.1)]",
        buttonBg: "from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-400",
        roleLabel: "SUPER USER",
        shortLabel: "SUPER",
      };
    case "SQUAD_LEADER":
      return {
        headerBg: "bg-[#040e14]/90",
        headerBorder: "border-cyan-500/30",
        badgeBg: "bg-cyan-950/90",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        avatarBorder: "border-cyan-500/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        glow: "shadow-[0_2px_15px_rgba(6,182,212,0.1)]",
        buttonBg: "from-cyan-600 via-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-400",
        roleLabel: "SQUAD LEADER",
        shortLabel: "LEADER",
      };
    case "OPERATOR":
      return {
        headerBg: "bg-[#120d04]/90",
        headerBorder: "border-amber-500/30",
        badgeBg: "bg-amber-950/90",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        avatarBorder: "border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
        glow: "shadow-[0_2px_15px_rgba(245,158,11,0.1)]",
        buttonBg: "from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400",
        roleLabel: "OPERATOR",
        shortLabel: "OPERATOR",
      };
    default:
      return {
        headerBg: "bg-[#08090d]/90",
        headerBorder: "border-slate-800",
        badgeBg: "bg-slate-900",
        badgeText: "text-slate-300",
        badgeBorder: "border-slate-700",
        avatarBorder: "border-slate-600",
        glow: "shadow-none",
        buttonBg: "from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700",
        roleLabel: role || "MEMBER",
        shortLabel: "MEMBER",
      };
  }
}

export default function PortalHeader({
  currentMember,
  members,
  selectedMemberId,
  onSelectMember,
}: PortalHeaderProps) {
  const roleTheme = getRoleColorTheme(currentMember?.globalRole);

  return (
    <header
      className={`w-full px-3 sm:px-5 py-1.5 border-b backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 flex items-center justify-between gap-2 sm:gap-4 h-12 ${roleTheme.headerBg} ${roleTheme.headerBorder} ${roleTheme.glow}`}
    >
      {/* ─── LADO IZQUIERDO COMPACTO: Avatar + Nombre + Badge de Permiso ─── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Avatar Ring */}
        <div className="relative shrink-0">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-black/60 border overflow-hidden flex items-center justify-center text-sm sm:text-base transition-all ${roleTheme.avatarBorder}`}
          >
            {currentMember?.avatar ? (
              <span className="select-none">{currentMember.avatar}</span>
            ) : (
              <User size={15} className="text-slate-300" />
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border border-black animate-pulse" />
        </div>

        {/* Name & Role Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <h1 className="text-[11px] sm:text-xs font-extrabold text-white tracking-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[260px]">
            {currentMember?.name || "Ashuan"}
          </h1>

          {currentMember?.nativeName && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/50 text-slate-300 border border-slate-700/50 hidden lg:inline-block">
              {currentMember.nativeName}
            </span>
          )}

          {/* Badge Dinámico Responsive */}
          <span
            className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full border transition-all shrink-0 ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
          >
            <Shield size={9} className="shrink-0" />
            <span className="hidden sm:inline">{roleTheme.roleLabel}</span>
            <span className="inline sm:hidden">{roleTheme.shortLabel}</span>
          </span>
        </div>
      </div>

      {/* ─── CENTRO COMPACTO: Selector Desplegable de Perfil (Medium+ screens) ─── */}
      <div className="hidden md:flex items-center shrink-0">
        <div className="relative">
          <select
            value={selectedMemberId}
            onChange={(e) => onSelectMember(e.target.value)}
            className="bg-black/60 border border-slate-700/60 text-[10px] sm:text-[11px] text-slate-200 rounded-lg px-2 py-1 pr-6 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer font-mono font-medium hover:border-slate-500 transition"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.globalRole})
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* ─── LADO DERECHO COMPACTO: Cambiar Usuario & Interfaz Completa ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Cambiar Usuario / Login Button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-slate-300 hover:text-white font-mono text-[10px] sm:text-xs border border-slate-700/60 hover:border-slate-500 bg-black/50 transition hover:bg-slate-900/80"
          title="Ir a Login / Cambiar de Perfil o Agente de IA"
        >
          <LogIn size={12} className="text-emerald-400 shrink-0" />
          <span className="hidden xs:inline">Login</span>
        </Link>

        {/* Interfaz Completa Button */}
        <Link
          href="/"
          className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-white font-bold text-[10px] sm:text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-white/20 bg-gradient-to-r ${roleTheme.buttonBg}`}
        >
          <span className="hidden xs:inline">Interfaz Completa</span>
          <span className="inline xs:hidden">Nipëi Control</span>
          <ArrowRight size={12} className="shrink-0" />
        </Link>
      </div>
    </header>
  );
}
