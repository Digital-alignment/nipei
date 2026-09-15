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
  Lock,
  Upload,
  Link as LinkIcon,
} from "lucide-react";

interface CategoryOption {
  id: string;
  vaultFolder: string;
  title: string;
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
    description: "Libros sagrados, filosofía Inî Rau, manifiestos y declaraciones de origen.",
    icon: <Feather className="w-5 h-5 text-amber-400" />,
    suggestedSquad: "squad_1_ceo",
    defaultTags: ["vision", "filosofia", "sabiduria", "sagrado"],
  },
  {
    id: "botanical_catalog",
    vaultFolder: "Master_Sources/Botanical_Catalog",
    title: "Botánica & Farmacopea Florestal",
    description: "Fichas de plantas medicinales, preparaciones botánicas y recetas tradicionales.",
    icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
    suggestedSquad: "squad_2_mutum",
    defaultTags: ["botanica", "fitoterapia", "farmacopea", "mutum"],
  },
  {
    id: "retreat_protocols",
    vaultFolder: "Master_Sources/Retreat_Protocols",
    title: "Operaciones & Protocolos de Retiro",
    description: "Guías de facilitación, seguridad médica, dietas samakey e intenciones de retiro.",
    icon: <HeartHandshake className="w-5 h-5 text-purple-400" />,
    suggestedSquad: "squad_3_retiros",
    defaultTags: ["retiros", "protocolos", "hospitalidad", "anamnesis"],
  },
  {
    id: "commercial_ethical",
    vaultFolder: "Master_Sources/Commercial_Ethical",
    title: "Comercio Ético & Modelo de Negocio",
    description: "Políticas de precios, certificación de origen, acuerdos de distribución e Inî Rau E-Commerce.",
    icon: <ShoppingBag className="w-5 h-5 text-blue-400" />,
    suggestedSquad: "squad_4_vendas_mkt",
    defaultTags: ["comercio", "lotes", "precios", "e_commerce"],
  },
  {
    id: "corporate_squads",
    vaultFolder: "Master_Sources/Corporate_Squads",
    title: "Estructura Corporativa & Squads",
    description: "Organigramas, gobernanza del Instituto Mutum, contratos legales y centro de costos.",
    icon: <Building className="w-5 h-5 text-cyan-400" />,
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
        // Clean simple HTML
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
    <div className="bg-[#111622] border border-[#1e293b] rounded-2xl p-6 shadow-2xl text-slate-200">
      {/* Step Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className={step >= 1 ? "text-emerald-400 flex items-center gap-1" : ""}>
            1. Categoría
          </span>
          <span className={step >= 2 ? "text-emerald-400 flex items-center gap-1" : ""}>
            2. Metadatos
          </span>
          <span className={step >= 3 ? "text-emerald-400 flex items-center gap-1" : ""}>
            3. Contenido
          </span>
          <span className={step >= 4 ? "text-emerald-400 flex items-center gap-1" : ""}>
            4. Certificación
          </span>
          <span className={step >= 5 ? "text-emerald-400 flex items-center gap-1" : ""}>
            5. Ingestado
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-emerald-400" /> Paso 1: Selecciona el Eje Temático Maestro
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Escoge el eje temático para organizar correctamente el documento en el **Master Knowledge Vault**.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.id === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#162032] border-emerald-500 shadow-lg shadow-emerald-950/40"
                      : "bg-[#0b0f19] border-[#1e293b] hover:border-slate-700 hover:bg-[#111827]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 bg-[#1e293b] rounded-lg">{cat.icon}</div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <h4 className="font-semibold text-white text-base">{cat.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{cat.vaultFolder}</span>
                    <span className="text-emerald-400/80">{cat.suggestedSquad}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/40"
            >
              Siguiente: Metadatos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: METADATA */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-400" /> Paso 2: Metadatos de la Fuente Maestra
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Identifica la fuente y especifica el Squad custodio responsable de esta sabiduría.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                Título del Documento / Manual Maestro *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Libro Inî Rau: Filosofía y Protocolos Sagrados Mutum"
                className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Autor / Origen de la Fuente
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ej. Pajé Mutum, Dra. Ana Castro"
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Squad Custodio Responsable
                </label>
                <select
                  value={squad}
                  onChange={(e) => setSquad(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
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
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                Resumen Ejecutivo / Descripción Corta
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve explicación del propósito de este documento maestro y cómo debe ser usado por Nipëi OS..."
                className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Tags de Búsqueda (separados por coma)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vision, sagrado, mutum, botanica"
                className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
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
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/40"
            >
              Siguiente: Contenido <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONTENT */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-400" /> Paso 3: Carga del Contenido de la Fuente
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Proporciona el texto completo, extrae el contenido desde una URL o sube un archivo Markdown/Texto.
            </p>
          </div>

          {/* Content Method Selector */}
          <div className="flex gap-2 p-1 bg-[#0b0f19] border border-[#1e293b] rounded-xl w-fit">
            <button
              onClick={() => setContentMethod("text")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                contentMethod === "text"
                  ? "bg-[#1e293b] text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Pegar Texto / Markdown
            </button>
            <button
              onClick={() => setContentMethod("url")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                contentMethod === "url"
                  ? "bg-[#1e293b] text-cyan-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Extraer URL
            </button>
            <button
              onClick={() => setContentMethod("file")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                contentMethod === "file"
                  ? "bg-[#1e293b] text-purple-400 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Cargar Archivo
            </button>
          </div>

          {contentMethod === "url" && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/documento-maestro"
                className="flex-1 bg-[#0b0f19] border border-[#1e293b] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleFetchUrl}
                disabled={loadingUrl}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {loadingUrl ? "Obteniendo..." : "Extraer URL"}
              </button>
            </div>
          )}

          {contentMethod === "file" && (
            <div className="border-2 border-dashed border-[#1e293b] hover:border-slate-600 rounded-xl p-6 text-center bg-[#0b0f19]">
              <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-xs text-slate-300">Selecciona un archivo Markdown o Texto plano (.md, .txt)</p>
              <input
                type="file"
                accept=".md,.txt,.json"
                onChange={handleFileUpload}
                className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1e293b] file:text-purple-300 hover:file:bg-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Contenido de la Fuente * ({content.length} caracteres)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder="Pega aquí el contenido completo del documento maestro en formato Markdown..."
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
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
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/40"
            >
              Siguiente: Certificación <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ETHICAL CERTIFICATION */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> Paso 4: Certificación de Origen Ético & Gobernanza
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Verifica los controles de calidad y gobernanza para garantizar el cumplimiento del principio de **Cero Alucinación**.
            </p>
          </div>

          <div className="space-y-3 bg-[#0b0f19] border border-[#1e293b] rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-[#111827] rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={originAudited}
                onChange={(e) => setOriginAudited(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 rounded"
              />
              <div>
                <span className="font-semibold text-white text-sm">🟢 Origem Auditada e Verificada</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  La fuente proviene directamente de líderes autorizados del Núcleo o documentos corporativos oficiales.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-[#111827] rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={zeroHallucinationCompliant}
                onChange={(e) => setZeroHallucinationCompliant(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 rounded"
              />
              <div>
                <span className="font-semibold text-white text-sm">🟢 Conformidade Cero-Alucinação (RAG Strict)</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Este texto servirá como referencia estricta e inquebrantable para las respuestas de los Agentes de IA.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-[#111827] rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={aiCommunityApproved}
                onChange={(e) => setAiCommunityApproved(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 rounded"
              />
              <div>
                <span className="font-semibold text-white text-sm">🟢 Aprovado para Consulta Comunitária pelos Agentes</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Habilita a Hermes, Antigravity y Claude para consultar y resumir esta fuente cuando sea relevante.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-[#111827] rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={commercialVetoChecked}
                onChange={(e) => setCommercialVetoChecked(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-500 rounded"
              />
              <div>
                <span className="font-semibold text-white text-sm">🟢 Verificação de Veto Comercial e Respeito Éico</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  No transgrede los límites sagrados ni las cláusulas de privacidad corporativa.
                </p>
              </div>
            </label>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200">
              ⚠️ Error: {errorMessage}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-medium text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
            <button
              onClick={handleSaveMasterSource}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-extrabold px-8 py-3 rounded-xl transition-all shadow-xl shadow-emerald-950/50 text-sm disabled:opacity-50"
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
          <div className="w-16 h-16 bg-emerald-950/80 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/60">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">¡Fuente Maestra Ingestada con Éxito!</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              El documento fue procesado, firmado con checksum SHA256 y guardado en la estructura oficial de **Nipëi Vault**.
            </p>
          </div>

          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-4 max-w-xl mx-auto text-left text-xs font-mono space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Ruta Guardada:</span>
              <span className="text-emerald-400 font-bold">{submitResult.vaultPath}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Archivo:</span>
              <span className="text-slate-200">{submitResult.filename}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SHA256:</span>
              <span className="text-slate-400">{submitResult.sha256?.slice(0, 24)}...</span>
            </div>
          </div>

          {submitResult.aiDigest?.keyTakeaways?.length > 0 && (
            <div className="bg-[#162032] border border-emerald-900/60 rounded-xl p-4 max-w-xl mx-auto text-left">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> AI Digest Automático
              </h4>
              <ul className="space-y-1 text-xs text-slate-300">
                {submitResult.aiDigest.keyTakeaways.map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400">•</span> {t}
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
              className="bg-[#1e293b] hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all"
            >
              ➕ Ingestar Otra Fuente Maestra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
