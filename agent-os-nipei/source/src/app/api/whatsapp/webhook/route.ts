import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { vault } from "@/lib/v2/data";
import { processarEntrada } from "@/lib/v2/whatsappEntrada";

export const dynamic = "force-dynamic";

// Evolution API webhook for the Nipëi number (public route: checks ?token= against NIPEI_WHATSAPP_WEBHOOK_SECRET).
// Answers at once and handles the message in the background, so Evolution never times out on the AI.
export async function POST(req: Request) {
  const segredo = process.env.NIPEI_WHATSAPP_WEBHOOK_SECRET ?? "";
  const dado = Buffer.from(new URL(req.url).searchParams.get("token") ?? "");
  if (!segredo || dado.length !== Buffer.byteLength(segredo) || !timingSafeEqual(dado, Buffer.from(segredo))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const b = await req.json().catch(() => null);
  if (b?.event === "messages.upsert" || b?.event === "MESSAGES_UPSERT") {
    // last arrival, for the admin panel's health check (no content kept)
    try { const d = path.join(vault(), ".jobs", "estado"); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "whatsapp-entrada.json"), JSON.stringify({ em: new Date().toISOString() })); } catch { /* ignore */ }
    for (const d of Array.isArray(b.data) ? b.data : [b.data]) void processarEntrada(d).catch((e) => console.error("[whatsapp entrada]", e));
  }
  return NextResponse.json({ ok: true });
}
