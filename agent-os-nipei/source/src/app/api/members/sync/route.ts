import { NextResponse } from "next/server";
import { syncMemberToVault } from "@/lib/vaultMemberSync";
import { MemberProfile } from "@/lib/nipeiStore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { member } = body;

    if (!member || !member.id || !member.name) {
      return NextResponse.json({ success: false, error: "Miembro inválido" }, { status: 400 });
    }

    const success = syncMemberToVault(member as MemberProfile);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("API /api/members/sync error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
