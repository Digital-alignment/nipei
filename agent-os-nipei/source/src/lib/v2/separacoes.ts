import { emContaPessoal, type Conta, type Lancamento } from "./data";

// Separações (plano financas-2026-11 fase 3), pure: restricted funds and money through personal (CPF) accounts.

type L = Pick<Lancamento, "data" | "tipo" | "valor" | "anulado" | "pendente" | "recurso" | "conta">;
const r2 = (v: number) => Math.round(v * 100) / 100;
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Each "recurso com destino": paid/received only; income = received for it, expenses = used from it. */
export function resumoRecursos(lanc: L[]) {
  const m = new Map<string, { recurso: string; recebido: number; usado: number }>();
  for (const l of lanc.filter((x) => x.recurso && !x.anulado && !x.pendente)) {
    const k = norm(l.recurso), x = m.get(k) ?? { recurso: l.recurso, recebido: 0, usado: 0 };
    x[l.tipo === "entrada" ? "recebido" : "usado"] += l.valor;
    m.set(k, x);
  }
  return [...m.values()].map((x) => ({ ...x, recebido: r2(x.recebido), usado: r2(x.usado), saldo: r2(x.recebido - x.usado) })).sort((a, b) => a.recurso.localeCompare(b.recurso, "pt"));
}

/** Paid/received entries of [de, ate] that went through an account in someone's CPF. */
export function contaPessoalNoPeriodo(lanc: L[], contas: Pick<Conta, "id" | "titular">[], de: string, ate: string) {
  const ls = lanc.filter((l) => !l.anulado && !l.pendente && l.data >= de && l.data <= ate && emContaPessoal(l, contas));
  return { total: r2(ls.reduce((a, l) => a + l.valor, 0)), n: ls.length };
}

// self-check: npx tsx src/lib/v2/separacoes.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/separacoes.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const L = (data: string, tipo: "entrada" | "despesa", valor: number, recurso = "", conta = "", pendente = false, anulado = false): L => ({ data, tipo, valor, recurso, conta, pendente, anulado });
  const r = resumoRecursos([L("2026-10-01", "entrada", 5000, "Grant Água Limpa"), L("2026-10-05", "despesa", 1200, "grant água limpa"), L("2026-10-06", "despesa", 300, "Grant Água Limpa", "", true),
    L("2026-10-07", "despesa", 99, "Grant Água Limpa", "", false, true), L("2026-10-08", "despesa", 400, "Reforma maloca"), L("2026-10-09", "despesa", 50)]);
  assert(r.length === 2 && r[0].recurso === "Grant Água Limpa" && r[0].recebido === 5000 && r[0].usado === 1200 && r[0].saldo === 3800, `grant ${JSON.stringify(r[0])}`);
  assert(r[1].saldo === -400, "usado sem receber = saldo negativo");
  const contas = [{ id: "bb", titular: "pj" as const }, { id: "nu-ana", titular: "cpf" as const }];
  const c = contaPessoalNoPeriodo([L("2026-10-01", "entrada", 900, "", "nu-ana"), L("2026-10-02", "despesa", 100, "", "nu-ana"), L("2026-10-03", "despesa", 50, "", "bb"),
    L("2026-10-04", "despesa", 70, "", "nu-ana", true), L("2026-11-01", "despesa", 1, "", "nu-ana")], contas, "2026-10-01", "2026-10-31");
  assert(c.total === 1000 && c.n === 2, `conta pessoal ${JSON.stringify(c)}`);
  console.log(`separacoes: ${ok} ok`);
}
