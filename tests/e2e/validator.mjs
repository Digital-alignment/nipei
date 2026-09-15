/**
 * da-vault-schema Contract Validator for Nipëi OS E2E Tests
 * Replicates and enforces the exact contract rules from:
 * C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md
 * and C:\Users\ondig\Code\DA\command-center\scripts\vault-check.ts
 */

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const yaml = require("../../agent-os-nipei/source/node_modules/js-yaml");

export const TIPOS = ["cliente_externo", "producto_propio", "agencia_madre"];
export const ESTADOS_MARCA = ["activo", "transicion", "pausado", "archivado"];
export const RUBROS = ["ecommerce", "turismo_retiros", "comunidad_cultura", "producto_saas", "agencia"];
export const PRIORIDADES = ["urgente", "alta", "media", "baja"];
export const ESTADOS_TAREA = ["pendiente", "en_curso", "bloqueada", "esperando_cliente", "hecha"];
export const TIPOS_SERVICIO = ["wordpress", "hosting", "email", "elearning", "otro"];
export const ESTADOS_SERVICIO = ["configurado", "pendiente"];

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a markdown note's content against the da-vault-schema contract.
 * @param {string} content Raw markdown file content
 * @param {string} [filePath] Optional file path for context in error messages
 * @returns {{ valid: boolean, errors: string[], warnings: string[], data: Record<string, any> | null, body: string }}
 */
export function validateVaultNoteContent(content, filePath = "note.md") {
  const errors = [];
  const warnings = [];

  if (!content || typeof content !== "string") {
    return { valid: false, errors: ["Content is empty or not a string"], warnings: [], data: null, body: "" };
  }

  // Strip BOM
  const cleaned = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  // 1. Check Frontmatter presence
  if (!cleaned.startsWith("---")) {
    return {
      valid: false,
      errors: [`${filePath}: Missing starting YAML delimiter ('---') at start of file`],
      warnings: [],
      data: null,
      body: cleaned,
    };
  }

  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {
      valid: false,
      errors: [`${filePath}: Missing closing YAML delimiter ('---')`],
      warnings: [],
      data: null,
      body: cleaned,
    };
  }

  const yamlBlock = match[1];
  const body = cleaned.slice(match[0].length);

  let data = null;
  try {
    data = yaml.load(yamlBlock);
  } catch (err) {
    return {
      valid: false,
      errors: [`${filePath}: YAML parse error: ${err.message}`],
      warnings: [],
      data: null,
      body,
    };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      errors: [`${filePath}: YAML frontmatter is not a key-value mapping object`],
      warnings: [],
      data: null,
      body,
    };
  }

  // 2. Mandatory Fields: id & nombre
  if (!data.id || typeof data.id !== "string" || !data.id.trim()) {
    errors.push(`${filePath}: Missing mandatory root key 'id' (slug)`);
  } else {
    // Slug rules: lowercase with hyphens
    if (data.id !== data.id.toLowerCase() || /\s/.test(data.id)) {
      warnings.push(`${filePath}: id '${data.id}' should be a lowercase hyphenated slug`);
    }
  }

  if (!data.nombre || typeof data.nombre !== "string" || !data.nombre.trim()) {
    errors.push(`${filePath}: Missing mandatory root key 'nombre'`);
  }

  // 3. Enums Validation
  if (data.tipo && !TIPOS.includes(data.tipo)) {
    errors.push(`${filePath}: Invalid tipo '${data.tipo}'. Must be one of: ${TIPOS.join(", ")}`);
  }

  if (data.estado && !ESTADOS_MARCA.includes(data.estado)) {
    errors.push(`${filePath}: Invalid marca estado '${data.estado}'. Must be one of: ${ESTADOS_MARCA.join(", ")}`);
  }

  if (data.rubro && !RUBROS.includes(data.rubro)) {
    warnings.push(`${filePath}: Rubro '${data.rubro}' is not in closed enum taxonomy: ${RUBROS.join(", ")}`);
  }

  if (data.ultima_sync && !DATE_REGEX.test(data.ultima_sync)) {
    errors.push(`${filePath}: ultima_sync '${data.ultima_sync}' must match YYYY-MM-DD`);
  }

  // 4. Roadmap Sub-Type Validation
  if (data.roadmap) {
    if (!Array.isArray(data.roadmap)) {
      errors.push(`${filePath}: 'roadmap' must be a list`);
    } else {
      const seenIds = new Set();
      data.roadmap.forEach((item, index) => {
        const itemPrefix = `${filePath} roadmap[${index}]`;

        if (!item || typeof item !== "object") {
          errors.push(`${itemPrefix}: item must be an object`);
          return;
        }

        // id is mandatory
        if (!item.id || typeof item.id !== "string") {
          errors.push(`${itemPrefix}: missing 'id'`);
        } else {
          if (seenIds.has(item.id)) {
            errors.push(`${itemPrefix}: duplicate roadmap id '${item.id}'`);
          }
          seenIds.add(item.id);
        }

        // texto is mandatory
        if (!item.texto || typeof item.texto !== "string") {
          errors.push(`${itemPrefix}: missing 'texto' description`);
        }

        // prioridad enum
        if (item.prioridad && !PRIORIDADES.includes(item.prioridad)) {
          errors.push(`${itemPrefix}: invalid prioridad '${item.prioridad}'`);
        }

        // CRITICAL INVARIANT: hecho mandates state
        const hecho = Boolean(item.hecho);
        if (hecho) {
          if (item.estado && item.estado !== "hecha") {
            errors.push(
              `${itemPrefix}: task has hecho: true but specifies intermediate estado '${item.estado}' (invariant violation)`
            );
          }
          if (item.fecha_completado && !DATE_REGEX.test(item.fecha_completado)) {
            errors.push(`${itemPrefix}: fecha_completado '${item.fecha_completado}' must match YYYY-MM-DD`);
          }
        } else {
          if (item.estado && !ESTADOS_TAREA.includes(item.estado)) {
            errors.push(`${itemPrefix}: invalid estado '${item.estado}'`);
          }
        }

        if (item.fecha_limite && !DATE_REGEX.test(item.fecha_limite)) {
          errors.push(`${itemPrefix}: fecha_limite '${item.fecha_limite}' must match YYYY-MM-DD`);
        }
        if (item.fecha_creacion && !DATE_REGEX.test(item.fecha_creacion)) {
          errors.push(`${itemPrefix}: fecha_creacion '${item.fecha_creacion}' must match YYYY-MM-DD`);
        }
      });
    }
  }

  // 5. Servicios Sub-Type & Secret Protection
  if (data.servicios) {
    if (!Array.isArray(data.servicios)) {
      errors.push(`${filePath}: 'servicios' must be a list`);
    } else {
      data.servicios.forEach((svc, index) => {
        const svcPrefix = `${filePath} servicios[${index}]`;
        if (!svc || typeof svc !== "object") {
          errors.push(`${svcPrefix}: item must be an object`);
          return;
        }
        if (!svc.id || typeof svc.id !== "string") {
          errors.push(`${svcPrefix}: missing 'id'`);
        }
        if (svc.tipo && !TIPOS_SERVICIO.includes(svc.tipo)) {
          errors.push(`${svcPrefix}: invalid tipo '${svc.tipo}'`);
        }
        if (svc.estado && !ESTADOS_SERVICIO.includes(svc.estado)) {
          errors.push(`${svcPrefix}: invalid estado '${svc.estado}'`);
        }

        // Zero-secrets rule: never store raw passwords or tokens
        const forbiddenKeys = ["password", "pass", "token", "secret", "apiKey", "api_key", "contraseña", "clave"];
        for (const k of forbiddenKeys) {
          if (svc[k] !== undefined) {
            errors.push(`${svcPrefix}: contains forbidden plaintext secret key '${k}'. Use 'credencial_ref' instead.`);
          }
        }
      });
    }
  }

  // 6. Agent Watermark Convention in Body
  const firstLine = body.trimStart().split("\n")[0]?.trim() || "";
  const hasAgentWatermark =
    firstLine.includes("<!-- agente: antigravity -->") ||
    firstLine.includes("<!-- agente: claude-code -->") ||
    firstLine.includes("<!-- agente:");

  if (!hasAgentWatermark) {
    warnings.push(`${filePath}: Body does not start with an agent tag (<!-- agente: antigravity -->)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data,
    body,
  };
}
