"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import PortalUserSelector from "@/components/portal/PortalUserSelector";
import HabitTrackerWidget from "@/components/portal/HabitTrackerWidget";
import IvyLeeTasksWidget from "@/components/portal/IvyLeeTasksWidget";
import AgendaWidget from "@/components/portal/AgendaWidget";
import QuickToolsBar from "@/components/portal/QuickToolsBar";
import { INITIAL_MEMBERS, INITIAL_SQUADS, MemberProfile, SquadMeta } from "@/lib/nipeiStore";
import { LayoutDashboard, Sparkles, Plus } from "lucide-react";

export default function MiPortalPage() {
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [squads, setSquads] = useState<SquadMeta[]>(INITIAL_SQUADS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  useEffect(() => {
    // Try loading from localStorage if present
    try {
      const savedMembers = localStorage.getItem("nipei_members_store");
      const savedSquads = localStorage.getItem("nipei_squads_store");
      if (savedMembers) setMembers(JSON.parse(savedMembers));
      if (savedSquads) setSquads(JSON.parse(savedSquads));
    } catch {
      /* fallback to initial */
    }

    if (INITIAL_MEMBERS.length > 0) {
      // Default to Cacique Mariazinha or first member
      const defaultMember = INITIAL_MEMBERS.find((m) => m.id === "cacique_mariazinha") || INITIAL_MEMBERS[0];
      setSelectedMemberId(defaultMember.id);
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060c07] text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* TopBar */}
        <TopBar />

        {/* Portal Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#183019] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Módulo Integrado /mi-portal
                </span>
                <span className="text-xs text-slate-400 font-mono">• MVP v1.0</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <LayoutDashboard className="text-emerald-400" size={28} />
                <span>Portal Personal de Usuario</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Habit tracker, tarefas Ivy Lee, agenda e acessos diretos personalizados por rol e squad.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1d0f] border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Nipëi Operating System</span>
              </span>
            </div>
          </div>

          {/* Quick Tools & Vault Links Bar */}
          <QuickToolsBar selectedMemberId={selectedMemberId} />

          {/* User Dossier & Profile Context Selector */}
          <PortalUserSelector
            members={members}
            squads={squads}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
          />

          {/* Grid of Modular Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Habit Tracker */}
            <div className="lg:col-span-1">
              <HabitTrackerWidget memberId={selectedMemberId} />
            </div>

            {/* Column 2: Top 6 Ivy Lee Tasks + Eisenhower + Triaje */}
            <div className="lg:col-span-1">
              <IvyLeeTasksWidget memberId={selectedMemberId} />
            </div>

            {/* Column 3: Agenda & Events */}
            <div className="lg:col-span-1">
              <AgendaWidget />
            </div>
          </div>

          {/* Extension Slot for Future Modular Skills */}
          <div className="bg-[#091409]/60 border border-dashed border-[#1e381e] rounded-xl p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold mb-1">
              <Plus size={16} className="text-emerald-400" />
              <span>Espaço para Expansão Futura de Habilidades (Skill Slot MVP)</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              Esta arquitetura modular permite acoplar novos componentes como Control Financeiro Personal,
              Chat Acompanhante de Agentes IA ou Registro Kaizen PDCA sem alterar a estrutura do portal.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
