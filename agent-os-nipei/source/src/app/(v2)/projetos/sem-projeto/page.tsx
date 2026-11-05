import Link from "next/link";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Chip from "@/components/ds/Chip";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import { EstadoVazio } from "@/components/ds/Estados";
import { ToastAoAbrir } from "@/components/ds/Toast";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { salvarProjetosAction, sugerirProjetosAction } from "../../actions";
import { can, currentUser, getEquipes, getProjetos, getTarefas, vault } from "@/lib/v2/data";
import { getSugestoes } from "@/lib/v2/projetos";
import { getT } from "@/lib/v2/i18n";

// Tasks without a project (DS 10.21): pick each one's project, optionally preselected by the AI; nothing changes until "Salvar".
export default async function SemProjeto({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes(), projetos = getProjetos().filter((p) => p.status !== "concluido");
  const lista = getTarefas().filter((x) => x.status !== "done" && !x.projeto && can.editTarefa(me, x));
  const sug = getSugestoes(vault());
  const grupos = [...equipes.map((e) => ({ id: e.id, nome: e.nome })), { id: "", nome: t.pj.semEquipe }]
    .map((g) => ({ ...g, ts: lista.filter((x) => x.equipe === g.id || (!g.id && !equipes.some((e) => e.id === x.equipe))) })).filter((g) => g.ts.length);
  const comSugestao = lista.filter((x) => sug[x.id]).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="-ml-3 mb-2"><Botao href="/projetos" variante="fantasma" tamanho="P" icone="voltar">{t.projetos}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.projetos} titulo={t.pj.semProjetoTitulo} subtitulo={`${lista.length} · ${t.pj.semProjetoAjuda}`} />
      {lista.length === 0 ? <EstadoVazio selo="broto" titulo={t.pj.nenhumSemProjeto} /> : (
        <>
          <Cartao variante="pinu" className="mb-4">
            <p className="corpo text-t1">{t.pj.sugerirAjuda}</p>
            <form action={sugerirProjetosAction}><BotaoEnviar enviando="…" icone="gerar-outra" variante="tonal">{t.pj.sugerir}</BotaoEnviar></form>
            {comSugestao > 0 && <p className="meta text-t2">{comSugestao} {t.pj.sugerido}</p>}
          </Cartao>
          <form action={salvarProjetosAction} className="grid gap-5">
            {grupos.map((g) => (
              <section key={g.id || "sem"}>
                <h2 className="mb-2 flex items-center gap-2"><span className="titulo-secao">{g.nome}</span><span className="meta text-t3">{g.ts.length}</span></h2>
                <ul className="overflow-hidden rounded-cartao bg-s1">
                  {g.ts.map((x) => {
                    const s = sug[x.id];
                    return (
                      <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-s2 px-4 py-2.5 first:border-t-0">
                        <Link href={`/tarefas/${x.id}`} className="corpo min-w-0 flex-1 text-t1 hover:underline">{x.title}</Link>
                        {s && <Chip tipo="pinu">{t.pj.sugerido}</Chip>}
                        <select name={`p_${x.id}`} defaultValue={s ?? ""} aria-label={`${t.projetos}: ${x.title}`} className={`${CAMPO_COMPACTO} max-w-56`}>
                          <option value="">{t.pj.manter}</option>
                          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <div className="sticky bottom-24 z-10 md:bottom-4"><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.pj.salvarProjetos}</BotaoEnviar></div>
          </form>
        </>
      )}
      <ToastAoAbrir texto={q.ok ? `${t.pj.salvos}: ${q.ok}` : undefined} />
    </div>
  );
}
