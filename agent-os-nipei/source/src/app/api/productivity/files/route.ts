import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PRODUCTIVITY_DIR = "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault\\Productivity";

export interface ProductivityFileItem {
  name: string;
  relativePath: string;
  fullPath: string;
  extension: "md" | "csv" | string;
  sizeBytes: number;
  modifiedAt: string;
  category: string;
}

function scanDirectory(dirPath: string, baseDir: string): ProductivityFileItem[] {
  let results: ProductivityFileItem[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase().replace(".", "");
      if (ext === "md" || ext === "csv") {
        const stats = fs.statSync(fullPath);
        const folderParts = relativePath.split("/");
        const category = folderParts.length > 1 ? folderParts[0] : "Raíz";

        results.push({
          name: entry.name,
          relativePath,
          fullPath,
          extension: ext,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          category,
        });
      }
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileParam = searchParams.get("file");

    // If specific file requested, return content
    if (fileParam) {
      const targetPath = path.join(PRODUCTIVITY_DIR, fileParam.replace(/\.\./g, ""));
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
      }

      const content = fs.readFileSync(targetPath, "utf-8");
      return NextResponse.json({ relativePath: fileParam, content });
    }

    // Otherwise list all MD and CSV files in hierarchy
    const files = scanDirectory(PRODUCTIVITY_DIR, PRODUCTIVITY_DIR);
    return NextResponse.json({ files, vaultPath: PRODUCTIVITY_DIR });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { relativePath, content } = body;

    if (!relativePath || content === undefined) {
      return NextResponse.json({ error: "Faltan parámetros relativePath o content" }, { status: 400 });
    }

    const targetPath = path.join(PRODUCTIVITY_DIR, relativePath.replace(/\.\./g, ""));
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetPath, content, "utf-8");
    return NextResponse.json({ success: true, relativePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
