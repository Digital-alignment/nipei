import Link from "next/link";
import { headers } from "next/headers";
import { AlertTriangle, CalendarClock, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Inbox, Plus, Sun } from "lucide-react";
import { Empty, TaskRow, Title } from "@/components/v2/ui";
import PrazoRapido from "@/components/v2/PrazoRapido";
import ArrastarAgenda from "@/components/v2/ArrastarAgenda";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CopiarBotao from "@/components/v2/CopiarBotao";
import LembrarVista from "@/components/v2/LembrarVista";
import { Suspense } from "react";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Evento, type Tarefa } from "@/lib/v2/data";
import { ordenarAgora, type Selo } from "@/lib/v2/ordem";
import { fmtDate, getT, type Lang } from "@/lib/v2/i18n";
import { loteAction } from "../actions";

const ICS_TTL = 60 * 60 * 24 * 365 * 3;
type T = Awaited<ReturnType<typeof getT>>["t"];
type Quem = "minhas" | "equipe" | "todas";
type Vista = "semana" | "lista" | "mes";

const somar = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const segunda = (iso: string) => somar(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
/** A dated event covers every day from inicio to fim. */
const noDia = (e: Evento, d: string) => e.inicio.length === 10 && e.inicio <= d && (e.fim || e.inicio) >= d;
const porHora = (a: Evento, b: Evento) => (a.hora || "99").localeCompare(b.hora || "99");
/** From this many tasks due in one day, the day is flagged as full. */
const SOBRECARGA = 5;
const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";

function EventoRow({ e, lang, t, cor, mostrarData = true }: { e: Evento; lang: Lang; t: T; cor: string; mostrarData?: boolean }) {
  const aConfirmar = e.status !== "confirmado";
  return (
    <li className="flex items-start gap-3 py-2 pl-2.5 border-l-2 border-b border-b-neutral-100 dark:border-b-neutral-800 last:border-b-0" style={{ borderLeftColor: cor }}>
      <span className={`mt-0.5 shrink-0 text-xs tabular-nums w-11 ${e.hora ? "text-sky-700 dark:text-sky-400 font-medium" : "text-neutral-400"}`}>{e.hora || "—"}</span>
      <div className="min-w-0 flex-1">
        <Link href={`/eventos/${encodeURIComponent(e.id)}`} className={`text-sm hover:underline ${aConfirmar ? "text-neutral-500" : "font-medium"}`}>{e.titulo}</Link>
        <p className="text-xs text-neutral-500">
          {mostrarData && e.inicio.length === 10 ? fmtDate(e.inicio, lang) : ""}{e.fim ? ` → ${fmtDate(e.fim, lang)}` : ""}
          {aConfirmar && <span className="ml-1 rounded border border-dashed border-neutral-400 px-1 text-[10px]">{t.aConfirmar}</span>}
        </p>
      </div>
    </li>
  );
}

/** Segmented control made of links (state lives in the URL). */
function Segmento({ itens }: { itens: { href: string; on: boolean; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5">
      {itens.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.on ? "page" : undefined}
          className={`rounded-md px-3 py-1 text-sm whitespace-nowrap ${i.on ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium" : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>{i.label}</Link>
      ))}
    </div>
  );
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ equipe?: string; vista?: string; m?: string; dia?: string; s?: string; quem?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const user = (await currentUser())!;
  const me = user.pessoa;
  const equipes = getEquipes(), pessoas = getPessoas();
  const vista: Vista = q.vista === "lista" ? "lista" : q.vista === "mes" ? "mes" : "semana";
  // whose agenda: everyone starts with their own (gestão sees the whole picture in /pulso)
  const quem: Quem = q.quem === "equipe" || q.quem === "todas" ? q.quem : "minhas";
  const equipe = quem === "todas" ? q.equipe : undefined;

  const visivel = (x: Tarefa) => quem === "minhas" ? !!me && x.responsaveis.includes(me.id)
    : quem === "equipe" ? user.equipes.includes(x.equipe) : !equipe || x.equipe === equipe;
  const abertas = getTarefas().filter((x) => x.status !== "done" && visivel(x));
  const comPrazo = abertas.filter((x) => x.prazo);
  const semPrazo = abertas.filter((x) => !x.prazo);
  const eventos = getEventos().filter((e) => quem === "todas" ? !equipe || e.equipe === equipe : !e.equipe || user.equipes.includes(e.equipe) || user.gestao);

  const ctx = { hoje, comNovidade: new Set(novidadesPara(user, 3, 50).map((n) => n.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const ordenar = (ts: Tarefa[]) => {
    const o = ordenarAgora(ts, ctx);
    return { tarefas: o.tarefas, selos: Object.fromEntries(Object.entries(o.selos).map(([k, v]) => [k, v.map((x) => rotSelo[x])])) };
  };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: somar(hoje, 1) }, { label: t.maisSemana, data: somar(hoje, 7) }];
  const rowProps = { equipes, pessoas, lang, hoje, me: user };
  const linhas = (ts: Tarefa[], max = Infinity) => {
    const o = ordenar(ts);
    return o.tarefas.slice(0, max).map((x) => (
      <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]} arrastavel={can.editTarefa(user, x)}
        extra={(y) => can.editTarefa(user, y) ? <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} /> : null} />
    ));
  };
  const cor = (id: string) => equipes.find((e) => e.id === id)?.cor ?? "#a3a3a3";
  const link = (p: Record<string, string | undefined>) =>
    "/agenda?" + new URLSearchParams(Object.entries({ quem: q.quem, equipe, vista: q.vista, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  const atrasadas = comPrazo.filter((x) => x.prazo < hoje);
  const reprogramaveis = atrasadas.filter((x) => user.gestao || can.editTarefa(user, x));
  const deHoje = comPrazo.filter((x) => x.prazo === hoje);
  const proximos7 = comPrazo.filter((x) => x.prazo > hoje && x.prazo <= somar(hoje, 7));
  const eventosProx = eventos.filter((e) => e.inicio.length === 10 && (e.fim || e.inicio) >= hoje && e.inicio <= somar(hoje, 30));
  const podeEvento = equipes.some((e) => can.gerirEquipe(user, e.id));
  // events with only a month or a year: shown as "to be scheduled" (they don't fit a day)
  const semDia = eventos.filter((e) => e.inicio.length < 10 && e.inicio >= hoje.slice(0, e.inicio.length)).sort((a, b) => a.inicio.localeCompare(b.inicio));

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const icsUrl = `${origin}/api/agenda/ics?token=${signToken("ics", user.username, ICS_TTL)}${equipe ? `&equipe=${equipe}` : ""}`;
  // summary cards jump to the matching block; "today" always lives in the week view
  const resumo = [
    { n: atrasadas.length, label: t.atrasadas, href: "#atrasadas", icon: AlertTriangle, cls: atrasadas.length ? "text-red-600 dark:text-red-400" : "" },
    { n: deHoje.length + eventos.filter((e) => noDia(e, hoje)).length, label: t.hoje, href: vista === "semana" && !q.s ? `#d-${hoje}` : link({ vista: "semana", s: undefined }) + `#d-${hoje}`, icon: Sun, cls: "" },
    { n: proximos7.length, label: t.proximos7, href: link({ vista: "lista" }), icon: CalendarDays, cls: "" },
    { n: eventosProx.length, label: t.eventos30, href: link({ vista: "lista" }), icon: CalendarClock, cls: "" },
    { n: semPrazo.length, label: t.semPrazoTitulo, href: "#sem-prazo", icon: Inbox, cls: semPrazo.length ? "text-amber-700 dark:text-amber-400" : "" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Title sub={t.agendaSub}>{t.agenda}</Title>
        <div className="flex gap-2 shrink-0 mb-3 sm:mb-0">
          <Link href="/tarefas/nova?back=/agenda" className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium"><Plus size={14} />{t.tarefaLbl}</Link>
          {podeEvento && <Link href="/eventos/novo" className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><CalendarPlus size={14} />{t.eventoLbl}</Link>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {resumo.map((r) => (
          <a key={r.label} href={r.n || r.href.startsWith("/") ? r.href : undefined}
            className={`${CARTAO} px-3 py-2.5 flex flex-col gap-0.5 ${r.n ? "hover:border-neutral-400 dark:hover:border-neutral-600" : "opacity-60"} last:col-span-2 sm:last:col-span-1`}>
            <span className={`flex items-center gap-1.5 text-xs text-neutral-500 ${r.cls}`}><r.icon size={13} />{r.label}</span>
            <span className={`text-xl font-semibold tabular-nums ${r.cls}`}>{r.n}</span>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Segmento itens={(["semana", "lista", "mes"] as const).map((v) => ({ href: link({ vista: v, quem, dia: undefined, m: undefined, s: undefined }), on: vista === v, label: v === "semana" ? t.semanaLbl : v === "lista" ? t.lista : t.mes }))} />
        <Segmento itens={(["minhas", "equipe", "todas"] as const).map((x) => ({ href: link({ quem: x, vista, equipe: undefined }), on: quem === x, label: x === "minhas" ? t.minhas : x === "equipe" ? t.minhaEquipe : t.todas }))} />
      </div>
      {quem === "todas" && (
        <div className="flex gap-1.5 overflow-x-auto mb-2 -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {[{ id: "", nome: t.todasEquipes, cor: "" }, ...equipes].map((e) => (
            <Link key={e.id} href={link({ equipe: e.id || undefined })}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs border ${(equipe ?? "") === e.id ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"}`}>
              {e.cor && <span className="w-2 h-2 rounded-full" style={{ background: e.cor }} />}{e.nome}
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-500 mb-5">{quem === "minhas" ? t.vendoMinhas : quem === "equipe" ? t.vendoEquipe : t.vendoTodas}</p>

      {atrasadas.length > 0 && (
        <details id="atrasadas" open={atrasadas.length <= 8} className="mb-5 scroll-mt-20 rounded-xl border border-red-200 dark:border-red-900/60">
          <summary className="cursor-pointer px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">{t.atrasadas} ({atrasadas.length})</span>
            <span className="text-xs text-neutral-500 flex-1">{t.atrasadasAjuda}</span>
          </summary>
          {reprogramaveis.length > 1 && (
            <form action={loteAction} className="flex flex-wrap items-center gap-2 px-3 pb-2 text-xs">
              <input type="hidden" name="acao" value="prazo" />
              {reprogramaveis.map((x) => <input key={x.id} type="hidden" name="ids" value={x.id} />)}
              <span className="text-neutral-500">{t.moverTodasPara.replace("{n}", String(reprogramaveis.length))}</span>
              <BotaoEnviar name="prazo" value={hoje} enviando="…" className="rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5">{t.paraHoje}</BotaoEnviar>
              <BotaoEnviar name="prazo" value={somar(hoje, 1)} enviando="…" className="rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5">{t.amanha}</BotaoEnviar>
              <BotaoEnviar name="prazo" value={segunda(somar(hoje, 7))} enviando="…" className="rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5">{t.proximaSemana}</BotaoEnviar>
            </form>
          )}
          <ul className="px-1 pb-1">{linhas(atrasadas)}</ul>
        </details>
      )}

      <Suspense><LembrarVista chave="agenda" params={["vista", "quem"]} /></Suspense>
      {vista !== "lista" && <ArrastarAgenda dica={t.dicaArrastar} />}
      {vista === "semana" && <Semana {...{ inicio: /^\d{4}-\d{2}-\d{2}$/.test(q.s ?? "") ? segunda(q.s!) : segunda(hoje), hoje, comPrazo, eventos, linhas, cor, link, t, lang, podeEvento }} />}
      {vista === "lista" && <Lista {...{ hoje, comPrazo, eventos, linhas, cor, t, lang, podeEvento }} />}
      {vista === "mes" && <Mes {...{ mes: /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7), dia: q.dia, hoje, comPrazo, eventos, linhas, cor, link, t, lang, podeEvento }} />}

      <section id="sem-prazo" className={`${CARTAO} mt-8 scroll-mt-20`}>
        <div className="px-4 pt-3 pb-1 flex flex-wrap items-baseline gap-x-3">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Inbox size={15} className="text-amber-600" />{t.semPrazoTitulo} ({semPrazo.length})</p>
          <p className="text-xs text-neutral-500 flex-1">{t.semPrazoAjuda}</p>
        </div>
        {semPrazo.length ? (
          <>
            <ul className="px-1">{linhas(semPrazo, 8)}</ul>
            {semPrazo.length > 8 && <Link href="/hoje" className="block px-4 py-2 text-xs underline text-neutral-500">{t.verTodas} ({semPrazo.length})</Link>}
          </>
        ) : <p className="px-4 pb-3 text-sm text-neutral-500">{t.tudoComPrazo}</p>}
      </section>

      {semDia.length > 0 && (
        <details className={`${CARTAO} mt-4`}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.aDefinirData} ({semDia.length}) <span className="ml-1 text-xs font-normal text-neutral-500">{t.aDefinirAjuda}</span></summary>
          <ul className="px-4 pb-3 grid gap-1.5 sm:grid-cols-2">
            {semDia.map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${encodeURIComponent(e.id)}`} title={t.definirData} className="flex items-center gap-2 text-sm hover:underline">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor(e.equipe) }} />
                  <span className="text-xs text-neutral-500 tabular-nums shrink-0 w-16">{e.inicio.length === 7 ? fmtDate(e.inicio, lang) : e.inicio}</span>
                  <span className="truncate">{e.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className={`${CARTAO} mt-4`}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.googleTitulo}</summary>
        <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <a href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsUrl.replace(/^https?:/, "webcal:"))}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium">{t.adicionarGoogle}</a>
            <CopiarBotao texto={icsUrl} label={t.copiarLinkCal} copiado={t.copiado} />
          </div>
          <p className="text-xs">{t.googleTexto}</p>
        </div>
      </details>
    </>
  );
}

type Comum = { hoje: string; comPrazo: Tarefa[]; eventos: Evento[]; linhas: (ts: Tarefa[]) => React.ReactNode[]; cor: (id: string) => string; t: T; lang: Lang; podeEvento: boolean };

const rotuloDia = (d: string, hoje: string, t: T, lang: Lang) =>
  d === hoje ? t.hoje : d === somar(hoje, 1) ? t.amanha
    : new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** One day block: events by time, then tasks in smart order. Past days only show events (late tasks are in "Atrasadas"). */
function Dia({ d, hoje, comPrazo, eventos, linhas, cor, t, lang, podeEvento, vazio = true }: Comum & { d: string; vazio?: boolean }) {
  const evs = eventos.filter((e) => noDia(e, d)).sort(porHora);
  const ts = d < hoje ? [] : comPrazo.filter((x) => x.prazo === d);
  if ((!vazio || d < hoje) && !evs.length && !ts.length) return null;
  const acoes = d >= hoje && (
    <span className="ml-auto flex gap-3 text-xs font-normal text-neutral-500">
      <Link href={`/tarefas/nova?prazo=${d}&back=/agenda`} className="hover:underline">+ {t.tarefaLbl}</Link>
      {podeEvento && <Link href={`/eventos/novo?inicio=${d}`} className="hover:underline">+ {t.eventoLbl}</Link>}
    </span>
  );
  if (!evs.length && !ts.length) {
    return (
      <section id={`d-${d}`} data-dia={d} className="scroll-mt-20 flex items-baseline gap-2 py-2 text-sm border-b border-dashed border-neutral-200 dark:border-neutral-800">
        <span className="first-letter:uppercase text-neutral-500">{rotuloDia(d, hoje, t, lang)}</span>
        <span className="text-xs text-neutral-400">· {t.livre}</span>{acoes}
      </section>
    );
  }
  return (
    <section id={`d-${d}`} data-dia={d} className={`scroll-mt-20 my-2 rounded-lg ${d === hoje ? "ring-1 ring-neutral-300 dark:ring-neutral-700 px-2" : ""}`}>
      <h2 className={`flex items-baseline gap-2 py-1.5 text-sm border-b border-neutral-200 dark:border-neutral-800 ${d === hoje ? "font-semibold" : "font-medium"} ${d < hoje ? "text-neutral-400" : ""}`}>
        <span className="first-letter:uppercase">{rotuloDia(d, hoje, t, lang)}</span>
        <span className={`text-xs font-normal tabular-nums ${ts.length >= SOBRECARGA ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"}`}>{evs.length + ts.length}{ts.length >= SOBRECARGA ? ` · ${t.diaCheio}` : ""}</span>
        {acoes}
      </h2>
      <ul>
        {evs.map((e) => <EventoRow key={e.id} e={e} lang={lang} t={t} cor={cor(e.equipe)} mostrarData={false} />)}
        {linhas(ts)}
      </ul>
    </section>
  );
}

function Semana({ inicio, link, ...c }: Comum & { inicio: string; link: (p: Record<string, string | undefined>) => string }) {
  const dias = Array.from({ length: 7 }, (_, i) => somar(inicio, i));
  const fim = dias[6];
  const loc = c.lang === "en" ? "en-US" : "pt-BR";
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Link href={link({ s: somar(inicio, -7) })} aria-label="‹" className="p-2"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <p className="text-sm font-medium">{fmt(inicio)} – {fmt(fim)}</p>
          {(c.hoje < inicio || c.hoje > fim) && <Link href={link({ s: undefined })} className="text-xs underline text-neutral-500">{c.t.voltarHoje}</Link>}
        </div>
        <Link href={link({ s: somar(inicio, 7) })} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
      </div>
      {/* week at a glance: load per day; tap to jump (also a drop target for dragging) */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dias.map((d) => {
          const n = d < c.hoje ? 0 : c.comPrazo.filter((x) => x.prazo === d).length;
          const evs = c.eventos.filter((e) => noDia(e, d));
          const passado = d < c.hoje;
          return (
            <a key={d} href={`#d-${d}`} data-dia={d}
              className={`rounded-lg border px-1 py-1.5 text-center flex flex-col items-center gap-1 ${d === c.hoje ? "border-neutral-900 dark:border-white" : "border-neutral-200 dark:border-neutral-800"} ${n >= SOBRECARGA ? "bg-amber-50 dark:bg-amber-950/30" : ""} ${passado ? "opacity-50" : ""}`}>
              <span className="text-[10px] uppercase text-neutral-500">{new Date(`${d}T12:00:00Z`).toLocaleDateString(loc, { weekday: "short", timeZone: "UTC" }).replace(".", "")}</span>
              <span className={`text-sm tabular-nums ${d === c.hoje ? "font-bold" : ""}`}>{Number(d.slice(8))}</span>
              <span className="flex gap-0.5 h-1.5">{evs.slice(0, 3).map((e) => <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: c.cor(e.equipe) }} />)}</span>
              <span className={`min-w-5 rounded-full px-1 text-[10px] leading-4 tabular-nums ${n >= SOBRECARGA ? "bg-amber-500 text-white" : n ? "bg-neutral-200 dark:bg-neutral-800" : "text-neutral-400"}`}>{n || "·"}</span>
            </a>
          );
        })}
      </div>
      {dias.map((d) => <Dia key={d} d={d} {...c} />)}
    </>
  );
}

/** Day by day from today; days far ahead fold by month. */
function Lista(c: Comum) {
  const { hoje, comPrazo, eventos, t, lang } = c;
  const dias = [...new Set([
    ...comPrazo.filter((x) => x.prazo >= hoje).map((x) => x.prazo),
    ...eventos.filter((e) => e.inicio.length === 10 && (e.fim || e.inicio) >= hoje).map((e) => (e.inicio < hoje ? hoje : e.inicio)),
  ])].sort();
  if (!dias.length) return <Empty>{t.semTarefas}</Empty>;
  const limite = somar(hoje, 30);
  const perto = dias.filter((d) => d <= limite);
  const meses = new Map<string, string[]>();
  for (const d of dias.filter((d) => d > limite)) meses.set(d.slice(0, 7), [...(meses.get(d.slice(0, 7)) ?? []), d]);
  return (
    <>
      {perto.map((d) => <Dia key={d} d={d} {...c} vazio={false} />)}
      {[...meses].map(([m, ds]) => (
        <details key={m} className="mb-2">
          <summary className="cursor-pointer py-1.5 text-sm font-medium first-letter:uppercase">{fmtDate(m, lang)} <span className="text-xs font-normal text-neutral-400">({ds.length})</span></summary>
          {ds.map((d) => <Dia key={d} d={d} {...c} vazio={false} />)}
        </details>
      ))}
    </>
  );
}

function Mes({ mes, dia, link, ...c }: Comum & { mes: string; dia?: string; link: (p: Record<string, string | undefined>) => string }) {
  const { hoje, comPrazo, eventos, cor, t, lang } = c;
  const [y, m] = mes.split("-").map(Number);
  const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // weeks start on Monday
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (d: number) => `${mes}-${String(d).padStart(2, "0")}`;
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(dia ?? "") && dia!.startsWith(mes) ? dia! : hoje.startsWith(mes) ? hoje : iso(1);
  const cab = [...t.semana.slice(1), t.semana[0]];
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Link href={link({ m: addMonths(mes, -1), dia: undefined })} aria-label="‹" className="p-2"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <p className="font-semibold first-letter:uppercase">{fmtDate(mes, lang)}</p>
          {!hoje.startsWith(mes) && <Link href={link({ m: undefined, dia: undefined })} className="text-xs underline text-neutral-500">{t.voltarHoje}</Link>}
        </div>
        <Link href={link({ m: addMonths(mes, 1), dia: undefined })} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cab.map((d, i) => <div key={i} className="text-neutral-500 py-1">{d}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(i + 1);
          const col = (first + i) % 7;
          const evs = eventos.filter((e) => noDia(e, d)).slice(0, 2);
          const n = d < hoje ? 0 : comPrazo.filter((x) => x.prazo === d).length;
          const cheio = n >= SOBRECARGA;
          return (
            <Link key={d} href={link({ m: mes, dia: d })} data-dia={d}
              className={`aspect-square rounded-lg flex flex-col items-stretch justify-start pt-1 gap-0.5 border ${d === sel ? "border-neutral-900 dark:border-white" : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"} ${cheio ? "bg-amber-50 dark:bg-amber-950/30" : ""} ${d === hoje ? "font-bold" : ""} ${d < hoje ? "text-neutral-400" : ""}`}>
              <span>{i + 1}</span>
              {evs.map((e) => {
                // a bar that continues across days: square edges where the event goes on
                const comeca = e.inicio === d || col === 0, termina = (e.fim || e.inicio) === d || col === 6;
                return <span key={e.id} title={e.titulo} className={`h-1 ${comeca ? "rounded-l-full ml-1" : "-ml-1"} ${termina ? "rounded-r-full mr-1" : "-mr-1"}`} style={{ background: cor(e.equipe) }} />;
              })}
              {n > 0 && <span className={`mx-auto mt-auto mb-1 min-w-4 rounded-full px-1 text-[10px] leading-4 tabular-nums ${cheio ? "bg-amber-500 text-white" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"}`}>{n}</span>}
            </Link>
          );
        })}
      </div>
      <div className="mt-4"><Dia d={sel} {...c} /></div>
    </>
  );
}
