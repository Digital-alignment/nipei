"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, FileText, ChevronDown, ChevronUp, RefreshCw, Eye } from "lucide-react";
import RichNoteViewerModal from "./RichNoteViewerModal";

interface ActivityEntry {
  ts: number;
  agent: string;
  text: string;
  level?: "info" | "warn" | "err";
  path?: string;
  title?: string;
}

export default function AgentVaultActivityWidget() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<{ path: string; content: string } | null>(null);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity", { cache: "no-store" });
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 6000);
    return () => clearInterval(interval);
  }, []);

  const openNotePath = async (relPath: string) => {
    try {
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedNote({ path: data.path, content: data.content });
    } catch (err) {
      console.error("Error opening note from activity:", err);
    }
  };

  const fmtAgo = (ms: number) => {
    const diff = Date.now() - ms;
    if (diff < 30_000) return "hace unos segundos";
    if (diff < 60_000) return `hace ${Math.floor(diff / 1000)}s`;
    if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`;
    return `hace ${Math.floor(diff / 86_400_000)}d`;
  };

  const latestEntry = entries.find((e) => e.path) || entries[0];

  return (
    <>
      <div className="relative font-mono text-xs">
        {/* Compact Ticker Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1e3a22] bg-[#050c06] text-slate-300 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
          </span>

          <span className="font-bold text-[11px] text-[#22c55e] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <ShieldCheck size={13} /> Vault Monitor
          </span>

          {latestEntry ? (
            <button
              onClick={() => latestEntry.path && openNotePath(latestEntry.path)}
              className="truncate max-w-[280px] sm:max-w-[420px] text-[11px] text-slate-300 hover:text-white hover:underline transition text-left"
              title="Click para abrir la nota en vivo"
            >
              {latestEntry.text} <span className="text-[10px] text-slate-500">({fmtAgo(latestEntry.ts)})</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 italic">Monitoreando cambios en nipei-vault…</span>
          )}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              onClick={fetchActivity}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Refrescar actividad del Vault"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-[#22c55e]" : ""} />
            </button>
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="p-1 text-slate-400 hover:text-white transition flex items-center gap-1 text-[10px] font-bold"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Expandable Live Feed Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="absolute right-0 top-full mt-2 w-[420px] sm:w-[500px] z-50 bg-[#081009] border border-[#1b351e] p-3.5 rounded-2xl shadow-2xl space-y-2"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#182818]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#22c55e] flex items-center gap-1.5">
                  <FileText size={13} /> Feed de Avances del Vault ({entries.length})
                </span>
                <span className="text-[10px] text-slate-500">Auto-sync 6s</span>
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                {entries.map((entry, idx) => {
                  const isAgentWrite = Boolean(entry.path);
                  return (
                    <motion.div
                      key={`${entry.ts}-${idx}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-2 rounded-xl border text-[11px] leading-snug flex items-start justify-between gap-2 transition ${
                        isAgentWrite
                          ? "bg-[#0c160d] border-[#1b331f] hover:border-[#22c55e]/60 cursor-pointer"
                          : "bg-[#050805] border-[#182818] text-slate-400"
                      }`}
                      onClick={() => entry.path && openNotePath(entry.path)}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              entry.agent === "antigravity"
                                ? "bg-emerald-400"
                                : entry.agent === "hermes"
                                ? "bg-purple-400"
                                : entry.agent === "auditor-ingesta"
                                ? "bg-amber-400"
                                : "bg-cyan-400"
                            }`}
                          />
                          <span className="font-bold text-slate-200 capitalize">{entry.agent}</span>
                          <span className="text-[9.5px] text-slate-500 ml-auto font-mono">
                            {fmtAgo(entry.ts)}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans text-[11px] truncate">{entry.text}</p>
                        {entry.path && (
                          <div className="text-[9.5px] text-[#22c55e] font-mono truncate flex items-center gap-1">
                            <Eye size={10} /> {entry.path}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Note Reader Modal when clicked */}
      {selectedNote && (
        <RichNoteViewerModal
          path={selectedNote.path}
          initialContent={selectedNote.content}
          onClose={() => setSelectedNote(null)}
          onSaveSuccess={(p, c) => {
            setSelectedNote({ path: p, content: c });
            fetchActivity();
          }}
        />
      )}
    </>
  );
}
