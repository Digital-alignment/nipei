import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateSession,
  appendMessageToSession,
  listActiveSessions,
} from "@/lib/hermesMemory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const session = getOrCreateSession(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, error: "No se pudo recuperar la sesión" }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const sessions = listActiveSessions();
    return NextResponse.json({ success: true, count: sessions.length, sessions });
  } catch (err: any) {
    console.error("Error in GET /api/hermes/session:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al recuperar sesiones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userIdentifier, title, message } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "El sessionId es obligatorio" }, { status: 400 });
    }

    // Ensure session is initialized
    let session = getOrCreateSession(sessionId, userIdentifier, title);

    if (message && message.content) {
      session = appendMessageToSession(sessionId, {
        role: message.role || "user",
        content: message.content,
        vaultCitations: message.vaultCitations || [],
        groundingScore: message.groundingScore,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Sesión de Hermes actualizada correctamente en nipei-vault.",
      session,
    });
  } catch (err: any) {
    console.error("Error in POST /api/hermes/session:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al guardar en la sesión" }, { status: 500 });
  }
}
