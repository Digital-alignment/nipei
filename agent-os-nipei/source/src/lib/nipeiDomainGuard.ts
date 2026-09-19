import path from "node:path";
import { config } from "./config";

/**
 * Nipëi OS Strict Domain Isolation & Security Guard
 * Enforces strict boundary rules for all current and future agents.
 */

export const NIPEI_CONTROL_ROOT = path.resolve("C:/Users/ondig/Code/Nipei/nipei-control");
export const NIPEI_VAULT_ROOT = config.vaultRoot
  ? path.resolve(config.vaultRoot)
  : path.resolve("C:/Users/ondig/Code/Nipei/nipei-vault");

export const ALLOWED_NIPEI_ROOTS = [
  NIPEI_CONTROL_ROOT,
  NIPEI_VAULT_ROOT,
  path.resolve("C:/Users/ondig/Code/Nipei"),
];

export const FORBIDDEN_PATH_PATTERNS = [
  "C:/Users/ondig/Code/DA",
  "C:\\Users\\ondig\\Code\\DA",
  "Desktop/DA",
  "Desktop\\DA",
];

export const NIPEI_STRICT_DOMAIN_RULE = `
🛡️ NIPEI OS STRICT DOMAIN ISOLATION MANDATE (OBLIGATORIA & PERMANENTE):
1. Todos los agentes de IA (actuales, futuros, Hermes, Antigravity, subagentes, motores RAG y de índice) operan EXCLUSIVAMENTE dentro del dominio de Nipëi OS:
   - Nipëi Control Center: C:\\Users\\ondig\\Code\\Nipei\\nipei-control
   - Nipëi Vault: C:\\Users\\ondig\\Code\\Nipei\\nipei-vault
2. Queda STRICTLY PROHIBIDO leer, indexar, consultar, ejecutar comandos o acceder a archivos en repositorios de clientes externos (ej. C:\\Users\\ondig\\Code\\DA\\<repo>).
3. Cada cliente externo utiliza exclusivamente su propio repositorio y clave SSH dedicada (ej. ~/.ssh/<slug>_vps). Está prohibido cruzar contextos de clientes externos desde el entorno de Nipëi OS.
4. Si se solicita información fuera del Vault de Nipëi, los agentes deben responder indicando un "Vacío de Ingesta / Fuera del Dominio Nipëi".
`.trim();

/**
 * Normalizes paths for cross-platform comparison
 */
function normalizePath(targetPath: string): string {
  return path.resolve(targetPath).replace(/\\/g, "/").toLowerCase();
}

/**
 * Verifies if a path belongs strictly to the allowed Nipëi OS domain.
 */
export function isWithinNipeiDomain(targetPath: string): boolean {
  if (!targetPath) return false;
  const normTarget = normalizePath(targetPath);

  // Check forbidden external client repository patterns first
  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (normTarget.includes(normalizePath(pattern))) {
      return false;
    }
  }

  // Check if inside allowed roots
  for (const root of ALLOWED_NIPEI_ROOTS) {
    const normRoot = normalizePath(root);
    if (normTarget === normRoot || normTarget.startsWith(normRoot + "/")) {
      return true;
    }
  }

  return false;
}

/**
 * Enforces domain path isolation. Throws error if path targets external repos.
 */
export function assertNipeiDomainPath(targetPath: string): string {
  if (!isWithinNipeiDomain(targetPath)) {
    throw new Error(
      `SECURITY VIOLATION: Access denied to "${targetPath}". Path is outside Nipëi OS domain boundaries.`
    );
  }
  return targetPath;
}
