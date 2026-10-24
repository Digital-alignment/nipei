import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { enviarWhatsApp } from "@/lib/v2/whatsapp";
import { bloqueado, contarFalha, podeEntrar, resolverPessoa } from "@/lib/v2/seguranca";

export const dynamic = "force-dynamic";

const HORA = 3600_000;
const RESPOSTA = { ok: true, mensagem: "Se encontramos você e seu WhatsApp está verificado, o link chega em instantes. Ele vale 15 minutos." };

// "Receber link no WhatsApp" / "Esqueci minha senha" (public). Sends a 15-minute login link to the person's
// VERIFIED WhatsApp only. Always the same answer (nobody learns who exists); 3 per person and 10 per IP an hour.
export async function POST(req: Request) {
  const { ident = "" } = await req.json().catch(() => ({}));
  const q = String(ident).trim().toLowerCase().slice(0, 120);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!q || bloqueado(`lk:${q}`, 3, HORA) || bloqueado(`lkip:${ip}`, 10, HORA)) return NextResponse.json(RESPOSTA);
  contarFalha(`lk:${q}`); contarFalha(`lkip:${ip}`); // counts every request, not only failures
  const p = resolverPessoa(q);
  if (p && p.whatsapp && p.whatsappVerificado && podeEntrar(p)) {
    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const link = `${base}/entrar?token=${signToken("login-link", p.id, 900)}`;
    await enviarWhatsApp(p.whatsapp, `🔑 Seu link para entrar no Nipëi (vale 15 minutos):\n${link}\n\nSe não foi você que pediu, ignore esta mensagem.`);
  }
  return NextResponse.json(RESPOSTA);
}
