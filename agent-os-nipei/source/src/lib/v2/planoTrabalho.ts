// "Agenda work plan" (Acervo tab, gestão only): Lynn's homework (team-development model) as a checklist —
// per section and question, what is answered, drafted or missing, plus the deliverables around it
// (finance period, lists, meetings, reports, code, final document). Reads only; never answer texts.
import { getPessoas, type Pessoa } from "./data";
import { getColetivo, getDiagnosticos, getDocumento, getRespostas, participantes, type Diagnostico } from "./diagnostico";

export type EstadoPlano = "feito" | "rascunho" | "falta";
export type PerguntaPlano = {
  id: string; texto: string; texto_en: string; escopo: "individual" | "coletivo";
  feitas: number; rascunhos: number; total: number; estado: EstadoPlano;
  faltam: string[]; // individual: who has not answered yet
  rascunhoDe: string[]; // individual: who has a draft not confirmed yet
  responsavel: string; falta: string; // collective: section owner and the gap note
};
export type SecaoPlano = { id: string; numero: number; titulo: string; titulo_en: string; escopo: "individual" | "coletivo"; perguntas: PerguntaPlano[]; feitas: number; rascunhos: number; total: number };
export type Entregavel = { id: string; rotulo: string; rotulo_en: string; feito: boolean; detalhe: string; href: string };
export type Plano = { d: Diagnostico; pessoas: Pessoa[]; secoes: SecaoPlano[]; entregaveis: Entregavel[]; feitas: number; rascunhos: number; total: number };

/** Order of the sections in Lynn's document (the model stores the individual ones first). */
export const ORDEM_LYNN = ["compromisso", "papel", "retiro", "financas", "marketing", "acordos", "espaco", "visao"];

const estado = (feitas: number, rascunhos: number, total: number): EstadoPlano => (total > 0 && feitas >= total ? "feito" : feitas + rascunhos > 0 ? "rascunho" : "falta");

/** The open team-development assessment (the newest one if there are several). */
export function diagnosticoLynn(): Diagnostico | null {
  const ds = getDiagnosticos().filter((d) => d.modelo.id === "team-development");
  return ds.find((d) => d.status === "aberto") ?? ds[0] ?? null;
}

export function planoTrabalho(d = diagnosticoLynn()): Plano | null {
  if (!d) return null;
  const autor = d.modelo.autor.toLowerCase();
  // Lynn wrote the homework: she is not one of the people answering it
  const pessoas = participantes(d).filter((p) => !p.name.toLowerCase().startsWith(autor));
  const curto = (p: Pessoa) => p.name.split(" (")[0];
  const nomeDe = (id: string) => { const p = getPessoas().find((x) => x.id === id); return p ? curto(p) : id; };
  const respostas = new Map(pessoas.map((p) => [p.id, getRespostas(d.id, p.id)]));
  const c = getColetivo(d.id);

  const secoes = [...d.modelo.secoes].sort((a, b) => (ORDEM_LYNN.indexOf(a.id) + 99) % 99 - (ORDEM_LYNN.indexOf(b.id) + 99) % 99).map((s, i): SecaoPlano => {
    const perguntas = s.perguntas.map((q): PerguntaPlano => {
      if (s.escopo === "coletivo") {
        const r = c.respostas[q.id];
        const feitas = r?.status === "respondida" ? 1 : 0, rascunhos = !feitas && r?.texto ? 1 : 0;
        return { id: q.id, texto: q.texto, texto_en: q.texto_en, escopo: "coletivo", feitas, rascunhos, total: 1, estado: estado(feitas, rascunhos, 1), faltam: [], rascunhoDe: [], responsavel: c.responsaveis[s.id] ? nomeDe(c.responsaveis[s.id]) : "", falta: r?.falta ?? "" };
      }
      const st = pessoas.map((p) => respostas.get(p.id)?.[q.id]);
      const feitas = st.filter((r) => r?.status === "respondida").length;
      const rascunhos = st.filter((r) => r?.texto && r.status !== "respondida").length;
      const faltam = pessoas.filter((_, k) => st[k]?.status !== "respondida").map(curto);
      const rascunhoDe = pessoas.filter((_, k) => st[k]?.texto && st[k]?.status !== "respondida").map(curto);
      return { id: q.id, texto: q.texto, texto_en: q.texto_en, escopo: "individual", feitas, rascunhos, total: pessoas.length, estado: estado(feitas, rascunhos, pessoas.length), faltam, rascunhoDe, responsavel: "", falta: "" };
    });
    const soma = (k: "feitas" | "rascunhos" | "total") => perguntas.reduce((n, q) => n + q[k], 0);
    return { id: s.id, numero: i + 1, titulo: s.titulo, titulo_en: s.titulo_en, escopo: s.escopo, perguntas, feitas: soma("feitas"), rascunhos: soma("rascunhos"), total: soma("total") };
  });

  const base = `/diagnosticos/${d.id}`;
  const aceites = Object.values(c.codigo.aceites).filter((a) => a.versao === c.codigo.versao).length;
  const itens = Object.values(c.itens).flat().length;
  const data = (x: string) => x.split("-").reverse().join("/");
  const entregaveis: Entregavel[] = [
    { id: "periodo", rotulo: "Período financeiro do retiro e da dieta", rotulo_en: "Retreat & dieta finance period", feito: !!(c.periodo.de && c.periodo.ate), detalhe: c.periodo.de ? `${data(c.periodo.de)} – ${data(c.periodo.ate)}` : "", href: `${base}/coletivo?secao=financas` },
    { id: "itens", rotulo: "Lista de melhorias do espaço", rotulo_en: "Property improvement list", feito: itens > 0, detalhe: itens ? `${itens} itens` : "", href: `${base}/coletivo?secao=espaco` },
    { id: "calendario", rotulo: "Calendário de marketing", rotulo_en: "Marketing calendar", feito: c.calendario.entradas.length > 0, detalhe: c.calendario.dataRetiro ? `retiro ${data(c.calendario.dataRetiro)}` : "", href: `${base}/coletivo?secao=marketing` },
    { id: "reuniao1", rotulo: "Reunião da equipe #1", rotulo_en: "Team meeting #1", feito: !!c.reunioes["1"]?.data, detalhe: c.reunioes["1"]?.data ? data(c.reunioes["1"].data) : "", href: base },
    { id: "reuniao2", rotulo: "Reunião da equipe #2", rotulo_en: "Team meeting #2", feito: !!c.reunioes["2"]?.data, detalhe: c.reunioes["2"]?.data ? data(c.reunioes["2"].data) : "", href: base },
    { id: "retiro", rotulo: "Relatório do retiro (consolidado)", rotulo_en: "Retreat report (consolidated)", feito: !!c.consolidados.retiro?.texto, detalhe: "", href: `${base}/consolidado/retiro` },
    { id: "matriz", rotulo: "Matriz de responsabilidades", rotulo_en: "Responsibility matrix", feito: !!c.consolidados.matriz?.texto, detalhe: "", href: `${base}/consolidado/matriz` },
    { id: "codigo", rotulo: "Código de acordos publicado e aceito", rotulo_en: "Code of agreements published and accepted", feito: c.codigo.versao > 0 && aceites >= pessoas.length, detalhe: c.codigo.versao ? `versão ${c.codigo.versao} · ${aceites}/${pessoas.length} aceites` : "", href: `${base}/codigo` },
    { id: "documento", rotulo: "Documento final (PT e EN)", rotulo_en: "Final document (PT and EN)", feito: !!getDocumento(d.id, "pt") && !!getDocumento(d.id, "en"), detalhe: [getDocumento(d.id, "pt") && "PT", getDocumento(d.id, "en") && "EN"].filter(Boolean).join(" · "), href: `${base}/documento` },
  ];

  // each person's answer and each deliverable count as one unit of progress
  const feitas = secoes.reduce((n, s) => n + s.feitas, 0) + entregaveis.filter((e) => e.feito).length;
  const total = secoes.reduce((n, s) => n + s.total, 0) + entregaveis.length;
  return { d, pessoas, secoes, entregaveis, feitas, rascunhos: secoes.reduce((n, s) => n + s.rascunhos, 0), total };
}

// ---------------------------------------------------------------- "Pedir respostas" (WhatsApp to who is missing)
export type Pedido = { pessoa: Pessoa; individuais: number; rascunhos: number; coletivas: { id: string; titulo: string }[]; motivo: "" | "suspenso" | "sem_whatsapp" };

/** Who still owes something: their own unanswered questions + collective sections they own with open questions.
 *  `motivo` says why someone can't be asked (suspended people can't log in to answer). Never the sender. */
export function pedidos(p: Plano, remetenteId = ""): Pedido[] {
  const curto = (x: Pessoa) => x.name.split(" (")[0];
  return p.pessoas.filter((x) => x.id !== remetenteId).map((x): Pedido => {
    const individuais = p.secoes.filter((s) => s.escopo === "individual").flatMap((s) => s.perguntas).filter((q) => q.faltam.includes(curto(x))).length;
    const rascunhos = p.secoes.flatMap((s) => s.perguntas).filter((q) => q.rascunhoDe.includes(curto(x))).length;
    const coletivas = p.secoes.filter((s) => s.escopo === "coletivo" && s.perguntas.some((q) => q.estado !== "feito") && s.perguntas[0]?.responsavel === curto(x)).map((s) => ({ id: s.id, titulo: s.titulo }));
    return { pessoa: x, individuais, rascunhos, coletivas, motivo: x.suspenso ? "suspenso" : !x.whatsapp ? "sem_whatsapp" : "" };
  }).filter((x) => x.individuais > 0 || x.coletivas.length > 0);
}

export function textoPedido(x: Pedido, d: Diagnostico, prazo: string, origin: string): string {
  const quando = prazo ? prazo.split("-").reverse().slice(0, 2).join("/") : "";
  return [
    `Olá, ${x.pessoa.name.split(" (")[0]}! A Lynn volta em janeiro e estamos juntando o plano de trabalho da equipe${quando ? `. Pode responder até ${quando}?` : "."}`,
    x.individuais ? `Faltam ${x.individuais} resposta${x.individuais > 1 ? "s" : ""} suas${x.rascunhos ? ` (${x.rascunhos} já em rascunho: é só revisar e confirmar)` : ""}: ${origin}/pessoas/${x.pessoa.id}/respostas?d=${d.id}` : "",
    ...x.coletivas.map((c) => `Parte da equipe sob sua responsabilidade — ${c.titulo}: ${origin}/diagnosticos/${d.id}/coletivo?secao=${c.id}`),
    "Obrigado!",
  ].filter(Boolean).join("\n\n");
}

// self-check: VAULT_PATH=<vault> npx tsx src/lib/v2/planoTrabalho.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/planoTrabalho.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  assert(estado(0, 0, 3) === "falta" && estado(1, 0, 3) === "rascunho" && estado(0, 1, 3) === "rascunho" && estado(3, 0, 3) === "feito" && estado(0, 0, 0) === "falta", "estado");
  const p = planoTrabalho();
  if (p) {
    assert(p.feitas <= p.total, "feitas <= total");
    const ids = p.secoes.map((s) => s.id).filter((x) => ORDEM_LYNN.includes(x));
    assert(ids.join() === ORDEM_LYNN.filter((x) => ids.includes(x)).join(), `ordem da Lynn: ${ids}`);
    console.log(p.pessoas.map((x) => x.id).join(", "), "|", p.secoes.map((s) => `${s.numero}.${s.id} ${s.feitas}/${s.total}`).join(" · "), "|", `${p.feitas}/${p.total}`);
    const ps = pedidos(p, "ashuan_web");
    assert(!ps.some((x) => x.pessoa.id === "ashuan_web"), "nunca para quem envia");
    assert(ps.every((x) => x.motivo !== "suspenso" || x.pessoa.suspenso), "suspenso marcado");
    for (const x of ps) console.log(" pedido:", x.pessoa.id, x.individuais, x.coletivas.map((c) => c.id).join("+") || "-", x.motivo || "ok");
    const t = textoPedido(ps[0], p.d, "2026-11-30", "https://os.nipeihu.app");
    assert(t.includes("30/11") && t.includes(`/respostas?d=${p.d.id}`) || !ps[0].individuais, "texto com prazo e link");
    console.log(t);
  }
  console.log("planoTrabalho: ok");
}
