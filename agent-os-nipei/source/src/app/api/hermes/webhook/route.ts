import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSession, appendMessageToSession } from "@/lib/hermesMemory";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { defaultVault } from "@/lib/config";
import fs from "fs";
import path from "path";

export interface WebhookPayload {
  channel: "web" | "whatsapp" | "email" | "system_event" | "api";
  sessionId?: string;
  sender: string;
  message: string;
  squadId?: string;
  eventType?: "LOW_STOCK_ALERT" | "ANAMNESIS_DUE" | "VAULT_SYNC" | "CUSTOM_EVENT";
  metadata?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookPayload = await req.json();
    const { channel = "api", sender = "Desconocido", message, squadId = "squad_1_ceo", eventType, metadata } = body;

    if (!message && !eventType) {
      return NextResponse.json({ ok: false, error: "El parámetro 'message' o 'eventType' es requerido" }, { status: 400 });
    }

    // Determine normalized sessionId
    let targetSessionId = body.sessionId;
    if (!targetSessionId) {
      const sanitizedSender = sender.replace(/[^a-zA-Z0-9_-]/g, "_");
      targetSessionId = `${channel}_${sanitizedSender}`;
    }

    // Get or create persistent session
    const session = getOrCreateSession(targetSessionId, `${channel.toUpperCase()}: ${sender}`, `Sesión Multicanal (${channel})`);

    // Handle System Events vs Direct Messages
    let effectiveQuery = message;
    let systemNotice = "";

    if (eventType === "LOW_STOCK_ALERT") {
      const item = metadata?.item || "Producto Nipëi";
      const count = metadata?.stock ?? 0;
      effectiveQuery = `Alerta de Stock Bajo: ${item} (Stock actual: ${count}). Procedimiento de reabastecimiento y proveedores para Squad II.`;
      systemNotice = `🔔 [EVENTO AUTÓNOMO SQUAD II] Alerta de Stock Bajo recibida para: ${item}`;
    } else if (eventType === "ANAMNESIS_DUE") {
      const patient = metadata?.patient || "Paciente";
      const date = metadata?.date || new Date().toLocaleDateString();
      effectiveQuery = `Recordatorio de Anamnesis: ${patient} fecha ${date}. Protocolo de consulta Squad III.`;
      systemNotice = `🩺 [EVENTO AUTÓNOMO SQUAD III] Recordatorio de Anamnesis generado para: ${patient}`;
    } else if (eventType === "VAULT_SYNC") {
      effectiveQuery = `Sincronización de Nipëi Vault completada. Evento de ingesta.`;
      systemNotice = `📚 [EVENTO AUTÓNOMO SQUAD I] Sincronización del Vault verificada.`;
    }

    // 1. Record incoming user message / event in memory
    const userMsgContent = systemNotice ? `${systemNotice}\n\n${effectiveQuery}` : effectiveQuery;
    appendMessageToSession(targetSessionId, {
      role: "user",
      content: `[Canal: ${channel.toUpperCase()}] ${userMsgContent}`,
    });

    // 2. Perform zero-hallucination RAG query against nipei-vault
    const ragResult = queryVaultGrounding(effectiveQuery, squadId);

    // 3. Handle missing information audit log creation if grounded content is not found
    let auditTaskCreated = false;
    if (ragResult.missingInformation) {
      const vaultRoot = defaultVault();
      if (vaultRoot) {
        const auditDir = path.join(vaultRoot, "Todo_Audit_Lists");
        if (!fs.existsSync(auditDir)) {
          fs.mkdirSync(auditDir, { recursive: true });
        }
        const filename = `Audit_Webhook_${squadId}_${Date.now()}.md`;
        const auditPath = path.join(auditDir, filename);
        const auditContent = `---
title: "Vacío de Ingesta por Evento Multicanal (${channel})"
created_at: "${new Date().toISOString()}"
squad: "${squadId}"
channel: "${channel}"
sender: "${sender}"
event_type: "${eventType || "DIRECT_MSG"}"
status: "PENDING_CURATION"
---

# ⚠️ Vacío de Ingesta Detectado por Hermes 2.0 Webhook

- **Canal de Origen**: \`${channel.toUpperCase()}\`
- **Remitente**: \`${sender}\`
- **Consulta / Evento**: "${effectiveQuery}"
- **Squad Asignado**: \`${squadId}\`

## 📋 Acción Requerida
Curar e ingestar información certificada en \`nipei-vault\` para responder consultas sobre este tema.
`;
        fs.writeFileSync(auditPath, auditContent, "utf-8");
        auditTaskCreated = true;
      }
    }

    // 4. Append assistant grounded reply to session memory
    appendMessageToSession(targetSessionId, {
      role: "assistant",
      content: ragResult.answerText,
      vaultCitations: ragResult.citations.map((c) => c.path),
      groundingScore: ragResult.groundingScore,
    });

    return NextResponse.json({
      ok: true,
      channel,
      sessionId: targetSessionId,
      sender,
      receivedMessage: effectiveQuery,
      reply: ragResult.answerText,
      groundingScore: ragResult.groundingScore,
      isGrounded: ragResult.isGrounded,
      citations: ragResult.citations,
      auditTaskCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in Hermes Webhook Route:", err);
    return NextResponse.json({ ok: false, error: err.message || "Error procesando webhook de Hermes 2.0" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    agent: "Hermes 2.0 Event Trigger Engine",
    supportedChannels: ["web", "whatsapp", "email", "system_event", "api"],
    supportedEventTypes: ["LOW_STOCK_ALERT", "ANAMNESIS_DUE", "VAULT_SYNC", "CUSTOM_EVENT"],
    groundingPolicy: "Strict Zero-Hallucination (Nipëi Vault)",
    timestamp: new Date().toISOString(),
  });
}
