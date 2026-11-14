import fs from "fs";
import path from "path";
import { CATEGORIAS, noteText, readDir, today, updateNote, vault, type Lancamento } from "./data";

// Orçamento anual por categoria (plano financas-2026-11 fase 4). One note per year and unit:
// Financeiro/Orcamentos_anuais/<ano>_<unidade|geral>.md, lines "Categoria=valor anual@meses" (meses 1–12 where the
// value falls, split equally: all 12 = the same every month, only the retreat months = seasonal).

const DIR = path.join("Financeiro", "Orcamentos_anuais");
const r2 = (v: number) => Math.round(v * 100) / 100;
export const TODOS_MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export type LinhaOrc = { categoria: string; anual: number; meses: number[] };
export type OrcamentoAnual = { file: string; ano: string; unidade: string; linhas: LinhaOrc[]; salvoPor: string; salvoEm: string };

export const lerLinha = (x: string): LinhaOrc | null => {
  const m = String(x).match(/^(.+?)=([\d.]+)@([\d,]*)$/);
  if (!m) return null;
  const meses = [...new Set(m[3].split(",").map(Number).filter((n) => n >= 1 && n <= 12))].sort((a, b) => a - b);
  return { categoria: m[1].trim(), anual: Number(m[2]) || 0, meses: meses.length ? meses : TODOS_MESES };
};
const escreverLinha = (l: LinhaOrc) => `${l.categoria}=${r2(l.anual)}@${(l.meses.length ? l.meses : TODOS_MESES).join(",")}`;

export function getOrcamentoAnual(ano: string, unidade = ""): OrcamentoAnual | undefined {
  return readDir(DIR).map(({ fm, file }) => ({
    file, ano: String(fm.ano ?? ""), unidade: String(fm.unidade ?? ""), salvoPor: String(fm.salvo_por ?? ""), salvoEm: String(fm.salvo_em ?? ""),
    linhas: (Array.isArray(fm.linhas) ? fm.linhas : []).map((x) => lerLinha(String(x))).filter((x): x is LinhaOrc => !!x && x.anual > 0),
  })).find((o) => o.ano === ano && o.unidade === unidade);
}

export function salvarOrcamentoAnual(ano: string, unidade: string, linhas: LinhaOrc[], por: string) {
  const campos = { ano, unidade, linhas: linhas.filter((l) => l.anual > 0).map(escreverLinha), salvo_por: por, salvo_em: today() };
  const atual = getOrcamentoAnual(ano, unidade);
  if (atual) return updateNote(atual.file, campos);
  fs.mkdirSync(path.join(vault(), DIR), { recursive: true });
  fs.writeFileSync(path.join(vault(), DIR, `${ano}_${unidade || "geral"}.md`), noteText({ type: "orcamento_anual", ...campos, updated_at: new Date().toISOString() }, `# Orçamento ${ano}${unidade ? ` · ${unidade}` : ""}`), { encoding: "utf-8", flag: "wx" });
}

/** Budget of one line in month m (1–12). */
export const noMes = (l: LinhaOrc, m: number) => (l.meses.includes(m) ? l.anual / l.meses.length : 0);
const tipoDe = (c: string): "entrada" | "despesa" => ((CATEGORIAS.entrada as readonly string[]).includes(c) ? "entrada" : "despesa");

type L = Pick<Lancamento, "data" | "tipo" | "valor" | "categoria" | "anulado" | "pendente">;

/** Budget × actual for the year. "Até agora" = up to the current month (whole year if past, nothing if future).
 *  Forecast = actual so far + budget of the months still ahead. `lanc` already filtered by unit if needed. */
export function compararAnual(linhas: LinhaOrc[], lanc: L[], ano: string, hoje: string) {
  const anoHoje = hoje.slice(0, 4), mesHoje = Number(hoje.slice(5, 7));
  const ultimo = ano < anoHoje ? 12 : ano > anoHoje ? 0 : mesHoje; // last month that already "happened"
  const pagos = lanc.filter((l) => !l.anulado && !l.pendente && l.data.startsWith(ano) && Number(l.data.slice(5, 7)) <= ultimo && l.data <= hoje); // a future-dated entry has not happened yet
  const real = (c: string, m?: number) => pagos.filter((l) => l.categoria === c && (m == null || Number(l.data.slice(5, 7)) === m)).reduce((a, l) => a + (l.tipo === tipoDe(c) ? l.valor : -l.valor), 0);
  const cats = [...new Set([...linhas.map((l) => l.categoria), ...pagos.map((l) => l.categoria)])];
  const categorias = cats.map((categoria) => {
    const l = linhas.find((x) => x.categoria === categoria) ?? { categoria, anual: 0, meses: TODOS_MESES };
    const ateAgora = TODOS_MESES.filter((m) => m <= ultimo).reduce((a, m) => a + noMes(l, m), 0);
    const restante = TODOS_MESES.filter((m) => m > ultimo).reduce((a, m) => a + noMes(l, m), 0);
    const tipo = tipoDe(categoria), r = real(categoria);
    const usado = l.anual > 0 ? r / l.anual : null;
    return {
      categoria, tipo, anual: r2(l.anual), ateAgora: r2(ateAgora), real: r2(r), usado, previsao: r2(r + restante),
      alerta90: tipo === "despesa" && usado != null && usado >= 0.9, acima: usado != null && usado > 1,
    };
  }).sort((a, b) => (a.tipo === b.tipo ? b.anual + b.real - a.anual - a.real : a.tipo === "entrada" ? -1 : 1));
  const soma = (tipo: string, f: (c: (typeof categorias)[number]) => number) => r2(categorias.filter((c) => c.tipo === tipo).reduce((a, c) => a + f(c), 0));
  const meses = TODOS_MESES.map((m) => ({
    mes: m, futuro: m > ultimo,
    recO: r2(linhas.filter((l) => tipoDe(l.categoria) === "entrada").reduce((a, l) => a + noMes(l, m), 0)),
    despO: r2(linhas.filter((l) => tipoDe(l.categoria) === "despesa").reduce((a, l) => a + noMes(l, m), 0)),
    recR: r2(cats.filter((c) => tipoDe(c) === "entrada").reduce((a, c) => a + real(c, m), 0)),
    despR: r2(cats.filter((c) => tipoDe(c) === "despesa").reduce((a, c) => a + real(c, m), 0)),
  }));
  return {
    categorias, meses,
    receitas: { anual: soma("entrada", (c) => c.anual), ateAgora: soma("entrada", (c) => c.ateAgora), real: soma("entrada", (c) => c.real) },
    despesas: { anual: soma("despesa", (c) => c.anual), ateAgora: soma("despesa", (c) => c.ateAgora), real: soma("despesa", (c) => c.real) },
    previsaoResultado: r2(soma("entrada", (c) => c.previsao) - soma("despesa", (c) => c.previsao)),
    alertas: categorias.filter((c) => c.alerta90).map((c) => c.categoria),
  };
}

/** Starting point for a new year: last year's budget, or (if none) what really happened last year — each +reajuste%. */
export function baseDoAnoAnterior(anterior: LinhaOrc[] | undefined, lancAnoAnterior: L[], reajuste: number): LinhaOrc[] {
  const k = 1 + reajuste / 100;
  if (anterior?.length) return anterior.map((l) => ({ ...l, anual: r2(l.anual * k) }));
  const m = new Map<string, { total: number; meses: Set<number> }>();
  for (const l of lancAnoAnterior.filter((x) => !x.anulado && !x.pendente)) {
    const x = m.get(l.categoria) ?? { total: 0, meses: new Set<number>() };
    x.total += l.tipo === tipoDe(l.categoria) ? l.valor : -l.valor;
    x.meses.add(Number(l.data.slice(5, 7)));
    m.set(l.categoria, x);
  }
  // a category that only happened in some months (retreats) keeps those months: seasonal by default
  return [...m].filter(([, x]) => x.total > 0).map(([categoria, x]) => ({ categoria, anual: r2(x.total * k), meses: x.meses.size >= 10 ? TODOS_MESES : [...x.meses].sort((a, b) => a - b) }));
}

// self-check (pure part): npx tsx src/lib/v2/orcamentoAnual.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/orcamentoAnual.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  assert(JSON.stringify(lerLinha("Alimentação=12000@1,2,3")) === JSON.stringify({ categoria: "Alimentação", anual: 12000, meses: [1, 2, 3] }), "ler linha");
  assert(lerLinha("Ajudas de custo / equipe=600@")?.meses.length === 12 && lerLinha("lixo") === null, "sem meses = todos; inválida = null");
  assert(escreverLinha({ categoria: "X", anual: 1000.555, meses: [3, 1] }) === "X=1000.56@3,1", "escrever");
  const L = (data: string, tipo: "entrada" | "despesa", valor: number, categoria: string, pendente = false): L => ({ data, tipo, valor, categoria, pendente, anulado: false });
  const linhas: LinhaOrc[] = [
    { categoria: "Comunicação e internet", anual: 1200, meses: TODOS_MESES }, // 100 / month
    { categoria: "Retiros e eventos", anual: 60000, meses: [4, 10] }, // two retreats: 30k each
    { categoria: "Alimentação", anual: 10000, meses: [4, 10] },
  ];
  const lanc = [L("2026-01-10", "despesa", 100, "Comunicação e internet"), L("2026-10-03", "entrada", 24000, "Retiros e eventos"), L("2026-04-03", "entrada", 28000, "Retiros e eventos"),
    L("2026-10-05", "despesa", 9500, "Alimentação"), L("2026-10-06", "despesa", 777, "Alimentação", true), L("2026-12-01", "despesa", 50, "Comunicação e internet"), L("2025-10-01", "despesa", 1, "Alimentação"),
    L("2026-06-01", "despesa", 300, "Manutenção e obras"), L("2026-11-20", "despesa", 40, "Comunicação e internet")];
  const c = compararAnual(linhas, lanc, "2026", "2026-11-14");
  const x = (k: string) => c.categorias.find((y) => y.categoria === k)!;
  assert(x("Comunicação e internet").ateAgora === 1100 && x("Comunicação e internet").real === 100 && x("Comunicação e internet").previsao === 200, `internet ${JSON.stringify(x("Comunicação e internet"))}`);
  assert(x("Retiros e eventos").ateAgora === 60000 && x("Retiros e eventos").real === 52000 && x("Retiros e eventos").previsao === 52000, "receita sazonal");
  assert(x("Alimentação").alerta90 && !x("Alimentação").acima && x("Alimentação").real === 9500, "95% = alerta (pendente fora)");
  assert(x("Manutenção e obras").anual === 0 && x("Manutenção e obras").usado === null && x("Manutenção e obras").real === 300, "sem orçamento: aparece com o realizado");
  assert(c.alertas.join() === "Alimentação", "alertas");
  assert(c.meses[3].recO === 30000 && c.meses[3].recR === 28000 && c.meses[11].futuro && c.meses[11].despO === 100, "mês a mês");
  assert(c.previsaoResultado === 52000 - (200 + 9500 + 300), `previsão ${c.previsaoResultado}`);
  assert(compararAnual(linhas, lanc, "2027", "2026-11-14").categorias.every((y) => y.real === 0 && y.ateAgora === 0), "ano futuro: nada aconteceu");
  const b = baseDoAnoAnterior(undefined, [L("2025-04-01", "entrada", 20000, "Retiros e eventos"), L("2025-10-01", "entrada", 30000, "Retiros e eventos"), ...TODOS_MESES.map((m) => L(`2025-${String(m).padStart(2, "0")}-05`, "despesa", 100, "Comunicação e internet"))], 10);
  assert(b.find((l) => l.categoria === "Retiros e eventos")?.anual === 55000 && b.find((l) => l.categoria === "Retiros e eventos")?.meses.join() === "4,10", "base do realizado: sazonal + 10%");
  assert(b.find((l) => l.categoria === "Comunicação e internet")?.meses.length === 12, "todo mês = 12 meses");
  assert(baseDoAnoAnterior([{ categoria: "X", anual: 1000, meses: [1] }], [], 5)[0].anual === 1050, "base do orçamento anterior");
  console.log(`orcamentoAnual: ${ok} ok`);
}
