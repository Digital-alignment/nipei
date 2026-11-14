import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Aviso from "@/components/ds/Aviso";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import Tabela from "@/components/ds/padroes/Tabela";
import { ToastAoAbrir } from "@/components/ds/Toast";
import { Section } from "@/components/v2/ui";
import EnviarComConfirmacao from "@/components/v2/EnviarComConfirmacao";
import { CATEGORIAS, UNIDADES, currentUser, getContas, getLancamentos, today, unidadeDe } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { TODOS_MESES, compararAnual, getOrcamentoAnual } from "@/lib/v2/orcamentoAnual";
import { podeFinancas } from "@/lib/v2/funcoes";
import { copiarOrcamentoAnualAction, salvarOrcamentoAnualAction } from "../../actions";

// Orçamento anual (DS 10.25, plano financas fase 4): budget per category and month, × actual, forecast for the year.
export const dynamic = "force-dynamic";

const brl0 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`;
const valorBR = (v: number) => (v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export default async function OrcamentoAnualPage({ searchParams }: { searchParams: Promise<{ a?: string; u?: string; ok?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const q = await searchParams;
  const { t } = await getT();
  const hoje = today();
  const ano = /^\d{4}$/.test(q.a ?? "") ? q.a! : hoje.slice(0, 4);
  const u = q.u && q.u in UNIDADES ? q.u : "";
  const contas = getContas();
  const lanc = getLancamentos().filter((l) => !u || unidadeDe(l, contas) === u);
  const orc = getOrcamentoAnual(ano, u);
  const linhas = orc?.linhas ?? [];
  const c = compararAnual(linhas, lanc, ano, hoje);
  const link = (a: string, x = u) => `/financas/orcamento?a=${a}${x ? `&u=${x}` : ""}`;
  const corUso = (x: (typeof c.categorias)[number]) => (x.usado == null ? "text-t2" : x.tipo === "despesa" ? (x.acima ? "text-err" : "text-t1") : x.usado > 1 ? "text-ok" : "text-t1");

  return (
    <div className="mx-auto max-w-5xl">
      <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={<>{t.orcamentoAno} {ano}</>}
        acoes={<div className="flex flex-wrap items-center gap-2">
          <Botao href="/financas" icone="voltar" variante="fantasma" tamanho="M">{t.financas}</Botao>
          <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={link(String(Number(ano) - 1))} />
          <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={link(String(Number(ano) + 1))} />
        </div>} />
      <ToastAoAbrir texto={q.ok} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip href={link(ano, "")} ativo={!u}>{t.todasUnidades}</Chip>
        {Object.entries(UNIDADES).map(([k, v]) => <Chip key={k} href={link(ano, k)} ativo={u === k}>{v}</Chip>)}
      </div>

      {!linhas.length && <Aviso estado="info" className="mb-4" titulo={t.semOrcamentoAno} />}
      {c.alertas.length > 0 && <Aviso estado="atencao" className="mb-4" titulo={`${t.passaram90} ${c.alertas.join(", ")}`} />}

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {([[t.receitasLbl, c.receitas], [t.despesasLbl, c.despesas]] as const).map(([rot, x]) => (
          <Cartao key={rot} variante="kpi">
            <span className="meta text-t2">{rot}</span>
            <span className="font-display text-2xl font-extralight leading-none tabular-nums">{brl0(x.real)}</span>
            <span className="meta text-t3">{t.realizadoAteAgora} · {brl0(x.ateAgora)} {t.orcadoAteAgora}</span>
          </Cartao>
        ))}
        <Cartao variante="kpi"><span className="meta text-t2">{t.previsaoFimAno}</span><span className={`font-display text-2xl font-extralight leading-none tabular-nums ${c.previsaoResultado < 0 ? "text-err" : ""}`}>{brl0(c.previsaoResultado)}</span></Cartao>
      </div>

      {c.categorias.length > 0 && (
        <Section title={t.porCategoriaOrc}>
          <Tabela rotulo={t.porCategoriaOrc} colunas={[
            { id: "c", rotulo: t.categoria }, { id: "a", rotulo: t.orcadoNoAno, numero: true }, { id: "g", rotulo: t.orcadoAteAgoraCol, numero: true, soComputador: true },
            { id: "r", rotulo: t.realizadoLbl, numero: true }, { id: "u", rotulo: t.usadoDoAno, numero: true }, { id: "p", rotulo: t.previsaoFimCol, numero: true, soComputador: true },
          ]} linhas={c.categorias.map((x) => ({ id: x.categoria, celulas: {
            c: <span className="inline-flex flex-wrap items-center gap-2">{x.categoria}<span className="meta text-t3">{x.tipo === "entrada" ? t.entrada : t.despesa}</span>{x.alerta90 && <BadgeEstado estado="aviso">90%</BadgeEstado>}</span>,
            a: x.anual ? brl0(x.anual) : "—", g: x.anual ? brl0(x.ateAgora) : "—", r: brl0(x.real),
            u: <span className={`font-semibold ${corUso(x)}`}>{pct(x.usado)}</span>, p: brl0(x.previsao),
          } }))} />
        </Section>
      )}

      <Section title={t.mesAMes}>
        <Tabela rotulo={t.mesAMes} colunas={[
          { id: "m", rotulo: t.mesLbl }, { id: "ro", rotulo: t.recOrc, numero: true }, { id: "rr", rotulo: t.recReal, numero: true }, { id: "do", rotulo: t.despOrc, numero: true }, { id: "dr", rotulo: t.despReal, numero: true },
        ]} linhas={c.meses.map((m) => ({ id: String(m.mes), celulas: {
          m: <span className={m.futuro ? "text-t3" : "text-t1"}>{t.mesesCurtos[m.mes - 1]}</span>, ro: brl0(m.recO), rr: m.futuro ? "—" : <span className="text-ok">{brl0(m.recR)}</span>,
          do: brl0(m.despO), dr: m.futuro ? "—" : <span className={m.despO && m.despR > m.despO ? "text-err" : "text-t1"}>{brl0(m.despR)}</span>,
        } }))} />
      </Section>

      <details className="mb-8 rounded-cartao bg-s1" open={!linhas.length}>
        <summary className="anel-foco flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-cartao px-4 font-texto text-[15px] font-semibold"><Icone nome="editar" tamanho={18} />{t.editarOrcamento}</summary>
        <div className="grid gap-4 px-4 pb-4">
          <form action={copiarOrcamentoAnualAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="ano" value={ano} /><input type="hidden" name="unidade" value={u} />
            <p className="meta w-full text-t2">{t.comecarDe} {Number(ano) - 1}</p>
            <Campo name="reajuste" rotulo={t.reajustePct} inputMode="decimal" defaultValue="0" className="w-32" />
            <EnviarComConfirmacao icone="gerar-outra" variante="tonal" confirmarRotulo={t.copiarBtn} textoCarregando="…" pergunta={t.copiarPergunta} mensagem={t.copiarExplica}>{t.copiarBtn}</EnviarComConfirmacao>
          </form>
          <form action={salvarOrcamentoAnualAction} className="grid gap-4">
            <input type="hidden" name="ano" value={ano} /><input type="hidden" name="unidade" value={u} />
            {([["entrada", t.entradas], ["despesa", t.despesas]] as const).map(([tipo, titulo]) => (
              <fieldset key={tipo} className="grid gap-3">
                <legend className="titulo-cartao mb-1">{titulo}</legend>
                {CATEGORIAS[tipo].map((cat) => {
                  const l = linhas.find((x) => x.categoria === cat);
                  return (
                    <div key={cat} className="grid gap-2 rounded-interno bg-s2 p-3 md:grid-cols-[14rem_1fr] md:items-center">
                      <Campo name={`v:${cat}`} rotulo={cat} inputMode="decimal" placeholder="0" defaultValue={valorBR(l?.anual ?? 0)} />
                      <div role="group" aria-label={`${t.mesesQueCai}: ${cat}`} className="flex flex-wrap gap-1">
                        {TODOS_MESES.map((m) => (
                          // same toggle chip as EscolherEquipes: check icon + ring when on, visible keyboard focus
                          <label key={m} className="group/mes inline-flex h-9 cursor-pointer select-none items-center gap-1 rounded-pilula bg-s1 px-2.5 font-texto text-sm text-t3 hover:text-t1 has-[:checked]:bg-s3 has-[:checked]:font-medium has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)] has-[:focus-visible]:shadow-foco">
                            <input type="checkbox" name={`m:${cat}`} value={m} defaultChecked={(l?.meses ?? TODOS_MESES).includes(m)} className="sr-only" />
                            <Icone nome="confirmar" tamanho={14} className="hidden text-ac-text group-has-[:checked]/mes:inline" />{t.mesesCurtos[m - 1]}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </fieldset>
            ))}
            <div><Botao type="submit" icone="confirmar" variante="primario" tamanho="M">{t.salvarOrcamentoAnual}</Botao></div>
          </form>
        </div>
      </details>
    </div>
  );
}
