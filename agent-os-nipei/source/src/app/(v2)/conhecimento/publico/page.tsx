import Link from "next/link";
import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Chip from "@/components/ds/Chip";
import { CAMPO_COMPACTO } from "@/components/ds/campoCompacto";
import { EstadoVazio } from "@/components/ds/Estados";
import { ToastAoAbrir } from "@/components/ds/Toast";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { salvarPublicoAction, sugerirPublicoAction } from "../../actions";
import { currentUser, getProjetos, vault } from "@/lib/v2/data";
import { getFatos, type Fato } from "@/lib/v2/conhecimento";
import { USOS, getSugestoesPublico } from "@/lib/v2/publico";
import { getT } from "@/lib/v2/i18n";

const FILTROS = ["classificar", "publicos", "internos", "todos"] as const;

// Public or internal (DS 10.28, gestão): each confirmed fact gets a visibility and a use, preselected by the AI;
// nothing changes until "Salvar". The dossier for outsiders uses only the facts marked public.
export default async function PublicoOuInterno({ searchParams }: { searchParams: Promise<{ ok?: string; f?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const pb = t.pb;
  const filtro = (FILTROS as readonly string[]).includes(q.f ?? "") ? q.f! : "classificar";
  const confirmados = getFatos().filter((f) => f.status === "confirmado");
  const passa = (f: Fato, x: string) => x === "classificar" ? f.publico === null : x === "publicos" ? f.publico === true : x === "internos" ? f.publico === false : true;
  const lista = confirmados.filter((f) => passa(f, filtro));
  const sug = getSugestoesPublico(vault());
  const projetos = getProjetos(), nomeP = (id: string) => projetos.find((p) => p.id === id)?.nome ?? id;
  const grupos = new Map<string, Fato[]>();
  for (const f of lista) { const g = f.projetos[0] ? nomeP(f.projetos[0]) : pb.geral; grupos.set(g, [...(grupos.get(g) ?? []), f]); }
  const nSug = lista.filter((f) => f.publico === null && sug[f.id]).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="-ml-3 mb-2"><Botao href="/conhecimento" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" rotulo={t.conhecimento} titulo={pb.titulo} subtitulo={`${lista.length} · ${pb.ajuda}`}
        filtros={<>{FILTROS.map((x) => <Chip key={x} ativo={filtro === x} href={`/conhecimento/publico?f=${x}`} contagem={confirmados.filter((f) => passa(f, x)).length}>{pb.filtros[x]}</Chip>)}</>} />
      {filtro === "classificar" && lista.length > 0 && (
        <Cartao variante="pinu" className="mb-4">
          <p className="corpo text-t1">{pb.sugerirAjuda}</p>
          <form action={sugerirPublicoAction}><input type="hidden" name="f" value={filtro} /><BotaoEnviar enviando="…" icone="gerar-outra" variante="tonal">{pb.sugerir}</BotaoEnviar></form>
          {nSug > 0 && <p className="meta text-t2">{nSug} {pb.sugeridos}</p>}
        </Cartao>
      )}
      {lista.length === 0 ? <EstadoVazio selo="espiral" titulo={pb.nenhum} /> : (
        <form action={salvarPublicoAction} className="grid gap-5">
          <input type="hidden" name="f" value={filtro} />
          {[...grupos].sort((a, b) => b[1].length - a[1].length).map(([g, fs]) => (
            <section key={g}>
              <h2 className="mb-2 flex items-center gap-2"><span className="titulo-secao">{g}</span><span className="meta text-t3">{fs.length}</span></h2>
              <ul className="overflow-hidden rounded-cartao bg-s1">
                {fs.map((f) => {
                  const s = sug[f.id];
                  const v = f.publico !== null ? (f.publico ? "p" : "i") : s ? (s.p ? "p" : "i") : "i";
                  const u = f.uso || s?.u || "outro";
                  const difere = !!s && (f.publico === null || (s.p !== f.publico || s.u !== f.uso));
                  return (
                    <li key={f.id} className="grid gap-1.5 border-t border-s2 px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                      <Link href={`/conhecimento/fato/${f.id}`} className="corpo line-clamp-3 min-w-0 text-t1 hover:underline">{f.texto}</Link>
                      <div className="flex flex-wrap items-center gap-2">
                        {difere && f.publico === null && <Chip tipo="pinu">{pb.sugerido}</Chip>}
                        <select name={`v_${f.id}`} defaultValue={v} aria-label={`${pb.visibilidade}: ${f.texto.slice(0, 60)}`} className={`${CAMPO_COMPACTO} max-w-32`}>
                          <option value="p">{pb.publico}</option>
                          <option value="i">{pb.interno}</option>
                        </select>
                        <select name={`u_${f.id}`} defaultValue={u} aria-label={`${pb.uso}: ${f.texto.slice(0, 60)}`} className={`${CAMPO_COMPACTO} max-w-40`}>
                          {USOS.map((x) => <option key={x} value={x}>{pb.usos[x]}</option>)}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <div className="sticky bottom-24 z-10 md:bottom-4"><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{pb.salvar}</BotaoEnviar></div>
        </form>
      )}
      <ToastAoAbrir texto={q.ok ? `${pb.salvos}: ${q.ok}` : undefined} />
    </div>
  );
}
