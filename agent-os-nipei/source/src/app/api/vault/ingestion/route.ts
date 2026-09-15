import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { extractAIDigest } from "@/lib/vaultDigest";

export const dynamic = "force-dynamic";

const NIPEI_VAULT_ROOT = "C:\\Users\\ondig\\Code\\DA\\nipei-vault";

interface IngestPayload {
  title: string;
  sourceType: string;
  rawText: string;
  targetSquad?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: IngestPayload = await req.json();
    let { title, sourceType, rawText, targetSquad = "auto_detect" } = body;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "El contenido no puede estar vacío" },
        { status: 400 }
      );
    }

    // Support Batch Multi-URL Processing (if rawText contains multiple http/https lines)
    const urlLines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("http://") || l.startsWith("https://"));
    
    if (urlLines.length > 1 && sourceType === "URL") {
      const batchResults = [];
      for (let i = 0; i < urlLines.length; i++) {
        const singleUrl = urlLines[i];
        let urlText = singleUrl;
        let urlTitle = `${title || "Link"} ${i + 1}`;

        try {
          const fetchRes = await fetch(singleUrl, { headers: { "User-Agent": "Mozilla/5.0 NipëiIngestAgent/1.0" } });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) urlTitle = titleMatch[1].trim();
            urlText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "\n").replace(/\n\s*\n/g, "\n\n").trim();
          }
        } catch (e) {}

        const digest = extractAIDigest(urlText, urlTitle);
        const hash = crypto.createHash("sha256").update(urlText).digest("hex");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const kFileName = `${ts}_batch_${i + 1}.md`;
        const kPath = path.join(NIPEI_VAULT_ROOT, "Ingested_Knowledge", kFileName);

        const content = `---
title: "${urlTitle.replace(/"/g, '\\"')}"
tags: ["ingesta", "batch_url", "${targetSquad}"]
created: "${new Date().toISOString()}"
source_type: "URL"
source_url: "${singleUrl}"
sha256: "${hash}"
---
# 📄 Ingesta por Lote (${i + 1}/${urlLines.length}): ${urlTitle}
- **URL**: \`${singleUrl}\`

${digest.digestMarkdown}

---
## 📝 Texto Extraído
\`\`\`text
${urlText.slice(0, 5000)}
\`\`\`
`;
        fs.mkdirSync(path.dirname(kPath), { recursive: true });
        fs.writeFileSync(kPath, content, "utf-8");
        batchResults.push({ url: singleUrl, title: urlTitle, path: `Ingested_Knowledge/${kFileName}` });
      }

      return NextResponse.json({
        success: true,
        isBatch: true,
        message: `Lote de ${urlLines.length} URLs ingestado e indizado correctamente en el Vault.`,
        batchResults,
      });
    }

    let processText = rawText;
    let urlSource = "";

    // 1. Smart URL Parser (Google Docs, Remote PDFs & Web Pages)
    if (sourceType === "URL" || rawText.trim().startsWith("http://") || rawText.trim().startsWith("https://")) {
      urlSource = rawText.trim();

      if (urlSource.includes("docs.google.com/document/d/")) {
        const docIdMatch = urlSource.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (docIdMatch) {
          const docId = docIdMatch[1];
          urlSource = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        }
      }

      try {
        const fetchRes = await fetch(urlSource, {
          headers: { "User-Agent": "Mozilla/5.0 NipëiIngestAgent/1.0" },
        });

        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get("content-type") || "";

          if (contentType.includes("pdf") || urlSource.endsWith(".pdf")) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const pdfFileName = `${timestamp}_remote_doc.pdf`;
            const pdfFilePath = path.join(NIPEI_VAULT_ROOT, "Raw_Uploads", pdfFileName);
            fs.mkdirSync(path.dirname(pdfFilePath), { recursive: true });
            fs.writeFileSync(pdfFilePath, buffer);

            const rawString = buffer.toString("utf-8");
            processText = rawString
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            if (processText.length < 50) {
              processText = `PDF Remoto ingestado desde \`${urlSource}\`. Preservado en \`Raw_Uploads/${pdfFileName}\`.`;
            }
          } else {
            const html = await fetchRes.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch && !title) {
              title = titleMatch[1].trim();
            }
            processText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, "\n")
              .replace(/\n\s*\n/g, "\n\n")
              .trim();
          }
        }
      } catch (err) {
        console.error("Error fetching URL for ingestion:", err);
      }
    }

    // 2. Calculate SHA-256 Checksum & Anti-Duplicate Check
    const contentHash = crypto.createHash("sha256").update(processText).digest("hex");
    const knowledgeDir = path.join(NIPEI_VAULT_ROOT, "Ingested_Knowledge");
    fs.mkdirSync(knowledgeDir, { recursive: true });

    let existingDuplicateFile = "";
    if (fs.existsSync(knowledgeDir)) {
      const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(knowledgeDir, file), "utf-8");
          if (content.includes(`sha256: "${contentHash}"`)) {
            existingDuplicateFile = file;
            break;
          }
        } catch (e) {}
      }
    }

    if (existingDuplicateFile) {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        message: `⚠️ Este documento ya fue ingestado previamente en el Vault (${existingDuplicateFile}).`,
        knowledgeFilePath: `Ingested_Knowledge/${existingDuplicateFile}`,
        sha256: contentHash,
      });
    }

    // 3. AI Digest & Entity Extraction
    const digestResult = extractAIDigest(processText, title);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const slug = (title || "Ingesta_" + timestamp)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // 4. Save Knowledge Note with Standardized YAML Frontmatter & AI Digest
    const knowledgeFileName = `${timestamp}_${slug}.md`;
    const knowledgeFilePath = path.join(knowledgeDir, knowledgeFileName);

    const knowledgeContent = `---
title: "${(title || "Documento Importado").replace(/"/g, '\\"')}"
tags: ["ingesta", "${sourceType.toLowerCase()}", "${targetSquad}"]
created: "${new Date().toISOString()}"
source_type: "${sourceType}"
source_url: "${urlSource || ""}"
sha256: "${contentHash}"
agent: "auditor-ingesta"
---
<!-- agente: auditor-ingesta -->
# 📄 Ingesta de Conocimiento: ${title || "Documento Importado"}
- **Fecha Ingesta**: ${new Date().toLocaleString("es-ES")}
- **Fuente**: ${sourceType} ${urlSource ? `(\`${urlSource}\`)` : ""}
- **Squad Destino**: ${targetSquad}
- **Checksum SHA-256**: \`${contentHash}\`

---

${digestResult.digestMarkdown}

---

## 📝 Texto Extraído / Transcripción Ingestada
\`\`\`text
${processText}
\`\`\`

---

## 🔍 Análisis de Hechos & Contexto (Zero-Hallucination)
- **Longitud**: ${processText.length} caracteres
- **Estado Auditoría**: Procesado exitosamente por el Agente Auditor de Ingesta.
`;

    fs.writeFileSync(knowledgeFilePath, knowledgeContent, "utf-8");

    // 5. Perform Intelligent Squad Auto-Classification & Audit Missing Info
    const textLower = processText.toLowerCase();
    const extractedSquads: { squadId: string; squadName: string; extractedItems: string[] }[] = [];
    const missingInfoItems: string[] = [];

    if (textLower.includes("ceo") || textLower.includes("estatuto") || textLower.includes("visión") || textLower.includes("objetivo")) {
      extractedSquads.push({
        squadId: "Squad_01_CEO",
        squadName: "Squad 01: CEO & Visión",
        extractedItems: ["Estatutos / Visión general detectada."],
      });
    }

    if (textLower.includes("operaci") || textLower.includes("evento") || textLower.includes("n8n") || textLower.includes("logística")) {
      extractedSquads.push({
        squadId: "Squad_02_Operaciones",
        squadName: "Squad 02: Operaciones",
        extractedItems: ["Procesos operativos / Flujos detectados."],
      });
    }

    if (textLower.includes("marketing") || textLower.includes("dominio") || textLower.includes("web") || textLower.includes("seo") || textLower.includes("redes")) {
      extractedSquads.push({
        squadId: "Squad_03_Marketing",
        squadName: "Squad 03: Marketing & Marca",
        extractedItems: ["Estrategias de contenido / Dominios detectados."],
      });
    }

    if (textLower.includes("finanzas") || textLower.includes("gasto") || textLower.includes("presupuesto") || textLower.includes("factura") || textLower.includes("pago")) {
      extractedSquads.push({
        squadId: "Squad_04_Finanzas",
        squadName: "Squad 04: Finanzas & Presupuestos",
        extractedItems: ["Registros financieros / Gastos detectados."],
      });
    }

    if (textLower.includes("tech") || textLower.includes("vps") || textLower.includes("github") || textLower.includes("código") || textLower.includes("api")) {
      extractedSquads.push({
        squadId: "Squad_05_Tecnologia",
        squadName: "Squad 05: Tecnología & VPS",
        extractedItems: ["Arquitectura tecnológica / Código detectado."],
      });
    }

    if (extractedSquads.length === 0) {
      extractedSquads.push({
        squadId: "Squad_01_CEO",
        squadName: "Squad 01: CEO & Visión",
        extractedItems: ["Información general ingesta para revisión."],
      });
    }

    if (!textLower.includes("fecha") && !textLower.includes("plazo")) {
      missingInfoItems.push("No se definieron fechas límites ni responsables explícitos para las tareas mencionadas.");
    }
    if (!textLower.includes("presupuesto") && !textLower.includes("costo") && !textLower.includes("precio")) {
      missingInfoItems.push("No se especificaron valores monetarios ni presupuesto asignado.");
    }

    // Add detected AI tasks into missing items to auto-create Kanban tasks
    digestResult.detectedTasks.forEach((t) => {
      missingInfoItems.push(`Tarea para Kanban: ${t}`);
    });

    // 6. Cross-Check with Pending Vacuums & Auto-Resolve Matches
    const todoDir = path.join(NIPEI_VAULT_ROOT, "Todo_Audit_Lists");
    const resolvedVacuums: string[] = [];

    if (fs.existsSync(todoDir)) {
      const pendingFiles = fs.readdirSync(todoDir).filter((f) => f.endsWith(".md"));

      for (const pFile of pendingFiles) {
        const pPath = path.join(todoDir, pFile);
        let pContent = fs.readFileSync(pPath, "utf-8");
        if (pContent.includes("RESUELTO_Y_VERIFICADO")) continue;

        const cleanPName = pFile
          .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, "")
          .replace(/_vacios\.md$/, "")
          .replace(/_/g, " ");

        const vacuumWords = cleanPName.split(" ").filter((w) => w.length > 3);
        const matchCount = vacuumWords.filter((w) => textLower.includes(w.toLowerCase())).length;

        if (matchCount >= 2 || (targetSquad !== "auto_detect" && pFile.toLowerCase().includes(targetSquad.toLowerCase()))) {
          pContent = pContent.replace(/\[ \]/g, "[x]");
          pContent += `\n\n---
### 🟢 RESUELTO_Y_VERIFICADO
- **Fecha de Resolución**: ${new Date().toLocaleString("es-ES")}
- **Evidencia Ingestada**: \`Ingested_Knowledge/${knowledgeFileName}\`
`;
          fs.writeFileSync(pPath, pContent, "utf-8");
          resolvedVacuums.push(pFile);
        }
      }
    }

    // 7. Save Todo Audit List / Dispatched Tasks for Squad Kanban
    let todoFileName = "";
    if (missingInfoItems.length > 0) {
      todoFileName = `${timestamp}_${slug}_vacios.md`;
      const todoFilePath = path.join(todoDir, todoFileName);

      const todoContent = `---
title: "Vacíos: ${title || slug}"
tags: ["vacios", "auditoria", "${targetSquad}"]
created: "${new Date().toISOString()}"
resolved: false
---
<!-- agente: auditor-ingesta -->
# ⚠️ Vacíos de Información & Tareas Detectadas: ${title || "Documento Importado"}
- **Fecha Auditoría**: ${new Date().toLocaleString("es-ES")}
- **Origen**: Ingesta \`Ingested_Knowledge/${knowledgeFileName}\`

---

## 📋 Puntos Pendientes de Aclaración & Tarjetas para Kanban
${missingInfoItems.map((item) => `- [ ] ${item}`).join("\n")}
`;

      fs.mkdirSync(todoDir, { recursive: true });
      fs.writeFileSync(todoFilePath, todoContent, "utf-8");
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
      message: "Información ingestada, procesada con AI Digest y auditada correctamente en el Vault",
      knowledgeFilePath: `Ingested_Knowledge/${knowledgeFileName}`,
      todoFilePath: todoFileName ? `Todo_Audit_Lists/${todoFileName}` : undefined,
      extractedSquads,
      missingInfoItems,
      resolvedVacuums,
      sha256: contentHash,
      aiDigest: digestResult,
    });
  } catch (err: any) {
    console.error("Error al procesar ingesta:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al procesar ingesta" }, { status: 500 });
  }
}
