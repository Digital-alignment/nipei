import fs from "fs";
import { currentUser } from "@/lib/v2/data";
import { arquivoComprovante } from "@/lib/v2/comprovantes";

// Receipt of a lançamento (DS 10.25): gestão only, like the rest of Finanças (404 for anyone else).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  const f = me?.gestao ? arquivoComprovante((await params).id) : null;
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(fs.readFileSync(f.abs), { headers: { "Content-Type": f.tipo, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
