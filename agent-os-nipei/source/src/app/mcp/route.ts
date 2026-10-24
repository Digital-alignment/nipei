import { NextResponse } from "next/server";
import { meDaPessoa, today } from "@/lib/v2/data";
import { base, concessaoDoToken } from "@/lib/v2/oauthMcp";
import { chamarMCP, ferramentasMCP, instrucoesMCP } from "@/lib/v2/assistente";
import { CORS } from "./cors";
import { registrarEvento } from "@/lib/v2/eventos";
import { funcaoLigada } from "@/lib/v2/funcoes";

export const dynamic = "force-dynamic";

// Nipëi as a remote MCP server (Streamable HTTP, stateless, JSON responses). Each request carries the
// person's OAuth token; tools run with that person's permissions, and changes are logged "via <app>".
const VERSOES = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const resposta = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const erro = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export async function POST(req: Request) {
  const b = base(new URL(req.url).origin);
  const g = concessaoDoToken(req.headers.get("authorization"));
  const me = g ? meDaPessoa(g.pessoa) : null;
  if (!g || !me) {
    // tells the client where to log in (RFC 9728)
    return NextResponse.json(erro(null, -32001, "Não autenticado"), {
      status: 401, headers: { ...CORS, "WWW-Authenticate": `Bearer resource_metadata="${b}/.well-known/oauth-protected-resource", error="invalid_token"` },
    });
  }
  if (!funcaoLigada("mcp", me)) return NextResponse.json(erro(null, -32003, "Apps de IA desativados para esta pessoa no Nipëi"), { status: 403, headers: CORS });
  let corpo: Rpc | Rpc[];
  try { corpo = await req.json(); } catch { return NextResponse.json(erro(null, -32700, "JSON inválido"), { status: 400, headers: CORS }); }
  const quem = `${me.pessoa?.name.split(" (")[0] ?? me.username} (via ${g.nomeCliente})`;

  const tratar = async (m: Rpc) => {
    if (m.id === undefined) return null; // notification (e.g. notifications/initialized): no answer
    if (m.method === "initialize") {
      const pedida = String(m.params?.protocolVersion ?? "");
      return resposta(m.id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[1], capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "nipei", title: "Nipëi OS", version: "1.0.0" }, instructions: instrucoesMCP(me),
      });
    }
    if (m.method === "ping") return resposta(m.id, {});
    if (m.method === "tools/list") return resposta(m.id, { tools: ferramentasMCP(me) });
    if (m.method === "tools/call") {
      const nome = String(m.params?.name ?? ""), args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const r = await chamarMCP(me, nome, args, quem);
        registrarEvento(g.pessoa, "app de IA", `${g.nomeCliente}: ${nome}${r.ok ? "" : " (erro)"}`, "mcp");
        return resposta(m.id, { content: [{ type: "text", text: JSON.stringify({ hoje: today(), ...(r.dados && typeof r.dados === "object" && !Array.isArray(r.dados) ? r.dados : { resultado: r.dados }) }) }], isError: !r.ok });
      } catch (e) {
        return resposta(m.id, { content: [{ type: "text", text: `Erro: ${(e as Error).message}` }], isError: true });
      }
    }
    if (m.method === "resources/list") return resposta(m.id, { resources: [] });
    if (m.method === "prompts/list") return resposta(m.id, { prompts: [] });
    return erro(m.id, -32601, `Método não suportado: ${m.method}`);
  };

  const lote = Array.isArray(corpo);
  const msgs: Rpc[] = Array.isArray(corpo) ? corpo : [corpo];
  const saidas = (await Promise.all(msgs.map(tratar))).filter(Boolean);
  if (!saidas.length) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(lote ? saidas : saidas[0], { headers: CORS });
}

// Stateless server: no SSE stream to open and no session to close.
export const GET = () => new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
export const DELETE = () => new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
