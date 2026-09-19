import path from "node:path";
import fs from "node:fs/promises";
import { ensureVaultIndex, getAllIndexedDocuments, VaultIndexedDocument } from "./vaultIndex";
import { writeNote, VAULT_ROOT } from "./vault";
import { isWithinNipeiDomain } from "./nipeiDomainGuard";
import { hermesHome } from "./config";

export interface VaultAuditItem {
  id: string;
  type: "contradiction" | "stale_note" | "expired_date" | "duplicate_spec";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedPaths: string[];
  squad?: string;
  companySlug?: string;
  suggestion: string;
}

export interface VaultAuditReport {
  success: boolean;
  auditDate: string;
  healthScore: number; // 0 to 100
  scannedNotesCount: number;
  criticalCount: number;
  warningCount: number;
  staleNotesCount: number;
  reportNotePath?: string;
  items: VaultAuditItem[];
  error?: string;
}

export interface AuditOptions {
  companySlug?: string;
  maxAgeDays?: number;
  model?: string;
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

// ── Call LLM for Contradiction Detection ──
async function detectContradictionsWithLLM(
  docs: VaultIndexedDocument[],
  selectedModel: string = "google/gemini-2.5-flash"
): Promise<VaultAuditItem[]> {
  const apiKey = openRouterKey();
  if (!apiKey || docs.length < 2) return [];

  // Prepare lightweight document summaries for contradiction analysis
  const docSummaries = docs.slice(0, 15).map((d) => ({
    path: d.relPath,
    title: d.title,
    company: d.companySlug || "general",
    snippet: d.snippet.slice(0, 300),
    headers: d.headers,
  }));

  const system = `You are an AI Auditor for Nipëi OS Knowledge Management.
Analyze the provided document summaries and detect potential contradictions, conflicting roadmap dates, opposite technical choices, or overlapping duplicate specs between documents.

Return ONLY a minified JSON array of findings (no prose, no markdown fences).
Each object schema:
{
  "title": "short title of contradiction",
  "description": "explanation of conflict",
  "affectedPaths": ["path1.md", "path2.md"],
  "severity": "critical" | "warning",
  "suggestion": "how to resolve"
}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(docSummaries) },
        ],
        temperature: 0.2,
      }),
    });

    const json = await res.json();
    const rawText = json.choices?.[0]?.message?.content || "";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed)) {
      return parsed.map((item: any, idx: number) => ({
        id: `conflict_${Date.now()}_${idx}`,
        type: "contradiction",
        severity: item.severity === "critical" ? "critical" : "warning",
        title: item.title || "Contradicción Semántica Detectada",
        description: item.description || "Se han encontrado afirmaciones potencialmente contradictorias.",
        affectedPaths: Array.isArray(item.affectedPaths) ? item.affectedPaths : [],
        suggestion: item.suggestion || "Revisar ambas notas y actualizar la hoja de ruta oficial.",
      }));
    }
  } catch {
    /* fallback gracefully if LLM scan fails or returns unparseable json */
  }

  return [];
}

// ── Main Audit Engine ──
export async function runVaultAudit(options: AuditOptions = {}): Promise<VaultAuditReport> {
  try {
    const maxAgeDays = options.maxAgeDays || 60;
    const selectedModel = options.model || "google/gemini-2.5-flash";
    const companyFilter = options.companySlug?.toLowerCase() || null;

    // 1. Ensure vault index is warm
    let docs = await getAllIndexedDocuments();

    // Filter by company if specified
    if (companyFilter) {
      docs = docs.filter(
        (d) =>
          d.companySlug?.toLowerCase() === companyFilter ||
          d.relPath.toLowerCase().includes(`clientes/${companyFilter}`)
      );
    }

    const items: VaultAuditItem[] = [];
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    let staleCount = 0;
    let expiredDateCount = 0;

    // 2. Scan for Stale Notes & Expired Commitments
    docs.forEach((doc) => {
      const ageMs = now - doc.mtime;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

      // Flag Stale Notes
      if (ageMs > maxAgeMs) {
        staleCount++;
        items.push({
          id: `stale_${doc.relPath}`,
          type: "stale_note",
          severity: ageDays > 90 ? "critical" : "warning",
          title: `Nota Obsoleta: '${doc.title}' (${ageDays} días sin modificar)`,
          description: `Esta nota no ha recibido actualizaciones desde hace ${ageDays} días. Podría contener especificaciones o listas de tareas desactualizadas.`,
          affectedPaths: [doc.relPath],
          companySlug: doc.companySlug,
          suggestion: "Revisar si la información sigue vigente o archivar la nota.",
        });
      }

      // Flag Past/Expired Dates in text
      const dateMatches = doc.lowerContent.match(/\b(202[0-5])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g);
      if (dateMatches && dateMatches.length > 0) {
        expiredDateCount++;
        items.push({
          id: `expired_${doc.relPath}`,
          type: "expired_date",
          severity: "info",
          title: `Fechas Históricas en '${doc.title}'`,
          description: `Contiene referencias a fechas pasadas (${dateMatches.slice(0, 3).join(", ")}).`,
          affectedPaths: [doc.relPath],
          companySlug: doc.companySlug,
          suggestion: "Verificar si los hitos programados para esas fechas fueron completados.",
        });
      }
    });

    // 3. Scan for Contradictions & Conflicts using LLM
    const llmContradictions = await detectContradictionsWithLLM(docs, selectedModel);
    items.push(...llmContradictions);

    // 4. Calculate Health Score (0-100)
    const criticalCount = items.filter((i) => i.severity === "critical").length;
    const warningCount = items.filter((i) => i.severity === "warning").length;

    let healthScore = 100 - criticalCount * 12 - warningCount * 4;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // 5. Generate Audit Report Markdown Note in Vault
    const dateStr = new Date().toISOString().slice(0, 10);
    const reportRelPath = `Nipei OS/Audits/${dateStr}_Vault_Health_Audit.md`;

    const reportContent = `---
title: "Auditoría de Frescura e Integridad del Vault"
created_at: "${new Date().toISOString()}"
health_score: ${healthScore}
scanned_notes: ${docs.length}
critical_issues: ${criticalCount}
warning_issues: ${warningCount}
author: "Vault Conflict Auditor (${selectedModel})"
tags: [audit, nipei-os, health]
---
<!-- agente: antigravity -->

# 🛡️ Auditoría de Salud y Frescura del Vault · ${dateStr}

> **Puntaje de Frescura e Integridad:** \`${healthScore} / 100\`
> **Notas Escaneadas:** \`${docs.length}\` | **Contradicciones Críticas:** \`${criticalCount}\` | **Alertas:** \`${warningCount}\`

## 📊 Resumen Ejecutivo
El motor de auditoría ha analizado la base de conocimiento en \`nipei-vault\`. Se han detectado **${items.length} hallazgos** que requieren atención para mantener la Single Source of Truth limpia.

## 🔴 Contradicciones y Conflictos Detectados
${
  items.filter((i) => i.type === "contradiction").length > 0
    ? items
        .filter((i) => i.type === "contradiction")
        .map(
          (i) =>
            `### ⚠️ ${i.title}\n- **Descripción:** ${i.description}\n- **Notas Afectadas:** ${i.affectedPaths.map((p) => `\`${p}\``).join(", ")}\n- **Recomendación:** ${i.suggestion}\n`
        )
        .join("\n")
    : "*No se detectaron contradicciones críticas entre notas.*"
}

## 🟡 Notas Obsoletas (> ${maxAgeDays} días)
${
  items.filter((i) => i.type === "stale_note").length > 0
    ? items
        .filter((i) => i.type === "stale_note")
        .slice(0, 15)
        .map((i) => `- 📄 **[\`${i.affectedPaths[0]}\`](file:///${path.resolve(VAULT_ROOT, i.affectedPaths[0]).replace(/\\/g, "/")})** — ${i.description}`)
        .join("\n")
    : "*Todas las notas se encuentran actualizadas dentro del período de tolerancia.*"
}

---
*Reporte generado por el Auditor de Frescura e Integridad de Nipëi OS el ${new Date().toLocaleString("es-ES")}*
`;

    // Save audit report to vault
    await writeNote(reportRelPath, reportContent);

    return {
      success: true,
      auditDate: new Date().toISOString(),
      healthScore,
      scannedNotesCount: docs.length,
      criticalCount,
      warningCount,
      staleNotesCount: staleCount,
      reportNotePath: reportRelPath,
      items,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      auditDate: new Date().toISOString(),
      healthScore: 0,
      scannedNotesCount: 0,
      criticalCount: 0,
      warningCount: 0,
      staleNotesCount: 0,
      items: [],
      error,
    };
  }
}
