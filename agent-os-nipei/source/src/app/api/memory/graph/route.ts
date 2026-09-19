import { NextResponse } from "next/server";
import { buildVaultGraph } from "@/lib/vaultGraph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") || undefined;

    const data = await buildVaultGraph(company);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to build graph";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
