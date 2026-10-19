import { NextResponse } from "next/server";
import { isValidApiToken } from "@/lib/auth";
import { receberEntrega } from "@/lib/v2/trabalhos";

export const dynamic = "force-dynamic";

// Called only by the Hermes worker on the VPS host (scripts/hermes-worker), with NIPEI_API_TOKEN.
export async function POST(req: Request) {
  if (!isValidApiToken(req.headers.get("authorization"))) return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const job = await receberEntrega(String(body.job ?? ""), body.ok === true, String(body.resultado ?? "").slice(0, 400_000));
    return NextResponse.json({ ok: true, estado: job.estado, arquivo: job.arquivo ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
