import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import {
  saveTaskAttachmentFile,
  registerTaskLinkOrNote,
  getTaskWorkspaceData,
  syncTaskFrontmatterWithWorkspace,
} from "@/lib/taskWorkspace";

export const dynamic = "force-dynamic";

// Map extensions to MIME types
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".csv": "text/csv; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] || "application/octet-stream";
}

// GET: Serve an attachment file or list attachments for a task
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get("path");
    const taskId = searchParams.get("taskId");
    const squadId = searchParams.get("squadId") || undefined;
    const taskTitle = searchParams.get("taskTitle") || undefined;

    const vaultRoot = defaultVault() || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

    // 1. Serving a specific file by relative path
    if (filePathParam) {
      // Prevent directory traversal attacks
      const normalized = path.normalize(filePathParam).replace(/^(\.\.(\/|\\|$))+/, "");
      const absPath = path.join(vaultRoot, normalized);

      // Verify path is within vaultRoot and inside Task_Workspace
      if (!absPath.startsWith(vaultRoot)) {
        return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
      }

      if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
        return NextResponse.json({ error: "Arquivo não encontrado no Vault" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(absPath);
      const fileName = path.basename(absPath);
      const mimeType = getMimeType(absPath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. Listing workspace data for a task
    if (taskId) {
      const data = getTaskWorkspaceData(taskId, squadId, taskTitle);
      return NextResponse.json({
        success: true,
        taskId,
        attachments: data.attachments,
        deliverables: data.deliverables,
        workspacePath: data.workspacePath,
      });
    }

    return NextResponse.json({ error: "Parâmetro 'path' ou 'taskId' obrigatório" }, { status: 400 });
  } catch (err: any) {
    console.error("Erro na rota GET /api/agent-kanban/attachments:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor" }, { status: 500 });
  }
}

// POST: Upload a binary file attachment OR register an external link / vault note
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // A. Multipart Form-Data: Binary File Upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const taskId = formData.get("taskId") as string | null;
      const squadId = (formData.get("squadId") as string) || undefined;
      const taskTitle = (formData.get("taskTitle") as string) || undefined;
      const uploadedBy = (formData.get("uploadedBy") as string) || "@usuario";
      const notes = (formData.get("notes") as string) || undefined;
      const vaultPath = (formData.get("vaultPath") as string) || undefined;

      if (!file || !taskId) {
        return NextResponse.json(
          { error: "Arquivo ('file') e 'taskId' são obrigatórios" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const attachment = await saveTaskAttachmentFile(
        taskId,
        squadId,
        taskTitle,
        buffer,
        file.name,
        file.type || getMimeType(file.name),
        uploadedBy,
        notes
      );

      // Sync with task frontmatter if vaultPath is provided
      if (vaultPath) {
        const wsData = getTaskWorkspaceData(taskId, squadId, taskTitle);
        syncTaskFrontmatterWithWorkspace(vaultPath, wsData.attachments, wsData.deliverables);
      }

      return NextResponse.json({
        success: true,
        message: "Arquivo anexado com sucesso ao espaço de trabalho da tarefa",
        attachment,
      });
    }

    // B. Application/JSON: Register external link or Obsidian vault note
    const body = await req.json();
    const { taskId, squadId, taskTitle, name, targetUrlOrNote, type, uploadedBy, notes, vaultPath } = body;

    if (!taskId || !targetUrlOrNote) {
      return NextResponse.json(
        { error: "'taskId' e 'targetUrlOrNote' são obrigatórios" },
        { status: 400 }
      );
    }

    const attachment = registerTaskLinkOrNote(
      taskId,
      squadId,
      taskTitle,
      name || targetUrlOrNote,
      targetUrlOrNote,
      type === "vault_note" ? "vault_note" : "link",
      uploadedBy || "@usuario",
      notes
    );

    if (vaultPath) {
      const wsData = getTaskWorkspaceData(taskId, squadId, taskTitle);
      syncTaskFrontmatterWithWorkspace(vaultPath, wsData.attachments, wsData.deliverables);
    }

    return NextResponse.json({
      success: true,
      message: "Link/Nota registrado com sucesso na tarefa",
      attachment,
    });
  } catch (err: any) {
    console.error("Erro na rota POST /api/agent-kanban/attachments:", err);
    return NextResponse.json({ error: err.message || "Erro ao processar anexo" }, { status: 500 });
  }
}
