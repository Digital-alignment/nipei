import fs from "fs";
import path from "path";
import { aReembolsar, getContas, noteText, slugify, today, updateNote, vault, type Conta, type Lancamento } from "./data";

// Contas (DS 10.25): where the money is (bank, cash, Pix). One note each in Financeiro/Contas/; the balance is the
// opening balance on `desde` plus every paid/received entry of the account from that day until today.

export const TIPOS_CONTA = ["banco", "dinheiro", "pix", "outro"] as const;
export type DadosConta = Pick<Conta, "nome" | "tipo" | "saldoInicial" | "desde">;

export function salvarConta(d: DadosConta, por: string, id?: string) {
  const campos = { nome: d.nome, tipo: d.tipo, saldo_inicial: Math.round(d.saldoInicial * 100) / 100, desde: d.desde };
  if (id) {
    const c = getContas().find((x) => x.id === id);
    if (!c) throw new Error("Conta não encontrada");
    updateNote(c.file, campos);
    return id;
  }
  if (getContas().some((c) => c.nome.toLowerCase() === d.nome.toLowerCase())) throw new Error(`Já existe a conta "${d.nome}"`);
  const novo = `conta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const dir = path.join(vault(), "Financeiro", "Contas");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slugify(d.nome) || "conta"}_${novo.slice(6)}.md`),
    noteText({ id: novo, type: "conta", ...campos, ativa: true, criado_por: por, criado_em: today(), updated_at: new Date().toISOString() }, `# Conta: ${d.nome}`), { encoding: "utf-8", flag: "wx" });
  return novo;
}

export function setContaAtiva(id: string, ativa: boolean) {
  const c = getContas().find((x) => x.id === id);
  if (!c) throw new Error("Conta não encontrada");
  updateNote(c.file, { ativa });
}

type L = Pick<Lancamento, "data" | "tipo" | "valor" | "anulado" | "pendente" | "conta" | "conciliado"> & Partial<Pick<Lancamento, "reembolsar" | "reembolsado">>;
/** Balance of one account on a day (pure). */
export function saldoConta(c: Pick<Conta, "id" | "saldoInicial" | "desde">, lanc: L[], ate: string) {
  const v = lanc.filter((l) => l.conta === c.id && !l.anulado && !l.pendente && !aReembolsar(l) && l.data >= c.desde && l.data <= ate)
    .reduce((a, l) => a + (l.tipo === "entrada" ? l.valor : -l.valor), c.saldoInicial);
  return Math.round(v * 100) / 100;
}

/** Every account with its balance today and the last reconciled entry date; plus how many paid entries have no account. */
export function resumoContas(contas: Conta[], lanc: L[], hoje: string) {
  return {
    contas: contas.map((c) => ({
      ...c, saldo: saldoConta(c, lanc, hoje),
      conciliadoAte: lanc.filter((l) => l.conta === c.id && l.conciliado && !l.anulado).reduce((m, l) => (l.data > m ? l.data : m), ""),
    })),
    semConta: lanc.filter((l) => !l.conta && !l.anulado && !l.pendente).length,
  };
}

// self-check (pure parts): npx tsx src/lib/v2/contas.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/contas.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const x = (data: string, tipo: "entrada" | "despesa", valor: number, conta = "bb", extra: Partial<L> = {}): L => ({ data, tipo, valor, anulado: false, pendente: false, conta, conciliado: "", ...extra });
  const c = { id: "bb", saldoInicial: 1000, desde: "2026-10-01" };
  const ls = [x("2026-09-30", "entrada", 999), x("2026-10-05", "despesa", 200), x("2026-10-10", "entrada", 50.5, "bb", { conciliado: "2026-11-01" }),
    x("2026-10-11", "despesa", 70, "bb", { pendente: true }), x("2026-10-12", "despesa", 70, "bb", { anulado: true }), x("2026-10-13", "despesa", 30, "outra"), x("2026-12-01", "despesa", 5)];
  assert(saldoConta(c, ls, "2026-11-11") === 850.5, `saldo ${saldoConta(c, ls, "2026-11-11")}`);
  assert(saldoConta(c, ls, "2026-10-06") === 800, "até um dia");
  assert(saldoConta(c, [x("2026-10-05", "despesa", 40, "bb", { reembolsar: "ana" }), x("2026-10-06", "despesa", 10, "bb", { reembolsar: "ana", reembolsado: "2026-10-07" })], "2026-11-11") === 990, "reembolso a fazer não sai da conta");
  const r = resumoContas([{ ...c, file: "", nome: "BB", tipo: "banco", ativa: true }], [...ls, x("2026-10-01", "despesa", 1, "")], "2026-11-11");
  assert(r.contas[0].conciliadoAte === "2026-10-10" && r.semConta === 1, "conciliado até e sem conta");
  console.log(`contas: ${ok} ok`);
}
