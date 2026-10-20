import Link from "next/link";
import { Title } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { createTarefaAction } from "../../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

export default async function NovaTarefa({ searchParams }: { searchParams: Promise<{ equipe?: string; projeto?: string; objetivo?: string; back?: string; prazo?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const user = (await currentUser())!;
  const me = user.pessoa;
  // Only the teams this person may create tasks in (plan §4.4); "no team" is for gestão only.
  const equipes = getEquipes().filter((e) => can.criarEm(user, e.id)), projetos = getProjetos(), objetivos = getObjetivos();
  const equipeInicial = equipes.some((e) => e.id === q.equipe) ? q.equipe : me?.equipes.find((id) => equipes.some((e) => e.id === id)) ?? equipes[0]?.id ?? "";
  const pessoas = getPessoas().filter((p) => p.equipes.length > 0);
  const back = q.back?.startsWith("/") && !q.back.startsWith("//") ? q.back : "/hoje";

  return (
    <>
      <Title>{t.novaTarefa}</Title>
      <form action={createTarefaAction} className="grid gap-4">
        <input type="hidden" name="back" value={back} />
        <label className="grid gap-1 text-sm">{t.titulo}
          <input name="title" required autoFocus maxLength={200} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t.equipe}
            <select name="equipe" defaultValue={equipeInicial} className={field}>
              {user.gestao && <option value="">{t.nenhum}</option>}
              {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t.prazo}
            <input type="date" name="prazo" defaultValue={/^\d{4}-\d{2}-\d{2}$/.test(q.prazo ?? "") ? q.prazo : undefined} className={field} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <label className="grid gap-1 text-sm">{t.repetir}
            <select name="recorrencia" defaultValue={""} className={field}>
              <option value="">{t.naoRepete}</option><option value="semanal">{t.semanal}</option>
              <option value="quinzenal">{t.quinzenal}</option><option value="mensal">{t.mensal}</option>
            </select>
          </label>
          <p className="text-[11px] text-neutral-500 pb-1">{t.repeteAviso}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">{t.projeto}
            <select name="projeto" defaultValue={q.projeto ?? ""} className={field}>
              <option value="">{t.nenhum}</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t.objetivo}
            <select name="objetivo" defaultValue={q.objetivo ?? ""} className={field}>
              <option value="">{t.nenhum}</option>
              {objetivos.map((o) => <option key={o.id} value={o.id}>{o.ano} · {o.titulo}</option>)}
            </select>
          </label>
        </div>
        <fieldset className="grid gap-1 text-sm">
          <legend className="mb-1">{t.responsaveis}</legend>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {pessoas.map((p) => (
              <label key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 has-[:checked]:bg-neutral-900 has-[:checked]:text-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-neutral-900">
                <input type="checkbox" name="responsaveis" value={p.id} defaultChecked={p.id === me?.id} className="sr-only" />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-3 pt-2">
          <button className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{t.criar}</button>
          <Link href={back} className="rounded-lg px-5 py-2 text-sm border border-neutral-300 dark:border-neutral-700">{t.cancelar}</Link>
        </div>
      </form>
    </>
  );
}
