"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ShieldAlert, Lock, Unlock, HeartHandshake, Sparkles, Search,
  Calendar, ShoppingBag, DollarSign, Brain, FileCheck, Eye, EyeOff, UserCheck,
  ShieldCheck, AlertOctagon, TrendingUp
} from "lucide-react";
import {
  INITIAL_CUSTOMERS, INITIAL_CERTIFICATIONS,
  type CustomerProfile, type EthicalCertification, type SquadId
} from "@/lib/nipeiStore";

export default function NipeiPeopleView({ squadId = "super_user", nucleus = "sagrado" }: { squadId?: SquadId; nucleus?: "sagrado" | "comercial" }) {
  const [customers, setCustomers] = useState<CustomerProfile[]>(INITIAL_CUSTOMERS);
  const [certifications, setCertifications] = useState<EthicalCertification[]>(INITIAL_CERTIFICATIONS);
  const [selectedUser, setSelectedUser] = useState<CustomerProfile | null>(customers[0] ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSelfService, setShowSelfService] = useState(false);
  const [activeTab, setActiveTab] = useState<"crm" | "certificacao_veto" | "marketing_ltv">("crm");

  const isSacredUnlocked = nucleus === "sagrado" || squadId === "squad_7_instituto" || squadId === "super_user";

  function toggleCertification(productId: string) {
    setCertifications((prev) =>
      prev.map((c) => {
        if (c.productId === productId) {
          const nextStatus = c.status === "APROVADO_COMERCIAL" ? "VETADO_NUCLEO_SAGRADO" : "APROVADO_COMERCIAL";
          return {
            ...c,
            status: nextStatus,
            certifiedBy: nextStatus === "APROVADO_COMERCIAL" ? "Pajé Hushahu Yawanawá / Squad VII" : "VETADO por Conselho de Pajés",
          };
        }
        return c;
      })
    );
  }

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-[#1e381e] bg-[#0c140c] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
              Nipëi People
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#a7f3d0]">
              CRM Unificado 360º · Squad VII Veto Gate · LTV Analytics
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão 360º de Participantes & Veto Ético Sagrado</h2>
          <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed max-w-2xl">
            Articulação social com Aldeia Mutum, Certificação de Origem e blindagem de anamnese médica sob o Firewall Espiritual.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border ${
            isSacredUnlocked
              ? "bg-[#0c1c0c] border-[#22c55e] text-[#4ade80]"
              : "bg-[#1c0c0c] border-[#ef4444] text-[#ef4444]"
          }`}>
            {isSacredUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
            Firewall Espiritual: {isSacredUnlocked ? "ACESSO SAGRADO" : "NÚCLEO COMERCIAL (PROTEGIDO)"}
          </div>

          <button
            onClick={() => setShowSelfService(!showSelfService)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#142414] border border-[#22c55e] text-xs font-mono font-bold text-white hover:bg-[#1e381e] transition shadow-md"
          >
            <UserCheck size={15} className="text-[#22c55e]" /> Autoatendimento Participante
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e381e] pb-3 flex-wrap">
        {[
          { id: "crm", label: "CRM 360º & Fichas de Anamnese", icon: <Users size={14} /> },
          { id: "certificacao_veto", label: "Squad VII: Certificação de Origem & Veto Épico", icon: <ShieldCheck size={14} /> },
          { id: "marketing_ltv", label: "Squad IV: Marketing & LTV (Lifetime Value)", icon: <TrendingUp size={14} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition ${
                isActive
                  ? "bg-[#162416] text-white font-bold border border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414] hover:text-white"
              }`}
            >
              <span className={isActive ? "text-[#22c55e]" : "text-[#a7f3d0]"}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Participant Self-Service Portal Simulation Drawer */}
      <AnimatePresence>
        {showSelfService && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="text-[#22c55e]" size={16} /> Portal do Participante (Canal de Autoatendimento)
              </h3>
              <button onClick={() => setShowSelfService(false)} className="text-xs text-[#4ade80]">✕ Fechar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded border border-[#1e381e] bg-[#050805] space-y-2">
                <div className="text-xs font-bold text-[#4ade80]">1. Meus Retiros & Dietas</div>
                <p className="text-xs text-[#a7f3d0]">Dieta Samakey Inverno 2026 (Confirmada)</p>
                <div className="text-[10px] text-white font-mono">Status: Ficha Anamnese Preenchida</div>
              </div>

              <div className="p-4 rounded border border-[#1e381e] bg-[#050805] space-y-2">
                <div className="text-xs font-bold text-[#4ade80]">2. Minhas Encomendas Inî Rau</div>
                <p className="text-xs text-[#a7f3d0]">Pedido #8821: Preparação Nisurau (Em Transporte)</p>
                <div className="text-[10px] text-white font-mono">Código Rastreio: MUTUM-8821</div>
              </div>

              <div className="p-4 rounded border border-[#1e381e] bg-[#050805] space-y-2">
                <div className="text-xs font-bold text-[#4ade80]">3. Certificado de Doação</div>
                <p className="text-xs text-[#a7f3d0]">Contribuição Instituto Aldeia Mutum: R$ 300,00</p>
                <button className="px-2.5 py-1 rounded bg-[#142414] border border-[#22c55e] text-[10px] text-white hover:bg-[#1e381e]">
                  Baixar Recibo Éico PDF
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: CRM 360 */}
      {activeTab === "crm" && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6">
          {/* User Search & List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-[#4ade80]" size={14} />
              <input
                type="text"
                placeholder="Buscar participante por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md bg-[#0f190f] border border-[#1e381e] text-xs text-white placeholder-[#166534] focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scroll">
              {filteredCustomers.map((user) => {
                const active = selectedUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-3.5 rounded-lg border transition space-y-1.5 ${
                      active
                        ? "bg-[#142414] border-[#22c55e]"
                        : "bg-[#0f190f] border-[#1e381e] hover:bg-[#162416]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{user.name}</span>
                      <span className="pill pill-ok">{user.role}</span>
                    </div>
                    <div className="text-[11px] text-[#a7f3d0] truncate">{user.email}</div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#4ade80] pt-1">
                      <span>Vendas: R$ {user.totalSpent.toFixed(2)}</span>
                      <span>Doações: R$ {user.totalDonated.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 360º Detail */}
          {selectedUser ? (
            <div className="p-6 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1e381e] pb-4">
                <div>
                  <div className="text-xs font-mono text-[#22c55e] font-bold">{selectedUser.id}</div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-[#a7f3d0] font-mono">{selectedUser.email} · {selectedUser.phone}</p>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div className="p-2.5 rounded bg-[#050805] border border-[#1e381e]">
                    <div className="text-[10px] text-[#a7f3d0] font-mono">LTV Consolidado</div>
                    <div className="text-sm font-bold text-[#22c55e]">R$ {selectedUser.ltv.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* AI Emotional Intake */}
              <div className="p-4 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-[#22c55e]" size={16} />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Análise Preditiva & Emocional com IA</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#4ade80]">
                    Score Prontidão: {selectedUser.anamnesis.aiEmotionalScore}/100
                  </span>
                </div>
                <p className="text-xs text-[#a7f3d0] leading-relaxed">
                  "{selectedUser.anamnesis.aiNotes}"
                </p>
              </div>

              {/* Protected Anamnesis / Medical Vault */}
              <div className={`p-4 rounded-lg border space-y-3 ${
                isSacredUnlocked ? "bg-[#050805] border-[#22c55e]" : "bg-[#1c0c0c] border-[#ef4444]"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSacredUnlocked ? <Unlock size={16} className="text-[#22c55e]" /> : <Lock size={16} className="text-[#ef4444]" />}
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Ficha de Anamnese Espiritual & Dados Médicos Protegidos
                    </h4>
                  </div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isSacredUnlocked ? "text-[#4ade80]" : "text-[#ef4444]"
                  }`}>
                    {isSacredUnlocked ? "Acesso Sagrado Desbloqueado" : "Protegido pelo Firewall"}
                  </span>
                </div>

                {isSacredUnlocked ? (
                  <div className="space-y-2 text-xs font-mono text-[#a7f3d0] border-t border-[#1e381e] pt-3">
                    <div><strong className="text-white">Tipo Sangüíneo:</strong> {selectedUser.anamnesis.bloodType}</div>
                    <div><strong className="text-white">Alergias:</strong> {selectedUser.anamnesis.allergies.join(", ") || "Nenhuma"}</div>
                    <div><strong className="text-white">Medicamentos:</strong> {selectedUser.anamnesis.medications.join(", ") || "Nenhum"}</div>
                    <div><strong className="text-white">Intenção Espiritual:</strong> "{selectedUser.anamnesis.spiritualIntention}"</div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[#ef4444] space-y-2">
                    <ShieldAlert size={24} className="mx-auto" />
                    <p className="font-bold">Acesso restrito à equipe médica e terapêutica autorizada.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: SQUAD VII CERTIFICAÇÃO DE ORIGEM & VETO */}
      {activeTab === "certificacao_veto" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#22c55e]" /> Squad VII Instituto — Veto Comercial & Certificação de Origem
              </h3>
              <span className="pill pill-ok">Veto Sagrado Ativo</span>
            </div>

            <p className="text-xs text-[#a7f3d0]">
              Módulo exclusivo do Squad VII. Todo novo produto ou lote da bioeconomia (Squad II) precisa receber a **Certificação de Origem Épica** antes de ser disponibilizado para venda no e-commerce ou consumo nos retiros.
            </p>

            <div className="space-y-3 pt-2">
              {certifications.map((cert) => {
                const isApproved = cert.status === "APROVADO_COMERCIAL";
                return (
                  <div key={cert.productId} className="p-4 rounded border border-[#1e381e] bg-[#050805] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{cert.productName}</span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isApproved ? "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]" : "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]"
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#a7f3d0]">{cert.notes}</div>
                      <div className="text-[10px] text-[#4ade80] font-mono">Certificado por: {cert.certifiedBy} ({cert.certificationDate})</div>
                    </div>

                    <button
                      onClick={() => toggleCertification(cert.productId)}
                      className={`px-4 py-2 text-xs font-bold rounded flex items-center gap-1.5 font-mono transition ${
                        isApproved
                          ? "bg-[#381c1c] text-[#ef4444] border border-[#ef4444] hover:bg-[#501c1c]"
                          : "bg-[#22c55e] text-[#050805] hover:bg-[#4ade80]"
                      }`}
                    >
                      {isApproved ? <AlertOctagon size={13} /> : <ShieldCheck size={13} />}
                      {isApproved ? "Emitir Veto Comercial (Bloquear Venda)" : "Aprovar Certificação de Origem"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SQUAD IV MARKETING & LTV */}
      {activeTab === "marketing_ltv" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-[#22c55e]" /> Squad IV Marketing — Métricas LTV (Compras + Doações)
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              O valor do ciclo de vida do cliente (LTV) consolida compras na botica Inî Rau + doações ao Instituto Mutum.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customers.map((c) => (
                <div key={c.id} className="p-4 rounded border border-[#1e381e] bg-[#050805] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{c.name}</span>
                    <span className="pill pill-ok">LTV: R$ {c.ltv.toFixed(2)}</span>
                  </div>
                  <div className="text-xs font-mono text-[#a7f3d0] flex justify-between">
                    <span>Compras Inî Rau: R$ {c.totalSpent.toFixed(2)}</span>
                    <span>Doações Instituto: R$ {c.totalDonated.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
