"use client";

import React from "react";
import { X, CheckCircle2, Clock, Bot, Sparkles, Layers, ArrowRight, ShieldAlert } from "lucide-react";
import { OrbData } from "./OrbItem";

interface OrbDetailModalProps {
  orb: OrbData | null;
  onClose: () => void;
  onToggleStep?: (orbId: string, stepIndex: number) => void;
}

export default function OrbDetailModal({ orb, onClose, onToggleStep }: OrbDetailModalProps) {
  if (!orb) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#090d14] border rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col justify-between"
        style={{
          borderColor: orb.colorTheme.border,
          boxShadow: `0 20px 60px -15px ${orb.colorTheme.glow}`,
        }}
      >
        {/* Background Ambient Aura */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: orb.colorTheme.primary }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Orb Sphere Mini Badge */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg shrink-0"
              style={{
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${orb.colorTheme.primary} 60%, rgba(0,0,0,0.9))`,
                borderColor: orb.colorTheme.border,
              }}
            >
              <Sparkles size={20} className="text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {orb.phaseCategory}
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  {orb.timeframe}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                {orb.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 relative z-10 pr-1">
          {/* Description & Status Banner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Objetivo & Enfoque Metodológico
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {orb.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-mono font-bold text-white block">
                {orb.progressPercent}% Concluido
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Estado: {orb.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Active Methodologies Badges */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-emerald-400" />
              <span>Metodologías de Productividad Activas</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {orb.methodologies.map((m, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold"
                >
                  ⚡ {m}
                </span>
              ))}
            </div>
          </div>

          {/* Steps & Daily Flow Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Flujo de Ejecución del Orbe
            </h4>
            <div className="space-y-2">
              {orb.flowSteps.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => onToggleStep && onToggleStep(orb.id, idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    step.completed
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                      : "bg-white/5 border-white/10 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        step.completed
                          ? "bg-emerald-500 border-emerald-400 text-black"
                          : "border-slate-500"
                      }`}
                    >
                      {step.completed && <CheckCircle2 size={14} />}
                    </div>
                    <span className="text-xs font-medium">{step.step}</span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                    {step.methodologyTag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected AI Agents */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bot size={13} className="text-cyan-400" />
              <span>Agentes de IA Conectados</span>
            </h4>
            <div className="flex items-center gap-2">
              {orb.activeAgents.map((agent, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {agent}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
          <div className="text-[11px] font-mono text-slate-400">
            Nipëi OS • Sincronización en vivo con Mission Control
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <span>Cerrar Orbe</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
