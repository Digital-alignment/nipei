import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Icone from "@/components/ds/Icone";
import Chip from "@/components/ds/Chip";
import Tabela from "@/components/ds/padroes/Tabela";
import { ToastAoAbrir } from "@/components/ds/Toast";
import { Section } from "@/components/v2/ui";
import { UNIDADES, currentUser, getContas, getLancamentos, today, unidadeDe } from "@/lib/v2/data";
import { contaPessoalNoPeriodo } from "@/lib/v2/separacoes";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { NATUREZAS, dreMes, fimDoMes, getNaturezas, type DRE, type Grupo } from "@/lib/v2/dre";
import { podeFinancas } from "@/lib/v2/funcoes";
import { salvarNaturezasAction } from "../../actions";

// Resultado gerencial / DRE (DS 10.25, plano financas fase 2): the month, the previous one and the year to date.
export const dynamic = "force-dynamic";

const brl0 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
const addMes = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };

export default async function Resultado({ searchParams }: { searchParams: Promise<{ m?: string; ok?: string; u?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : today().slice(0, 7);
  const nat = getNaturezas();
  const todos = getLancamentos(), contas = getContas();
  // per business unit (?u=): "geral" = entries with no unit of their own or of their account
  const unidades = [...new Set(todos.filter((l) => !l.anulado && l.data.startsWith(mes.slice(0, 4))).map((l) => unidadeDe(l, contas) || "geral"))];
  const u = q.u && unidades.includes(q.u) ? q.u : "";
  const d = dreMes(u ? todos.filter((l) => (unidadeDe(l, contas) || "geral") === u) : todos, nat, mes);
  const cpf = contaPessoalNoPeriodo(todos, contas, `${mes}-01`, fimDoMes(mes));
  const link = (x: string) => `/financas/resultado?m=${mes}${x ? `&u=${x}` : ""}`;
  const pct = d.mes.margemPct == null ? "" : `${d.mes.margemPct < 0 ? "−" : ""}${Math.abs(Math.round(d.mes.margemPct * 100))}% ${t.daReceita}`;
  const cor = (v: number) => (v < 0 ? "text-err" : "");

  // one row per total, the categories of each group right under it
  type Linha = { id: string; rot: string; f: (x: DRE) => number; total?: boolean };
  const cats = (g: (x: DRE) => Grupo): Linha[] => [...new Set([d.mes, d.anterior, d.ano].flatMap((x) => g(x).categorias.map((c) => c.categoria)))]
    .map((c) => ({ id: `${c}-${g(d.ano).total}`, rot: c, f: (x: DRE) => g(x).categorias.find((y) => y.categoria === c)?.valor ?? 0 }));
  const linhas: Linha[] = [
    { id: "receita", rot: t.receitaOp, f: (x) => x.receita.total, total: true }, ...cats((x) => x.receita),
    { id: "variaveis", rot: t.custosVar, f: (x) => x.variaveis.total, total: true }, ...cats((x) => x.variaveis),
    { id: "margem", rot: t.margemContrib, f: (x) => x.margem, total: true },
    { id: "fixas", rot: t.despesasFixas, f: (x) => x.fixas.total, total: true }, ...cats((x) => x.fixas),
    { id: "operacional", rot: t.resultadoOp, f: (x) => x.operacional, total: true },
    { id: "naoop", rot: t.naoOp, f: (x) => x.naoOperacional.total, total: true }, ...cats((x) => x.naoOperacional),
    { id: "resultado", rot: t.resultadoPeriodo, f: (x) => x.resultado, total: true },
    { id: "invest", rot: t.investimentosFora, f: (x) => x.investimentos.total },
  ];
  const valor = (l: Linha, x: DRE) => <span className={l.total ? `font-semibold ${cor(l.f(x))}` : "meta text-t2"}>{brl0(l.f(x))}</span>;

  return (
    <div className="mx-auto max-w-4xl">
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={<>{t.resultadoTitulo} · <span className="first-letter:uppercase">{fmtDate(mes, lang)}</span></>}
        acoes={<div className="flex flex-wrap items-center gap-2">
          <Botao href={`/financas?m=${mes}`} icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>
          <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={`/financas/resultado?m=${addMes(mes, -1)}${u ? `&u=${u}` : ""}`} />
          <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={`/financas/resultado?m=${addMes(mes, 1)}${u ? `&u=${u}` : ""}`} />
        </div>} />
      <ToastAoAbrir texto={q.ok} />
      {unidades.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip href={link("")} ativo={!u}>{t.todasUnidades}</Chip>
          {unidades.filter((x) => x !== "geral").map((x) => <Chip key={x} href={link(x)} ativo={u === x}>{UNIDADES[x as keyof typeof UNIDADES] ?? x}</Chip>)}
          {unidades.includes("geral") && <Chip href={link("geral")} ativo={u === "geral"}>{t.unidadeGeral}</Chip>}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Cartao variante="kpi"><span className="meta text-t2">{t.receitaOp}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{brl0(d.mes.receita.total)}</span></Cartao>
        <Cartao variante="kpi"><span className="meta text-t2">{t.margemContribCurto}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums ${cor(d.mes.margem)}`}>{brl0(d.mes.margem)}</span>{pct && <span className="meta text-t3">{pct}</span>}</Cartao>
        <Cartao variante="kpi"><span className="meta text-t2">{t.resultadoOpCurto}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums ${cor(d.mes.operacional)}`}>{brl0(d.mes.operacional)}</span></Cartao>
        <Cartao variante="destaque"><span className="meta opacity-80">{t.resultadoPeriodoCurto}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums">{brl0(d.mes.resultado)}</span></Cartao>
      </div>

      <Section title={t.demonstrativo}>
        <Tabela rotulo={t.demonstrativo} colunas={[{ id: "l", rotulo: "" }, { id: "m", rotulo: t.esteMes, numero: true }, { id: "a", rotulo: t.mesAnteriorLbl, numero: true, soComputador: true }, { id: "y", rotulo: t.acumuladoAno, numero: true }]}
          linhas={linhas.map((l) => ({ id: l.id, celulas: {
            l: <span className={l.total ? "font-semibold text-t1" : "meta pl-4 text-t2"}>{l.rot}</span>, m: valor(l, d.mes), a: valor(l, d.anterior), y: valor(l, d.ano),
          } }))} />
        <div className="mt-2 grid gap-1">
          {d.mes.equilibrio != null && <p className="meta text-t2">{t.equilibrioDre} {brl0(d.mes.equilibrio)}.</p>}
          {cpf.n > 0 && <p className="meta text-warn">{t.passouCPF} {brl0(cpf.total)} {t.emLanc} {cpf.n} {cpf.n === 1 ? t.lancamentoMin : t.lancamentosMin}</p>}
          {(d.mes.aReceber > 0 || d.mes.aPagar > 0) && <p className="meta text-t3">{t.pendentesFora} +{brl0(d.mes.aReceber)} {t.aReceberMin} · −{brl0(d.mes.aPagar)} {t.aPagarMin}</p>}
        </div>
      </Section>

      <details className="mb-8 rounded-cartao bg-s1">
        <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="configuracoes" tamanho={18} />{t.naturezaCategorias}</summary>
        <form action={salvarNaturezasAction} className="grid gap-3 px-4 pb-4">
          <input type="hidden" name="m" value={mes} />
          <p className="meta text-t2">{t.naturezaExplica}</p>
          <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
            {Object.entries(nat).map(([c, v]) => (
              <Campo key={c} tipo="selecao" name={`nat:${c}`} rotulo={c} defaultValue={v}>
                {NATUREZAS.map((n) => <option key={n} value={n}>{t.naturezas[n]}</option>)}
              </Campo>
            ))}
          </div>
          <div><Botao type="submit" icone="confirmar" variante="primario" tamanho="M">{t.salvarNaturezas}</Botao></div>
        </form>
      </details>
    </div>
  );
}
