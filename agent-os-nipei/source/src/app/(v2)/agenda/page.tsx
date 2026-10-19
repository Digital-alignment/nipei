import { Fragment } from "react";
import { CalendarDays } from "lucide-react";
import { Chip, Empty, Section, TaskRow, Title } from "@/components/v2/ui";
import { getEquipes, getEventos, getPessoas, getTarefas, today } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";

// Year-only dates ("2027") go after that year's dated items.
const sortKey = (d: string) => (d.length === 4 ? `${d}-99` : d);

// ponytail: chronological list, no month grid yet — the grid and Google Calendar sync are fase 3.
export default async function Agenda({ searchParams }: { searchParams: Promise<{ equipe?: string }> }) {
  const { equipe } = await searchParams;
  const { t, lang } = await getT();
  const hoje = today(), mes = hoje.slice(0, 7);
  const equipes = getEquipes(), pessoas = getPessoas();
  const tarefas = getTarefas().filter((x) => x.prazo >= `${mes}-01` && x.status !== "done" && (!equipe || x.equipe === equipe));
  const eventos = getEventos().filter((e) => e.inicio.slice(0, 7) >= mes.slice(0, e.inicio.length) && (!equipe || e.equipe === equipe));

  type Item = { key: string; date: string; node: React.ReactNode };
  const items: Item[] = [
    ...tarefas.map((x) => ({ key: x.id, date: x.prazo, node: <TaskRow t={x} equipes={equipes} pessoas={pessoas} lang={lang} hoje={hoje} /> })),
    ...eventos.map((e) => ({
      key: e.id, date: e.inicio,
      node: (
        <li className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
          <CalendarDays size={18} className="mt-0.5 text-neutral-500" />
          <div>
            <p className="text-sm font-medium">{e.titulo}</p>
            <p className="text-xs text-neutral-500">{e.inicio.length > 7 ? fmtDate(e.inicio, lang) : ""} {e.status === "confirmado" ? t.confirmado : t.aConfirmar}</p>
          </div>
        </li>
      ),
    })),
  ].sort((a, b) => sortKey(a.date).localeCompare(sortKey(b.date)));

  // Group by month ("2027-01") or by year when only the year is known ("2027").
  const grupos = new Map<string, Item[]>();
  for (const it of items) {
    const k = it.date.length >= 7 ? it.date.slice(0, 7) : it.date;
    grupos.set(k, [...(grupos.get(k) ?? []), it]);
  }

  return (
    <>
      <Title sub={t.semPrazo}>{t.agenda}</Title>
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip href="/agenda" on={!equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} href={`/agenda?equipe=${e.id}`} cor={e.cor} on={equipe === e.id}>{e.nome}</Chip>)}
      </div>
      {items.length === 0 && <Empty>{t.semTarefas}</Empty>}
      {[...grupos].map(([k, its]) => (
        <Section key={k} title={k.length === 7 ? fmtDate(k, lang) : k}>
          <ul>{its.map((it) => <Fragment key={it.key}>{it.node}</Fragment>)}</ul>
        </Section>
      ))}
    </>
  );
}
