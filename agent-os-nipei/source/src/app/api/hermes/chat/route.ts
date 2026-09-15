import { NextRequest, NextResponse } from "next/server";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { getOrCreateSession, appendMessageToSession } from "@/lib/hermesMemory";
import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";

export const dynamic = "force-dynamic";

interface HermesChatPayload {
  sessionId: string;
  userIdentifier?: string;
  prompt: string;
  targetSquad?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: HermesChatPayload = await req.json();
    const {
      sessionId = `session_${Date.now()}`,
      userIdentifier = "Usuario General",
      prompt,
      targetSquad = "squad_1_ceo",
    } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: "El prompt no puede estar vacío" }, { status: 400 });
    }

    // 1. Ensure persistent session exists
    const session = getOrCreateSession(sessionId, userIdentifier);

    // 2. Query RAG Grounding in nipei-vault
    const ragResult = queryVaultGrounding(prompt, targetSquad);

    // 3. Save User message to persistent session memory
    appendMessageToSession(sessionId, {
      role: "user",
      content: prompt,
    });

    // 4. Save Assistant response to persistent session memory
    const updatedSession = appendMessageToSession(sessionId, {
      role: "assistant",
      content: ragResult.answerText,
      vaultCitations: ragResult.citations.map((c) => c.path),
      groundingScore: ragResult.groundingScore,
    });

    // 5. If Zero-Hallucination policy detected missing info, auto-create Audit Task in Todo_Audit_Lists
    let missingInfoTaskCreated = false;
    let createdTaskPath = "";

    if (ragResult.missingInformation) {
      try {
        const vaultRoot = defaultVault();
        if (vaultRoot) {
          const todoDir = path.join(vaultRoot, "Todo_Audit_Lists");
          if (!fs.existsSync(todoDir)) {
            fs.mkdirSync(todoDir, { recursive: true });
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const cleanPrompt = prompt.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 25);
          const taskFilename = `${timestamp}_task_hermes_rag_${cleanPrompt}.md`;
          const taskFullPath = path.join(todoDir, taskFilename);

          const taskMarkdown = `<!-- agente: hermes-rag-zero-hallucination -->
# 📋 Vacío de Ingesta Detectado por Hermes 2.0: ${prompt.slice(0, 40)}...
- **Fecha Detección**: ${new Date().toLocaleString()}
- **Squad Asignado**: ${targetSquad}
- **Prioridad**: alta
- **Estado**: 🔴 VACIO_DE_CONOCIMIENTO

---

## 📝 Consulta no encontrada en Vault
> "${prompt}"

---

## 🤖 Acción Requerida
El Agente Hermes 2.0 detectó que esta información no existe en \`nipei-vault\`. Por política de **Cero Alucinación**, Hermes no inventó la respuesta.
Por favor ingestar el documento maestro o nota explicativa usando el **Asistente Guiado de Ingestión (/ingestion)**.
`;

          fs.writeFileSync(taskFullPath, taskMarkdown, "utf-8");
          missingInfoTaskCreated = true;
          createdTaskPath = path.relative(vaultRoot, taskFullPath).replace(/\\/g, "/");
        }
      } catch (err) {
        console.error("Error creating zero-hallucination task:", err);
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      answer: ragResult.answerText,
      groundingScore: ragResult.groundingScore,
      isGrounded: ragResult.isGrounded,
      citations: ragResult.citations,
      missingInformation: ragResult.missingInformation,
      missingInfoTaskCreated,
      createdTaskPath,
      session: updatedSession,
    });
  } catch (err: any) {
    console.error("Error in POST /api/hermes/chat:", err);
    return NextResponse.json({ success: false, error: err?.message || "Error al procesar el chat de Hermes" }, { status: 500 });
  }
}
