"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Send,
  MessageCircle,
  Mail,
  Webhook,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  User,
  Phone,
  AtSign,
  FileText,
  Layers,
  ChevronDown,
  Info,
  QrCode
} from "lucide-react";
import type {
  GlobalTask,
  TaskCommunication,
  CommunicationChannel,
  CommunicationStatus,
  MemberProfile
} from "@/lib/nipeiStore";

interface TaskDispatchHubProps {
  task: GlobalTask;
  members?: MemberProfile[];
  onUpdateTask: (updated: GlobalTask) => void;
}

export default function TaskDispatchHub({
  task,
  members = [],
  onUpdateTask,
}: TaskDispatchHubProps) {
  const [communications, setCommunications] = useState<TaskCommunication[]>(
    task.communications || []
  );
  const [selectedChannel, setSelectedChannel] = useState<CommunicationChannel>("whatsapp");
  const [recipient, setRecipient] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [agentId, setAgentId] = useState<"@hermes" | "@antigravity">("@hermes");
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Loading & State
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Evolution WhatsApp Connection Status
  const [whatsappStatus, setWhatsappStatus] = useState<{
    loading: boolean;
    connected: boolean;
    state: string;
    serverUrl?: string;
    instance?: string;
  }>({
    loading: false,
    connected: false,
    state: "desconhecido",
  });


  // Load existing communications and connection status on mount
  useEffect(() => {
    async function loadCommunications() {
      try {
        const query = new URLSearchParams({
          taskId: task.id,
          squadId: task.squad || "",
          taskTitle: task.title || "",
        });
        const res = await fetch(`/api/agent-kanban/dispatch?${query.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.communications)) {
          setCommunications(data.communications);
          onUpdateTask({
            ...task,
            communications: data.communications,
          });
        }
      } catch (e) {
        console.warn("Não foi possível carregar o histórico de comunicações:", e);
      }
    }

    async function checkWhatsAppHealth() {
      setWhatsappStatus((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch("/api/agent-kanban/dispatch?check=whatsapp");
        const data = await res.json();
        if (data.success) {
          setWhatsappStatus({
            loading: false,
            connected: Boolean(data.connected),
            state: data.state || "close",
            serverUrl: data.serverUrl,
            instance: data.instance,
          });
          // If disconnected, default simulation mode to true for safety
          if (!data.connected) {
            setIsSimulated(true);
          }
        }
      } catch (err) {
        setWhatsappStatus({
          loading: false,
          connected: false,
          state: "offline",
        });
        setIsSimulated(true);
      }
    }

    loadCommunications();
    checkWhatsAppHealth();
  }, [task.id]);

  // Synchronize when parent task communications prop updates
  useEffect(() => {
    if (task.communications && task.communications.length > 0) {
      setCommunications(task.communications);
    }
  }, [task.communications]);

  // Quick AI Templates Generator
  const handleApplyTemplate = (type: "completed" | "missing_input" | "status_update") => {
    const deliverable = task.deliverables?.find((d) => d.id === selectedDeliverableId) || task.deliverables?.[0];
    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
    const checklistTotal = task.checklist?.length || 0;

    if (type === "completed") {
      if (selectedChannel === "whatsapp") {
        setMessageText(
          `🌿 *Nipëi OS • Tarefa Concluída*\n\n` +
          `Olá! A tarefa *"${task.title}"* foi finalizada com sucesso pelo Squad *${task.squad?.toUpperCase() || "GERAL"}*.\n\n` +
          (deliverable ? `📄 *Entregável Gerado:* ${deliverable.title} (${deliverable.fileName})\n` : "") +
          `✅ *Checklist:* ${checklistDone}/${checklistTotal} concluído.\n\n` +
          `O relatório canônico já se encontra arquivado no Nipëi Vault.`
        );
      } else if (selectedChannel === "email") {
        setSubject(`[Nipëi OS] Conclusão da Tarefa: ${task.title}`);
        setMessageText(
          `Prezada equipe / liderança,\n\n` +
          `Informamos que a demanda "${task.title}" foi concluída com conformidade operacional e auditoria ética no Nipëi OS.\n\n` +
          (deliverable ? `Entregável oficial: ${deliverable.title} (versão ${deliverable.version}.0)\nCaminho canônico: ${deliverable.vaultRelativePath}\n\n` : "") +
          `Atenciosamente,\n${agentId} • Inteligência Operacional Nipëi OS`
        );
      } else {
        setMessageText(`Evento de conclusão formal da tarefa ${task.id} (${task.title}).`);
      }
    } else if (type === "missing_input") {
      const pendingItems = task.checklist?.filter((c) => !c.completed).map((c) => `- ${c.title}`).join("\n") || "- Envio de comprovantes / insumos";
      if (selectedChannel === "whatsapp") {
        setMessageText(
          `⚠️ *Nipëi OS • Solicitação de Insumos Pendentes*\n\n` +
          `Olá! A tarefa *"${task.title}"* está aguardando os seguintes itens para continuidade:\n\n` +
          `${pendingItems}\n\n` +
          `Por gentileza, anexe os arquivos no Workspace da tarefa ou responda esta mensagem.`
        );
      } else {
        setSubject(`[Nipëi OS] Solicitação de Insumos: ${task.title}`);
        setMessageText(
          `Olá,\n\nIdentificamos pendências para o avanço da tarefa "${task.title}":\n\n${pendingItems}\n\n` +
          `Favor encaminhar os documentos necessários para validação do Squad.`
        );
      }
    } else if (type === "status_update") {
      if (selectedChannel === "whatsapp") {
        setMessageText(
          `📊 *Nipëi OS • Atualização de Status*\n\n` +
          `Tarefa: *${task.title}*\n` +
          `Squad: *${task.squad}*\n` +
          `Prioridade: *${task.priority?.toUpperCase()}*\n` +
          `Progresso: *${checklistDone}/${checklistTotal} subtarefas*\n` +
          `Responsável: *${task.assignee || "Equipe"}*\n\n` +
          `Status operacional ativo no Mission Control.`
        );
      } else {
        setSubject(`[Nipëi OS] Status Operacional: ${task.title}`);
        setMessageText(
          `Relatório de status da demanda "${task.title}":\n\n` +
          `- Progresso: ${checklistDone}/${checklistTotal} subtarefas finalizadas\n` +
          `- Prioridade: ${task.priority}\n` +
          `- Prazo limite: ${task.dueDate || "A definir"}\n\n` +
          `Monitoramento contínuo via Hermes Orquestrador.`
        );
      }
    }
  };

  // Quick Select Recipient from Team Members
  const handleSelectMember = (member: MemberProfile) => {
    setRecipientName(member.name);
    if (selectedChannel === "whatsapp") {
      setRecipient(member.phone || "");
    } else if (selectedChannel === "email") {
      setRecipient(member.email || "");
    }
  };

  // Execute Dispatch
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !messageText.trim()) {
      setFeedbackError("Preencha o destinatário e o texto da mensagem.");
      return;
    }

    setIsSending(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    try {
      const res = await fetch("/api/agent-kanban/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          taskSquad: task.squad,
          channel: selectedChannel,
          recipient: recipient.trim(),
          recipientName: recipientName.trim() || undefined,
          subject: selectedChannel === "email" ? subject.trim() : undefined,
          messageText: messageText.trim(),
          deliverableId: selectedDeliverableId || undefined,
          agentId,
          simulate: isSimulated,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao processar despacho.");
      }

      const newComm: TaskCommunication = data.communication;
      const updatedList = [newComm, ...communications.filter((c) => c.id !== newComm.id)];
      setCommunications(updatedList);
      setFeedbackSuccess(data.message || "Despacho registrado com sucesso!");
      setMessageText("");

      // Update parent task
      onUpdateTask({
        ...task,
        communications: updatedList,
      });
    } catch (err: any) {
      console.error("Erro no despacho:", err);
      setFeedbackError(err.message || "Erro inesperado ao conectar com a API de despacho.");
    } finally {
      setIsSending(false);
    }
  };

  // Copy text helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar: Connection Health & Channel Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#142414]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1c0c] border border-[#1e381e] text-[#22c55e] font-mono text-xs font-bold">
            <Send size={13} />
            <span>Despacho Omnicanal ({communications.length})</span>
          </div>

          {/* WhatsApp Evolution Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition ${
              whatsappStatus.connected
                ? "bg-[#0b240b] text-[#4ade80] border-[#22c55e]/50"
                : "bg-[#211608] text-[#fcd34d] border-[#f59e0b]/40"
            }`}
            title={`Instância: ${whatsappStatus.instance || "nipei-santuario"} • Servidor: ${whatsappStatus.serverUrl || "Evolution API"}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                whatsappStatus.connected ? "bg-[#22c55e] animate-pulse" : "bg-amber-400"
              }`}
            />
            <span>
              WhatsApp: {whatsappStatus.connected ? "Online (Conectado)" : "Desconectado (Modo Simulação)"}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Main Dispatch Form */}
      <form onSubmit={handleDispatch} className="p-5 rounded-xl bg-gradient-to-b from-[#091509] to-[#050905] border border-[#1e381e] shadow-lg space-y-4">
        {/* Channel Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* WhatsApp */}
          <div
            onClick={() => setSelectedChannel("whatsapp")}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 select-none ${
              selectedChannel === "whatsapp"
                ? "bg-[#0b260b] border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.2)] ring-1 ring-[#22c55e]/50"
                : "bg-[#071007] border-[#142414] hover:border-[#1e381e]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#143014] border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e]">
              <MessageCircle size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">WhatsApp</div>
              <div className="text-[10px] text-zinc-400 font-mono">Evolution API</div>
            </div>
          </div>

          {/* Email */}
          <div
            onClick={() => setSelectedChannel("email")}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 select-none ${
              selectedChannel === "email"
                ? "bg-[#0c1f30] border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.2)] ring-1 ring-[#38bdf8]/50"
                : "bg-[#071007] border-[#142414] hover:border-[#1e381e]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#0e273d] border border-[#38bdf8]/40 flex items-center justify-center text-sky-400">
              <Mail size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">E-mail Executivo</div>
              <div className="text-[10px] text-zinc-400 font-mono">Hermes Outreach</div>
            </div>
          </div>

          {/* Webhook n8n */}
          <div
            onClick={() => setSelectedChannel("webhook_n8n")}
            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 select-none ${
              selectedChannel === "webhook_n8n"
                ? "bg-[#251036] border-[#c084fc] shadow-[0_0_12px_rgba(192,132,252,0.2)] ring-1 ring-[#c084fc]/50"
                : "bg-[#071007] border-[#142414] hover:border-[#1e381e]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#301445] border border-[#c084fc]/40 flex items-center justify-center text-purple-300">
              <Webhook size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Webhook n8n</div>
              <div className="text-[10px] text-zinc-400 font-mono">Automação Externa</div>
            </div>
          </div>
        </div>

        {/* Quick Contact Selector from Team Members */}
        {members.length > 0 && selectedChannel !== "webhook_n8n" && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-mono text-zinc-400">Atalho: Selecionar Integrante do Squad</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMember(m)}
                  className="px-2.5 py-1 rounded-md bg-[#081408] border border-[#1e381e] text-[11px] font-mono text-zinc-300 hover:text-white hover:border-[#22c55e] transition shrink-0 flex items-center gap-1"
                >
                  <User size={10} className="text-[#22c55e]" />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recipient and Subject Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1">
              {selectedChannel === "whatsapp" ? <Phone size={11} className="text-[#22c55e]" /> : selectedChannel === "email" ? <AtSign size={11} className="text-sky-400" /> : <Webhook size={11} className="text-purple-400" />}
              <span>{selectedChannel === "whatsapp" ? "Telefone WhatsApp (com DDD)" : selectedChannel === "email" ? "Endereço de E-mail" : "URL do Webhook n8n"}</span>
            </label>
            <input
              type={selectedChannel === "email" ? "email" : "text"}
              placeholder={
                selectedChannel === "whatsapp"
                  ? "+55 11 99999-9999"
                  : selectedChannel === "email"
                  ? "destinatario@exemplo.com"
                  : "https://n8n.digital-alignment.com/webhook/..."
              }
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono placeholder-zinc-600 focus:border-[#22c55e] focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-zinc-400 font-semibold">
              {selectedChannel === "email" ? "Assunto do E-mail" : "Nome do Contato (Opcional)"}
            </label>
            <input
              type="text"
              placeholder={
                selectedChannel === "email"
                  ? `[Nipëi OS] Atualização da Tarefa: ${task.title}`
                  : "Ex: Ana Castro, Liderança Mutum"
              }
              value={selectedChannel === "email" ? subject : recipientName}
              onChange={(e) =>
                selectedChannel === "email" ? setSubject(e.target.value) : setRecipientName(e.target.value)
              }
              className="w-full px-3 py-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs placeholder-zinc-600 focus:border-[#22c55e] focus:outline-none"
            />
          </div>
        </div>

        {/* AI Templates Toolbar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-[#4ade80] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#22c55e]" /> Redação Autônoma com IA (@hermes)
            </span>
            {task.deliverables && task.deliverables.length > 0 && (
              <span className="text-[10px] font-mono text-zinc-400">
                {task.deliverables.length} entregável(is) disponível(is)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleApplyTemplate("completed")}
              className="px-2.5 py-1 rounded-lg bg-[#0f240f] border border-[#1e381e] hover:border-[#22c55e] text-[#4ade80] text-xs font-mono transition flex items-center gap-1"
            >
              📢 Notificar Conclusão
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("missing_input")}
              className="px-2.5 py-1 rounded-lg bg-[#241c0f] border border-[#1e381e] hover:border-amber-500 text-amber-300 text-xs font-mono transition flex items-center gap-1"
            >
              ⏳ Cobrar Insumo / Bloqueio
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("status_update")}
              className="px-2.5 py-1 rounded-lg bg-[#0f1f2e] border border-[#1e381e] hover:border-sky-500 text-sky-300 text-xs font-mono transition flex items-center gap-1"
            >
              ℹ️ Relatório de Status
            </button>
          </div>
        </div>

        {/* Deliverable Linkage Selector (Optional) */}
        {task.deliverables && task.deliverables.length > 0 && (
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-1">
              <Layers size={11} className="text-[#38bdf8]" />
              <span>Vincular Entregável ao Despacho (Opcional)</span>
            </label>
            <select
              value={selectedDeliverableId}
              onChange={(e) => setSelectedDeliverableId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
            >
              <option value="">Nenhum entregável vinculado (apenas texto)</option>
              {task.deliverables.map((del) => (
                <option key={del.id} value={del.id}>
                  {del.title} ({del.format} • v{del.version}.0)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Message Textarea */}
        <div className="space-y-1">
          <label className="block text-[11px] font-mono text-zinc-400 font-semibold">
            Mensagem a ser Disparada
          </label>
          <textarea
            rows={4}
            placeholder="Digite o texto da mensagem ou clique em um dos templates inteligentes acima..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#050805] border border-[#1e381e] text-white text-xs leading-relaxed focus:border-[#22c55e] focus:outline-none resize-none font-sans"
            required
          />
        </div>

        {/* Footer: Simulation Switch, Agent Selector & Dispatch Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#142414]">
          <div className="flex items-center gap-3">
            {/* Simulation Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-zinc-400 hover:text-white">
              <input
                type="checkbox"
                checked={isSimulated}
                onChange={(e) => setIsSimulated(e.target.checked)}
                className="w-4 h-4 rounded bg-[#081208] border-[#1e381e] text-[#22c55e] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className={isSimulated ? "text-amber-400 font-bold" : ""}>
                {isSimulated ? "Modo Simulação Ativo (Auditado)" : "Disparo Real em Produção"}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#22c55e] text-[#050805] text-xs font-mono font-bold hover:bg-[#4ade80] transition shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Disparando...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>
                    {isSimulated ? "Registrar Simulação" : `Disparar via ${selectedChannel.toUpperCase()}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedbackSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-[#22c55e]" />
            <span>{feedbackSuccess}</span>
          </div>
        )}

        {feedbackError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{feedbackError}</span>
          </div>
        )}
      </form>

      {/* 4. History Timeline of Dispatched Communications */}
      <div className="space-y-3">
        <h5 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={13} className="text-[#22c55e]" /> Histórico de Disparos da Tarefa ({communications.length})
        </h5>

        {communications.length > 0 ? (
          <div className="space-y-2.5">
            {communications.map((comm) => {
              const isWa = comm.channel === "whatsapp";
              const isMail = comm.channel === "email";
              return (
                <div
                  key={comm.id}
                  className="p-3.5 rounded-xl border border-[#1e381e] bg-[#070e07] space-y-2 transition hover:border-[#22c55e]/50"
                >
                  <div className="flex items-center justify-between text-xs font-mono gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 rounded text-xs ${
                          isWa
                            ? "bg-[#0c240c] text-[#4ade80]"
                            : isMail
                            ? "bg-[#0b1f30] text-sky-400"
                            : "bg-[#251036] text-purple-300"
                        }`}
                      >
                        {isWa ? <MessageCircle size={12} /> : isMail ? <Mail size={12} /> : <Webhook size={12} />}
                      </span>
                      <span className="font-bold text-white">
                        {comm.recipientName ? `${comm.recipientName} (${comm.recipient})` : comm.recipient}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          comm.status === "sent" || comm.status === "delivered"
                            ? "bg-[#102410] text-[#4ade80] border border-[#22c55e]/40"
                            : comm.status === "simulated"
                            ? "bg-amber-950/50 text-amber-300 border border-amber-600/40"
                            : "bg-rose-950/50 text-rose-300 border border-rose-600/40"
                        }`}
                      >
                        {comm.status}
                      </span>
                      <span className="text-[11px] text-zinc-500">{comm.timestamp}</span>
                    </div>
                  </div>

                  {comm.subject && (
                    <div className="text-xs font-bold text-sky-300 font-mono">
                      Assunto: {comm.subject}
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-[#040804] border border-[#142414] text-xs text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed">
                    {comm.messageText}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                    <span>Despachado por: {comm.agentId}</span>
                    <button
                      onClick={() => handleCopy(comm.id, comm.messageText)}
                      className="text-zinc-400 hover:text-white flex items-center gap-1 transition"
                    >
                      {copiedId === comm.id ? (
                        <>
                          <Check size={11} className="text-[#22c55e]" />
                          <span className="text-[#22c55e]">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[#060c06] border border-dashed border-[#1a341a] space-y-1">
            <div className="text-xs font-mono text-zinc-400">
              Nenhuma comunicação disparada para esta tarefa ainda.
            </div>
            <div className="text-[11px] text-zinc-500">
              Utilize o formulário acima para notificar via WhatsApp, e-mail ou disparar webhook.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
