"use client";

import React, { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (notePath: string) => void;
  defaultCompanySlug?: string;
  defaultCompanyName?: string;
}

const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Rápido / Visión)" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Frontier Razonamiento)" },
  { id: "z-ai/glm-5.2", name: "GLM 5.2 (Ultra-contexto Coder)" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B (Open-Weights)" },
  { id: "nousresearch/hermes-4-70b", name: "Hermes 4 70B (Orquestador OS)" },
];

export function MultimodalIngestionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultCompanySlug = "",
  defaultCompanyName = "",
}: Props) {
  const [mediaType, setMediaType] = useState<"audio" | "pdf" | "image" | "video_link" | "text_omi">("pdf");
  const [title, setTitle] = useState("");
  const [companySlug, setCompanySlug] = useState(defaultCompanySlug);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [videoUrl, setVideoUrl] = useState("");
  const [rawTextContent, setRawTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("mediaType", mediaType);
      formData.append("title", title || (file ? file.name : "Ingesta Multimodal"));
      formData.append("companySlug", companySlug);
      formData.append("companyName", companyName || companySlug);
      formData.append("model", selectedModel);

      if (videoUrl) formData.append("videoUrl", videoUrl);
      if (rawTextContent) formData.append("rawTextContent", rawTextContent);
      if (file) formData.append("file", file);

      const res = await fetch("/api/ingest/multimodal", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Error al procesar la ingesta multimodal.");
      }

      setResult(json);
      if (onSuccess && json.notePath) {
        onSuccess(json.notePath);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-emerald-500/30 bg-neutral-900 p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-400">
            <span>📥</span> Motor de Ingesta Multimodal Instantánea
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div className="my-6 space-y-4">
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4">
              <h3 className="font-semibold text-emerald-300">¡Ingesta Completada con Éxito!</h3>
              <p className="mt-1 text-sm text-neutral-300">
                Se ha generado la nota estructurada en <code className="text-emerald-400">{result.notePath}</code>
              </p>
              {result.rawAssetPath && (
                <p className="mt-1 text-xs text-neutral-400">
                  📁 Archivo original conservado en: <code className="text-emerald-300">{result.rawAssetPath}</code>
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-400">Modelo utilizado: {result.modelUsed}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResult(null)}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
              >
                Subir Otro Archivo
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">
                ⚠️ {error}
              </div>
            )}

            {/* Media Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Tipo de Entrada Multimodal
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "pdf", label: "📄 Doc / PDF" },
                  { id: "image", label: "🖼️ Imagen (OCR)" },
                  { id: "audio", label: "🎙️ Audio / Voz" },
                  { id: "video_link", label: "🎥 Video Link" },
                  { id: "text_omi", label: "📝 Texto / Omi" },
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setMediaType(type.id as any)}
                    className={`rounded-lg border p-2 text-xs font-medium transition ${
                      mediaType === type.id
                        ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                        : "border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Modelo Evaluador / Visión / IA
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title & Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Título de la Nota / Ingesta
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Minuta Reunión Estratégica"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Empresa / Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                  placeholder="Ej. muv-grafica"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Input Dynamic Fields */}
            {mediaType === "video_link" ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  URL del Video (YouTube / Enlace Público)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            ) : mediaType === "text_omi" ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Texto o Transcripción Omi
                </label>
                <textarea
                  rows={4}
                  value={rawTextContent}
                  onChange={(e) => setRawTextContent(e.target.value)}
                  placeholder="Pega la transcripción o notas escritas aquí..."
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2.5 text-sm text-neutral-200 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Archivo Adjunto ({mediaType.toUpperCase()})
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept={
                    mediaType === "image"
                      ? "image/*"
                      : mediaType === "audio"
                      ? "audio/*"
                      : ".pdf,.doc,.docx,.txt,.md"
                  }
                  className="w-full cursor-pointer rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-300 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-600"
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <span>📥</span> Ingestar al Vault
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
