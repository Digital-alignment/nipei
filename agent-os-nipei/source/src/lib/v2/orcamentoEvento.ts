import fs from "fs";
import path from "path";
import { noteText, readDir, slugify, today, updateNote, vault, type Lancamento } from "./data";
import { norm, POR_PESSOA } from "./simulador";

// Orçamento por evento (DS 10.25): the simulator's numbers saved for one event (Financeiro/Orcamentos/<slug>.md),
// then compared with what really happened. Same split as the simulator: per person (POR_PESSOA) vs fixed costs.

const DIR = path.join("Financeiro", "Orcamentos");
const n = (v: unknown) => Number(v) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;

export type OrcamentoEvento = { file: string; evento: string; participantes: number; preco: number; fixo: number; porPessoa: number; rateio: number; margem: number; salvoPor: string; salvoEm: string };
export type DadosOrcamento = Omit<OrcamentoEvento, "file" | "salvoPor" | "salvoEm">;

export function getOrcamentosEvento(): OrcamentoEvento[] {
  return readDir(DIR).map(({ fm, file }) => ({
    file, evento: String(fm.evento ?? ""), participantes: n(fm.participantes), preco: n(fm.preco), fixo: n(fm.fixo), porPessoa: n(fm.por_pessoa),
    rateio: n(fm.rateio), margem: n(fm.margem), salvoPor: String(fm.salvo_por ?? ""), salvoEm: String(fm.salvo_em ?? ""),
  })).filter((o) => o.evento);
}
export const orcamentoDoEvento = (evento: string) => getOrcamentosEvento().find((o) => norm(o.evento) === norm(evento));

/** One budget per event (same name, ignoring case/accents): saving again replaces the numbers. */
export function salvarOrcamentoEvento(d: DadosOrcamento, por: string) {
  const campos = { evento: d.evento, participantes: Math.round(d.participantes), preco: r2(d.preco), fixo: r2(d.fixo), por_pessoa: r2(d.porPessoa), rateio: r2(d.rateio), margem: r2(d.margem), salvo_por: por, salvo_em: today() };
  const atual = orcamentoDoEvento(d.evento);
  if (atual) return updateNote(atual.file, campos);
  fs.mkdirSync(path.join(vault(), DIR), { recursive: true });
  fs.writeFileSync(path.join(vault(), DIR, `${slugify(d.evento) || "evento"}_${Date.now().toString(36)}.md`), noteText({ type: "orcamento_evento", ...campos, updated_at: new Date().toISOString() }, `# Orçamento: ${d.evento}`), { encoding: "utf-8", flag: "wx" });
}

type L = Pick<Lancamento, "tipo" | "valor" | "categoria" | "evento" | "participante" | "anulado" | "pendente">;

/** What really happened in an event: paying participants, expenses by category (paid / still to pay), income per participant. */
export function realDoEvento(lanc: L[], evento: string) {
  const ls = lanc.filter((l) => !l.anulado && l.evento && norm(l.evento) === norm(evento));
  const soma = (f: (l: L) => boolean) => r2(ls.filter(f).reduce((a, l) => a + l.valor, 0));
  const cats = [...new Set(ls.filter((l) => l.tipo === "despesa").map((l) => l.categoria))].map((categoria) => ({
    categoria, porPessoa: POR_PESSOA.includes(categoria),
    pago: soma((l) => l.tipo === "despesa" && l.categoria === categoria && !l.pendente), aPagar: soma((l) => l.tipo === "despesa" && l.categoria === categoria && l.pendente),
  })).sort((a, b) => b.pago + b.aPagar - a.pago - a.aPagar);
  const pt = new Map<string, { participante: string; pago: number; aReceber: number }>();
  for (const l of ls.filter((x) => x.tipo === "entrada" && x.participante)) {
    const k = norm(l.participante), x = pt.get(k) ?? { participante: l.participante, pago: 0, aReceber: 0 };
    x[l.pendente ? "aReceber" : "pago"] += l.valor;
    pt.set(k, x);
  }
  return {
    n: ls.length, categorias: cats, participantes: [...pt.values()].sort((a, b) => b.aReceber - a.aReceber || a.participante.localeCompare(b.participante)),
    receita: soma((l) => l.tipo === "entrada" && !l.pendente), aReceber: soma((l) => l.tipo === "entrada" && l.pendente),
  };
}

export type LinhaComparacao = { id: "participantes" | "receita" | "porPessoa" | "fixo" | "resultado" | "depoisRateio"; orcado: number; real: number; pendente: number; diferenca: number; pior: boolean; melhor: boolean };

/** Budget × real, line by line. diferença = real + pendente − orçado; "pior" = cost above / income or result below. */
export function compararEvento(o: DadosOrcamento, lanc: L[]): LinhaComparacao[] {
  const r = realDoEvento(lanc, o.evento);
  const custo = (pp: boolean) => r.categorias.filter((c) => c.porPessoa === pp);
  const pago = (pp: boolean) => r2(custo(pp).reduce((a, c) => a + c.pago, 0)), aPagar = (pp: boolean) => r2(custo(pp).reduce((a, c) => a + c.aPagar, 0));
  const linha = (id: LinhaComparacao["id"], orcado: number, real: number, pendente: number, custoLinha: boolean): LinhaComparacao => {
    const diferenca = r2(real + pendente - orcado);
    return { id, orcado: r2(orcado), real: r2(real), pendente: r2(pendente), diferenca, pior: custoLinha ? diferenca > 0 : diferenca < 0, melhor: custoLinha ? diferenca < 0 : diferenca > 0 };
  };
  const receitaO = o.participantes * o.preco, ppO = o.participantes * o.porPessoa;
  const resO = receitaO - ppO - o.fixo, resR = r.receita - pago(true) - pago(false), resP = r.aReceber - aPagar(true) - aPagar(false);
  const linhas = [
    linha("participantes", o.participantes, r.participantes.length, 0, false),
    linha("receita", receitaO, r.receita, r.aReceber, false),
    linha("porPessoa", ppO, pago(true), aPagar(true), true),
    linha("fixo", o.fixo, pago(false), aPagar(false), true),
    linha("resultado", resO, resR, resP, false),
  ];
  // the Sanctuary's share of fixed costs is not an entry of the event: it comes off both sides
  if (o.rateio > 0) linhas.push(linha("depoisRateio", resO - o.rateio, resR - o.rateio, resP, false));
  return linhas;
}

// self-check (pure part): npx tsx src/lib/v2/orcamentoEvento.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/orcamentoEvento.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const E = "Retiro outubro 2026";
  const L = (tipo: "entrada" | "despesa", valor: number, categoria: string, participante = "", pendente = false, evento = E, anulado = false): L => ({ tipo, valor, categoria, evento, participante, anulado, pendente });
  const lanc = [
    L("entrada", 2000, "Retiros e eventos", "Ana"), L("entrada", 1500, "Retiros e eventos", "Bia"), L("entrada", 500, "Retiros e eventos", "bia", true),
    L("despesa", 600, "Alimentação"), L("despesa", 100, "Hospedagem e limpeza", "", true), L("despesa", 1000, "Serviços e honorários"),
    L("despesa", 999, "Alimentação", "", false, E, true), L("despesa", 50, "Alimentação", "", false, "Outro"),
  ];
  const r = realDoEvento(lanc, "RETIRO outubro 2026");
  assert(r.participantes.length === 2 && r.participantes[0].participante === "Bia" && r.participantes[0].aReceber === 500, `participantes ${JSON.stringify(r.participantes)}`);
  assert(r.receita === 3500 && r.aReceber === 500, `receita ${r.receita}`);
  assert(r.categorias.find((c) => c.categoria === "Alimentação")?.pago === 600 && r.categorias.find((c) => c.categoria === "Hospedagem e limpeza")?.aPagar === 100, "categorias (anulado e outro evento fora)");
  const c = compararEvento({ evento: E, participantes: 3, preco: 2000, fixo: 800, porPessoa: 250, rateio: 300, margem: 0.2 }, lanc);
  const x = (id: string) => c.find((l) => l.id === id)!;
  assert(x("participantes").diferenca === -1 && x("participantes").pior, "1 participante a menos = pior");
  assert(x("receita").orcado === 6000 && x("receita").diferenca === -2000 && x("receita").pior, `receita ${JSON.stringify(x("receita"))}`);
  assert(x("porPessoa").orcado === 750 && x("porPessoa").real === 600 && x("porPessoa").pendente === 100 && x("porPessoa").melhor, `por pessoa ${JSON.stringify(x("porPessoa"))}`);
  assert(x("fixo").diferenca === 200 && x("fixo").pior, "fixo acima = pior");
  assert(x("resultado").orcado === 4450 && x("resultado").real === 1900 && x("resultado").pendente === 400, `resultado ${JSON.stringify(x("resultado"))}`);
  assert(x("depoisRateio").orcado === 4150 && x("depoisRateio").real === 1600, "rateio sai dos dois lados");
  assert(compararEvento({ evento: E, participantes: 1, preco: 1, fixo: 0, porPessoa: 0, rateio: 0, margem: 0 }, lanc).every((l) => l.id !== "depoisRateio"), "sem rateio, sem linha");
  console.log(`orcamentoEvento: ${ok} ok`);
}
