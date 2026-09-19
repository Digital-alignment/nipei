import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const NIPEI_VAULT_ROOT = "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

export async function GET(req: NextRequest) {
  try {
    const rawDir = path.join(NIPEI_VAULT_ROOT, "Raw_Uploads");
    const knowledgeDir = path.join(NIPEI_VAULT_ROOT, "Ingested_Knowledge");
    const todoDir = path.join(NIPEI_VAULT_ROOT, "Todo_Audit_Lists");

    const rawFiles = fs.existsSync(rawDir) ? fs.readdirSync(rawDir) : [];
    const knowledgeFiles = fs.existsSync(knowledgeDir) ? fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md")) : [];
    const todoFiles = fs.existsSync(todoDir) ? fs.readdirSync(todoDir).filter((f) => f.endsWith(".md")) : [];

    let totalRawKb = 0;
    rawFiles.forEach((f) => {
      try {
        totalRawKb += fs.statSync(path.join(rawDir, f)).size / 1024;
      } catch (e) {}
    });

    let totalKnowledgeKb = 0;
    knowledgeFiles.forEach((f) => {
      try {
        totalKnowledgeKb += fs.statSync(path.join(knowledgeDir, f)).size / 1024;
      } catch (e) {}
    });

    let resolvedCount = 0;
    let pendingCount = 0;
    const pendingVacuumsList: string[] = [];

    todoFiles.forEach((f) => {
      try {
        const content = fs.readFileSync(path.join(todoDir, f), "utf-8");
        if (content.includes("RESUELTO_Y_VERIFICADO") || content.includes("[x]")) {
          resolvedCount++;
        } else {
          pendingCount++;
          pendingVacuumsList.push(f);
        }
      } catch (e) {}
    });

    const totalVacuums = resolvedCount + pendingCount;
    const healthPercentage = totalVacuums > 0 ? Math.round((resolvedCount / totalVacuums) * 100) : 100;

    const reportMarkdown = `---
title: "Reporte de Salud y Cobertura del Vault Master"
created: "${new Date().toISOString()}"
agent: "auditor-ingesta"
---

# 📊 Reporte Ejecutivo de Salud del Vault — Nipëi OS
- **Fecha de Generación**: ${new Date().toLocaleString("es-ES")}
- **Ruta del Vault**: \`C:\\Users\\ondig\\Code\\Nipei\\nipei-vault\`
- **Índice de Salud y Cobertura**: **${healthPercentage}% Cobertura**

---

## 📈 Métricas Consolidadas

| Métrica | Valor |
|---|---|
| 📂 Archivos Fuente Originales (\`Raw_Uploads/\`) | **${rawFiles.length} archivos** (${totalRawKb.toFixed(1)} KB) |
| 📄 Notas de Conocimiento (\`Ingested_Knowledge/\`) | **${knowledgeFiles.length} notas** (${totalKnowledgeKb.toFixed(1)} KB) |
| 🛡️ Vacíos Resueltos | **${resolvedCount} / ${totalVacuums} resueltos** (🟢 Verified) |
| ⚠️ Vacíos Pendientes de Respuesta | **${pendingCount} vacíos** (🟡 Incomplete) |

---

## ⚠️ Vacíos Críticos Pendientes (${pendingCount})

${
  pendingVacuumsList.length > 0
    ? pendingVacuumsList.map((f) => `- [ ] \`Todo_Audit_Lists/${f}\``).join("\n")
    : "🟢 ¡Felicidades! No hay vacíos de información pendientes en el Vault."
}

---
*Reporte generado automáticamente por el Agente Auditor de Ingesta en Nipëi OS.*
`;

    return NextResponse.json({
      success: true,
      healthPercentage,
      rawCount: rawFiles.length,
      knowledgeCount: knowledgeFiles.length,
      resolvedCount,
      pendingCount,
      totalRawKb: totalRawKb.toFixed(1),
      totalKnowledgeKb: totalKnowledgeKb.toFixed(1),
      reportMarkdown,
    });
  } catch (err: any) {
    console.error("Error al generar reporte de salud:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al generar reporte" }, { status: 500 });
  }
}
