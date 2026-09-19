import { synthesizeCompanyContext, CompanyDigestResult } from "./companyContextSynthesizer";

export interface CompanyExecutiveReport {
  companySlug: string;
  companyName: string;
  category: string;
  generatedAt: number;
  markdownReport: string;
  htmlReport: string;
  digest: CompanyDigestResult;
}

/**
 * Generates a client-ready Executive Report in Markdown and Print-Ready HTML (PDF export).
 */
export async function generateCompanyExecutiveReport(
  companySlug: string
): Promise<CompanyExecutiveReport> {
  const digest = await synthesizeCompanyContext(companySlug);
  const now = new Date(digest.generatedAt);
  const dateStr = now.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  const { tasksHealth } = digest;
  const progressPercent =
    tasksHealth.total > 0 ? ((tasksHealth.completed / tasksHealth.total) * 100).toFixed(1) : "100";

  // 1. Generate Formatted Executive Markdown Report
  const markdownReport = `
<!-- agente: antigravity -->
# 🏢 REPORTE EJECUTIVO DE AVANCE & ESTADO 360°
**Cliente / Empresa**: ${digest.companyName}
**Categoría**: ${digest.category || "Empresa Cliente"}
**Fecha de Emisión**: ${dateStr} — ${timeStr}
**Agencia Emisora**: Digital Alignment Agency (Nipëi OS System)

---

## 📌 1. RESUMEN EJECUTIVO & ESTADO VIVO
${digest.summary}

- **Nota Viva Principal en Vault**: \`${digest.vaultPath}\`
- **Regla de Aislamiento SSH**: \`${digest.infrastructure.vpsKeyRule}\`

---

## 🌐 2. INFRAESTRUCTURA, DOMINIOS & SERVICIOS
- **Regla de Seguridad SSH**: \`${digest.infrastructure.vpsKeyRule}\` *(Aislamiento exclusivo por cliente)*
- **Stack Tecnológico Activo**: ${digest.infrastructure.detectedTech.length > 0 ? digest.infrastructure.detectedTech.join(", ") : "Digital Alignment Web Stack (Next.js / Node.js / PostgreSQL)"}
- **Sitios Web / Enlaces Oficiales**: ${digest.infrastructure.websites.length > 0 ? digest.infrastructure.websites.join(", ") : "Sin sitios registrados"}

---

## 📊 3. ESTADO DE SPRINTS & TAREAS (ROADMAP DE EJECUCIÓN)
- 📦 **Total Tareas Registradas**: ${tasksHealth.total}
- 🟢 **Tareas Completadas**: ${tasksHealth.completed}
- 🔴 **Tareas Pendientes en Backlog**: ${tasksHealth.pending}
- 📈 **Tasa de Cumplimiento de Objetivos**: **${progressPercent}%**

### 📌 Backlog de Tareas Pendientes Prioritarias:
${
  tasksHealth.pendingItems.length > 0
    ? tasksHealth.pendingItems
        .map((t) => `- [ ] **${t.text}** *(Nota: ${t.noteTitle}, Línea: #${t.line})*`)
        .join("\n")
    : "- 🟢 *No hay tareas pendientes en el backlog.*"
}

---

## 📄 4. MAPA DE NOTAS & DOCUMENTACIÓN DE CONOCIMIENTO (${digest.linkedNotes.length})
${
  digest.linkedNotes.length > 0
    ? digest.linkedNotes
        .map((n) => `- 📄 **${n.title}** (\`${n.relPath}\`) — Última Modificación: ${new Date(n.mtime).toLocaleDateString("es-ES")}`)
        .join("\n")
    : "- *Sin notas secundarias vinculadas.*"
}

---

## 🛡️ FIRMA DE CERTIFICACIÓN DIGITAL ALIGNMENT
Documento generado automáticamente por **Nipëi OS Control Center**.
*Digital Alignment Agency — Mantenimiento, Desarrollo e Implementación de Servicios Web.*
`.trim();

  // 2. Generate Print-Ready Styled HTML Page (for 1-Click PDF Export)
  const htmlReport = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Ejecutivo - ${digest.companyName}</title>
  <style>
    @media print {
      body { background-color: #fff !important; color: #111 !important; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 40px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #1e293b;
      padding: 40px;
      border-radius: 16px;
      border: 1px solid #334155;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand { font-size: 20px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; }
    .badge { background: #0284c7; color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
    h1 { font-size: 24px; color: #f8fafc; margin-top: 0; }
    h2 { font-size: 16px; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 28px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .card { background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #334155; }
    .card-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
    .card-val { font-size: 16px; font-weight: 700; color: #f1f5f9; }
    .tech-tag { display: inline-block; background: #0369a1; color: #e0f2fe; font-size: 11px; padding: 2px 8px; border-radius: 6px; margin: 2px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">⚡ DIGITAL ALIGNMENT AGENCY</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Nipëi OS Executive Intelligence Engine</div>
      </div>
      <div class="badge">${digest.category || "Empresa Cliente"}</div>
    </div>

    <h1>Reporte Ejecutivo de Avance — ${digest.companyName}</h1>
    <div style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
      Emisión: <strong>${dateStr}</strong> | Cliente: <strong>${digest.companyName}</strong>
    </div>

    <h2>1. Resumen de Estado Vivo</h2>
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-title">Visión General</div>
      <div style="font-size: 14px; color: #cbd5e1;">${digest.summary}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Regla de Aislamiento SSH</div>
        <div class="card-val" style="font-family: monospace; color: #fbbf24; font-size: 14px;">${digest.infrastructure.vpsKeyRule}</div>
      </div>
      <div class="card">
        <div class="card-title">Tasa de Cumplimiento</div>
        <div class="card-val" style="color: #34d399;">${progressPercent}% (${tasksHealth.completed}/${tasksHealth.total} Tareas)</div>
      </div>
    </div>

    <h2>2. Infraestructura & Stack Tecnológico</h2>
    <div className="card" style="margin-bottom: 20px; padding: 16px; background: #0f172a; border-radius: 12px;">
      <div class="card-title">Tecnologías Detectadas</div>
      <div>
        ${
          digest.infrastructure.detectedTech.length > 0
            ? digest.infrastructure.detectedTech.map((t) => `<span class="tech-tag">${t}</span>`).join("")
            : "<span style='font-size:13px; color:#94a3b8;'>Digital Alignment Web Stack</span>"
        }
      </div>
    </div>

    <h2>3. Backlog de Tareas Pendientes Prioritarias</h2>
    <ul>
      ${
        tasksHealth.pendingItems.length > 0
          ? tasksHealth.pendingItems
              .map((t) => `<li><strong>${t.text}</strong> <span style="color:#94a3b8; font-size:12px;">(${t.noteTitle})</span></li>`)
              .join("")
          : "<li>🟢 No hay tareas pendientes registradas.</li>"
      }
    </ul>

    <h2>4. Documentación de Conocimiento Vinculada (${digest.linkedNotes.length})</h2>
    <ul>
      ${
        digest.linkedNotes.length > 0
          ? digest.linkedNotes.map((n) => `<li>📄 <strong>${n.title}</strong> (${n.relPath})</li>`).join("")
          : "<li>Sin notas secundarias asociadas.</li>"
      }
    </ul>

    <div class="footer">
      Documento Ejecutivo Generado por Nipëi OS Control Center &bull; Digital Alignment Agency
    </div>
  </div>
</body>
</html>
`.trim();

  return {
    companySlug: digest.companySlug,
    companyName: digest.companyName,
    category: digest.category || "Empresa Cliente",
    generatedAt: digest.generatedAt,
    markdownReport,
    htmlReport,
    digest,
  };
}
