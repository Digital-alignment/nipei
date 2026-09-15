"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Copy,
  Download,
  Check,
  ShieldCheck,
  Zap,
  BookOpen,
  Share2,
  List,
  RefreshCw,
} from "lucide-react";

interface VaultNoteOption {
  path: string;
  title: string;
}

export default function GenericContentStudio() {
  const [notes, setNotes] = useState<VaultNoteOption[]>([]);
  const [selectedNotePath, setSelectedNotePath] = useState<string>("");
  const [contentType, setContentType] = useState<"article" | "factsheet" | "social">("article");
  const [tone, setTone] = useState("Didáctico Educativo");
  const [promptFocus, setPromptFocus] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  // Load vault notes list for grounding selection
  useEffect(() => {
    async function loadVaultNotes() {
      try {
        const res = await fetch("/api/vault/health-report");
        const json = await res.json();
        if (json.success && json.vaultExplorerData?.knowledgeNotes) {
          const list = json.vaultExplorerData.knowledgeNotes.map((n: any) => ({
            path: n.path,
            title: n.title || n.name,
          }));
          setNotes(list);
          if (list.length > 0) setSelectedNotePath(list[0].path);
        }
      } catch (e) {
        console.error("Error loading notes for content studio:", e);
      }
    }
    loadVaultNotes();
  }, []);

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setCopied(false);
    setSavedToVault(false);
    try {
      const res = await fetch("/api/content/generate-generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultNotePath: selectedNotePath,
          contentType,
          tone,
          topicPrompt: promptFocus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedOutput(json);
      } else {
        alert("Error al generar contenido: " + (json.error || "Desconocido"));
      }
    } catch (err: any) {
      alert("Error de conexión: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedOutput?.generatedMarkdown) {
      navigator.clipboard.writeText(generatedOutput.generatedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!generatedOutput?.generatedMarkdown) return;
    const blob = new Blob([generatedOutput.generatedMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contenido_generado_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-b from-[#0e1610] via-[#09100a] to-[#050805] border border-[#1b331c] rounded-3xl p-6 md:p-8 shadow-2xl text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#182a18]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 text-[11px] font-black tracking-wider uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              NIPËI OS CONTENT STUDIO (FASE 7.2 MVF)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Motor de Generación de Contenido
          </h2>
          <p className="text-xs md:text-sm text-[#8aa88a] mt-1">
            Transforma notas y conocimiento del Vault en artículos, fichas técnicas y sintetizados sin alucinaciones.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0c180e] p-3.5 rounded-2xl border border-[#1b331c]">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div className="text-xs">
            <p className="text-[#688a68]">Aislamiento Estricto:</p>
            <p className="font-bold text-white">100% Exclusivo Nipëi OS Vault</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-5 bg-[#080f09] border border-[#152416] p-6 rounded-2xl">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-300 mb-2 flex items-center justify-between">
              <span>1. Nota Fuente de Nipëi Vault *</span>
              <span className="text-emerald-400 font-mono text-[10px]">{notes.length} disponibles</span>
            </label>
            <select
              value={selectedNotePath}
              onChange={(e) => setSelectedNotePath(e.target.value)}
              className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
            >
              {notes.length === 0 ? (
                <option value="">Cargando notas del Vault...</option>
              ) : (
                notes.map((n) => (
                  <option key={n.path} value={n.path}>
                    📄 {n.title} ({n.path.slice(0, 30)}...)
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-300 mb-2">
              2. Formato de Generación *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setContentType("article")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                  contentType === "article"
                    ? "bg-[#142916] text-emerald-300 border-emerald-500 shadow-md"
                    : "bg-[#0d180f] text-slate-400 border-[#1c351f] hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" /> Artículo Blog
              </button>

              <button
                type="button"
                onClick={() => setContentType("factsheet")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                  contentType === "factsheet"
                    ? "bg-[#142916] text-cyan-300 border-cyan-500 shadow-md"
                    : "bg-[#0d180f] text-slate-400 border-[#1c351f] hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Ficha Técnica
              </button>

              <button
                type="button"
                onClick={() => setContentType("social")}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                  contentType === "social"
                    ? "bg-[#142916] text-purple-300 border-purple-500 shadow-md"
                    : "bg-[#0d180f] text-slate-400 border-[#1c351f] hover:text-white"
                }`}
              >
                <Share2 className="w-4 h-4" /> Social / Broadcast
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
              3. Tono & Estilo
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Didáctico Educativo">Didáctico Educativo</option>
              <option value="Técnico Corporativo">Técnico Corporativo (Squads)</option>
              <option value="Sabiduría & Manifiesto">Sabiduría & Manifiesto Nipëi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
              4. Enfoque Específico (Opcional)
            </label>
            <input
              type="text"
              value={promptFocus}
              onChange={(e) => setPromptFocus(e.target.value)}
              placeholder="Ej. Enfatizar la gobernanza de squads y cero alucinación"
              className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleGenerateContent}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Generando en Content Studio...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Generar Contenido Sustentado
              </>
            )}
          </button>
        </div>

        {/* Output Preview Column */}
        <div className="lg:col-span-7 bg-[#080f09] border border-[#152416] p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#152416]">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Previsualización del Contenido Generado
              </h3>

              {generatedOutput && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142916] hover:bg-[#1e3b21] text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142916] hover:bg-[#1e3b21] text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </button>
                </div>
              )}
            </div>

            {generatedOutput ? (
              <div className="space-y-4">
                <div className="p-3 bg-[#0d180f] border border-[#1b331c] rounded-xl text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                  <span>Fuente Vault: {generatedOutput.sourceVaultPath}</span>
                  <span className="text-slate-400">SHA256: {generatedOutput.sha256?.slice(0, 12)}...</span>
                </div>

                <div className="bg-[#0b140c] border border-[#172818] p-4 rounded-xl text-xs font-mono text-slate-200 overflow-y-auto max-h-[420px] leading-relaxed whitespace-pre-wrap">
                  {generatedOutput.generatedMarkdown}
                </div>
              </div>
            ) : (
              <div className="h-[360px] border border-dashed border-[#172818] rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Sparkles className="w-10 h-10 text-emerald-800 mb-3" />
                <p className="text-xs font-bold text-slate-400">Ningún contenido generado aún</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                  Selecciona una nota de Nipëi Vault y haz clic en **Generar Contenido Sustentado**.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#152416] text-[11px] text-[#688a68] flex items-center justify-between font-mono">
            <span>Garantía: Cero Alucinación Externa</span>
            <span>Nipëi OS Studio v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
