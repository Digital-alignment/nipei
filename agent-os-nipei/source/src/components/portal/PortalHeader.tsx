"use client";

import React from "react";
import Link from "next/link";
import { Shield, ChevronDown, ArrowRight, User, LogIn } from "lucide-react";
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
        headerBg: "bg-[#061408]/90",
        headerBorder: "border-emerald-500/40",
        badgeBg: "bg-emerald-950/90",
        badgeText: "text-emerald-300",
        badgeBorder: "border-emerald-500/40",
        avatarBorder: "border-emerald-500/60",
        glow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
        buttonBg: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
        roleLabel: "SAGRADO / VETO APPROVER",
      };
    case "SUPER_USER":
      return {
        headerBg: "bg-[#10071c]/90",
        headerBorder: "border-purple-500/40",
        badgeBg: "bg-purple-950/90",
        badgeText: "text-purple-300",
        badgeBorder: "border-purple-500/40",
        avatarBorder: "border-purple-500/60",
        glow: "shadow-[0_4px_20px_rgba(168,85,247,0.15)]",
        buttonBg: "from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500",
        roleLabel: "SUPER USER",
      };
    case "SQUAD_LEADER":
      return {
        headerBg: "bg-[#05131a]/90",
        headerBorder: "border-cyan-500/40",
        badgeBg: "bg-cyan-950/90",
        badgeText: "text-cyan-300",
        badgeBorder: "border-cyan-500/40",
        avatarBorder: "border-cyan-500/60",
        glow: "shadow-[0_4px_20px_rgba(6,182,212,0.15)]",
        buttonBg: "from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500",
        roleLabel: "SQUAD LEADER",
      };
    case "OPERATOR":
      return {
        headerBg: "bg-[#171106]/90",
        headerBorder: "border-amber-500/40",
        badgeBg: "bg-amber-950/90",
        badgeText: "text-amber-300",
        badgeBorder: "border-amber-500/40",
        avatarBorder: "border-amber-500/60",
        glow: "shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
        buttonBg: "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
        roleLabel: "OPERATOR",
      };
    default:
      return {
        headerBg: "bg-[#0c0e12]/90",
        headerBorder: "border-slate-700/50",
        badgeBg: "bg-slate-900",
        badgeText: "text-slate-300",
        badgeBorder: "border-slate-700",
        avatarBorder: "border-slate-600",
        glow: "shadow-none",
        buttonBg: "from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700",
        roleLabel: role || "MEMBER",
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
      className={`w-full px-5 py-2.5 border-b backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-50 transition-all duration-300 ${roleTheme.headerBg} ${roleTheme.headerBorder} ${roleTheme.glow}`}
    >
      {/* LADO IZQUIERDO COMPACTO: Avatar + Nombre + Badge de Permiso */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className={`w-9 h-9 rounded-xl bg-black/40 border-2 overflow-hidden flex items-center justify-center text-base shadow-md ${roleTheme.avatarBorder}`}
          >
            {currentMember?.avatar ? (
              <span className="select-none">{currentMember.avatar}</span>
            ) : (
              <User size={18} className="text-slate-300" />
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-xs font-bold text-white tracking-tight truncate max-w-[220px] sm:max-w-[320px]">
            {currentMember?.name || "Ashuan"}
          </h1>

          {currentMember?.nativeName && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-700/50 hidden md:inline-block">
              {currentMember.nativeName}
            </span>
          )}

          {/* Badge Dinámico con Color de Permiso */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${roleTheme.badgeBg} ${roleTheme.badgeText} ${roleTheme.badgeBorder}`}
          >
            <Shield size={10} />
            <span>{roleTheme.roleLabel}</span>
          </span>
        </div>
      </div>

      {/* CENTRO COMPACTO: Selector Desplegable de Perfil */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="relative">
          <select
            value={selectedMemberId}
            onChange={(e) => onSelectMember(e.target.value)}
            className="bg-black/50 border border-slate-700/60 text-[11px] text-slate-200 rounded-lg px-2.5 py-1 pr-7 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer font-medium hover:border-slate-500 transition"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.globalRole})
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* LADO DERECHO COMPACTO: Cambiar Usuario / Login & Interfaz Completa */}
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white font-mono text-xs border border-slate-700/60 hover:border-slate-500 bg-black/40 transition"
          title="Ir a Login / Cambiar de Perfil o Agente"
        >
          <LogIn size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">Cambiar Usuario</span>
        </Link>

        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-white/20 bg-gradient-to-r ${roleTheme.buttonBg}`}
        >
          <span>Interfaz Completa</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}
