"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Bot, CheckCircle2, FileText, Image as ImageIcon, Mic, Video, Sparkles, Layers, ShieldCheck, ArrowRight, Clock, Mail, Radio } from "lucide-react";
import { InboxProcessResult } from "@/lib/nipeiInboxEngine";

interface Props {
  companySlug?: string;
  companyName?: string;
}

const ROUTER_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Ultra-Rápido < 1s)" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (OpenAI Router)" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Razonamiento Complejo)" },
  { id: "z-ai/glm-5.2", name: "GLM 5.2 (Zhipu Frontier Coder)" },
  { id: "nousresearch/hermes-4-70b", name: "Hermes 4 70B (Orquestador OS)" },
];

const FUTURE_MODULES = [
  {
    title: "1. Integración Nativa WhatsApp Business / Telegram Bot API",
    icon: <Radio size={18} className="text-emerald-400" />,
    desc: "Conexión directa vía Baileys / Twilio / Telegram Webhooks para escuchar y responder en grupos y chats de WhatsApp reales sin intermediarios.",
    badge: "Próxima Etapa",
  },
  {
    title: "2. Respuestas por Notas de Voz Bidireccionales (ElevenLabs Audio)",
    icon: <Mic size={18} className="text-purple-400" />,
    desc: "Hermes no solo recibe audios, sino que responde a las preguntas del usuario enviando notas de voz sintetizadas con su propia voz en WhatsApp.",
    badge: "Audio Síntesis",
  },
  {
    title: "3. Comandos de Chat Avanzados por Mensaje",
    icon: <Sparkles size={18} className="text-cyan-400" />,
    desc: "Soporte para comandos en lenguaje natural o slash commands: /status, /sprint, /asignar @squad2, /resumen_semanal.",
    badge: "Comandos Rápido",
  },
  {
    title: "4. Email-to-Vault Ingestion (Reenvío de Correos)",
    icon: <Mail size={18} className="text-amber-400" />,
    desc: "Dirección de correo dedicada (inbox@nipei.os) que convierte emails reenviados en notas Markdown y tareas del Kanban.",
    badge: "Email Bridge",
  },
  {
    title: "5. Segmentación Automática de Audios Largos (> 25 MB / 3 horas)",
    icon: <Clock size={18} className="text-blue-400" />,
    desc: "Dividir automáticamente archivos masivos de voz en segmentos de 15 minutos para transcribir podcasts o reuniones completas de 3 horas.",
    badge: "Audio Chunking",
  },
];

export function InboxWebhookSimulatorWidget({ companySlug = "", companyName = "" }: Props) {
  const [activeTab, setActiveTab] = useState<"simulator" | "future_roadmap">("simulator");

  // Form State
  const [sender, setSender] = useState("WhatsApp (+54 9 11 ...)");
  const [text, setText] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "audio" | "video_link">("text");
  const [taskAction, setTaskAction] = useState<"auto" | "create_task" | "update_task" | "create_note">("auto");
  const [targetTaskStatus, setTargetTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [routerModel, setRouterModel] = useState("google/gemini-2.5-flash");
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InboxProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("sender", sender);
      formData.append("text", text);
      formData.append("companySlug", companySlug);
      formData.append("companyName", companyName || companySlug);
      formData.append("taskAction", taskAction);
      formData.append("targetTaskStatus", targetTaskStatus);
      formData.append("routerModel", routerModel);
      if (videoUrl) formData.append("videoUrl", videoUrl);
      if (file) formData.append("file", file);

      const res = await fetch("/api/ingest/inbox-webhook", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo procesar la ingesta por Inbox.");
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#182818] bg-[#0c140c] p-6 shadow-xl space-y-5 font-sans">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#182818] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-2.5 text-emerald-400">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Bot de Ingesta Rápida (Nipëi Inbox via Webhook)
            </h3>
            <p className="text-xs text-slate-400">
              Reenvío de mensajes de WhatsApp/Telegram, audios, fotos y actualización de tareas con Hermes 2.0.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#182818] bg-[#050805] p-1">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === "simulator"
                ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Send size={13} /> ⚡ Simulador MVP
          </button>
          <button
            onClick={() => setActiveTab("future_roadmap")}
            className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === "future_roadmap"
                ? "bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={13} /> 🔮 Módulos Futuros (Roadmap)
          </button>
        </div>
      </div>

      {/* Tab 1: Live Simulator */}
      {activeTab === "simulator" && (
        <form onSubmit={handleSimulate} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
              ⚠️ {error}
            </div>
          )}

          {/* Model Selector & Sender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Modelo Hermes Router (Clasificador)
              </label>
              <select
                value={routerModel}
                onChange={(e) => setRouterModel(e.target.value)}
                className="w-full rounded-xl border border-[#182818] bg-[#050805] p-2.5 text-xs font-mono text-slate-200 focus:border-[#22c55e] focus:outline-none"
              >
                {ROUTER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Origen / Remitente
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="WhatsApp (+54 ...)"
                className="w-full rounded-xl border border-[#182818] bg-[#050805] p-2.5 text-xs font-mono text-slate-200 focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          </div>

          {/* Type & Action Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Acción sobre Tarea / Nota
              </label>
              <select
                value={taskAction}
                onChange={(e) => setTaskAction(e.target.value as any)}
                className="w-full rounded-xl border border-[#182818] bg-[#050805] p-2.5 text-xs font-mono text-slate-200 focus:border-[#22c55e] focus:outline-none"
              >
                <option value="auto">🤖 Clasificación Automática (Hermes Router)</option>
                <option value="create_task">📌 Registrar Tarea Nueva (Kanban)</option>
                <option value="update_task">✅ Actualizar Estado de Tarea</option>
                <option value="create_note">📄 Guardar como Nota de Conocimiento</option>
              </select>
            </div>

            {taskAction === "update_task" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nuevo Estado de Tarea
                </label>
                <select
                  value={targetTaskStatus}
                  onChange={(e) => setTargetTaskStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-[#182818] bg-[#050805] p-2.5 text-xs font-mono text-emerald-400 focus:border-[#22c55e] focus:outline-none"
                >
                  <option value="todo">📌 Por Hacer (TODO)</option>
                  <option value="in_progress">⚙️ En Progreso (IN PROGRESS)</option>
                  <option value="done">✅ Completada / Hecha (DONE)</option>
                </select>
              </div>
            )}
          </div>

          {/* Message Text Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Mensaje Reenviado / Texto de WhatsApp
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej. 'Acordamos en la reunión pasar el despliegue del servidor VPS para el viernes. Marcar tarea de infra como en progreso.'"
              className="w-full rounded-xl border border-[#182818] bg-[#050805] p-3 text-xs text-slate-200 focus:border-[#22c55e] focus:outline-none placeholder:text-slate-600 font-sans"
            />
          </div>

          {/* File or Video Link Optional Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Adjunto Opcional (Audio / Imagen / PDF)
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full cursor-pointer rounded-xl border border-[#182818] bg-[#050805] p-1.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Enlace de Video / Web (Opcional)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-[#182818] bg-[#050805] p-2.5 text-xs font-mono text-slate-200 focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-3 border-t border-[#182818]">
            <span className="text-[11px] font-mono text-slate-500">
              📁 Raw Assets conservados en <code className="text-emerald-400">Raw_Assets/YYYY-MM/</code>
            </span>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-xs font-mono font-bold text-black transition disabled:opacity-50 shadow-lg shadow-green-950/40"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Hermes Procesando...
                </>
              ) : (
                <>
                  <Send size={14} /> Simular Ingesta por Inbox
                </>
              )}
            </button>
          </div>

          {/* Simulation Output Result */}
          {result && (
            <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-400" /> Ingesta Inbox Procesada con Éxito
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
                  Intención: {result.intent}
                </span>
              </div>

              <div className="rounded-lg bg-[#050805] p-3 border border-[#182818] text-xs font-mono text-slate-300 whitespace-pre-wrap">
                {result.replyMessage}
              </div>

              {result.savedRawAssetPath && (
                <p className="text-xs text-slate-400">
                  📁 <strong>Archivo Fuente Conservado:</strong> <code className="text-emerald-300">{result.savedRawAssetPath}</code>
                </p>
              )}
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Future Expansion Roadmap */}
      {activeTab === "future_roadmap" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
            <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" /> Próximos Módulos a Implementar (Roadmap Inbox)
            </h4>
            <p className="mt-1 text-xs text-slate-300">
              Estructura registrada para no olvidar las siguientes capacidades cuando ampliemos este módulo:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FUTURE_MODULES.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-[#182818] bg-[#050805] p-4 space-y-2 hover:border-purple-500/30 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <h5 className="text-xs font-bold text-white">{item.title}</h5>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-500/30 rounded">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
