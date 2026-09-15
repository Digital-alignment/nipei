"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, DollarSign, CheckSquare, MessageSquare, Mic, Image, Plus,
  TrendingUp, TrendingDown, Layers, FileSpreadsheet, ShieldCheck, Sparkles,
  Calendar, AlertCircle, FileText, CheckCircle2, Clock
} from "lucide-react";
import {
  INITIAL_DRE, INITIAL_TASKS, INITIAL_PASSIVE_LOGS, INITIAL_CEO_ADVICE,
  type DREEntry, type GlobalTask, type PassiveCaptureLog, type CEOAITaskAdvice, type SquadId
} from "@/lib/nipeiStore";

export default function NipeiBrainView({ squadId = "super_user", nucleus = "comercial" }: { squadId?: SquadId; nucleus?: "sagrado" | "comercial" }) {
  const [dreList, setDreList] = useState<DREEntry[]>(INITIAL_DRE);
  const [tasks, setTasks] = useState<GlobalTask[]>(INITIAL_TASKS);
  const [passiveLogs, setPassiveLogs] = useState<PassiveCaptureLog[]>(INITIAL_PASSIVE_LOGS);
  const [ceoAdvice, setCeoAdvice] = useState<CEOAITaskAdvice[]>(INITIAL_CEO_ADVICE);
  const [simulatingAudio, setSimulatingAudio] = useState(false);
  const [activeTab, setActiveTab] = useState<"tarefas" | "ceo_ai" | "dre_financeiro" | "whatsapp_bot">("tarefas");

  const totalReceita = dreList
    .filter((d) => d.type === "receita")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalDespesa = dreList
    .filter((d) => d.type === "despesa")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netDRE = totalReceita - totalDespesa;

  function toggleTaskStatus(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === "concluido" ? "pendente" : "concluido" } : t
      )
    );
  }

  function handleSimulateWhatsAppAudio() {
    setSimulatingAudio(true);
    setTimeout(() => {
      setSimulatingAudio(false);
      const newLog: PassiveCaptureLog = {
        id: `LOG-${Date.now().toString().slice(-3)}`,
        timestamp: "Agora mesmo",
        source: "WhatsApp Audio",
        sender: "Jordão Pekûti",
        transcription: "Registrar despesa de 350 reais para combustível de barco na logística de coleta em Mutum.",
        parsedAction: "Lançamento Financeiro R$ 350,00 (Squad II)",
        status: "Processado",
      };
      setPassiveLogs((prev) => [newLog, ...prev]);

      const newDRE: DREEntry = {
        id: `FIN-${Date.now().toString().slice(-3)}`,
        date: "2026-08-11",
        description: "Combustível Barco Mutum (Via Áudio WhatsApp Bot)",
        type: "despesa",
        amount: 350.0,
        costCenter: "Instituto Mutum",
        squad: "Squad II",
        whatsappLogged: true,
      };
      setDreList((prev) => [newDRE, ...prev]);
    }, 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-[#1e381e] bg-[#0c140c] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
              Nipëi Brain
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#a7f3d0]">
              Governança · Squad I CEO AI · Squad V Financeiro & Legal
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Governança, DRE Real-Time & IA de Priorização</h2>
          <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed max-w-2xl">
            Task Manager Global ("Minhas Tarefas"), assistente de agenda do CEO e captura passiva via WhatsApp.
          </p>
        </div>

        <button
          onClick={handleSimulateWhatsAppAudio}
          disabled={simulatingAudio}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#142414] border border-[#22c55e] text-xs font-mono font-bold text-white hover:bg-[#1e381e] transition disabled:opacity-50 shadow-md shrink-0"
        >
          <Mic size={15} className="text-[#22c55e]" /> {simulatingAudio ? "IA Processando Áudio..." : "WhatsApp Bot: Dictar Gastos"}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e381e] pb-3 flex-wrap">
        {[
          { id: "tarefas", label: "Minhas Tarefas (Task Manager Global)", icon: <CheckSquare size={14} /> },
          { id: "ceo_ai", label: "Squad I: CEO AI Assistant (Priorização)", icon: <Brain size={14} /> },
          { id: "dre_financeiro", label: "Squad V: Fechamento Financeiro & DRE", icon: <FileSpreadsheet size={14} /> },
          { id: "whatsapp_bot", label: "Captura Passiva WhatsApp", icon: <MessageSquare size={14} /> },
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

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a7f3d0]">
            <span>Receita Bruta Total</span>
            <TrendingUp size={16} className="text-[#22c55e]" />
          </div>
          <div className="text-xl font-bold text-[#4ade80] font-mono">
            R$ {totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#166534]">Vendas Inî Rau + Retiros Samakey</div>
        </div>

        <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a7f3d0]">
            <span>Despesas por Centro de Custo</span>
            <TrendingDown size={16} className="text-[#ef4444]" />
          </div>
          <div className="text-xl font-bold text-[#ef4444] font-mono">
            R$ {totalDespesa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#ef4444]">Logística Mutum + Embalagens MUV</div>
        </div>

        <div className="p-4 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#4ade80]">
            <span>Resultado Operacional (DRE Líquido)</span>
            <DollarSign size={16} className="text-[#22c55e]" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            R$ {netDRE.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#4ade80] font-bold">100% Destinado a Aldeia Mutum</div>
        </div>
      </div>

      {/* TAB 1: MINHAS TAREFAS */}
      {activeTab === "tarefas" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={16} className="text-[#22c55e]" />
                Task Manager Global Unificado ("Minhas Tarefas")
              </h3>
              <span className="pill pill-ok">{tasks.filter((t) => t.status === "pendente").length} Pendentes</span>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isDone = task.status === "concluido";
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isDone
                        ? "bg-[#0c1c0c] border-[#1e381e] opacity-60 line-through"
                        : "bg-[#050805] border-[#1e381e] hover:border-[#22c55e]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">{task.title}</div>
                      <div className="text-[10px] text-[#a7f3d0] font-mono">
                        {task.assignee} · {task.squad} · Prazo: {task.dueDate}
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      task.priority === "alta" ? "bg-[#381c1c] text-[#ef4444]" : "bg-[#142414] text-[#4ade80]"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: SQUAD I CEO AI ASSISTANT */}
      {activeTab === "ceo_ai" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="text-[#22c55e]" size={16} /> Squad I CEO — AI Assistant de Priorização de Agenda
              </h3>
              <span className="pill pill-ok">Google Calendar API Sync</span>
            </div>

            <p className="text-xs text-[#a7f3d0]">
              IA integrada com a agenda e prazos do CEO. Analisa os compromissos e sugere as 2 prioridades críticas para o dia de hoje.
            </p>

            <div className="space-y-3 pt-2">
              {ceoAdvice.map((item) => (
                <div key={item.id} className="p-4 rounded border border-[#22c55e] bg-[#050805] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <AlertCircle size={14} className="text-[#22c55e]" /> {item.title}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#4ade80]">
                      Prioridade IA: {item.priorityScore}/100
                    </span>
                  </div>
                  <div className="text-xs text-[#a7f3d0] font-mono">{item.context}</div>
                  <div className="p-2 rounded bg-[#142414] border border-[#1e381e] text-[11px] font-mono text-[#4ade80]">
                    💡 Ação Sugerida pela IA: <strong>{item.suggestedAction}</strong> (Prazo: {item.deadline})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SQUAD V FECHAMENTO FINANCEIRO DRE */}
      {activeTab === "dre_financeiro" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-[#22c55e]" /> Squad V Adm/Legal — DRE Real-Time por Centro de Custo
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              Fechamento financeiro automatizado. As despesas enviadas pelos Squads via OCR ou WhatsApp são vinculadas aos centros de custo.
            </p>

            <div className="overflow-x-auto rounded-lg border border-[#1e381e] bg-[#050805]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0c1c0c] text-[#4ade80] border-b border-[#1e381e] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Descrição Lançamento</th>
                    <th className="p-3">Centro de Custo</th>
                    <th className="p-3">Squad</th>
                    <th className="p-3 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#142414] text-[#e2f7e2]">
                  {dreList.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#162416] transition">
                      <td className="p-3 text-[#a7f3d0]">{entry.date}</td>
                      <td className="p-3 font-bold text-white">
                        {entry.description}
                        {entry.whatsappLogged && <span className="ml-2 text-[9px] text-[#4ade80] font-mono">[WhatsApp Bot]</span>}
                      </td>
                      <td className="p-3 text-[#a7f3d0]">{entry.costCenter}</td>
                      <td className="p-3 text-[#a7f3d0]">{entry.squad}</td>
                      <td className={`p-3 text-right font-bold ${entry.type === "receita" ? "text-[#4ade80]" : "text-[#ef4444]"}`}>
                        {entry.type === "receita" ? "+" : "-"} R$ {entry.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: WHATSAPP BOT CAPTURA PASSIVA */}
      {activeTab === "whatsapp_bot" && (
        <section className="space-y-4">
          <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={16} className="text-[#22c55e]" /> Captura Passiva via Bot do WhatsApp (Áudios & Fotos OCR)
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              Membros das equipes registram tarefas e notas fiscais por áudio ou foto no WhatsApp. A IA transcreve, categoriza e insere no DRE.
            </p>

            <div className="space-y-3">
              {passiveLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-lg border border-[#1e381e] bg-[#050805] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#22c55e] font-bold">{log.sender} ({log.source})</span>
                    <span className="text-[#166534]">{log.timestamp}</span>
                  </div>

                  <p className="text-xs text-[#a7f3d0] italic font-serif">
                    "{log.transcription}"
                  </p>

                  <div className="p-2 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono text-[#4ade80] flex items-center gap-1.5 font-bold">
                    <Sparkles size={12} /> Ação Processada pela IA: {log.parsedAction}
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
