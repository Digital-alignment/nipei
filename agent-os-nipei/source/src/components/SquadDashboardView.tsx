"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck, Brain, Package, Users, ShoppingBag, FileSpreadsheet, Wrench,
  DollarSign, Sparkles, Mic, FileText, QrCode, Layers, Lock, Unlock, TrendingUp,
  CheckCircle2, ArrowRight, Activity, AlertCircle, Eye, EyeOff
} from "lucide-react";
import {
  SQUADS, INITIAL_INVENTORY, INITIAL_CUSTOMERS, INITIAL_DRE, INITIAL_TASKS,
  INITIAL_CERTIFICATIONS, INITIAL_MAINTENANCE, INITIAL_CEO_ADVICE,
  type SquadId
} from "@/lib/nipeiStore";

export default function SquadDashboardView({ squadId }: { squadId: SquadId }) {
  const squad = SQUADS.find((s) => s.id === squadId) ?? SQUADS[1]!;

  return (
    <div className="space-y-8">
      {/* Squad Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-lg border border-[#1e381e] bg-[#0f190f]">
        <div>
          <div className="flex items-center gap-2">
            <span className="pill pill-ok">{squad.name}</span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
              Núcleo: {squad.nucleus} · Módulo: {squad.module}
            </span>
          </div>
          <h2 className="text-xl font-bold mt-2 text-white">Painel Operacional — {squad.name}</h2>
          <p className="text-xs text-[#a7f3d0] mt-1">{squad.description}</p>
        </div>

        <Link
          href="/agent-kanban"
          className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition"
        >
          <Brain size={15} /> Ver Kanban do Squad
        </Link>
      </div>

      {/* RENDER SQUAD SPECIFIC LAYOUT */}
      {squadId === "squad_7_instituto" && <Squad7Dashboard />}
      {squadId === "squad_1_ceo" && <Squad1Dashboard />}
      {squadId === "squad_2_mutum" && <Squad2Dashboard />}
      {squadId === "squad_3_retiros" && <Squad3Dashboard />}
      {squadId === "squad_4_vendas_mkt" && <Squad4Dashboard />}
      {squadId === "squad_5_adm_legal" && <Squad5Dashboard />}
      {squadId === "squad_6_infra" && <Squad6Dashboard />}
      {squadId === "super_user" && <Squad7Dashboard />}
    </div>
  );
}

{/* SQUAD VII — INSTITUTO / DONADORES */}
function Squad7Dashboard() {
  const totalDonated = INITIAL_CUSTOMERS.reduce((acc, curr) => acc + curr.totalDonated, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f]">
          <div className="text-xs text-[#a7f3d0] font-mono">Fundo Total Arrecadado</div>
          <div className="text-xl font-bold text-[#4ade80] font-mono mt-1">R$ {totalDonated.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f]">
          <div className="text-xs text-[#a7f3d0] font-mono">Doadores Ativos</div>
          <div className="text-xl font-bold text-white font-mono mt-1">12 Donantes</div>
        </div>
        <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f]">
          <div className="text-xs text-[#a7f3d0] font-mono">Projetos Comunitários Mutum</div>
          <div className="text-xl font-bold text-white font-mono mt-1">3 em andamento</div>
        </div>
      </div>

      {/* Panel Veto / Certificação */}
      <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#22c55e]" /> Painel de Veto Épico & Certificação de Origem
        </h3>
        <p className="text-xs text-[#a7f3d0]">
          Autorização final dos lotes do Squad II antes da disponibilização e-commerce.
        </p>

        <div className="space-y-2 pt-2">
          {INITIAL_CERTIFICATIONS.map((cert) => (
            <div key={cert.productId} className="p-3.5 rounded bg-[#050805] border border-[#1e381e] flex items-center justify-between text-xs font-mono">
              <div>
                <div className="font-bold text-white">{cert.productName}</div>
                <div className="text-[10px] text-[#a7f3d0]">Status: {cert.status}</div>
              </div>
              <Link href="/people" className="px-3 py-1 bg-[#22c55e] text-[#050805] font-bold rounded">
                Avaliar Certificação
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

{/* SQUAD I — ESTRATÉGIA / CEO */}
function Squad1Dashboard() {
  return (
    <div className="space-y-6">
      {/* Widget Mi Día con IA */}
      <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-[#22c55e]" /> Widget "Meu Dia com IA" (Priorização CEO)
        </h3>
        <div className="space-y-2">
          {INITIAL_CEO_ADVICE.map((item) => (
            <div key={item.id} className="p-3.5 rounded bg-[#050805] border border-[#1e381e] text-xs font-mono space-y-1">
              <div className="font-bold text-white flex justify-between">
                <span>{item.title}</span>
                <span className="text-[#4ade80]">Score: {item.priorityScore}/100</span>
              </div>
              <div className="text-[#a7f3d0]">💡 {item.suggestedAction}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

{/* SQUAD II — PRODUÇÃO MUTUM */}
function Squad2Dashboard() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Package size={16} className="text-[#22c55e]" /> Monitor da Cadeia de Suprimentos & Bioeconomia
        </h3>
        <p className="text-xs text-[#a7f3d0]">Fase de extração florestal na Aldeia Mutum e transporte fluvial para Bahía.</p>
        <Link href="/flow" className="inline-block px-4 py-2 bg-[#22c55e] text-[#050805] font-bold text-xs rounded">
          Acessar Nipëi Flow (Fichas Técnicas & QR Scanner)
        </Link>
      </div>
    </div>
  );
}

{/* SQUAD III — LOGÍSTICA RETIROS & HOSPITALIDADE */}
function Squad3Dashboard() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Users size={16} className="text-[#4ade80]" /> Gestão de Retiros Samakey & CRM 360º de Hóspedes
        </h3>
        <p className="text-xs text-[#a7f3d0]">Histórico de inscritos com tags de doadores e prontuários sob Firewall Espiritual.</p>
        <Link href="/people" className="inline-block px-4 py-2 bg-[#22c55e] text-[#050805] font-bold text-xs rounded">
          Acessar CRM 360º Hóspedes
        </Link>
      </div>
    </div>
  );
}

{/* SQUAD IV — VENDAS & MARKETING */}
function Squad4Dashboard() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag size={16} className="text-[#22c55e]" /> Monitor de Vendas Inî Rau & Health-Check Tech
        </h3>
        <p className="text-xs text-[#a7f3d0]">Baixa automática de estoques ao confirmar pagamento e métricas LTV.</p>
        <Link href="/flow" className="inline-block px-4 py-2 bg-[#22c55e] text-[#050805] font-bold text-xs rounded">
          Ver Automação de Pedidos
        </Link>
      </div>
    </div>
  );
}

{/* SQUAD V — ADM / LEGAL */}
function Squad5Dashboard() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#22c55e]" /> Painel Financeiro DRE & Arquivo Fiscal OCR
        </h3>
        <p className="text-xs text-[#a7f3d0]">Balanço mensal e conciliação de recibos enviados pelos Squads.</p>
        <Link href="/brain" className="inline-block px-4 py-2 bg-[#22c55e] text-[#050805] font-bold text-xs rounded">
          Ver DRE em Tempo Real
        </Link>
      </div>
    </div>
  );
}

{/* SQUAD VI — INFRAESTRUTURA & MANUTENÇÃO */}
function Squad6Dashboard() {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Wrench size={16} className="text-[#f59e0b]" /> Tabuleiro de Manutenção & Estoque de Reposição
        </h3>
        <p className="text-xs text-[#a7f3d0]">Gestão de reparos e descarte automático de peças técnicas.</p>
        <Link href="/flow" className="inline-block px-4 py-2 bg-[#22c55e] text-[#050805] font-bold text-xs rounded">
          Ver Chamados de Manutenção
        </Link>
      </div>
    </div>
  );
}
