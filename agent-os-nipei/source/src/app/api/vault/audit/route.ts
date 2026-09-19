import { NextResponse } from "next/server";
import { runVaultAudit } from "@/lib/vaultConflictAuditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companySlug = searchParams.get("companySlug") || searchParams.get("slug") || undefined;
    const maxAgeDaysStr = searchParams.get("maxAgeDays");
    const model = searchParams.get("model") || "google/gemini-2.5-flash";

    const maxAgeDays = maxAgeDaysStr ? parseInt(maxAgeDaysStr, 10) : 60;

    const report = await runVaultAudit({
      companySlug,
      maxAgeDays,
      model,
    });

    return NextResponse.json(report);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const companySlug = (body.companySlug || body.slug || "").trim() || undefined;
    const maxAgeDays = typeof body.maxAgeDays === "number" ? body.maxAgeDays : 60;
    const model = body.model || "google/gemini-2.5-flash";

    const report = await runVaultAudit({
      companySlug,
      maxAgeDays,
      model,
    });

    return NextResponse.json(report);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
