"use client";

import React from "react";
import { User, Building2, CheckCircle2, PlayCircle, Clock, Bot, Zap } from "lucide-react";

export interface NipeiBadgeProps {
  variant: "personal" | "empresa" | "concluido" | "en_curso" | "pendiente" | "agente" | "metodologia";
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

export default function NipeiBadge({
  variant,
  children,
  icon = true,
  className = "",
}: NipeiBadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "personal":
        return "bg-[#706c61]/20 border-[#706c61]/50 text-[#8D897C] shadow-[0_0_10px_rgba(141,137,124,0.2)]";
      case "empresa":
        return "bg-[#B49B43]/20 border-[#B49B43]/50 text-[#c2ac5b] shadow-[0_0_10px_rgba(194,172,91,0.2)]";
      case "concluido":
        return "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
      case "en_curso":
        return "bg-cyan-950/90 border-cyan-400/50 text-cyan-300 animate-pulse shadow-[0_0_12px_rgba(6,182,212,0.3)]";
      case "pendiente":
        return "bg-amber-950/80 border-amber-500/40 text-amber-300";
      case "agente":
        return "bg-purple-950/80 border-purple-500/40 text-purple-300";
      case "metodologia":
        return "bg-white/5 border-white/15 text-slate-200";
      default:
        return "bg-white/5 border-white/10 text-slate-300";
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    switch (variant) {
      case "personal":
        return <User size={11} />;
      case "empresa":
        return <Building2 size={11} />;
      case "concluido":
        return <CheckCircle2 size={11} />;
      case "en_curso":
        return <PlayCircle size={11} />;
      case "pendiente":
        return <Clock size={11} />;
      case "agente":
        return <Bot size={11} />;
      case "metodologia":
        return <Zap size={11} className="text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border font-space-mono text-[10px] font-bold tracking-tight uppercase ${getVariantStyles()} ${className}`}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
}
