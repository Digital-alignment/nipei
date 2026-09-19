import { NextResponse } from "next/server";
import { synthesizeCompanyContext } from "@/lib/companyContextSynthesizer";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("company") || undefined;

    const digest = await synthesizeCompanyContext(companySlug);
    return NextResponse.json(digest);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to synthesize company context digest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
