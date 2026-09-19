import { NextResponse } from "next/server";
import { autoConnectVaultWikilinks } from "@/lib/vaultSemanticLinker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const companySlug = (body.companySlug || body.slug || "").trim() || undefined;
    const notePath = (body.notePath || "").trim() || undefined;
    const scanAll = Boolean(body.scanAll);

    const result = await autoConnectVaultWikilinks({
      companySlug,
      notePath,
      scanAll,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
