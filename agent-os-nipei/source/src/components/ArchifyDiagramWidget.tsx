"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  Sparkles,
  Layers,
  RefreshCw,
  Code,
  Check,
  Maximize2,
  ExternalLink,
  Zap,
  Bot,
  SlidersHorizontal,
  Info
} from "lucide-react";
import Link from "next/link";
import { PREBUILT_DIAGRAMS } from "@/data/archifySpecs";

export interface ArchifyDiagramWidgetProps {
  prebuiltId?: string;
  defaultTopic?: string;
  defaultType?: "architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle";
  defaultAgent?: string;
  title?: string;
  height?: string;
  showControls?: boolean;
  className?: string;
}

const PRESETS = [
  { id: "blueprint", name: "Blueprint", badge: "🟦" },
  { id: "classic", name: "Classic", badge: "🎨" },
  { id: "signal-flow", name: "Signal-Flow", badge: "⚡" },
];

const DIAGRAM_TYPES: { id: "architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle"; label: string; icon: string }[] = [
  { id: "architecture", label: "Architecture", icon: "🏛️" },
  { id: "workflow", label: "Workflow", icon: "🔄" },
  { id: "sequence", label: "Sequence", icon: "⚡" },
  { id: "dataflow", label: "Data Flow", icon: "🌊" },
  { id: "lifecycle", label: "Lifecycle", icon: "⏳" },
];

export default function ArchifyDiagramWidget({
  prebuiltId,
  defaultTopic = "Arquitectura de Sistema & Flujo de Conocimiento",
  defaultType = "architecture",
  defaultAgent = "hermes",
  title,
  height = "520px",
  showControls = true,
  className = "",
}: ArchifyDiagramWidgetProps) {
  const [diagramMode, setDiagramMode] = useState<"prebuilt" | "dynamic">(
    prebuiltId ? "prebuilt" : "dynamic"
  );
  const [activePrebuiltId, setActivePrebuiltId] = useState<string>(
    prebuiltId || "nipei-ecosystem-architecture"
  );
  
  // Custom generation state
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [diagramType, setDiagramType] = useState<"architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle">(defaultType);
  const [agent, setAgent] = useState<string>(defaultAgent);
  const [preset, setPreset] = useState<string>("blueprint");
  const [traceAnimation, setTraceAnimation] = useState<boolean>(true);
  
  // Render state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [diagramHtml, setDiagramHtml] = useState<string | null>(null);
  const [currentSpec, setCurrentSpec] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSpecModal, setShowSpecModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Load prebuilt diagram HTML
  const loadPrebuilt = useCallback(async (id: string, p: string, anim: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const animationParam = anim ? "trace" : "none";
      const res = await fetch(`/api/archify?id=${encodeURIComponent(id)}&preset=${p}&animation=${animationParam}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "No se pudo cargar el diagrama preconstruido.");
      }
      setDiagramHtml(data.html);
      setCurrentSpec(data.spec);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar diagrama.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate dynamic RAG diagram
  const generateDynamic = useCallback(async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const animationParam = traceAnimation ? "trace" : "none";
      const res = await fetch("/api/archify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic,
          diagramType,
          agent,
          preset,
          animation: animationParam,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error en la generación RAG del diagrama.");
      }
      setDiagramHtml(data.html);
      setCurrentSpec(data.spec);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error en generación RAG.");
    } finally {
      setIsLoading(false);
    }
  }, [topic, diagramType, agent, preset, traceAnimation]);

  // Initial loading trigger
  useEffect(() => {
    if (diagramMode === "prebuilt" && activePrebuiltId) {
      loadPrebuilt(activePrebuiltId, preset, traceAnimation);
    } else if (diagramMode === "dynamic") {
      generateDynamic();
    }
  }, [diagramMode, activePrebuiltId, loadPrebuilt]);

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    if (diagramMode === "prebuilt") {
      loadPrebuilt(activePrebuiltId, newPreset, traceAnimation);
    } else if (currentSpec) {
      reRenderCurrentSpec(currentSpec, newPreset, traceAnimation);
    }
  };

  const handleAnimationToggle = () => {
    const newAnim = !traceAnimation;
    setTraceAnimation(newAnim);
    if (diagramMode === "prebuilt") {
      loadPrebuilt(activePrebuiltId, preset, newAnim);
    } else if (currentSpec) {
      reRenderCurrentSpec(currentSpec, preset, newAnim);
    }
  };

  const reRenderCurrentSpec = async (spec: any, p: string, anim: boolean) => {
    setIsLoading(true);
    try {
      const animationParam = anim ? "trace" : "none";
      const res = await fetch("/api/archify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render",
          spec,
          type: spec.diagram_type || diagramType,
          preset: p,
          animation: animationParam,
        }),
      });
      const data = await res.json();
      if (data.success && data.html) {
        setDiagramHtml(data.html);
      }
    } catch (e) {
      console.error("Error re-rendering spec:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySpec = () => {
    if (!currentSpec) return;
    navigator.clipboard.writeText(JSON.stringify(currentSpec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-[#0c140c] border border-[#182818] rounded-3xl p-5 md:p-6 space-y-4 shadow-2xl font-sans relative ${
        isFullscreen ? "fixed inset-4 z-50 overflow-y-auto bg-[#050805] border-[#22c55e]" : ""
      } ${className}`}
    >
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182818] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#142614] border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e]">
            <Workflow size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {title || "Visualizador Archify Engine"}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#142614] text-[#22c55e] border border-[#22c55e]/30 font-bold">
                {diagramType.toUpperCase()}
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
              {diagramMode === "prebuilt"
                ? `Diagrama Pre-construido: ${PREBUILT_DIAGRAMS.find(d => d.id === activePrebuiltId)?.name || activePrebuiltId}`
                : `Generado con RAG: ${topic}`}
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switcher */}
            <div className="flex items-center bg-[#050805] border border-[#182818] p-1 rounded-xl">
              <button
                onClick={() => setDiagramMode("prebuilt")}
                className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                  diagramMode === "prebuilt"
                    ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Preconstruidos
              </button>
              <button
                onClick={() => setDiagramMode("dynamic")}
                className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition ${
                  diagramMode === "dynamic"
                    ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                ✦ Generar RAG
              </button>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1 bg-[#050805] border border-[#182818] p-1 rounded-xl">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition flex items-center gap-1 ${
                    preset === p.id
                      ? "bg-[#142614] text-[#22c55e] font-bold border border-[#22c55e]/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title={p.name}
                >
                  <span>{p.badge}</span>
                  <span className="hidden sm:inline">{p.name}</span>
                </button>
              ))}
            </div>

            {/* Animation Toggle */}
            <button
              onClick={handleAnimationToggle}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 transition ${
                traceAnimation
                  ? "bg-[#142614] text-[#22c55e] border-[#22c55e]/40 font-bold"
                  : "bg-[#050805] text-slate-400 border-[#182818]"
              }`}
              title="Alternar animación de traza SVG"
            >
              <Zap size={12} />
              <span className="hidden md:inline">{traceAnimation ? "Animación ON" : "Animación OFF"}</span>
            </button>

            {/* View Spec */}
            {currentSpec && (
              <button
                onClick={() => setShowSpecModal(true)}
                className="p-1.5 bg-[#050805] border border-[#182818] hover:border-slate-500 text-slate-300 rounded-xl text-xs transition"
                title="Ver JSON Spec"
              >
                <Code size={14} />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-[#050805] border border-[#182818] hover:border-slate-500 text-slate-300 rounded-xl text-xs transition"
              title="Pantalla Completa"
            >
              <Maximize2 size={14} />
            </button>

            {/* External Link to Archify Studio */}
            <Link
              href="/arquitectura"
              className="p-1.5 bg-[#050805] border border-[#182818] hover:border-[#22c55e] text-[#22c55e] rounded-xl text-xs transition"
              title="Abrir en Archify Studio"
            >
              <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Control Selector bar when in Prebuilt or Dynamic */}
      {diagramMode === "prebuilt" ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll font-mono text-xs">
          <span className="text-slate-400 shrink-0 text-[11px] uppercase font-bold">Seleccionar Diagrama:</span>
          {PREBUILT_DIAGRAMS.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setActivePrebuiltId(d.id);
                setDiagramType(d.type);
              }}
              className={`px-3 py-1 rounded-xl text-[11px] transition shrink-0 flex items-center gap-1.5 border ${
                activePrebuiltId === d.id
                  ? "bg-[#142614] text-[#22c55e] border-[#22c55e] font-bold"
                  : "bg-[#050805] text-slate-400 border-[#182818] hover:bg-[#0c140c]"
              }`}
            >
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Tema / Objetivo de Conocimiento</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej. Inî Rau Dataflow, Samakey Retiros..."
                className="w-full bg-[#0c140c] border border-[#182818] focus:border-[#22c55e] px-3 py-1.5 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div className="w-auto">
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Tipo de Diagrama</label>
              <div className="flex items-center gap-1">
                {DIAGRAM_TYPES.map((dt) => (
                  <button
                    key={dt.id}
                    onClick={() => setDiagramType(dt.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] transition border ${
                      diagramType === dt.id
                        ? "bg-[#142614] text-[#22c55e] border-[#22c55e] font-bold"
                        : "bg-[#0c140c] text-slate-400 border-[#182818] hover:text-white"
                    }`}
                  >
                    <span>{dt.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-auto flex items-end">
              <button
                onClick={generateDynamic}
                disabled={isLoading || !topic.trim()}
                className="px-4 py-2 bg-[#142614] border border-[#22c55e] hover:bg-[#1e381e] text-[#22c55e] font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw size={14} className="animate-spin text-[#22c55e]" />
                ) : (
                  <Sparkles size={14} className="text-[#22c55e]" />
                )}
                <span>{isLoading ? "Generando..." : "Generar Diagrama"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagram Render Canvas / Iframe */}
      <div
        className="w-full bg-black border border-[#182818] rounded-2xl overflow-hidden relative"
        style={{ height: isFullscreen ? "calc(100vh - 180px)" : height }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw size={32} className="text-[#22c55e] animate-spin" />
            <span className="text-xs font-mono font-bold text-slate-200">
              Sintetizando Diagrama Archify...
            </span>
          </div>
        )}

        {error ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Info size={36} className="text-rose-500" />
            <h4 className="text-sm font-bold text-white">Error al Renderizar Diagrama</h4>
            <p className="text-xs font-mono text-slate-400 max-w-md">{error}</p>
            <button
              onClick={() => {
                if (diagramMode === "prebuilt") loadPrebuilt(activePrebuiltId, preset, traceAnimation);
                else generateDynamic();
              }}
              className="px-4 py-1.5 bg-[#142614] border border-[#22c55e]/50 text-[#22c55e] text-xs font-mono rounded-xl hover:bg-[#1e381e]"
            >
              Reintentar
            </button>
          </div>
        ) : diagramHtml ? (
          <iframe
            srcDoc={diagramHtml}
            title={title || "Archify Diagram"}
            className="w-full h-full border-0 bg-transparent"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-xs text-slate-500">
            Sin diagrama para visualizar.
          </div>
        )}
      </div>

      {/* Spec Modal / Drawer */}
      {showSpecModal && currentSpec && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c140c] border border-[#22c55e]/60 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#182818] pb-3">
              <h4 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Code size={16} className="text-[#22c55e]" /> Archify Spec JSON
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySpec}
                  className="px-3 py-1 bg-[#142614] border border-[#22c55e]/40 text-[#22c55e] text-xs font-mono rounded-xl hover:bg-[#1e381e] flex items-center gap-1.5"
                >
                  {copied ? <Check size={14} /> : <Code size={14} />}
                  <span>{copied ? "Copiado!" : "Copiar JSON"}</span>
                </button>
                <button
                  onClick={() => setShowSpecModal(false)}
                  className="px-3 py-1 bg-[#050805] border border-[#182818] text-slate-400 hover:text-white text-xs font-mono rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <pre className="bg-[#050805] border border-[#182818] p-4 rounded-2xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[60vh] leading-relaxed">
              {JSON.stringify(currentSpec, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
