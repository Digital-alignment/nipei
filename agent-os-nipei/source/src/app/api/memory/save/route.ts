import { NextRequest, NextResponse } from "next/server";
import { writeNote } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: relPath, content } = body;

    if (!relPath || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Parámetros 'path' y 'content' requeridos" }, { status: 400 });
    }

    const res = await writeNote(relPath, content);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, path: relPath, mtime: res.mtime });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
