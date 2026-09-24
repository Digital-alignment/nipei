"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock, ArrowRight, User, Shield, Network, Building2, Plus, Sparkles,
  LayoutGrid, ChevronDown, Compass, Calendar as CalendarIcon, ExternalLink
} from "lucide-react";
import { INITIAL_MEMBERS, MemberProfile } from "@/lib/nipeiStore";

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
    <div className="min-h-screen w-full bg-[#050c06] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER SUPERIOR AISLADO (SIN MENÚ LATERAL)
         ───────────────────────────────────────────────────────────── */}
      <header className="w-full px-6 py-4 border-b border-[#142615] bg-[#081409]/90 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-50">
        {/* LADO IZQUIERDO: Ícono de Perfil & Resumen de Usuario */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center text-xl shadow-lg shadow-emerald-950/50">
              {currentMember?.avatar ? (
                <span className="select-none">{currentMember.avatar}</span>
              ) : (
                <User className="text-emerald-400" size={24} />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#081409]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                {currentMember?.name || "Mariazinha Luísa Naiweni Yawanawá"}
              </h1>
              {currentMember?.nativeName && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/40">
                  {currentMember.nativeName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <Shield size={12} />
                {currentMember?.globalRole || "VETO_APPROVER"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-300 truncate max-w-[280px]">
                {currentMember?.specialityOrLineage || "Guardiana Espiritual Principal"}
              </span>
            </div>
          </div>

          {/* Quick Member Switcher for Demo */}
          <div className="hidden lg:flex items-center ml-2 border-l border-[#1b361d] pl-4">
            <div className="relative">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-[#0e1d0f] border border-[#1e3b20] text-xs text-emerald-200 rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.globalRole})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Botón para Dirigirse a la Interfaz Completa */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <Sparkles size={13} />
            <span>Portal Aislado</span>
          </span>

          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30 group"
          >
            <LayoutGrid size={15} />
            <span>Interfaz Completa / Mission Control</span>
            <ArrowRight
              size={15}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. CONTENIDO PRINCIPAL DEL PORTAL AISLADO
         ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ───────────────────────────────────────────────────────────
            2.1 PRIMER ITEM: RELOJ CON NÚMEROS GRANDES
           ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-[#0a170c] to-[#071108] border border-[#1b381c] rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center flex flex-col items-center justify-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BRASILIA (GMT-3) • TIEMPO DE FOCO Y VISIÓN</span>
          </div>

          {/* Big Digital Clock */}
          <div className="font-mono font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-emerald-100 to-emerald-400/80 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] py-2 select-none">
            {timeStr || "18:25:27"}
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Sección 1 — Widgets Principales
              </h2>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1f10] hover:bg-[#162e19] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition">
              <Plus size={14} />
              <span>Agregar Widget</span>
            </button>
          </div>

          {/* Container Grid Placeholder */}
          <div className="min-h-[220px] bg-[#09140a]/80 border-2 border-dashed border-[#1c391d] rounded-2xl p-8 flex flex-col items-center justify-center text-center group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-[#122614] border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Sección 2 — Widgets Secundarios
              </h2>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1f10] hover:bg-[#162e19] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition">
              <Plus size={14} />
              <span>Agregar Widget</span>
            </button>
          </div>

          {/* Container Grid Placeholder */}
          <div className="min-h-[220px] bg-[#09140a]/80 border-2 border-dashed border-[#1c391d] rounded-2xl p-8 flex flex-col items-center justify-center text-center group hover:border-teal-500/40 transition">
            <div className="w-12 h-12 rounded-2xl bg-[#122614] border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              [ + AGREGAR WIDGET / SECCIÓN 2 ]
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              Espacio reservado para los componentes de la segunda sección (ej. Tareas Ivy Lee, Agenda o Asistente IA).
            </p>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. FOOTER DISCRETO
         ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-4 border-t border-[#122414] text-center text-xs text-slate-500 font-mono">
        Nipëi OS • Portal Personal Aislado UI v1.0
      </footer>
    </div>
  );
}
