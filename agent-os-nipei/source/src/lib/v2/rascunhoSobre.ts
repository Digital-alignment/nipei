// "Sobre a equipe" (DS 10.13): the Pinu drafts the four sections from what the team already has
// (themes, tasks, requests received, confirmed facts). Nothing is saved here: the form shows it and "Salvar" writes.
import { chamarIA, contarUso } from "./ia";
import { getEquipes, getPessoas, getTarefas, SOBRE_SECOES, today, type Me, type SobreEquipe } from "./data";
import { getFatos } from "./conhecimento";

const MAX = 1500;

/** Pure: four strings, each trimmed to the field's limit; an empty answer keeps what was already written. */
export function limparRascunho(o: Record<string, unknown>, atual: Partial<SobreEquipe>): SobreEquipe {
  return Object.fromEntries(SOBRE_SECOES.map(([k]) => {
    const v = typeof o[k] === "string" ? (o[k] as string).replace(/\r\n/g, "\n").replace(/^#+ /gm, "").trim() : "";
    return [k, (v || atual[k] || "").slice(0, MAX)];
  })) as SobreEquipe;
}

const SISTEMA = `Você ajuda a coordenação de uma equipe do Santuário Nipëihu a escrever o "Sobre a equipe", que todos leem e que o assistente usa para saber a quem levar cada pedido. Escreva em português do Brasil, simples e concreto, sem enfeite, a partir só do que o contexto mostra (não invente nomes, números nem regras):
- "proposito": para que a equipe existe, em 2 ou 3 frases;
- "decide": o que a equipe resolve sozinha, sem perguntar (lista curta com "- ");
- "naoFaz": o que costumam pedir a ela mas é de outra equipe, dizendo de qual quando der (lista curta com "- ");
- "comoPedir": como pedir algo: o que mandar junto, por onde (pedido no Nipëi), com quanta antecedência se o contexto disser.
Se já houver texto escrito numa seção, mantenha o que ele diz e só complete. Responda só com JSON: {"proposito":"","decide":"","naoFaz":"","comoPedir":""}`;

export async function rascunhoSobre(me: Me, equipeId: string, atual: Partial<SobreEquipe>): Promise<SobreEquipe> {
  contarUso(me.username);
  const equipes = getEquipes().filter((e) => !e.contatos);
  const e = equipes.find((x) => x.id === equipeId);
  if (!e) throw new Error("Equipe não encontrada");
  const desde = new Date(Date.parse(`${today()}T12:00:00Z`) - 120 * 86_400_000).toISOString().slice(0, 10);
  const daEquipe = getTarefas().filter((t) => t.equipe === e.id);
  const tarefas = daEquipe.filter((t) => !t.pedidoPor && (t.status !== "done" || (t.concluidoEm || t.atualizadoEm) >= desde)).slice(0, 80);
  const pedidos = daEquipe.filter((t) => t.pedidoPor).slice(-30);
  const fatos = getFatos().filter((f) => f.status === "confirmado" && f.equipe === e.id).slice(0, 40);
  const coord = getPessoas().filter((p) => e.coordenadores.includes(p.id)).map((p) => p.name.split(" (")[0]);
  const texto = [
    `Equipe: ${e.nome}${coord.length ? ` (coordenação: ${coord.join(", ")})` : ""}.`,
    e.temas.length ? `Temas: ${e.temas.join(", ")}.` : "",
    e.areas.length ? `Áreas: ${e.areas.join(", ")}.` : "",
    `\nOutras equipes (para "o que não faz"):\n${equipes.filter((x) => x.id !== e.id).map((x) => `- ${x.nome}${x.temas.length ? `: ${x.temas.slice(0, 6).join(", ")}` : ""}`).join("\n")}`,
    tarefas.length ? `\nTarefas da equipe (abertas e feitas nos últimos 120 dias):\n${tarefas.map((t) => `- ${t.title}`).join("\n")}` : "",
    pedidos.length ? `\nPedidos que a equipe recebeu:\n${pedidos.map((t) => `- ${t.title}${t.pedidoRecusado ? " (recusado)" : ""}`).join("\n")}` : "",
    fatos.length ? `\nFatos confirmados desta equipe:\n${fatos.map((f) => `- ${f.texto.slice(0, 200)}`).join("\n")}` : "",
    `\nJá escrito:\n${SOBRE_SECOES.map(([k, titulo]) => `## ${titulo}\n${atual[k]?.trim() || "(vazio)"}`).join("\n")}`,
  ].filter(Boolean).join("\n");
  const { o } = await chamarIA(SISTEMA, [{ type: "text", text: texto }], 1500, 45_000);
  return limparRascunho(o, atual);
}

if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/rascunhoSobre.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const r = limparRascunho({ proposito: "## Propósito\nCuidar da casa.", decide: "- compras do dia a dia", naoFaz: 3, comoPedir: "" }, { comoPedir: "Pelo pedido no Nipëi." });
  assert(r.proposito === "Propósito\nCuidar da casa.", `sem cabeçalho markdown: ${JSON.stringify(r.proposito)}`);
  assert(r.decide === "- compras do dia a dia", "texto");
  assert(r.naoFaz === "", "não-texto vira vazio");
  assert(r.comoPedir === "Pelo pedido no Nipëi.", "vazio mantém o já escrito");
  assert(limparRascunho({ proposito: "x".repeat(2000) }, {}).proposito.length === MAX, "limite do campo");
  console.log(`rascunhoSobre: ${ok} ok`);
}
