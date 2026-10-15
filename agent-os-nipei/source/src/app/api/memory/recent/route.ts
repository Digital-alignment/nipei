import { NextResponse } from "next/server";
import { recentNotes } from "@/lib/vault";
import { getVaultIndexStats } from "@/lib/vaultIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "200");
  const recent = await recentNotes(limit);
  const stats = await getVaultIndexStats();
  return NextResponse.json({ recent, totalNotes: stats.totalIndexedNotes });
}
