"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  ShieldCheck,
  Zap,
  MessageSquare,
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Send,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";

interface HermesMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  vaultCitations?: string[];
  groundingScore?: number;
}

interface HermesSession {
  sessionId: string;
  userIdentifier: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: HermesMessage[];
  contextSummary?: string;
  vaultPath: string;
}

export default function HermesOrchestratorView() {
  const [sessions, setSessions] = useState<HermesSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<HermesSession | null>(null);

  // Human Take Over state
  const [isHumanOverride, setIsHumanOverride] = useState<Record<string, boolean>>({});

  // Simulator / Operator Chat State
  const [promptInput, setPromptInput] = useState("");
  const [userIdentifierInput, setUserIdentifierInput] = useState("Ana Castro (CEO)");
  const [targetSquad, setTargetSquad] = useState("squad_1_ceo");
  const [isSending, setIsSending] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Auto-refresh sessions list
  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/hermes/session", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.sessions)) {
        setSessions(json.sessions);
        if (!selectedSessionId && json.sessions.length > 0) {
          setSelectedSessionId(json.sessions[0].sessionId);
          setActiveSession(json.sessions[0]);
        } else if (selectedSessionId) {
          const match = json.sessions.find((s: HermesSession) => s.sessionId === selectedSessionId);
          if (match) setActiveSession(match);
        }
      }
    } catch (e) {
      console.error("Error loading Hermes sessions:", e);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 4000);
    return () => clearInterval(interval);
  }, [selectedSessionId]);

  const handleSelectSession = (s: HermesSession) => {
    setSelectedSessionId(s.sessionId);
    setActiveSession(s);
  };

  const handleToggleHumanOverride = (sessionId: string) => {
    setIsHumanOverride((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const handleSendMessage = async () => {
    if (!promptInput.trim()) return;
    setIsSending(true);

    const sId = selectedSessionId || `session_sim_${Date.now()}`;
    const humanIntervened = isHumanOverride[sId];

    try {
      if (humanIntervened) {
        // Human operator direct response (bypasses AI)
        await fetch("/api/hermes/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sId,
            userIdentifier: userIdentifierInput,
            message: {
              role: "assistant",
              content: `👤 **[Intervención Humana por Operador]**:\n${promptInput}`,
              vaultCitations: [],
              groundingScore: 1.0,
            },
          }),
        });
      } else {
        // AI Agent Grounded RAG Response
        await fetch("/api/hermes/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sId,
            userIdentifier: userIdentifierInput,
            prompt: promptInput,
            targetSquad,
          }),
        });
      }

      setPromptInput("");
      await fetchSessions();
    } catch (err: any) {
      alert("Error al enviar mensaje a Hermes: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const currentOverridden = selectedSessionId ? isHumanOverride[selectedSessionId] : false;

  return (
    <div className="min-h-screen bg-[#050805] text-[#e0e8e0] p-4 md:p-8 font-mono">
      {/* Top Banner Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0c140c] border border-[#1f381f] rounded-2xl shadow-xl shadow-green-950/20">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-[#142614] border border-[#22c55e]/40 rounded-2xl text-[#22c55e] shadow-lg">
              <Zap size={32} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full">
                  HERMES 2.0 — CONTROL CENTER
                </span>
                <span className="text-xs text-[#a0caa0]">Human-in-the-Loop & RAG Studio</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                Centro de Comando de Hermes <span className="text-[#22c55e]">(Supervisión & RAG)</span>
              </h1>
              <p className="text-sm text-[#88a888] mt-0.5">
                Monitoreo conversacional en tiempo real, auditoría de citas del Vault e intervención humana directa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#080d08] p-3 rounded-xl border border-[#182818] text-xs">
              <ShieldCheck className="text-emerald-400" size={18} />
              <div>
                <p className="text-slate-400">Gobernanza:</p>
                <p className="font-bold text-white">RAG Estricto Cero-Alucinación</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Column 1: Sessions Stream List (4 cols) */}
        <div className="lg:col-span-4 bg-[#0c140c] border border-[#182818] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#182818] mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-emerald-400" size={16} />
                Conversaciones Activas ({sessions.length})
              </h2>
              <button
                onClick={fetchSessions}
                className="p-1.5 hover:bg-[#182818] text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                title="Actualizar sesiones"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[580px] pr-1">
              {sessions.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                  Sin conversaciones registradas aún.
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = selectedSessionId === s.sessionId;
                  const isOverridden = isHumanOverride[s.sessionId];
                  const lastMsg = s.messages?.[s.messages.length - 1];

                  return (
                    <div
                      key={s.sessionId}
                      onClick={() => handleSelectSession(s)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#142614] border-emerald-500/60 shadow-lg text-white"
                          : "bg-[#080d08] border-[#182818] hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-400 truncate max-w-[160px]">
                          👤 {s.userIdentifier}
                        </span>
                        {isOverridden ? (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1">
                            <Lock size={10} /> Humano
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
                            <Sparkles size={10} /> IA Bot
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-200 truncate">{s.title}</p>
                      {lastMsg && (
                        <p className="text-[11px] text-slate-400 truncate mt-1">
                          {lastMsg.role === "user" ? "👤" : "🤖"} {lastMsg.content.replace(/[\n\r]+/g, " ").slice(0, 50)}...
                        </p>
                      )}

                      <div className="mt-3 pt-2 border-t border-[#182818] flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{s.messages.length} msgs</span>
                        <span>{new Date(s.updatedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#182818] text-[10px] text-slate-500 text-center font-mono">
            Persistencia: nipei-vault/Hermes_Sessions/
          </div>
        </div>

        {/* Column 2: Live Chat & Human Intervention Panel (8 cols) */}
        <div className="lg:col-span-8 bg-[#0c140c] border border-[#182818] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            {/* Header Controls for Selected Session */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#182818] mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {activeSession ? activeSession.title : "Selecciona una conversación"}
                  </h3>
                  {selectedSessionId && (
                    <span className="text-xs font-mono text-emerald-400">({selectedSessionId})</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Usuario: <span className="text-slate-200 font-semibold">{activeSession?.userIdentifier || "N/A"}</span>
                </p>
              </div>

              {selectedSessionId && (
                <button
                  onClick={() => handleToggleHumanOverride(selectedSessionId)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                    currentOverridden
                      ? "bg-amber-600 hover:bg-amber-500 text-slate-950 border border-amber-400 animate-pulse"
                      : "bg-[#142614] hover:bg-[#1f381f] text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {currentOverridden ? (
                    <>
                      <PauseCircle size={15} /> 🛑 Intervención Humana Activa (Modo Operador)
                    </>
                  ) : (
                    <>
                      <PlayCircle size={15} /> 🤖 Control por IA Hermes (Click para Intervenir)
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Chat Thread Messages Box */}
            <div className="bg-[#050805] border border-[#182818] rounded-xl p-4 overflow-y-auto h-[400px] space-y-4 font-mono text-xs">
              {!activeSession || activeSession.messages.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Brain className="w-10 h-10 mx-auto mb-2 text-slate-700" />
                  Selecciona una sesión de la izquierda o escribe un nuevo mensaje.
                </div>
              ) : (
                activeSession.messages.map((m) => {
                  const isUser = m.role === "user";
                  const isSys = m.role === "system";

                  if (isSys) {
                    return (
                      <div key={m.id} className="text-center py-1.5 px-3 bg-[#0d180f] border border-[#1b331c] rounded-xl text-[11px] text-emerald-400/90 font-mono">
                        ⚙️ {m.content}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
                          isUser
                            ? "bg-[#142614] border border-[#22c55e]/40 text-emerald-100"
                            : "bg-[#0c140c] border border-[#182818] text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-bold border-b border-[#1f381f] pb-1 mb-1">
                          <span>{isUser ? `👤 ${activeSession.userIdentifier}` : "🤖 Hermes 2.0 (Grounding RAG)"}</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                        {/* Citations list if assistant */}
                        {m.vaultCitations && m.vaultCitations.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[#182818] text-[10px] text-emerald-400 font-mono space-y-1">
                            <p className="font-bold text-slate-300">📚 Notas del Vault Citadas:</p>
                            {m.vaultCitations.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-[#050805] px-2 py-1 rounded border border-[#152416]">
                                <span className="truncate max-w-[280px]">{c}</span>
                                <button
                                  onClick={() => handleCopy(c)}
                                  className="text-slate-400 hover:text-emerald-400"
                                  title="Copiar ruta del Vault"
                                >
                                  {copiedPath === c ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Interactive Operator Input Box */}
          <div className="mt-4 pt-4 border-t border-[#182818] space-y-3">
            {currentOverridden && (
              <div className="p-2.5 bg-amber-950/60 border border-amber-600/60 rounded-xl text-xs text-amber-200 flex items-center justify-between font-bold">
                <span>⚠️ Modo Intervención Humana: Tu mensaje se enviará directamente sin pasar por el bot IA.</span>
              </div>
            )}

            <div className="flex gap-3">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={
                  currentOverridden
                    ? "Escribe como operador humano para responder directamente..."
                    : "Escribe una pregunta para probar el enrutador RAG de Hermes 2.0..."
                }
                className="flex-1 bg-[#050805] border border-[#182818] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !promptInput.trim()}
                className={`px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  currentOverridden
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/40"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/40"
                } disabled:opacity-50`}
              >
                {isSending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <>
                    <Send size={14} /> Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
