"use client";

import React, { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { INITIAL_MEMBERS, MemberProfile } from "@/lib/nipeiStore";
import PortalHeader from "@/components/portal/PortalHeader";
import RadialMenuButton from "@/components/portal/RadialMenuButton";

export default function MiPortalPage() {
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("cacique_mariazinha");

  // Clock state for large digital time display
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    // Load members from store if available
    try {
      const savedMembers = localStorage.getItem("nipei_members_store");
      if (savedMembers) setMembers(JSON.parse(savedMembers));
    } catch {
      /* fallback */
    }

    // Live clock update
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

  const currentMember =
    members.find((m) => m.id === selectedMemberId) || members[0];

  return (
    <div className="min-h-screen w-full bg-[#040905] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ─────────────────────────────────────────────────────────────
          1. COMPONENTE DE HEADER AISLADO COMPACTO & DINÁMICO POR PERMISO
         ───────────────────────────────────────────────────────────── */}
      <PortalHeader
        currentMember={currentMember}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. CONTENIDO PRINCIPAL DEL PORTAL AISLADO
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* ───────────────────────────────────────────────────────────
            2.1 PRIMER ITEM: RELOJ CON NÚMEROS GRANDES
           ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-[#0a170c] to-[#061007] border border-[#1b381c] rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BRASILIA (GMT-3) • TIEMPO DE FOCO Y VISIÓN</span>
          </div>

          {/* Big Digital Clock */}
          <div className="font-mono font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-100 to-emerald-400/80 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] py-2 select-none">
            {timeStr || "19:24:58"}
          </div>

          {/* Full Formatted Date */}
          <div className="text-sm sm:text-base md:text-lg font-medium text-emerald-300/90 capitalize tracking-wide mt-1 flex items-center gap-2">
            <CalendarIcon size={18} className="text-emerald-400" />
            <span>{dateStr || "Jueves, 24 de Septiembre de 2026"}</span>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────
            2.2 SECCIÓN 1 PARA AGREGAR WIDGETS
           ─────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sección 1 — Widgets Principales
              </h2>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1f10] hover:bg-[#162e19] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition">
              <Plus size={14} />
              <span>Agregar Widget</span>
            </button>
          </div>

          {/* Container Grid Placeholder */}
          <div className="min-h-[200px] bg-[#081209]/80 border-2 border-dashed border-[#1c391d] rounded-2xl p-6 flex flex-col items-center justify-center text-center group hover:border-emerald-500/40 transition">
            <div className="w-11 h-11 rounded-2xl bg-[#122614] border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
              <Plus size={22} />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              [ + AGREGAR WIDGET / SECCIÓN 1 ]
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Espacio reservado para los componentes de la primera sección (ej. Habit Tracker, Tarjetas de Métricas o Accesos Rápidos).
            </p>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────
            2.3 SECCIÓN 2 PARA AGREGAR WIDGETS
           ─────────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sección 2 — Widgets Secundarios
              </h2>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1f10] hover:bg-[#162e19] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition">
              <Plus size={14} />
              <span>Agregar Widget</span>
            </button>
          </div>

          {/* Container Grid Placeholder */}
          <div className="min-h-[200px] bg-[#081209]/80 border-2 border-dashed border-[#1c391d] rounded-2xl p-6 flex flex-col items-center justify-center text-center group hover:border-teal-500/40 transition">
            <div className="w-11 h-11 rounded-2xl bg-[#122614] border border-teal-500/30 flex items-center justify-center text-teal-400 mb-2 group-hover:scale-110 transition-transform">
              <Plus size={22} />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              [ + AGREGAR WIDGET / SECCIÓN 2 ]
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Espacio reservado para los componentes de la segunda sección (ej. Tareas Ivy Lee, Agenda o Asistente IA).
            </p>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTÓN Y MENÚ RADIAL AISLADO CIRCULAR ESTILO HUD / APP (6 ÍCONOS)
         ───────────────────────────────────────────────────────────── */}
      <RadialMenuButton menuTitle="NIPËI MENU" />

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER DISCRETO
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-3 border-t border-[#122414] text-center text-[11px] text-slate-500 font-mono">
        Nipëi OS • Radial HUD Menu Button UI v1.0
      </footer>
    </div>
  );
}
