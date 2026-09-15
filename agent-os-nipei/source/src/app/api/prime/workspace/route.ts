import { listPrimeBuilds, primeInstalled } from "@/lib/primeAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { installed: primeInstalled(), builds: await listPrimeBuilds() },
    { headers: { "cache-control": "no-store" } },
  );
}
