import Link from "next/link";
import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Chip from "@/components/ds/Chip";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import { EstadoVazio } from "@/components/ds/Estados";
import { ToastAoAbrir } from "@/components/ds/Toast";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { salvarProjetosFatosAction, sugerirProjetosFatosAction } from "../../actions";
import { currentUser, getEquipes, getProjetos, vault } from "@/lib/v2/data";
import { getFatos } from "@/lib/v2/conhecimento";
import { getSugestoes } from "@/lib/v2/projetos";
import { getT } from "@/lib/v2/i18n";

// Facts by project (DS 10.21, gestão): facts without a project — and, with ?de=, the ones of a catch-all project —
// each with a project selector, preselected by the AI; nothing changes until "Salvar".
export default async function FatosPorProjeto({ searchParams }: { searchParams: Promise<{ ok?: string; de?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const equipes = getEquipes(), projetos = getProjetos().filter((p) => p.status !== "concluido");
  const de = projetos.find((p) => p.id === q.de);
  const ativos = getFatos().filter((f) => f.status === "confirmado" || f.status === "proposto");
  const lista = ativos.filter((f) => !f.projetos.length || (!!de && f.projetos.includes(de.id)));
  const nDe = (id: string) => ativos.filter((f) => f.projetos.includes(id)).length;
  const sug = getSugestoes(vault(), "fatos");
  const grupos = [...equipes.map((e) => ({ id: e.id, nome: e.nome })), { id: "", nome: t.pj.semEquipe }]
    .map((g) => ({ ...g, fs: lista.filter((f) => f.equipe === g.id || (!g.id && !equipes.some((e) => e.id === f.equipe))) })).filter((g) => g.fs.length);
  const comSugestao = lista.filter((f) => sug[f.id] && sug[f.id] !== (de && f.projetos.includes(de.id) ? de.id : "")).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="-ml-3 mb-2"><Botao href="/conhecimento" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" rotulo={t.conhecimento} titulo={t.pj.fatosTitulo} subtitulo={`${lista.length} · ${t.pj.fatosAjuda}`}
        filtros={<>
          <Chip ativo={!de} href="/conhecimento/projetos">{t.pj.soSemProjeto}</Chip>
          {projetos.filter((p) => nDe(p.id) > 0).sort((a, b) => nDe(b.id) - nDe(a.id)).slice(0, 4).map((p) => (
            <Chip key={p.id} ativo={de?.id === p.id} href={`/conhecimento/projetos?de=${p.id}`} contagem={nDe(p.id)}>{`+ ${p.nome}`}</Chip>
          ))}
        </>} />
      {lista.length === 0 ? <EstadoVazio selo="espiral" titulo={t.pj.fatosNenhum} /> : (
        <>
          <Cartao variante="pinu" className="mb-4">
            <p className="corpo text-t1">{t.pj.sugerirAjuda}</p>
            <form action={sugerirProjetosFatosAction}>{de && <input type="hidden" name="de" value={de.id} />}<BotaoEnviar enviando="…" icone="gerar-outra" variante="tonal">{t.pj.sugerir}</BotaoEnviar></form>
            {comSugestao > 0 && <p className="meta text-t2">{comSugestao} {t.pj.sugerido}</p>}
          </Cartao>
          <form action={salvarProjetosFatosAction} className="grid gap-5">
            {de && <input type="hidden" name="de" value={de.id} />}
            {grupos.map((g) => (
              <section key={g.id || "sem"}>
                <h2 className="mb-2 flex items-center gap-2"><span className="titulo-secao">{g.nome}</span><span className="meta text-t3">{g.fs.length}</span></h2>
                <ul className="overflow-hidden rounded-cartao bg-s1">
                  {g.fs.map((f) => {
                    const atual = de && f.projetos.includes(de.id) ? de.id : "", s = sug[f.id];
                    const outros = f.projetos.filter((x) => x !== atual).map((x) => getProjetos().find((p) => p.id === x)?.nome ?? x);
                    return (
                      <li key={f.id} className="grid gap-1.5 border-t border-s2 px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                        <div className="min-w-0">
                          <Link href={`/conhecimento/fato/${f.id}`} className="corpo line-clamp-3 text-t1 hover:underline">{f.texto}</Link>
                          {outros.length > 0 && <p className="meta text-t3">+ {outros.join(", ")}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {s && s !== atual && <Chip tipo="pinu">{t.pj.sugerido}</Chip>}
                          <select name={`p_${f.id}`} defaultValue={s ?? atual} aria-label={`${t.projetos}: ${f.texto.slice(0, 60)}`} className={`${CAMPO_COMPACTO} max-w-56`}>
                            <option value="">{t.pj.manter}</option>
                            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </div>
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
