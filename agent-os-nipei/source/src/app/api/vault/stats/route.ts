import { NextResponse } from "next/server";
import { getVaultIndexStats } from "@/lib/vaultIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getVaultIndexStats();
    return NextResponse.json({
      success: true,
      ...stats,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
