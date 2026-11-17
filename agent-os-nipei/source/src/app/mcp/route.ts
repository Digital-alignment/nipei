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

// Ready-made requests: Claude and others show them as shortcuts, so a person who doesn't know what to ask has a start.
type Prompt = { name: string; title: string; description: string; arguments?: { name: string; description: string; required: boolean }[]; texto: (a: Record<string, string>) => string };
const PROMPTS: Prompt[] = [
  { name: "minha_semana", title: "Minha semana", description: "Atrasadas, hoje, esta semana e a agenda, com o que fazer primeiro.",
    texto: () => "Use o Nipëi para me mostrar minha semana: tarefas atrasadas, de hoje e dos próximos 7 dias, e os eventos da agenda. Termine sugerindo as 3 coisas que devo fazer primeiro." },
  { name: "pendencias", title: "O que está pendente", description: "Tarefas, pedidos para minhas equipes e fatos para revisar.",
    texto: () => "O que está pendente para mim no Nipëi? Minhas tarefas atrasadas e de hoje, pedidos para as equipes que coordeno e fatos do Conhecimento esperando minha revisão. Seja curto." },
  { name: "resumo_equipe", title: "Resumo da equipe", description: "Como está a semana de uma equipe.", arguments: [{ name: "equipe", description: "nome ou número da equipe (vazio = a minha)", required: false }],
    texto: (a) => `Resuma a semana da ${a.equipe ? `equipe ${a.equipe}` : "minha equipe"} no Nipëi: o que foi feito, o que está atrasado, o que está sem responsável e os próximos eventos.` },
  { name: "perguntar_base", title: "Perguntar à base", description: "Responde só com o conhecimento confirmado do Santuário.", arguments: [{ name: "pergunta", description: "o que você quer saber", required: true }],
    texto: (a) => `Responda usando só a base de conhecimento confirmada do Nipëi (buscar_conhecimento). Se não estiver lá, diga que não está e sugira perguntar à comunidade. Pergunta: ${a.pergunta ?? ""}` },
  { name: "gerar_apresentacao", title: "Gerar apresentação", description: "Slides sobre um tema ou projeto, só com o que está confirmado.", arguments: [{ name: "tema", description: "ex.: Santuário Nipeihu, Inî Rau, retiros", required: true }, { name: "publico", description: "para quem (ex.: aliados, participantes, equipe)", required: false }],
    texto: (a) => `Faça uma apresentação sobre "${a.tema}"${a.publico ? ` para ${a.publico}` : ""}. Primeiro chame dossie (tema "${a.tema}", para "${/equipe|intern/i.test(a.publico ?? "") ? "interno" : "externo"}"); use só o que ele trouxer. Estrutura sugerida: quem somos, contexto/história, o que fazemos, números, pessoas/equipes, próximos passos, contato. Use o Sobre dos projetos como base da narrativa. O que faltar, marque [falta: …]. Se houver fotos no Acervo, indique qual usar em cada slide.` },
  { name: "gerar_proposta", title: "Gerar proposta", description: "Proposta para aliado ou financiador, com base confirmada.", arguments: [{ name: "tema", description: "projeto ou iniciativa", required: true }, { name: "para_quem", description: "organização ou tipo de parceiro", required: false }],
    texto: (a) => `Escreva uma proposta sobre "${a.tema}"${a.para_quem ? ` para ${a.para_quem}` : ""}. Chame dossie (tema "${a.tema}", para "externo") e use só isso. Seções: quem somos, o problema/oportunidade, o que propomos, impacto esperado (com os números do dossiê), equipe, próximos passos. Não invente valores nem resultados: marque [falta: …].` },
  { name: "gerar_texto", title: "Texto para web ou redes", description: "Texto curto ou longo a partir da base confirmada.", arguments: [{ name: "tema", description: "assunto do texto", required: true }, { name: "formato", description: "ex.: post do Instagram, página do site, descrição de retiro", required: false }],
    texto: (a) => `Escreva ${a.formato || "um texto"} sobre "${a.tema}". Chame dossie (tema "${a.tema}", para "externo") e use só isso; tom acolhedor e respeitoso com a cultura Yawanawá. Não invente datas, preços nem nomes: marque [falta: …].` },
  { name: "boas_vindas", title: "Material de boas-vindas", description: "Para quem chega: história, como funciona o lugar e as equipes.",
    texto: () => "Monte um material de boas-vindas para uma pessoa nova na comunidade do Santuário Nipeihu. Chame dossie (tema vazio, para \"interno\") e equipe; explique a história, o propósito, como o lugar funciona (regras e procedimentos), as equipes e a quem pedir o quê. Marque [falta: …] onde a base não souber." },
];

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
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[1], capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: "nipei", title: "Nipëi OS", version: "1.0.0" }, instructions: instrucoesMCP(me),
      });
    }
    if (m.method === "ping") return resposta(m.id, {});
    if (m.method === "tools/list") return resposta(m.id, { tools: ferramentasMCP(me) });
    if (m.method === "tools/call") {
      const nome = String(m.params?.name ?? ""), args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const r = await chamarMCP(me, nome, args, quem);
        const rascunho = !!(r.dados && typeof r.dados === "object" && "precisa_confirmar" in r.dados);
        registrarEvento(g.pessoa, "app de IA", `${g.nomeCliente}: ${nome}${!r.ok ? " (erro)" : rascunho ? " (rascunho)" : ""}`, "mcp");
        return resposta(m.id, { content: [{ type: "text", text: JSON.stringify({ hoje: today(), ...(r.dados && typeof r.dados === "object" && !Array.isArray(r.dados) ? r.dados : { resultado: r.dados }) }) }], isError: !r.ok });
      } catch (e) {
        return resposta(m.id, { content: [{ type: "text", text: `Erro: ${(e as Error).message}` }], isError: true });
      }
    }
    if (m.method === "resources/list") return resposta(m.id, { resources: [] });
    if (m.method === "prompts/list") return resposta(m.id, { prompts: PROMPTS.map(({ texto: _, ...p }) => p) });
    if (m.method === "prompts/get") {
      const p = PROMPTS.find((x) => x.name === m.params?.name);
      if (!p) return erro(m.id, -32602, "Prompt desconhecido");
      const args = Object.fromEntries(Object.entries((m.params?.arguments ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "").slice(0, 500)]));
      return resposta(m.id, { description: p.description, messages: [{ role: "user", content: { type: "text", text: p.texto(args) } }] });
    }
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
