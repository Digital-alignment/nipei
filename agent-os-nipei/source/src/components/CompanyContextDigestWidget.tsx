"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Building2,
  Key,
  ShieldCheck,
  Check,
  Copy,
  RefreshCw,
  FileText,
  ListTodo,
  Globe,
  Cpu,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import RichNoteViewerModal from "./RichNoteViewerModal";

export interface CompanyDigestResult {
  companySlug: string;
  companyName: string;
  category?: string;
  vaultPath?: string;
  summary: string;
  keyGoals: string[];
  keyContacts: { name: string; role: string }[];
  infrastructure: {
    vpsKeyRule?: string;
    detectedTech: string[];
    websites: string[];
  };
  tasksHealth: {
    total: number;
    pending: number;
    completed: number;
    pendingItems: { text: string; noteTitle: string; line: number; relPath: string }[];
  };
  linkedNotes: { relPath: string; title: string; mtime: number }[];
  aiDirectivePrompt: string;
  fullMarkdownDigest: string;
  generatedAt: number;
}

interface CompanyContextDigestWidgetProps {
  companySlug?: string;
  companyName?: string;
}

export default function CompanyContextDigestWidget({
  companySlug,
  companyName,
}: CompanyContextDigestWidgetProps) {
  const [digest, setDigest] = useState<CompanyDigestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showFullMarkdown, setShowFullMarkdown] = useState(false);

  // Note Viewer state
  const [activeNotePath, setActiveNotePath] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    try {
      setRefreshing(true);
      const url = companySlug ? `/api/vault/digest?company=${companySlug}` : "/api/vault/digest";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch digest");

      const data: CompanyDigestResult = await res.json();
      setDigest(data);
    } catch (err) {
      console.error("Error loading company context digest:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companySlug]);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const handleCopyPrompt = () => {
    if (!digest?.aiDirectivePrompt) return;
    navigator.clipboard.writeText(digest.aiDirectivePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);
  };

  const handleOpenNote = async (relPath: string) => {
    try {
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error("Could not load note content");
      const data = await res.json();
      setActiveNotePath(relPath);
      setActiveNoteContent(data.content ?? "");
    } catch (err) {
      console.error("Error opening note:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md text-slate-100 flex flex-col items-center justify-center gap-3 py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-xs text-slate-400 font-mono">Sintetizando contexto 360° del Vault...</span>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-2xl text-slate-100 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap className="w-5 h-5 fill-cyan-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                Auto-Digest & Briefing AI
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono font-medium">
                {digest.companyName}
              </span>
              {digest.category && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {digest.category}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Síntesis contextual en tiempo real agregando notas, infraestructura y tareas pendientes
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPrompt}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              copiedPrompt
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50"
            }`}
            title="Copiar prompt de contexto para Antigravity o Hermes"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? "Contexto Copiado ✦" : "Copiar Prompt AI"}
          </button>

          <button
            onClick={fetchDigest}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Recalcular síntesis de contexto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Grid Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Ficha & SSH Rule */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <Building2 className="w-4 h-4 text-cyan-400" /> Aislamiento SSH
            </span>
            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded">
              Aislamiento Strict
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg font-mono text-xs text-amber-300 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{digest.infrastructure.vpsKeyRule}</span>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-2">
            {digest.summary}
          </p>
        </div>

        {/* Card 2: Stack Técnico */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" /> Stack Detectado
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {digest.infrastructure.detectedTech.length} Herramientas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {digest.infrastructure.detectedTech.length > 0 ? (
              digest.infrastructure.detectedTech.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-500/30"
                >
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">Digital Alignment Web Stack</span>
            )}
          </div>
          {digest.infrastructure.websites.length > 0 && (
            <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{digest.infrastructure.websites[0]}</span>
            </div>
          )}
        </div>

        {/* Card 3: Salud de Tareas */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium flex items-center gap-1.5 text-slate-300">
              <ListTodo className="w-4 h-4 text-amber-400" /> Salud de Tareas
            </span>
            <span className="text-[10px] text-amber-300 font-mono font-bold">
              {digest.tasksHealth.pending} Pendientes / {digest.tasksHealth.completed} OK
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{
                width: `${
                  digest.tasksHealth.total > 0
                    ? (digest.tasksHealth.completed / digest.tasksHealth.total) * 100
                    : 100
                }%`,
              }}
            />
            <div
              className="bg-amber-500 h-full transition-all"
              style={{
                width: `${
                  digest.tasksHealth.total > 0
                    ? (digest.tasksHealth.pending / digest.tasksHealth.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {digest.tasksHealth.pending > 0
              ? `${digest.tasksHealth.pending} acciones pendientes de resolución en el backlog.`
              : "🟢 Sin tareas pendientes. Todo al día."}
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Top Pending Tasks */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5 text-amber-400" /> Próximas Tareas Prioritarias ({digest.tasksHealth.pendingItems.length})
          </h4>
          {digest.tasksHealth.pendingItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              🟢 No hay tareas pendientes registradas en las notas de esta empresa.
            </div>
          ) : (
            <div className="space-y-1.5">
              {digest.tasksHealth.pendingItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-900/60 border border-slate-800 rounded-lg flex items-start justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span className="text-slate-200 leading-snug">{item.text}</span>
                  </div>
                  <button
                    onClick={() => handleOpenNote(item.relPath)}
                    className="text-[10px] text-cyan-400 hover:underline shrink-0 font-mono"
                  >
                    {item.noteTitle}:L{item.line}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Linked Notes Map */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" /> Notas de Conocimiento Vinculadas ({digest.linkedNotes.length})
          </h4>
          {digest.linkedNotes.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No hay notas asociadas directamente a este slug en el Vault.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {digest.linkedNotes.map((note) => (
                <button
                  key={note.relPath}
                  onClick={() => handleOpenNote(note.relPath)}
                  className="w-full text-left p-2 bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
                    <span className="text-slate-200 font-medium truncate">{note.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono truncate">{note.relPath}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Full Executive Markdown */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={() => setShowFullMarkdown((prev) => !prev)}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-mono"
        >
          {showFullMarkdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{showFullMarkdown ? "Ocultar Briefing Markdown Completo" : "Ver Briefing Ejecutivo en Formato Markdown"}</span>
        </button>

        {showFullMarkdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto"
          >
            {digest.fullMarkdownDigest}
          </motion.div>
        )}
      </div>

      {/* Rich Note Viewer Modal */}
      {activeNotePath && activeNoteContent !== null && (
        <RichNoteViewerModal
          path={activeNotePath}
          initialContent={activeNoteContent}
          onClose={() => {
            setActiveNotePath(null);
            setActiveNoteContent(null);
          }}
          onSaveSuccess={() => {
            fetchDigest();
          }}
        />
      )}
    </div>
  );
}
