"use client";

import { Activity, ShieldCheck, Zap, Layers } from "lucide-react";
import { SQUADS } from "@/lib/nipeiStore";

export default function SquadPerformanceRadar() {
  const SQUAD_SCORES = [
    { id: "squad_7_instituto", name: "Squad VII (Instituto)", velocity: 96, ethical: 100, budget: 98 },
    { id: "squad_1_ceo", name: "Squad I (CEO / Estratégia)", velocity: 94, ethical: 95, budget: 92 },
    { id: "squad_2_mutum", name: "Squad II (Produção Mutum)", velocity: 90, ethical: 100, budget: 95 },
    { id: "squad_3_retiros", name: "Squad III (Retiros & Hosp)", velocity: 88, ethical: 98, budget: 90 },
    { id: "squad_4_vendas_mkt", name: "Squad IV (Vendas & Tech)", velocity: 95, ethical: 92, budget: 94 },
    { id: "squad_5_adm_legal", name: "Squad V (Adm / Legal)", velocity: 92, ethical: 96, budget: 99 },
    { id: "squad_6_infra", name: "Squad VI (Infraestrutura)", velocity: 86, ethical: 94, budget: 91 },
  ];

  return (
    <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#22c55e]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Radar de Rendimento & Índice Ético por Squad (Gobernanza)
          </h3>
        </div>
        <span className="pill pill-ok">Métricas Ativas</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {SQUAD_SCORES.map((s) => (
          <div key={s.id} className="p-3.5 rounded bg-[#050805] border border-[#1e381e] space-y-2 font-mono text-xs">
            <div className="font-bold text-white flex items-center justify-between">
              <span>{s.name}</span>
              <span className="text-[#4ade80]">{s.velocity}% Vel</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#a7f3d0]">
                <span>Alinhamento Ético:</span>
                <span className="text-[#22c55e] font-bold">{s.ethical}%</span>
              </div>
              <div className="w-full bg-[#142414] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#22c55e] h-full rounded-full" style={{ width: `${s.ethical}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#a7f3d0]">
                <span>Conformidade DRE:</span>
                <span className="text-[#4ade80] font-bold">{s.budget}%</span>
              </div>
              <div className="w-full bg-[#142414] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#4ade80] h-full rounded-full" style={{ width: `${s.budget}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
