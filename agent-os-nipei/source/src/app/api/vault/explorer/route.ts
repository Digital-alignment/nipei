import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const NIPEI_VAULT_ROOT = "C:\\Users\\ondig\\Code\\DA\\nipei-vault";

export async function GET(req: NextRequest) {
  try {
    const rawDir = path.join(NIPEI_VAULT_ROOT, "Raw_Uploads");
    const knowledgeDir = path.join(NIPEI_VAULT_ROOT, "Ingested_Knowledge");
    const todoDir = path.join(NIPEI_VAULT_ROOT, "Todo_Audit_Lists");

    // 1. Raw Uploads
    const rawUploads = fs.existsSync(rawDir)
      ? fs.readdirSync(rawDir).map((filename) => {
          const filePath = path.join(rawDir, filename);
          const stat = fs.statSync(filePath);
          return {
            name: filename,
            path: `Raw_Uploads/${filename}`,
            sizeKb: (stat.size / 1024).toFixed(1),
            mtime: stat.mtime.toISOString(),
            ext: path.extname(filename).toLowerCase(),
          };
        })
      : [];

    // 2. Knowledge Notes
    const knowledgeNotes = fs.existsSync(knowledgeDir)
      ? fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md")).map((filename) => {
          const filePath = path.join(knowledgeDir, filename);
          const stat = fs.statSync(filePath);
          let title = filename;
          try {
            const firstLines = fs.readFileSync(filePath, "utf-8").split("\n").slice(0, 5).join("\n");
            const match = firstLines.match(/#\s+(.+)/);
            if (match) title = match[1].replace(/^[^\w]+/, "").trim();
          } catch (e) {}

          return {
            name: filename,
            title,
            path: `Ingested_Knowledge/${filename}`,
            sizeKb: (stat.size / 1024).toFixed(1),
            mtime: stat.mtime.toISOString(),
          };
        })
      : [];

    // 3. Todo Lists / Vacuums
    const todoLists = fs.existsSync(todoDir)
      ? fs.readdirSync(todoDir).filter((f) => f.endsWith(".md")).map((filename) => {
          const filePath = path.join(todoDir, filename);
          const stat = fs.statSync(filePath);
          let content = "";
          try {
            content = fs.readFileSync(filePath, "utf-8");
          } catch (e) {}

          const isResolved = content.includes("RESUELTO_Y_VERIFICADO") || content.includes("[x]");

          return {
            name: filename,
            path: `Todo_Audit_Lists/${filename}`,
            isResolved,
            sizeKb: (stat.size / 1024).toFixed(1),
            mtime: stat.mtime.toISOString(),
          };
        })
      : [];

    return NextResponse.json({
      success: true,
      rawUploadsCount: rawUploads.length,
      rawUploads,
      knowledgeCount: knowledgeNotes.length,
      knowledgeNotes,
      todoCount: todoLists.length,
      todoLists,
    });
  } catch (err: any) {
    console.error("Error fetching vault explorer data:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch vault explorer" }, { status: 500 });
  }
}
