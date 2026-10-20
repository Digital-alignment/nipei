import Link from "next/link";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import type { Pessoa, Tarefa } from "@/lib/v2/data";
import { lancamentosDoPeriodo, resumoFinanceiro, type Coletivo, type Diagnostico, type Pergunta } from "@/lib/v2/diagnostico";
import type { Dict } from "@/lib/v2/i18n";
import { calendarioAction, periodoAction, salvarItensAction } from "../../../actions";

// D3 panels of the collective page: improvement items (espaço), marketing calendar, finance period.

const cel = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm";
const btn = "rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm";
const primario = "rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium";
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

type P = { d: Diagnostico; c: Coletivo; t: Dict; pode: boolean; pessoas: Pessoa[]; tarefas: Tarefa[] };

const Oculto = ({ d, secao }: { d: Diagnostico; secao: string }) => <><input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="secao" value={secao} /></>;

const LinkTarefa = ({ id, tarefas }: { id: string; tarefas: Tarefa[] }) => {
  const t = tarefas.find((x) => x.id === id);
  return t ? <Link href={`/tarefas/${t.id}`} className="text-xs underline text-neutral-500 whitespace-nowrap">{t.status === "done" ? "✓" : "→"} {t.statusRaw || "A fazer"}</Link> : null;
};

const Pessoas = ({ name, valor, pessoas, t, disabled }: { name: string; valor: string; pessoas: Pessoa[]; t: Dict; disabled?: boolean }) => (
  <select name={name} defaultValue={valor} disabled={disabled} className={cel}>
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
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">{t.itens}{total ? ` · ${t.totalEstimado}: ${brl(total)}` : ""}</p>
      {!itens.length && pode && (
        <form action={salvarItensAction} className="mb-2"><Oculto d={d} secao="espaco" /><input type="hidden" name="pergunta" value={q.id} />
          <BotaoEnviar name="acao" value="sugerir" enviando={t.salvando} className={btn}>{t.sugerirItens}</BotaoEnviar>
        </form>
      )}
      {linhas.length > 0 && (
        <form action={salvarItensAction} className="grid gap-2">
          <Oculto d={d} secao="espaco" /><input type="hidden" name="pergunta" value={q.id} />
          {linhas.map((i, n) => (
            <div key={i?.id ?? `novo${n}`} className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_2fr_1.3fr_auto] gap-1.5 items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <input type="hidden" name={`i:${n}:id`} value={i?.id ?? ""} />
              <input name={`i:${n}:titulo`} defaultValue={i?.titulo} placeholder={t.itens} disabled={!pode} className={`${cel} col-span-2 md:col-span-1`} />
              <select name={`i:${n}:prioridade`} defaultValue={i?.prioridade ?? "media"} disabled={!pode} aria-label={t.prioridade} className={cel}>
                <option value="alta">{t.prio_alta}</option><option value="media">{t.prio_media}</option><option value="baixa">{t.prio_baixa}</option>
              </select>
              <input name={`i:${n}:custo`} type="number" min={0} step={10} defaultValue={i?.custo || ""} placeholder={t.custoAprox} disabled={!pode} className={cel} />
              <input name={`i:${n}:requisitos`} defaultValue={i?.requisitos} placeholder={t.requisitos} disabled={!pode} className={`${cel} col-span-2 md:col-span-1`} />
              <Pessoas name={`i:${n}:responsavel`} valor={i?.responsavel ?? ""} pessoas={pessoas} t={t} disabled={!pode} />
              {i?.tarefa ? <LinkTarefa id={i.tarefa} tarefas={tarefas} /> : <span />}
            </div>
          ))}
          {pode && (
            <div className="flex flex-wrap gap-2">
              <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} className={btn}>{t.salvar}</BotaoEnviar>
              <BotaoEnviar name="acao" value="tarefas" enviando={t.salvando} className={primario}>{t.criarTarefasItens}</BotaoEnviar>
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
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">{t.calendarioMkt}</p>
      {pode && (
        <form action={calendarioAction} className="flex flex-wrap items-end gap-2 mb-2">
          <Oculto d={d} secao="marketing" />
          <label className="grid gap-1 text-xs text-neutral-500">{t.dataRetiro}<input type="date" name="dataRetiro" defaultValue={c.calendario.dataRetiro} required className={cel} /></label>
          <BotaoEnviar name="acao" value="gerar" enviando={t.salvando} className={btn}>{t.gerarCalendario}</BotaoEnviar>
          <p className="text-xs text-neutral-500 basis-full">{t.gerarCalendarioAviso}</p>
        </form>
      )}
      {e.length > 0 && (
        <form action={calendarioAction} className="grid gap-1.5">
          <Oculto d={d} secao="marketing" />
          {e.map((x, n) => (
            <div key={x.id} className="grid grid-cols-[8.5rem_1fr] md:grid-cols-[8.5rem_3fr_1.3fr_auto] gap-1.5 items-center">
              <input type="hidden" name={`e:${n}:id`} value={x.id} />
              <input type="date" name={`e:${n}:data`} defaultValue={x.data} disabled={!pode} className={cel} />
              <input name={`e:${n}:acao`} defaultValue={x.acao} disabled={!pode} className={cel} />
              <Pessoas name={`e:${n}:responsavel`} valor={x.responsavel} pessoas={pessoas} t={t} disabled={!pode} />
              {x.tarefa ? <LinkTarefa id={x.tarefa} tarefas={tarefas} /> : <span className="hidden md:block" />}
            </div>
          ))}
          {pode && (
            <div className="flex flex-wrap gap-2 mt-1">
              <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} className={btn}>{t.salvar}</BotaoEnviar>
              <BotaoEnviar name="acao" value="tarefas" enviando={t.salvando} className={primario}>{t.criarTarefasCalendario}</BotaoEnviar>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

/** Live totals of the ledger for the retreat/dieta period (also what the AI draft reads). */
export function Financas({ d, c, t, pode }: P) {
  const r = resumoFinanceiro(lancamentosDoPeriodo(d, c.periodo));
  const Tabela = ({ titulo, linhas, total }: { titulo: string; linhas: [string, number][]; total: number }) => (
    <div>
      <p className="text-xs text-neutral-500">{titulo} · {brl(total)}</p>
      <ul className="text-sm">{linhas.map(([k, v]) => <li key={k} className="flex justify-between gap-3"><span>{k}</span><span className="tabular-nums">{brl(v)}</span></li>)}</ul>
    </div>
  );
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">{t.periodo}</p>
      <form action={periodoAction} className="flex flex-wrap items-end gap-2 mb-3">
        <Oculto d={d} secao="financas" />
        <label className="grid gap-1 text-xs text-neutral-500">{t.de}<input type="date" name="de" defaultValue={c.periodo.de} disabled={!pode} className={cel} /></label>
        <label className="grid gap-1 text-xs text-neutral-500">{t.ate}<input type="date" name="ate" defaultValue={c.periodo.ate} disabled={!pode} className={cel} /></label>
        {pode && <BotaoEnviar enviando={t.salvando} className={btn}>{t.salvar}</BotaoEnviar>}
      </form>
      {r.n === 0 ? <p className="text-sm text-amber-700 dark:text-amber-400">{t.semLancPeriodo} <Link href="/financas" className="underline">{t.financas}</Link></p> : (
        <div className="grid md:grid-cols-2 gap-4">
          <Tabela titulo={t.entradas} linhas={r.entradas} total={r.totalEntradas} />
          <Tabela titulo={t.despesas} linhas={r.despesas} total={r.totalDespesas} />
          <p className="text-sm font-medium md:col-span-2">{t.resultado}: <span className={r.resultado < 0 ? "text-red-600" : "text-green-700 dark:text-green-400"}>{brl(r.resultado)}</span> · {r.n} {t.lancamentosPeriodo}</p>
        </div>
      )}
    </div>
  );
}
