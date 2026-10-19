import fs from "fs";
import { arquivoDaTarefa, currentUser } from "@/lib/v2/data";

export const dynamic = "force-dynamic";

// Serves a file attached to a task. Anyone who can log in can see every task, so the same
// people can open its attachments; only files inside Task_Workspace/<task id>/ are reachable.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; nome: string }> }) {
  if (!(await currentUser())) return new Response("Não autenticado", { status: 401 });
  const { id, nome } = await params;
  const f = arquivoDaTarefa(id, decodeURIComponent(nome));
  if (!f) return new Response("Arquivo não encontrado", { status: 404 });
  return new Response(fs.readFileSync(f.abs), {
    headers: {
      "Content-Type": f.tipo,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, max-age=300", // short: a removed attachment should not linger in the browser
      "X-Content-Type-Options": "nosniff",
    },
  });
}
