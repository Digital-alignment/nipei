import { Fragment } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Chip, Empty, Section, TaskRow, Title, type RowProps } from "@/components/v2/ui";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, today, type Evento } from "@/lib/v2/data";
import { fmtDate, getT, type Lang } from "@/lib/v2/i18n";

// Year-only dates ("2027") go after that year's dated items.
const sortKey = (d: string) => (d.length === 4 ? `${d}-99` : d);
const ICS_TTL = 60 * 60 * 24 * 365 * 3;

function EventoRow({ e, lang, t }: { e: Evento; lang: Lang; t: { confirmado: string; aConfirmar: string } }) {
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <CalendarDays size={18} className="mt-0.5 text-neutral-500" />
      <div>
        <Link href={`/eventos/${encodeURIComponent(e.id)}`} className="text-sm font-medium hover:underline">{e.titulo}</Link>
        <p className="text-xs text-neutral-500">{e.inicio.length > 7 ? fmtDate(e.inicio, lang) : ""}{e.fim ? ` → ${fmtDate(e.fim, lang)}` : ""} {e.status === "confirmado" ? t.confirmado : t.aConfirmar}</p>
      </div>
    </li>
  );
}

const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

export default async function Agenda({ searchParams }: { searchParams: Promise<{ equipe?: string; vista?: string; m?: string; dia?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const equipe = q.equipe;
  const vistaMes = q.vista === "mes";
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7);
  const equipes = getEquipes(), pessoas = getPessoas();
  const tarefas = getTarefas().filter((x) => x.prazo && x.status !== "done" && (!equipe || x.equipe === equipe));
  const eventos = getEventos().filter((e) => !equipe || e.equipe === equipe);
  const user = await currentUser();
  const rowProps = { equipes, pessoas, lang, hoje, me: user! };
  const link = (p: Record<string, string | undefined>) =>
    "/agenda?" + new URLSearchParams(Object.entries({ equipe, vista: q.vista, m: q.m, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  // Subscription URL for Google Calendar: a long-lived token scoped to "ics" only (cannot log in).
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const icsUrl = user ? `${origin}/api/agenda/ics?token=${signToken("ics", user.username, ICS_TTL)}${equipe ? `&equipe=${equipe}` : ""}` : "";

  return (
    <>
      <Title sub={t.semPrazo}>{t.agenda}</Title>
      {user && equipes.some((e) => can.gerirEquipe(user, e.id)) && (
        <Link href="/eventos/novo" className="inline-flex items-center gap-1 text-sm mb-3 text-neutral-600 dark:text-neutral-400"><Plus size={16} />{t.novoEvento}</Link>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <Chip href={link({ vista: undefined })} on={!vistaMes}>{t.lista}</Chip>
        <Chip href={link({ vista: "mes" })} on={vistaMes}>{t.mes}</Chip>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip href={link({ equipe: undefined })} on={!equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} href={link({ equipe: e.id })} cor={e.cor} on={equipe === e.id}>{e.nome}</Chip>)}
      </div>

      {vistaMes ? <Mes {...{ mes, dia: q.dia, hoje, tarefas, eventos, equipes, link, rowProps, t, lang }} />
        : <Lista {...{ hoje, tarefas, eventos, rowProps, t, lang }} />}

      {icsUrl && (
        <details className="mt-10 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.googleTitulo}</summary>
          <div className="px-4 pb-4 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="mb-2">{t.googleTexto}</p>
            <input readOnly value={icsUrl} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-1.5 text-xs font-mono" />
          </div>
        </details>
      )}
    </>
  );
}

type T = Awaited<ReturnType<typeof getT>>["t"];

function Lista({ hoje, tarefas, eventos, rowProps, t, lang }: { hoje: string; tarefas: ReturnType<typeof getTarefas>; eventos: Evento[]; rowProps: RowProps; t: T; lang: Lang }) {
  const mes = hoje.slice(0, 7);
  const items = [
    ...tarefas.filter((x) => x.prazo >= `${mes}-01`).map((x) => ({ key: x.id, date: x.prazo, node: <TaskRow t={x} {...rowProps} /> })),
    ...eventos.filter((e) => e.inicio.slice(0, 7) >= mes.slice(0, e.inicio.length)).map((e) => ({ key: e.id, date: e.inicio, node: <EventoRow e={e} lang={lang} t={t} /> })),
  ].sort((a, b) => sortKey(a.date).localeCompare(sortKey(b.date)));

  // Group by month ("2027-01") or by year when only the year is known ("2027").
  const grupos = new Map<string, typeof items>();
  for (const it of items) {
    const k = it.date.length >= 7 ? it.date.slice(0, 7) : it.date;
    grupos.set(k, [...(grupos.get(k) ?? []), it]);
  }
  if (!items.length) return <Empty>{t.semTarefas}</Empty>;
  return (
    <>
      {[...grupos].map(([k, its]) => (
        <Section key={k} title={k.length === 7 ? fmtDate(k, lang) : k}>
          <ul>{its.map((it) => <Fragment key={it.key}>{it.node}</Fragment>)}</ul>
        </Section>
      ))}
    </>
  );
}

function Mes({ mes, dia, hoje, tarefas, eventos, equipes, link, rowProps, t, lang }: {
  mes: string; dia?: string; hoje: string; tarefas: ReturnType<typeof getTarefas>; eventos: Evento[]; equipes: ReturnType<typeof getEquipes>;
  link: (p: Record<string, string | undefined>) => string; rowProps: RowProps; t: T; lang: Lang;
}) {
  const [y, m] = mes.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (d: number) => `${mes}-${String(d).padStart(2, "0")}`;
  // A dated event covers every day from inicio to fim.
  const eventosDoDia = (d: string) => eventos.filter((e) => e.inicio.length === 10 && e.inicio <= d && (e.fim || e.inicio) >= d);
  const cor = (id: string) => equipes.find((e) => e.id === id)?.cor ?? "#737373";
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(dia ?? "") && dia!.startsWith(mes) ? dia! : hoje.startsWith(mes) ? hoje : iso(1);
  const selTarefas = tarefas.filter((x) => x.prazo === sel), selEventos = eventosDoDia(sel);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Link href={link({ m: addMonths(mes, -1), dia: undefined })} aria-label="‹" className="p-2"><ChevronLeft size={20} /></Link>
        <p className="font-semibold first-letter:uppercase">{fmtDate(mes, lang)}</p>
        <Link href={link({ m: addMonths(mes, 1), dia: undefined })} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {t.semana.map((d, i) => <div key={i} className="text-neutral-500 py-1">{d}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(i + 1);
          const dots = [...tarefas.filter((x) => x.prazo === d).map((x) => cor(x.equipe)), ...eventosDoDia(d).map((e) => cor(e.equipe))];
          return (
            <Link key={d} href={link({ m: mes, dia: d })}
              className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 gap-1 border ${d === sel ? "border-neutral-900 dark:border-white" : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-700"} ${d === hoje ? "font-bold" : ""} ${d < hoje ? "text-neutral-400" : ""}`}>
              {i + 1}
              <span className="flex flex-wrap justify-center gap-0.5 px-1">
                {dots.slice(0, 4).map((c, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />)}
              </span>
            </Link>
          );
        })}
      </div>
      <Section title={fmtDate(sel, lang)}>
        {selTarefas.length + selEventos.length === 0 ? <Empty>{t.nadaNoDia}</Empty> : (
          <ul>
            {selEventos.map((e) => <EventoRow key={e.id} e={e} lang={lang} t={t} />)}
            {selTarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}
          </ul>
        )}
      </Section>
    </>
  );
}
