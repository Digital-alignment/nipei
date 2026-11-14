import { getContas, getLancamentos, getPessoas, getProjetos, today, type Conta, type Lancamento } from "./data";
import { getFixos, previsaoCaixa, type Fixo } from "./fixos";
import { saldoConta } from "./contas";
import { dreMarkdown, dreMes, getNaturezas, NATUREZA_PADRAO, type Natureza } from "./dre";

// Relatório mensal (DS 10.25): one markdown for the page (printable to PDF) and for Google Docs — the same text,
// for Lynn or the accountant. Pure core (`montarRelatorio`) + a wrapper that reads the vault.

const brl = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\s/g, " ")}`;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;
const addMes = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };
const fimMes = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).toISOString().slice(0, 10);
const cel = (v: string) => v.replace(/\|/g, "/").replace(/\r?\n/g, " ");
const variacao = (atual: number, antes: number) => (!antes ? "—" : `${atual >= antes ? "+" : "−"}${Math.abs(Math.round(((atual - antes) / antes) * 100))}%`);

export function montarRelatorio(mes: string, lanc: Lancamento[], contas: Conta[], fixos: Fixo[], projetos: { id: string; nome: string }[], hoje: string, pessoas: { id: string; name: string }[] = [], naturezas: Record<string, Natureza> = NATUREZA_PADRAO) {
  const ant = addMes(mes, -1), fim = fimMes(mes);
  const validos = lanc.filter((l) => !l.anulado);
  const pagos = (m: string) => validos.filter((l) => !l.pendente && l.data.startsWith(m));
  const doMes = pagos(mes), doAnt = pagos(ant);
  const soma = (ls: Lancamento[], tipo: string) => ls.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);
  const e = soma(doMes, "entrada"), d = soma(doMes, "despesa"), eA = soma(doAnt, "entrada"), dA = soma(doAnt, "despesa");
  const anulados = lanc.filter((l) => l.anulado && l.data.startsWith(mes)).length;
  const nomeConta = (id: string) => contas.find((c) => c.id === id)?.nome ?? "—";
  const nomeProj = (id: string) => projetos.find((p) => p.id === id)?.nome ?? "Geral";
  const out: string[] = [`# Relatório financeiro · ${nomeMes(mes)}`, "", `Santuário Nipeihu · gerado em ${dm(hoje)}/${hoje.slice(0, 4)} pelo Nipëi OS. Valores pagos/recebidos no mês; pendentes à parte.`, ""];

  out.push("## Resumo", "", "| | Este mês | Mês anterior | Variação |", "|---|---:|---:|---:|",
    `| Entradas | ${brl(e)} | ${brl(eA)} | ${variacao(e, eA)} |`, `| Despesas | ${brl(d)} | ${brl(dA)} | ${variacao(d, dA)} |`,
    `| **Resultado** | **${brl(e - d)}** | ${brl(eA - dA)} | |`, "");

  // gerencial view: by the natureza of each category (Financeiro/naturezas.md)
  if (doMes.length || doAnt.length) out.push("## Resultado gerencial", "", dreMarkdown(dreMes(lanc, naturezas, mes)), "");

  for (const [tipo, titulo] of [["despesa", "Despesas por categoria"], ["entrada", "Entradas por categoria"]] as const) {
    const cats = [...new Set([...doMes, ...doAnt].filter((l) => l.tipo === tipo).map((l) => l.categoria))];
    if (!cats.length) continue;
    const por = (ls: Lancamento[], c: string) => ls.filter((l) => l.tipo === tipo && l.categoria === c).reduce((a, l) => a + l.valor, 0);
    out.push(`## ${titulo}`, "", "| Categoria | Este mês | Mês anterior |", "|---|---:|---:|",
      ...cats.sort((a, b) => por(doMes, b) - por(doMes, a)).map((c) => `| ${cel(c)} | ${brl(por(doMes, c))} | ${brl(por(doAnt, c))} |`), "");
  }

  const projs = [...new Set(doMes.map((l) => l.projeto))];
  if (projs.length) out.push("## Por projeto", "", "| Projeto | Entradas | Despesas | Resultado |", "|---|---:|---:|---:|",
    ...projs.map((p) => { const ls = doMes.filter((l) => l.projeto === p), a = soma(ls, "entrada"), b = soma(ls, "despesa"); return `| ${cel(nomeProj(p))} | ${brl(a)} | ${brl(b)} | ${brl(a - b)} |`; }), "");

  const evs = [...new Set(doMes.filter((l) => l.evento).map((l) => l.evento))];
  if (evs.length) out.push("## Por evento (movimento do mês)", "", "| Evento | Entradas | Despesas | Resultado |", "|---|---:|---:|---:|",
    ...evs.map((v) => { const ls = doMes.filter((l) => l.evento === v), a = soma(ls, "entrada"), b = soma(ls, "despesa"); return `| ${cel(v)} | ${brl(a)} | ${brl(b)} | ${brl(a - b)} |`; }), "");

  const ativas = contas.filter((c) => c.ativa);
  if (ativas.length) {
    const semConta = doMes.filter((l) => !l.conta).length;
    out.push(`## Contas (saldo em ${dm(fim)})`, "", "| Conta | Saldo |", "|---|---:|", ...ativas.map((c) => `| ${cel(c.nome)} | ${brl(saldoConta(c, lanc, fim))} |`), "");
    if (semConta) out.push(`${semConta} lançamento(s) do mês sem conta (entram nos totais, não nos saldos das contas).`, "");
  }

  const fixosMes = validos.filter((l) => l.fixo.endsWith(`|${mes}`));
  if (fixosMes.length) out.push("## Gastos fixos do mês", "", "| Dia | Descrição | Valor | Situação |", "|---|---|---:|---|",
    ...fixosMes.sort((a, b) => a.data.localeCompare(b.data)).map((l) => `| ${dm(l.data)} | ${cel(l.descricao)} | ${brl(l.valor)} | ${l.pendente ? (l.tipo === "entrada" ? "a receber" : "a pagar") : "pago"} |`), "");

  const pend = validos.filter((l) => l.pendente && l.data <= fim).sort((a, b) => a.data.localeCompare(b.data));
  if (pend.length) {
    const aR = pend.filter((l) => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0), aP = pend.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0);
    out.push("## Pendentes até o fim do mês", "", `A receber: ${brl(aR)} · A pagar: ${brl(aP)}`, "", "| Data | Descrição | Tipo | Valor |", "|---|---|---|---:|",
      ...pend.map((l) => `| ${dm(l.data)} | ${cel([l.descricao || l.categoria, l.participante, l.evento].filter(Boolean).join(" · "))} | ${l.tipo === "entrada" ? "a receber" : "a pagar"} | ${brl(l.valor)} |`), "");
  }

  // paid with someone's own money and still owed at the end of the month
  const reemb = validos.filter((l) => l.tipo === "despesa" && l.reembolsar && l.data <= fim && (!l.reembolsado || l.reembolsado > fim));
  if (reemb.length) {
    const nomeP = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
    out.push("## Reembolsos a fazer", "", `Total: ${brl(reemb.reduce((a, l) => a + l.valor, 0))} (despesas pagas com dinheiro próprio; já estão nos totais, ainda não saíram do caixa)`, "", "| Data | Pessoa | Descrição | Valor |", "|---|---|---|---:|",
      ...reemb.sort((a, b) => a.data.localeCompare(b.data)).map((l) => `| ${dm(l.data)} | ${cel(nomeP(l.reembolsar))} | ${cel(l.descricao || l.categoria)} | ${brl(l.valor)} |`), "");
  }

  if (mes === hoje.slice(0, 7)) {
    const p = previsaoCaixa(lanc, fixos, hoje);
    out.push("## Previsão de caixa", "", "| | Saldo |", "|---|---:|", `| Hoje (${dm(hoje)}) | ${brl(p.hoje)} |`, ...p.janelas.map((j) => `| Em ${j.dias} dias | ${brl(j.saldo)} |`), "");
    if (p.negativo) out.push(`**Atenção:** o caixa fica negativo em ${dm(p.negativo.data)} (${brl(p.negativo.saldo)}).`, "");
  }

  out.push("## Lançamentos do mês", "", "| Data | Descrição | Categoria | Conta | Valor | Comprovante |", "|---|---|---|---|---:|---|",
    ...doMes.sort((a, b) => a.data.localeCompare(b.data)).map((l) => `| ${dm(l.data)} | ${cel(l.descricao || l.categoria)} | ${cel(l.categoria)} | ${cel(nomeConta(l.conta))} | ${l.tipo === "entrada" ? "" : "−"}${brl(l.valor)} | ${l.comprovante ? "sim" : "—"} |`), "");
  if (!doMes.length) out.push("Nenhum lançamento pago ou recebido neste mês.", "");
  if (anulados) out.push(`${anulados} lançamento(s) anulado(s) neste mês ficaram fora.`, "");
  return out.join("\n");
}

export const relatorioMensal = (mes: string) => montarRelatorio(mes, getLancamentos(), getContas(), getFixos(), getProjetos(), today(), getPessoas(), getNaturezas());

// self-check (pure part): npx tsx src/lib/v2/relatorioFinancas.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/relatorioFinancas.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const L = (data: string, tipo: "entrada" | "despesa", valor: number, extra: Partial<Lancamento> = {}): Lancamento => ({
    id: data + valor, file: "", data, tipo, valor, categoria: tipo === "entrada" ? "Cursos" : "Alimentação", descricao: "x", projeto: "", equipe: "", registradoPor: "",
    anulado: false, pendente: false, evento: "", participante: "", importacao: "", fixo: "", conta: "", conciliado: "", reembolsar: "", reembolsado: "", comprovante: "", registradoEm: "", registradoVia: "", anuladoEm: "", historico: [], ...extra });
  const md = montarRelatorio("2026-11", [L("2026-11-02", "entrada", 1000, { conta: "bb" }), L("2026-11-03", "despesa", 300, { comprovante: "x.jpg", descricao: "a|b" }), L("2026-10-03", "despesa", 200),
    L("2026-11-20", "despesa", 450, { pendente: true, fixo: "f|2026-11" }), L("2026-11-04", "despesa", 9, { anulado: true })],
    [{ id: "bb", file: "", nome: "Banco", tipo: "banco", saldoInicial: 100, desde: "2026-01-01", ativa: true }], [], [], "2026-11-11");
  assert(md.includes("# Relatório financeiro · novembro de 2026"), "título");
  assert(md.includes("| Despesas | R$ 300,00 | R$ 200,00 | +50% |"), "variação");
  assert(md.includes("| Banco | R$ 1.100,00 |") && md.includes("1 lançamento(s) do mês sem conta"), "contas");
  assert(md.includes("| 20/11 | x | R$ 450,00 | a pagar |"), "fixo pendente");
  assert(md.includes("| a/b |") && md.includes("| sim |"), "pipe escapado, comprovante");
  assert(md.includes("1 lançamento(s) anulado(s)") && md.includes("## Previsão de caixa"), "anulados e previsão no mês atual");
  assert(!montarRelatorio("2026-10", [], [], [], [], "2026-11-11").includes("Previsão"), "previsão só no mês atual");
  const rb = montarRelatorio("2026-11", [L("2026-11-05", "despesa", 80, { reembolsar: "ana", descricao: "Gasolina" }), L("2026-11-06", "despesa", 20, { reembolsar: "ana", reembolsado: "2026-11-07" })], [], [], [], "2026-11-11", [{ id: "ana", name: "Ana Souza" }]);
  assert(md.includes("## Resultado gerencial") && md.includes("**= Margem de contribuição**"), "DRE no relatório");
  assert(rb.includes("## Reembolsos a fazer") && rb.includes("| 05/11 | Ana Souza | Gasolina | R$ 80,00 |") && !rb.includes("| 06/11 | Ana"), "reembolsos a fazer");
  console.log(`relatorioFinancas: ${ok} ok`);
}
