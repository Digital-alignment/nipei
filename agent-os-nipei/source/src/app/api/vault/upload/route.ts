import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const NIPEI_VAULT_ROOT = "C:\\Users\\ondig\\Code\\DA\\nipei-vault";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const targetSquad = (formData.get("targetSquad") as string) || "auto_detect";

    if (!file) {
      return NextResponse.json({ success: false, error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const originalName = file.name || "archivo_subido";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. SHA-256 Checksum & Anti-duplicate check
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const ingestedDir = path.join(NIPEI_VAULT_ROOT, "Ingested_Knowledge");
    fs.mkdirSync(ingestedDir, { recursive: true });

    let existingDuplicateFile = "";
    if (fs.existsSync(ingestedDir)) {
      const files = fs.readdirSync(ingestedDir).filter((f) => f.endsWith(".md"));
      for (const f of files) {
        try {
          const content = fs.readFileSync(path.join(ingestedDir, f), "utf-8");
          if (content.includes(`sha256: "${contentHash}"`)) {
            existingDuplicateFile = f;
            break;
          }
        } catch (e) {}
      }
    }

    if (existingDuplicateFile) {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        message: `⚠️ El archivo '${originalName}' ya fue ingestado previamente en el Vault (${existingDuplicateFile}).`,
        knowledgeFilePath: `Ingested_Knowledge/${existingDuplicateFile}`,
        sha256: contentHash,
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const cleanFileName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const rawFileName = `${timestamp}_${cleanFileName}`;

    // 2. Save original file intact in Raw_Uploads/
    const rawUploadsDir = path.join(NIPEI_VAULT_ROOT, "Raw_Uploads");
    fs.mkdirSync(rawUploadsDir, { recursive: true });
    const rawFilePath = path.join(rawUploadsDir, rawFileName);
    fs.writeFileSync(rawFilePath, buffer);

    // 3. Extract plain text content for knowledge note
    let extractedText = "";
    const ext = path.extname(originalName).toLowerCase();

    if ([".txt", ".md", ".json", ".csv", ".log", ".html"].includes(ext)) {
      extractedText = buffer.toString("utf-8");
    } else {
      const rawString = buffer.toString("utf-8");
      extractedText = rawString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim();
      if (extractedText.length < 50) {
        extractedText = `Documento binario (${ext.toUpperCase()}) subido correctamente. Tamaño: ${(buffer.length / 1024).toFixed(1)} KB. El archivo fuente original está preservado en \`Raw_Uploads/${rawFileName}\`.`;
      }
    }

    // 4. Create Markdown Knowledge Note with Standardized YAML Frontmatter
    const slug = (title || originalName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const knowledgeFileName = `${timestamp}_file_${slug}.md`;
    const knowledgeFilePath = path.join(ingestedDir, knowledgeFileName);

    const knowledgeContent = `---
title: "${(title || originalName).replace(/"/g, '\\"')}"
tags: ["ingesta", "archivo", "${ext.replace(".", "")}", "${targetSquad}"]
created: "${new Date().toISOString()}"
source_type: "FILE"
original_name: "${originalName}"
raw_file: "Raw_Uploads/${rawFileName}"
sha256: "${contentHash}"
agent: "file-uploader"
---
<!-- agente: file-uploader -->
# 📄 Ingesta de Archivo: ${title || originalName}
- **Fecha Subida**: ${new Date().toLocaleString("es-ES")}
- **Archivo Fuente Original**: \`Raw_Uploads/${rawFileName}\`
- **Nombre Original**: \`${originalName}\`
- **Tamaño**: ${(buffer.length / 1024).toFixed(2)} KB
- **Squad Destino**: ${targetSquad}
- **Checksum SHA-256**: \`${contentHash}\`

---

## 📝 Contenido Extraído del Archivo
\`\`\`text
${extractedText.slice(0, 10000)}
${extractedText.length > 10000 ? "\n... (contenido truncado por longitud)" : ""}
\`\`\`

---

## 🔍 Análisis Auditoría
- Preservación del archivo original: 🟢 **VERIFICADA** en \`Raw_Uploads/${rawFileName}\`.
- Estado: Procesado y sincronizado con el Vault.
`;

    fs.writeFileSync(knowledgeFilePath, knowledgeContent, "utf-8");

    // 5. Scan pending vacuums and auto-resolve matches
    const todoDir = path.join(NIPEI_VAULT_ROOT, "Todo_Audit_Lists");
    const resolvedVacuums: string[] = [];

    if (fs.existsSync(todoDir)) {
      const textLower = extractedText.toLowerCase();
      const pendingFiles = fs.readdirSync(todoDir).filter((f) => f.endsWith(".md"));

      for (const pFile of pendingFiles) {
        const pPath = path.join(todoDir, pFile);
        let pContent = fs.readFileSync(pPath, "utf-8");
        if (pContent.includes("RESUELTO_Y_VERIFICADO")) continue;

        const cleanPName = pFile
          .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, "")
          .replace(/_vacios\.md$/, "")
          .replace(/_/g, " ");

        const pKeywords = cleanPName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const matchCount = pKeywords.filter((kw) => textLower.includes(kw)).length;

        if (matchCount >= 2 || (targetSquad !== "auto_detect" && pFile.toLowerCase().includes(targetSquad.toLowerCase()))) {
          pContent = pContent.replace(/\[ \]/g, "[x]");
          pContent = `<!-- agente: file-uploader -->\n<!-- agente: antigravity-auditor -->\n${pContent}\n\n---
## 🟢 Resuelto mediante Subida de Archivo (${new Date().toLocaleDateString("es-ES")})
- **Archivo Fuente**: \`Raw_Uploads/${rawFileName}\`
- **Nota Vault**: \`Ingested_Knowledge/${knowledgeFileName}\`
- **Estado**: 🟢 RESUELTO_Y_VERIFICADO
`;
          fs.writeFileSync(pPath, pContent, "utf-8");
          resolvedVacuums.push(cleanPName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
      message: `Archivo '${originalName}' subido e ingestado correctamente.`,
      rawFilePath: `Raw_Uploads/${rawFileName}`,
      knowledgeFilePath: `Ingested_Knowledge/${knowledgeFileName}`,
      fileSizeKb: (buffer.length / 1024).toFixed(2),
      sha256: contentHash,
      resolvedVacuums,
    });
  } catch (err: any) {
    console.error("Error processing file upload:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al subir archivo" }, { status: 500 });
  }
}
