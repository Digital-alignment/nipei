import fs from "node:fs/promises";
import path from "node:path";
import { config, hermesHome } from "./config";
import { writeNote } from "./vault";
import { isWithinNipeiDomain } from "./nipeiDomainGuard";
import { executeMultimodalIngestion, MediaType } from "./multimodalIngestionEngine";

const VAULT_ROOT = config.vaultRoot ?? "C:/Users/ondig/Code/Nipei/nipei-vault";

export type InboxIntent = "INFO_NOTE" | "TASK_CREATE" | "TASK_UPDATE" | "MULTIMEDIA" | "RAG_QUERY";

export interface InboxPayload {
  text?: string;
  mediaType?: MediaType;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  videoUrl?: string;
  sender?: string;
  companySlug?: string;
  companyName?: string;
  taskAction?: "auto" | "create_task" | "update_task" | "create_note";
  targetTaskId?: string;
  targetTaskStatus?: "todo" | "in_progress" | "done";
  routerModel?: string; // e.g., google/gemini-2.5-flash
  visionModel?: string; // e.g., google/gemini-2.5-flash
  audioModel?: string;  // e.g., google/gemini-2.5-flash
}

export interface InboxProcessResult {
  success: boolean;
  intent: InboxIntent;
  replyMessage: string;
  createdNotePath?: string;
  savedRawAssetPath?: string;
  taskCreatedOrUpdated?: boolean;
  modelUsed: {
    router: string;
    processor: string;
  };
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

// ── LLM Fast Router ──
async function classifyIntentWithHermesRouter(
  text: string,
  hasFile: boolean,
  hasVideoUrl: boolean,
  routerModel: string = "google/gemini-2.5-flash"
): Promise<{ intent: InboxIntent; title: string; summary: string }> {
  const apiKey = openRouterKey();
  if (!apiKey) {
    // Fallback classification if no API key present
    if (hasFile || hasVideoUrl) return { intent: "MULTIMEDIA", title: "Ingesta Multimodal Inbox", summary: text };
    if (/^\s*-\s*\[\s*\]|\btarea\b|\btodo\b/i.test(text)) return { intent: "TASK_CREATE", title: text.slice(0, 40), summary: text };
    return { intent: "INFO_NOTE", title: "Nota de Inbox", summary: text };
  }

  const system = `You are Hermes 2.0 Fast Router for Nipëi OS. 
Classify incoming messages from WhatsApp/Telegram/Inbox into one of these intents:
- "INFO_NOTE": Knowledge note or memory to save in Vault.
- "TASK_CREATE": Create a new actionable task/todo.
- "TASK_UPDATE": Update task status (mark done or in_progress).
- "MULTIMEDIA": Incoming audio, photo, PDF, or video link.
- "RAG_QUERY": Question asking for information from Vault.

Return ONLY a minified JSON object:
{"intent": "INFO_NOTE" | "TASK_CREATE" | "TASK_UPDATE" | "MULTIMEDIA" | "RAG_QUERY", "title": "short 4-7 word title", "summary": "clean summary"}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: routerModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Message: "${text}"\nHas Attached File: ${hasFile}\nHas Video URL: ${hasVideoUrl}` },
        ],
        temperature: 0.1,
      }),
    });

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      intent: parsed.intent || "INFO_NOTE",
      title: parsed.title || "Nota de Inbox",
      summary: parsed.summary || text,
    };
  } catch {
    return { intent: "INFO_NOTE", title: text.slice(0, 40) || "Nota de Inbox", summary: text };
  }
}

// ── Raw Asset Preservation ──
async function saveInboxRawAsset(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const relPath = `Raw_Assets/${dateStr}/Inbox_${Date.now()}_${safeName}`.replace(/\\/g, "/");
  const absPath = path.resolve(VAULT_ROOT, relPath);

  if (!isWithinNipeiDomain(absPath)) {
    throw new Error(`Security Violation: Path "${absPath}" is outside Nipëi OS domain.`);
  }

  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, buffer);
  return relPath;
}

// ── Main Inbox Payload Processor ──
export async function processInboxPayload(payload: InboxPayload): Promise<InboxProcessResult> {
  try {
    const text = (payload.text || "").trim();
    const sender = payload.sender || "WhatsApp User";
    const companySlug = payload.companySlug?.trim() || "";
    const companyName = payload.companyName?.trim() || companySlug;
    const routerModel = payload.routerModel || "google/gemini-2.5-flash";
    const visionModel = payload.visionModel || "google/gemini-2.5-flash";
    const audioModel = payload.audioModel || "google/gemini-2.5-flash";

    let rawAssetRelPath = "";
    if (payload.fileBuffer && payload.fileName) {
      rawAssetRelPath = await saveInboxRawAsset(payload.fileName, payload.fileBuffer);
    }

    // 1. Fast Intent Classification via Hermes Router
    const hasFile = Boolean(payload.fileBuffer);
    const hasVideoUrl = Boolean(payload.videoUrl);

    let classification = await classifyIntentWithHermesRouter(text, hasFile, hasVideoUrl, routerModel);

    // Override intent if explicit taskAction supplied
    if (payload.taskAction === "create_task") classification.intent = "TASK_CREATE";
    if (payload.taskAction === "update_task") classification.intent = "TASK_UPDATE";
    if (payload.mediaType && payload.mediaType !== "text_omi") classification.intent = "MULTIMEDIA";

    let replyMessage = "";
    let createdNotePath = "";
    let taskCreatedOrUpdated = false;

    // 2. Delegate handling based on intent
    if (classification.intent === "MULTIMEDIA" || payload.mediaType) {
      const mediaType: MediaType = payload.mediaType || (payload.videoUrl ? "video_link" : "pdf");
      const mmResult = await executeMultimodalIngestion({
        mediaType,
        title: classification.title || payload.fileName || "Ingesta Multimodal Inbox",
        companySlug,
        companyName,
        model: payload.fileBuffer && mediaType === "image" ? visionModel : audioModel,
        videoUrl: payload.videoUrl,
        rawTextContent: text,
        fileBuffer: payload.fileBuffer,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        author: `Nipëi Inbox Bot (${sender})`,
      });

      if (!mmResult.success) throw new Error(mmResult.error || "Falló la ingesta multimodal.");
      createdNotePath = mmResult.notePath || "";
      replyMessage = `✅ Hermes 2.0 procesó tu archivo '${payload.fileName || "multimedia"}' y generó la nota en Vault:\n\`${createdNotePath}\``;
    } else if (classification.intent === "TASK_CREATE" || classification.intent === "TASK_UPDATE") {
      // Create/Update Task in Vault Task List
      const dateStr = new Date().toISOString().slice(0, 10);
      const category = companySlug ? `Clientes/${companySlug}` : "Nipei OS/Inbox";
      const titleSlug = classification.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      createdNotePath = `${category}/Task_${dateStr}_${titleSlug}.md`.replace(/\\/g, "/");

      const taskStatus = payload.targetTaskStatus || (classification.intent === "TASK_UPDATE" ? "done" : "todo");
      const taskStatusCheckbox = taskStatus === "done" ? "[x]" : taskStatus === "in_progress" ? "[/]" : "[ ]";

      const taskNoteContent = `---
title: "Tarea Inbox: ${classification.title}"
company: "${companySlug}"
type: "task"
status: "${taskStatus}"
created_at: "${new Date().toISOString()}"
sender: "${sender}"
---
<!-- agente: antigravity -->

# 📌 Tarea: ${classification.title}

- ${taskStatusCheckbox} **${text || classification.title}** (Estado: \`${taskStatus.toUpperCase()}\`)

> **Enviado por:** ${sender} el ${new Date().toLocaleString("es-ES")}
${rawAssetRelPath ? `> 📁 **Adjunto:** [\`${rawAssetRelPath}\`](file:///${path.resolve(VAULT_ROOT, rawAssetRelPath).replace(/\\/g, "/")})` : ""}

## 📝 Detalles
${classification.summary}
`;

      const saveRes = await writeNote(createdNotePath, taskNoteContent);
      if (!saveRes.success) throw new Error(saveRes.error || "No se pudo guardar la tarea en Vault.");

      taskCreatedOrUpdated = true;
      replyMessage = `📌 Tarea registradada (${taskStatus.toUpperCase()}) en Vault:\n\`${createdNotePath}\``;
    } else {
      // General Info Note / Memory
      const dateStr = new Date().toISOString().slice(0, 10);
      const category = companySlug ? `Clientes/${companySlug}` : "Nipei OS/Inbox";
      const titleSlug = classification.title.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      createdNotePath = `${category}/Inbox_${dateStr}_${titleSlug}.md`.replace(/\\/g, "/");

      const noteContent = `---
title: "${classification.title}"
company: "${companySlug}"
type: "inbox_note"
created_at: "${new Date().toISOString()}"
sender: "${sender}"
---
<!-- agente: antigravity -->

# 📥 ${classification.title}

> **Origen:** Inbox Bot (${sender}) el ${new Date().toLocaleString("es-ES")}
${rawAssetRelPath ? `> 📁 **Archivo Original Conservado:** [\`${rawAssetRelPath}\`](file:///${path.resolve(VAULT_ROOT, rawAssetRelPath).replace(/\\/g, "/")})` : ""}

${text}

---
### ⚡ Resumen Hermes 2.0
${classification.summary}
`;

      const saveRes = await writeNote(createdNotePath, noteContent);
      if (!saveRes.success) throw new Error(saveRes.error || "No se pudo guardar la nota de inbox.");

      replyMessage = `📥 Nota de conocimiento guardada en Vault:\n\`${createdNotePath}\``;
    }

    return {
      success: true,
      intent: classification.intent,
      replyMessage,
      createdNotePath,
      savedRawAssetPath: rawAssetRelPath,
      taskCreatedOrUpdated,
      modelUsed: {
        router: routerModel,
        processor: visionModel,
      },
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      intent: "INFO_NOTE",
      replyMessage: `⚠️ Error al procesar inbox: ${error}`,
      modelUsed: {
        router: payload.routerModel || "unknown",
        processor: payload.visionModel || "unknown",
      },
      error,
    };
  }
}
