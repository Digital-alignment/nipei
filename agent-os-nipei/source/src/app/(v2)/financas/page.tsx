import Link from "next/link";
import Icone from "@/components/ds/Icone";
import { redirect } from "next/navigation";
import { Empty, Section } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";
import Tabela, { Sparkline } from "@/components/ds/padroes/Tabela";
import { CATEGORIAS, currentUser, getEquipes, getLancamentos, getPessoas, getProjetos, today } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import ExportarGoogle from "@/components/v2/ExportarGoogle";
import { anularLancamentoAction, createLancamentoAction } from "../actions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

function Bar({ label, value, max, cls }: { label: string; value: number; max: number; cls: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
      <span className="meta truncate text-t2">{label}</span>
      <div className="h-2 overflow-hidden rounded-pilula bg-s2"><div className={`h-full rounded-pilula ${cls}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
      <span className="meta tabular-nums text-t1">{brl(value)}</span>
    </div>
  );
}

export default async function Financas({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7);
  const todos = getLancamentos();
  const validos = todos.filter((l) => !l.anulado);
  const soma = (ls: typeof validos, tipo: "entrada" | "despesa") => ls.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);
  const doMes = validos.filter((l) => l.data.startsWith(mes));
  const entradas = soma(doMes, "entrada"), despesas = soma(doMes, "despesa");
  const ate = validos.filter((l) => l.data.slice(0, 7) <= mes);
  const saldoTotal = soma(ate, "entrada") - soma(ate, "despesa");

  const projetos = getProjetos(), equipes = getEquipes(), pessoas = getPessoas();
  const porCategoria = Object.entries(doMes.filter((l) => l.tipo === "despesa").reduce<Record<string, number>>((a, l) => ({ ...a, [l.categoria]: (a[l.categoria] ?? 0) + l.valor }), {}))
    .sort((a, b) => b[1] - a[1]);
  const porProjeto = [...new Set(doMes.map((l) => l.projeto))].map((p) => ({
    nome: projetos.find((x) => x.id === p)?.nome ?? t.geral,
    e: soma(doMes.filter((l) => l.projeto === p), "entrada"), d: soma(doMes.filter((l) => l.projeto === p), "despesa"),
  }));
  const meses = Array.from({ length: 6 }, (_, i) => addMonths(mes, i - 5)).map((m) => {
    const ls = validos.filter((l) => l.data.startsWith(m));
    return { m, e: soma(ls, "entrada"), d: soma(ls, "despesa") };
  });
  const maxMes = Math.max(1, ...meses.flatMap((x) => [x.e, x.d]));
  const lista = todos.filter((l) => l.data.startsWith(mes));
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" ")[0] ?? id;

  return (
    <>
      <CabecalhoPagina selo="semente" rotulo={t.gestaoLbl} titulo={t.financas}
        acoes={<ExportarGoogle pessoaId={me.pessoa?.id} t={t} campos={{ tipo: "financas" }} formatos={[{ formato: "sheet", label: t.cx.exportarSheet }]} />} />
      <div className="mb-4 flex items-center justify-between">
        <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={`/financas?m=${addMonths(mes, -1)}`} />
        <p className="titulo-secao first-letter:uppercase">{fmtDate(mes, lang)}</p>
        <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={`/financas?m=${addMonths(mes, 1)}`} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {/* valores em reais são longos: número display menor que o padrão do KPI para caber em 2 colunas no celular */}
        {[[t.entradas, brl(entradas), "text-ok", meses.map((x) => x.e)], [t.despesas, brl(despesas), "text-err", meses.map((x) => x.d)], [t.saldoMes, brl(entradas - despesas), "text-t1", meses.map((x) => x.e - x.d)]].map(([rot, v, cor, pts]) => (
          <Cartao key={rot as string} variante="kpi">
            <span className="meta text-t2">{rot as string}</span>
            <span className={`font-display text-2xl font-extralight leading-none tabular-nums md:text-4xl ${cor}`}>{v as string}</span>
            <Sparkline pontos={pts as number[]} rotulo={rot as string} />
          </Cartao>
        ))}
        {/* o único destaque da tela: o saldo acumulado */}
        <Cartao variante="destaque"><span className="meta opacity-80">{t.saldoTotal}</span><span className="font-display text-2xl font-extralight leading-none tabular-nums md:text-4xl">{brl(saldoTotal)}</span></Cartao>
      </div>

      <details className="mb-7 rounded-cartao bg-s1">
        <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="mais" tamanho={18} />{t.novoLancamento}</summary>
        <form action={createLancamentoAction} className="grid gap-3 px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {([["despesa", t.despesa], ["entrada", t.entrada]] as const).map(([v, rot]) => (
              <label key={v} className="anel-foco inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                <input type="radio" name="tipo" value={v} defaultChecked={v === "despesa"} className="sr-only" /><Icone nome={v === "entrada" ? "mais" : "baixar"} tamanho={16} />{rot}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="data" name="data" rotulo={t.data} defaultValue={hoje} required />
            <Campo name="valor" rotulo={t.valor} inputMode="decimal" placeholder="0,00" required />
          </div>
          <Campo tipo="selecao" name="categoria" rotulo={t.categoria}>
            <optgroup label={t.despesas}>{CATEGORIAS.despesa.map((c) => <option key={c}>{c}</option>)}</optgroup>
            <optgroup label={t.entradas}>{CATEGORIAS.entrada.map((c) => <option key={c}>{c}</option>)}</optgroup>
          </Campo>
          <Campo name="descricao" rotulo={t.descricao} maxLength={200} />
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="selecao" name="projeto" rotulo={t.projeto}><option value="">{t.geral}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
            <Campo tipo="selecao" name="equipe" rotulo={t.equipe}><option value="">{t.nenhum}</option>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Campo>
          </div>
          <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.salvar}</BotaoEnviar></div>
        </form>
      </details>

      {porCategoria.length > 0 && (
        <Section title={t.porCategoria}>
          <div className="grid gap-2">{porCategoria.map(([c, v]) => <Bar key={c} label={c} value={v} max={porCategoria[0][1]} cls="bg-err" />)}</div>
        </Section>
      )}

      {porProjeto.length > 0 && (
        <Section title={t.porProjeto}>
          <Tabela rotulo={t.porProjeto} ordemInicial={{ id: "d", desc: true }} colunas={[
            { id: "nome", rotulo: t.projeto, ordenavel: true }, { id: "e", rotulo: t.entradas, numero: true, ordenavel: true }, { id: "d", rotulo: t.despesas, numero: true, ordenavel: true },
          ]} linhas={porProjeto.map((p) => ({ id: p.nome, valores: { nome: p.nome, e: p.e, d: p.d },
            celulas: { nome: p.nome, e: <span className="text-ok">+{brl(p.e)}</span>, d: <span className="text-err">−{brl(p.d)}</span> } }))} />
        </Section>
      )}

      <Section title={t.ultimosMeses}>
        <div className="grid grid-cols-6 gap-2 items-end h-32">
          {meses.map((x) => (
            <Link key={x.m} href={`/financas?m=${x.m}`} className="flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-0.5 h-full">
                <div className="w-3 rounded-t-[4px] bg-ok" style={{ height: `${(x.e / maxMes) * 100}%` }} title={brl(x.e)} />
                <div className="w-3 rounded-t-[4px] bg-err" style={{ height: `${(x.d / maxMes) * 100}%` }} title={brl(x.d)} />
              </div>
              <span className={`meta ${x.m === mes ? "font-bold text-t1" : "text-t2"}`}>{fmtDate(x.m, lang).slice(0, 3)}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t.lancamentos} count={lista.length}>
        <Tabela rotulo={t.lancamentos} vazio={<Empty>{t.semLancamentos}</Empty>} ordemInicial={{ id: "data", desc: true }} colunas={[
          { id: "desc", rotulo: t.descricao, ordenavel: true }, { id: "data", rotulo: t.data, ordenavel: true }, { id: "cat", rotulo: t.categoria, ordenavel: true },
          { id: "proj", rotulo: t.projeto, soComputador: true }, { id: "por", rotulo: t.registradoPorLbl, soComputador: true }, { id: "valor", rotulo: t.valor, numero: true, ordenavel: true },
        ]} linhas={lista.map((l) => ({
          id: l.id, apagada: l.anulado,
          valores: { desc: l.descricao || l.categoria, data: l.data, cat: l.categoria, valor: l.tipo === "entrada" ? l.valor : -l.valor },
          celulas: {
            desc: <span className={l.anulado ? "line-through" : ""}>{l.descricao || l.categoria}{l.anulado ? ` · ${t.anulado}` : ""}</span>,
            data: fmtDate(l.data, lang), cat: l.categoria, proj: l.projeto ? projetos.find((p) => p.id === l.projeto)?.nome ?? l.projeto : "", por: nome(l.registradoPor),
            valor: <span className={`font-semibold ${l.tipo === "entrada" ? "text-ok" : "text-err"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>,
          },
          acoes: !l.anulado && (
            <form action={anularLancamentoAction}><input type="hidden" name="id" value={l.id} /><BotaoIcone type="submit" icone="fechar" aria-label={`${t.anular}: ${l.descricao || l.categoria}`} tamanho={40} variante="fantasma" /></form>
          ),
        }))} />
      </Section>
    </>
  );
}
