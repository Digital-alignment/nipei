"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain, ShieldCheck, Package, Users, DollarSign, CheckSquare, Sparkles,
  TrendingUp, AlertTriangle, ArrowUpRight, Crown, Scale, Layers, Activity,
  Zap, Wrench, ShoppingBag, FileSpreadsheet, Bot, ChevronRight, CheckCircle2
} from "lucide-react";
import {
  INITIAL_INVENTORY, INITIAL_CUSTOMERS, INITIAL_DRE, INITIAL_TASKS,
  INITIAL_CERTIFICATIONS, INITIAL_PASSIVE_LOGS, SQUADS, type GlobalTask
} from "@/lib/nipeiStore";

import AgentSwarmTerminal from "./AgentSwarmTerminal";
import LogisticsMapTracker from "./LogisticsMapTracker";
import FinancialProjectionSimulator from "./FinancialProjectionSimulator";
import MedicalRiskMatrix from "./MedicalRiskMatrix";
import SquadPerformanceRadar from "./SquadPerformanceRadar";

export default function MasterDashboardView() {
  const [tasks, setTasks] = useState<GlobalTask[]>(INITIAL_TASKS);

  // Compute Trinômio Ativo Metrics
  const totalStockItems = INITIAL_INVENTORY.reduce((acc, curr) => acc + curr.stock, 0);
  const totalPeopleCRM = INITIAL_CUSTOMERS.length;
  const totalDonations = INITIAL_CUSTOMERS.reduce((acc, curr) => acc + curr.totalDonated, 0);
  const totalRevenue = INITIAL_DRE.filter((d) => d.type === "receita").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = INITIAL_DRE.filter((d) => d.type === "despesa").reduce((acc, curr) => acc + curr.amount, 0);
  const netDRE = totalRevenue - totalExpenses;

  // Monitor de Blindagem (Equilíbrio Sagrado/Comercial)
  const totalCertifications = INITIAL_CERTIFICATIONS.length;
  const approvedCertifications = INITIAL_CERTIFICATIONS.filter((c) => c.status === "APROVADO_COMERCIAL").length;
  const alignmentPercentage = Math.round((approvedCertifications / (totalCertifications || 1)) * 100);

  function getSquadIcon(iconName: string) {
    switch (iconName) {
      case "ShieldCheck": return <ShieldCheck size={18} className="text-[#4ade80]" />;
      case "Brain": return <Brain size={18} className="text-[#22c55e]" />;
      case "Package": return <Package size={18} className="text-[#a7f3d0]" />;
      case "Calendar": return <Users size={18} className="text-[#22c55e]" />;
      case "ShoppingBag": return <ShoppingBag size={18} className="text-[#4ade80]" />;
      case "FileSpreadsheet": return <FileSpreadsheet size={18} className="text-[#22c55e]" />;
      case "Wrench": return <Wrench size={18} className="text-[#f59e0b]" />;
      default: return <Crown size={18} className="text-[#22c55e]" />;
    }
  }

  return (
    <div className="space-y-8">
      {/* 0. Duplo Núcleo Master Header Banner */}
      <div className="p-6 rounded-xl border border-[#22c55e] bg-[#091409] relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
                Nipëi OS Mission Control
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[#0f190f] border border-[#1e381e] text-[10px] font-mono text-[#a7f3d0]">
                Arquitetura Duplo Núcleo
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sistema Operacional Centralizado & Governança
            </h1>
            <p className="text-xs text-[#a7f3d0] max-w-2xl leading-relaxed">
              Eliminando a fragmentação de dados, blindando a integridade espiritual/cultural e optimizando a cadeia de valor física e financeira através das 3 bases mestras integradas.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="p-3 rounded-lg border border-[#1e381e] bg-[#050805] text-center min-w-[120px]">
              <div className="text-[10px] text-[#a7f3d0] font-mono uppercase">Núcleo Sagrado</div>
              <div className="text-xs font-bold text-[#4ade80] font-mono mt-0.5 flex items-center justify-center gap-1">
                <ShieldCheck size={13} /> Protegido
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[#1e381e] bg-[#050805] text-center min-w-[120px]">
              <div className="text-[10px] text-[#a7f3d0] font-mono uppercase">Núcleo Comercial</div>
              <div className="text-xs font-bold text-[#22c55e] font-mono mt-0.5 flex items-center justify-center gap-1">
                <Activity size={13} /> DRE Ativo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Primary Operations Row: AI Swarm Telemetry & Squad Radar */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentSwarmTerminal />
        <SquadPerformanceRadar />
      </section>

      {/* 2. Trinômio Ativo Top Bar (KPIs Nipëi Flow, People & Brain) */}
      <section className="space-y-4">
        <div className="eyebrow mb-2">
          <span className="num">I.</span>
          <span className="line" />
          <span className="label">Dashboard Consolidado Global · Trinômio Ativo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nipëi Flow KPI Card */}
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] transition space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#a7f3d0] font-bold flex items-center gap-2">
                <Package size={16} className="text-[#22c55e]" /> Nipëi Flow (Operações & Insumos)
              </span>
              <span className="pill pill-ok font-mono text-[10px]">Estoque Ok</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{totalStockItems} Unidades</div>
            <p className="text-[11px] text-[#a7f3d0]">
              Automação de estoque em tempo real, baixas por Ficha Técnica e trazabilidade Aldeia Mutum.
            </p>
            <div className="flex items-center justify-between text-xs font-mono text-[#a7f3d0] pt-2 border-t border-[#142414]">
              <span>QR Scanner & OCR Active</span>
              <Link href="/flow" className="text-[#22c55e] hover:underline font-bold flex items-center gap-1">
                Abrir Flow <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* Nipëi People KPI Card */}
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] hover:border-[#4ade80] transition space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#a7f3d0] font-bold flex items-center gap-2">
                <Users size={16} className="text-[#4ade80]" /> Nipëi People (CRM 360º)
              </span>
              <span className="pill pill-ok font-mono text-[10px]">Firewall Ativo</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{totalPeopleCRM} Participantes</div>
            <p className="text-[11px] text-[#a7f3d0]">
              Perfil único, blindagem de anamnese médico-espiritual e análise preditiva de intenção com IA.
            </p>
            <div className="flex items-center justify-between text-xs font-mono text-[#a7f3d0] pt-2 border-t border-[#142414]">
              <span>Doações: R$ {totalDonations.toFixed(2)}</span>
              <Link href="/people" className="text-[#4ade80] hover:underline font-bold flex items-center gap-1">
                Abrir People <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* Nipëi Brain KPI Card */}
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] hover:border-[#10b981] transition space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#a7f3d0] font-bold flex items-center gap-2">
                <Brain size={16} className="text-[#10b981]" /> Nipëi Brain (Governança & DRE)
              </span>
              <span className="pill pill-ok font-mono text-[10px]">DRE em Dia</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              R$ {netDRE.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-[#a7f3d0]">
              Relatórios financeiros em tempo real, centro de custos e IA assistente de agenda do CEO.
            </p>
            <div className="flex items-center justify-between text-xs font-mono text-[#a7f3d0] pt-2 border-t border-[#142414]">
              <span>Meta Executada: 84%</span>
              <Link href="/brain" className="text-[#10b981] hover:underline font-bold flex items-center gap-1">
                Abrir Brain <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Strategic Logistics & Financial Projection Simulator Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LogisticsMapTracker />
        <FinancialProjectionSimulator />
      </section>

      {/* 4. Safety & Governance Row: Monitor de Blindagem + Medical Risk Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-[#22c55e]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Monitor de Blindagem (Equilíbrio Sagrado / Comercial)
                </h3>
              </div>
              <span className="pill pill-ok font-mono text-[10px]">Veto Gate Squad VII</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#a7f3d0]">Alinhamento Ético & Origem:</span>
                <span className="text-[#22c55e] font-bold">{alignmentPercentage}%</span>
              </div>
              <div className="w-full bg-[#050805] border border-[#1e381e] h-3 rounded-full overflow-hidden p-0.5">
                <div className="bg-[#22c55e] h-full rounded-full transition-all duration-500" style={{ width: `${alignmentPercentage}%` }} />
              </div>
              <p className="text-[11px] text-[#a7f3d0] leading-relaxed font-mono">
                O Conselho de Pajés do Squad VII validou <strong className="text-white">{approvedCertifications} de {totalCertifications}</strong> lotes. Nenhum produto sai comercialmente sem certificação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#142414] flex-wrap">
            {INITIAL_CERTIFICATIONS.map((c) => (
              <span
                key={c.productId}
                className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${
                  c.status === "APROVADO_COMERCIAL"
                    ? "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]"
                    : "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]"
                }`}
              >
                {c.productName}: {c.status}
              </span>
            ))}
          </div>
        </div>

        <MedicalRiskMatrix />
      </section>

      {/* 5. Centro de Control: "Minhas Tarefas Global" */}
      <section className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-[#22c55e]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Centro de Control — "Minhas Tarefas Global" (Visão Consolidada)
            </h3>
          </div>
          <Link href="/agent-kanban" className="text-xs font-mono text-[#22c55e] hover:underline font-bold flex items-center gap-1">
            Abrir Quadro Kanban <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.slice(0, 4).map((t) => {
            const squadMeta = SQUADS.find((s) => s.id === t.squad);
            return (
              <div
                key={t.id}
                className="p-4 rounded-lg border border-[#1e381e] bg-[#050805] flex flex-col justify-between space-y-2 hover:border-[#22c55e] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-bold text-white">{t.title}</div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                    t.priority === "urgente" ? "bg-[#381c1c] text-[#ef4444]" : "bg-[#142414] text-[#4ade80]"
                  }`}>
                    {t.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#a7f3d0] pt-2 border-t border-[#142414]">
                  <span>🏛️ {squadMeta?.name.split("—")[0]}</span>
                  <span className="text-[#4ade80]">Agentes: @{t.assignedAgents.join(", @")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Squad Operational Dashboards Grid */}
      <section className="space-y-4">
        <div className="eyebrow mb-2">
          <span className="num">II.</span>
          <span className="line" />
          <span className="label">Painéis de Controle por Squad Operacional</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SQUADS.filter((s) => s.id !== "super_user").map((squad) => (
            <Link
              key={squad.id}
              href={`/squads/${squad.id}`}
              className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] hover:bg-[#162416] transition space-y-2.5 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSquadIcon(squad.iconName)}
                    <span className="text-xs font-bold text-white group-hover:text-[#22c55e] transition truncate">
                      {squad.name.split("—")[0]}
                    </span>
                  </div>
                  <ArrowUpRight size={15} className="text-[#a7f3d0] group-hover:text-[#22c55e] shrink-0" />
                </div>
                <div className="text-[11px] font-bold text-[#4ade80]">{squad.name.split("—")[1] || squad.name}</div>
                <p className="text-[11px] text-[#a7f3d0] leading-relaxed line-clamp-2">{squad.description}</p>
              </div>

              <div className="text-[10px] text-[#22c55e] font-mono font-bold uppercase pt-2 border-t border-[#142414] flex items-center justify-between">
                <span>Módulo: {squad.module}</span>
                <span className="text-[#a7f3d0]">{squad.nucleus}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
