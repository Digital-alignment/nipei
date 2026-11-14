import type { Lancamento } from "./data";

// Simulador de preço por retiro (DS 10.25). Pure: the page passes the entries and the numbers typed in the form.
// Costs of an event split in two: per person (food, lodging/cleaning: they grow with each participant) and fixed
// (facilitators, marketing, transport, materials…: the same with 8 or 15 people). The person can change both.

export const POR_PESSOA = ["Alimentação", "Hospedagem e limpeza"];
export const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const r2 = (v: number) => Math.round(v * 100) / 100;

export type Base = {
  evento: string; participantes: number; fixo: number; porPessoa: number; precoMedio: number;
  categorias: { categoria: string; total: number; porPessoa: boolean }[];
};

/** What an event really cost and charged: paying participants, fixed and per-person costs, average price. */
export function baseDoEvento(lanc: Pick<Lancamento, "tipo" | "valor" | "categoria" | "evento" | "participante" | "anulado">[], evento: string): Base {
  const ls = lanc.filter((l) => !l.anulado && l.evento && norm(l.evento) === norm(evento));
  const cats = new Map<string, number>();
  for (const l of ls.filter((x) => x.tipo === "despesa")) cats.set(l.categoria, (cats.get(l.categoria) ?? 0) + l.valor);
  const pagantes = ls.filter((l) => l.tipo === "entrada" && l.participante);
  const participantes = new Set(pagantes.map((l) => norm(l.participante))).size;
  const categorias = [...cats].map(([categoria, total]) => ({ categoria, total: r2(total), porPessoa: POR_PESSOA.includes(categoria) })).sort((a, b) => b.total - a.total);
  const variavel = categorias.filter((c) => c.porPessoa).reduce((a, c) => a + c.total, 0);
  return {
    evento: ls[0]?.evento ?? evento, participantes, categorias,
    fixo: r2(categorias.filter((c) => !c.porPessoa).reduce((a, c) => a + c.total, 0)),
    porPessoa: participantes ? r2(variavel / participantes) : 0,
    precoMedio: participantes ? r2(pagantes.reduce((a, l) => a + l.valor, 0) / participantes) : 0,
  };
}

export type Entrada = { participantes: number; preco: number; fixo: number; porPessoa: number; rateio: number; margem: number };
const conta = (n: number, e: Entrada) => {
  const custo = e.fixo + e.rateio + n * e.porPessoa, receita = n * e.preco;
  return { participantes: n, receita: r2(receita), custo: r2(custo), resultado: r2(receita - custo) };
};

/** Result, break-even, minimum and suggested price, and the scenarios around the number of participants. margem = 0.2 for 20%. */
export function simular(e: Entrada) {
  const n = Math.max(0, Math.round(e.participantes)), atual = conta(n, e);
  const fixoTotal = e.fixo + e.rateio;
  // break-even only exists when each person pays more than they cost
  const equilibrio = e.preco > e.porPessoa ? Math.max(1, Math.ceil(fixoTotal / (e.preco - e.porPessoa) - 1e-9)) : null;
  const precoMinimo = n ? r2(atual.custo / n) : null;
  const precoSugerido = n && e.margem < 1 ? r2(atual.custo / (n * (1 - e.margem))) : null;
  const ns = [...new Set([0.5, 0.75, 1, 1.25, 1.5].map((k) => Math.round(n * k)).concat(equilibrio ?? []))].filter((x) => x > 0).sort((a, b) => a - b);
  return {
    ...atual, margemReal: atual.receita ? atual.resultado / atual.receita : 0, equilibrio, precoMinimo, precoSugerido,
    precoSugeridoRedondo: precoSugerido == null ? null : Math.ceil(precoSugerido / 10) * 10,
    cenarios: ns.map((x) => ({ ...conta(x, e), simulado: x === n, equilibrio: x === equilibrio })),
  };
}

// self-check: npx tsx src/lib/v2/simulador.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/simulador.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const L = (tipo: "entrada" | "despesa", valor: number, categoria: string, participante = "", evento = "Retiro outubro 2026", anulado = false) => ({ tipo, valor, categoria, evento, participante, anulado });
  // the demo retreat: 8 participants (R8 paid in two parts), 11 370 of costs
  const lanc = [
    ...Array.from({ length: 7 }, (_, i) => L("entrada", 2250, "Retiros e eventos", `Participante R${i + 1}`)),
    L("entrada", 1650, "Retiros e eventos", "Participante R8"), L("entrada", 600, "Retiros e eventos", "participante r8"),
    L("despesa", 450, "Marketing e divulgação"), L("despesa", 380, "Marketing e divulgação"), L("despesa", 1250, "Alimentação"), L("despesa", 960, "Transporte e combustível"),
    L("despesa", 4800, "Serviços e honorários"), L("despesa", 1800, "Ajudas de custo / equipe"), L("despesa", 870, "Alimentação"), L("despesa", 520, "Hospedagem e limpeza"),
    L("despesa", 340, "Materiais e insumos"), L("despesa", 999, "Alimentação", "", "Retiro outubro 2026", true), L("despesa", 50, "Alimentação", "", "Outro"),
  ];
  const b = baseDoEvento(lanc, "retiro OUTUBRO 2026");
  assert(b.participantes === 8, `participantes ${b.participantes}`);
  assert(b.fixo === 8730 && b.porPessoa === 330 && b.precoMedio === 2250, `base ${JSON.stringify(b)}`);
  assert(b.categorias[0].categoria === "Serviços e honorários" && b.categorias.find((c) => c.categoria === "Alimentação")?.porPessoa === true, "categorias");
  const s = simular({ participantes: 8, preco: 2250, fixo: 8730, porPessoa: 330, rateio: 0, margem: 0.2 });
  assert(s.resultado === 6630 && s.custo === 11370 && s.receita === 18000, `resultado ${s.resultado}`);
  assert(s.equilibrio === 5, `equilíbrio ${s.equilibrio}`); // 8730 / 1920 = 4,55 → 5
  assert(s.precoMinimo === 1421.25 && s.precoSugerido === 1776.56 && s.precoSugeridoRedondo === 1780, `preços ${s.precoMinimo} ${s.precoSugerido}`);
  assert(s.cenarios.map((c) => c.participantes).join() === "4,5,6,8,10,12" && s.cenarios.find((c) => c.simulado)?.participantes === 8, "cenários");
  assert(simular({ participantes: 10, preco: 300, fixo: 1000, porPessoa: 300, rateio: 0, margem: 0.2 }).equilibrio === null, "preço não cobre o custo por pessoa: sem equilíbrio");
  assert(simular({ participantes: 0, preco: 100, fixo: 100, porPessoa: 0, rateio: 0, margem: 0.2 }).precoMinimo === null, "sem participantes");
  assert(simular({ participantes: 10, preco: 200, fixo: 1000, porPessoa: 0, rateio: 0, margem: 0 }).equilibrio === 5, "equilíbrio exato não sobe");
  console.log(`simulador: ${ok} ok`);
}
