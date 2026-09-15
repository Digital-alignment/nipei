/**
 * Reference Test Engine and Adapter for Nipëi OS E2E Tests
 * Implements the opaque-box functional interfaces for:
 * - Agent Task Management & Kanban operations
 * - Vault Synchronization Engine operations
 * - Cross-feature synchronization bridges
 * - Company Intake submission & persistence
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("../../agent-os-nipei/source/node_modules/js-yaml");

export const VALID_TASK_STATUSES = ["backlog", "in_progress", "review", "done"];
export const VALID_AGENTS = ["claude", "openclaw", "hermes", "custom"];
export const VALID_PRIORITIES = ["urgente", "alta", "media", "baja"];

const fileLocks = new Map();
function withFileLock(filePath, fn) {
  const current = fileLocks.get(filePath) || Promise.resolve();
  const next = current.then(fn, fn);
  fileLocks.set(filePath, next);
  return next;
}

/**
 * Task Store Factory (manages local agent-tasks.json state)
 */
export function createTaskStore(stateDir) {
  const storeFilePath = path.join(stateDir, "agent-tasks.json");
  let writeQueue = Promise.resolve();

  async function loadTasks() {
    if (!fs.existsSync(storeFilePath)) {
      return [];
    }
    try {
      const data = await fs.promises.readFile(storeFilePath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async function saveTasks(tasks) {
    writeQueue = writeQueue.then(async () => {
      const tmpPath = `${storeFilePath}.tmp`;
      const json = JSON.stringify(tasks, null, 2);
      await fs.promises.writeFile(tmpPath, json, "utf8");
      await fs.promises.rename(tmpPath, storeFilePath);
    });
    await writeQueue;
  }

  return {
    getStorePath() {
      return storeFilePath;
    },

    async createTask(data) {
      if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
        throw new Error("Task title is required");
      }
      const tasks = await loadTasks();
      const now = new Date().toISOString();
      const id = data.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      const status = data.status || "backlog";
      if (!VALID_TASK_STATUSES.includes(status)) {
        throw new Error(`Invalid status '${status}'. Must be one of: ${VALID_TASK_STATUSES.join(", ")}`);
      }

      const priority = data.priority || "media";
      if (!VALID_PRIORITIES.includes(priority)) {
        throw new Error(`Invalid priority '${priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
      }

      const assignedAgent = data.assignedAgent || "claude";
      if (!VALID_AGENTS.includes(assignedAgent)) {
        throw new Error(`Invalid assignedAgent '${assignedAgent}'. Must be one of: ${VALID_AGENTS.join(", ")}`);
      }

      const task = {
        id,
        title: data.title.trim(),
        description: data.description || "",
        status,
        priority,
        assignedAgent,
        customBinaryPath: data.customBinaryPath,
        tags: Array.isArray(data.tags) ? data.tags : [],
        clientNoteId: data.clientNoteId,
        vaultRoadmapId: data.vaultRoadmapId,
        executionLogs: Array.isArray(data.executionLogs) ? data.executionLogs : [],
        createdAt: data.createdAt || now,
        updatedAt: now,
      };

      tasks.push(task);
      await saveTasks(tasks);
      return task;
    },

    async getTask(id) {
      const tasks = await loadTasks();
      return tasks.find((t) => t.id === id) || null;
    },

    async listTasks(filters = {}) {
      let tasks = await loadTasks();

      if (filters.status) {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      if (filters.assignedAgent) {
        tasks = tasks.filter((t) => t.assignedAgent === filters.assignedAgent);
      }
      if (filters.priority) {
        tasks = tasks.filter((t) => t.priority === filters.priority);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
        );
      }

      // Sort
      if (filters.sortBy === "priority") {
        const priorityWeight = { urgente: 4, alta: 3, media: 2, baja: 1 };
        tasks.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
      } else if (filters.sortBy === "createdAt") {
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return tasks;
    },

    async updateTask(id, patch) {
      const tasks = await loadTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error(`Task with id '${id}' not found`);
      }

      if (patch.status && !VALID_TASK_STATUSES.includes(patch.status)) {
        throw new Error(`Invalid status '${patch.status}'`);
      }
      if (patch.priority && !VALID_PRIORITIES.includes(patch.priority)) {
        throw new Error(`Invalid priority '${patch.priority}'`);
      }
      if (patch.assignedAgent && !VALID_AGENTS.includes(patch.assignedAgent)) {
        throw new Error(`Invalid assignedAgent '${patch.assignedAgent}'`);
      }

      const updated = {
        ...tasks[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      tasks[index] = updated;
      await saveTasks(tasks);
      return updated;
    },

    async deleteTask(id) {
      const tasks = await loadTasks();
      const filtered = tasks.filter((t) => t.id !== id);
      const deleted = tasks.length !== filtered.length;
      if (deleted) {
        await saveTasks(filtered);
      }
      return deleted;
    },

    async appendLog(id, logEntry) {
      const tasks = await loadTasks();
      const task = tasks.find((t) => t.id === id);
      if (!task) {
        throw new Error(`Task '${id}' not found`);
      }

      const log = {
        timestamp: logEntry.timestamp || new Date().toISOString(),
        message: logEntry.message || "",
        level: logEntry.level || "info",
      };

      if (!task.executionLogs) {
        task.executionLogs = [];
      }
      task.executionLogs.push(log);
      task.updatedAt = new Date().toISOString();

      await saveTasks(tasks);
      return task;
    },

    async moveTaskStatus(id, newStatus) {
      return this.updateTask(id, { status: newStatus });
    },
  };
}

/**
 * Vault Engine Factory (operates directly on a given vault root directory)
 */
export function createVaultEngine(vaultRoot) {
  function splitFrontmatter(raw) {
    if (!raw) return null;
    const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    if (!cleaned.startsWith("---")) return null;

    const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return null;

    let data;
    try {
      data = yaml.load(match[1]);
    } catch {
      return null;
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) return null;

    return {
      data,
      body: cleaned.slice(match[0].length),
    };
  }

  function resolvePath(relPath) {
    const normalized = relPath.replace(/\\/g, "/").trim();
    const directPath = path.join(vaultRoot, normalized);
    if (fs.existsSync(directPath)) return directPath;

    const candidates = [
      path.join(vaultRoot, `${normalized}.md`),
      path.join(vaultRoot, "Clientes", normalized),
      path.join(vaultRoot, "Clientes", `${normalized}.md`),
      path.join(vaultRoot, "Productos", normalized),
      path.join(vaultRoot, "Productos", `${normalized}.md`),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  return {
    getVaultRoot() {
      return vaultRoot;
    },

    async readVaultNote(relPath) {
      const fullPath = resolvePath(relPath);
      if (!fullPath) return null;

      const raw = await fs.promises.readFile(fullPath, "utf8");
      const split = splitFrontmatter(raw);
      if (!split) return null;

      const { data, body } = split;
      if (!data.id || !data.nombre) return null;

      return {
        ...data,
        tipo: data.tipo || "cliente_externo",
        estado: data.estado || "activo",
        bodyMarkdown: body,
      };
    },

    async writeVaultNote(relPath, data) {
      let targetPath = resolvePath(relPath);
      let existingData = {};
      let existingBody = "";

      const folder = data.tipo === "producto_propio" ? "Productos" : "Clientes";
      const dir = path.join(vaultRoot, folder);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      if (!targetPath || !fs.existsSync(targetPath)) {
        let fileName = relPath.replace(/\\/g, "/");
        if (!fileName.endsWith(".md")) fileName += ".md";
        const baseName = path.basename(fileName);
        targetPath = path.join(dir, baseName);
      }

      // Mutex per target file path to guarantee safe concurrency on Windows
      return withFileLock(targetPath, async () => {
        if (fs.existsSync(targetPath)) {
          const raw = await fs.promises.readFile(targetPath, "utf8");
          const split = splitFrontmatter(raw);
          if (split) {
            existingData = split.data;
            existingBody = split.body;
          } else {
            existingBody = raw;
          }
        }

        // Merge and enforce da-vault-schema invariants
        const merged = { ...existingData, ...data };

        // Ensure id & nombre
        if (!merged.id) merged.id = (data.id || path.basename(targetPath, ".md")).toLowerCase().replace(/\s+/g, "-");
        if (!merged.nombre) merged.nombre = data.nombre || path.basename(targetPath, ".md");

        // Invariant: Roadmap item feito strips intermediate estado
        if (Array.isArray(merged.roadmap)) {
          merged.roadmap = merged.roadmap.map((item) => {
            const hecho = Boolean(item.hecho);
            const clean = { ...item, hecho };
            if (hecho) {
              delete clean.estado;
              if (!clean.fecha_completado) {
                clean.fecha_completado = new Date().toISOString().slice(0, 10);
              }
            }
            return clean;
          });
        }

        // Invariant: no plaintext secrets in servicios
        if (Array.isArray(merged.servicios)) {
          merged.servicios = merged.servicios.map((s) => {
            const { password, pass, token, secret, apiKey, api_key, ...safe } = s;
            return safe;
          });
        }

        merged.ultima_sync = new Date().toISOString().slice(0, 10);

        delete merged.bodyMarkdown;

        const yamlBlock = yaml.dump(merged, { lineWidth: 120, noRefs: true, quotingType: '"' });

        // Body handling: preserve or set default with watermark
        let chosenBody = data.bodyMarkdown !== undefined ? data.bodyMarkdown : existingBody;
        const trimmed = chosenBody.trimStart();
        if (!trimmed.startsWith("<!-- agente: antigravity -->") && !trimmed.startsWith("<!-- agente: claude-code -->")) {
          chosenBody = `<!-- agente: antigravity -->\n\n${trimmed || `# ${merged.nombre}\n`}`;
        }

        const fullContent = `---\n${yamlBlock}---\n\n${chosenBody.replace(/^\r?\n+/, "")}`;

        // Atomic write with retry and Windows fallback
        const tmpPath = `${targetPath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
        const bakPath = `${targetPath}.bak`;
        await fs.promises.writeFile(tmpPath, fullContent, "utf8");
        if (fs.existsSync(targetPath)) {
          try {
            await fs.promises.copyFile(targetPath, bakPath);
          } catch {
            // ignore backup err
          }
        }

        try {
          await fs.promises.rename(tmpPath, targetPath);
        } catch {
          // Windows lock fallback
          await fs.promises.copyFile(tmpPath, targetPath);
          await fs.promises.unlink(tmpPath).catch(() => {});
        }

        return { success: true, filePath: targetPath };
      });
    },

    async parseAllClients() {
      const clientsDir = path.join(vaultRoot, "Clientes");
      if (!fs.existsSync(clientsDir)) return [];

      const results = [];
      const files = await fs.promises.readdir(clientsDir);
      for (const file of files) {
        if (!file.endsWith(".md") || file.startsWith("_")) continue;
        const note = await this.readVaultNote(path.join("Clientes", file));
        if (note) results.push(note);
      }
      return results;
    },
  };
}

/**
 * Bidirectional Synchronizer (bridges AgentTask store and Obsidian vault roadmap items)
 */
export async function syncTaskWithVault(task, vaultEngine) {
  if (!task.clientNoteId) {
    return { synced: false, reason: "No clientNoteId attached to task" };
  }

  return withFileLock(`sync-${task.clientNoteId}`, async () => {
    const note = await vaultEngine.readVaultNote(task.clientNoteId);
    if (!note) {
      return { synced: false, reason: `Vault note '${task.clientNoteId}' not found` };
    }

    const roadmap = Array.isArray(note.roadmap) ? [...note.roadmap] : [];
    const roadmapId = task.vaultRoadmapId || task.id.replace(/^task-/, "");

    const existingIdx = roadmap.findIndex((item) => item.id === roadmapId);
    const isDone = task.status === "done";
    const today = new Date().toISOString().slice(0, 10);

    if (existingIdx >= 0) {
      const item = { ...roadmap[existingIdx] };
      item.hecho = isDone;
      if (isDone) {
        delete item.estado;
        item.fecha_completado = today;
      } else {
        delete item.fecha_completado;
        item.estado = task.status === "in_progress" ? "en_curso" : task.status === "review" ? "bloqueada" : "pendiente";
      }
      item.prioridad = task.priority;
      item.responsable = `@${task.assignedAgent}`;
      roadmap[existingIdx] = item;
    } else {
      const newItem = {
        id: roadmapId,
        texto: task.title,
        prioridad: task.priority,
        hecho: isDone,
        orden: roadmap.length,
        tags: task.tags || [],
        responsable: `@${task.assignedAgent}`,
        fecha_creacion: today,
      };
      if (isDone) {
        newItem.fecha_completado = today;
      } else {
        newItem.estado = task.status === "in_progress" ? "en_curso" : task.status === "review" ? "bloqueada" : "pendiente";
      }
      roadmap.push(newItem);
    }

    await vaultEngine.writeVaultNote(task.clientNoteId, { roadmap });
    return { synced: true, roadmapId, noteId: task.clientNoteId };
  });
}

/**
 * Company Intake Submission Handler
 */
export async function submitCompanyIntake(payload, vaultEngine, stateDir) {
  const { company, squads, roles, services, financials, instructions } = payload;
  if (!company || !company.id || !company.nombre) {
    throw new Error("Intake payload must include company.id and company.nombre");
  }

  const targetNotePath = `Clientes/${company.id}.md`;

  const frontmatter = {
    id: company.id,
    nombre: company.nombre,
    tipo: company.tipo || "cliente_externo",
    estado: company.estado || "activo",
    emoji: company.emoji,
    categoria: company.categoria,
    rubro: company.rubro,
    dominio: company.dominio,
    hosting: company.hosting,
    stack: company.stack || [],
    relaciones: company.relaciones || [],
    servicios: services || [],
    extra: {
      squads: squads || [],
      roles: roles || [],
      financials: financials || {},
      agentInstructions: instructions || {},
    },
  };

  const bodyMarkdown = `<!-- agente: antigravity -->

# ${company.nombre} ${company.emoji || ""}
- **Categoria**: ${company.categoria || ""}
- **Estado**: 🟢 ${company.estado || "Activo"}
- **Dominio**: ${company.dominio || "N/A"}
- **Hosting**: ${company.hosting || "N/A"}

## Estrutura Operacional (Duplo Núcleo)
${(squads || []).map((s) => `- **${s.name}** (${s.nucleus}): Liderado por ${s.lead}`).join("\n")}

## Regras e Diretrizes dos Agentes
${(instructions?.rules || []).map((r) => `- ${r}`).join("\n")}
`;

  const writeResult = await vaultEngine.writeVaultNote(targetNotePath, {
    ...frontmatter,
    bodyMarkdown,
  });

  // Save local configuration update in stateDir
  const configPath = path.join(stateDir, "config.json");
  const localConfig = {
    lastIntake: {
      companyId: company.id,
      timestamp: new Date().toISOString(),
    },
    systemPrompt: instructions?.systemPrompt,
  };
  await fs.promises.writeFile(configPath, JSON.stringify(localConfig, null, 2), "utf8");

  const createdNote = await vaultEngine.readVaultNote(targetNotePath);
  return {
    success: true,
    filePath: writeResult.filePath,
    note: createdNote,
  };
}
