import { NextResponse } from "next/server";
import { ensureCompanyTaxonomy, autoInjectCompanyWikilinks } from "@/lib/vaultTaxonomy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companySlug, companyName } = body;

    if (!companySlug) {
      return NextResponse.json({ error: "Missing required companySlug" }, { status: 400 });
    }

    const cName = companyName || companySlug.toUpperCase();
    const result = await ensureCompanyTaxonomy(companySlug, cName);

    return NextResponse.json({
      success: true,
      companySlug,
      companyName: cName,
      createdNotes: result.createdNotes,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to organize company taxonomy";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
