import fs from "fs";
import path from "path";
import { createLancamento, getLancamentos, noteText, readDir, slugify, today, updateNote, vault, type Lancamento } from "./data";

// Gastos fixos (DS 10.25): one note per fixed monthly cost (or income) in Financeiro/Fixos/. Every month each active one
// becomes a PENDING lançamento on its day ("a pagar" / "a receber", estimated value: the real bill is corrected in the
// entry's ficha when paid), marked fixo: "<id>|AAAA-MM" so it is never created twice (a voided one is not recreated).
// Also the cash forecast: today's balance + what is pending + the fixed costs not generated yet, 30 and 60 days ahead.

const DIR = path.join("Financeiro", "Fixos");
export type Fixo = {
  id: string; file: string; descricao: string; tipo: "entrada" | "despesa"; valor: number; dia: number; categoria: string;
  projeto: string; inicio: string; ativo: boolean; criadoPor: string;
};
export type DadosFixo = Omit<Fixo, "id" | "file" | "ativo" | "criadoPor">;

const s = (v: unknown) => (v == null ? "" : String(v).trim());

export function getFixos(): Fixo[] {
  return readDir(DIR).map(({ fm, file }) => ({
    id: s(fm.id), file, descricao: s(fm.descricao), tipo: (s(fm.tipo) === "entrada" ? "entrada" : "despesa") as Fixo["tipo"],
    valor: Number(fm.valor) || 0, dia: Math.min(28, Math.max(1, Number(fm.dia) || 1)), categoria: s(fm.categoria), projeto: s(fm.projeto),
    inicio: /^\d{4}-\d{2}$/.test(s(fm.inicio)) ? s(fm.inicio) : "2000-01", ativo: fm.ativo !== false, criadoPor: s(fm.criado_por),
  })).filter((f) => f.id).sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.dia - b.dia || a.descricao.localeCompare(b.descricao));
}

export function salvarFixo(d: DadosFixo, por: string, id?: string) {
  const campos = { descricao: d.descricao, tipo: d.tipo, valor: Math.round(d.valor * 100) / 100, dia: d.dia, categoria: d.categoria, projeto: d.projeto, inicio: d.inicio };
  if (id) {
    const f = getFixos().find((x) => x.id === id);
    if (!f) throw new Error("Gasto fixo não encontrado");
    updateNote(f.file, campos);
    return id;
  }
  const novo = `fixo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  fs.mkdirSync(path.join(vault(), DIR), { recursive: true });
  fs.writeFileSync(path.join(vault(), DIR, `${slugify(d.descricao) || "fixo"}_${novo.slice(5)}.md`),
    noteText({ id: novo, type: "gasto_fixo", ...campos, ativo: true, criado_por: por, criado_em: today(), updated_at: new Date().toISOString() }, `# Fixo: ${d.descricao}`), { encoding: "utf-8", flag: "wx" });
  return novo;
}

export function setFixoAtivo(id: string, ativo: boolean) {
  const f = getFixos().find((x) => x.id === id);
  if (!f) throw new Error("Gasto fixo não encontrado");
  updateNote(f.file, { ativo });
}

const addMes = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const addDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const diaDe = (mes: string, dia: number) => `${mes}-${String(dia).padStart(2, "0")}`;

/** Which (fixo, month) entries are missing (pure): active ones, from their start, at most 3 months back. */
export function devidos(fixos: Pick<Fixo, "id" | "inicio" | "ativo">[], existentes: Set<string>, mesAtual: string) {
  return fixos.filter((f) => f.ativo).flatMap((f) => [-2, -1, 0].map((k) => addMes(mesAtual, k))
    .filter((mes) => mes >= f.inicio && !existentes.has(`${f.id}|${mes}`)).map((mes) => ({ id: f.id, mes })));
}

let ultimo = "";
/** Creates this month's pending entries of the fixed costs (lazy: layout and /financas; once a day unless forced). */
export function gerarFixos(forcar = false) {
  const hoje = today();
  if (!forcar && ultimo === hoje) return 0;
  ultimo = hoje;
  try {
    const fixos = getFixos();
    if (!fixos.length) return 0;
    const ex = new Set(getLancamentos().map((l) => l.fixo).filter(Boolean));
    const faltam = devidos(fixos, ex, hoje.slice(0, 7));
    for (const { id, mes } of faltam) {
      const f = fixos.find((x) => x.id === id)!;
      createLancamento({ data: diaDe(mes, f.dia), tipo: f.tipo, valor: f.valor, categoria: f.categoria, descricao: f.descricao, projeto: f.projeto, equipe: "",
        registradoPor: f.criadoPor, pendente: true, fixo: `${id}|${mes}`, via: "gasto fixo" });
    }
    return faltam.length;
  } catch (e) {
    console.warn("[fixos]", (e as Error).message);
    return 0;
  }
}

export type Janela = { dias: number; saldo: number; aReceber: number; aPagar: number; fixos: number };
/**
 * Cash forecast (pure): balance of what was paid/received until today, then every pending entry (overdue ones count
 * today), paid entries dated in the future and the fixed costs of the coming months not generated yet.
 */
export function previsaoCaixa(lanc: Pick<Lancamento, "data" | "tipo" | "valor" | "anulado" | "pendente" | "fixo">[], fixos: Pick<Fixo, "id" | "tipo" | "valor" | "dia" | "inicio" | "ativo">[], hoje: string, janelas = [30, 60]) {
  const sinal = (t: string) => (t === "entrada" ? 1 : -1);
  const validos = lanc.filter((l) => !l.anulado);
  const saldoHoje = validos.filter((l) => !l.pendente && l.data <= hoje).reduce((a, l) => a + sinal(l.tipo) * l.valor, 0);
  const fim = addDias(hoje, Math.max(...janelas));
  type Ev = { data: string; v: number; tipo: "aReceber" | "aPagar" | "fixos" };
  const ev: Ev[] = validos.filter((l) => l.pendente || l.data > hoje).map((l) => ({
    data: l.data < hoje ? hoje : l.data, v: sinal(l.tipo) * l.valor, tipo: l.fixo ? "fixos" as const : l.tipo === "entrada" ? "aReceber" as const : "aPagar" as const,
  }));
  const gerados = new Set(lanc.map((l) => l.fixo).filter(Boolean));
  for (const f of fixos.filter((x) => x.ativo)) for (let k = 0; k <= 3; k++) {
    const mes = addMes(hoje.slice(0, 7), k), data = diaDe(mes, f.dia);
    if (mes >= f.inicio && data > hoje && data <= fim && !gerados.has(`${f.id}|${mes}`)) ev.push({ data, v: sinal(f.tipo) * f.valor, tipo: "fixos" });
  }
  ev.sort((a, b) => a.data.localeCompare(b.data));
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const res: Janela[] = janelas.map((dias) => {
    const ate = addDias(hoje, dias), dentro = ev.filter((e) => e.data <= ate);
    const soma = (t: Ev["tipo"]) => r2(Math.abs(dentro.filter((e) => e.tipo === t).reduce((a, e) => a + e.v, 0)));
    return { dias, saldo: r2(saldoHoje + dentro.reduce((a, e) => a + e.v, 0)), aReceber: soma("aReceber"), aPagar: soma("aPagar"), fixos: r2(-dentro.filter((e) => e.tipo === "fixos").reduce((a, e) => a + e.v, 0)) };
  });
  let corrente = saldoHoje, negativo: { data: string; saldo: number } | null = saldoHoje < 0 ? { data: hoje, saldo: r2(saldoHoje) } : null;
  for (const e of ev) { if (negativo) break; corrente += e.v; if (corrente < 0) negativo = { data: e.data, saldo: r2(corrente) }; }
  return { hoje: r2(saldoHoje), janelas: res, negativo, temFuturo: ev.length > 0 };
}

/** Monthly fixed cost (active ones). */
export const custoFixo = (fixos: Pick<Fixo, "tipo" | "valor" | "ativo">[]) => ({
  despesas: fixos.filter((f) => f.ativo && f.tipo === "despesa").reduce((a, f) => a + f.valor, 0),
  entradas: fixos.filter((f) => f.ativo && f.tipo === "entrada").reduce((a, f) => a + f.valor, 0),
});

// self-check (pure parts): npx tsx src/lib/v2/fixos.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/fixos.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const F = (id: string, extra: Partial<Fixo> = {}) => ({ id, tipo: "despesa" as const, valor: 100, dia: 10, inicio: "2026-01", ativo: true, ...extra });
  const d = devidos([F("a"), F("b", { inicio: "2026-11" }), F("c", { ativo: false })], new Set(["a|2026-10"]), "2026-11");
  assert(d.map((x) => `${x.id}|${x.mes}`).join(",") === "a|2026-09,a|2026-11,b|2026-11", "3 meses para trás, sem os existentes, desde o início, só ativos");
  const L = (data: string, tipo: "entrada" | "despesa", valor: number, pendente = false, extra: Partial<Lancamento> = {}) => ({ data, tipo, valor, anulado: false, pendente, fixo: "", ...extra });
  const p = previsaoCaixa([
    L("2026-11-01", "entrada", 1000), L("2026-11-05", "despesa", 300), L("2026-11-01", "despesa", 999, false, { anulado: true }),
    L("2026-10-20", "despesa", 200, true), // overdue: counts today
    L("2026-11-25", "entrada", 500, true), L("2026-12-20", "despesa", 900, true),
    L("2026-11-10", "despesa", 100, true, { fixo: "a|2026-11" }), // generated this month
  ], [F("a")], "2026-11-11");
  assert(p.hoje === 700, `saldo de hoje ${p.hoje}`);
  // 30 days (until 11/12): −200 overdue, +500, −100 fixo nov (pending), fixo dec 10/12 (not generated) −100 → 800
  assert(p.janelas[0].saldo === 800 && p.janelas[0].aReceber === 500 && p.janelas[0].aPagar === 200 && p.janelas[0].fixos === 200, `30 dias ${JSON.stringify(p.janelas[0])}`);
  // 60 days (until 10/01): also −900 on 20/12 and fixo jan 10/01 −100 → −200
  assert(p.janelas[1].saldo === -200, `60 dias ${JSON.stringify(p.janelas[1])}`);
  assert(p.negativo?.data === "2026-12-20" && p.negativo.saldo === -100, `primeiro dia negativo ${JSON.stringify(p.negativo)}`);
  assert(previsaoCaixa([], [], "2026-11-11").temFuturo === false, "sem nada");
  assert(custoFixo([F("a"), F("b", { valor: 50 }), F("c", { ativo: false })]).despesas === 150, "custo fixo só ativos");
  console.log(`fixos: ${ok} ok`);
}
