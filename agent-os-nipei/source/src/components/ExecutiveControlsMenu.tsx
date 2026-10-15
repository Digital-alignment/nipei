"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Clock, Building2, ShieldCheck } from "lucide-react";
import TopHeaderBar from "./TopHeaderBar";
import CompanySelector from "./CompanySelector";
import SquadSelector from "./SquadSelector";
import AgentVaultActivityWidget from "./AgentVaultActivityWidget";
import CommandPalette from "./CommandPalette";
import type { SquadId } from "@/lib/nipeiStore";

interface Props {
  activeSquad?: SquadId;
  onSquadChange?: (squad: SquadId) => void;
}

export default function ExecutiveControlsMenu({
  activeSquad = "super_user",
  onSquadChange = () => {},
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir painel de controles e foco"
        title="Controles executivos: Foco, Pomodoro, Empresa, Squad & Vault"
        className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center relative cursor-pointer ${
          isOpen
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_18px_rgba(34,197,94,0.3)] ring-1 ring-emerald-500/40"
            : "bg-[#090e16]/80 text-zinc-400 border-white/10 hover:text-white hover:border-emerald-500/40 hover:bg-[#101913]"
        }`}
      >
        {isOpen ? (
          <X size={16} className="text-emerald-400" />
        ) : (
          <SlidersHorizontal size={16} className="text-zinc-300 hover:text-emerald-400 transition" />
        )}

        {/* Subtle live activity pulse */}
        <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </button>

      {/* Floating Executive Control Panel Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute right-0 top-full mt-2.5 w-[min(540px,92vw)] z-50 p-4 rounded-2xl border border-white/10 bg-[#070b12]/95 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] space-y-3.5 font-mono text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                  Painel Executivo & Foco
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Nipëi OS Control</span>
            </div>

            {/* 1. Foco & Timer */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider flex items-center gap-1.5">
                <Clock size={12} />
                <span>Foco & Pomodoro Timer</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2 flex-wrap">
                <TopHeaderBar />
              </div>
            </div>

            {/* 2. Empresa & Tipo de Usuário / Squad */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider flex items-center gap-1.5">
                <Building2 size={12} />
                <span>Empresa & Tipo de Usuário</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2 flex-wrap">
                <CompanySelector />
                <SquadSelector activeSquad={activeSquad} onSquadChange={onSquadChange} />
              </div>
            </div>

            {/* 3. Status do Vault & Command Palette */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={12} />
                <span>Status do Vault & Atalhos</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2 flex-wrap">
                <AgentVaultActivityWidget />
                <CommandPalette />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
