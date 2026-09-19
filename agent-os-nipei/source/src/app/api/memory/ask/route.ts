import { NextResponse } from "next/server";
import { queryVaultGrounding } from "@/lib/hermesRAG";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = (body.question || body.q || "").trim();
    const squadId = body.squadId || body.squad || "squad_1_ceo";

    if (!question) {
      return NextResponse.json({ success: false, error: "La pregunta no puede estar vacía" }, { status: 400 });
    }

    const ragResult = queryVaultGrounding(question, squadId);
    return NextResponse.json({
      success: true,
      query: question,
      squadId,
      ...ragResult,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const question = (url.searchParams.get("question") || url.searchParams.get("q") || "").trim();
  const squadId = url.searchParams.get("squadId") || url.searchParams.get("squad") || "squad_1_ceo";

  if (!question) {
    return NextResponse.json({ success: false, error: "La pregunta no puede estar vacía" }, { status: 400 });
  }

  const ragResult = queryVaultGrounding(question, squadId);
  return NextResponse.json({
    success: true,
    query: question,
    squadId,
    ...ragResult,
  });
}
