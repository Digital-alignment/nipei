import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const NIPEI_VAULT_ROOT = "C:\\Users\\ondig\\Code\\DA\\nipei-vault";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ success: false, error: "Parámetro path requerido" }, { status: 400 });
    }

    // Security check: prevent path traversal outside NIPEI_VAULT_ROOT
    const resolvedPath = path.resolve(NIPEI_VAULT_ROOT, relPath);
    if (!resolvedPath.startsWith(path.resolve(NIPEI_VAULT_ROOT))) {
      return NextResponse.json({ success: false, error: "Acceso a ruta no permitido" }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ success: false, error: "El archivo no existe" }, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    let content = "";

    // Read text files or binary previews
    if ([".md", ".txt", ".json", ".csv", ".log", ".html", ".xml", ".yaml", ".yml"].includes(ext)) {
      content = fs.readFileSync(resolvedPath, "utf-8");
    } else {
      content = `[Archivo Binario (${ext.toUpperCase()})] - Tamaño: ${(stat.size / 1024).toFixed(1)} KB\nUbicación: ${relPath}\n\nEste archivo está preservado en su formato original.`;
    }

    return NextResponse.json({
      success: true,
      name: path.basename(resolvedPath),
      path: relPath,
      ext,
      sizeKb: (stat.size / 1024).toFixed(1),
      mtime: stat.mtime.toISOString(),
      content,
    });
  } catch (err: any) {
    console.error("Error al leer archivo del Vault:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al leer archivo" }, { status: 500 });
  }
}
