"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, CheckCircle2, MessageSquare, Mic, Mail, FileText, Building2, RefreshCw, Eye, Sparkles } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import RichNoteViewerModal from "./RichNoteViewerModal";

interface FastIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCompanySlug?: string;
  defaultCompanyName?: string;
  onIngestSuccess?: (path: string) => void;
}

const SOURCE_TYPES = [
  { id: "whatsapp", label: "Chat WhatsApp", icon: <MessageSquare size={14} className="text-emerald-400" /> },
  { id: "meeting_notes", label: "Minuta de Reunión", icon: <Mic size={14} className="text-[#22c55e]" /> },
  { id: "email", label: "Correo / Mensaje", icon: <Mail size={14} className="text-blue-400" /> },
  { id: "general", label: "Texto Libre / Doc", icon: <FileText size={14} className="text-purple-400" /> },
];

const SQUADS_LIST = [
  { id: "squad_1_ceo", label: "Squad I — CEO & Estratégia" },
  { id: "squad_2_mutum", label: "Squad II — Produção Mutum" },
  { id: "squad_3_retiros", label: "Squad III — Logística Retiros" },
  { id: "squad_4_vendas_mkt", label: "Squad IV — Vendas & Mkt" },
  { id: "squad_5_adm_legal", label: "Squad V — Adm / Legal / Fin" },
  { id: "squad_6_infra", label: "Squad VI — Infraestrutura" },
  { id: "squad_7_instituto", label: "Squad VII — Instituto" },
];

export default function FastIngestModal({
  isOpen,
  onClose,
  defaultCompanySlug = "",
  defaultCompanyName = "",
  onIngestSuccess,
}: FastIngestModalProps) {
  const { companies } = useCompany();
  const [sourceType, setSourceType] = useState<string>("meeting_notes");
  const [targetCompany, setTargetCompany] = useState<string>(defaultCompanySlug);
  const [squadId, setSquadId] = useState<string>("squad_1_ceo");
  const [title, setTitle] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdNotePath, setCreatedNotePath] = useState<string | null>(null);
  const [openViewer, setOpenViewer] = useState<{ path: string; content: string } | null>(null);

  if (!isOpen) return null;

  const activeCompanyObj = companies.find((c) => c.id === targetCompany);
  const compName = activeCompanyObj?.name || defaultCompanyName || targetCompany;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ingest/fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          title,
          sourceType,
          companySlug: targetCompany,
          companyName: compName,
          squadId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedNotePath(data.path);
        if (onIngestSuccess) onIngestSuccess(data.path);
      } else {
        setError(data.error || "Error al procesar la ingesta.");
      }
    } catch (err: any) {
      setError(err?.message || "Error al conectar con la API de Ingesta.");
    } finally {
      setLoading(false);
    }
  };

  const openInViewer = async (pathStr: string) => {
    try {
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(pathStr)}`);
      if (!res.ok) return;
      const data = await res.json();
      setOpenViewer({ path: data.path, content: data.content });
    } catch (err) {
      console.error("Error loading note in viewer:", err);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0c140c] border border-[#1f3a22] p-6 md:p-8 rounded-3xl max-w-2xl w-full space-y-5 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#182818] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#142614] border border-[#22c55e]/40 text-[#22c55e]">
                <Zap size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Ingestador Rápido Multiformato <span className="text-[10px] font-mono text-[#22c55e] border border-[#22c55e]/30 px-2 py-0.5 rounded-full bg-[#142614]">1-Click Vault</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Pegue texto bruto, minutas o chats. El sistema le asigna metadatos y lo sincroniza a <code className="text-emerald-400">nipei-vault</code>.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X size={18} />
            </button>
          </div>

          {/* Success State Screen */}
          {createdNotePath ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#142614] border border-[#22c55e] text-[#22c55e] flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">¡Ingesta procesada y guardada en el Vault!</h4>
                <p className="text-xs font-mono text-emerald-400 truncate max-w-md mx-auto mt-1">
                  📄 {createdNotePath}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 font-mono text-xs">
                <button
                  onClick={() => openInViewer(createdNotePath)}
                  className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold rounded-xl transition flex items-center gap-2"
                >
                  <Eye size={14} /> Abrir en Visor Rich Markdown
                </button>
                <button
                  onClick={() => {
                    setCreatedNotePath(null);
                    setRawText("");
                    setTitle("");
                  }}
                  className="px-4 py-2 bg-[#050805] border border-[#182818] text-slate-300 hover:text-white rounded-xl transition"
                >
                  Ingestar Otro Documento
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source Type Selector */}
              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-slate-300 font-bold block">Tipo de Fuente</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SOURCE_TYPES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSourceType(st.id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition ${
                        sourceType === st.id
                          ? "bg-[#142614] border-[#22c55e] text-white font-bold shadow"
                          : "bg-[#050805] border-[#182818] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st.icon}
                      <span className="text-[11px] truncate">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Company & Squad Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Empresa Destino</label>
                  <select
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full bg-[#050805] border border-[#182818] text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/60"
                  >
                    <option value="">General / Sistema Nipëi OS</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">Squad Asignado</label>
                  <select
                    value={squadId}
                    onChange={(e) => setSquadId(e.target.value)}
                    className="w-full bg-[#050805] border border-[#182818] text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500/60"
                  >
                    {SQUADS_LIST.map((sq) => (
                      <option key={sq.id} value={sq.id}>
                        {sq.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Title input */}
              <div className="space-y-1 font-mono text-xs">
                <label className="text-slate-300 font-bold flex items-center justify-between">
                  <span>Título de la Nota <span className="text-slate-500 font-normal">(opcional, se auto-detecta)</span></span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Minuta WhatsApp: Acuerdos de Infraestructura VPS"
                  className="w-full bg-[#050805] border border-[#182818] text-white placeholder:text-slate-600 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Main Raw Text Area */}
              <div className="space-y-1 font-mono text-xs">
                <label className="text-slate-300 font-bold block">Texto Bruto / Contenido Sin Formato</label>
                <textarea
                  required
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Pega aquí el chat de WhatsApp, minuta de reunión, notas rápidas, correo o fragmento de audio..."
                  className="w-full bg-[#050805] border border-[#182818] text-slate-200 placeholder:text-slate-600 rounded-xl p-3.5 outline-none focus:border-emerald-500/60 font-mono text-xs leading-relaxed"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs font-mono text-red-200">
                  ⚠️ {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-[#050805] border border-[#182818] text-slate-400 hover:text-white rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading || !rawText.trim()}
                  className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-green-950/40"
                >
                  {loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                  {loading ? "Procesando e Ingestando..." : "⚡ Ingestar al Vault en 1-Click"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* Embedded Viewer when opening created note */}
      {openViewer && (
        <RichNoteViewerModal
          path={openViewer.path}
          initialContent={openViewer.content}
          onClose={() => setOpenViewer(null)}
        />
      )}
    </>
  );
}
