"use client";

import React, { useState } from "react";
import {
  Compass,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Tag,
  Users,
  CheckSquare,
  Eye,
  Zap,
  FolderCheck,
  Building,
  Feather,
  ShoppingBag,
  HeartHandshake,
  Upload,
  Link as LinkIcon,
  Layers,
  Award,
} from "lucide-react";

interface CategoryOption {
  id: string;
  vaultFolder: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  suggestedSquad: string;
  defaultTags: string[];
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "vision_philosophy",
    vaultFolder: "Master_Sources/Vision_Philosophy",
    title: "Visión & Sabiduría Ancestral",
    subtitle: "Filosofía, Manifiestos & Fundamentos",
    description: "Libros sagrados, filosofía Inî Rau, manifiestos de origen y principios orientadores de Nipëi OS.",
    icon: <Feather className="w-6 h-6 text-amber-400" />,
    suggestedSquad: "squad_1_ceo",
    defaultTags: ["vision", "filosofia", "sabiduria", "sagrado"],
  },
  {
    id: "botanical_catalog",
    vaultFolder: "Master_Sources/Botanical_Catalog",
    title: "Botánica & Farmacopea Florestal",
    subtitle: "Medicina Tradicional & Recetario",
    description: "Fichas de plantas medicinales, preparaciones botánicas, recetarios tradicionales y formulaciones Mutum.",
    icon: <BookOpen className="w-6 h-6 text-emerald-400" />,
    suggestedSquad: "squad_2_mutum",
    defaultTags: ["botanica", "fitoterapia", "farmacopea", "mutum"],
  },
  {
    id: "retreat_protocols",
    vaultFolder: "Master_Sources/Retreat_Protocols",
    title: "Operaciones & Protocolos de Retiro",
    subtitle: "Guías de Facilitación & Anamnesis",
    description: "Protocolos de facilitación, seguridad médica, dietas samakey y cuestionarios de anamnesis espiritual.",
    icon: <HeartHandshake className="w-6 h-6 text-purple-400" />,
    suggestedSquad: "squad_3_retiros",
    defaultTags: ["retiros", "protocolos", "hospitalidad", "anamnesis"],
  },
  {
    id: "commercial_ethical",
    vaultFolder: "Master_Sources/Commercial_Ethical",
    title: "Comercio Ético & Catálogo de Productos",
    subtitle: "Modelos Comerciales & Precios",
    description: "Políticas de precios, certificación de origen ético, fichas de catálogo e Inî Rau E-Commerce.",
    icon: <ShoppingBag className="w-6 h-6 text-blue-400" />,
    suggestedSquad: "squad_4_vendas_mkt",
    defaultTags: ["comercio", "lotes", "precios", "e_commerce"],
  },
  {
    id: "corporate_squads",
    vaultFolder: "Master_Sources/Corporate_Squads",
    title: "Estructura Corporativa & Squads",
    subtitle: "Gobernanza & Acuerdos Legales",
    description: "Organigramas, gobernanza del Instituto Mutum, contratos legales, DRE y centros de costo.",
    icon: <Building className="w-6 h-6 text-cyan-400" />,
    suggestedSquad: "squad_5_adm_legal",
    defaultTags: ["gobernanza", "legal", "instituto", "dre"],
  },
];

const SQUADS_LIST = [
  { id: "squad_1_ceo", label: "Squad I — Estratégia / CEO" },
  { id: "squad_2_mutum", label: "Squad II — Produção Mutum" },
  { id: "squad_3_retiros", label: "Squad III — Logística Retiros" },
  { id: "squad_4_vendas_mkt", label: "Squad IV — Vendas & Mkt" },
  { id: "squad_5_adm_legal", label: "Squad V — Adm / Legal / Fin" },
  { id: "squad_6_infra", label: "Squad VI — Infraestrutura" },
  { id: "squad_7_instituto", label: "Squad VII — Instituto & Donadores" },
];

export default function GuidedIngestionWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("Líderes de Núcleo / Concheiros Mutum");
  const [description, setDescription] = useState("");
  const [squad, setSquad] = useState(CATEGORIES[0].suggestedSquad);
  const [tagsInput, setTagsInput] = useState(CATEGORIES[0].defaultTags.join(", "));

  // Content input method
  const [contentMethod, setContentMethod] = useState<"text" | "url" | "file">("text");
  const [content, setContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Ethical Certifications
  const [originAudited, setOriginAudited] = useState(true);
  const [zeroHallucinationCompliant, setZeroHallucinationCompliant] = useState(true);
  const [aiCommunityApproved, setAiCommunityApproved] = useState(true);
  const [commercialVetoChecked, setCommercialVetoChecked] = useState(true);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectCategory = (cat: CategoryOption) => {
    setSelectedCategory(cat);
    setSquad(cat.suggestedSquad);
    setTagsInput(cat.defaultTags.join(", "));
  };

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return;
    setLoadingUrl(true);
    try {
      const res = await fetch(urlInput);
      if (res.ok) {
        const text = await res.text();
        const clean = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, "\n")
          .replace(/\n\s*\n/g, "\n\n")
          .trim();
        setContent(clean.slice(0, 15000));
        if (!title) {
          const m = text.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (m) setTitle(m[1].trim());
        }
      }
    } catch (e: any) {
      alert("No se pudo extraer la URL directamente: " + e.message);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleSaveMasterSource = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        category: selectedCategory.vaultFolder,
        categoryLabel: selectedCategory.title,
        title,
        author,
        description,
        squad,
        sourceType: contentMethod === "text" ? "Texto Directo" : contentMethod === "url" ? "URL Web" : "Archivo Importado",
        tags: tagsArray,
        ethicalCertifications: {
          originAudited,
          zeroHallucinationCompliant,
          aiCommunityApproved,
          commercialVetoChecked,
        },
        content,
      };

      const res = await fetch("/api/vault/guided-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitResult(json);
        setStep(5);
        if (onComplete) onComplete();
      } else {
        setErrorMessage(json.error || "Falló la ingestión de la fuente.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la API de ingestión guiada.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#0e1610] via-[#09100a] to-[#050805] border border-[#1b331c] rounded-3xl p-6 md:p-8 shadow-2xl text-slate-200">
      {/* Header Badge & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#182a18]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 text-[11px] font-black tracking-wider uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              NIPËI OS MASTER KNOWLEDGE VAULT
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Ingestión Guiada de Fuentes Maestras
          </h2>
          <p className="text-xs md:text-sm text-[#8aa88a] mt-1">
            Curaduría estructurada de sabiduría, protocolos e información corporativa verificada sin alucinaciones.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0c180e] p-3 rounded-2xl border border-[#1b331c]">
          <Award className="w-6 h-6 text-emerald-400" />
          <div className="text-xs">
            <p className="text-[#688a68]">Nivel de Gobernanza:</p>
            <p className="font-bold text-white">Certificado Cero-Alucinación</p>
          </div>
        </div>
      </div>

      {/* Step Visual Indicator */}
      <div className="mb-10">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold uppercase tracking-wider mb-3">
          <div className={step >= 1 ? "text-emerald-400 font-extrabold" : "text-slate-600"}>1. Categoría</div>
          <div className={step >= 2 ? "text-emerald-400 font-extrabold" : "text-slate-600"}>2. Metadatos</div>
          <div className={step >= 3 ? "text-emerald-400 font-extrabold" : "text-slate-600"}>3. Contenido</div>
          <div className={step >= 4 ? "text-emerald-400 font-extrabold" : "text-slate-600"}>4. Certificación</div>
          <div className={step >= 5 ? "text-emerald-400 font-extrabold" : "text-slate-600"}>5. Ingestado</div>
        </div>
        <div className="w-full h-2 bg-[#122013] rounded-full overflow-hidden p-0.5 border border-[#182a18]">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-md shadow-emerald-500/50"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-[#0b140c] border border-[#172818] p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" /> Paso 1: Selecciona el Eje Temático Maestro
            </h3>
            <p className="text-xs text-[#8aa88a] mt-1">
              Clasifica la fuente en el árbol temático oficial de **Nipëi Vault** para indexación instantánea.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.id === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#112413] border-emerald-500 shadow-xl shadow-emerald-950/60 ring-2 ring-emerald-500/30"
                      : "bg-[#080f09] border-[#152416] hover:border-[#223d23] hover:bg-[#0c180e]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-3 bg-[#162a18] border border-emerald-500/30 rounded-xl shadow-md">{cat.icon}</div>
                      {isSelected ? (
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Seleccionado
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#688a68] font-mono">{cat.suggestedSquad}</span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-white text-base">{cat.title}</h4>
                    <p className="text-xs font-semibold text-emerald-400/90 mt-0.5">{cat.subtitle}</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{cat.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#172818] flex items-center justify-between text-[11px] text-[#688a68] font-mono">
                    <span>📁 {cat.vaultFolder}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-7 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 text-sm"
            >
              Siguiente: Metadatos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: METADATA */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-[#0b140c] border border-[#172818] p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" /> Paso 2: Metadatos de la Fuente Maestra
            </h3>
            <p className="text-xs text-[#8aa88a] mt-1">
              Especifique el título, autor/origen y el Squad custodio responsable de mantener actualizada esta fuente.
            </p>
          </div>

          <div className="space-y-5 bg-[#080f09] border border-[#152416] p-6 rounded-2xl">
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                Título del Documento / Manual Maestro *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Libro Inî Rau: Filosofía y Protocolos Sagrados Mutum"
                className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                  Autor / Origen de la Fuente
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ej. Pajé Mutum, Dra. Ana Castro"
                  className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                  Squad Custodio Responsable
                </label>
                <select
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                  className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {SQUADS_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5">
                Resumen Ejecutivo / Descripción Corta
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Explicación concisa del propósito de esta fuente y cómo debe ser consultada por los Agentes de Nipëi OS..."
                className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" /> Tags de Indexación (separados por coma)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vision, sagrado, mutum, botanica"
                className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-3 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-[#122214] hover:bg-[#18301b] text-slate-300 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border border-[#1c351f]"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              onClick={() => {
                if (!title.trim()) {
                  alert("Por favor ingresa un título para la fuente maestra.");
                  return;
                }
                setStep(3);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-7 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 text-sm"
            >
              Siguiente: Contenido <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONTENT */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-[#0b140c] border border-[#172818] p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Paso 3: Carga del Contenido de la Fuente
            </h3>
            <p className="text-xs text-[#8aa88a] mt-1">
              Ingresa el texto maestro en Markdown, extrae el contenido directamente desde una URL o importa un archivo.
            </p>
          </div>

          {/* Method Picker */}
          <div className="flex gap-2 p-1.5 bg-[#080f09] border border-[#152416] rounded-2xl w-fit">
            <button
              onClick={() => setContentMethod("text")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                contentMethod === "text"
                  ? "bg-[#142916] text-emerald-400 border border-emerald-500/40 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" /> Texto / Markdown Directo
            </button>
            <button
              onClick={() => setContentMethod("url")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                contentMethod === "url"
                  ? "bg-[#142916] text-cyan-400 border border-cyan-500/40 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Extraer desde URL
            </button>
            <button
              onClick={() => setContentMethod("file")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                contentMethod === "file"
                  ? "bg-[#142916] text-purple-400 border border-purple-500/40 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4" /> Archivo (.md / .txt)
            </button>
          </div>

          {contentMethod === "url" && (
            <div className="flex gap-2 bg-[#080f09] border border-[#152416] p-4 rounded-2xl">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/documento-maestro"
                className="flex-1 bg-[#0d180f] border border-[#1b331c] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleFetchUrl}
                disabled={loadingUrl}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {loadingUrl ? "Extrayendo..." : "Extraer Web"}
              </button>
            </div>
          )}

          {contentMethod === "file" && (
            <div className="border-2 border-dashed border-[#1b331c] hover:border-emerald-500 rounded-2xl p-6 text-center bg-[#080f09] transition-all">
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-slate-200">Arrastra o selecciona un archivo Markdown (.md) o Texto (.txt)</p>
              <input
                type="file"
                accept=".md,.txt,.json"
                onChange={handleFileUpload}
                className="mt-3 text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#162a18] file:text-emerald-300 hover:file:bg-[#1e3b21]"
              />
            </div>
          )}

          <div className="bg-[#080f09] border border-[#152416] p-5 rounded-2xl">
            <label className="block text-xs font-extrabold uppercase text-slate-300 mb-2 flex justify-between items-center">
              <span>Contenido de la Fuente *</span>
              <span className="text-emerald-400 font-mono text-[11px]">{content.length} caracteres</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Escribe o pega aquí el contenido completo del documento maestro..."
              className="w-full bg-[#0d180f] border border-[#1b331c] rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-[#122214] hover:bg-[#18301b] text-slate-300 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border border-[#1c351f]"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              onClick={() => {
                if (!content.trim()) {
                  alert("Por favor proporciona el contenido de la fuente.");
                  return;
                }
                setStep(4);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-7 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 text-sm"
            >
              Siguiente: Certificación <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ETHICAL CERTIFICATION */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-[#0b140c] border border-[#172818] p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Paso 4: Certificación de Origen Ético & Gobernanza
            </h3>
            <p className="text-xs text-[#8aa88a] mt-1">
              Confirma que la fuente cumple los requisitos del Núcleo para ser utilizada sin alucinaciones por los Agentes IA.
            </p>
          </div>

          <div className="space-y-3 bg-[#080f09] border border-[#152416] rounded-2xl p-6">
            <label className="flex items-start gap-3.5 cursor-pointer p-3 hover:bg-[#0d180f] rounded-xl transition-all border border-transparent hover:border-[#1b331c]">
              <input
                type="checkbox"
                checked={originAudited}
                onChange={(e) => setOriginAudited(e.target.checked)}
                className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-white text-sm">🟢 Origem Auditada e Verificada</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Documento auténtico verificado por líderes del Núcleo o dirección ejecutiva de Nipëi OS.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3.5 cursor-pointer p-3 hover:bg-[#0d180f] rounded-xl transition-all border border-transparent hover:border-[#1b331c]">
              <input
                type="checkbox"
                checked={zeroHallucinationCompliant}
                onChange={(e) => setZeroHallucinationCompliant(e.target.checked)}
                className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-white text-sm">🟢 Conformidade Cero-Alucinação (RAG Strict)</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Texto inquebrantable de consulta estricta para los agentes de IA (Hermes, Antigravity, Claude).
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3.5 cursor-pointer p-3 hover:bg-[#0d180f] rounded-xl transition-all border border-transparent hover:border-[#1b331c]">
              <input
                type="checkbox"
                checked={aiCommunityApproved}
                onChange={(e) => setAiCommunityApproved(e.target.checked)}
                className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-white text-sm">🟢 Aprovado para Consulta Comunitária pelos Agentes</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Habilita la lectura automatizada por los Squads de Nipëi OS para generar resúmenes y responder consultas.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3.5 cursor-pointer p-3 hover:bg-[#0d180f] rounded-xl transition-all border border-transparent hover:border-[#1b331c]">
              <input
                type="checkbox"
                checked={commercialVetoChecked}
                onChange={(e) => setCommercialVetoChecked(e.target.checked)}
                className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-white text-sm">🟢 Verificação de Veto Comercial e Respeito Éico</span>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Respeto a los límites sagrados y cláusulas de confidencialidad corporativa.
                </p>
              </div>
            </label>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200">
              ⚠️ Error: {errorMessage}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-[#122214] hover:bg-[#18301b] text-slate-300 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all border border-[#1c351f]"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              onClick={handleSaveMasterSource}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black px-8 py-3 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" /> Ingestando en Master Vault...
                </>
              ) : (
                <>
                  🚀 Ingestar & Certificar en Master Vault
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: COMPLETED */}
      {step === 5 && submitResult && (
        <div className="space-y-6 text-center py-6">
          <div className="w-20 h-20 bg-emerald-950 border-2 border-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-950/80">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h3 className="text-2xl md:text-3xl font-black text-white">¡Fuente Maestra Ingestada!</h3>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              El documento fue procesado, firmado con checksum SHA256 y guardado en **Nipëi Vault**.
            </p>
          </div>

          <div className="bg-[#080f09] border border-[#152416] rounded-2xl p-5 max-w-xl mx-auto text-left text-xs font-mono space-y-2.5 shadow-inner">
            <div className="flex justify-between text-slate-400 border-b border-[#152416] pb-2">
              <span>Ruta Guardada:</span>
              <span className="text-emerald-400 font-bold">{submitResult.vaultPath}</span>
            </div>
            <div className="flex justify-between text-slate-400 border-b border-[#152416] pb-2">
              <span>Archivo:</span>
              <span className="text-slate-200">{submitResult.filename}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SHA256:</span>
              <span className="text-slate-400">{submitResult.sha256?.slice(0, 24)}...</span>
            </div>
          </div>

          {submitResult.aiDigest?.keyTakeaways?.length > 0 && (
            <div className="bg-[#0c180e] border border-emerald-900/60 rounded-2xl p-5 max-w-xl mx-auto text-left">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> AI Digest Automático
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {submitResult.aiDigest.keyTakeaways.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setTitle("");
                setDescription("");
                setContent("");
                setStep(1);
              }}
              className="bg-[#122214] hover:bg-[#18301b] text-emerald-300 border border-[#1c351f] font-extrabold px-6 py-3 rounded-2xl text-xs transition-all shadow-md"
            >
              ➕ Ingestar Otra Fuente Maestra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
