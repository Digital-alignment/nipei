import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Empty, Section, Title, byPrazo } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getPessoas, getTarefas } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { updateTarefaAction } from "../../actions";

const small = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs max-w-[11rem]";

// Triage for tasks that have no team yet: pick a team (and optionally one person) per task.
export default async function SemEquipe() {
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const tarefas = getTarefas().filter((x) => !x.equipe && x.status !== "done").sort(byPrazo);
  const equipes = getEquipes().filter((e) => can.criarEm(me, e.id) && (me.gestao || me.coordena.includes(e.id)));
  const pessoas = getPessoas().filter((p) => p.equipes.length > 0);

  return (
    <>
      <Link href="/equipes" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.equipes}</Link>
      <Title sub={t.semEquipeIntro}>{t.semEquipe}</Title>
      <Section title={t.tarefasAbertas} count={tarefas.length}>
        {tarefas.length === 0 ? <Empty>{t.semTarefas}</Empty> : (
          <ul>
            {tarefas.map((x) => (
              <li key={x.id} className="py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <Link href={`/tarefas/${x.id}?back=/equipes/sem-equipe`} className="text-sm hover:underline">{x.title}</Link>
                <p className="text-xs text-neutral-500 mt-0.5">{[x.prazo && fmtDate(x.prazo, lang), x.responsible].filter(Boolean).join(" · ")}</p>
                {equipes.length > 0 && (can.editTarefa(me, x) || can.assumir(me, x)) && (
                  <form action={updateTarefaAction} className="flex flex-wrap items-center gap-2 mt-2">
                    <input type="hidden" name="id" value={x.id} />
                    <input type="hidden" name="back" value="/equipes/sem-equipe" />
                    <input type="hidden" name="title" value={x.title} />
                    <input type="hidden" name="status" value={x.status} />
                    <input type="hidden" name="prazo" value={x.prazo} />
                    <input type="hidden" name="projeto" value={x.projeto} />
                    <input type="hidden" name="objetivo" value={x.objetivo} />
                    {x.responsaveis.map((r) => <input key={r} type="hidden" name="responsaveis" value={r} />)}
                    <select name="equipe" required aria-label={t.equipe} className={small}>
                      {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <select name="responsaveis" aria-label={t.responsaveis} className={small} defaultValue="">
                      <option value="">{t.ninguem}</option>
                      {pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs">{t.atribuir}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
