"use client";

import React from "react";
import { Calendar, Clock, MapPin, Users, Sparkles, ChevronRight } from "lucide-react";

export interface AgendaEvent {
  id: string;
  title: string;
  time: string;
  type: "ceremonia" | "qbr" | "squad_sync" | "entrega";
  squadOrCompany: string;
  locationOrUrl?: string;
}

const DEFAULT_EVENTS: AgendaEvent[] = [
  { id: "e1", title: "Cerimônia Sagrada Uni & Rezo Matinal", time: "07:00", type: "ceremonia", squadOrCompany: "Squad I Espiritualidade", locationOrUrl: "Aldeia Mutum" },
  { id: "e2", title: "Sincronização de Conhecimento e Vault", time: "10:30", type: "squad_sync", squadOrCompany: "Squad VB Governança", locationOrUrl: "Hermes Room / @vaultkeeper" },
  { id: "e3", title: "Revisão do Catálogo & Lançamento MUV", time: "15:00", type: "entrega", squadOrCompany: "Squad IV Vendas", locationOrUrl: "Nipëi Control System" },
];

export default function AgendaWidget() {
  return (
    <div className="bg-[#0b170c] border border-[#1e381e] rounded-xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#183019]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Agenda & Compromissos</h3>
            <p className="text-[11px] text-slate-400">Reuniões, entregas e rituais do dia</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
          Hoje ({new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })})
        </span>
      </div>

      {/* Events List */}
      <div className="flex-1 mt-4 space-y-3 overflow-y-auto max-h-[300px] pr-1">
        {DEFAULT_EVENTS.map((event) => (
          <div
            key={event.id}
            className="p-3.5 rounded-xl bg-[#102012] border border-[#1c391f] hover:border-emerald-500/40 transition flex items-start gap-3 group"
          >
            <div className="px-2.5 py-1 rounded-lg bg-[#162e18] border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold shrink-0 flex items-center gap-1">
              <Clock size={12} />
              <span>{event.time}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition">
                {event.title}
              </h4>

              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 text-emerald-400/90 font-medium">
                  <Users size={11} />
                  {event.squadOrCompany}
                </span>

                {event.locationOrUrl && (
                  <span className="inline-flex items-center gap-1 text-slate-400 truncate">
                    <MapPin size={11} />
                    {event.locationOrUrl}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition self-center shrink-0" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[#183019] flex justify-between items-center text-xs text-slate-400">
        <span>3 eventos agendados para hoje</span>
        <button className="text-emerald-400 hover:underline font-semibold text-xs">
          Ver Agenda Completa →
        </button>
      </div>
    </div>
  );
}
