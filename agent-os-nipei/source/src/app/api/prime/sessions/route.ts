import { listPrimeSessions, readPrimeTranscript } from "@/lib/primeAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const t = await readPrimeTranscript(id);
    if (!t) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json(t, { headers: { "cache-control": "no-store" } });
  }
  return Response.json({ sessions: await listPrimeSessions() }, { headers: { "cache-control": "no-store" } });
}
