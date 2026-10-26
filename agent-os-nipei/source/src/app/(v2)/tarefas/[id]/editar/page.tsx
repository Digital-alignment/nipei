import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EstadoVazio } from "@/components/ds/Estados";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, responsaveisPara } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { updateTarefaAction } from "../../../actions";


export default async function EditarTarefa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const tarefa = getTarefas().find((x) => x.id === id);
  if (!tarefa) notFound();
  // Back to where the task was opened from (same-origin path only).
  const ref = (await headers()).get("referer");
  const refPath = ref ? new URL(ref).pathname + new URL(ref).search : "";
  const raw = q.back ?? refPath;
  // Default back is the task's own detail page.
  const back = raw.startsWith("/") && !raw.startsWith("//") && !raw.endsWith("/editar") ? raw : `/tarefas/${id}`;

  if (!can.editTarefa(me, tarefa) && !can.assumir(me, tarefa)) {
    return (<><CabecalhoPagina titulo={<>{tarefa.title}</>} /><EstadoVazio compacto titulo={<>{t.semPermissao}</>} /><Link href={back} className="text-sm underline">{t.cancelar}</Link></>);
  }

  const equipes = getEquipes().filter((e) => e.id === tarefa.equipe || can.criarEm(me, e.id));
  // team first, then everyone else (access doesn't matter); current owners always stay listed so saving never drops them
  const pessoas = [...responsaveisPara(tarefa.equipe).flatMap((g) => g.pessoas), ...getPessoas().filter((p) => p.externo && tarefa.responsaveis.includes(p.id))];
  const projetos = getProjetos(), objetivos = getObjetivos();

  return (
    <>
      <CabecalhoPagina titulo={<>{t.editarTarefa}</>} subtitulo={<span className="text-xs tabular-nums">{tarefa.id}</span>} />
      <form action={updateTarefaAction} className="grid gap-4">
        <input type="hidden" name="id" value={tarefa.id} />
        <input type="hidden" name="back" value={back} />
        <Campo tipo="texto" rotulo={t.titulo} name="title" defaultValue={tarefa.title} required maxLength={200} />
        <div className="grid grid-cols-2 gap-3">
          <Campo tipo="selecao" rotulo={t.equipe} name="equipe" defaultValue={tarefa.equipe}>{(me.gestao || !tarefa.equipe) && <option value="">{t.semEquipe}</option>}{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Campo>
          <Campo tipo="selecao" rotulo={t.status} name="status" defaultValue={tarefa.status}><option value="todo">{t.aFazer}</option><option value="doing">{t.fazendo}</option><option value="done">{t.feito}</option></Campo>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo tipo="data" rotulo={t.prazo} name="prazo" defaultValue={tarefa.prazo} />
          <Campo tipo="selecao" rotulo={t.projeto} name="projeto" defaultValue={tarefa.projeto}><option value="">{t.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
          <Campo tipo="selecao" rotulo={t.objetivo} name="objetivo" defaultValue={tarefa.objetivo}><option value="">{t.nenhum}</option>{objetivos.map((o) => <option key={o.id} value={o.id}>{o.ano} · {o.titulo}</option>)}</Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <Campo tipo="selecao" rotulo={t.repetir} name="recorrencia" defaultValue={tarefa.recorrencia}><option value="">{t.naoRepete}</option><option value="semanal">{t.semanal}</option><option value="quinzenal">{t.quinzenal}</option><option value="mensal">{t.mensal}</option></Campo>
          <p className="text-xs text-t2 pb-1">{t.repeteAviso}</p>
        </div>
        <fieldset className="grid gap-1 text-sm">
          <legend className="mb-1">{t.responsaveis}</legend>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {pessoas.map((p) => (
              <label key={p.id} className="inline-flex items-center gap-1.5 rounded-pilula bg-s2 px-3 py-1 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                <input type="checkbox" name="responsaveis" value={p.id} defaultChecked={tarefa.responsaveis.includes(p.id)} className="sr-only" />
                {p.name}{p.suspenso && <Icone nome="cadeado"  tamanho={11} aria-label={t.suspensoLbl} className="opacity-60" />}
              </label>
            ))}
          </div>
        </fieldset>
        {tarefa.responsible && tarefa.responsaveis.length === 0 && <p className="text-xs text-t2">v1: {tarefa.responsible}</p>}
        <div className="flex gap-3 pt-2">
          <button className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.salvar}</button>
          <Link href={back} className="rounded-interno px-5 py-2 text-sm bg-s2">{t.cancelar}</Link>
        </div>
      </form>
    </>
  );
}
