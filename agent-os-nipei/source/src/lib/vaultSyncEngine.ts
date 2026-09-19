import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import * as yaml from "js-yaml";
import { config, defaultVault } from "./config";

// --- Enums and Invariants strictly following da-vault-schema ---
export type BrandTipo = "cliente_externo" | "producto_propio" | "agencia_madre";
export type BrandEstado = "activo" | "transicion" | "pausado" | "archivado";
export type BrandRubro = "ecommerce" | "turismo_retiros" | "comunidad_cultura" | "producto_saas" | "agencia";
export type Prioridad = "urgente" | "alta" | "media" | "baja";
export type TareaEstado = "pendiente" | "en_curso" | "bloqueada" | "esperando_cliente" | "hecha";
export type ServicioTipo = "wordpress" | "hosting" | "email" | "elearning" | "otro";
export type ServicioEstado = "configurado" | "pendiente";

export interface VaultProyecto {
  id?: string;
  nombre: string;
  estado?: string;
  objetivo?: string;
  tecnologias?: string[];
  presupuesto_aprox?: number | null;
}

export interface VaultRoadmapItem {
  id: string;
  texto: string;
  prioridad?: Prioridad;
  tags?: string[];
  orden?: number;
  hecho?: boolean;
  proyecto_id?: string;
  estado?: TareaEstado | string;
  fecha_limite?: string;
  responsable?: string;
  bloqueado_por?: string[];
  fecha_creacion?: string;
  fecha_completado?: string;
}

export interface VaultHistorialItem {
  fecha: string;
  texto: string;
  tags?: string[];
}

export interface VaultServicioItem {
  id: string;
  tipo: ServicioTipo;
  nombre: string;
  url?: string;
  usuario?: string;
  credencial_ref?: string;
  estado?: ServicioEstado;
}

export interface VaultNoteData {
  id: string;
  nombre: string;
  tipo?: BrandTipo;
  estado?: BrandEstado;
  emoji?: string;
  categoria?: string;
  rubro?: BrandRubro;
  dominio?: string;
  hosting?: string;
  repo_github?: string;
  repo_local?: string;
  stack?: string[];
  relaciones?: string[];
  servicios_vps?: string[];
  proyectos?: VaultProyecto[];
  roadmap?: VaultRoadmapItem[];
  historial?: VaultHistorialItem[];
  servicios?: VaultServicioItem[];
  canales_adquisicion?: string[];
  vacios_detectados?: string[];
  notebook_id?: string;
  reporte_md?: string;
  ultima_sync?: string;
  extra?: Record<string, unknown>;
  bodyMarkdown: string;
}

const KNOWN_FIELDS = new Set([
  "id",
  "nombre",
  "tipo",
  "estado",
  "emoji",
  "categoria",
  "rubro",
  "dominio",
  "hosting",
  "repo_github",
  "repo_local",
  "stack",
  "relaciones",
  "servicios_vps",
  "proyectos",
  "roadmap",
  "historial",
  "servicios",
  "canales_adquisicion",
  "vacios_detectados",
  "notebook_id",
  "reporte_md",
  "ultima_sync",
]);

// Lock key canonicalization: resolves absolute path and normalizes to lower case on Windows
export function getLockKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

// Concurrency mutex per canonical file path to prevent race conditions during writes
const fileLocks = new Map<string, Promise<unknown>>();
export function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = getLockKey(filePath);
  const current = fileLocks.get(key) || Promise.resolve();
  const next = current.then(fn, fn);
  fileLocks.set(key, next as Promise<unknown>);
  next.then(
    () => {
      if (fileLocks.get(key) === next) {
        fileLocks.delete(key);
      }
    },
    () => {
      if (fileLocks.get(key) === next) {
        fileLocks.delete(key);
      }
    }
  );
  return next;
}

/**
 * Detects transient filesystem error codes commonly caused by Windows file lock contention,
 * antivirus filter drivers, or delete-pending directory operations.
 */
export function isTransientFsError(code?: string): boolean {
  if (!code) return false;
  return (
    code === "EBUSY" ||
    code === "EPERM" ||
    code === "EACCES" ||
    code === "ENOENT" ||
    code === "EMFILE" ||
    code === "ENFILE"
  );
}

/**
 * Calculates exponential backoff with proportional jitter.
 */
export function calculateBackoffWithJitter(
  attempt: number,
  initialDelayMs = 25,
  maxDelayMs = 200
): number {
  const base = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
  // Jitter factor between 0.75 and 1.25 to prevent lock convoy synchronization
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.max(10, Math.floor(base * jitter));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads file with retry backoff to survive transient locks when other processes
 * are in the middle of atomic replacement or backup copy.
 */
export async function readFileWithRetry(filePath: string, maxRetries = 6): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fs.promises.readFile(filePath, "utf8");
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Replaces targetPath with tmpPath using an atomic rename loop with exponential backoff & jitter.
 * Falls back to copyFile with backoff retry if rename is blocked by OS security / cross-link policies.
 */
export async function atomicReplaceWithRetry(
  tmpPath: string,
  targetPath: string,
  maxRetries = 6
): Promise<void> {
  let lastErr: unknown = null;

  // Tier 1: Try atomic rename with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.rename(tmpPath, targetPath);
      return; // Atomic rename succeeded
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        break; // Fall through to Tier 2 copyFile fallback
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  // Tier 2: Windows fallback — copyFile with backoff retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await fs.promises.copyFile(tmpPath, targetPath);
      return; // Copy succeeded; tmpPath cleanup is guaranteed in caller finally block
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      if (!isTransientFsError(code) || attempt === maxRetries) {
        throw lastErr;
      }
      const delay = calculateBackoffWithJitter(attempt, 25, 200);
      await sleep(delay);
    }
  }

  throw lastErr;
}

/**
 * Resolves the root directory of the Digital Alignment Obsidian vault.
 */
export function resolveVaultRoot(overrideRoot?: string): string {
  if (overrideRoot && fs.existsSync(overrideRoot)) {
    return overrideRoot;
  }
  const root = config.vaultRoot || defaultVault();
  if (root && fs.existsSync(root)) {
    return root;
  }
  const fallbackCandidates = [
    "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault",
    process.env.AGENTIC_OS_VAULT,
    path.join(os.homedir(), "Documents", "Obsidian Vault"),
  ].filter(Boolean) as string[];

  for (const candidate of fallbackCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Return the dedicated Nipëi vault path
  return "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";
}

/**
 * Splits raw markdown content into YAML frontmatter object and body markdown.
 * Preserves the exact bytes of the body following the closing `---` line.
 */
export function splitFrontmatter(content: string): { data: Record<string, unknown>; body: string } | null {
  if (!content) return null;
  // Strip UTF-8 BOM if present
  const cleaned = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  if (!cleaned.startsWith("---")) {
    return null;
  }

  // Find the closing --- that starts on its own line
  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return null;
  }

  const yamlBlock = match[1];
  const bodyStartIndex = match[0].length;
  const body = cleaned.slice(bodyStartIndex);

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlBlock);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  return {
    data: parsed as Record<string, unknown>,
    body,
  };
}

/**
 * Resolves a note path relative to the vault root, checking Clientes, Productos, and exact paths.
 * Normalizes case-insensitively on Windows to the real disk casing via fs.realpathSync.native.
 */
export function resolveNotePath(relPath: string, customRoot?: string): string | null {
  const root = resolveVaultRoot(customRoot);
  const normalized = relPath.replace(/\\/g, "/").trim();

  // If absolute path was passed
  if (path.isAbsolute(relPath)) {
    if (fs.existsSync(relPath)) {
      try {
        return fs.realpathSync.native(relPath);
      } catch {
        return relPath;
      }
    }
  }

  const candidates = [
    path.join(root, normalized),
    path.join(root, `${normalized}.md`),
    path.join(root, "Clientes", normalized),
    path.join(root, "Clientes", `${normalized}.md`),
    path.join(root, "Productos", normalized),
    path.join(root, "Productos", `${normalized}.md`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.realpathSync.native(candidate);
      } catch {
        return candidate;
      }
    }
  }

  // Case-insensitive search in Clientes and Productos
  const searchFolders = [path.join(root, "Clientes"), path.join(root, "Productos")];
  const targetName = path.basename(normalized).replace(/\.md$/i, "").toLowerCase();

  for (const folder of searchFolders) {
    if (!fs.existsSync(folder)) continue;
    try {
      const files = fs.readdirSync(folder);
      for (const file of files) {
        if (file.toLowerCase().endsWith(".md")) {
          const base = path.basename(file).replace(/\.md$/i, "").toLowerCase();
          if (base === targetName) {
            const foundPath = path.join(folder, file);
            try {
              return fs.realpathSync.native(foundPath);
            } catch {
              return foundPath;
            }
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return null;
}

/**
 * Reads and parses a vault note into structured VaultNoteData adhering to da-vault-schema.
 */
export async function readVaultNote(noteRelativePath: string, customRoot?: string): Promise<VaultNoteData | null> {
  const notePath = resolveNotePath(noteRelativePath, customRoot);
  if (!notePath) {
    return null;
  }

  let content = "";
  let split: { data: Record<string, unknown>; body: string } | null = null;

  for (let attempt = 0; attempt <= 6; attempt++) {
    try {
      content = await readFileWithRetry(notePath, 6);
      if (content.length > 0) {
        split = splitFrontmatter(content);
        if (split && split.data && split.data.id && split.data.nombre) {
          break;
        }
        if (attempt < 6) {
          await sleep(calculateBackoffWithJitter(attempt, 25, 200));
          continue;
        }
      } else {
        if (attempt < 6) {
          await sleep(calculateBackoffWithJitter(attempt, 25, 200));
          continue;
        }
      }
    } catch {
      if (attempt < 6) {
        await sleep(calculateBackoffWithJitter(attempt, 25, 200));
        continue;
      }
      return null;
    }
  }

  if (!split) {
    return null;
  }

  const raw = split.data;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const nombre = typeof raw.nombre === "string" ? raw.nombre.trim() : "";

  // Strictly adhere to da-vault-schema: without id and nombre, the brand note is discarded
  if (!id || !nombre) {
    return null;
  }

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_FIELDS.has(key)) {
      extra[key] = value;
    }
  }

  // Ensure task invariant on roadmap items
  const roadmap: VaultRoadmapItem[] = Array.isArray(raw.roadmap)
    ? (raw.roadmap as Array<Record<string, unknown>>).map((item) => {
        const hecho = Boolean(item.hecho);
        const itemCopy: VaultRoadmapItem = {
          id: String(item.id || ""),
          texto: String(item.texto || ""),
          prioridad: (item.prioridad as Prioridad) || "media",
          hecho,
        };

        if (Array.isArray(item.tags)) {
          itemCopy.tags = item.tags.map(String);
        }
        if (typeof item.orden === "number") {
          itemCopy.orden = item.orden;
        }
        if (typeof item.proyecto_id === "string") {
          itemCopy.proyecto_id = item.proyecto_id;
        }
        if (typeof item.fecha_limite === "string") {
          itemCopy.fecha_limite = item.fecha_limite;
        }
        if (typeof item.responsable === "string") {
          itemCopy.responsable = item.responsable;
        }
        if (Array.isArray(item.bloqueado_por)) {
          itemCopy.bloqueado_por = item.bloqueado_por.map(String);
        }
        if (typeof item.fecha_creacion === "string") {
          itemCopy.fecha_creacion = item.fecha_creacion;
        }
        if (typeof item.fecha_completado === "string") {
          itemCopy.fecha_completado = item.fecha_completado;
        }

        // Invariant: if hecho: true, strip intermediate estado or set to "hecha"
        if (!hecho && typeof item.estado === "string") {
          itemCopy.estado = item.estado as TareaEstado;
        }

        return itemCopy;
      })
    : [];

  const noteData: VaultNoteData = {
    id,
    nombre,
    tipo: (raw.tipo as BrandTipo) || "cliente_externo",
    estado: (raw.estado as BrandEstado) || "activo",
    emoji: typeof raw.emoji === "string" ? raw.emoji : undefined,
    categoria: typeof raw.categoria === "string" ? raw.categoria : undefined,
    rubro: (raw.rubro as BrandRubro) || undefined,
    dominio: typeof raw.dominio === "string" ? raw.dominio : undefined,
    hosting: typeof raw.hosting === "string" ? raw.hosting : undefined,
    repo_github: typeof raw.repo_github === "string" ? raw.repo_github : undefined,
    repo_local: typeof raw.repo_local === "string" ? raw.repo_local : undefined,
    stack: Array.isArray(raw.stack) ? raw.stack.map(String) : undefined,
    relaciones: Array.isArray(raw.relaciones) ? raw.relaciones.map(String) : undefined,
    servicios_vps: Array.isArray(raw.servicios_vps) ? raw.servicios_vps.map(String) : undefined,
    proyectos: Array.isArray(raw.proyectos) ? (raw.proyectos as VaultProyecto[]) : undefined,
    roadmap,
    historial: Array.isArray(raw.historial) ? (raw.historial as VaultHistorialItem[]) : undefined,
    servicios: Array.isArray(raw.servicios) ? (raw.servicios as VaultServicioItem[]) : undefined,
    canales_adquisicion: Array.isArray(raw.canales_adquisicion) ? raw.canales_adquisicion.map(String) : undefined,
    vacios_detectados: Array.isArray(raw.vacios_detectados) ? raw.vacios_detectados.map(String) : undefined,
    notebook_id: typeof raw.notebook_id === "string" ? raw.notebook_id : undefined,
    reporte_md: typeof raw.reporte_md === "string" ? raw.reporte_md : undefined,
    ultima_sync: typeof raw.ultima_sync === "string" ? raw.ultima_sync : undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
    bodyMarkdown: split.body,
  };

  return noteData;
}

/**
 * Sanitizes and enforces closed enums and task invariants for saving to the Obsidian vault.
 */
function sanitizeForVault(
  existingFrontmatter: Record<string, unknown>,
  update: Partial<VaultNoteData>
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...existingFrontmatter,
    ...(update.extra || {}),
  };

  if (update.id) merged.id = String(update.id).trim().toLowerCase();
  if (update.nombre) merged.nombre = String(update.nombre).trim();
  if (update.tipo) merged.tipo = update.tipo;
  if (update.estado) merged.estado = update.estado;
  if (update.emoji !== undefined) merged.emoji = update.emoji;
  if (update.categoria !== undefined) merged.categoria = update.categoria;
  if (update.rubro !== undefined) merged.rubro = update.rubro;
  if (update.dominio !== undefined) merged.dominio = update.dominio;
  if (update.hosting !== undefined) merged.hosting = update.hosting;
  if (update.repo_github !== undefined) merged.repo_github = update.repo_github;
  if (update.repo_local !== undefined) merged.repo_local = update.repo_local;
  if (update.stack !== undefined) merged.stack = update.stack;
  if (update.relaciones !== undefined) merged.relaciones = update.relaciones;
  if (update.servicios_vps !== undefined) merged.servicios_vps = update.servicios_vps;
  if (update.canales_adquisicion !== undefined) merged.canales_adquisicion = update.canales_adquisicion;
  if (update.vacios_detectados !== undefined) merged.vacios_detectados = update.vacios_detectados;
  if (update.notebook_id !== undefined) merged.notebook_id = update.notebook_id;
  if (update.reporte_md !== undefined) merged.reporte_md = update.reporte_md;

  if (update.proyectos !== undefined) {
    merged.proyectos = update.proyectos.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      nombre: p.nombre,
      ...(p.estado ? { estado: p.estado } : {}),
      ...(p.objetivo ? { objetivo: p.objetivo } : {}),
      ...(p.tecnologias ? { tecnologias: p.tecnologias } : {}),
      ...(p.presupuesto_aprox !== undefined ? { presupuesto_aprox: p.presupuesto_aprox } : {}),
    }));
  }

  if (update.roadmap !== undefined) {
    merged.roadmap = update.roadmap.map((item) => {
      const hecho = Boolean(item.hecho);
      const cleanItem: Record<string, unknown> = {
        id: item.id,
        texto: item.texto,
        ...(item.prioridad ? { prioridad: item.prioridad } : {}),
        ...(item.tags && item.tags.length ? { tags: item.tags } : {}),
        ...(item.orden !== undefined ? { orden: item.orden } : {}),
        hecho,
      };

      if (item.proyecto_id) cleanItem.proyecto_id = item.proyecto_id;
      if (item.fecha_limite) cleanItem.fecha_limite = item.fecha_limite;
      if (item.responsable) cleanItem.responsable = item.responsable;
      if (item.bloqueado_por && item.bloqueado_por.length) cleanItem.bloqueado_por = item.bloqueado_por;
      if (item.fecha_creacion) cleanItem.fecha_creacion = item.fecha_creacion;

      // Invariant: hecho: true strips intermediate estado or sets it to 'hecha'; intermediate estado is forbidden
      if (hecho) {
        cleanItem.fecha_completado = item.fecha_completado || new Date().toISOString().slice(0, 10);
        delete cleanItem.estado;
      } else {
        delete cleanItem.fecha_completado;
        if (item.estado && item.estado !== "hecha") {
          cleanItem.estado = item.estado;
        }
      }

      return cleanItem;
    });
  }

  if (update.historial !== undefined) {
    merged.historial = update.historial;
  }

  // Sanitize servicios and strip plaintext secrets
  const incomingServicios = update.servicios !== undefined ? update.servicios : merged.servicios;
  if (Array.isArray(incomingServicios)) {
    merged.servicios = (incomingServicios as Array<Record<string, unknown>>).map((s) => {
      const { password, pass, token, secret, apiKey, api_key, contraseña, clave, ...safe } = s;
      const cleanService: Record<string, unknown> = {
        id: safe.id,
        tipo: safe.tipo,
        nombre: safe.nombre,
      };
      if (safe.url) cleanService.url = safe.url;
      if (safe.usuario) cleanService.usuario = safe.usuario;
      if (safe.credencial_ref) cleanService.credencial_ref = safe.credencial_ref;
      if (safe.estado) cleanService.estado = safe.estado;
      return cleanService;
    });
  }

  // Stamp today's date for ultima_sync
  merged.ultima_sync = new Date().toISOString().slice(0, 10);

  // Invariant: bodyMarkdown must never be persisted in YAML frontmatter
  delete merged.bodyMarkdown;

  return merged;
}

/**
 * Ensures the body markdown has the required <!-- agente: antigravity --> watermark as the first line.
 */
function ensureAgentWatermark(body: string, defaultTitle?: string): string {
  const trimmed = body.replace(/^\r?\n+/, "");
  if (trimmed.startsWith("<!-- agente: antigravity -->") || trimmed.startsWith("<!-- agente: claude-code -->")) {
    return trimmed;
  }

  if (!trimmed.trim()) {
    return `<!-- agente: antigravity -->\n\n# ${defaultTitle || "Nota Viva"}\n`;
  }

  return `<!-- agente: antigravity -->\n\n${trimmed}`;
}

/**
 * Writes data back to a vault note atomically using .tmp and rename, preserving body markdown.
 */
export async function writeVaultNote(
  noteRelativePath: string,
  data: Partial<VaultNoteData>,
  customRoot?: string
): Promise<{ success: boolean; error?: string; filePath?: string }> {
  const root = resolveVaultRoot(customRoot);
  let targetPath = resolveNotePath(noteRelativePath, customRoot);

  if (!targetPath) {
    const folder = data.tipo === "producto_propio" ? "Productos" : "Clientes";
    const folderPath = path.join(root, folder);
    if (!fs.existsSync(folderPath)) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }

    let normalized = noteRelativePath.replace(/\\/g, "/").trim();
    if (!normalized.toLowerCase().endsWith(".md")) {
      normalized = `${normalized}.md`;
    }
    if (normalized.includes("/")) {
      targetPath = path.join(root, normalized);
    } else {
      const baseName = data.nombre || data.id || path.basename(normalized, ".md");
      targetPath = path.join(folderPath, `${baseName}.md`);
    }
  }

  // Normalize targetPath on disk if file already exists
  if (fs.existsSync(targetPath)) {
    try {
      targetPath = fs.realpathSync.native(targetPath);
    } catch {
      // Keep targetPath as is
    }
  }

  // Serialize writes to the same canonical file path using mutex
  return withFileLock(targetPath, async () => {
    try {
      let existingFrontmatter: Record<string, unknown> = {};
      let existingBody = "";

      if (fs.existsSync(targetPath)) {
        let content = "";
        let split: { data: Record<string, unknown>; body: string } | null = null;

        for (let attempt = 0; attempt <= 6; attempt++) {
          try {
            content = await readFileWithRetry(targetPath, 6);
            if (content.length > 0) {
              split = splitFrontmatter(content);
              if (split) {
                break;
              }
              if (attempt < 6) {
                await sleep(calculateBackoffWithJitter(attempt, 25, 200));
                continue;
              }
            } else {
              if (attempt < 6) {
                await sleep(calculateBackoffWithJitter(attempt, 25, 200));
                continue;
              }
            }
          } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (!isTransientFsError(code) || attempt === 6) {
              throw err;
            }
            await sleep(calculateBackoffWithJitter(attempt, 25, 200));
          }
        }

        if (split) {
          existingFrontmatter = split.data;
          existingBody = split.body;
        } else if (content) {
          existingBody = content;
        }
      }

      // Prepare frontmatter
      const sanitizedFrontmatter = sanitizeForVault(existingFrontmatter, data);

      if (!sanitizedFrontmatter.id) {
        sanitizedFrontmatter.id = (data.id || path.basename(targetPath, ".md").toLowerCase()).replace(/\s+/g, "-");
      }
      if (!sanitizedFrontmatter.nombre) {
        sanitizedFrontmatter.nombre = data.nombre || path.basename(targetPath, ".md");
      }

      // Format YAML block
      const yamlString = yaml.dump(sanitizedFrontmatter, {
        lineWidth: 120,
        noRefs: true,
        quotingType: '"',
      });

      // Prepare body: if caller provided new body, use it, else keep existing
      const chosenBody = data.bodyMarkdown !== undefined ? data.bodyMarkdown : existingBody;
      const finalBody = ensureAgentWatermark(chosenBody, String(sanitizedFrontmatter.nombre));

      // Combine frontmatter and body byte-for-byte; blank line between YAML delimiter and watermark
      const fullContent = `---\n${yamlString}---\n\n${finalBody.replace(/^\r?\n+/, "")}`;

      // Ensure directory exists
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      // Atomic write: write to unique .tmp, backup to .bak if target exists, then rename
      const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
      const bakPath = `${targetPath}.bak`;

      try {
        await fs.promises.writeFile(tmpPath, fullContent, "utf8");

        if (fs.existsSync(targetPath)) {
          try {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                await fs.promises.copyFile(targetPath, bakPath);
                break;
              } catch (bErr: unknown) {
                const code = (bErr as { code?: string })?.code;
                if (!isTransientFsError(code) || attempt === 2) break;
                await sleep(calculateBackoffWithJitter(attempt, 20, 80));
              }
            }
          } catch {
            // Backup failure non-fatal
          }
        }

        await atomicReplaceWithRetry(tmpPath, targetPath, 6);

        return { success: true, filePath: targetPath };
      } finally {
        try {
          if (fs.existsSync(tmpPath)) {
            await fs.promises.unlink(tmpPath).catch(() => {});
          }
        } catch {
          // Ignore unlink errors in finally
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });
}

/**
 * Scans Clientes/ (and optionally Productos/) to parse all valid brand notes into VaultNoteData[].
 * Strictly filters out support notes (starting with _) and notes without id/nombre.
 */
export async function parseAllClients(customRoot?: string): Promise<VaultNoteData[]> {
  const root = resolveVaultRoot(customRoot);
  const clientsDir = path.join(root, "Clientes");

  if (!fs.existsSync(clientsDir)) {
    return [];
  }

  const results: VaultNoteData[] = [];

  try {
    const entries = await fs.promises.readdir(clientsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      // Skip reserved support notes like _Ecosistema.md and _Infraestructura.md
      if (entry.name.startsWith("_")) continue;

      const fullPath = path.join(clientsDir, entry.name);
      try {
        const note = await readVaultNote(fullPath, customRoot);
        if (note && note.id && note.nombre) {
          results.push(note);
        }
      } catch {
        // Degrade silently on malformed notes as required by da-vault-schema
      }
    }
  } catch {
    return [];
  }

  return results;
}

/**
 * Factory creating an instance of VaultEngine bound to a specific vault root directory.
 */
export interface VaultEngine {
  getVaultRoot(): string;
  readVaultNote(relPath: string): Promise<VaultNoteData | null>;
  writeVaultNote(relPath: string, data: Partial<VaultNoteData>): Promise<{ success: boolean; filePath?: string; error?: string }>;
  parseAllClients(): Promise<VaultNoteData[]>;
  resolveNotePath(relPath: string): string | null;
  splitFrontmatter(content: string): { data: Record<string, unknown>; body: string } | null;
}

export function createVaultEngine(customVaultRoot?: string): VaultEngine {
  return {
    getVaultRoot: () => resolveVaultRoot(customVaultRoot),
    readVaultNote: (relPath: string) => readVaultNote(relPath, customVaultRoot),
    writeVaultNote: (relPath: string, data: Partial<VaultNoteData>) => writeVaultNote(relPath, data, customVaultRoot),
    parseAllClients: () => parseAllClients(customVaultRoot),
    resolveNotePath: (relPath: string) => resolveNotePath(relPath, customVaultRoot),
    splitFrontmatter: (content: string) => splitFrontmatter(content),
  };
}
