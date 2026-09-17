"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, FileText, Sparkles, Clock, Network, ShieldCheck, Database, Building2, Workflow } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import dynamic from "next/dynamic";
import Panel from "./Panel";
import IngestionAuditorView from "./IngestionAuditorView";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

// Three.js bundle is heavy — keep it out of the initial render path.
const VaultGraph3D = dynamic(() => import("./VaultGraph3D"), { ssr: false });
const MemoryGalaxy = dynamic(() => import("./MemoryGalaxy"), { ssr: false });

interface NoteHit { path: string; title: string; preview: string; score: number; mtime: number; }
interface RecentNote { path: string; title: string; mtime: number; }

export type MemoryTab = "ingestion" | "graph" | "recent" | "search" | "omi" | "archify";

export default function MemoryPanel({ initialTab = "graph" }: { initialTab?: MemoryTab }) {
  const { activeCompany } = useCompany();
  const [tab, setTab] = useState<MemoryTab>(initialTab);
  const [galaxyMode, setGalaxyMode] = useState(true); // cinematic Memory Galaxy is the default wow view
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<NoteHit[]>([]);
  const [omi, setOmi] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentNote[]>([]);
  const [open, setOpen] = useState<{ path: string; content: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [archifyTopic, setArchifyTopic] = useState<string>("Secuencia RAG Hermes 2.0");
  const inputRef = useRef<HTMLInputElement>(null);
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initial recent fetch
  useEffect(() => {
    fetch("/api/memory/recent").then((r) => r.json()).then((j) => setRecent(j.recent ?? []));
  }, []);

  // debounced search
  useEffect(() => {
    if (!q.trim()) {
      setNotes([]); setOmi([]); setSearching(false);
      return;
    }
    setSearching(true);
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/memory/search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setNotes(j.notes ?? []);
        setOmi(j.omi ?? []);
        if (tab === "recent") setTab((j.omi?.length ?? 0) > (j.notes?.length ?? 0) ? "omi" : "search");
      } finally { setSearching(false); }
    }, 220);
    return () => { if (debTimer.current) clearTimeout(debTimer.current); };
  }, [q, tab]);

  // load full omi feed on first switch with empty q
  useEffect(() => {
    if (tab === "omi" && omi.length === 0 && !q.trim()) {
      fetch("/api/memory/omi?limit=60").then((r) => r.json()).then((j) => setOmi(j.items ?? []));
    }
  }, [tab, omi.length, q]);

  async function openNote(p: string) {
    const r = await fetch(`/api/memory/note?path=${encodeURIComponent(p)}`);
    if (!r.ok) return;
    const j = await r.json();
    setOpen({ path: j.path, content: j.content });
  }

  const tabs: { key: MemoryTab; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "graph", label: "Graph (3D Galaxy)", icon: <Network size={12} /> },
    { key: "search", label: "Notes", icon: <FileText size={12} />, count: notes.length },
    { key: "recent", label: "Recent", icon: <Clock size={12} />, count: recent.length },
    { key: "omi", label: "Omi", icon: <Sparkles size={12} />, count: omi.length },
    { key: "ingestion", label: "Ingestão & Vault", icon: <ShieldCheck size={13} className="text-[#22c55e]" /> },
    { key: "archify", label: "Diagramas Archify", icon: <Workflow size={13} className="text-[#22c55e]" /> },
  ];

  const highlight = (text: string) => {
    if (!q.trim()) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    return text.split(re).map((part, i) =>
      re.test(part)
        ? <mark key={i} className="bg-[rgba(168,85,247,0.25)] text-[var(--fg)] rounded px-0.5">{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  const fmtAgo = (ms: number) => {
    const d = Date.now() - ms;
    if (d < 60_000) return "just now";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
    return `${Math.floor(d / 86_400_000)}d ago`;
  };

  return (
    <Panel
      title="Nipëi Memory — Vault Master & Base de Conhecimento"
      accent="system"
      icon={<Brain size={16} className="text-[#22c55e]" />}
      actions={
        <span className="pill pill-info bg-[#142614] border border-[#22c55e]/40 text-[#22c55e]">
          60 notas vault · 1261 omi · 186 notes
        </span>
      }
      className="lg:col-span-3 min-h-[460px]"
    >
      {/* Active Company Focus Banner */}
      {activeCompany && (
        <div
          className="mb-4 p-3 rounded-xl border bg-[#050805] text-xs font-mono flex items-center justify-between gap-3"
          style={{ borderColor: activeCompany.accentColor }}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: activeCompany.accentColor }} />
            <span>
              <span className="text-slate-400">Filtrando memoria de empresa:</span>{" "}
              <strong style={{ color: activeCompany.accentColor }}>{activeCompany.name}</strong>{" "}
              <span className="text-[10px] text-slate-500">({activeCompany.vaultPath})</span>
            </span>
          </div>
          <button
            onClick={() => openNote(activeCompany.vaultPath)}
            className="px-2.5 py-1 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] rounded-lg text-[11px] font-bold transition border border-[#22c55e]/40"
          >
            Abrir Nota Vault
          </button>
        </div>
      )}

      {/* Top Tab Bar Navigation */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-[#080d08] border border-[#182818] rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              tab === t.key
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/50 shadow-md shadow-green-950/30"
                : "bg-[#050805] text-[#88a888] border border-[#182818] hover:text-white hover:border-[#22c55e]/30"
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-[#142614] text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                {t.count}
              </span>
            )}
          </button>
        ))}

        {tab === "graph" && (
          <button
            onClick={() => setGalaxyMode((g) => !g)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[#183018] border border-[#22c55e]/40 text-[#22c55e]"
            title="Toggle the cinematic Memory Galaxy view"
          >
            <Sparkles size={13} />{galaxyMode ? "Galaxy ✦" : "Clean graph"}
          </button>
        )}
      </div>

      {/* TAB 1: INGESTION & VAULT MASTER */}
      {tab === "ingestion" && (
        <div className="w-full">
          <IngestionAuditorView />
        </div>
      )}

      {/* TAB 2: GRAPH */}
      {tab === "graph" && (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-[600px] rounded-2xl border border-[var(--panel-border)] overflow-hidden relative bg-black">
            {galaxyMode ? <MemoryGalaxy onOpenNote={openNote} /> : <VaultGraph3D onOpenNote={openNote} />}
          </div>
          {open && (
            <div className="mt-3 panel border border-[var(--panel-border)] p-0 overflow-hidden max-h-[40vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--panel-border)] bg-[rgba(0,0,0,0.25)]">
                <div className="text-[11px] uppercase tracking-widest text-[var(--fg-dimmer)] truncate">{open.path}</div>
                <button onClick={() => setOpen(null)} className="text-[11px] text-[var(--fg-dim)] hover:text-[var(--fg)]">close ✕</button>
              </div>
              <pre className="scroll flex-1 min-h-0 overflow-auto p-4 text-[12.5px] leading-relaxed text-[var(--fg)] whitespace-pre-wrap">{open.content}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ARCHIFY DIAGRAMS */}
      {tab === "archify" && (
        <div className="w-full">
          <ArchifyDiagramWidget
            prebuiltId="hermes-rag-sequence"
            defaultTopic={archifyTopic || q || "Secuencia RAG Hermes 2.0 & Consulta de Memoria"}
            defaultType="sequence"
            title="Diagramas Archify — Nipëi Memory & RAG Sequence"
            height="580px"
          />
        </div>
      )}

      {/* TABS 3, 4, 5: SEARCH, RECENT, OMI */}
      {tab !== "ingestion" && tab !== "graph" && tab !== "archify" && (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
          {/* Left: search + list */}
          <div className="lg:w-[380px] flex flex-col min-h-0 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[rgba(0,0,0,0.25)] mb-3">
              <Search size={14} className="text-[var(--fg-dimmer)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 1261 memories + 186 notes…"
                className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--fg-dimmer)]"
              />
              {searching && <span className="text-[10px] text-[var(--fg-dimmer)] uppercase tracking-wider">…</span>}
            </div>

            <div className="scroll flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
              {tab === "recent" && recent.map((n) => (
                <motion.button
                  key={n.path}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => openNote(n.path)}
                  className="block w-full text-left px-3 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-border-hot)] hover:bg-[rgba(255,255,255,0.03)] transition"
                >
                  <div className="text-[13px] text-[var(--fg)] truncate">{n.title}</div>
                  <div className="text-[10px] text-[var(--fg-dimmer)] flex justify-between mt-0.5">
                    <span className="truncate mr-2">{n.path}</span>
                    <span className="shrink-0">{fmtAgo(n.mtime)}</span>
                  </div>
                </motion.button>
              ))}

              {tab === "search" && notes.map((n) => (
                <motion.button
                  key={n.path}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => openNote(n.path)}
                  className="block w-full text-left px-3 py-2 rounded-lg border border-[var(--panel-border)] hover:border-[var(--panel-border-hot)] hover:bg-[rgba(255,255,255,0.03)] transition"
                >
                  <div className="text-[13px] text-[var(--fg)] truncate">{highlight(n.title)}</div>
                  <div className="text-[11px] text-[var(--fg-dim)] line-clamp-2 mt-0.5 leading-snug">{highlight(n.preview)}</div>
                  <div className="text-[10px] text-[var(--fg-dimmer)] flex justify-between mt-1">
                    <span className="truncate mr-2">{n.path}</span>
                    <span className="shrink-0">{fmtAgo(n.mtime)}</span>
                  </div>
                </motion.button>
              ))}

              {tab === "omi" && omi.map((t, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-[var(--panel-border)] bg-[rgba(0,0,0,0.2)] text-[12.5px] leading-relaxed text-[var(--fg-dim)]">
                  {highlight(t)}
                </div>
              ))}
            </div>
          </div>

          {/* Right: note detail preview */}
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-[var(--panel-border)] bg-[rgba(0,0,0,0.3)] overflow-hidden">
            {open ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--panel-border)] bg-[rgba(0,0,0,0.25)]">
                  <div className="text-[11px] uppercase tracking-widest text-[var(--fg-dim)] font-mono truncate">{open.path}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setArchifyTopic(`Nota Vault: ${open.path}`);
                        setTab("archify");
                      }}
                      className="px-2.5 py-1 bg-[#142614] border border-[#22c55e]/40 text-[#22c55e] hover:bg-[#1e381e] rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition"
                    >
                      <Workflow size={11} /> 📐 Ver Diagrama Archify
                    </button>
                    <button onClick={() => setOpen(null)} className="text-[11px] text-[var(--fg-dimmer)] hover:text-[var(--fg)]">close ✕</button>
                  </div>
                </div>
                <pre className="scroll flex-1 min-h-0 overflow-auto p-4 text-[13px] leading-relaxed text-[var(--fg)] whitespace-pre-wrap font-mono">{open.content}</pre>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--fg-dimmer)]">
                <FileText size={28} className="mb-2 opacity-40" />
                <p className="text-xs font-mono">Select a note or memory from the left to inspect its full markdown context.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
