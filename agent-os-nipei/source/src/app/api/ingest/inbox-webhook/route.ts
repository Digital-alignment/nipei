import { NextResponse } from "next/server";
import { processInboxPayload } from "@/lib/nipeiInboxEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Secret Token check for remote webhooks (n8n / Make / Twilio / WhatsApp)
function authenticateWebhook(req: Request): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const secretEnv = process.env.NIPEI_WEBHOOK_SECRET;

  // If no secret env configured, allow local calls with warning
  if (!secretEnv) return true;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token === secretEnv;
  }

  const urlToken = new URL(req.url).searchParams.get("token");
  return urlToken === secretEnv;
}

export async function POST(req: Request) {
  try {
    if (!authenticateWebhook(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing NIPEI_WEBHOOK_SECRET Bearer token." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    // Multipart Form Data (Audio / Image / File Upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = (formData.get("text") as string) || (formData.get("message") as string) || "";
      const sender = (formData.get("sender") as string) || (formData.get("from") as string) || "WhatsApp User";
      const companySlug = (formData.get("companySlug") as string) || "";
      const companyName = (formData.get("companyName") as string) || "";
      const videoUrl = (formData.get("videoUrl") as string) || "";
      const routerModel = (formData.get("routerModel") as string) || "google/gemini-2.5-flash";
      const visionModel = (formData.get("visionModel") as string) || "google/gemini-2.5-flash";

      let fileBuffer: Buffer | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;

      if (file) {
        const bytes = await file.arrayBuffer();
        fileBuffer = Buffer.from(bytes);
        fileName = file.name;
        mimeType = file.type;
      }

      const result = await processInboxPayload({
        text,
        sender,
        companySlug,
        companyName,
        videoUrl,
        routerModel,
        visionModel,
        fileBuffer,
        fileName,
        mimeType,
      });

      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    // JSON Payload (Text / Telegram / Webhook)
    const body = await req.json().catch(() => ({}));
    const text = body.text || body.message || body.caption || "";
    const sender = body.sender || body.from || body.user || "WhatsApp / Telegram User";
    const companySlug = body.companySlug || body.slug || "";
    const companyName = body.companyName || body.name || "";
    const videoUrl = body.videoUrl || body.url || "";
    const taskAction = body.taskAction || body.action;
    const targetTaskStatus = body.targetTaskStatus || body.status;
    const routerModel = body.routerModel || "google/gemini-2.5-flash";
    const visionModel = body.visionModel || "google/gemini-2.5-flash";

    const result = await processInboxPayload({
      text,
      sender,
      companySlug,
      companyName,
      videoUrl,
      taskAction,
      targetTaskStatus,
      routerModel,
      visionModel,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
