"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, Sliders, HeartHandshake, ShieldCheck } from "lucide-react";

export default function FinancialProjectionSimulator() {
  const [retreatAttendees, setRetreatAttendees] = useState(15);
  const [ecommerceOrders, setEcommerceOrders] = useState(45);

  const pricePerRetreat = 1200; // R$ 1.200 per attendee
  const pricePerOrder = 95; // R$ 95 per botica order average

  const retreatRevenue = retreatAttendees * pricePerRetreat;
  const ecommerceRevenue = ecommerceOrders * pricePerOrder;
  const totalGross = retreatRevenue + ecommerceRevenue;

  const estimatedExpenses = totalGross * 0.35; // 35% operational expenses
  const projectedNetDRE = totalGross - estimatedExpenses;

  return (
    <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#22c55e]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Simulador Preditivo de Flujo de Caja & DRE (Nipëi Brain)
            </h3>
          </div>
          <p className="text-xs text-[#a7f3d0] mt-0.5 font-mono">
            Projeção em tempo real de receitas de e-commerce e repasse ao Instituto Mutum.
          </p>
        </div>
        <span className="pill pill-ok">Squad V Adm/Legal</span>
      </div>

      {/* Sliders Control */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg bg-[#050805] border border-[#1e381e] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#a7f3d0] font-bold">Inscrições Retiro Samakey (Mensal):</span>
            <span className="text-white font-bold text-sm">{retreatAttendees} Participantes</span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            value={retreatAttendees}
            onChange={(e) => setRetreatAttendees(Number(e.target.value))}
            className="w-full accent-[#22c55e] cursor-pointer"
          />
          <div className="text-[10px] text-[#4ade80] font-mono">
            Receita Estimada Retiros: R$ {retreatRevenue.toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#050805] border border-[#1e381e] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#a7f3d0] font-bold">Pedidos E-Commerce Inî Rau (Mensal):</span>
            <span className="text-white font-bold text-sm">{ecommerceOrders} Pedidos</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            value={ecommerceOrders}
            onChange={(e) => setEcommerceOrders(Number(e.target.value))}
            className="w-full accent-[#22c55e] cursor-pointer"
          />
          <div className="text-[10px] text-[#4ade80] font-mono">
            Receita Estimada Botica: R$ {ecommerceRevenue.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Projection Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded bg-[#050805] border border-[#1e381e] space-y-1">
          <div className="text-[10px] text-[#a7f3d0] font-mono uppercase">Receita Bruta Projetada</div>
          <div className="text-xl font-bold text-[#4ade80] font-mono">
            R$ {totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 rounded bg-[#050805] border border-[#1e381e] space-y-1">
          <div className="text-[10px] text-[#a7f3d0] font-mono uppercase">Despesas Operacionais (35%)</div>
          <div className="text-xl font-bold text-[#ef4444] font-mono">
            - R$ {estimatedExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 rounded bg-[#0c1c0c] border border-[#22c55e] space-y-1">
          <div className="text-[10px] text-[#4ade80] font-mono uppercase font-bold flex items-center gap-1">
            <HeartHandshake size={14} /> Repasse Instituto Mutum (Net DRE)
          </div>
          <div className="text-xl font-bold text-white font-mono">
            R$ {projectedNetDRE.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
