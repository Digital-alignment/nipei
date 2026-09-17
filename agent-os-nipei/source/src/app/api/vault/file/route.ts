import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const VAULT_ROOTS = [
  "C:\\Users\\ondig\\Code\\DA\\nipei-vault",
  "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ success: false, error: "Parámetro path requerido" }, { status: 400 });
    }

    let resolvedPath: string | null = null;

    // Security & existence check against all configured vault roots
    for (const root of VAULT_ROOTS) {
      const candidate = path.resolve(root, relPath);
      if (candidate.startsWith(path.resolve(root)) && fs.existsSync(candidate)) {
        resolvedPath = candidate;
        break;
      }
    }

    if (!resolvedPath) {
      return NextResponse.json({ success: false, error: `El archivo '${relPath}' no existe en ningún Vault configurado.` }, { status: 404 });
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
