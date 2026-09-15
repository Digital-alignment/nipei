import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { defaultVault } from "@/lib/config";

export const dynamic = "force-dynamic";

interface SaveGenPayload {
  title: string;
  generatedMarkdown: string;
  sourceVaultPath?: string;
  format?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SaveGenPayload = await req.json();
    const { title, generatedMarkdown, sourceVaultPath = "", format = "article" } = body;

    if (!generatedMarkdown || !generatedMarkdown.trim()) {
      return NextResponse.json({ success: false, error: "El contenido generado no puede estar vacío" }, { status: 400 });
    }

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json({ success: false, error: "No se encontró nipei-vault" }, { status: 500 });
    }

    const targetDir = path.join(vaultRoot, "Generated_Content");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const datePrefix = new Date().toISOString().slice(0, 10);
    const cleanTitle = (title || "contenido")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 35);

    const filename = `${datePrefix}_gen_${format}_${cleanTitle}.md`;
    const fullPath = path.join(targetDir, filename);

    const sha256 = crypto.createHash("sha256").update(generatedMarkdown).digest("hex");

    fs.writeFileSync(fullPath, generatedMarkdown, "utf-8");

    const relativeVaultPath = path.relative(vaultRoot, fullPath).replace(/\\/g, "/");

    return NextResponse.json({
      success: true,
      message: "Pieza generada guardada exitosamente en Generated_Content dentro de Nipëi Vault.",
      filename,
      vaultPath: relativeVaultPath,
      fullPath,
      sha256,
    });
  } catch (err: any) {
    console.error("Error saving generated content to vault:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al guardar en Vault" }, { status: 500 });
  }
}
