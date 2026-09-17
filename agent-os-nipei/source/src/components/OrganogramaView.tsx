"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, ShieldCheck, Crown, Users, Brain, Workflow, Building2,
  Package, ShoppingBag, Wrench, FileSpreadsheet, ArrowUpRight, Sparkles,
  ChevronDown, CheckCircle2, UserCheck, Bot, Heart, Compass
} from "lucide-react";
import { SQUADS, type SquadId } from "@/lib/nipeiStore";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

interface TeamMember {
  name: string;
  role: string;
  type: "paje" | "human_lead" | "agent";
  avatar: string;
}

interface SquadOrgData {
  id: SquadId;
  name: string;
  nucleus: "Sagrado" | "Comercial";
  lead: string;
  pajeAdvisor?: string;
  agents: string[];
  members: TeamMember[];
  responsibilities: string[];
  kpis: string[];
}

const ORGANIGRAM_DATA: SquadOrgData[] = [
  {
    id: "squad_1_ceo",
    name: "Squad I — Estratégia / CEO",
    nucleus: "Comercial",
    lead: "Ana Castro (CEO / Direção Executiva)",
    agents: ["@antigravity", "@hermes"],
    members: [
      { name: "Ana Castro", role: "CEO & Líder de Estratégia", type: "human_lead", avatar: "👑" },
      { name: "@antigravity", role: "AI Mastermind & Orquestrador", type: "agent", avatar: "🤖" },
      { name: "@hermes", role: "AI Memória & Síntese de Projetos", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Definição do Roadmap de Produtos Nipëi OS",
      "Priorização de OKRs e Alocação de Capital",
      "Assistência de Agenda Executiva com IA",
      "Supervisão da Arquitetura Duplo Núcleo",
    ],
    kpis: ["Execução de Meta: 94%", "Retorno sobre Investimento: 3.4x", "Tarefas Concluídas: 48/52"],
  },
  {
    id: "squad_2_mutum",
    name: "Squad II — Produção Mutum",
    nucleus: "Sagrado",
    lead: "Pajé Mutum & Mestres Extrativistas",
    pajeAdvisor: "Pajé Mutum",
    agents: ["@openclaw"],
    members: [
      { name: "Pajé Mutum", role: "Líder Espiritual & Mestre de Colheita", type: "paje", avatar: "🌿" },
      { name: "Equipe Extrativista Mutum", role: "Mestres de Coleta Ritual", type: "human_lead", avatar: "👥" },
      { name: "@openclaw", role: "AI Trazabilidade de Lotes & Insumos", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Extrativismo Sustentável de Resina e Ervas Rituais",
      "Criação e Atualização de Fichas Técnicas",
      "Trazabilidade por Código QR do Rio Tarauacá até o Lab",
      "Controle de Qualidade das Matérias-Primas Âmbar",
    ],
    kpis: ["Alinhamento Ético: 100%", "Lotes Certificados: 18", "Pureza Matéria-Prima: 99.8%"],
  },
  {
    id: "squad_3_retiros",
    name: "Squad III — Retiros & Hospitalidade",
    nucleus: "Comercial",
    lead: "Coordenação de Hospedagem Serra Grande",
    agents: ["@claude"],
    members: [
      { name: "Coord. Serra Grande", role: "Líder de Hospitalidade & Vivências", type: "human_lead", avatar: "🏡" },
      { name: "Terapeutas Dietistas", role: "Acompanhamento de Imersão", type: "human_lead", avatar: "✨" },
      { name: "@claude", role: "AI Concierge & Logística de Participantes", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Gestão de Vagas dos Retiros Samakey",
      "Logística de Traslado e Hospedagem em Serra Grande",
      "Preparo de Dietas Rituais Personalizadas",
      "Acompanhamento Pós-Retiro dos Participantes",
    ],
    kpis: ["Satisfação Participantes: 98%", "Ocupação Retiros: 92%", "Check-in Seguro: 100%"],
  },
  {
    id: "squad_4_vendas_mkt",
    name: "Squad IV — Vendas & Marketing Tech",
    nucleus: "Comercial",
    lead: "Gestão E-Commerce Inî Rau & Growth",
    agents: ["@glm"],
    members: [
      { name: "Líder E-Commerce", role: "Gestor da Botica Inî Rau", type: "human_lead", avatar: "🛒" },
      { name: "Growth Specialist", role: "Tráfego & Funis de Conversão", type: "human_lead", avatar: "📈" },
      { name: "@glm", role: "AI Automação de Vendas & Campanhas", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Operação da Loja Virtual Inî Rau (nipeihu.org)",
      "Automação de Checkout e Baixa Automática no Estoque",
      "Campanhas de Marketing de Impacto Social",
      "Atendimento ao Cliente e Suporte de Pedidos",
    ],
    kpis: ["Pedidos Mensais: 145", "Taxa de Conversão: 4.2%", "Tempo Resposta SAC: 2m"],
  },
  {
    id: "squad_5_adm_legal",
    name: "Squad V — Adm / Legal / Financeiro",
    nucleus: "Comercial",
    lead: "Controladoria Executiva & Assessoria Jurídica",
    agents: ["@claude"],
    members: [
      { name: "Controlador Financeiro", role: "Gestor de DRE & Centro de Custos", type: "human_lead", avatar: "📊" },
      { name: "Advogado Societário", role: "Conformidade Legal & Contratos", type: "human_lead", avatar: "⚖️" },
      { name: "@claude", role: "AI Auditor de DRE & NFe", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Consolidação Financeira em Tempo Real (DRE Nipëi OS)",
      "Gestão de Contas a Pagar e Receber",
      "Emissão de Notas Fiscais Eletrônicas",
      "Contratos de Parceria e Proteção Jurídica do Instituto",
    ],
    kpis: ["DRE Atualizado: 100%", "Inadimplência: < 1.2%", "Repasse Mutum: R$ 17.200"],
  },
  {
    id: "squad_6_infra",
    name: "Squad VI — Infraestrutura & Manutenção",
    nucleus: "Comercial",
    lead: "Supervisão de Manutenção de Campo",
    agents: ["@hermes"],
    members: [
      { name: "Supervisora Manutenção", role: "Gestora de Obras & Manutenção", type: "human_lead", avatar: "🛠️" },
      { name: "Técnico de Campo", role: "Reparos & Inventário de Peças", type: "human_lead", avatar: "🔧" },
      { name: "@hermes", role: "AI Despachante de Ordens de Serviço", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Ordens de Serviço de Manutenção Preventiva e Corretiva",
      "Controle de Inventário de Peças de Reposição",
      "Manutenção das Instalações da Aldeia Mutum e Serra Grande",
      "Segurança e Abastecimento Energético Sol-Bateria",
    ],
    kpis: ["Tempo Médio Reparo: 4h", "Peças em Estoque: 84 Unid", "Zero Downtime"],
  },
  {
    id: "squad_7_instituto",
    name: "Squad VII — Instituto Nipëihu",
    nucleus: "Sagrado",
    lead: "Conselho Espiritual & Veto Gate Ético",
    pajeAdvisor: "Pajé Mutum & Anciãos",
    agents: ["@antigravity"],
    members: [
      { name: "Conselho de Pajés", role: "Guardiões do Conhecimento Ancestral", type: "paje", avatar: "🔥" },
      { name: "Gestor de Doações", role: "Relações com Doadores Internacionais", type: "human_lead", avatar: "🤝" },
      { name: "@antigravity", role: "AI Fiscal de Veto Gate & Certificação", type: "agent", avatar: "🤖" },
    ],
    responsibilities: [
      "Emissão da Certificação Épica de Origem para Lotes",
      "Exercício do Veto Gate Ético sobre Produtos Comerciais",
      "Gestão de Doadores e Prestação de Contas Transparente",
      "Preservação da Língua, Ritos e Cultura Huni Kuin/Mutum",
    ],
    kpis: ["Certificações Emitidas: 100%", "Doações Captadas: R$ 42.500", "Veto Gate Ativo"],
  },
];

export default function OrganogramaView() {
  const [selectedSquad, setSelectedSquad] = useState<SquadId | "all">("all");
  const [showArchifyWorkflow, setShowArchifyWorkflow] = useState<boolean>(false);

  const filteredSquads =
    selectedSquad === "all"
      ? ORGANIGRAM_DATA
      : ORGANIGRAM_DATA.filter((s) => s.id === selectedSquad);

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-[#22c55e] bg-[#091409] relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
                Estrutura Organizacional Nipëi OS
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[#0f190f] border border-[#1e381e] text-[10px] font-mono text-[#a7f3d0]">
                Duplo Núcleo: Sagrado & Comercial
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Organograma Global & Hierarquia por Squad
            </h1>
            <p className="text-xs text-[#a7f3d0] max-w-2xl leading-relaxed font-mono">
              Mapeamento completo de lideranças humanas (Pajés, Direção Executiva), agentes de Inteligência Artificial e responsabilidades operacionais dos 7 Squads.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Network size={28} className="text-[#22c55e] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Filter Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll">
        <button
          onClick={() => {
            setSelectedSquad("all");
            setShowArchifyWorkflow(false);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
            selectedSquad === "all" && !showArchifyWorkflow
              ? "bg-[#22c55e] text-[#050805] shadow"
              : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
          }`}
        >
          🌐 Organograma Global (Duplo Núcleo)
        </button>

        <button
          onClick={() => setShowArchifyWorkflow(!showArchifyWorkflow)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 flex items-center gap-1.5 border ${
            showArchifyWorkflow
              ? "bg-[#142614] text-[#22c55e] border-[#22c55e]"
              : "bg-[#091409] text-[#a7f3d0] border-[#1e381e] hover:bg-[#142414]"
          }`}
        >
          <Workflow size={13} />
          <span>{showArchifyWorkflow ? "Ocultar Diagrama Workflow" : "📐 Diagrama Archify Workflow"}</span>
        </button>

        {SQUADS.filter((s) => s.id !== "super_user").map((sq) => (
          <button
            key={sq.id}
            onClick={() => {
              setSelectedSquad(sq.id);
              setShowArchifyWorkflow(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
              selectedSquad === sq.id && !showArchifyWorkflow
                ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
            }`}
          >
            {sq.name.split("—")[0]}
          </button>
        ))}
      </div>

      {/* Archify Interactive Workflow View */}
      {showArchifyWorkflow && (
        <div className="space-y-4">
          <ArchifyDiagramWidget
            prebuiltId="squads-operations-workflow"
            defaultTopic="Operaciones de Squads, Trazabilidad e Impacto"
            defaultType="workflow"
            title="Diagrama Interactivo Archify — Workflow Operacional dos 7 Squads"
            height="580px"
          />
        </div>
      )}

      {/* 0. Duplo Núcleo High Level Structure Diagram */}
      {selectedSquad === "all" && (
        <div className="p-6 rounded-xl border border-[#1e381e] bg-[#0f190f] space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <div className="text-xs font-mono text-[#22c55e] font-bold uppercase tracking-widest">
              Alta Direção & Arquitetura Duplo Núcleo
            </div>
            <h2 className="text-lg font-bold text-white">Conselho de Governança Nipëi OS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Núcleo Sagrado Card */}
            <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0c1c0c] space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#4ade80] flex items-center gap-2">
                  <ShieldCheck size={16} /> NÚCLEO SAGRADO (Instituto Nipëihu)
                </span>
                <span className="pill pill-ok text-[10px]">Veto Gate Ativo</span>
              </div>
              <div className="text-sm font-bold text-white">Conselho de Pajés & Anciãos Mutum</div>
              <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed">
                Supervisão de ritos, preservação de dietas Samakey, sabedoria ancestral da floresta e emissão da Certificação Ética de Origem (Squad VII & Squad II).
              </p>
              <div className="pt-2 border-t border-[#1e381e] flex items-center justify-between text-xs font-mono text-[#4ade80]">
                <span>Liderança: Pajé Mutum</span>
                <span>Squads: II, VII</span>
              </div>
            </div>

            {/* Núcleo Comercial Card */}
            <div className="p-5 rounded-lg border border-[#10b981] bg-[#091812] space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#34d399] flex items-center gap-2">
                  <Building2 size={16} /> NÚCLEO OPERACIONAL / COMERCIAL
                </span>
                <span className="pill pill-ok text-[10px]">DRE Ativo</span>
              </div>
              <div className="text-sm font-bold text-white">Direção Executiva (CEO) & Gestão</div>
              <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed">
                Operação da Botica Inî Rau, retiros Samakey em Serra Grande, gestão financeira, tecnologia, vendas e infraestrutura (Squads I, III, IV, V, VI).
              </p>
              <div className="pt-2 border-t border-[#1e381e] flex items-center justify-between text-xs font-mono text-[#34d399]">
                <span>Liderança: Ana Castro (CEO)</span>
                <span>Squads: I, III, IV, V, VI</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Squad Detailed Organigram Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSquads.map((sq) => (
          <div
            key={sq.id}
            className="p-5 rounded-xl border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] transition space-y-4 shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
                    {sq.nucleus === "Sagrado" ? "🌿 Núcleo Sagrado" : "💼 Núcleo Comercial"}
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{sq.name}</h3>
                </div>
                <Link
                  href={`/squads/${sq.id}`}
                  className="p-1.5 rounded bg-[#050805] text-[#22c55e] hover:bg-[#142414] transition"
                  title="Abrir Dashboard do Squad"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>

              {/* Leader & AI Agents */}
              <div className="space-y-2 font-mono text-xs">
                <div className="text-[10px] text-[#a7f3d0] uppercase font-bold">Membros & Agentes Atribuidos</div>

                <div className="space-y-1.5">
                  {sq.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#050805] border border-[#1e381e] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.avatar}</span>
                        <div>
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-[10px] text-[#a7f3d0]">{m.role}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          m.type === "paje"
                            ? "bg-[#1c120c] text-[#f59e0b] border border-[#f59e0b]"
                            : m.type === "agent"
                            ? "bg-[#140c1c] text-[#a855f7] border border-[#a855f7]"
                            : "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]"
                        }`}
                      >
                        {m.type === "paje" ? "Pajé / Conselheiro" : m.type === "agent" ? "Agente IA" : "Líder Humano"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-[10px] text-[#a7f3d0] uppercase font-bold">Responsabilidades Principais</div>
                <ul className="space-y-1 text-[11px] text-[#a7f3d0]">
                  {sq.responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#22c55e] font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Squad KPIs Footer */}
            <div className="pt-3 border-t border-[#142414] flex flex-wrap gap-1.5">
              {sq.kpis.map((kpi, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#050805] text-[#4ade80] border border-[#1e381e]"
                >
                  {kpi}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
