import fs from "fs";
import path from "path";
import { CATEGORIAS, noteText, readDir, today, updateNote, vault, type Lancamento } from "./data";

// Resultado gerencial (DRE, plano financas-2026-11 fase 2). Each category has a "natureza"; the DRE groups the paid
// entries of a period by it: receita − custos variáveis = margem de contribuição − despesas fixas = resultado
// operacional ± não operacional = resultado do período. Investments stay outside the result.
// The natureza is a classification of the category (Financeiro/naturezas.md), so changing it changes every month.

export const NATUREZAS = ["receita", "variavel", "fixa", "investimento", "nao_operacional"] as const;
export type Natureza = (typeof NATUREZAS)[number];

// defaults for the categories of today; anything unknown: income = receita, expense = fixa
export const NATUREZA_PADRAO: Record<string, Natureza> = {
  "Retiros e eventos": "receita", "Vendas Inirau / loja": "receita", "Cursos": "receita", "Outras entradas": "receita", "Doações e grants": "nao_operacional",
  "Alimentação": "variavel", "Hospedagem e limpeza": "variavel", "Serviços e honorários": "variavel", "Ajudas de custo / equipe": "variavel",
  "Transporte e combustível": "variavel", "Materiais e insumos": "variavel", "Marketing e divulgação": "variavel",
  "Manutenção e obras": "fixa", "Comunicação e internet": "fixa", "Outras despesas": "fixa", "Impostos e taxas": "nao_operacional",
};

const ARQ = path.join("Financeiro", "naturezas.md");
const valida = (v: unknown): v is Natureza => (NATUREZAS as readonly string[]).includes(String(v));

/** Saved choices over the defaults. */
export function getNaturezas(): Record<string, Natureza> {
  const fm = readDir("Financeiro").find((n) => n.file.replace(/\\/g, "/") === ARQ.replace(/\\/g, "/"))?.fm ?? {};
  // stored as a list "Categoria=natureza" (note frontmatter holds strings and lists, not maps)
  const salvas = Object.fromEntries((Array.isArray(fm.naturezas) ? fm.naturezas : []).map((x) => String(x).split("=")).filter((x) => x.length === 2).map(([c, v]) => [c.trim(), v.trim()]));
  const todas = [...CATEGORIAS.entrada, ...CATEGORIAS.despesa];
  return Object.fromEntries(todas.map((c) => [c, valida(salvas[c]) ? salvas[c] : NATUREZA_PADRAO[c] ?? (CATEGORIAS.entrada.includes(c as never) ? "receita" : "fixa")]));
}

export function salvarNaturezas(n: Record<string, Natureza>, por: string) {
  const campos = { naturezas: Object.entries(n).map(([c, v]) => `${c}=${v}`), salvo_por: por, salvo_em: today() };
  if (fs.existsSync(path.join(vault(), ARQ))) return updateNote(ARQ, campos);
  fs.mkdirSync(path.join(vault(), "Financeiro"), { recursive: true });
  fs.writeFileSync(path.join(vault(), ARQ), noteText({ type: "naturezas_financeiras", ...campos, updated_at: new Date().toISOString() }, "# Natureza das categorias (DRE)"), "utf-8");
}

type L = Pick<Lancamento, "data" | "tipo" | "valor" | "categoria" | "anulado" | "pendente">;
const r2 = (v: number) => Math.round(v * 100) / 100;

export type Grupo = { total: number; categorias: { categoria: string; valor: number }[] };
export type DRE = {
  receita: Grupo; variaveis: Grupo; margem: number; margemPct: number | null; fixas: Grupo; operacional: number;
  naoOperacional: Grupo; resultado: number; investimentos: Grupo; equilibrio: number | null; aReceber: number; aPagar: number;
};

/** DRE of the paid/received entries with data in [de, ate]. Non-operating income adds, non-operating expenses subtract. */
export function montarDRE(lanc: L[], nat: Record<string, Natureza>, de: string, ate: string): DRE {
  const ls = lanc.filter((l) => !l.anulado && l.data >= de && l.data <= ate);
  const pagos = ls.filter((l) => !l.pendente);
  const natDe = (l: L): Natureza => nat[l.categoria] ?? NATUREZA_PADRAO[l.categoria] ?? (l.tipo === "entrada" ? "receita" : "fixa");
  const grupo = (f: (l: L) => boolean, sinal: (l: L) => number = () => 1): Grupo => {
    const m = new Map<string, number>();
    for (const l of pagos.filter(f)) m.set(l.categoria || "—", (m.get(l.categoria || "—") ?? 0) + sinal(l) * l.valor);
    const categorias = [...m].map(([categoria, valor]) => ({ categoria, valor: r2(valor) })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
    return { total: r2(categorias.reduce((a, c) => a + c.valor, 0)), categorias };
  };
  // an expense marked "receita" (or income marked as a cost) still goes where its natureza says, with its sign
  const sinalCusto = (l: L) => (l.tipo === "despesa" ? 1 : -1), sinalReceita = (l: L) => (l.tipo === "entrada" ? 1 : -1);
  const receita = grupo((l) => natDe(l) === "receita", sinalReceita);
  const variaveis = grupo((l) => natDe(l) === "variavel", sinalCusto);
  const fixas = grupo((l) => natDe(l) === "fixa", sinalCusto);
  const naoOperacional = grupo((l) => natDe(l) === "nao_operacional", sinalReceita);
  const investimentos = grupo((l) => natDe(l) === "investimento", sinalCusto);
  const margem = r2(receita.total - variaveis.total);
  const margemPct = receita.total > 0 ? margem / receita.total : null;
  const operacional = r2(margem - fixas.total);
  return {
    receita, variaveis, margem, margemPct, fixas, operacional, naoOperacional, resultado: r2(operacional + naoOperacional.total), investimentos,
    // revenue needed to pay the fixed costs at this margin
    equilibrio: margemPct && margemPct > 0 ? r2(fixas.total / margemPct) : null,
    aReceber: r2(ls.filter((l) => l.pendente && l.tipo === "entrada").reduce((a, l) => a + l.valor, 0)),
    aPagar: r2(ls.filter((l) => l.pendente && l.tipo === "despesa").reduce((a, l) => a + l.valor, 0)),
  };
}

export const fimDoMes = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).toISOString().slice(0, 10);
export const mesAnterior = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); };
/** This month, last month and year to date (January up to the end of this month). */
export const dreMes = (lanc: L[], nat: Record<string, Natureza>, mes: string) => ({
  mes: montarDRE(lanc, nat, `${mes}-01`, fimDoMes(mes)),
  anterior: montarDRE(lanc, nat, `${mesAnterior(mes)}-01`, fimDoMes(mesAnterior(mes))),
  ano: montarDRE(lanc, nat, `${mes.slice(0, 4)}-01-01`, fimDoMes(mes)),
});

const brl = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ")}`;
/** Markdown table (relatório mensal and Google Docs). */
export function dreMarkdown(d: ReturnType<typeof dreMes>) {
  const cel = (s: string) => s.replace(/\|/g, "/");
  const linha = (rot: string, f: (x: DRE) => number, negrito = false) => {
    const v = [d.mes, d.anterior, d.ano].map((x) => brl(f(x)));
    return negrito ? `| **${rot}** | **${v[0]}** | **${v[1]}** | **${v[2]}** |` : `| ${rot} | ${v.join(" | ")} |`;
  };
  const cats = (g: (x: DRE) => Grupo) => [...new Set([d.mes, d.anterior, d.ano].flatMap((x) => g(x).categorias.map((c) => c.categoria)))]
    .map((c) => linha(`  ${cel(c)}`, (x) => g(x).categorias.find((y) => y.categoria === c)?.valor ?? 0));
  const pct = d.mes.margemPct == null ? "" : ` (${Math.round(d.mes.margemPct * 100)}% da receita)`;
  return [
    "| | Este mês | Mês anterior | Acumulado do ano |", "|---|---:|---:|---:|",
    linha("Receita operacional", (x) => x.receita.total, true), ...cats((x) => x.receita),
    linha("(−) Custos variáveis", (x) => x.variaveis.total, true), ...cats((x) => x.variaveis),
    linha("= Margem de contribuição", (x) => x.margem, true),
    linha("(−) Despesas fixas", (x) => x.fixas.total, true), ...cats((x) => x.fixas),
    linha("= Resultado operacional", (x) => x.operacional, true),
    linha("(±) Não operacional", (x) => x.naoOperacional.total, true), ...cats((x) => x.naoOperacional),
    linha("= Resultado do período", (x) => x.resultado, true),
    linha("Investimentos (fora do resultado)", (x) => x.investimentos.total), "",
    `Margem de contribuição do mês${pct}.${d.mes.equilibrio != null ? ` Para pagar as despesas fixas com esta margem, a receita do mês precisa ser ${brl(d.mes.equilibrio)}.` : ""}`,
  ].join("\n");
}

// self-check (pure part): npx tsx src/lib/v2/dre.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/dre.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const L = (data: string, tipo: "entrada" | "despesa", valor: number, categoria: string, pendente = false, anulado = false): L => ({ data, tipo, valor, categoria, pendente, anulado });
  const nat = { ...NATUREZA_PADRAO, "Manutenção e obras": "investimento" as Natureza };
  const ls = [
    L("2026-10-05", "entrada", 10000, "Retiros e eventos"), L("2026-10-06", "entrada", 500, "Vendas Inirau / loja"), L("2026-10-07", "entrada", 2000, "Doações e grants"),
    L("2026-10-08", "despesa", 3000, "Alimentação"), L("2026-10-09", "despesa", 1500, "Serviços e honorários"),
    L("2026-10-10", "despesa", 1200, "Comunicação e internet"), L("2026-10-11", "despesa", 300, "Impostos e taxas"), L("2026-10-12", "despesa", 4000, "Manutenção e obras"),
    L("2026-10-13", "despesa", 999, "Alimentação", true), L("2026-10-14", "entrada", 777, "Cursos", true), L("2026-10-15", "despesa", 50, "Alimentação", false, true),
    L("2026-09-20", "entrada", 3000, "Retiros e eventos"), L("2026-09-21", "despesa", 900, "Comunicação e internet"), L("2026-11-01", "entrada", 1, "Cursos"),
  ];
  const d = montarDRE(ls, nat, "2026-10-01", "2026-10-31");
  assert(d.receita.total === 10500 && d.variaveis.total === 4500 && d.margem === 6000, `margem ${JSON.stringify([d.receita.total, d.variaveis.total, d.margem])}`);
  assert(Math.round((d.margemPct ?? 0) * 1000) === 571, `margem % ${d.margemPct}`);
  assert(d.fixas.total === 1200 && d.operacional === 4800, `operacional ${d.operacional}`);
  assert(d.naoOperacional.total === 1700 && d.resultado === 6500, `não operacional + resultado ${d.naoOperacional.total} ${d.resultado}`);
  assert(d.investimentos.total === 4000, "obra fora do resultado");
  assert(d.aReceber === 777 && d.aPagar === 999, "pendentes à parte (anulado fora)");
  assert(d.equilibrio === 2100, `equilíbrio ${d.equilibrio}`); // 1200 / (6000/10500)
  const m = dreMes(ls, nat, "2026-10");
  assert(m.anterior.resultado === 2100 && m.ano.resultado === 8600, `anterior/ano ${m.anterior.resultado} ${m.ano.resultado}`);
  const md = dreMarkdown(m);
  assert(md.includes("| **= Margem de contribuição** | **R$ 6.000,00** | **R$ 3.000,00** | **R$ 9.000,00** |") && md.includes("|   Alimentação | R$ 3.000,00 |"), "markdown");
  assert(montarDRE([L("2026-10-01", "despesa", 100, "Alimentação")], nat, "2026-10-01", "2026-10-31").margemPct === null, "sem receita, sem %");
  console.log(`dre: ${ok} ok`);
}
