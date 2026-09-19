import { NextResponse } from "next/server";
import { writeNote } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const companySlug = (body.companySlug || body.slug || "").trim();
    const companyName = (body.companyName || body.name || "").trim();
    const title = (body.title || "").trim();
    const rawContent = (body.content || "").trim();
    const category = body.category || "Master_Sources/Empresas";
    const author = body.author || "Antigravity OS";
    const squads = Array.isArray(body.squads) ? body.squads : [];

    if (!companySlug || !title || !rawContent) {
      return NextResponse.json(
        { success: false, error: "companySlug, title y content son obligatorios." },
        { status: 400 }
      );
    }

    // Generate clean safe filename
    const titleSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const dateStr = new Date().toISOString().slice(0, 10);
    const relPath = `${category}/${companySlug}/${dateStr}_${titleSlug}.md`.replace(/\\/g, "/");

    const fullMarkdownContent = `---
title: "${title}"
company: "${companySlug}"
company_name: "${companyName || companySlug}"
category: "${category}"
created_at: "${new Date().toISOString()}"
author: "${author}"
squads: ${JSON.stringify(squads)}
---
<!-- agente: antigravity -->

# ${title}

${rawContent}
`;

    const saveResult = await writeNote(relPath, fullMarkdownContent);
    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error || "Error al escribir la nota en el Vault." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: relPath,
      title,
      companySlug,
      mtime: saveResult.mtime,
      message: `Nota '${title}' creada exitosamente en nipei-vault`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
