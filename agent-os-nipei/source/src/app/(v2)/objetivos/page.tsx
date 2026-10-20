import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Chip, Progress, Title } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getObjetivos, getProjetos, getTarefas, progresso } from "@/lib/v2/data";
import { updateObjetivoAction } from "../actions";
import { getT } from "@/lib/v2/i18n";

export default async function Objetivos({ searchParams }: { searchParams: Promise<{ ano?: string; equipe?: string }> }) {
  const q = await searchParams;
  const ano = q.ano === "2027" ? 2027 : 2026;
  const { t } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes(), projetos = getProjetos(), tarefas = getTarefas();
  const objetivos = getObjetivos().filter((o) => o.ano === ano && (!q.equipe || o.equipe === q.equipe || o.apoio.includes(q.equipe)));
  const eq = (id: string) => equipes.find((e) => e.id === id);

  return (
    <>
      <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.projetos}</Link>
      <Title>{t.objetivos}</Title>
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 mb-5 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        {[2026, 2027].map((a) => <Chip key={a} href={`/objetivos?ano=${a}${q.equipe ? `&equipe=${q.equipe}` : ""}`} on={ano === a}>{a}</Chip>)}
        <span className="w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />
        <Chip href={`/objetivos?ano=${ano}`} on={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} href={`/objetivos?ano=${ano}&equipe=${e.id}`} cor={e.cor} on={q.equipe === e.id}>{e.nome}</Chip>)}
      </div>
      <div className="grid gap-3">
        {objetivos.map((o) => {
          const p = progresso(o.id, tarefas);
          const dono = eq(o.equipe);
          return (
            <article key={o.id} id={o.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 scroll-mt-20" style={dono ? { borderLeft: `4px solid ${dono.cor}` } : undefined}>
              <p className="font-semibold">{o.titulo}
                {!o.donoConfirmado && <span className="ml-2 align-middle text-[11px] font-normal text-amber-700 dark:text-amber-400">{t.donoProposto}</span>}
              </p>
              {o.descricao && (o.descricao.length > 200 ? (
                <details className="mt-1 group">
                  <summary className="list-none cursor-pointer text-sm text-neutral-600 dark:text-neutral-400"><span className="group-open:hidden line-clamp-2">{o.descricao}</span><span className="text-xs underline text-neutral-500 group-open:hidden">{t.lerMais}</span></summary>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{o.descricao}</p>
                </details>
              ) : <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 whitespace-pre-line">{o.descricao}</p>)}
              <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                {dono && <Chip cor={dono.cor}>{dono.nome}</Chip>}
                {o.apoio.map((a) => { const e = eq(a); return e && <Chip key={a} cor={e.cor}>{t.apoio}: {e.nome}</Chip>; })}
                {o.projeto && <Chip href={`/projetos/${o.projeto}`}>{projetos.find((x) => x.id === o.projeto)?.nome ?? o.projeto}</Chip>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">{p ? <Progress {...p} /> : <span className="text-xs text-neutral-500">{t.semTarefasLigadas}</span>}</div>
                <Link href={`/tarefas/nova?objetivo=${o.id}&equipe=${o.equipe}&back=/objetivos?ano=${ano}`} aria-label={t.novaTarefa} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Plus size={18} /></Link>
              </div>
              {can.editObjetivo(me) && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-neutral-500">{t.editar}: {t.donoEquipe} / {t.apoio}</summary>
                  <form action={updateObjetivoAction} className="grid gap-2 mt-2">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="back" value={`/objetivos?ano=${ano}#${o.id}`} />
                    <label className="grid gap-1 text-xs">{t.donoEquipe}
                      <select name="equipe" defaultValue={o.equipe} className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm">
                        {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </label>
                    <fieldset className="flex flex-wrap gap-3 text-xs">
                      <legend className="mb-1">{t.apoio}</legend>
                      {equipes.map((e) => <label key={e.id} className="inline-flex items-center gap-1"><input type="checkbox" name="apoio" value={e.id} defaultChecked={o.apoio.includes(e.id)} />{e.nome}</label>)}
                    </fieldset>
                    <button className="justify-self-start rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs">{t.confirmarDono}</button>
                  </form>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
