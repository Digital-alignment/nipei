import fs from "fs";
import path from "path";
import { writeTarefa } from "./tarefaNote";
import { defaultVault } from "./config";
import type { TaskAttachment, TaskDeliverable, TaskCommunication, AttachmentType, DeliverableFormat, SquadId } from "./nipeiStore";

export interface TaskWorkspaceInfo {
  relativeRoot: string;
  absoluteRoot: string;
  inputsDir: string;
  deliverablesDir: string;
  metaFilePath: string;
}

// Normalize Squad ID to clean directory naming
export function normalizeSquadFolder(squadId?: string): string {
  if (!squadId) return "SQ-Geral";
  const map: Record<string, string> = {
    squad_1_ceo: "SQ-01_CEO",
    squad_2_mutum: "SQ-02_Mutum",
    squad_3_retiros: "SQ-03_Retiros",
    squad_4_vendas_mkt: "SQ-04_Vendas",
    squad_5_adm_legal: "SQ-05_Adm_Legal",
    squad_6_infra: "SQ-06_Infra",
    squad_7_instituto: "SQ-07_Instituto",
    squad_8_fundraising: "SQ-08_Fundraising",
    squad_9_internacional: "SQ-09_Internacional",
    squad_10_biofarmacia: "SQ-10_Biofarmacia",
    squad_vb_knowledge: "SQ-VB_Knowledge",
    super_user: "SQ-00_SuperUser",
  };
  return map[squadId.toLowerCase()] || `SQ-${squadId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

// Sanitize string to safe directory or file slug
export function sanitizeSlug(text: string, maxLength: number = 32): string {
  if (!text) return "sem_titulo";
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return slug.slice(0, maxLength) || "item";
}

// Detect attachment category based on filename and mimeType
export function detectAttachmentType(fileName: string, mimeType?: string): AttachmentType {
  const ext = path.extname(fileName).toLowerCase();

  const imageExts = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".bmp", ".ico"];
  if (imageExts.includes(ext) || mimeType?.startsWith("image/")) return "image";

  const spreadsheetExts = [".csv", ".xlsx", ".xls", ".ods", ".tsv"];
  if (spreadsheetExts.includes(ext) || mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv")) {
    return "spreadsheet";
  }

  const docExts = [".pdf", ".docx", ".doc", ".txt", ".md", ".rtf", ".odt", ".pptx"];
  if (docExts.includes(ext) || mimeType?.startsWith("text/") || mimeType?.includes("pdf") || mimeType?.includes("word")) {
    return "document";
  }

  return "document";
}

// Find existing task workspace anywhere in Task_Workspace by taskId
export function findExistingWorkspace(vaultRoot: string, taskId: string): TaskWorkspaceInfo | null {
  const root = path.join(vaultRoot, "Task_Workspace");
  if (!fs.existsSync(root)) return null;

  const cleanId = sanitizeSlug(taskId, 20);
  try {
    const years = fs.readdirSync(root);
    for (const year of years) {
      const yearDir = path.join(root, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;

      const squads = fs.readdirSync(yearDir);
      for (const sq of squads) {
        const squadDir = path.join(yearDir, sq);
        if (!fs.statSync(squadDir).isDirectory()) continue;

        const taskDirs = fs.readdirSync(squadDir);
        for (const t of taskDirs) {
          if (t === cleanId || t.startsWith(`${cleanId}_`)) {
            const absoluteRoot = path.join(squadDir, t);
            const relativeRoot = path.posix.join("Task_Workspace", year, sq, t);
            const inputsDir = path.join(absoluteRoot, "inputs");
            const deliverablesDir = path.join(absoluteRoot, "deliverables");
            const metaFilePath = path.join(absoluteRoot, "_workspace_meta.json");
            return {
              relativeRoot,
              absoluteRoot,
              inputsDir,
              deliverablesDir,
              metaFilePath,
            };
          }
        }
      }
    }
  } catch (err) {
    console.error("Error finding existing workspace:", err);
  }
  return null;
}

// Get or initialize the task's dedicated workspace directory
export function getTaskWorkspace(taskId: string, squadId?: string, taskTitle?: string): TaskWorkspaceInfo {
  const vaultRoot = defaultVault() || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

  // First, check if workspace already exists for this taskId
  const existing = findExistingWorkspace(vaultRoot, taskId);
  if (existing) {
    return existing;
  }

  const year = new Date().getFullYear().toString();
  const squadFolder = normalizeSquadFolder(squadId);
  const cleanId = sanitizeSlug(taskId, 20);
  const cleanTitle = sanitizeSlug(taskTitle || "", 28);
  const taskFolder = cleanTitle ? `${cleanId}_${cleanTitle}` : cleanId;

  const relativeRoot = path.posix.join("Task_Workspace", year, squadFolder, taskFolder);
  const absoluteRoot = path.join(vaultRoot, "Task_Workspace", year, squadFolder, taskFolder);
  const inputsDir = path.join(absoluteRoot, "inputs");
  const deliverablesDir = path.join(absoluteRoot, "deliverables");
  const metaFilePath = path.join(absoluteRoot, "_workspace_meta.json");

  // Ensure directories exist
  try {
    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir, { recursive: true });
    }
    if (!fs.existsSync(deliverablesDir)) {
      fs.mkdirSync(deliverablesDir, { recursive: true });
    }
  } catch (err) {
    console.error("Error creating task workspace directory:", err);
  }

  return {
    relativeRoot,
    absoluteRoot,
    inputsDir,
    deliverablesDir,
    metaFilePath,
  };
}

interface WorkspaceMetaStore {
  taskId: string;
  squadId?: string;
  taskTitle?: string;
  createdAt: string;
  updatedAt: string;
  attachments: TaskAttachment[];
  deliverables: TaskDeliverable[];
  communications?: TaskCommunication[];
  executionLogs?: string[];
}

function readMetaStore(metaFilePath: string, taskId: string, squadId?: string, taskTitle?: string): WorkspaceMetaStore {
  if (fs.existsSync(metaFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
      return {
        taskId,
        squadId: squadId || data.squadId,
        taskTitle: taskTitle || data.taskTitle,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
        communications: Array.isArray(data.communications) ? data.communications : [],
        executionLogs: Array.isArray(data.executionLogs) ? data.executionLogs : [],
      };
    } catch {
      /* ignore and create fresh */
    }
  }
  return {
    taskId,
    squadId,
    taskTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    deliverables: [],
    communications: [],
  };
}

function writeMetaStore(metaFilePath: string, store: WorkspaceMetaStore) {
  try {
    fs.writeFileSync(metaFilePath, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing workspace meta file:", err);
  }
}

// Save uploaded binary file into the task's inputs folder
export async function saveTaskAttachmentFile(
  taskId: string,
  squadId: string | undefined,
  taskTitle: string | undefined,
  fileBuffer: Buffer,
  originalFileName: string,
  mimeType: string,
  uploadedBy: string = "@usuario",
  notes?: string
): Promise<TaskAttachment> {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const ext = path.extname(originalFileName);
  const baseName = path.basename(originalFileName, ext);
  const safeName = `${sanitizeSlug(baseName, 40)}_${Date.now().toString().slice(-4)}${ext.toLowerCase()}`;

  const destPath = path.join(ws.inputsDir, safeName);
  fs.writeFileSync(destPath, fileBuffer);

  const relativeFilePath = path.posix.join(ws.relativeRoot, "inputs", safeName);
  const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const type = detectAttachmentType(safeName, mimeType);

  const attachment: TaskAttachment = {
    id: attachmentId,
    name: originalFileName,
    type,
    mimeType,
    sizeBytes: fileBuffer.length,
    url: `/api/agent-kanban/attachments?path=${encodeURIComponent(relativeFilePath)}`,
    vaultRelativePath: relativeFilePath,
    uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    uploadedBy,
    notes,
  };

  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);
  store.attachments = [attachment, ...store.attachments.filter((a) => a.id !== attachmentId)];
  writeMetaStore(ws.metaFilePath, store);

  return attachment;
}

// Register external URL link or Obsidian Vault Note reference
export function registerTaskLinkOrNote(
  taskId: string,
  squadId: string | undefined,
  taskTitle: string | undefined,
  name: string,
  targetUrlOrNote: string,
  type: "link" | "vault_note",
  uploadedBy: string = "@usuario",
  notes?: string
): TaskAttachment {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const attachmentId = `att-link-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const attachment: TaskAttachment = {
    id: attachmentId,
    name: name.trim() || (type === "vault_note" ? `Nota: ${targetUrlOrNote}` : targetUrlOrNote),
    type,
    mimeType: type === "vault_note" ? "text/markdown" : "text/uri-list",
    url: targetUrlOrNote.trim(),
    vaultRelativePath: type === "vault_note" ? targetUrlOrNote.trim() : undefined,
    uploadedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    uploadedBy,
    notes,
  };

  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);
  store.attachments = [attachment, ...store.attachments.filter((a) => a.id !== attachmentId)];
  writeMetaStore(ws.metaFilePath, store);

  return attachment;
}

// Save an AI generated deliverable into deliverables/
export function saveTaskDeliverableFile(
  taskId: string,
  squadId: string | undefined,
  taskTitle: string | undefined,
  title: string,
  format: DeliverableFormat,
  contentMarkdown: string,
  generatedByAgent: string = "@hermes"
): TaskDeliverable {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const ext = format === "csv_data" ? ".csv" : ".md";
  const safeFileName = `${sanitizeSlug(title, 40)}_${new Date().toISOString().slice(0, 10)}${ext}`;
  const destPath = path.join(ws.deliverablesDir, safeFileName);

  fs.writeFileSync(destPath, contentMarkdown, "utf-8");

  const relativeFilePath = path.posix.join(ws.relativeRoot, "deliverables", safeFileName);
  const deliverableId = `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);
  const existingVersion = store.deliverables.filter((d) => d.title.toLowerCase() === title.toLowerCase()).length;

  const deliverable: TaskDeliverable = {
    id: deliverableId,
    title,
    format,
    fileName: safeFileName,
    vaultRelativePath: relativeFilePath,
    contentMarkdown,
    generatedByAgent,
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    version: existingVersion + 1,
  };

  store.deliverables = [deliverable, ...store.deliverables.filter((d) => d.id !== deliverableId)];
  writeMetaStore(ws.metaFilePath, store);

  return deliverable;
}

// Record an outbound communication (WhatsApp, Email, Webhook)
export function recordTaskCommunication(
  taskId: string,
  squadId: string | undefined,
  taskTitle: string | undefined,
  comm: Omit<TaskCommunication, "id" | "timestamp">
): TaskCommunication {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const commId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullComm: TaskCommunication = {
    ...comm,
    id: commId,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
  };

  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);
  store.communications = [fullComm, ...(store.communications || []).filter((c) => c.id !== commId)];
  writeMetaStore(ws.metaFilePath, store);

  return fullComm;
}

// Append agent CLI execution log lines to the task workspace meta
export function recordTaskExecutionLogs(
  taskId: string,
  squadId: string | undefined,
  taskTitle: string | undefined,
  lines: string[]
): string[] {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);
  // ponytail: keeps the last 500 lines per task; move to a per-run log file if full history matters
  store.executionLogs = [...(store.executionLogs || []), ...lines].slice(-500);
  writeMetaStore(ws.metaFilePath, store);
  return store.executionLogs;
}

// Load workspace items (attachments & deliverables & communications) for a task
export function getTaskWorkspaceData(
  taskId: string,
  squadId?: string,
  taskTitle?: string
): { attachments: TaskAttachment[]; deliverables: TaskDeliverable[]; communications: TaskCommunication[]; executionLogs: string[]; workspacePath: string } {
  const ws = getTaskWorkspace(taskId, squadId, taskTitle);
  const store = readMetaStore(ws.metaFilePath, taskId, squadId, taskTitle);

  // Sync any files manually dropped into inputs/ if not yet in store
  try {
    if (fs.existsSync(ws.inputsDir)) {
      const files = fs.readdirSync(ws.inputsDir);
      for (const f of files) {
        const relativeFilePath = path.posix.join(ws.relativeRoot, "inputs", f);
        if (!store.attachments.some((a) => a.vaultRelativePath === relativeFilePath)) {
          const stat = fs.statSync(path.join(ws.inputsDir, f));
          if (stat.isFile()) {
            store.attachments.push({
              id: `att-fs-${Date.now()}-${sanitizeSlug(f, 10)}`,
              name: f,
              type: detectAttachmentType(f),
              sizeBytes: stat.size,
              url: `/api/agent-kanban/attachments?path=${encodeURIComponent(relativeFilePath)}`,
              vaultRelativePath: relativeFilePath,
              uploadedAt: stat.mtime.toISOString().replace("T", " ").slice(0, 16),
              uploadedBy: "Sistema / Obsidian Vault",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading inputs directory:", err);
  }

  return {
    attachments: store.attachments,
    deliverables: store.deliverables,
    communications: store.communications || [],
    executionLogs: store.executionLogs || [],
    workspacePath: ws.relativeRoot,
  };
}

// Update the task's Obsidian markdown note frontmatter with references if vaultPath exists
export function syncTaskFrontmatterWithWorkspace(
  vaultPath: string | undefined,
  attachments: TaskAttachment[],
  deliverables: TaskDeliverable[]
) {
  if (!vaultPath) return;
  const vaultRoot = defaultVault() || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";
  const absPath = path.isAbsolute(vaultPath) ? vaultPath : path.join(vaultRoot, vaultPath);

  if (!fs.existsSync(absPath)) return;

  try {
    // Task notes are only written through lib/tarefaNote (format + activity + sync).
    writeTarefa(vaultRoot, path.relative(vaultRoot, absPath), "workspace v1", (d) => {
      d.fm.anexos = attachments.map((a) => ({ id: a.id, nome: a.name, tipo: a.type, path: a.vaultRelativePath || a.url }));
      d.fm.entregaveis = deliverables.map((x) => ({ id: x.id, titulo: x.title, formato: x.format, path: x.vaultRelativePath }));
    });
  } catch (err) {
    console.error("Error syncing task frontmatter with workspace:", err);
  }
}
