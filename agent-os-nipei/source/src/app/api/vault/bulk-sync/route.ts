import { NextResponse } from "next/server";
import { executeBulkVaultSync } from "@/lib/vaultBulkSync";
import { SquadMeta, MemberProfile } from "@/lib/nipeiStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { squads, members } = body;

    const squadsList: SquadMeta[] = Array.isArray(squads) ? squads : [];
    const membersList: MemberProfile[] = Array.isArray(members) ? members : [];

    const summary = executeBulkVaultSync(squadsList, membersList);
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error("API /api/vault/bulk-sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
