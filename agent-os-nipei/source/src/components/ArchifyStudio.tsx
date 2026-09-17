"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  Download,
  Code,
  FileText,
  Play,
  Check,
  Bot,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  Info,
  Zap
} from "lucide-react";
import { PREBUILT_DIAGRAMS, PrebuiltDiagram } from "@/data/archifySpecs";

interface AgentOption {
  id: string;
  name: string;
  role: string;
}

const AVAILABLE_AGENTS: AgentOption[] = [
  { id: "hermes", name: "Hermes 2.0", role: "RAG & Conocimiento Cero-Alucinación" },
  { id: "planner", name: "Planner Agent", role: "Desglose de Objetivos y Workflows" },
  { id: "builder", name: "Builder Agent", role: "Construcción & Código de Arquitectura" },
  { id: "antigravity", name: "Antigravity OS", role: "Orquestador de Sistema & Vault" },
  { id: "chaman", name: "Chamán Yawanawá", role: "Conciencia Ritual & Fitoterapia" },
  { id: "venu", name: "Venu Voice", role: "Voz Ancestral & Agendamiento" },
];

const PRESET_OPTIONS = [
  { id: "blueprint", name: "Blueprint", desc: "Plano Técnico Azul", badge: "🟦" },
  { id: "classic", name: "Classic", desc: "Editorial Limpio", badge: "🎨" },
  { id: "signal-flow", name: "Signal-Flow", desc: "Oscuro Neón Energético", badge: "⚡" },
];

const DIAGRAM_TYPES = [
  { id: "architecture", label: "Architecture", icon: "🏛️", desc: "Componentes, VPS, Supabase, límites" },
  { id: "workflow", label: "Workflow", icon: "🔄", desc: "Procesos, CI/CD, runbooks de Squads" },
  { id: "sequence", label: "Sequence", icon: "⚡", desc: "Traza API, autenticación, fallbacks" },
  { id: "dataflow", label: "Data Flow", icon: "🌊", desc: "Pipelines, Vault lineage, consumidores" },
  { id: "lifecycle", label: "Lifecycle", icon: "⏳", desc: "Transiciones de estado, retiros" },
];

const TOPIC_SUGGESTIONS = [
  "Fitoterapia & Alquimia Yawanawá (Inî Rau)",
  "Retiros Samakey & Anamnesis Espiritual",
  "Nipëi OS Core & Pipeline RAG Hermes 2.0",
  "Infraestructura VPS Hostinger & Proxy Reverse",
  "Organigrama & Operaciones de los 7 Squads",
  "Sistema de Pagos & Integración WhatsApp",
];

export default function ArchifyStudio() {
  const [activeTab, setActiveTab] = useState<"curated" | "rag_generator">("curated");
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>("nipei-ecosystem-architecture");
  
  // Custom generated state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("hermes");
  const [selectedType, setSelectedType] = useState<string>("architecture");
  const [topicInput, setTopicInput] = useState<string>("Fitoterapia & Alquimia Yawanawá (Inî Rau)");
  const [generatedSpec, setGeneratedSpec] = useState<any | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [lastAgentUsed, setLastAgentUsed] = useState<string | null>(null);
  
  // Visual presentation options
  const [visualPreset, setVisualPreset] = useState<string>("blueprint");
  const [traceMotion, setTraceMotion] = useState<boolean>(true);

  // Modal / Spec Drawer state
  const [showSpecModal, setShowSpecModal] = useState<boolean>(false);
  const [copiedSpec, setCopiedSpec] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active diagram metadata
  const currentPrebuilt = PREBUILT_DIAGRAMS.find((d) => d.id === selectedDiagramId) || PREBUILT_DIAGRAMS[0];

  // Re-render generated HTML when preset or animation toggles
  useEffect(() => {
    if (activeTab === "rag_generator" && generatedSpec) {
      reRenderGeneratedSpec(generatedSpec, visualPreset, traceMotion);
    }
  }, [visualPreset, traceMotion]);

  const handleGenerateSpec = async () => {
    if (!topicInput.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/archify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: topicInput,
          diagramType: selectedType,
          agent: selectedAgent,
          preset: visualPreset,
          animation: traceMotion ? "trace" : "none",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Error al generar diagrama RAG.");
      }

      setGeneratedSpec(data.spec);
      setGeneratedHtml(data.html);
      setLastAgentUsed(data.agentUsed || selectedAgent);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Fallo en el motor de generación Archify.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reRenderGeneratedSpec = async (spec: any, preset: string, trace: boolean) => {
    try {
      const res = await fetch("/api/archify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "render",
          spec,
          type: spec.diagram_type || selectedType,
          preset,
          animation: trace ? "trace" : "none",
        }),
      });
      const data = await res.json();
      if (data.success && data.html) {
        setGeneratedHtml(data.html);
      }
    } catch (e) {
      console.error("Error re-rendering spec:", e);
    }
  };

  const handleCopySpec = () => {
    const targetSpec = activeTab === "curated" ? currentPrebuilt.spec : generatedSpec;
    if (!targetSpec) return;
    navigator.clipboard.writeText(JSON.stringify(targetSpec, null, 2));
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  // Compute iframe URL or srcDoc
  const animationQuery = traceMotion ? "trace" : "none";
  const iframeSrc =
    activeTab === "curated"
      ? `/api/archify?id=${selectedDiagramId}&preset=${visualPreset}&animation=${animationQuery}&raw=1`
      : undefined;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER HERO */}
      <div className="bg-[#091409] border border-[#162a18] rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded bg-[#142614] text-[#22c55e] border border-[#1e381e]">
                Nipëi OS Engineering
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                CLI v0.1.0 (tt-a1i/archify)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Workflow className="text-[#22c55e]" size={26} />
              Archify Knowledge Studio
            </h1>
            <p className="text-xs text-[#a7f3d0]/80 mt-1 max-w-2xl">
              Motor visual interactivo para explorar la Base de Conocimiento (<code className="text-emerald-400">nipei-vault</code>), 
              Squads, Empresas y la Arquitectura de Sistemas en 5 dimensiones técnicas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSpecModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#1e381e] bg-[#0d1c0d] text-emerald-400 hover:bg-[#142814] transition"
            >
              <Code size={14} />
              <span>Ver JSON Spec</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTROL & MODE TABS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#091409] border border-[#162a18] p-2 rounded-xl">
        <div className="flex items-center gap-1 bg-[#050b05] p-1 rounded-lg border border-[#142614]">
          <button
            onClick={() => setActiveTab("curated")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "curated"
                ? "bg-[#162c16] text-emerald-400 border border-[#22c55e]/30 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={14} />
            <span>Diagramas Curados ({PREBUILT_DIAGRAMS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("rag_generator")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition ${
              activeTab === "rag_generator"
                ? "bg-[#162c16] text-emerald-400 border border-[#22c55e]/30 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Generador RAG por IA</span>
          </button>
        </div>

        {/* VISUAL CONTROLS (PRESETS & ANIMATION) */}
        <div className="flex items-center gap-3 px-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1 bg-[#050b05] p-1 rounded-lg border border-[#142614]">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
              <SlidersHorizontal size={12} /> Presets:
            </span>
            {PRESET_OPTIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setVisualPreset(p.id)}
                title={p.desc}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded transition ${
                  visualPreset === p.id
                    ? "bg-[#1e3b1e] text-white border border-[#22c55e]/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{p.badge}</span>
                <span className="hidden sm:inline">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Trace Motion Toggle */}
          <button
            onClick={() => setTraceMotion(!traceMotion)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
              traceMotion
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-sm"
                : "bg-[#081208] text-slate-500 border-[#142614] hover:text-slate-300"
            }`}
          >
            <Zap size={13} className={traceMotion ? "animate-pulse text-amber-400" : ""} />
            <span>Trace Motion</span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA: TAB 1 (CURATED) OR TAB 2 (RAG GENERATOR) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT CONTROL PANEL */}
        <div className="lg:col-span-1 space-y-4">
          {activeTab === "curated" ? (
            /* CURATED DIAGRAMS LIST */
            <div className="bg-[#091409] border border-[#162a18] rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Diagramas Precargados</span>
                <span className="text-[10px] bg-[#142614] text-emerald-400 px-2 py-0.5 rounded">Core</span>
              </h2>

              <div className="space-y-2">
                {PREBUILT_DIAGRAMS.map((diagram) => {
                  const isSelected = selectedDiagramId === diagram.id;
                  return (
                    <button
                      key={diagram.id}
                      onClick={() => setSelectedDiagramId(diagram.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-[#122412] border-[#22c55e] text-white shadow-md"
                          : "bg-[#050b05] border-[#142614] text-slate-300 hover:border-[#1e3b1e] hover:bg-[#0b160b]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {diagram.type}
                        </span>
                        <span className="text-[9px] text-slate-400 bg-[#070f07] px-1.5 py-0.5 rounded border border-[#142614]">
                          {diagram.category}
                        </span>
                      </div>
                      <div className="text-xs font-bold truncate">{diagram.name}</div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {diagram.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DYNAMIC RAG AI GENERATOR FORM */
            <div className="bg-[#091409] border border-[#162a18] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Configurar RAG AI</span>
                </h2>
                <span className="text-[9px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/40">
                  En tiempo real
                </span>
              </div>

              {/* Agent Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Seleccionar Agente IA:</span>
                  <span className="text-emerald-400 font-mono">@{selectedAgent}</span>
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1 sidebar-scroll">
                  {AVAILABLE_AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition ${
                        selectedAgent === agent.id
                          ? "bg-[#142814] border-[#22c55e] text-white"
                          : "bg-[#050b05] border-[#142614] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <Bot size={13} className={selectedAgent === agent.id ? "text-[#22c55e]" : "text-slate-500"} />
                          @{agent.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{agent.role}</div>
                      </div>
                      {selectedAgent === agent.id && <Check size={14} className="text-[#22c55e] shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Target Prompt */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Tema u Objetivo del Vault:</label>
                <textarea
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  rows={3}
                  placeholder="Ej: Flujo de anamnesis espiritual Samakey..."
                  className="w-full bg-[#050b05] border border-[#162a18] rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#22c55e]"
                />
                
                {/* Topic Suggestions */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sugerencias:</span>
                  <div className="flex flex-wrap gap-1">
                    {TOPIC_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => setTopicInput(sug)}
                        className="text-[9px] bg-[#070f07] text-slate-400 hover:text-emerald-300 px-2 py-0.5 rounded border border-[#142614] hover:border-emerald-800 transition truncate max-w-full"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagram Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300">Dimension del Diagrama:</label>
                <div className="grid grid-cols-1 gap-1">
                  {DIAGRAM_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition ${
                        selectedType === t.id
                          ? "bg-[#142814] border-[#22c55e] text-white"
                          : "bg-[#050b05] border-[#142614] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <div className="min-w-0">
                        <div className="font-bold">{t.label}</div>
                        <div className="text-[9px] text-slate-400 truncate">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleGenerateSpec}
                disabled={isGenerating || !topicInput.trim()}
                className="w-full py-2.5 px-4 bg-[#22c55e] hover:bg-[#1eb054] text-black font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Generando con @{selectedAgent}...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Generar Diagrama RAG</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="p-2.5 bg-red-950/80 border border-red-800/60 rounded-lg text-[10px] text-red-300">
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT MAIN VIEWER CANVAS */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-[#091409] border border-[#162a18] rounded-xl overflow-hidden flex flex-col min-h-[660px]">
            {/* CANVAS BAR */}
            <div className="bg-[#050b05] px-4 py-3 border-b border-[#142614] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {activeTab === "curated"
                    ? currentPrebuilt.name
                    : topicInput || "Diagrama RAG Generado"}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-[#142614] text-emerald-400 border border-[#1e381e]">
                  {activeTab === "curated" ? currentPrebuilt.type : selectedType}
                </span>
                {activeTab === "rag_generator" && lastAgentUsed && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                    @{lastAgentUsed}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSpecModal(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-[#0c180c] hover:bg-[#142814] border border-[#1e381e] rounded flex items-center gap-1.5 transition"
                >
                  <Code size={13} />
                  <span>JSON Spec</span>
                </button>
              </div>
            </div>

            {/* DIAGRAM IFRAME CONTAINER */}
            <div className="flex-1 bg-[#020502] p-2 relative flex items-center justify-center">
              {activeTab === "curated" ? (
                <iframe
                  key={`${selectedDiagramId}-${visualPreset}-${traceMotion}`}
                  src={iframeSrc}
                  className="w-full h-[620px] rounded-lg border border-[#142614] bg-black"
                  title={currentPrebuilt.name}
                />
              ) : generatedHtml ? (
                <iframe
                  key={`generated-${visualPreset}-${traceMotion}`}
                  srcDoc={generatedHtml}
                  className="w-full h-[620px] rounded-lg border border-[#142614] bg-black"
                  title="Diagrama RAG Generado"
                />
              ) : (
                <div className="text-center p-12 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#0d1e0d] border border-[#1a381a] flex items-center justify-center mx-auto text-[#22c55e]">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Listo para Generar Diagrama RAG</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Selecciona un agente de IA (@hermes, @planner, @builder, etc.) y escribe un tema para consultar el Vault y construir la especificación visual en tiempo real.
                  </p>
                  <button
                    onClick={handleGenerateSpec}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-[#22c55e] text-black font-bold text-xs rounded-lg hover:bg-[#1eb054] transition inline-flex items-center gap-2"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Iniciar Generación</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: VIEW / COPY JSON SPEC */}
      {showSpecModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091409] border border-[#162a18] rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-[#142614] flex items-center justify-between bg-[#050b05]">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-[#22c55e]" />
                <h3 className="text-sm font-bold text-white">
                  Especificación Archify JSON ({activeTab === "curated" ? currentPrebuilt.id : "Dynamic RAG"})
                </h3>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-[#142614] rounded"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] text-emerald-300 bg-[#020502] sidebar-scroll">
              <pre>
                {JSON.stringify(
                  activeTab === "curated" ? currentPrebuilt.spec : generatedSpec || { note: "Sin spec generada aún" },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="px-5 py-3 border-t border-[#142614] bg-[#050b05] flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Compatible con <code className="text-emerald-400">node bin/archify.mjs deliver</code>
              </span>
              <button
                onClick={handleCopySpec}
                className="px-4 py-2 bg-[#22c55e] text-black font-bold text-xs rounded hover:bg-[#1eb054] transition flex items-center gap-1.5"
              >
                {copiedSpec ? <Check size={14} /> : <FileText size={14} />}
                <span>{copiedSpec ? "¡Copiado!" : "Copiar JSON Spec"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
