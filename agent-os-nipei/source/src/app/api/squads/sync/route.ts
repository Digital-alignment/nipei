import { NextResponse } from "next/server";
import { syncSquadToVault, SquadRenameLog } from "@/lib/vaultSquadSync";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { squad, renameLog } = body;

    if (!squad || !squad.id || !squad.name) {
      return NextResponse.json({ success: false, error: "Squad inválido" }, { status: 400 });
    }

    const success = syncSquadToVault(squad, renameLog as SquadRenameLog);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("API /api/squads/sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
