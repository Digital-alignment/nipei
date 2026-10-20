import fs from "fs";
import path from "path";
import { currentUser, vault } from "@/lib/v2/data";
import { FONTE_TIPOS, getFontes } from "@/lib/v2/conhecimento";

// Original file of a knowledge source (any logged-in member).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new Response(null, { status: 401 });
  const { id } = await params;
  const f = getFontes().find((x) => x.id === id);
  if (!f?.arquivo) return new Response(null, { status: 404 });
  const abs = path.resolve(vault(), f.arquivo);
  if (!abs.startsWith(path.resolve(vault()) + path.sep) || !fs.existsSync(abs)) return new Response(null, { status: 404 });
  const tipo = FONTE_TIPOS[abs.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
  return new Response(fs.readFileSync(abs), { headers: { "Content-Type": tipo, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" } });
}
