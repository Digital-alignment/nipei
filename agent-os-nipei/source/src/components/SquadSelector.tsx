"use client";

import { useState } from "react";
import { SQUADS, type SquadId } from "@/lib/nipeiStore";
import { Crown, ShieldCheck, Brain, Package, Calendar, ShoppingBag, FileSpreadsheet, Wrench, ChevronDown } from "lucide-react";

interface Props {
  activeSquad: SquadId;
  onSquadChange: (squad: SquadId) => void;
}

export default function SquadSelector({ activeSquad, onSquadChange }: Props) {
  const [open, setOpen] = useState(false);

  const currentSquad = SQUADS.find((s) => s.id === activeSquad) ?? SQUADS[0]!;

  function getIcon(name: string) {
    switch (name) {
      case "Crown": return <Crown size={15} className="text-[#22c55e]" />;
      case "ShieldCheck": return <ShieldCheck size={15} className="text-[#4ade80]" />;
      case "Brain": return <Brain size={15} className="text-[#22c55e]" />;
      case "Package": return <Package size={15} className="text-[#a7f3d0]" />;
      case "Calendar": return <Calendar size={15} className="text-[#22c55e]" />;
      case "ShoppingBag": return <ShoppingBag size={15} className="text-[#4ade80]" />;
      case "FileSpreadsheet": return <FileSpreadsheet size={15} className="text-[#22c55e]" />;
      case "Wrench": return <Wrench size={15} className="text-[#f59e0b]" />;
      default: return <Crown size={15} />;
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#1e381e] bg-[#0a140a] hover:bg-[#142414] text-xs font-mono text-white transition"
      >
        <span className="shrink-0">{getIcon(currentSquad.iconName)}</span>
        <span className="font-bold truncate max-w-[200px] sm:max-w-[280px]">{currentSquad.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
          currentSquad.nucleus === "sagrado" ? "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]" : "bg-[#142414] text-[#a7f3d0]"
        }`}>
          {currentSquad.nucleus}
        </span>
        <ChevronDown size={14} className="text-[#4ade80] ml-1" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-[#1e381e] bg-[#0f190f] shadow-2xl z-50 p-2 space-y-1">
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#166534] px-2 py-1 border-b border-[#142414]">
            Filtrar Visão por Squad (Trinômio Operacional)
          </div>
          <div className="max-h-[320px] overflow-y-auto scroll space-y-1 pr-1">
            {SQUADS.map((squad) => {
              const active = squad.id === activeSquad;
              return (
                <button
                  key={squad.id}
                  onClick={() => {
                    onSquadChange(squad.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded flex items-start gap-2.5 transition ${
                    active ? "bg-[#142414] border border-[#22c55e]" : "hover:bg-[#162416]"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{getIcon(squad.iconName)}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span className="truncate">{squad.name}</span>
                    </div>
                    <div className="text-[10px] text-[#a7f3d0] leading-tight mt-0.5">{squad.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
