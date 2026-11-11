import Link from "next/link";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Botao from "@/components/ds/Botao";
import Tabela from "@/components/ds/padroes/Tabela";
import { CATEGORIAS, type Pessoa, type Tarefa } from "@/lib/v2/data";
import { lancamentosDoPeriodo, resumoFinanceiro, type Coletivo, type Diagnostico, type Pergunta } from "@/lib/v2/diagnostico";
import type { Dict } from "@/lib/v2/i18n";
import { calendarioAction, orcamentoAction, periodoAction, salvarItensAction } from "../../../actions";

// D3 panels of the collective page: improvement items (espaço), marketing calendar, finance period.

const brl = (v: number) => `${v < 0 ? "−" : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

type P = { d: Diagnostico; c: Coletivo; t: Dict; pode: boolean; pessoas: Pessoa[]; tarefas: Tarefa[] };

const Oculto = ({ d, secao }: { d: Diagnostico; secao: string }) => <><input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="secao" value={secao} /></>;

const LinkTarefa = ({ id, tarefas }: { id: string; tarefas: Tarefa[] }) => {
  const t = tarefas.find((x) => x.id === id);
  return t ? <Link href={`/tarefas/${t.id}`} className="text-xs underline text-t2 whitespace-nowrap">{t.statusRaw || "A fazer"}</Link> : null;
};

const Pessoas = ({ name, valor, pessoas, t, disabled }: { name: string; valor: string; pessoas: Pessoa[]; t: Dict; disabled?: boolean }) => (
  <select name={name} defaultValue={valor} disabled={disabled} className={`${CAMPO_COMPACTO} w-full`}>
    <option value="">{t.semResponsavel}</option>
    {pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
  </select>
);

/** Items of one improvement question, each with priority, cost, needs and owner → tasks. */
export function Itens({ d, c, t, pode, pessoas, tarefas, q }: P & { q: Pergunta }) {
  const itens = c.itens[q.id] ?? [];
  const linhas = pode ? [...itens, ...[0, 1].map(() => null)] : itens;
  const total = itens.reduce((a, i) => a + i.custo, 0);
  return (
    <div className="rounded-interno p-3">
      <p className="rotulo-maiusculo text-t3 mb-2">{t.itens}{total ? ` · ${t.totalEstimado}: ${brl(total)}` : ""}</p>
      {!itens.length && pode && (
        <form action={salvarItensAction} className="mb-2"><Oculto d={d} secao="espaco" /><input type="hidden" name="pergunta" value={q.id} />
          <BotaoEnviar name="acao" value="sugerir" enviando={t.salvando} icone="gerar-outra" variante="tonal">{t.sugerirItens}</BotaoEnviar>
        </form>
      )}
      {linhas.length > 0 && (
        <form action={salvarItensAction} className="grid gap-2">
          <Oculto d={d} secao="espaco" /><input type="hidden" name="pergunta" value={q.id} />
          {linhas.map((i, n) => (
            <div key={i?.id ?? `novo${n}`} className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_2fr_1.3fr_auto] gap-1.5 items-center border-b border-s2 pb-2">
              <input type="hidden" name={`i:${n}:id`} value={i?.id ?? ""} />
              <input name={`i:${n}:titulo`} defaultValue={i?.titulo} placeholder={t.itens} disabled={!pode} className={`${CAMPO_COMPACTO} w-full  col-span-2 md:col-span-1`} />
              <select name={`i:${n}:prioridade`} defaultValue={i?.prioridade ?? "media"} disabled={!pode} aria-label={t.prioridade} className={`${CAMPO_COMPACTO} w-full`}>
                <option value="alta">{t.prio_alta}</option><option value="media">{t.prio_media}</option><option value="baixa">{t.prio_baixa}</option>
              </select>
              <input name={`i:${n}:custo`} type="number" min={0} step={10} defaultValue={i?.custo || ""} placeholder={t.custoAprox} disabled={!pode} className={`${CAMPO_COMPACTO} w-full`} />
              <input name={`i:${n}:requisitos`} defaultValue={i?.requisitos} placeholder={t.requisitos} disabled={!pode} className={`${CAMPO_COMPACTO} w-full  col-span-2 md:col-span-1`} />
              <Pessoas name={`i:${n}:responsavel`} valor={i?.responsavel ?? ""} pessoas={pessoas} t={t} disabled={!pode} />
              {i?.tarefa ? <LinkTarefa id={i.tarefa} tarefas={tarefas} /> : <span />}
            </div>
          ))}
          {pode && (
            <div className="flex flex-wrap gap-2">
              <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvar}</BotaoEnviar>
              <BotaoEnviar name="acao" value="tarefas" enviando={t.salvando} icone="tarefa" variante="primario">{t.criarTarefasItens}</BotaoEnviar>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

/** Marketing countdown generated from the retreat date → tasks with due dates (Agenda). */
export function Calendario({ d, c, t, pode, pessoas, tarefas }: P) {
  const e = c.calendario.entradas;
  return (
    <div className="rounded-interno p-3 mb-6">
      <p className="rotulo-maiusculo text-t3 mb-2">{t.calendarioMkt}</p>
      {pode && (
        <form action={calendarioAction} className="flex flex-wrap items-end gap-2 mb-2">
          <Oculto d={d} secao="marketing" />
          <label className="grid gap-1 text-xs text-t2">{t.dataRetiro}<input type="date" name="dataRetiro" defaultValue={c.calendario.dataRetiro} required className={`${CAMPO_COMPACTO} w-full`} /></label>
          <BotaoEnviar name="acao" value="gerar" enviando={t.salvando} icone="calendario" variante="tonal">{t.gerarCalendario}</BotaoEnviar>
          <p className="text-xs text-t2 basis-full">{t.gerarCalendarioAviso}</p>
        </form>
      )}
      {e.length > 0 && (
        <form action={calendarioAction} className="grid gap-1.5">
          <Oculto d={d} secao="marketing" />
          {e.map((x, n) => (
            <div key={x.id} className="grid grid-cols-[8.5rem_1fr] md:grid-cols-[8.5rem_3fr_1.3fr_auto] gap-1.5 items-center">
              <input type="hidden" name={`e:${n}:id`} value={x.id} />
              <input type="date" name={`e:${n}:data`} defaultValue={x.data} disabled={!pode} className={`${CAMPO_COMPACTO} w-full`} />
              <input name={`e:${n}:acao`} defaultValue={x.acao} disabled={!pode} className={`${CAMPO_COMPACTO} w-full`} />
              <Pessoas name={`e:${n}:responsavel`} valor={x.responsavel} pessoas={pessoas} t={t} disabled={!pode} />
              {x.tarefa ? <LinkTarefa id={x.tarefa} tarefas={tarefas} /> : <span className="hidden md:block" />}
            </div>
          ))}
          {pode && (
            <div className="flex flex-wrap gap-2 mt-1">
              <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvar}</BotaoEnviar>
              <BotaoEnviar name="acao" value="tarefas" enviando={t.salvando} icone="calendario" variante="primario">{t.criarTarefasCalendario}</BotaoEnviar>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

/** Finance period of the retreat/dieta (DS 10.25): budget vs real per category, what is still pending and the CSV.
 *  Real = paid/received entries of the period (also what the AI draft and the final document read). */
export function Financas({ d, c, t, pode }: P) {
  const r = resumoFinanceiro(lancamentosDoPeriodo(d, c.periodo), c.orcamento);
  // whoever edits sees every category (to plan the budget); readers only the ones with budget or movement
  const linhas = pode
    ? [...CATEGORIAS.entrada.map((k) => ["entrada", k] as const), ...CATEGORIAS.despesa.map((k) => ["despesa", k] as const)]
      .map(([tipo, k]) => r.comparacao.find((x) => x.categoria === k) ?? { categoria: k, tipo, orcado: 0, real: 0, diferenca: 0, pior: false })
      .concat(r.comparacao.filter((x) => !(CATEGORIAS.entrada as readonly string[]).includes(x.categoria) && !(CATEGORIAS.despesa as readonly string[]).includes(x.categoria)))
    : r.comparacao;
  const form = `orcamento-${d.id}`;
  const dif = (x: (typeof linhas)[number]) => !x.orcado ? <span className="text-t3">—</span>
    : <span className={x.pior ? "text-err" : x.diferenca ? "text-ok" : "text-t2"}>{x.diferenca > 0 ? "+" : ""}{brl(x.diferenca)}</span>;
  return (
    <div className="mb-6 grid gap-4 rounded-interno p-3">
      <div>
        <p className="rotulo-maiusculo mb-2 text-t3">{t.periodo}</p>
        <form action={periodoAction} className="flex flex-wrap items-end gap-2">
          <Oculto d={d} secao="financas" />
          <label className="grid gap-1 text-xs text-t2">{t.de}<input type="date" name="de" defaultValue={c.periodo.de} disabled={!pode} className={`${CAMPO_COMPACTO} w-full`} /></label>
          <label className="grid gap-1 text-xs text-t2">{t.ate}<input type="date" name="ate" defaultValue={c.periodo.ate} disabled={!pode} className={`${CAMPO_COMPACTO} w-full`} /></label>
          {pode && <BotaoEnviar enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvar}</BotaoEnviar>}
        </form>
      </div>
      {r.n === 0 && <p className="text-sm text-warn">{t.semLancPeriodo} <Link href="/financas" className="underline">{t.financas}</Link></p>}
      {linhas.length > 0 && (
        <div>
          <Tabela rotulo={t.orcado} colunas={[
            { id: "cat", rotulo: t.categoria }, { id: "orc", rotulo: t.orcado, numero: true }, { id: "real", rotulo: t.real, numero: true }, { id: "dif", rotulo: t.diferenca, numero: true },
          ]} linhas={linhas.map((x) => ({ id: x.categoria, celulas: {
            cat: <span className="inline-flex flex-wrap items-center gap-2"><span className={`meta ${x.tipo === "entrada" ? "text-ok" : "text-err"}`}>{x.tipo === "entrada" ? t.entrada : t.despesa}</span>{x.categoria}</span>,
            orc: pode ? <input form={form} name={`orc:${x.categoria}`} defaultValue={x.orcado ? x.orcado.toLocaleString("pt-BR") : ""} inputMode="decimal" placeholder="0" aria-label={`${t.orcado}: ${x.categoria}`} className={`${CAMPO_COMPACTO} w-28 text-right tabular-nums`} /> : x.orcado ? brl(x.orcado) : "—",
            real: brl(x.real), dif: dif(x),
          } }))} />
          {pode && <form id={form} action={orcamentoAction} className="mt-3"><Oculto d={d} secao="financas" /><BotaoEnviar enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvarOrcamento}</BotaoEnviar></form>}
        </div>
      )}
      {r.n > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t.entradas} {brl(r.totalEntradas)} · {t.despesas} {brl(r.totalDespesas)} · {t.resultado}: <span className={r.resultado < 0 ? "text-err" : "text-ok"}>{brl(r.resultado)}</span> · {r.n} {t.lancamentosPeriodo}</p>
          {(r.aReceber > 0 || r.aPagar > 0) && <p className="meta text-t2">{t.pendentes}: {brl(r.aReceber)} {t.aReceber.toLowerCase()} · {brl(r.aPagar)} {t.aPagar.toLowerCase()}</p>}
          {pode && <div><Botao href={`/diagnosticos/${d.id}/financas-csv`} download icone="baixar" variante="fantasma" tamanho="M">{t.baixarCsvPeriodo}</Botao></div>}
        </div>
      )}
    </div>
  );
}
