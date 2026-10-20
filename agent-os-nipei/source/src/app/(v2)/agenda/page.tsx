import Link from "next/link";
import { headers } from "next/headers";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Chip, Empty, TaskRow, Title } from "@/components/v2/ui";
import PrazoRapido from "@/components/v2/PrazoRapido";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Evento, type Tarefa } from "@/lib/v2/data";
import { ordenarAgora, type Selo } from "@/lib/v2/ordem";
import { fmtDate, getT, type Lang } from "@/lib/v2/i18n";

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
  const eventos = getEventos().filter((e) => quem === "todas" ? !equipe || e.equipe === equipe : !e.equipe || user.equipes.includes(e.equipe) || user.gestao);

  const ctx = { hoje, comNovidade: new Set(novidadesPara(user, 3, 50).map((n) => n.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const ordenar = (ts: Tarefa[]) => {
    const o = ordenarAgora(ts, ctx);
    return { tarefas: o.tarefas, selos: Object.fromEntries(Object.entries(o.selos).map(([k, v]) => [k, v.map((x) => rotSelo[x])])) };
  };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: somar(hoje, 1) }, { label: t.maisSemana, data: somar(hoje, 7) }];
  const rowProps = { equipes, pessoas, lang, hoje, me: user };
  const linhas = (ts: Tarefa[]) => {
    const o = ordenar(ts);
    return o.tarefas.map((x) => (
      <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]}
        extra={(y) => can.editTarefa(user, y) ? <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} /> : null} />
    ));
  };
  const cor = (id: string) => equipes.find((e) => e.id === id)?.cor ?? "#a3a3a3";
  const link = (p: Record<string, string | undefined>) =>
    "/agenda?" + new URLSearchParams(Object.entries({ quem: q.quem, equipe, vista: q.vista, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  const atrasadas = comPrazo.filter((x) => x.prazo < hoje);
  // events with only a month or a year: shown as "to be scheduled" (they don't fit a day)
  const semDia = eventos.filter((e) => e.inicio.length < 10 && e.inicio >= hoje.slice(0, e.inicio.length)).sort((a, b) => a.inicio.localeCompare(b.inicio));

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const icsUrl = `${origin}/api/agenda/ics?token=${signToken("ics", user.username, ICS_TTL)}${equipe ? `&equipe=${equipe}` : ""}`;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Title sub={t.agendaIntro}>{t.agenda}</Title>
        {equipes.some((e) => can.gerirEquipe(user, e.id)) && (
          <Link href="/eventos/novo" className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm"><Plus size={14} />{t.novoEvento}</Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
        <div className="flex gap-1.5">
          {(["semana", "lista", "mes"] as const).map((v) => <Chip key={v} href={link({ vista: v === "semana" ? undefined : v, dia: undefined, m: undefined, s: undefined })} on={vista === v}>{v === "semana" ? t.semanaLbl : v === "lista" ? t.lista : t.mes}</Chip>)}
        </div>
        <div className="flex gap-1.5">
          {(["minhas", "equipe", "todas"] as const).map((x) => <Chip key={x} href={link({ quem: x, equipe: undefined })} on={quem === x}>{x === "minhas" ? t.minhas : x === "equipe" ? t.minhaEquipe : t.todas}</Chip>)}
        </div>
      </div>
      {quem === "todas" && (
        <div className="flex gap-1.5 overflow-x-auto mb-4 -mx-1 px-1">
          <Chip href={link({ equipe: undefined })} on={!equipe}>{t.todasEquipes}</Chip>
          {equipes.map((e) => <Chip key={e.id} href={link({ equipe: e.id })} cor={e.cor} on={equipe === e.id}>{e.nome}</Chip>)}
        </div>
      )}
      {quem !== "todas" && <div className="mb-4" />}

      {atrasadas.length > 0 && (
        <details open={atrasadas.length <= 8} className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400">{t.atrasadas} ({atrasadas.length})</summary>
          <ul className="px-1 pb-1">{linhas(atrasadas)}</ul>
        </details>
      )}

      {semDia.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">{t.aDefinirData}</p>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {semDia.map((e) => (
              <Link key={e.id} href={`/eventos/${encodeURIComponent(e.id)}`} title={t.definirData}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor(e.equipe) }} />
                <span className="text-neutral-500">{e.inicio.length === 7 ? fmtDate(e.inicio, lang) : e.inicio}</span> {e.titulo}
              </Link>
            ))}
          </div>
        </div>
      )}

      {vista === "semana" && <Semana {...{ inicio: /^\d{4}-\d{2}-\d{2}$/.test(q.s ?? "") ? segunda(q.s!) : segunda(hoje), hoje, comPrazo, eventos, linhas, cor, link, t, lang }} />}
      {vista === "lista" && <Lista {...{ hoje, comPrazo, eventos, linhas, cor, t, lang }} />}
      {vista === "mes" && <Mes {...{ mes: /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7), dia: q.dia, hoje, comPrazo, eventos, linhas, cor, link, t, lang }} />}

      <details className="mt-10 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.googleTitulo}</summary>
        <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400">
          <p className="mb-2">{t.googleTexto}</p>
          <input readOnly value={icsUrl} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono" />
        </div>
      </details>
    </>
  );
}

type Comum = { hoje: string; comPrazo: Tarefa[]; eventos: Evento[]; linhas: (ts: Tarefa[]) => React.ReactNode[]; cor: (id: string) => string; t: T; lang: Lang };

const rotuloDia = (d: string, hoje: string, t: T, lang: Lang) =>
  d === hoje ? t.hoje : d === somar(hoje, 1) ? t.amanha
    : new Date(`${d}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** One day block: events by time, then tasks in smart order. */
function Dia({ d, hoje, comPrazo, eventos, linhas, cor, t, lang, vazio = true }: Comum & { d: string; vazio?: boolean }) {
  const evs = eventos.filter((e) => noDia(e, d)).sort(porHora);
  const ts = comPrazo.filter((x) => x.prazo === d);
  if (!vazio && !evs.length && !ts.length) return null;
  return (
    <section className="mb-3">
      <h2 className={`flex items-baseline gap-2 py-1.5 text-sm border-b border-neutral-200 dark:border-neutral-800 ${d === hoje ? "font-semibold" : "font-medium"} ${d < hoje ? "text-neutral-400" : ""}`}>
        <span className="first-letter:uppercase">{rotuloDia(d, hoje, t, lang)}</span>
        {(evs.length + ts.length > 0) && <span className="text-xs font-normal text-neutral-400 tabular-nums">{evs.length + ts.length}</span>}
      </h2>
      {evs.length + ts.length === 0 ? <p className="py-1.5 text-xs text-neutral-400">{t.livre}</p> : (
        <ul>
          {evs.map((e) => <EventoRow key={e.id} e={e} lang={lang} t={t} cor={cor(e.equipe)} mostrarData={false} />)}
          {linhas(ts)}
        </ul>
      )}
    </section>
  );
}

function Semana({ inicio, link, ...c }: Comum & { inicio: string; link: (p: Record<string, string | undefined>) => string }) {
  const dias = Array.from({ length: 7 }, (_, i) => somar(inicio, i));
  const fim = dias[6];
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(c.lang === "en" ? "en-US" : "pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <Link href={link({ s: somar(inicio, -7) })} aria-label="‹" className="p-2"><ChevronLeft size={20} /></Link>
        <div className="text-center">
          <p className="text-sm font-medium">{fmt(inicio)} – {fmt(fim)}</p>
          {(c.hoje < inicio || c.hoje > fim) && <Link href={link({ s: undefined })} className="text-xs underline text-neutral-500">{c.t.hoje}</Link>}
        </div>
        <Link href={link({ s: somar(inicio, 7) })} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
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
        <p className="font-semibold first-letter:uppercase">{fmtDate(mes, lang)}</p>
        <Link href={link({ m: addMonths(mes, 1), dia: undefined })} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cab.map((d, i) => <div key={i} className="text-neutral-500 py-1">{d}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(i + 1);
          const dots = [...eventos.filter((e) => noDia(e, d)).map((e) => cor(e.equipe)), ...comPrazo.filter((x) => x.prazo === d).map((x) => cor(x.equipe))];
          return (
            <Link key={d} href={link({ m: mes, dia: d })}
              className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 gap-1 border ${d === sel ? "border-neutral-900 dark:border-white" : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"} ${d === hoje ? "font-bold" : ""} ${d < hoje ? "text-neutral-400" : ""}`}>
              {i + 1}
              <span className="flex flex-wrap justify-center gap-0.5 px-1">
                {dots.slice(0, 4).map((x, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: x }} />)}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-4"><Dia d={sel} {...c} /></div>
    </>
  );
}

