import { NextResponse } from "next/server";
import { writeNote } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = (body.rawText || body.text || "").trim();
    const companySlug = (body.companySlug || body.slug || "").trim();
    const companyName = (body.companyName || body.name || "").trim();
    const userTitle = (body.title || "").trim();
    const sourceType = body.sourceType || "general";
    const squadId = body.squadId || "squad_1_ceo";
    const userTags = Array.isArray(body.tags) ? body.tags : [];

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "El texto bruto a ingestar no puede estar vacío." },
        { status: 400 }
      );
    }

    // Auto-detect title if not explicitly provided
    let title = userTitle;
    if (!title) {
      const firstLine = rawText.split(/\r?\n/).find((l: string) => l.trim().length > 0) || "";
      const cleanedFirstLine = firstLine
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[*-]\s+/, "")
        .trim();

      if (cleanedFirstLine.length > 5 && cleanedFirstLine.length < 80) {
        title = cleanedFirstLine;
      } else {
        const sourceLabel =
          sourceType === "whatsapp"
            ? "Minuta WhatsApp"
            : sourceType === "meeting_notes"
            ? "Reunión & Acuerdos"
            : sourceType === "email"
            ? "Correo / Comunicación"
            : "Ingesta de Conocimiento";
        title = `${sourceLabel} - ${new Date().toLocaleDateString("es-ES")}`;
      }
    }

    // Generate safe filename slug
    const titleSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const dateStr = new Date().toISOString().slice(0, 10);
    const targetFolder = companySlug ? `Ingested_Knowledge/Empresas/${companySlug}` : "Ingested_Knowledge/General";
    const relPath = `${targetFolder}/${dateStr}_${titleSlug}.md`.replace(/\\/g, "/");

    // Format raw text into clean structured Markdown
    const lines = rawText.split(/\r?\n/);
    const bullets = lines.filter((l: string) => /^[*-]\s+/.test(l.trim()));
    const textBody = lines.filter((l: string) => !/^[*-]\s+/.test(l.trim())).join("\n").trim();

    let structuredBody = "";

    if (bullets.length > 0) {
      structuredBody += `## 📌 Puntos Clave & Viñetas\n${bullets.join("\n")}\n\n`;
    }

    if (textBody.length > 0) {
      structuredBody += `## 📝 Resumen & Contenido\n${textBody}\n\n`;
    }

    // Append full raw text section to guarantee zero information loss
    structuredBody += `---\n\n## 📜 Fuente Bruta Ingestada\n\`\`\`text\n${rawText}\n\`\`\`\n`;

    const fullMarkdown = `---
title: "${title}"
company: "${companySlug || "general"}"
company_name: "${companyName || "Nipëi OS"}"
category: "${targetFolder}"
source_type: "${sourceType}"
created_at: "${new Date().toISOString()}"
author: "Fast Ingest Agent"
squads: ["${squadId}"]
tags: ${JSON.stringify([...userTags, sourceType, companySlug].filter(Boolean))}
---
<!-- agente: auditor-ingesta -->

# ${title}

${structuredBody}
`;

    const saveResult = await writeNote(relPath, fullMarkdown);
    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error || "Error al escribir la ingesta en el Vault." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: relPath,
      title,
      companySlug,
      mtime: saveResult.mtime,
      preview: fullMarkdown.slice(0, 200) + "…",
      message: `Ingesta '${title}' guardada exitosamente en nipei-vault`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
