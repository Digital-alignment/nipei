"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Search,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Brain,
  FileText,
  Calendar,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MethodologyFile {
  name: string;
  relativePath: string;
  fullPath: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  category: string;
}

const CATEGORY_MAP: Record<string, { tag: string; color: string; icon: any; summary: string }> = {
  "Agile Scrum y OKRs 0.1.md": {
    tag: "Agilidad & Metas",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
    icon: Target,
    summary: "Ciclos iterativos de entrega continua y alineación estratégica por objetivos clave.",
  },
  "Deep Work 0.1.md": {
    tag: "Foco Profundo",
    color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
    icon: Zap,
    summary: "Reglas para concentrar la atención en tareas de alto valor cognitivo sin distracciones.",
  },
  "GTD Getting Things Done 0.1.md": {
    tag: "Captura & Flujo",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400",
    icon: CheckCircle2,
    summary: "Vaciado mental de tareas, categorización por contextos y ejecución sin fricción.",
  },
  "Matriz de Eisenhower 0.1.md": {
    tag: "Priorización",
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
    icon: Layers,
    summary: "Cuadrante de decisión: Urgente vs Importante (Hacer, Planificar, Delegar, Eliminar).",
  },
  "Metodo Ivy Lee 0.1.md": {
    tag: "Foco Diario",
    color: "from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400",
    icon: Clock,
    summary: "6 tareas prioritarias por día ordenadas por impacto estricto (Método del Portal).",
  },
  "Kaizen y Ciclo PDCA 0.1.md": {
    tag: "Mejora Continua",
    color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
    icon: TrendingUp,
    summary: "Plan-Do-Check-Act: optimización continua en pequeños pasos exponenciales.",
  },
  "Estoicismo y Autorregulacion 0.1.md": {
    tag: "Mindset & Temple",
    color: "from-stone-500/20 to-zinc-500/10 border-stone-500/30 text-stone-300",
    icon: Shield,
    summary: "Control dicotómico (lo que depende de ti vs lo que no), claridad y serenidad operativa.",
  },
  "Timeblocking y Pomodoro 0.1.md": {
    tag: "Ritmos de Tiempo",
    color: "from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-400",
    icon: Calendar,
    summary: "Bloques de trabajo dedicados de 25/50 min con pausas deliberadas.",
  },
  "Metodo PARA 0.1.md": {
    tag: "Organización Digital",
    color: "from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400",
    icon: Brain,
    summary: "Proyectos, Áreas, Recursos y Archivos para una segunda memoria estructurada.",
  },
  "Metodologia 4DX 0.1.md": {
    tag: "Ejecución Estratégica",
    color: "from-orange-500/20 to-red-500/10 border-orange-500/30 text-orange-400",
    icon: Target,
    summary: "Las 4 disciplinas de la ejecución: metas crucialmente importantes y tablero de control.",
  },
};

export default function MetodologiasHubPage() {
  const [methods, setMethods] = useState<MethodologyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<MethodologyFile | null>(null);
  const [content, setContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/productivity/files")
      .then((r) => r.json())
      .then((data) => {
        if (data.files) {
          const filtered = data.files.filter(
            (f: MethodologyFile) =>
              f.category.toLowerCase().includes("metodologia") ||
              f.relativePath.toLowerCase().includes("metodologias")
          );
          setMethods(filtered);
          if (filtered.length > 0) {
            handleSelect(filtered[0]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (file: MethodologyFile) => {
    setSelectedFile(file);
    setContentLoading(true);
    try {
      const res = await fetch(`/api/productivity/files?file=${encodeURIComponent(file.relativePath)}`);
      const data = await res.json();
      setContent(data.content || "");
    } catch (e) {
      setContent("Error al cargar la metodología.");
    } finally {
      setContentLoading(false);
    }
  };

  const filteredMethods = methods.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1612] via-[#09110d] to-[#06090c] border border-emerald-500/20 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5" />
            Nipëi Brain · Frameworks de Gestión
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Hub de Metodologías & Marcos de Trabajo
          </h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Acervo vivo de las mejores prácticas globales adaptadas al Duplo Núcleo: gestión ágil,
            priorización diaria (Ivy Lee), disciplina de ejecución (4DX) y resiliencia estoica.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Grid: Sidebar List + Content Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[680px]">
        {/* Left Column: Methodology Cards List */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar metodología (ej: Ivy Lee, Scrum, PARA)..."
              className="w-full bg-[#0a0c10] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition font-mono"
            />
          </div>

          {/* Cards Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[640px] pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-500 italic">
                Cargando frameworks desde el Vault...
              </div>
            ) : filteredMethods.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No se encontraron metodologías que coincidan con la búsqueda.
              </div>
            ) : (
              filteredMethods.map((m) => {
                const isSelected = selectedFile?.relativePath === m.relativePath;
                const meta = CATEGORY_MAP[m.name] || {
                  tag: "Marco de Trabajo",
                  color: "from-zinc-500/20 to-zinc-500/10 border-white/10 text-zinc-300",
                  icon: FileText,
                  summary: "Documentación metodológica del sistema.",
                };
                const IconComponent = meta.icon;

                const cleanTitle = m.name.replace(/\s*0\.\d+\.md$/, "").replace(/\.md$/, "");

                return (
                  <button
                    key={m.relativePath}
                    onClick={() => handleSelect(m)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-[#101b14] border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                        : "bg-[#0a0c10]/80 hover:bg-[#0f1418] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg border bg-gradient-to-br flex items-center justify-center shrink-0 ${meta.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {cleanTitle}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                          {meta.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {meta.summary}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Markdown Reader */}
        <div className="lg:col-span-7 bg-[#0a0c10] border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* Reader Header */}
              <div className="pb-4 mb-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Documento del Vault: Productivity/{selectedFile.relativePath}
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedFile.name.replace(/\s*0\.\d+\.md$/, "").replace(/\.md$/, "")}
                  </h2>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {Math.round(selectedFile.sizeBytes / 1024)} KB
                </div>
              </div>

              {/* Reader Body */}
              <div className="flex-1 overflow-y-auto pr-2 prose prose-invert prose-emerald max-w-none text-xs leading-relaxed">
                {contentLoading ? (
                  <div className="p-8 text-center text-zinc-500 italic">
                    Cargando contenido de la metodología...
                  </div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <Compass className="w-10 h-10 text-zinc-600 mb-3 animate-pulse" />
              <p className="text-sm">Selecciona una metodología a la izquierda para leer su especificación completa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
