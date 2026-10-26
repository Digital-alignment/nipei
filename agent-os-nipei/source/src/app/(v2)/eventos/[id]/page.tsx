import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EstadoVazio } from "@/components/ds/Estados";
import Campo from "@/components/ds/Campo";
import { notFound } from "next/navigation";

import { can, currentUser, getEquipes, getEventos } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { createEventoAction, updateEventoAction } from "../../actions";

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// /eventos/novo creates; /eventos/<id> edits (gestão, or the coordinator of the event's team).
export default async function EventoForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ inicio?: string }> }) {
  const { id } = await params;
  const { inicio: inicioQ } = await searchParams; // "+ Evento neste dia" from Agenda
  const { t } = await getT();
  const me = (await currentUser())!;
  const novo = id === "novo";
  const e = novo ? null : getEventos().find((x) => x.id === decodeURIComponent(id));
  if (!novo && !e) notFound();
  const equipes = getEquipes().filter((x) => can.gerirEquipe(me, x.id) || x.id === e?.equipe);
  if ((e && !can.editEvento(me, e)) || equipes.length === 0) return (<><CabecalhoPagina titulo={<>{e?.titulo ?? t.novoEvento}</>} /><EstadoVazio compacto titulo={<>{t.semPermissao}</>} /></>);

  return (
    <>
      <CabecalhoPagina titulo={<>{novo ? t.novoEvento : t.editarEvento}</>} />
      <form action={novo ? createEventoAction : updateEventoAction} className="grid gap-4">
        {e && <input type="hidden" name="id" value={e.id} />}
        <input type="hidden" name="back" value="/agenda" />
        <Campo tipo="texto" rotulo={t.titulo} name="titulo" defaultValue={e?.titulo} required maxLength={150} />
        {e && !isDay(e.inicio) && <p className="text-xs text-warn">{t.soMes} {e.inicio}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Campo tipo="data" rotulo={t.inicio} name="inicio" defaultValue={e && isDay(e.inicio) ? e.inicio : novo && /^\d{4}-\d{2}-\d{2}$/.test(inicioQ ?? "") ? inicioQ : ""} required={novo} />
          <Campo tipo="data" rotulo={t.fim} name="fim" defaultValue={e?.fim} />
        </div>
        <Campo tipo="texto" rotulo={t.hora} type="time" name="hora" defaultValue={e?.hora} />
        <div className="grid grid-cols-2 gap-3">
          <Campo tipo="selecao" rotulo={t.equipe} name="equipe" defaultValue={e?.equipe ?? equipes[0].id}>{equipes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</Campo>
          <Campo tipo="selecao" rotulo={t.status} name="status" defaultValue={e?.status ?? "a_confirmar"}><option value="a_confirmar">{t.aConfirmar}</option><option value="confirmado">{t.confirmado}</option></Campo>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.salvar}</button>
          <Link href="/agenda" className="rounded-interno px-5 py-2 text-sm bg-s2">{t.cancelar}</Link>
        </div>
      </form>
    </>
  );
}
