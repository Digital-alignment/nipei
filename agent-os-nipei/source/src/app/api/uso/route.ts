import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { contarMinuto } from "@/lib/v2/uso";

export const dynamic = "force-dynamic";

// One-minute usage pulse from components/v2/PulsoUso.tsx. Public in the proxy (members aren't allowed in
// /api), so it checks the session itself; it only ever counts minutes for the logged-in person.
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me?.pessoa) return new NextResponse(null, { status: 204 });
  const { caminho = "" } = await req.json().catch(() => ({}));
  try { contarMinuto(me.pessoa.id, String(caminho).slice(0, 200)); } catch { /* never bother the page */ }
  return new NextResponse(null, { status: 204 });
}
