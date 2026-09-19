"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, FileText, Sparkles, Clock, Network, ShieldCheck, Database, Building2, Workflow, Filter, Check, AlertTriangle, CheckSquare } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import dynamic from "next/dynamic";
import Panel from "./Panel";
import IngestionAuditorView from "./IngestionAuditorView";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";
import RichNoteViewerModal from "./RichNoteViewerModal";
import VaultTodoExtractorWidget from "./VaultTodoExtractorWidget";

// Three.js bundle is heavy — keep it out of the initial render path.
const VaultGraph3D = dynamic(() => import("./VaultGraph3D"), { ssr: false });
const MemoryGalaxy = dynamic(() => import("./MemoryGalaxy"), { ssr: false });

interface NoteHit { path: string; title: string; preview: string; score: number; mtime: number; }
interface RecentNote { path: string; title: string; mtime: number; }

export type MemoryTab = "ingestion" | "graph" | "recent" | "search" | "todos" | "omi" | "archify";

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
  const [squadFilter, setSquadFilter] = useState<string>("all");
  
  // Hermes 2.0 RAG In-Situ Query State
  const [askQuestion, setAskQuestion] = useState("");
  const [askingHermes, setAskingHermes] = useState(false);
  const [hermesResponse, setHermesResponse] = useState<{
    query: string;
    answerText: string;
    isGrounded: boolean;
    groundingScore: number;
    citations: { path: string; filename: string; title: string; sha256: string; snippet: string }[];
    missingInformation: boolean;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleAskHermes(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!askQuestion.trim() || askingHermes) return;
    setAskingHermes(true);
    try {
      const res = await fetch("/api/memory/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: askQuestion,
          squadId: squadFilter !== "all" ? squadFilter : "squad_1_ceo",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHermesResponse(data);
      }
    } catch (err) {
      console.error("Error asking Hermes RAG:", err);
    } finally {
      setAskingHermes(false);
    }
  }

  const squadFilters = [
    { id: "all", label: "Todos", match: "" },
    { id: "squad_01", label: "Squad 01 (CEO)", match: "squad_01" },
    { id: "squad_02", label: "Squad 02 (Ops)", match: "squad_02" },
    { id: "squad_03", label: "Squad 03 (Mkt)", match: "squad_03" },
    { id: "squad_04", label: "Squad 04 (Fin)", match: "squad_04" },
    { id: "squad_05", label: "Squad 05 (Tech)", match: "squad_05" },
    { id: "squad_06", label: "Squad 06 (Ventas)", match: "squad_06" },
    { id: "squad_07", label: "Squad 07 (Inst)", match: "squad_07" },
    { id: "master", label: "Master Sources", match: "master_sources" },
    { id: "audit", label: "Auditorías", match: "todo_audit_lists" },
  ];

  const filteredRecent = useMemo(() => {
    if (squadFilter === "all") return recent;
    const targetMatch = squadFilters.find((f) => f.id === squadFilter)?.match || "";
    return recent.filter((n) => n.path.toLowerCase().replace(/\\/g, "/").includes(targetMatch));
  }, [recent, squadFilter]);

  const filteredNotes = useMemo(() => {
    if (squadFilter === "all") return notes;
    const targetMatch = squadFilters.find((f) => f.id === squadFilter)?.match || "";
    return notes.filter((n) => n.path.toLowerCase().replace(/\\/g, "/").includes(targetMatch));
  }, [notes, squadFilter]);

  function handleSaveSuccess(savedPath: string, newContent: string) {
    setOpen({ path: savedPath, content: newContent });
    fetch("/api/memory/recent").then((r) => r.json()).then((j) => setRecent(j.recent ?? []));
  }

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
    { key: "todos", label: "Tareas Vault", icon: <CheckSquare size={13} className="text-amber-400" /> },
    { key: "search", label: "Notes", icon: <FileText size={12} />, count: filteredNotes.length },
    { key: "recent", label: "Recent", icon: <Clock size={12} />, count: filteredRecent.length },
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
          {recent.length} notas recientes · {omi.length} omi · Nipëi Vault Master
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

      {/* Hermes 2.0 In-Situ RAG Consultation Box */}
      <div className="mb-4 p-3.5 rounded-xl border border-[#1f3a22] bg-[#050c06] text-xs font-mono">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#22c55e] animate-pulse" />
            <span className="font-bold text-slate-200 text-[13px]">
              Consultar a Hermes 2.0 <span className="text-[10px] text-[#22c55e] font-normal font-mono border border-[#22c55e]/30 px-1.5 py-0.5 rounded ml-1 bg-[#142614]">Zero-Hallucination RAG</span>
            </span>
          </div>
          {hermesResponse && (
            <button
              onClick={() => setHermesResponse(null)}
              className="text-[10px] text-slate-400 hover:text-white transition"
            >
              Limpiar consulta ✕
            </button>
          )}
        </div>

        <form onSubmit={handleAskHermes} className="flex gap-2">
          <input
            type="text"
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            placeholder="Haz una pregunta en lenguaje natural sobre las políticas, squads o notas del Vault..."
            className="flex-1 bg-[#09120a] border border-[#182a1b] text-slate-200 placeholder:text-slate-500 rounded-lg px-3 py-2 outline-none focus:border-[#22c55e]/60 transition font-sans text-xs"
          />
          <button
            type="submit"
            disabled={askingHermes || !askQuestion.trim()}
            className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-bold rounded-lg transition flex items-center gap-1.5 shrink-0"
          >
            {askingHermes ? (
              <>
                <span className="animate-spin text-sm">⟳</span> Escaneando Vault…
              </>
            ) : (
              <>
                <Sparkles size={13} /> Consultar
              </>
            )}
          </button>
        </form>

        {/* Hermes Response & Citation Cards */}
        {hermesResponse && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-lg border bg-[#081009] border-[#1b351e]"
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#182818]">
              <div className="flex items-center gap-2">
                {hermesResponse.isGrounded ? (
                  <span className="px-2 py-0.5 rounded bg-[#142614] border border-[#22c55e]/50 text-[#22c55e] text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck size={11} /> Certificado por Vault (Grounding: {(hermesResponse.groundingScore * 100).toFixed(0)}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-[#2a1a08] border border-[#f59e0b]/50 text-[#f59e0b] text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> Vacío de Ingesta Registrado
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[300px]">Pregunta: "{hermesResponse.query}"</span>
            </div>

            <div className="text-slate-300 text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans mb-3">
              {hermesResponse.answerText}
            </div>

            {hermesResponse.citations && hermesResponse.citations.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[#182818]">
                <div className="text-[10px] uppercase font-mono font-bold text-[#668866] mb-2 flex items-center gap-1">
                  <FileText size={11} className="text-[#22c55e]" /> Citas Directas del Vault (Click para abrir en Visor):
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {hermesResponse.citations.map((cit) => (
                    <button
                      key={cit.path}
                      onClick={() => openNote(cit.path)}
                      className="text-left p-2 rounded-lg bg-[#0c160d] border border-[#1b331f] hover:border-[#22c55e]/60 hover:bg-[#122214] transition group"
                    >
                      <div className="text-[11px] font-bold text-[#22c55e] truncate group-hover:underline">
                        {cit.title}
                      </div>
                      <div className="text-[9.5px] text-slate-500 font-mono truncate">{cit.path}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight font-sans">
                        {cit.snippet}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
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

      {/* TAB 7: VAULT TODOS */}
      {tab === "todos" && (
        <div className="w-full">
          <VaultTodoExtractorWidget companySlug={activeCompany?.id} companyName={activeCompany?.name} />
        </div>
      )}

      {/* TABS: SEARCH, RECENT, OMI */}
      {tab !== "ingestion" && tab !== "graph" && tab !== "archify" && tab !== "todos" && (

        <div className="flex flex-col gap-3 h-full min-h-0">
          {/* Squad & Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#060a06] border border-[#182818] rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-[#668866] font-mono flex items-center gap-1 mr-1">
              <Filter size={11} className="text-[#22c55e]" /> Filtro Squad:
            </span>
            {squadFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setSquadFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  squadFilter === f.id
                    ? "bg-[#22c55e] text-black font-bold shadow"
                    : "bg-[#0c140c] text-[#88a888] hover:text-white border border-[#182818]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
            {/* Left: search + list */}
            <div className="lg:w-[380px] flex flex-col min-h-0 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--panel-border)] bg-[rgba(0,0,0,0.25)] mb-3">
                <Search size={14} className="text-[var(--fg-dimmer)]" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar memorias y notas en Nipëi Vault…"
                  className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--fg-dimmer)]"
                />
                {searching && <span className="text-[10px] text-[var(--fg-dimmer)] uppercase tracking-wider">…</span>}
              </div>

              <div className="scroll flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {tab === "recent" && filteredRecent.map((n) => (
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

                {tab === "search" && filteredNotes.map((n) => (
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

            {/* Right: Rich Markdown Viewer & In-Situ Editor */}
            <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden">
              {open ? (
                <RichNoteViewerModal
                  path={open.path}
                  initialContent={open.content}
                  onClose={() => setOpen(null)}
                  onSaveSuccess={handleSaveSuccess}
                />
              ) : (
                <div className="flex-1 border border-[#182818] rounded-xl flex flex-col items-center justify-center p-8 text-center text-[#668866] bg-[#050805]">
                  <FileText size={32} className="mb-3 text-[#22c55e]/40" />
                  <p className="text-xs font-mono text-[#88a888]">Selecciona una nota o memoria para ver su contenido Rich Markdown y editarla in-situ.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
