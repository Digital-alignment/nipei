import { NextRequest, NextResponse } from "next/server";
import {
  readVaultNote,
  writeVaultNote,
  parseAllClients,
  VaultNoteData,
  resolveVaultRoot,
} from "@/lib/vaultSyncEngine";

export const dynamic = "force-dynamic";

interface SyncRequestBody {
  relPath?: string;
  id?: string;
  folder?: "Clientes" | "Productos";
  data?: Partial<VaultNoteData>;
  bodyMarkdown?: string;
  vaultRoot?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: SyncRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const customVault = searchParams.get("vaultRoot") || body.vaultRoot;

    // Support both nested payload `{ data: { ... } }` and flat payload `{ ...fields }`
    const { relPath, id, folder, data, bodyMarkdown, vaultRoot: _vr, ...restOfBody } = body;

    const noteFields: Partial<VaultNoteData> = {
      ...(restOfBody as Partial<VaultNoteData>),
      ...(data || {}),
    };

    if (bodyMarkdown !== undefined) {
      noteFields.bodyMarkdown = bodyMarkdown;
    }

    // Determine target relative path
    let targetPath = relPath;
    const noteId = id || noteFields.id;

    if (!targetPath) {
      if (!noteId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required note identifier: provide 'relPath' or 'id'",
          },
          { status: 400 }
        );
      }
      const targetFolder = folder || (noteFields.tipo === "producto_propio" ? "Productos" : "Clientes");
      targetPath = `${targetFolder}/${noteId}.md`;
    }

    if (noteId && !noteFields.id) {
      noteFields.id = noteId;
    }

    const result = await writeVaultNote(targetPath, noteFields, customVault);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to write vault note" },
        { status: 500 }
      );
    }

    // Read back the fresh state to return canonical data
    const freshNote = await readVaultNote(targetPath, customVault);

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      targetPath,
      note: freshNote,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("relPath") || searchParams.get("path");
    const id = searchParams.get("id");
    const customVault = searchParams.get("vaultRoot") || undefined;

    if (relPath || id) {
      const notePath = relPath || `Clientes/${id}.md`;
      let note = await readVaultNote(notePath, customVault);
      if (!note && id) {
        note = await readVaultNote(`Productos/${id}.md`, customVault);
      }

      if (!note) {
        return NextResponse.json(
          { success: false, error: `Note '${notePath}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        note,
      });
    }

    // If no specific note requested, list all clients
    const clients = await parseAllClients(customVault);
    return NextResponse.json({
      success: true,
      vaultRoot: resolveVaultRoot(customVault),
      count: clients.length,
      clients,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
