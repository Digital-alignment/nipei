"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  Presentation,
  FileCode,
  Table,
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bot,
  Zap,
  Layers,
  AlertCircle,
  Plus,
  RefreshCw,
  FolderOpen,
  Code
} from "lucide-react";
import type { GlobalTask, TaskDeliverable, DeliverableFormat } from "@/lib/nipeiStore";

interface TaskDeliverablesViewerProps {
  task: GlobalTask;
  onUpdateTask: (updated: GlobalTask) => void;
}

const FORMAT_OPTIONS: {
  id: DeliverableFormat;
  label: string;
  badge: string;
  icon: any;
  desc: string;
  color: string;
  borderColor: string;
}[] = [
  {
    id: "executive_report",
    label: "Relatório Executivo",
    badge: "Documento",
    icon: FileText,
    desc: "Diagnóstico formal com sumário executivo, insumos analisados e grounding no Vault.",
    color: "#22c55e",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  {
    id: "slide_deck",
    label: "Apresentação Executiva",
    badge: "Slides Deck",
    icon: Presentation,
    desc: "Deck de slides dinâmico em formato carrossel widescreen para projeção em reuniões.",
    color: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  {
    id: "technical_brief",
    label: "Brief Técnico / POP",
    badge: "Especificação",
    icon: FileCode,
    desc: "Procedimento operacional padrão, requisitos técnicos, fluxo e Definition of Done.",
    color: "#fbbf24",
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  {
    id: "csv_data",
    label: "Dados Tabulares / CSV",
    badge: "Planilha",
    icon: Table,
    desc: "Estruturação de métricas, cronogramas ou orçamentos em formato de tabela Markdown/CSV.",
    color: "#c084fc",
    borderColor: "rgba(192, 132, 252, 0.4)",
  },
];

export default function TaskDeliverablesViewer({
  task,
  onUpdateTask,
}: TaskDeliverablesViewerProps) {
  const [deliverables, setDeliverables] = useState<TaskDeliverable[]>(task.deliverables || []);
  const [activeDeliverableId, setActiveDeliverableId] = useState<string | null>(
    task.deliverables && task.deliverables.length > 0 ? task.deliverables[0].id : null
  );

  // Generation Modal / Toolbar State
  const [showGenerateBox, setShowGenerateBox] = useState<boolean>(
    !task.deliverables || task.deliverables.length === 0
  );
  const [selectedFormat, setSelectedFormat] = useState<DeliverableFormat>("executive_report");
  const [selectedAgent, setSelectedAgent] = useState<"@hermes" | "@antigravity">("@hermes");
  const [extraInstructions, setExtraInstructions] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Slide Deck View State
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSlideFullScreen, setIsSlideFullScreen] = useState<boolean>(false);
  const [viewSourceMarkdown, setViewSourceMarkdown] = useState<boolean>(false);

  // General Actions State
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const slideDeckContainerRef = useRef<HTMLDivElement>(null);

  // Keep deliverables synced with task or refresh from server
  useEffect(() => {
    if (task.deliverables && task.deliverables.length > 0) {
      setDeliverables(task.deliverables);
      if (!activeDeliverableId || !task.deliverables.some((d) => d.id === activeDeliverableId)) {
        setActiveDeliverableId(task.deliverables[0].id);
      }
    }
  }, [task.deliverables]);

  // Load existing deliverables directly from workspace API on mount
  useEffect(() => {
    async function loadWorkspaceDeliverables() {
      try {
        const query = new URLSearchParams({
          taskId: task.id,
          squadId: task.squad || "",
          taskTitle: task.title || "",
        });
        const res = await fetch(`/api/agent-kanban/attachments?${query.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.deliverables) && data.deliverables.length > 0) {
          setDeliverables(data.deliverables);
          setActiveDeliverableId((prev) => prev || data.deliverables[0].id);
          setShowGenerateBox(false);
          onUpdateTask({
            ...task,
            deliverables: data.deliverables,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar entregáveis do workspace:", err);
      }
    }
    loadWorkspaceDeliverables();
  }, [task.id]);

  const activeDeliverable = useMemo(() => {
    return deliverables.find((d) => d.id === activeDeliverableId) || deliverables[0] || null;
  }, [deliverables, activeDeliverableId]);

  // Parse slides for slide_deck format
  const slides = useMemo(() => {
    if (!activeDeliverable || activeDeliverable.format !== "slide_deck") return [];
    const content = activeDeliverable.contentMarkdown || "";
    // Split by `<!-- slide -->` or `\n---\n`
    const rawSlides = content
      .split(/<!--\s*slide\s*-->/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawSlides.length <= 1) {
      // Fallback: split by `\n---\n`
      const byDashes = content
        .split(/\n---\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return byDashes.length > 0 ? byDashes : [content];
    }
    return rawSlides;
  }, [activeDeliverable]);

  // Reset current slide when active deliverable changes
  useEffect(() => {
    setCurrentSlideIndex(0);
    setViewSourceMarkdown(false);
  }, [activeDeliverableId]);

  // Keyboard navigation for slides
  useEffect(() => {
    if (!activeDeliverable || activeDeliverable.format !== "slide_deck" || viewSourceMarkdown) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Escape" && isSlideFullScreen) {
        setIsSlideFullScreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDeliverable, slides.length, isSlideFullScreen, viewSourceMarkdown]);

  // Handler: Generate Deliverable
  const handleGenerateDeliverable = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/agent-kanban/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          taskSquad: task.squad,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskAssignee: task.assignee,
          format: selectedFormat,
          agentId: selectedAgent,
          extraInstructions: extraInstructions.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao gerar entregável via IA.");
      }

      const newDel: TaskDeliverable = data.deliverable;
      const updatedList = [newDel, ...deliverables.filter((d) => d.id !== newDel.id)];
      setDeliverables(updatedList);
      setActiveDeliverableId(newDel.id);
      setShowGenerateBox(false);
      setExtraInstructions("");

      // Update parent task state
      onUpdateTask({
        ...task,
        deliverables: updatedList,
      });
    } catch (err: any) {
      console.error("Erro na geração de entregável:", err);
      setGenerateError(err.message || "Falha ao conectar com o motor de entregáveis.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Copy Markdown
  const handleCopyMarkdown = () => {
    if (!activeDeliverable?.contentMarkdown) return;
    navigator.clipboard.writeText(activeDeliverable.contentMarkdown);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Handler: Download Markdown (.md)
  const handleDownloadMarkdown = () => {
    if (!activeDeliverable) return;
    const blob = new Blob([activeDeliverable.contentMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeDeliverable.fileName || `${activeDeliverable.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handler: Print / Export PDF
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar: Status, Deliverables Selector & New Generation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#142414]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1c0c] border border-[#1e381e] text-[#22c55e] font-mono text-xs font-bold">
            <Layers size={13} />
            <span>Entregáveis IA ({deliverables.length})</span>
          </div>

          {deliverables.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {deliverables.map((del) => {
                const opt = FORMAT_OPTIONS.find((f) => f.id === del.format);
                const Icon = opt?.icon || FileText;
                const isSelected = del.id === activeDeliverable?.id;
                return (
                  <button
                    key={del.id}
                    onClick={() => {
                      setActiveDeliverableId(del.id);
                      setShowGenerateBox(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition shrink-0 ${
                      isSelected
                        ? "bg-[#183818] border border-[#22c55e] text-white shadow-sm font-bold"
                        : "bg-[#081208] border border-[#142414] text-zinc-400 hover:text-white hover:border-[#1e381e]"
                    }`}
                  >
                    <Icon size={12} style={{ color: opt?.color || "#22c55e" }} />
                    <span className="truncate max-w-[130px]">{del.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowGenerateBox((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 shadow-sm ${
            showGenerateBox
              ? "bg-[#1a381a] text-[#4ade80] border border-[#22c55e]"
              : "bg-[#22c55e] text-[#050805] hover:bg-[#4ade80]"
          }`}
        >
          <Sparkles size={13} />
          <span>{showGenerateBox ? "Ocultar Gerador" : "+ Gerar Novo Entregável"}</span>
        </button>
      </div>

      {/* 2. Generation Panel (Expandable) */}
      {showGenerateBox && (
        <div className="p-5 rounded-xl bg-gradient-to-b from-[#091509] to-[#050905] border border-[#1e381e] shadow-lg space-y-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#142e14] border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e]">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  Gerador Autônomo de Entregáveis Nipëi
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#142414] text-[#4ade80] border border-[#1e381e]">
                    RAG Grounded
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">
                  O agente sintetizará a tarefa, os anexos em <code className="text-emerald-400">inputs/</code> e o conhecimento canônico do Vault.
                </p>
              </div>
            </div>
          </div>

          {/* Format Picker Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {FORMAT_OPTIONS.map((f) => {
              const Icon = f.icon;
              const isSelected = selectedFormat === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                    isSelected
                      ? "bg-[#0e240e] border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.15)] ring-1 ring-[#22c55e]/50"
                      : "bg-[#071007] border-[#142414] hover:border-[#1e381e] hover:bg-[#0a170a]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className="p-1.5 rounded-lg bg-black/40 border border-[#1e381e]"
                        style={{ color: f.color }}
                      >
                        <Icon size={16} />
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase"
                        style={{
                          backgroundColor: `${f.color}15`,
                          color: f.color,
                          borderColor: f.borderColor,
                        }}
                      >
                        {f.badge}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white">{f.label}</div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls: Agent Choice & Custom Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Agent Select */}
            <div className="space-y-1">
              <label className="block text-[11px] font-mono text-zinc-400 font-semibold">
                Agente Executor
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAgent("@hermes")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition ${
                    selectedAgent === "@hermes"
                      ? "bg-[#183818] border-[#22c55e] text-[#4ade80]"
                      : "bg-[#081208] border-[#142414] text-zinc-400 hover:text-white"
                  }`}
                >
                  <Zap size={13} className="text-[#22c55e]" />
                  <span>@hermes (CEO)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAgent("@antigravity")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition ${
                    selectedAgent === "@antigravity"
                      ? "bg-[#183818] border-[#22c55e] text-[#4ade80]"
                      : "bg-[#081208] border-[#142414] text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bot size={13} className="text-sky-400" />
                  <span>@antigravity</span>
                </button>
              </div>
            </div>

            {/* Extra Instructions */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[11px] font-mono text-zinc-400 font-semibold">
                Diretrizes Específicas / Foco da Geração (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Dar ênfase ao cronograma de implementação e restrições orçamentárias..."
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs placeholder-zinc-600 focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          </div>

          {generateError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{generateError}</span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowGenerateBox(false)}
              className="px-3 py-2 rounded-lg bg-transparent text-xs font-mono text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerateDeliverable}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#22c55e] text-[#050805] text-xs font-bold font-mono hover:bg-[#4ade80] transition shadow-md active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Processando Grounding & Gerando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Gerar Entregável Oficial</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Deliverable Viewer Area */}
      {activeDeliverable ? (
        <div className="space-y-4">
          {/* Metadata Banner & Export Actions */}
          <div className="p-4 rounded-xl bg-[#071207] border border-[#1a341a] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white">{activeDeliverable.title}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#142414] text-[#4ade80] border border-[#1e381e]">
                  v{activeDeliverable.version || 1}.0
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#102010] text-zinc-300 border border-[#1e381e]">
                  Autor: {activeDeliverable.generatedByAgent || "@hermes"}
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  {activeDeliverable.generatedAt}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 truncate">
                <FolderOpen size={11} className="text-[#22c55e] shrink-0" />
                <span className="truncate">{activeDeliverable.vaultRelativePath}</span>
              </p>
            </div>

            {/* Export Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {activeDeliverable.format === "slide_deck" && (
                <button
                  onClick={() => setViewSourceMarkdown((prev) => !prev)}
                  title="Alternar entre Visualização de Slides e Código Markdown"
                  className={`p-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition ${
                    viewSourceMarkdown
                      ? "bg-[#183818] border-[#22c55e] text-[#4ade80]"
                      : "bg-[#091409] border-[#1e381e] text-zinc-300 hover:text-white"
                  }`}
                >
                  <Code size={13} />
                  <span className="hidden sm:inline">Fonte</span>
                </button>
              )}

              <button
                onClick={handleCopyMarkdown}
                title="Copiar texto Markdown"
                className="p-2 rounded-lg bg-[#091409] border border-[#1e381e] text-zinc-300 hover:text-white hover:border-[#22c55e] text-xs font-mono flex items-center gap-1.5 transition"
              >
                {copiedSuccess ? (
                  <>
                    <Check size={13} className="text-[#22c55e]" />
                    <span className="text-[#22c55e]">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span className="hidden sm:inline">Copiar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadMarkdown}
                title="Baixar arquivo Markdown (.md)"
                className="p-2 rounded-lg bg-[#091409] border border-[#1e381e] text-zinc-300 hover:text-white hover:border-[#22c55e] text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                onClick={handlePrintPDF}
                title="Imprimir ou Salvar como PDF"
                className="p-2 rounded-lg bg-[#091409] border border-[#1e381e] text-zinc-300 hover:text-white hover:border-[#22c55e] text-xs font-mono flex items-center gap-1.5 transition"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          {/* 3A. RENDERER: SLIDE DECK (CAROUSEL VIEW) */}
          {activeDeliverable.format === "slide_deck" && !viewSourceMarkdown ? (
            <div
              ref={slideDeckContainerRef}
              className={`space-y-4 ${
                isSlideFullScreen
                  ? "fixed inset-0 z-50 bg-[#030603] p-6 sm:p-12 flex flex-col justify-between"
                  : ""
              }`}
            >
              {/* Slide Screen (16:9 aspect ratio or fixed container) */}
              <div className="relative rounded-2xl bg-gradient-to-br from-[#060c06] via-[#040804] to-[#020402] border border-[#22c55e]/30 shadow-[0_0_30px_rgba(34,197,94,0.08)] min-h-[380px] sm:min-h-[440px] flex flex-col justify-between p-6 sm:p-10 overflow-hidden">
                {/* Subtle top indicator bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 text-xs font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-white font-bold">{activeDeliverable.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      Slide {currentSlideIndex + 1} de {slides.length}
                    </span>
                    <button
                      onClick={() => setIsSlideFullScreen((prev) => !prev)}
                      title={isSlideFullScreen ? "Sair da Tela Cheia" : "Apresentação em Tela Cheia"}
                      className="p-1 rounded text-zinc-400 hover:text-white transition"
                    >
                      {isSlideFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                  </div>
                </div>

                {/* Slide Body Content */}
                <div className="flex-1 py-6 flex flex-col justify-center max-w-3xl mx-auto w-full">
                  <div className="prose prose-invert prose-emerald max-w-none text-zinc-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {slides[currentSlideIndex] || ""}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Slide Footer: Progress Bar and Controls */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  {/* Progress Line */}
                  <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#22c55e] h-full transition-all duration-300"
                      style={{
                        width: `${((currentSlideIndex + 1) / slides.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentSlideIndex === 0}
                      className="p-2 rounded-lg bg-black/40 border border-[#1e381e] text-white hover:bg-[#142414] disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Slide Anterior (Seta Esquerda)"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-mono text-zinc-400 px-1">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                      }
                      disabled={currentSlideIndex === slides.length - 1}
                      className="p-2 rounded-lg bg-black/40 border border-[#1e381e] text-white hover:bg-[#142414] disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Próximo Slide (Seta Direita / Espaço)"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Thumbnails Navigator */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`p-2.5 rounded-lg border text-left shrink-0 w-36 transition-all ${
                      idx === currentSlideIndex
                        ? "bg-[#142e14] border-[#22c55e] text-white shadow-sm ring-1 ring-[#22c55e]"
                        : "bg-[#050a05] border-[#142414] text-zinc-400 hover:text-white hover:border-[#1e381e]"
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold text-emerald-400">
                      Slide {idx + 1}
                    </div>
                    <div className="text-[11px] truncate text-zinc-300">
                      {s.split("\n")[0]?.replace(/^#+\s*/, "") || `Slide ${idx + 1}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 3B. RENDERER: DOCUMENT / REPORT / TECHNICAL BRIEF / CSV */
            <div className="rounded-xl bg-[#060c06] border border-[#1a341a] p-6 sm:p-8 shadow-sm">
              <div className="prose prose-invert prose-emerald max-w-none text-zinc-200 font-sans leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-2xl sm:text-3xl font-bold font-sans text-white border-b border-[#1e381e] pb-3 mb-4 tracking-tight"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-xl sm:text-2xl font-bold font-sans text-emerald-300 mt-6 mb-3 tracking-tight flex items-center gap-2"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-lg font-bold font-sans text-white mt-4 mb-2"
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-[#22c55e] pl-4 py-1.5 my-3 bg-[#0a180a]/60 rounded-r-lg text-emerald-200 font-mono text-xs not-italic"
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto my-4 rounded-lg border border-[#1e381e]">
                        <table className="w-full text-xs text-left font-mono" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="bg-[#102010] text-[#4ade80] px-3 py-2 font-bold border-b border-[#1e381e]"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="px-3 py-2 border-b border-[#142414] text-zinc-300" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside space-y-1 my-2 text-zinc-300 text-sm" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-inside space-y-1 my-2 text-zinc-300 text-sm" {...props} />
                    ),
                    code: ({ node, ...props }: any) => {
                      const isInline = !props.children?.toString().includes("\n");
                      return isInline ? (
                        <code
                          className="px-1.5 py-0.5 rounded bg-[#102010] border border-[#1e381e] text-emerald-300 font-mono text-xs"
                          {...props}
                        />
                      ) : (
                        <pre className="p-3 rounded-lg bg-[#040804] border border-[#1e381e] overflow-x-auto text-xs font-mono text-emerald-300 my-3">
                          <code {...props} />
                        </pre>
                      );
                    },
                  }}
                >
                  {activeDeliverable.contentMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-[#071007] border border-dashed border-[#1e381e] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#102410] border border-[#22c55e]/30 flex items-center justify-center mx-auto text-[#22c55e]">
            <Sparkles size={22} />
          </div>
          <h4 className="text-base font-bold text-white font-sans">
            Nenhum entregável gerado para esta tarefa ainda
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Use o gerador autônomo acima para produzir relatórios executivos, apresentações de slides ou especificações técnicas com grounding no Nipëi Vault.
          </p>
          <button
            onClick={() => setShowGenerateBox(true)}
            className="px-4 py-2 rounded-lg bg-[#22c55e] text-[#050805] text-xs font-mono font-bold hover:bg-[#4ade80] transition inline-flex items-center gap-1.5"
          >
            <Sparkles size={13} /> Criar Primeiro Entregável
          </button>
        </div>
      )}

      {/* Print-specific style block for clean PDF generation */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .prose,
          .prose * {
            visibility: visible;
          }
          .prose {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: #000 !important;
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}
