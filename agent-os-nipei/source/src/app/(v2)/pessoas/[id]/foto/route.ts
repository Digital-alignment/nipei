import fs from "fs";
import { currentUser } from "@/lib/v2/data";
import { arquivoFoto } from "@/lib/v2/perfil";

// Profile photo from the vault (any logged-in member; the proxy already requires a session).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentUser())) return new Response(null, { status: 401 });
  const f = arquivoFoto((await params).id);
  if (!f) return new Response(null, { status: 404 });
  return new Response(fs.readFileSync(f.abs), { headers: { "Content-Type": f.tipo, "Cache-Control": "private, no-cache" } });
}
