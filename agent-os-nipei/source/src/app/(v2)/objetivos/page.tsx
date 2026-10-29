
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import ChipDS from "@/components/ds/Chip";
import { chaveEquipe } from "@/components/ds/equipes";
import { EstadoVazio } from "@/components/ds/Estados";
import { BarraProgresso } from "@/components/ds/Progresso";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
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
      <div className="-ml-3 mb-2"><Botao href="/projetos" variante="fantasma" tamanho="P" icone="voltar">{t.projetos}</Botao></div>
      <CabecalhoPagina rotulo={`${ano} · ${objetivos.length}`} titulo={t.objetivos}
        abas={<div className="flex gap-2">{[2026, 2027].map((a) => <ChipDS ativo={ano === a} key={a} href={`/objetivos?ano=${a}${q.equipe ? `&equipe=${q.equipe}` : ""}`}>{a}</ChipDS>)}</div>}
        filtros={<>
          <ChipDS ativo={!q.equipe} href={`/objetivos?ano=${ano}`}>{t.todas}</ChipDS>
          {equipes.map((e) => <ChipDS tipo={chaveEquipe(e.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(e.cor)} ativo={q.equipe === e.id} key={e.id} href={`/objetivos?ano=${ano}&equipe=${e.id}`}>{e.nome}</ChipDS>)}
        </>} />
      {objetivos.length === 0 && <EstadoVazio compacto titulo={<>{t.semItens}</>} />}
      <div className="grid gap-3">
        {objetivos.map((o) => {
          const p = progresso(o.id, tarefas);
          const dono = eq(o.equipe);
          return (
            <div key={o.id} id={o.id} className="scroll-mt-20">
              <Cartao equipe={dono?.id}>
                <div className="flex items-start gap-2">
                  <p className="titulo-cartao min-w-0 flex-1">{o.titulo}</p>
                  {!o.donoConfirmado && <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pilula px-2.5 font-texto text-[13px] font-medium hachurado text-t1 shadow-[inset_0_0_0_1px_var(--s3)]"><Icone nome="prazo" tamanho={14} />{t.donoProposto}</span>}
                  <BotaoIcone icone="mais" aria-label={t.novaTarefa} tamanho={40} variante="fantasma" href={`/tarefas/nova?objetivo=${o.id}&equipe=${o.equipe}&back=/objetivos?ano=${ano}`} />
                </div>
                {o.descricao && (o.descricao.length > 200 ? (
                  <details className="group">
                    <summary className="anel-foco corpo cursor-pointer list-none rounded-interno text-t2"><span className="line-clamp-2 group-open:hidden">{o.descricao}</span><span className="meta underline group-open:hidden">{t.lerMais}</span></summary>
                    <p className="corpo whitespace-pre-line text-t2">{o.descricao}</p>
                  </details>
                ) : <p className="corpo whitespace-pre-line text-t2">{o.descricao}</p>)}
                <div className="flex flex-wrap gap-2">
                  {dono && <ChipDS tipo={chaveEquipe(dono.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(dono.cor)}>{dono.nome}</ChipDS>}
                  {o.apoio.map((a) => { const e = eq(a); return e && <ChipDS tipo={chaveEquipe(e.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(e.cor)} key={a}>{t.apoio}: {e.nome}</ChipDS>; })}
                  {o.projeto && <ChipDS href={`/projetos/${o.projeto}`}>{projetos.find((x) => x.id === o.projeto)?.nome ?? o.projeto}</ChipDS>}
                </div>
                {p ? <BarraProgresso valor={p.done} max={p.total} rotulo={`${p.total ? Math.round((p.done / p.total) * 100) : 0}% · ${p.done}/${p.total}`} /> : <p className="meta text-t3">{t.semTarefasLigadas}</p>}
                {can.editObjetivo(me) && (
                  <details className="group">
                    <summary className="anel-foco meta inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-pilula text-t2 hover:text-t1"><Icone nome="editar" tamanho={16} />{t.editar}: {t.donoEquipe} / {t.apoio}</summary>
                    <form action={updateObjetivoAction} className="mt-2 grid gap-3 rounded-cartao bg-s2 p-3">
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="back" value={`/objetivos?ano=${ano}#${o.id}`} />
                      <Campo tipo="selecao" name="equipe" rotulo={t.donoEquipe} defaultValue={o.equipe} className="bg-s1!">
                        {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </Campo>
                      <fieldset className="grid gap-2">
                        <legend className="rotulo-campo mb-2 text-t3">{t.apoio}</legend>
                        <div className="flex flex-wrap gap-2">
                          {equipes.map((e) => (
                            <label key={e.id} className="anel-foco inline-flex h-9 cursor-pointer items-center gap-2 rounded-pilula bg-s1 px-3.5 font-texto text-sm text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                              <input type="checkbox" name="apoio" value={e.id} defaultChecked={o.apoio.includes(e.id)} className="size-4 accent-ac" />{e.nome}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.confirmarDono}</BotaoEnviar></div>
                    </form>
                  </details>
                )}
              </Cartao>
            </div>
          );
        })}
      </div>
    </>
  );
}
