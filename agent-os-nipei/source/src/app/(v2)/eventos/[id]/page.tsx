import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, Title } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getEventos } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { createEventoAction, updateEventoAction } from "../../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// /eventos/novo creates; /eventos/<id> edits (gestão, or the coordinator of the event's team).
export default async function EventoForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const novo = id === "novo";
  const e = novo ? null : getEventos().find((x) => x.id === decodeURIComponent(id));
  if (!novo && !e) notFound();
  const equipes = getEquipes().filter((x) => can.gerirEquipe(me, x.id) || x.id === e?.equipe);
  if ((e && !can.editEvento(me, e)) || equipes.length === 0) return (<><Title>{e?.titulo ?? t.novoEvento}</Title><Empty>{t.semPermissao}</Empty></>);

  return (
    <>
      <Title>{novo ? t.novoEvento : t.editarEvento}</Title>
      <form action={novo ? createEventoAction : updateEventoAction} className="grid gap-4">
        {e && <input type="hidden" name="id" value={e.id} />}
        <input type="hidden" name="back" value="/agenda" />
        <label className="grid gap-1 text-sm">{t.titulo}<input name="titulo" defaultValue={e?.titulo} required maxLength={150} className={field} /></label>
        {e && !isDay(e.inicio) && <p className="text-xs text-amber-700 dark:text-amber-400">{t.soMes} {e.inicio}</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t.inicio}<input type="date" name="inicio" defaultValue={e && isDay(e.inicio) ? e.inicio : ""} required={novo} className={field} /></label>
          <label className="grid gap-1 text-sm">{t.fim}<input type="date" name="fim" defaultValue={e?.fim} className={field} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t.equipe}
            <select name="equipe" defaultValue={e?.equipe ?? equipes[0].id} className={field}>{equipes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">{t.status}
            <select name="status" defaultValue={e?.status ?? "a_confirmar"} className={field}>
              <option value="a_confirmar">{t.aConfirmar}</option><option value="confirmado">{t.confirmado}</option>
            </select>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{t.salvar}</button>
          <Link href="/agenda" className="rounded-lg px-5 py-2 text-sm border border-neutral-300 dark:border-neutral-700">{t.cancelar}</Link>
        </div>
      </form>
    </>
  );
}
