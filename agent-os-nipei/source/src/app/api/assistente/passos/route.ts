import { currentUser } from "@/lib/v2/data";
import { getPassos } from "@/lib/v2/pinuPassos";

// The Pinu panel polls this while an answer is being prepared (DS 10.11). A GET route, not a server action:
// Next runs a client's server actions one at a time, so a poll action would wait behind the conversation itself.
export async function GET() {
  const me = await currentUser({ leitura: true });
  if (!me) return Response.json({ passos: [] }, { status: 401 });
  return Response.json({ passos: getPassos(me.pessoa?.id ?? me.username) }, { headers: { "Cache-Control": "no-store" } });
}
