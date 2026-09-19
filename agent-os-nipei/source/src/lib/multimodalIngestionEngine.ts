import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config, hermesHome } from "./config";
import { writeNote } from "./vault";
import { isWithinNipeiDomain } from "./nipeiDomainGuard";

const VAULT_ROOT = config.vaultRoot ?? "C:/Users/ondig/Code/Nipei/nipei-vault";

export type MediaType = "audio" | "pdf" | "image" | "video_link" | "text_omi";

export interface IngestionOptions {
  mediaType: MediaType;
  title: string;
  companySlug?: string;
  companyName?: string;
  squads?: string[];
  category?: string;
  author?: string;
  model?: string; // Custom model selector (e.g., google/gemini-2.5-flash, anthropic/claude-3.5-sonnet, z-ai/glm-5.2)
  videoUrl?: string;
  rawTextContent?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
}

export interface IngestionResult {
  success: boolean;
  notePath?: string;
  rawAssetPath?: string;
  title: string;
  summary: string;
  keyTakeaways: string[];
  actionItems: string[];
  extractedContent: string;
  modelUsed: string;
  error?: string;
}

// ── Key Helper: Read OpenRouter Key from active Hermes profile ──
function openRouterKey(): string | null {
  try {
    const active = (
      process.env.HERMES_PROFILE ||
      require("node:fs").readFileSync(path.join(hermesHome(), "active_profile"), "utf8").trim() ||
      "main"
    );
    const envFile = path.join(hermesHome(), "profiles", active, ".env");
    if (!require("node:fs").existsSync(envFile)) return process.env.OPENROUTER_API_KEY || null;
    const lines = require("node:fs").readFileSync(envFile, "utf8").split("\n");
    const found = lines.find((l: string) => l.startsWith("OPENROUTER_API_KEY="));
    if (found) return found.slice(19).replace(/^["']|["']$/g, "").trim();
  } catch { /* ignore */ }
  return process.env.OPENROUTER_API_KEY || null;
}

// ── Key Helper: LLM Completion Call ──
async function callLLM(
  system: string,
  userMessage: string | Array<any>,
  model: string = "google/gemini-2.5-flash",
  maxTokens: number = 3000
): Promise<string> {
  const apiKey = openRouterKey();
  if (!apiKey) {
    throw new Error("No OpenRouter API key found in active Hermes profile or environment.");
  }

  const messages: any[] = [{ role: "system", content: system }];

  if (typeof userMessage === "string") {
    messages.push({ role: "user", content: userMessage });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://nipei-os.local",
      "X-Title": "Nipei OS Multimodal Ingestion",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `LLM request failed with status ${res.status}`);
  }

  return json.choices?.[0]?.message?.content || "";
}

// ── Raw Asset Preservation ──
async function saveRawAsset(
  fileName: string,
  buffer: Buffer
): Promise<{ absPath: string; relPath: string }> {
  const dateStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const relPath = `Raw_Assets/${dateStr}/${Date.now()}_${safeName}`.replace(/\\/g, "/");
  const absPath = path.resolve(VAULT_ROOT, relPath);

  if (!isWithinNipeiDomain(absPath)) {
    throw new Error(`Security Violation: Raw asset target "${absPath}" is outside Nipëi OS domain.`);
  }

  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, buffer);
  return { absPath, relPath };
}

// ── Handlers for Multimodal Channels ──

// 1. IMAGE INTERPRETATION HANDLER (Vision LLM)
async function processImage(
  buffer: Buffer,
  fileName: string,
  mimeType: string = "image/png",
  selectedModel: string = "google/gemini-2.5-flash"
): Promise<{ text: string; summary: string }> {
  const base64Image = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64Image}`;

  const system = `You are an expert Vision Analysis Agent for Nipëi OS. 
Analyze the provided image thoroughly. 
1. Perform OCR if there is any visible text, diagrams, text boxes, or UI elements.
2. Describe the visual layout, objects, structural components, or diagrams.
3. Summarize the key message and insights represented by the image.
Provide your output in clear structured Markdown.`;

  const userContent = [
    { type: "text", text: `Please analyze this uploaded asset (${fileName}):` },
    { type: "image_url", image_url: { url: dataUri } },
  ];

  const analysis = await callLLM(system, userContent, selectedModel, 2500);
  return {
    text: analysis,
    summary: `Análisis de imagen realizado por ${selectedModel} sobre '${fileName}'.`,
  };
}

// 2. VIDEO LINK HANDLER (YouTube / Web Video Ingestion)
async function processVideoLink(
  videoUrl: string,
  selectedModel: string = "google/gemini-2.5-flash"
): Promise<{ text: string; summary: string }> {
  // Fetch video page HTML title and metadata if available
  let videoMeta = "";
  try {
    const res = await fetch(videoUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
      videoMeta = `Título detectado: ${titleMatch?.[1] || "Sin título"}\nDescripción: ${descMatch?.[1] || "Sin descripción"}`;
    }
  } catch {
    videoMeta = "No se pudo recuperar metadata directa del enlace web.";
  }

  const system = `You are an Information Extraction Agent for Nipëi OS. 
Analyze the video URL and available metadata provided.
Url: ${videoUrl}
Metadata: ${videoMeta}
Synthesize an overview, potential topic breakdown, key takeaways, and action items for this video resource.`;

  const analysis = await callLLM(system, `Video URL: ${videoUrl}\n\n${videoMeta}`, selectedModel, 2000);
  return {
    text: analysis,
    summary: `Procesamiento de enlace de video (${videoUrl}).`,
  };
}

// 3. AUDIO & OMI TRANSCRIPTION HANDLER
async function processAudioOrOmi(
  rawContentOrBuffer: string | Buffer,
  fileName: string,
  selectedModel: string = "google/gemini-2.5-flash"
): Promise<{ text: string; summary: string }> {
  let text = "";
  if (typeof rawContentOrBuffer === "string") {
    text = rawContentOrBuffer;
  } else {
    // If audio buffer, fallback to model-assisted text extraction/transcription description
    text = `[Audio file binary: ${fileName} (${rawContentOrBuffer.length} bytes)]`;
  }

  const system = `You are a Meeting & Speech Analyst for Nipëi OS. 
Given the transcript / audio content:
1. Extract all key points discussed.
2. Highlight decisions made, commitments, and assigned tasks.
3. Write a clean executive summary in Spanish.`;

  const analysis = await callLLM(system, `Audio / Transcripción de '${fileName}':\n\n${text}`, selectedModel, 2500);
  return {
    text: `${text}\n\n---\n\n## Análisis y Resumen Ejecutivo\n\n${analysis}`,
    summary: `Sintetizada transcripción de audio/Omi '${fileName}' usando ${selectedModel}.`,
  };
}

// 4. PDF & TEXT HANDLER
async function processDocument(
  bufferOrText: Buffer | string,
  fileName: string,
  selectedModel: string = "google/gemini-2.5-flash"
): Promise<{ text: string; summary: string }> {
  let content = "";
  if (typeof bufferOrText === "string") {
    content = bufferOrText;
  } else {
    // UTF-8 string conversion (for txt/md) or clean buffer text extraction
    content = bufferOrText.toString("utf8").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }

  const system = `You are a Technical Document Analyst for Nipëi OS. 
Analyze the document text provided, extract core concepts, outline key findings, and formulate structured takeaways.`;

  const analysis = await callLLM(system, `Documento '${fileName}':\n\n${content.slice(0, 12000)}`, selectedModel, 2500);
  return {
    text: analysis,
    summary: `Documento '${fileName}' analizado con éxito.`,
  };
}

// ── Main Multimodal Ingestion Orchestrator ──
export async function executeMultimodalIngestion(
  options: IngestionOptions
): Promise<IngestionResult> {
  try {
    const selectedModel = options.model || "google/gemini-2.5-flash";
    const title = (options.title || "Nota Ingestada").trim();
    const companySlug = options.companySlug?.trim() || "";
    const companyName = options.companyName?.trim() || companySlug;
    const category = options.category || (companySlug ? `Clientes/${companySlug}` : "Ingested_Knowledge/Multimodal");
    const squads = options.squads || ["squad_1_ceo"];
    const author = options.author || `Ingestion Agent (${selectedModel})`;

    let rawAssetRelPath = "";
    let extractedContent = "";
    let summaryText = "";

    // Save Raw Asset if buffer is provided
    if (options.fileBuffer && options.fileName) {
      const rawRes = await saveRawAsset(options.fileName, options.fileBuffer);
      rawAssetRelPath = rawRes.relPath;
    }

    // Route processing to appropriate media handler
    switch (options.mediaType) {
      case "image":
        if (!options.fileBuffer) throw new Error("Se requiere un archivo de imagen para procesamiento visual.");
        const imgRes = await processImage(options.fileBuffer, options.fileName || "image.png", options.mimeType, selectedModel);
        extractedContent = imgRes.text;
        summaryText = imgRes.summary;
        break;

      case "video_link":
        if (!options.videoUrl) throw new Error("Se requiere una URL de video válida.");
        const vidRes = await processVideoLink(options.videoUrl, selectedModel);
        extractedContent = vidRes.text;
        summaryText = vidRes.summary;
        break;

      case "audio":
      case "text_omi":
        const audioInput = options.fileBuffer || options.rawTextContent || "";
        const audioRes = await processAudioOrOmi(audioInput, options.fileName || title, selectedModel);
        extractedContent = audioRes.text;
        summaryText = audioRes.summary;
        break;

      case "pdf":
      default:
        const docInput = options.fileBuffer || options.rawTextContent || "";
        const docRes = await processDocument(docInput, options.fileName || title, selectedModel);
        extractedContent = docRes.text;
        summaryText = docRes.summary;
        break;
    }

    // Synthesize Markdown Note with Frontmatter
    const dateStr = new Date().toISOString().slice(0, 10);
    const titleSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const noteRelPath = `${category}/${dateStr}_${titleSlug}.md`.replace(/\\/g, "/");

    const yamlFrontmatter = `---
title: "${title}"
company: "${companySlug}"
company_name: "${companyName}"
category: "${category}"
media_type: "${options.mediaType}"
model_used: "${selectedModel}"
raw_asset_path: "${rawAssetRelPath}"
video_url: "${options.videoUrl || ""}"
created_at: "${new Date().toISOString()}"
author: "${author}"
squads: ${JSON.stringify(squads)}
---
<!-- agente: antigravity -->

# 📥 ${title}

> **Tipo de Ingesta:** \`${options.mediaType.toUpperCase()}\` | **Modelo Evaluador:** \`${selectedModel}\`
${rawAssetRelPath ? `> 📁 **Archivo Original Conservado:** [\`${rawAssetRelPath}\`](file:///${path.resolve(VAULT_ROOT, rawAssetRelPath).replace(/\\/g, "/")})` : ""}
${options.videoUrl ? `> 🎥 **Enlace de Video:** [${options.videoUrl}](${options.videoUrl})` : ""}

## 📝 Contenido e Interpretación Extraída

${extractedContent}

---
*Nota generada automáticamente por el Motor de Ingesta Multimodal de Nipëi OS el ${new Date().toLocaleString("es-ES")}*
`;

    // Save Note to Vault
    const saveResult = await writeNote(noteRelPath, yamlFrontmatter);
    if (!saveResult.success) {
      throw new Error(saveResult.error || "No se pudo escribir la nota en el Vault.");
    }

    return {
      success: true,
      notePath: noteRelPath,
      rawAssetPath: rawAssetRelPath,
      title,
      summary: summaryText,
      keyTakeaways: [],
      actionItems: [],
      extractedContent,
      modelUsed: selectedModel,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      title: options.title || "Ingesta Errónea",
      summary: "",
      keyTakeaways: [],
      actionItems: [],
      extractedContent: "",
      modelUsed: options.model || "unknown",
      error,
    };
  }
}
