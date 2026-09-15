"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  Brain,
  ShieldCheck,
  Zap,
  RefreshCw,
  FolderCheck,
  FileCode,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  Eye,
  Copy,
  Filter,
  Activity,
  Share2,
  Layers,
  ListChecks,
  DollarSign,
  Users,
  Wrench,
} from "lucide-react";

interface ExtractedSquad {
  squadId: string;
  squadName: string;
  extractedItems: string[];
}

interface IngestResult {
  success: boolean;
  message?: string;
  error?: string;
  isDuplicate?: boolean;
  sha256?: string;
  knowledgeFilePath?: string;
  todoFilePath?: string;
  extractedSquads?: ExtractedSquad[];
  missingInfoItems?: string[];
  aiDigest?: {
    keyTakeaways: string[];
    entities: { people: string[]; money: string[]; tools: string[] };
    detectedTasks: string[];
  };
}

interface VaultStats {
  vaultPath: string;
  knowledgeCount: number;
  knowledgeFiles: string[];
  todoCount: number;
  todoFiles: string[];
}

export default function IngestionAuditorView() {
  const [activeTab, setActiveTab] = useState<"ingest" | "audit" | "vault">("ingest");
  const [ingestMethod, setIngestMethod] = useState<"text" | "url" | "file">("text");

  // URL State
  const [urlInput, setUrlInput] = useState("");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Vault Explorer Modal State
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerData, setExplorerData] = useState<any>(null);
  const [explorerTab, setExplorerTab] = useState<"raw" | "knowledge" | "todos" | "graph">("raw");
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Explorer Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "resolved" | "pending">("all");

  // Live Document Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<any>(null);
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vault Health Report Modal State
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Form inputs
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("NotebookLM");
  const [targetSquad, setTargetSquad] = useState("auto_detect");
  const [rawText, setRawText] = useState("");

  // Loading & state
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<IngestResult | null>(null);

  // Vault Status
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch("/api/vault/ingestion");
      const data = await res.json();
      if (data.success) {
        setVaultStats(data);
      }
    } catch (err) {
      console.error("Error fetching vault stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchExplorer = async () => {
    setLoadingExplorer(true);
    try {
      const res = await fetch("/api/vault/explorer");
      const data = await res.json();
      if (data.success) {
        setExplorerData(data);
      }
    } catch (err) {
      console.error("Error fetching explorer data:", err);
    } finally {
      setLoadingExplorer(false);
    }
  };

  const fetchHealthReport = async () => {
    setLoadingReport(true);
    setReportOpen(true);
    try {
      const res = await fetch("/api/vault/health-report");
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Error fetching health report:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  const openFileViewer = async (relPath: string) => {
    setLoadingViewer(true);
    setViewerOpen(true);
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (data.success) {
        setViewerFile(data);
      } else {
        setViewerFile({ name: relPath, path: relPath, content: "Error al cargar archivo: " + data.error });
      }
    } catch (err) {
      setViewerFile({ name: relPath, path: relPath, content: "Error de red al leer el archivo." });
    } finally {
      setLoadingViewer(false);
    }
  };

  const handleCopyContent = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title || selectedFile.name);
      formData.append("targetSquad", targetSquad);

      const res = await fetch("/api/vault/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setLastResult(data);
      if (data.success) {
        setActiveTab("audit");
        fetchStats();
      }
    } catch (err) {
      setLastResult({
        success: false,
        error: "Error de red al subir archivo",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (ingestMethod === "file") {
      return handleFileUpload(e);
    }

    const payloadText = ingestMethod === "url" ? urlInput : rawText;
    if (!payloadText.trim()) return;

    setIsProcessing(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/vault/ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sourceType: ingestMethod === "url" ? "URL" : sourceType,
          rawText: payloadText,
          targetSquad,
        }),
      });
      const data = await res.json();
      setLastResult(data);
      if (data.success) {
        setActiveTab("audit");
        fetchStats();
      }
    } catch (err) {
      setLastResult({
        success: false,
        error: "Error de red al procesar la ingesta en el servidor",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered lists for Vault Explorer
  const filteredRawUploads = explorerData?.rawUploads?.filter((f: any) =>
    searchQuery ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const filteredKnowledgeNotes = explorerData?.knowledgeNotes?.filter((f: any) =>
    searchQuery
      ? f.title.toLowerCase().includes(searchQuery.toLowerCase()) || f.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const filteredTodoList = explorerData?.todoLists?.filter((f: any) => {
    const matchesSearch = searchQuery ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "resolved"
        ? f.isResolved
        : !f.isResolved;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#050805] text-[#e0e8e0] p-4 md:p-8 font-mono">
      {/* Top Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0c140c] border border-[#1f381f] rounded-2xl shadow-xl shadow-green-950/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e]">
              <Brain size={32} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full">
                  FASE 6.3 — INGESTIÓN AUTÓNOMA & PROACTIVA
                </span>
                <span className="text-xs text-[#a0caa0]">Zero-Hallucination AI Digest</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                Agente Auditor de Ingesta <span className="text-[#22c55e]">(Nipëi Vault)</span>
              </h1>
              <p className="text-sm text-[#88a888] mt-0.5">
                Ingesta proactiva con IA Digest, extracción de tareas al Kanban y mapa visual del conocimiento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealthReport}
              className="px-3 py-2 bg-[#142614] hover:bg-[#1f381f] text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Activity size={14} />
              Salud del Vault
            </button>

            <div className="flex items-center gap-3 bg-[#080d08] p-3 rounded-xl border border-[#182818]">
              <Database size={20} className="text-[#22c55e]" />
              <div className="text-xs">
                <p className="text-[#668866]">Vault Activo:</p>
                <p className="font-semibold text-white truncate max-w-[160px]" title="C:\Users\ondig\Code\DA\nipei-vault">
                  nipei-vault (Master)
                </p>
              </div>
              <button
                onClick={fetchStats}
                className="p-1.5 hover:bg-[#182818] text-[#88a888] hover:text-[#22c55e] rounded-lg transition-colors cursor-pointer"
                title="Recargar estado del Vault"
              >
                <RefreshCw size={14} className={isLoadingStats ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-[#182818] pb-3">
          <button
            onClick={() => setActiveTab("ingest")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "ingest"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg shadow-green-950/30"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <Upload size={16} />
            Ingestar Información
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "audit"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg shadow-green-950/30"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <ShieldCheck size={16} />
            Resultados & AI Digest
            {lastResult?.missingInfoItems && lastResult.missingInfoItems.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full font-bold">
                {lastResult.missingInfoItems.length} vacíos
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              activeTab === "vault"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg shadow-green-950/30"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <FolderCheck size={16} />
            Vault Explorer ({vaultStats?.knowledgeCount || 0} Notas)
          </button>
        </div>
      </div>

      {/* TAB 1: INGESTION FORM */}
      {activeTab === "ingest" && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Input Form */}
          <div className="lg:col-span-2 bg-[#0c140c] border border-[#182818] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#182818] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-[#22c55e]" size={20} />
                Cargar Nueva Información al Santuario
              </h2>
              <button
                type="button"
                onClick={() => {
                  setExplorerOpen(true);
                  fetchExplorer();
                }}
                className="px-3.5 py-2 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
              >
                <FolderCheck size={14} />
                Explorador Organizado del Vault
              </button>
            </div>

            {/* Ingestion Method Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-[#050805] border border-[#182818] rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => setIngestMethod("text")}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingestMethod === "text"
                    ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-sm"
                    : "text-[#88a888] hover:text-white"
                }`}
              >
                <FileText size={14} />
                Texto / Apuntes
              </button>

              <button
                type="button"
                onClick={() => setIngestMethod("url")}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingestMethod === "url"
                    ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-sm"
                    : "text-[#88a888] hover:text-white"
                }`}
              >
                <BookOpen size={14} />
                URLs (Individual o Lote)
              </button>

              <button
                type="button"
                onClick={() => setIngestMethod("file")}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingestMethod === "file"
                    ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-sm"
                    : "text-[#88a888] hover:text-white"
                }`}
              >
                <Upload size={14} />
                Subir Archivo (PDF, DOCX)
              </button>
            </div>

            <form onSubmit={handleIngest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#88a888] uppercase mb-1">
                    Título o Identificador del Documento
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Directrices E-commerce Nipëihu"
                    className="w-full bg-[#050805] border border-[#182818] focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#88a888] uppercase mb-1">
                    Squad Destino (Auto-Detect o Forzado)
                  </label>
                  <select
                    value={targetSquad}
                    onChange={(e) => setTargetSquad(e.target.value)}
                    className="w-full bg-[#050805] border border-[#182818] focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="auto_detect">⚡ Auto-Detectar Heurística</option>
                    <option value="Squad_01_CEO">Squad 01 — CEO & Visión</option>
                    <option value="Squad_02_Operaciones">Squad 02 — Operaciones</option>
                    <option value="Squad_03_Marketing">Squad 03 — Marketing & Marca</option>
                    <option value="Squad_04_Finanzas">Squad 04 — Finanzas & Presupuestos</option>
                    <option value="Squad_05_Tecnologia">Squad 05 — Tecnología & VPS</option>
                    <option value="Squad_06_Ventas">Squad 06 — Ventas & CRM</option>
                  </select>
                </div>
              </div>

              {/* METHOD 1: TEXT PASTE */}
              {ingestMethod === "text" && (
                <div>
                  <label className="block text-xs font-bold text-[#88a888] uppercase mb-1">
                    Texto Directo / Apuntes
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Pega aquí el contenido extraído de NotebookLM, Drive o notas del proyecto..."
                    rows={10}
                    className="w-full bg-[#050805] border border-[#182818] focus:border-[#22c55e] rounded-xl p-4 text-xs font-mono text-[#d0e0d0] focus:outline-none transition-all leading-relaxed"
                  />
                </div>
              )}

              {/* METHOD 2: URL LINK */}
              {ingestMethod === "url" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#88a888] uppercase mb-1">
                    URLs (Pega una por línea para procesamiento por lotes)
                  </label>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/document/d/...\nhttps://ejemplo.com/articulo"
                    rows={5}
                    className="w-full bg-[#050805] border border-[#182818] focus:border-[#22c55e] rounded-xl p-4 text-xs text-[#22c55e] focus:outline-none transition-all font-mono"
                  />
                  <p className="text-[11px] text-[#668866]">
                    ⚡ Soporta procesamiento por lotes. Pega múltiples URLs (una por línea).
                  </p>
                </div>
              )}

              {/* METHOD 3: FILE UPLOAD */}
              {ingestMethod === "file" && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[#88a888] uppercase mb-1">
                    Subir Archivo (PDF, DOCX, TXT, MD)
                  </label>
                  <div className="border-2 border-dashed border-[#182818] hover:border-[#22c55e]/60 bg-[#050805] rounded-2xl p-8 text-center transition-colors">
                    <Upload size={36} className="mx-auto mb-3 text-[#22c55e]" />
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#88a888] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#183018] file:text-[#22c55e] hover:file:bg-[#22c55e] hover:file:text-black cursor-pointer"
                    />
                    {selectedFile && (
                      <p className="mt-3 text-xs text-[#22c55e] font-bold">
                        ✓ Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-[#668866]">
                    🔒 El archivo fuente original se conservará 100% intacto en <code className="text-[#22c55e]">Raw_Uploads/</code>.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#183018] hover:bg-[#22c55e] text-[#22c55e] hover:text-black border border-[#22c55e]/40 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-green-950/40 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generando AI Digest & Despachando Tareas...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Ingestar & Generar AI Digest en el Vault
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar Guidelines */}
          <div className="space-y-6">
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="text-[#22c55e]" size={18} />
                Motor Inteligente Fase 6.3
              </h3>
              <ul className="space-y-3 text-xs text-[#a0caa0]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Genera Resumen Ejecutivo (AI Digest) con conclusiones clave.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Despacha tareas detectadas al Kanban de Squads.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#22c55e] shrink-0 mt-0.5" />
                  <span>Auditoría Cero-Alucinación y huella SHA-256.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT RESULTS */}
      {activeTab === "audit" && (
        <div className="max-w-7xl mx-auto space-y-6">
          {lastResult ? (
            lastResult.success ? (
              <div className="space-y-6">
                {/* Anti-duplicate warning banner */}
                {lastResult.isDuplicate && (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-center justify-between text-amber-300 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="text-amber-400 shrink-0" size={24} />
                      <div>
                        <p className="font-bold text-amber-200">⚠️ Control Anti-Duplicados SHA-256 Activado</p>
                        <p className="text-[11px] text-amber-400/90">{lastResult.message}</p>
                      </div>
                    </div>
                    {lastResult.sha256 && (
                      <span className="text-[10px] bg-amber-900/60 px-2.5 py-1 rounded border border-amber-500/40 font-mono">
                        HASH: {lastResult.sha256.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                )}

                {/* AI Digest Executive Card */}
                {lastResult.aiDigest && (
                  <div className="p-6 bg-[#081408] border border-[#22c55e]/50 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#182818] pb-3">
                      <h3 className="text-md font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-[#22c55e]" size={20} />
                        ⚡ Resumen Ejecutivo (AI Knowledge Digest)
                      </h3>
                      <span className="text-[10px] bg-[#182818] text-[#22c55e] px-2.5 py-0.5 rounded-full font-bold">
                        AUTÓGANGIA FASE 6.3
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Key Takeaways */}
                      <div className="bg-[#050805] p-4 rounded-xl border border-[#182818] space-y-2">
                        <p className="font-bold text-[#22c55e] uppercase text-[10px]">🎯 Conclusiones Clave</p>
                        <ul className="space-y-1 text-[#a0caa0]">
                          {lastResult.aiDigest.keyTakeaways.map((kt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#22c55e]">•</span> {kt}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Entities */}
                      <div className="bg-[#050805] p-4 rounded-xl border border-[#182818] space-y-2">
                        <p className="font-bold text-[#22c55e] uppercase text-[10px]">👥 Entidades Detectadas</p>
                        <div className="space-y-1 text-white">
                          <p><span className="text-[#88a888]">Roles:</span> {lastResult.aiDigest.entities.people.join(", ") || "Sin roles"}</p>
                          <p><span className="text-[#88a888]">Cifras:</span> {lastResult.aiDigest.entities.money.join(", ") || "Sin cifras"}</p>
                          <p><span className="text-[#88a888]">Herramientas:</span> {lastResult.aiDigest.entities.tools.join(", ") || "Stack Nipëi"}</p>
                        </div>
                      </div>

                      {/* Dispatched Tasks */}
                      <div className="bg-[#050805] p-4 rounded-xl border border-[#182818] space-y-2">
                        <p className="font-bold text-amber-400 uppercase text-[10px]">📌 Despacho a Kanban</p>
                        {lastResult.aiDigest.detectedTasks.length > 0 ? (
                          <ul className="space-y-1 text-amber-300">
                            {lastResult.aiDigest.detectedTasks.map((t, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span>📌</span> {t}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#668866]">No se detectaron nuevas tareas explícitas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-[#0c1e0c] border border-[#22c55e]/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#22c55e]" size={28} />
                    <div>
                      <h3 className="text-lg font-bold text-white">¡Ingesta completada con éxito!</h3>
                      <p className="text-xs text-[#88a888]">
                        El documento se ha guardado en el Vault Master e impactado en los Squads correspondientes.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 rounded-full text-xs font-bold">
                    VERIFICADO SIN ALUCINACIÓN
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Extracted Squads */}
                  <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6">
                    <h4 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                      <FolderCheck className="text-[#22c55e]" size={18} />
                      Squads Actualizados Automáticamente
                    </h4>
                    <div className="space-y-3">
                      {lastResult.extractedSquads?.map((sq) => (
                        <div key={sq.squadId} className="bg-[#050805] p-4 rounded-xl border border-[#182818]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-[#22c55e]">{sq.squadName}</span>
                            <span className="text-[10px] bg-[#182818] text-[#88a888] px-2 py-0.5 rounded">
                              {sq.squadId}
                            </span>
                          </div>
                          <ul className="text-xs text-[#a0caa0] space-y-1">
                            {sq.extractedItems.map((item, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <ArrowRight size={12} className="text-[#22c55e] mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Info / Todo List */}
                  <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6">
                    <h4 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                      <AlertTriangle className="text-amber-400" size={18} />
                      Vacíos de Información & Tareas
                    </h4>

                    {lastResult.missingInfoItems && lastResult.missingInfoItems.length > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                          Se detectaron vacíos de información o tareas. Se desparramaron al Kanban de Squads.
                        </div>
                        <div className="space-y-2">
                          {lastResult.missingInfoItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-3 bg-[#080d08] rounded-xl border border-[#1a2e1a]">
                              <input type="checkbox" className="mt-1 rounded bg-[#050805] border-[#22c55e]" readOnly />
                              <span className="text-xs text-white">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-[#88a888] bg-[#050805] rounded-xl border border-[#182818]">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-[#22c55e]" />
                        El documento proporcionado está 100% completo. No se detectaron vacíos de información.
                      </div>
                    )}
                  </div>
                </div>

                {/* File Paths Generated */}
                <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 font-mono text-xs">
                  <h4 className="text-xs font-bold text-[#88a888] uppercase mb-3">Archivos Creados en el Repositorio</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <FileCode size={14} className="text-[#22c55e]" />
                        <span>Conocimiento Ingestado:</span>
                        <code className="bg-[#050805] px-2 py-0.5 rounded text-[#22c55e]">
                          {lastResult.knowledgeFilePath}
                        </code>
                      </div>
                      {lastResult.knowledgeFilePath && (
                        <button
                          onClick={() => openFileViewer(lastResult.knowledgeFilePath!)}
                          className="px-2.5 py-1 bg-[#182818] hover:bg-[#22c55e] text-[#22c55e] hover:text-black rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={12} /> Leer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-red-950/30 border border-red-500/40 rounded-2xl text-red-400 text-sm">
                <strong>Error al ingestar:</strong> {lastResult.error}
              </div>
            )
          ) : (
            <div className="p-12 text-center bg-[#0c140c] border border-[#182818] rounded-2xl text-[#88a888]">
              <Upload size={32} className="mx-auto mb-3 text-[#22c55e]" />
              <p className="text-sm">Aún no has procesado ninguna ingesta en esta sesión.</p>
              <button
                onClick={() => setActiveTab("ingest")}
                className="mt-4 px-4 py-2 bg-[#183018] text-[#22c55e] border border-[#22c55e]/30 rounded-xl text-xs font-bold hover:bg-[#22c55e] hover:text-black transition-colors cursor-pointer"
              >
                Ir a Ingestar Información
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VAULT EXPLORER */}
      {activeTab === "vault" && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ingested Files */}
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6">
              <h3 className="text-md font-bold text-white flex items-center justify-between mb-4">
                <span className="flex items-center gap-2">
                  <FileText className="text-[#22c55e]" size={18} />
                  Notas en Ingested_Knowledge
                </span>
                <span className="text-xs bg-[#182818] px-2.5 py-0.5 rounded-full text-[#22c55e]">
                  {vaultStats?.knowledgeCount || 0} archivos
                </span>
              </h3>

              {vaultStats?.knowledgeFiles && vaultStats.knowledgeFiles.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {vaultStats.knowledgeFiles.map((file) => (
                    <div
                      key={file}
                      onClick={() => openFileViewer(`Ingested_Knowledge/${file}`)}
                      className="p-3 bg-[#050805] rounded-xl border border-[#182818] flex items-center justify-between text-xs hover:border-[#22c55e]/40 transition-colors cursor-pointer"
                    >
                      <span className="text-white font-mono truncate max-w-[300px]">{file}</span>
                      <span className="text-[10px] text-[#22c55e] font-bold flex items-center gap-1">
                        <Eye size={12} /> Leer
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#88a888] p-4 text-center">No hay notas de conocimiento ingestas aún.</p>
              )}
            </div>

            {/* Todo Audit Lists */}
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6">
              <h3 className="text-md font-bold text-white flex items-center justify-between mb-4">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-400" size={18} />
                  Listas de Vacíos en Todo_Audit_Lists
                </span>
                <span className="text-xs bg-[#182818] px-2.5 py-0.5 rounded-full text-amber-400">
                  {vaultStats?.todoCount || 0} pendientes
                </span>
              </h3>

              {vaultStats?.todoFiles && vaultStats.todoFiles.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {vaultStats.todoFiles.map((file) => (
                    <div
                      key={file}
                      onClick={() => openFileViewer(`Todo_Audit_Lists/${file}`)}
                      className="p-3 bg-[#050805] rounded-xl border border-[#182818] flex items-center justify-between text-xs hover:border-amber-500/40 transition-colors cursor-pointer"
                    >
                      <span className="text-amber-300 font-mono truncate max-w-[300px]">{file}</span>
                      <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                        <Eye size={12} /> Leer
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#88a888] p-4 text-center">No hay listas de vacíos pendientes.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VAULT EXPLORER MODAL */}
      {explorerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c140c] border border-[#1f381f] rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-mono">
            <div className="p-6 border-b border-[#182818] flex items-center justify-between bg-[#080d08]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e]">
                  <FolderCheck size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Explorador Organizado del Vault</h3>
                  <p className="text-xs text-[#88a888]">nipei-vault (C:\Users\ondig\Code\DA\nipei-vault)</p>
                </div>
              </div>
              <button
                onClick={() => setExplorerOpen(false)}
                className="px-3 py-1.5 bg-[#182818] hover:bg-[#284028] text-white rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cerrar ✕
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-4 bg-[#080d08] border-b border-[#182818] flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-3 text-[#668866]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar en el Vault por nombre o palabra clave..."
                  className="w-full bg-[#050805] border border-[#182818] focus:border-[#22c55e] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {explorerTab === "todos" && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter size={14} className="text-[#88a888]" />
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="bg-[#050805] border border-[#182818] text-xs text-white rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos los Vacíos</option>
                    <option value="pending">🟡 Pendientes</option>
                    <option value="resolved">🟢 Resueltos</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-[#182818] px-6 bg-[#091209]">
              <button
                onClick={() => setExplorerTab("raw")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  explorerTab === "raw"
                    ? "border-[#22c55e] text-[#22c55e]"
                    : "border-transparent text-[#88a888] hover:text-white"
                }`}
              >
                <Upload size={14} />
                Archivos Originales ({filteredRawUploads?.length || 0})
              </button>
              <button
                onClick={() => setExplorerTab("knowledge")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  explorerTab === "knowledge"
                    ? "border-[#22c55e] text-[#22c55e]"
                    : "border-transparent text-[#88a888] hover:text-white"
                }`}
              >
                <FileText size={14} />
                Notas de Conocimiento ({filteredKnowledgeNotes?.length || 0})
              </button>
              <button
                onClick={() => setExplorerTab("todos")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  explorerTab === "todos"
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-[#88a888] hover:text-white"
                }`}
              >
                <AlertTriangle size={14} />
                Listas de Vacíos ({filteredTodoList?.length || 0})
              </button>
              <button
                onClick={() => setExplorerTab("graph")}
                className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  explorerTab === "graph"
                    ? "border-emerald-400 text-emerald-400"
                    : "border-transparent text-[#88a888] hover:text-white"
                }`}
              >
                <Share2 size={14} />
                Mapa del Vault
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {loadingExplorer ? (
                <div className="py-12 text-center text-[#88a888] flex items-center justify-center gap-2 text-xs">
                  <RefreshCw size={16} className="animate-spin text-[#22c55e]" />
                  Cargando archivos del Vault...
                </div>
              ) : (
                <>
                  {explorerTab === "raw" && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#668866] mb-3">
                        📂 <code className="text-[#22c55e]">nipei-vault/Raw_Uploads/</code> — Documentos originales subidos intactos (PDFs, DOCX, TXT).
                      </p>
                      {filteredRawUploads?.length > 0 ? (
                        filteredRawUploads.map((file: any) => (
                          <div
                            key={file.name}
                            onClick={() => openFileViewer(file.path)}
                            className="p-3 bg-[#050805] border border-[#182818] rounded-xl flex items-center justify-between hover:border-[#22c55e]/40 text-xs transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <span className="p-2 bg-[#182818] text-[#22c55e] rounded-lg font-bold text-[10px] uppercase">
                                {file.ext.replace(".", "") || "FILE"}
                              </span>
                              <div>
                                <p className="text-white font-mono font-medium">{file.name}</p>
                                <p className="text-[10px] text-[#668866]">{file.path} • {file.sizeKb} KB</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-[#182818] text-[#22c55e] px-2 py-1 rounded border border-[#22c55e]/30 flex items-center gap-1">
                              <Eye size={12} /> Previsualizar
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#88a888] py-8 text-center">No hay archivos coincidentes.</p>
                      )}
                    </div>
                  )}

                  {explorerTab === "knowledge" && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#668866] mb-3">
                        📂 <code className="text-[#22c55e]">nipei-vault/Ingested_Knowledge/</code> — Notas Markdown extraídas con metadatos YAML.
                      </p>
                      {filteredKnowledgeNotes?.length > 0 ? (
                        filteredKnowledgeNotes.map((file: any) => (
                          <div
                            key={file.name}
                            onClick={() => openFileViewer(file.path)}
                            className="p-3 bg-[#050805] border border-[#182818] rounded-xl flex items-center justify-between hover:border-[#22c55e]/40 text-xs transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <FileText size={18} className="text-[#22c55e]" />
                              <div>
                                <p className="text-white font-mono font-medium">{file.title}</p>
                                <p className="text-[10px] text-[#668866]">{file.path} • {file.sizeKb} KB</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-[#182818] text-[#22c55e] px-2 py-1 rounded border border-[#22c55e]/30 flex items-center gap-1">
                              <Eye size={12} /> Leer Nota
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#88a888] py-8 text-center">No hay notas coincidentes.</p>
                      )}
                    </div>
                  )}

                  {explorerTab === "todos" && (
                    <div className="space-y-2">
                      <p className="text-xs text-[#668866] mb-3">
                        📂 <code className="text-amber-400">nipei-vault/Todo_Audit_Lists/</code> — Vacíos de información pendientes y resueltos.
                      </p>
                      {filteredTodoList?.length > 0 ? (
                        filteredTodoList.map((file: any) => (
                          <div
                            key={file.name}
                            onClick={() => openFileViewer(file.path)}
                            className="p-3 bg-[#050805] border border-[#182818] rounded-xl flex items-center justify-between hover:border-amber-500/40 text-xs transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle size={18} className={file.isResolved ? "text-emerald-400" : "text-amber-400"} />
                              <div>
                                <p className="text-white font-mono font-medium">{file.name}</p>
                                <p className="text-[10px] text-[#668866]">{file.path} • {file.sizeKb} KB</p>
                              </div>
                            </div>
                            {file.isResolved ? (
                              <span className="text-[10px] bg-emerald-950/60 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/40 font-bold flex items-center gap-1">
                                🟢 RESUELTO <Eye size={11} />
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-950/60 text-amber-400 px-2.5 py-1 rounded border border-amber-500/40 font-bold flex items-center gap-1">
                                🟡 PENDIENTE <Eye size={11} />
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#88a888] py-8 text-center">No hay vacíos coincidentes.</p>
                      )}
                    </div>
                  )}

                  {/* KNOWLEDGE GRAPH MAP */}
                  {explorerTab === "graph" && (
                    <div className="space-y-4 p-4 bg-[#050805] rounded-xl border border-[#182818]">
                      <div className="flex items-center justify-between border-b border-[#182818] pb-3">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                            <Share2 size={16} /> Mapa de Relaciones del Vault Master
                          </h4>
                          <p className="text-[10px] text-[#668866]">Conexión en tiempo real entre archivos fuente, notas e impactación de Squads.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                        {/* Raw Uploads Column */}
                        <div className="space-y-2 bg-[#080d08] p-3 rounded-xl border border-blue-900/40">
                          <p className="text-[10px] font-bold text-blue-400 uppercase">📂 Raw Uploads ({explorerData?.rawUploadsCount || 0})</p>
                          {explorerData?.rawUploads?.slice(0, 5).map((f: any) => (
                            <div
                              key={f.name}
                              onClick={() => openFileViewer(f.path)}
                              className="p-2 bg-[#050805] border border-blue-900/40 hover:border-blue-400 rounded text-[11px] text-blue-300 truncate cursor-pointer"
                            >
                              📄 {f.name}
                            </div>
                          ))}
                        </div>

                        {/* Ingested Knowledge Column */}
                        <div className="space-y-2 bg-[#080d08] p-3 rounded-xl border border-emerald-900/40">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase">📄 Ingested Knowledge ({explorerData?.knowledgeCount || 0})</p>
                          {explorerData?.knowledgeNotes?.slice(0, 5).map((f: any) => (
                            <div
                              key={f.name}
                              onClick={() => openFileViewer(f.path)}
                              className="p-2 bg-[#050805] border border-emerald-900/40 hover:border-emerald-400 rounded text-[11px] text-emerald-300 truncate cursor-pointer"
                            >
                              🧠 {f.title}
                            </div>
                          ))}
                        </div>

                        {/* Todo Audit Lists Column */}
                        <div className="space-y-2 bg-[#080d08] p-3 rounded-xl border border-amber-900/40">
                          <p className="text-[10px] font-bold text-amber-400 uppercase">⚠️ Vacíos & Kanban ({explorerData?.todoCount || 0})</p>
                          {explorerData?.todoLists?.slice(0, 5).map((f: any) => (
                            <div
                              key={f.name}
                              onClick={() => openFileViewer(f.path)}
                              className={`p-2 bg-[#050805] border rounded text-[11px] truncate cursor-pointer ${
                                f.isResolved ? "border-emerald-800 text-emerald-400" : "border-amber-900/40 text-amber-300"
                              }`}
                            >
                              {f.isResolved ? "🟢" : "🟡"} {f.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE DOCUMENT READER MODAL */}
      {viewerOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#080d08] border border-[#22c55e]/50 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-mono">
            <div className="p-5 border-b border-[#182818] flex items-center justify-between bg-[#0c140c]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e]">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white truncate max-w-[500px]">
                    {viewerFile?.name || "Cargando archivo..."}
                  </h3>
                  <p className="text-[11px] text-[#668866]">{viewerFile?.path} • {viewerFile?.sizeKb} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewerFile?.content && (
                  <button
                    onClick={() => handleCopyContent(viewerFile.content)}
                    className="px-3 py-1.5 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={13} />
                    {copied ? "¡Copiado!" : "Copiar Contenido"}
                  </button>
                )}
                <button
                  onClick={() => setViewerOpen(false)}
                  className="px-3 py-1.5 bg-[#182818] hover:bg-red-950 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-[#050805]">
              {loadingViewer ? (
                <div className="py-16 text-center text-[#88a888] flex items-center justify-center gap-2 text-xs">
                  <RefreshCw size={18} className="animate-spin text-[#22c55e]" />
                  Leyendo contenido del Vault...
                </div>
              ) : (
                <pre className="text-xs text-[#d0e0d0] whitespace-pre-wrap font-mono leading-relaxed p-4 bg-[#080d08] border border-[#182818] rounded-xl overflow-x-auto">
                  {viewerFile?.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEALTH REPORT MODAL */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#080d08] border border-emerald-500/50 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-mono">
            <div className="p-5 border-b border-[#182818] flex items-center justify-between bg-[#0c140c]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#142614] border border-emerald-500/40 rounded-xl text-emerald-400">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white">Reporte de Salud del Vault Master</h3>
                  <p className="text-[11px] text-[#668866]">Auditoría de Cobertura y Métricas de Ingestión</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {reportData?.reportMarkdown && (
                  <button
                    onClick={() => handleCopyContent(reportData.reportMarkdown)}
                    className="px-3 py-1.5 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={13} />
                    {copied ? "¡Copiado!" : "Copiar Reporte Markdown"}
                  </button>
                )}
                <button
                  onClick={() => setReportOpen(false)}
                  className="px-3 py-1.5 bg-[#182818] hover:bg-red-950 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-[#050805] space-y-6">
              {loadingReport ? (
                <div className="py-16 text-center text-[#88a888] flex items-center justify-center gap-2 text-xs">
                  <RefreshCw size={18} className="animate-spin text-emerald-400" />
                  Calculando métricas del Vault...
                </div>
              ) : (
                <>
                  {/* Gauge & Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-[#0c1e0c] p-4 rounded-xl border border-emerald-500/40 text-center">
                      <p className="text-[10px] text-[#88a888] uppercase">Índice de Salud</p>
                      <p className="text-2xl font-extrabold text-emerald-400 mt-1">{reportData?.healthPercentage}%</p>
                      <p className="text-[10px] text-emerald-500">Cobertura Verificada</p>
                    </div>

                    <div className="bg-[#080d08] p-4 rounded-xl border border-[#182818] text-center">
                      <p className="text-[10px] text-[#88a888] uppercase">Archivos Fuente</p>
                      <p className="text-xl font-bold text-white mt-1">{reportData?.rawCount}</p>
                      <p className="text-[10px] text-[#668866]">{reportData?.totalRawKb} KB (Raw)</p>
                    </div>

                    <div className="bg-[#080d08] p-4 rounded-xl border border-[#182818] text-center">
                      <p className="text-[10px] text-[#88a888] uppercase">Notas Ingestadas</p>
                      <p className="text-xl font-bold text-[#22c55e] mt-1">{reportData?.knowledgeCount}</p>
                      <p className="text-[10px] text-[#668866]">{reportData?.totalKnowledgeKb} KB (Vault)</p>
                    </div>

                    <div className="bg-[#080d08] p-4 rounded-xl border border-[#182818] text-center">
                      <p className="text-[10px] text-[#88a888] uppercase">Vacíos Auditar</p>
                      <p className="text-xl font-bold text-amber-400 mt-1">
                        {reportData?.resolvedCount} / {(reportData?.resolvedCount || 0) + (reportData?.pendingCount || 0)}
                      </p>
                      <p className="text-[10px] text-amber-500">{reportData?.pendingCount} pendientes</p>
                    </div>
                  </div>

                  {/* Markdown Report Preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#88a888] uppercase">Previsualización del Reporte Completo</p>
                    <pre className="text-xs text-[#d0e0d0] whitespace-pre-wrap font-mono leading-relaxed p-4 bg-[#080d08] border border-[#182818] rounded-xl overflow-x-auto">
                      {reportData?.reportMarkdown}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
