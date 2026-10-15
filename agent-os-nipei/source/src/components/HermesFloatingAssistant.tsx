"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  ListTodo,
  PlusCircle,
  RefreshCw,
  Lock,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "TASK_CREATED" | "TASK_UPDATED" | "TASK_COMMENTED" | "CODE_EDIT_BLOCKED" | "VAULT_QUERY";
  taskData?: any;
  citations?: { title: string; path: string }[];
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: "📋 Tareas pendientes", prompt: "Lista las tareas pendientes y prioridades" },
  { label: "➕ Crear tarea para Rodrigo", prompt: "Crear tarea para Rodrigo: Revisión de estrategia Squad 1" },
  { label: "✅ Concluir Camargo", prompt: "Marca como concluida la tarea de Camargo" },
  { label: "🔍 Consultar Vault", prompt: "¿Cuál es la estructura y objetivos de las 5 empresas oficiales de Nipëi?" },
];

export default function HermesFloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState(`hermes_${Date.now()}`);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content:
        "Hola. Soy **Hermes 2.0**, tu agente autónomo de coordinación y gestión del Vault.\n\nPuedo crear y actualizar tareas por lenguaje natural, registrar notas de seguimiento o consultar los 1.088 documentos del Vault Master con cero alucinación.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load current user context
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nipei_current_user");
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const userName = currentUser?.name || currentUser?.alias || "Usuario Liderança";
    const userSquad = currentUser?.squadAssignments?.[0]?.squadId || "squad_1_ceo";

    try {
      const res = await fetch("/api/hermes/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userIdentifier: userName,
          targetSquad: userSquad,
          prompt: text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg: Message = {
          id: `asst_${Date.now()}`,
          role: "assistant",
          content: data.answer || "Comando procesado correctamente.",
          type: data.taskActionResult?.type || "VAULT_QUERY",
          taskData: data.taskActionResult?.taskData,
          citations: data.citations || [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // If a task was modified, notify other components like Kanban
        if (
          data.taskActionResult?.type === "TASK_CREATED" ||
          data.taskActionResult?.type === "TASK_UPDATED" ||
          data.taskActionResult?.type === "TASK_COMMENTED"
        ) {
          window.dispatchEvent(new CustomEvent("nipei-tasks-updated", { detail: data.taskActionResult }));
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: "assistant",
            content: `⚠️ Error: ${data.error || "No se pudo procesar la solicitud."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error de conexión: ${err.message || "Fallo en la llamada a Hermes"}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 group"
          title="Abrir Hermes 2.0 (Gestor de Tareas y Vault)"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-black" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold tracking-wider text-amber-200 uppercase font-mono flex items-center gap-1.5">
              Hermes 2.0
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded text-amber-300 border border-amber-500/30">
                TASK AGENT
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">Tareas & Vault en lenguaje natural</div>
          </div>
        </button>
      )}

      {/* Floating Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] bg-[#0c0e14]/98 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized ? "h-14" : "h-[620px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-purple-600/30 border border-amber-400/50 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Hermes 2.0
                  </h3>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping inline-block" />
                    ONLINE
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                  <span>{currentUser?.name || "Usuario Liderança"}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono">
                    {currentUser?.squadAssignments?.[0]?.squadId || "squad_1_ceo"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Security Boundary Indicator */}
              <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/90 font-mono">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-400" />
                  PERMISO: TAREAS & VAULT (CÓDIGO PROTEGIDO)
                </span>
                <span className="text-zinc-500 text-[9px]">v2.1 MVP</span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                {messages.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                          isAssistant
                            ? "bg-white/[0.05] border border-white/10 text-zinc-200"
                            : "bg-amber-500/20 border border-amber-500/40 text-amber-100"
                        }`}
                      >
                        {/* Action Badge */}
                        {msg.type === "TASK_CREATED" && (
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            TAREA REGISTRADA EN VAULT
                          </div>
                        )}
                        {msg.type === "TASK_UPDATED" && (
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                            <RefreshCw className="w-3 h-3" />
                            ESTADO ACTUALIZADO
                          </div>
                        )}
                        {msg.type === "CODE_EDIT_BLOCKED" && (
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                            <ShieldAlert className="w-3 h-3" />
                            SEGURIDAD: RESTRICCIÓN DE CÓDIGO
                          </div>
                        )}

                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {/* Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <div className="text-[10px] text-zinc-400 font-mono mb-1 flex items-center gap-1">
                              <FileText className="w-2.5 h-2.5" />
                              Fuentes citadas del Vault:
                            </div>
                            <div className="space-y-0.5">
                              {msg.citations.slice(0, 3).map((cit, idx) => (
                                <div
                                  key={idx}
                                  className="text-[10px] text-amber-300/80 truncate font-mono bg-black/40 px-1.5 py-0.5 rounded"
                                >
                                  {cit.path}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs italic p-2 bg-white/[0.02] rounded-xl border border-white/5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    Hermes consultando Vault y procesando tarea...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Chips */}
              <div className="px-3 py-2 border-t border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_ACTIONS.map((qa, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qa.prompt)}
                    disabled={loading}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-[10px] text-zinc-300 hover:text-amber-200 transition font-mono flex items-center gap-1"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-white/[0.02] border-t border-white/10">
                <div className="relative flex items-center">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Instrucción a Hermes (ej: 'Crear tarea para Jordão: Revisar minuta')..."
                    rows={2}
                    className="w-full resize-none bg-black/60 border border-white/15 focus:border-amber-400/50 rounded-xl px-3 py-2 pr-10 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[9px] text-zinc-500 px-1 font-mono">
                  <span>Enter para enviar • Shift+Enter nueva línea</span>
                  <span className="text-zinc-600">Hermes RAG 2.0</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
