import { Lock } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Empty, Title } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, responsaveisPara } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { updateTarefaAction } from "../../../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

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
    return (<><Title>{tarefa.title}</Title><Empty>{t.semPermissao}</Empty><Link href={back} className="text-sm underline">{t.cancelar}</Link></>);
  }

  const equipes = getEquipes().filter((e) => e.id === tarefa.equipe || can.criarEm(me, e.id));
  // team first, then everyone else (access doesn't matter); current owners always stay listed so saving never drops them
  const pessoas = [...responsaveisPara(tarefa.equipe).flatMap((g) => g.pessoas), ...getPessoas().filter((p) => p.externo && tarefa.responsaveis.includes(p.id))];
  const projetos = getProjetos(), objetivos = getObjetivos();

  return (
    <>
      <Title sub={<span className="font-mono text-xs">{tarefa.id}</span>}>{t.editarTarefa}</Title>
      <form action={updateTarefaAction} className="grid gap-4">
        <input type="hidden" name="id" value={tarefa.id} />
        <input type="hidden" name="back" value={back} />
        <label className="grid gap-1 text-sm">{t.titulo}<input name="title" defaultValue={tarefa.title} required maxLength={200} className={field} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t.equipe}
            <select name="equipe" defaultValue={tarefa.equipe} className={field}>
              {(me.gestao || !tarefa.equipe) && <option value="">{t.semEquipe}</option>}
              {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t.status}
            <select name="status" defaultValue={tarefa.status} className={field}>
              <option value="todo">{t.aFazer}</option><option value="doing">{t.fazendo}</option><option value="done">{t.feito}</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-sm">{t.prazo}<input type="date" name="prazo" defaultValue={tarefa.prazo} className={field} /></label>
          <label className="grid gap-1 text-sm">{t.projeto}
            <select name="projeto" defaultValue={tarefa.projeto} className={field}><option value="">{t.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">{t.objetivo}
            <select name="objetivo" defaultValue={tarefa.objetivo} className={field}><option value="">{t.nenhum}</option>{objetivos.map((o) => <option key={o.id} value={o.id}>{o.ano} · {o.titulo}</option>)}</select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="grid gap-1 text-sm">{t.repetir}
            <select name="recorrencia" defaultValue={tarefa.recorrencia} className={field}>
              <option value="">{t.naoRepete}</option><option value="semanal">{t.semanal}</option>
              <option value="quinzenal">{t.quinzenal}</option><option value="mensal">{t.mensal}</option>
            </select>
          </label>
          <p className="text-[11px] text-neutral-500 pb-1">{t.repeteAviso}</p>
        </div>
        <fieldset className="grid gap-1 text-sm">
          <legend className="mb-1">{t.responsaveis}</legend>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {pessoas.map((p) => (
              <label key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 has-[:checked]:bg-neutral-900 has-[:checked]:text-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-neutral-900">
                <input type="checkbox" name="responsaveis" value={p.id} defaultChecked={tarefa.responsaveis.includes(p.id)} className="sr-only" />
                {p.name}{p.suspenso && <Lock size={11} aria-label={t.suspensoLbl} className="opacity-60" />}
              </label>
            ))}
          </div>
        </fieldset>
        {tarefa.responsible && tarefa.responsaveis.length === 0 && <p className="text-xs text-neutral-500">v1: {tarefa.responsible}</p>}
        <div className="flex gap-3 pt-2">
          <button className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{t.salvar}</button>
          <Link href={back} className="rounded-lg px-5 py-2 text-sm border border-neutral-300 dark:border-neutral-700">{t.cancelar}</Link>
        </div>
      </form>
    </>
  );
}
