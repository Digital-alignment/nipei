"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Sparkles, HelpCircle, ListOrdered, Users, Send,
  CheckCircle2, Plus, ArrowRight, Loader2, BookOpen, ShieldCheck, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type GlobalTask } from "@/lib/nipeiStore";
import { type AgentConsultAction, type AgentConsultResponse } from "@/app/api/agent-kanban/consult/route";

interface TaskAgentBoxProps {
  task: GlobalTask;
  onApplySubtasks?: (subtaskTitles: string[]) => void;
  onUpdateSquad?: (squadId: string, assignee?: string) => void;
  compact?: boolean; // When true, rendered inside a card in expanded view; when false, inside modal
}

export default function TaskAgentBox({
  task,
  onApplySubtasks,
  onUpdateSquad,
  compact = false,
}: TaskAgentBoxProps) {
  const [activeAction, setActiveAction] = useState<AgentConsultAction | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AgentConsultResponse | null>(null);
  const [subtasksApplied, setSubtasksApplied] = useState(false);
  const [squadApplied, setSquadApplied] = useState(false);

  async function handleConsult(action: AgentConsultAction, prompt?: string) {
    setActiveAction(action);
    setLoading(true);
    setResponse(null);
    setSubtasksApplied(false);
    setSquadApplied(false);

    try {
      const res = await fetch("/api/agent-kanban/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          taskSquad: task.squad,
          taskPriority: task.priority,
          taskColumn: task.columnStatus || (task as any).column,
          taskAssignee: task.assignee,
          action,
          customPrompt: prompt || customInput,
          existingChecklist: task.checklist || [],
          vaultPath: task.vaultPath,
        }),
      });

      const data: AgentConsultResponse = await res.json();
      if (data.success) {
        setResponse(data);
      } else {
        setResponse({
          success: false,
          action,
          explanation: "⚠️ Não foi possível obter resposta do Agente IA no momento.",
          confidence: 0,
          vaultContextFound: false,
        });
      }
    } catch (e: any) {
      setResponse({
        success: false,
        action,
        explanation: `⚠️ Erro de conexão com o agente: ${e.message}`,
        confidence: 0,
        vaultContextFound: false,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleAddSubtasks() {
    if (!response?.suggestedSubtasks || response.suggestedSubtasks.length === 0) return;
    if (onApplySubtasks) {
      onApplySubtasks(response.suggestedSubtasks.map((s) => s.title));
      setSubtasksApplied(true);
    }
  }

  function handleApplySquad() {
    if (!response?.suggestedSquad) return;
    if (onUpdateSquad) {
      onUpdateSquad(response.suggestedSquad, response.suggestedAssignee);
      setSquadApplied(true);
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-xl border transition-all ${
        compact
          ? "p-2.5 bg-[#050b06]/95 border-[#1e381e] space-y-2 text-xs"
          : "p-4 bg-[#081209]/90 border-emerald-900/50 space-y-3.5 shadow-md"
      }`}
    >
      {/* Box Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#142414] pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-600/40">
            <Bot size={compact ? 12 : 14} />
          </div>
          <span className="font-mono font-bold text-xs text-white truncate">
            Consultor IA da Tarefa
          </span>
          <span className="text-[10px] font-mono text-emerald-400/80 px-1.5 py-0.2 rounded bg-emerald-950/50 border border-emerald-800/40">
            @hermes
          </span>
        </div>

        {response && (
          <button
            onClick={() => {
              setResponse(null);
              setActiveAction(null);
            }}
            title="Fechar resposta"
            className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => handleConsult("explain")}
          disabled={loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition active:scale-95 border ${
            activeAction === "explain"
              ? "bg-[#22c55e] text-[#050805] font-bold border-[#22c55e]"
              : "bg-[#0a180a] hover:bg-[#142414] text-zinc-300 hover:text-white border-[#1e381e]"
          }`}
        >
          <HelpCircle size={11} className={activeAction === "explain" ? "text-black" : "text-[#4ade80]"} />
          <span>Explicar o que fazer</span>
        </button>

        <button
          onClick={() => handleConsult("steps")}
          disabled={loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition active:scale-95 border ${
            activeAction === "steps"
              ? "bg-[#22c55e] text-[#050805] font-bold border-[#22c55e]"
              : "bg-[#0a180a] hover:bg-[#142414] text-zinc-300 hover:text-white border-[#1e381e]"
          }`}
        >
          <ListOrdered size={11} className={activeAction === "steps" ? "text-black" : "text-[#38bdf8]"} />
          <span>Sugerir subtarefas</span>
        </button>

        <button
          onClick={() => handleConsult("squad_assign")}
          disabled={loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition active:scale-95 border ${
            activeAction === "squad_assign"
              ? "bg-[#22c55e] text-[#050805] font-bold border-[#22c55e]"
              : "bg-[#0a180a] hover:bg-[#142414] text-zinc-300 hover:text-white border-[#1e381e]"
          }`}
        >
          <Users size={11} className={activeAction === "squad_assign" ? "text-black" : "text-[#fbbf24]"} />
          <span>Sugerir Squad ideal</span>
        </button>
      </div>

      {/* Custom Prompt Input */}
      {!compact && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Pergunte qualquer coisa sobre esta tarefa..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customInput.trim()) {
                handleConsult("custom", customInput);
              }
            }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-[#050905] border border-[#1e381e] text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#22c55e] transition"
          />
          <button
            onClick={() => {
              if (customInput.trim()) handleConsult("custom", customInput);
            }}
            disabled={loading || !customInput.trim()}
            title="Enviar pergunta ao Agente"
            className="px-3 py-1.5 rounded-lg bg-[#142414] hover:bg-[#1e381e] border border-[#1e381e] text-[#a7f3d0] hover:text-white transition disabled:opacity-40 text-xs font-mono font-bold flex items-center gap-1 active:scale-95"
          >
            <Send size={12} />
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="p-3 rounded-lg bg-[#050905] border border-[#1e381e] text-center text-xs font-mono text-[#a7f3d0] flex items-center justify-center gap-2 animate-pulse">
          <Loader2 size={14} className="animate-spin text-[#22c55e]" />
          <span>Consultando inteligência e contexto no Vault...</span>
        </div>
      )}

      {/* Response Box */}
      {response && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-[#050905] border border-emerald-900/60 space-y-2.5 text-xs font-sans"
        >
          {/* Markdown Content */}
          <div className="prose prose-invert max-w-none text-zinc-200 text-xs leading-relaxed space-y-1.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.explanation}
            </ReactMarkdown>
          </div>

          {/* Actionable Subtasks if suggested */}
          {response.suggestedSubtasks && response.suggestedSubtasks.length > 0 && (
            <div className="pt-2 border-t border-[#142414] space-y-1.5">
              <div className="space-y-1">
                {response.suggestedSubtasks.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 bg-[#0a150a] px-2 py-1 rounded border border-[#1e381e]"
                  >
                    <span className="text-[#22c55e] font-bold shrink-0">{i + 1}.</span>
                    <span className="truncate">{st.title}</span>
                  </div>
                ))}
              </div>

              {onApplySubtasks && (
                <button
                  onClick={handleAddSubtasks}
                  disabled={subtasksApplied}
                  className={`mt-2 w-full py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                    subtasksApplied
                      ? "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-default"
                      : "bg-[#22c55e] hover:bg-[#4ade80] text-[#050805]"
                  }`}
                >
                  {subtasksApplied ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Subtarefas Adicionadas ao Checklist!</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>+ Aplicar {response.suggestedSubtasks.length} subtarefas no Checklist</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Actionable Squad Update if suggested */}
          {response.action === "squad_assign" && response.suggestedSquad && onUpdateSquad && (
            <div className="pt-2 border-t border-[#142414]">
              <button
                onClick={handleApplySquad}
                disabled={squadApplied || response.suggestedSquad === task.squad}
                className={`w-full py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                  squadApplied || response.suggestedSquad === task.squad
                    ? "bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-default"
                    : "bg-[#22c55e] hover:bg-[#4ade80] text-[#050805]"
                }`}
              >
                {squadApplied || response.suggestedSquad === task.squad ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Squad Já Definido</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={13} />
                    <span>Aplicar Squad \`{response.suggestedSquad}\` nesta Tarefa</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Citations Footer */}
          {response.vaultContextFound && response.citations && response.citations.length > 0 && (
            <div className="pt-1.5 border-t border-[#142414] text-[10px] font-mono text-zinc-500 flex items-center gap-1 truncate">
              <BookOpen size={11} className="text-emerald-500 shrink-0" />
              <span className="truncate">Fontes do Vault: {response.citations.join(", ")}</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
