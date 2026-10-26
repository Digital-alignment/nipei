import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EstadoVazio } from "@/components/ds/Estados";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { Section, byPrazo } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getPessoas, getTarefas } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { updateTarefaAction } from "../../actions";


// Triage for tasks that have no team yet: pick a team (and optionally one person) per task.
export default async function SemEquipe() {
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const tarefas = getTarefas().filter((x) => !x.equipe && x.status !== "done").sort(byPrazo);
  const equipes = getEquipes().filter((e) => can.criarEm(me, e.id) && (me.gestao || me.coordena.includes(e.id)));
  const pessoas = getPessoas().filter((p) => p.equipes.length > 0);

  return (
    <>
      <Link href="/equipes" className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{t.equipes}</Link>
      <CabecalhoPagina titulo={<>{t.semEquipe}</>} subtitulo={t.semEquipeIntro} />
      <Section title={t.tarefasAbertas} count={tarefas.length}>
        {tarefas.length === 0 ? <EstadoVazio compacto titulo={<>{t.semTarefas}</>} /> : (
          <ul>
            {tarefas.map((x) => (
              <li key={x.id} className="py-3 border-b border-s2 last:border-0">
                <Link href={`/tarefas/${x.id}?back=/equipes/sem-equipe`} className="text-sm hover:underline">{x.title}</Link>
                <p className="text-xs text-t2 mt-0.5">{[x.prazo && fmtDate(x.prazo, lang), x.responsible].filter(Boolean).join(" · ")}</p>
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
                    <Campo tipo="selecao" rotulo={t.equipe} name="equipe" required>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</Campo>
                    <Campo tipo="selecao" rotulo={t.responsaveis} name="responsaveis" defaultValue=""><option value="">{t.ninguem}</option>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Campo>
                    <button className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.atribuir}</button>
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
