import { NextRequest, NextResponse } from "next/server";
import { recordTaskCommunication, getTaskWorkspaceData, getTaskWorkspace } from "@/lib/taskWorkspace";
import type { CommunicationChannel, CommunicationStatus, TaskCommunication } from "@/lib/nipeiStore";
import { gmailSend } from "@/lib/outreachBackends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default Evolution API config from env
const DEFAULT_EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || "https://evolution.digital-alignment.com";
const DEFAULT_EVOLUTION_KEY =
  process.env.EVOLUTION_API_KEY || "3f91c0493c3f10458d59f094d4218d88d4a755a5e777bb846d44531cb65b35b4";
const DEFAULT_EVOLUTION_INSTANCE =
  process.env.EVOLUTION_INSTANCE_NAME || "nipei-santuario";

export interface DispatchRequestBody {
  taskId: string;
  taskTitle: string;
  taskSquad?: string;
  channel: CommunicationChannel;
  recipient: string;
  recipientName?: string;
  subject?: string;
  messageText: string;
  deliverableId?: string;
  agentId?: string;
  simulate?: boolean;
  customEvolutionUrl?: string;
  customEvolutionKey?: string;
  customEvolutionInstance?: string;
  customSmtpFrom?: string;
}

// Clean and normalize Brazilian & International phone numbers for WhatsApp
function sanitizePhoneNumber(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  // If Brazilian number without country code (10 or 11 digits: DDD + number), prepend 55
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  return cleaned;
}

// GET: Check connection state or list communications for a task
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkTarget = searchParams.get("check");
    const taskId = searchParams.get("taskId");
    const squadId = searchParams.get("squadId") || undefined;
    const taskTitle = searchParams.get("taskTitle") || undefined;

    // 1. Check WhatsApp connection health
    if (checkTarget === "whatsapp") {
      const evoUrl = searchParams.get("evoUrl") || DEFAULT_EVOLUTION_URL;
      const evoKey = searchParams.get("evoKey") || DEFAULT_EVOLUTION_KEY;
      const evoInstance = searchParams.get("evoInstance") || DEFAULT_EVOLUTION_INSTANCE;

      try {
        const stateRes = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, {
          headers: { apikey: evoKey },
          cache: "no-store",
        });

        if (stateRes.ok) {
          const stateData = await stateRes.json();
          const state = stateData?.instance?.state || "close";
          return NextResponse.json({
            success: true,
            channel: "whatsapp",
            connected: state === "open",
            state,
            instance: evoInstance,
            serverUrl: evoUrl,
          });
        } else {
          return NextResponse.json({
            success: true,
            channel: "whatsapp",
            connected: false,
            state: "disconnected_or_not_found",
            instance: evoInstance,
            serverUrl: evoUrl,
            error: `Evolution API respondeu com status ${stateRes.status}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: true,
          channel: "whatsapp",
          connected: false,
          state: "offline",
          instance: evoInstance,
          serverUrl: evoUrl,
          error: err.message || "Não foi possível conectar ao servidor da Evolution API",
        });
      }
    }

    // 2. List communications for a specific task
    if (taskId) {
      const data = getTaskWorkspaceData(taskId, squadId, taskTitle);
      return NextResponse.json({
        success: true,
        taskId,
        communications: data.communications || [],
      });
    }

    return NextResponse.json(
      { error: "Parâmetro 'check=whatsapp' ou 'taskId' é obrigatório" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Erro na rota GET /api/agent-kanban/dispatch:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Core outbound dispatch logic exported for direct programmatic use (e.g. from Venu / Kanban Action)
export async function executeDispatchCommunication(payload: DispatchRequestBody): Promise<{
  success: boolean;
  communication?: TaskCommunication;
  message?: string;
  error?: string;
}> {
  if (!payload.taskId || !payload.taskTitle || !payload.channel || !payload.recipient || !payload.messageText) {
    return {
      success: false,
      error: "Campos obrigatórios: 'taskId', 'taskTitle', 'channel', 'recipient' e 'messageText'",
    };
  }

  const agentId = payload.agentId || "@hermes";
  let status: CommunicationStatus = "sent";
  let externalId: string | undefined = undefined;
  let errorMessage: string | undefined = undefined;

  // ──────────────────────────────────────────────────────────
  // 1. CANAL: WHATSAPP (EVOLUTION API)
  // ──────────────────────────────────────────────────────────
  if (payload.channel === "whatsapp") {
    const cleanPhone = sanitizePhoneNumber(payload.recipient);

    if (payload.simulate) {
      status = "simulated";
      externalId = `sim-wa-${Date.now()}`;
    } else {
      const evoUrl = payload.customEvolutionUrl?.trim() || DEFAULT_EVOLUTION_URL;
      const evoKey = payload.customEvolutionKey?.trim() || DEFAULT_EVOLUTION_KEY;
      const evoInstance = payload.customEvolutionInstance?.trim() || DEFAULT_EVOLUTION_INSTANCE;

      try {
        // Send text message payload compatible with Evolution API v1 & v2
        const sendRes = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evoKey,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: payload.messageText,
            textMessage: {
              text: payload.messageText,
            },
            options: {
              delay: 1200,
              presence: "composing",
            },
          }),
        });

        const data = await sendRes.json().catch(() => ({}));

        if (sendRes.ok && (data.key || data.status === "SUCCESS" || data.messageId)) {
          status = "sent";
          externalId = data.key?.id || data.messageId || `wa-${Date.now()}`;
        } else {
          console.warn("Falha no envio da Evolution API:", data);
          // If the instance is closed or disconnected, we record as simulated/fallback with reason
          status = "simulated";
          errorMessage = data.message || data.error || `Instância WhatsApp '${evoInstance}' não conectada. Mensagem registrada como simulação auditada.`;
        }
      } catch (fetchErr: any) {
        console.warn("Erro de conexão com Evolution API:", fetchErr);
        status = "simulated";
        errorMessage = `Servidor Evolution offline ou inacessível (${fetchErr.message}). Registrado como simulação auditada.`;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 2. CANAL: E-MAIL EXECUTIVO (HERMES OUTREACH / GMAIL)
  // ──────────────────────────────────────────────────────────
  else if (payload.channel === "email") {
    const emailSubject =
      payload.subject?.trim() ||
      `[Nipëi OS] Atualização da Tarefa: ${payload.taskTitle}`;

    if (payload.simulate) {
      status = "simulated";
      externalId = `sim-mail-${Date.now()}`;
    } else {
      try {
        const res = await gmailSend(payload.recipient.trim(), emailSubject, payload.messageText, false);
        if (res.ok) {
          status = "sent";
          externalId = `mail-${Date.now()}`;
        } else {
          status = "simulated";
          errorMessage = `Envio de e-mail registrado como rascunho/simulado (${res.detail || "Gmail CLI não autenticado no servidor"}).`;
        }
      } catch (mailErr: any) {
        status = "simulated";
        errorMessage = `Falha no backend de e-mail (${mailErr.message}). Registrado como simulação auditada.`;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. CANAL: WEBHOOK N8N / AUTOMAÇÃO
  // ──────────────────────────────────────────────────────────
  else if (payload.channel === "webhook_n8n") {
    const webhookUrl = payload.recipient.trim();

    if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
      return {
        success: false,
        error: "URL do webhook n8n inválida (deve iniciar com http:// ou https://)",
      };
    }

    if (payload.simulate) {
      status = "simulated";
      externalId = `sim-n8n-${Date.now()}`;
    } else {
      try {
        const hookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Nipei-Agent-OS/1.0",
          },
          body: JSON.stringify({
            event: "task_communication_dispatched",
            taskId: payload.taskId,
            taskTitle: payload.taskTitle,
            squad: payload.taskSquad,
            agentId,
            recipient: payload.recipient,
            message: payload.messageText,
            deliverableId: payload.deliverableId,
            timestamp: new Date().toISOString(),
          }),
        });

        if (hookRes.ok) {
          status = "sent";
          externalId = `n8n-${Date.now()}`;
        } else {
          status = "failed";
          errorMessage = `Webhook respondeu com status ${hookRes.status}`;
        }
      } catch (hookErr: any) {
        status = "failed";
        errorMessage = `Falha ao alcançar webhook: ${hookErr.message}`;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 4. PERSISTÊNCIA CANÔNICA NO WORKSPACE DA TAREFA
  // ──────────────────────────────────────────────────────────
  const commRecord = recordTaskCommunication(
    payload.taskId,
    payload.taskSquad,
    payload.taskTitle,
    {
      channel: payload.channel,
      recipient: payload.recipient,
      recipientName: payload.recipientName,
      subject: payload.subject,
      messageText: payload.messageText,
      deliverableId: payload.deliverableId,
      status,
      agentId,
      externalId,
      error: errorMessage,
    }
  );

  // Build user-friendly feedback message
  let feedback = "";
  if (payload.channel === "whatsapp") {
    feedback = status === "sent"
      ? `WhatsApp enviado com sucesso para ${payload.recipientName || payload.recipient} via Evolution API!`
      : `WhatsApp registrado com sucesso no workspace (${errorMessage || "Modo simulação auditado"})!`;
  } else if (payload.channel === "email") {
    feedback = status === "sent"
      ? `E-mail executivo disparado com sucesso para ${payload.recipient}!`
      : `E-mail registrado com sucesso no workspace (${errorMessage || "Modo simulação auditado"})!`;
  } else {
    feedback = status === "sent"
      ? `Webhook disparado com sucesso para o n8n!`
      : `Webhook registrado com erro: ${errorMessage}`;
  }

  return {
    success: true,
    message: feedback,
    communication: commRecord,
  };
}

// POST: Execute outbound dispatch (WhatsApp, Email or Webhook)
export async function POST(req: NextRequest) {
  try {
    const payload: DispatchRequestBody = await req.json();
    const result = await executeDispatchCommunication(payload);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Erro interno ao processar despacho" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na rota POST /api/agent-kanban/dispatch:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno ao processar despacho" },
      { status: 500 }
    );
  }
}
