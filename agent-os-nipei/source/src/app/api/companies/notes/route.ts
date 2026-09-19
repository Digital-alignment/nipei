import { NextResponse } from "next/server";
import { getCompanyNotes } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim();
    const name = (url.searchParams.get("name") || "").trim();
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (!slug && !name) {
      return NextResponse.json({ success: false, error: "slug o name de empresa son requeridos." }, { status: 400 });
    }

    const notes = await getCompanyNotes(slug, name, limit);
    return NextResponse.json({
      success: true,
      slug,
      name,
      count: notes.length,
      notes,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
