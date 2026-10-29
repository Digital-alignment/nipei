import Link from "next/link";
import { EstadoVazio } from "@/components/ds/Estados";

import AcervoForm, { FiltroAuto, type AcervoFormLabels } from "@/components/v2/AcervoForm";
import CopiarBotao from "@/components/v2/CopiarBotao";
import ConfirmarBotao from "@/components/v2/ConfirmarBotao";
import Recolhivel, { BotaoSecao } from "@/components/ds/SecaoRecolhivel";
import { ACERVO_TIPOS, currentUser, getAcervo, getPessoas, getProjetos, podeEditarAcervo, type AcervoItem } from "@/lib/v2/data";
import { tipoLink } from "@/lib/v2/acervoLinks";
import { getFatos, getFontes } from "@/lib/v2/conhecimento";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { arquivarAcervoAction, createAcervoAction, ensinarAcervoAction, updateAcervoAction } from "../actions";
import { ToastAoAbrir } from "@/components/ds/Toast";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Chip from "@/components/ds/Chip";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import { BotaoIcone } from "@/components/ds/Botao";
import { MiniAnelPinu } from "@/components/ds/Pinu";

// tipo = ícone + texto (nunca só a cor). TODO(ícones): vídeo, áudio, pasta, documento, marca (pedidos em ICONES.md)
const ICONE: Record<string, NomeIcone> = { fotos: "imagem", videos: "imagem", audios: "microfone", cursos: "sucesso", documentos: "tarefa", marca: "editar", outros: "abrir-fora" };
const ORDENS = ["ano", "recentes", "az"] as const;
const ACAO = "anel-foco inline-flex min-h-9 items-center gap-1.5 rounded-pilula px-2 font-texto text-[13px] font-medium text-t2 hover:bg-s2 hover:text-t1";
const CONTA = "rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2";

// Acervo: index of Google Drive links (files stay in Drive). Search + type chips with counts + project/year/
// sort selects; with no filter the list is grouped by type. Add/edit with link detection (lib/v2/acervoLinks.ts);
// "remove" hides the item (arquivado) without touching Drive. Add: gestão or coordination; edit/remove:
// gestão or whoever added it (podeEditarAcervo).
export default async function Acervo({ searchParams }: { searchParams: Promise<{ tipo?: string; projeto?: string; ano?: string; ordem?: string; q?: string; ok?: string; erro?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const projetos = getProjetos(), pessoas = getPessoas(), todos = getAcervo();
  const podeAdicionar = me.gestao || me.coordena.length > 0;
  const ordem = (ORDENS as readonly string[]).includes(q.ordem ?? "") ? q.ordem! : "ano";
  const busca = (q.q ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const casa = (i: AcervoItem) => !busca || busca.split(/\s+/).every((w) => `${i.titulo} ${i.descricao} ${i.url}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(w));
  // counts per type ignore the type filter, so the chips show what each one would give
  const semTipo = todos.filter((i) => (!q.projeto || i.projeto === q.projeto) && (!q.ano || i.ano === q.ano) && casa(i));
  const itens = semTipo.filter((i) => !q.tipo || i.tipo === q.tipo)
    .sort(ordem === "az" ? (a, b) => a.titulo.localeCompare(b.titulo, "pt") : ordem === "recentes" ? (a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm) : () => 0);
  const filtrando = !!(q.tipo || q.projeto || q.ano || busca || ordem !== "ano");
  const anos = [...new Set(todos.map((i) => i.ano).filter(Boolean))].sort().reverse();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? (id === "claude-code" ? "migração" : id);
  const link = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ tipo: q.tipo, projeto: q.projeto, ano: q.ano, ordem: q.ordem, q: q.q, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/acervo${s ? `?${s}` : ""}`;
  };
  const tiposOpc = ACERVO_TIPOS.map((tp) => ({ id: tp, nome: t.tipos[tp] }));
  // Acervo ↔ Conhecimento: the newest source taught from each item, with its facts
  const fontes = getFontes(), fatos = getFatos();
  const naIA = (id: string) => {
    const f = fontes.filter((x) => x.acervo === id).sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))[0];
    if (!f) return null;
    const meus = fatos.filter((x) => x.fonte === f.id);
    return { f, conf: meus.filter((x) => x.status === "confirmado").length, prop: meus.filter((x) => x.status === "proposto").length };
  };
  const labels: AcervoFormLabels = { link: t.link, titulo: t.titulo, tipo: t.tipo, projeto: t.projeto, ano: t.ano, descricao: t.descricao, nenhum: t.nenhum, salvar: t.salvar, enviando: t.salvando, detectado: t.linkDetectado };

  const Item = ({ i }: { i: AcervoItem }) => {
    const tl = tipoLink(i.url), ia = naIA(i.id), pasta = tl?.rotulo === "Pasta do Drive";
    return (
      <li id={i.id} className="grid scroll-mt-20 gap-2.5 rounded-cartao bg-s1 p-4 target:shadow-[inset_0_0_0_1.5px_var(--ac)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-pilula bg-s2 text-t1"><Icone nome={ICONE[i.tipo] ?? "abrir-fora"} tamanho={20} /></span>
          <div className="min-w-0 flex-1">
            <a href={i.url} target="_blank" rel="noreferrer" className="anel-foco titulo-cartao break-words rounded-interno hover:underline">{i.titulo}</a>
            <p className="meta mt-0.5 text-t3">{[t.tipos[i.tipo] ?? i.tipo, tl?.rotulo, i.ano, i.projeto && (projetos.find((p) => p.id === i.projeto)?.nome ?? i.projeto)].filter(Boolean).join(" · ")}</p>
            {i.descricao && <p className="corpo mt-1 text-t2">{i.descricao}</p>}
          </div>
          <BotaoIcone icone="abrir-fora" aria-label={`${t.abrir}: ${i.titulo}`} tamanho={40} variante="fantasma" href={i.url} />
        </div>
        <div className="-ml-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          {ia ? (
            <Link href={`/conhecimento/${ia.f.id}`} className={`anel-foco inline-flex min-h-9 items-center gap-1.5 rounded-pilula px-3 font-texto text-[13px] font-semibold ${ia.f.status === "erro" ? "bg-err-bg text-err" : "bg-ac-soft text-ac-text"}`}>
              {ia.f.status === "erro" ? <Icone nome="erro" tamanho={14} /> : <MiniAnelPinu tamanho={16} />}
              {t.naIA}: {ia.f.status === "processando" ? t.lendoIA : ia.f.status === "erro" ? t.erroIA : [ia.conf && `${ia.conf} ${t.fatosConfirmadosMin}`, ia.prop && `${ia.prop} ${t.fatosParaRevisar}`].filter(Boolean).join(" · ") || t.semFatos}
            </Link>
          ) : !pasta && (
            <form action={ensinarAcervoAction}><input type="hidden" name="id" value={i.id} /><BotaoEnviar enviando="…" icone="enviar" variante="fantasma" tamanho="P">{t.ensinarIA}</BotaoEnviar></form>
          )}
          {i.adicionadoPor && <span className="meta px-2 text-t3">{t.adicionadoPorLbl} {nome(i.adicionadoPor)}{i.adicionadoEm && ` · ${fmtDate(i.adicionadoEm.slice(0, 10), lang)}`}</span>}
          <span className="ml-auto"><CopiarBotao texto={i.url} label={t.copiarLinkCurto} copiado={t.copiado} className={ACAO} /></span>
          {podeEditarAcervo(me, i) && (
            <details className="group/ed w-full [&:not([open])]:w-auto">
              <summary className={`${ACAO} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><Icone nome="editar" tamanho={14} />{t.editar}</summary>
              <div className="mt-3 grid gap-3 rounded-[16px] bg-s2 p-3">
                <AcervoForm action={updateAcervoAction} id={i.id} tipos={tiposOpc} projetos={projetos} labels={labels} inicial={i} />
                <form action={arquivarAcervoAction}><input type="hidden" name="id" value={i.id} />
                  {/* "remover" nunca é vermelho fora do diálogo (regra 9) */}
                  <ConfirmarBotao pergunta={t.removerAcervoPergunta} className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4"><Icone nome="lixeira" tamanho={16} />{t.removerDoAcervo}</ConfirmarBotao>
                </form>
              </div>
            </details>
          )}
        </div>
      </li>
    );
  };
  const Lista = ({ lista }: { lista: AcervoItem[] }) => <ul className="grid gap-3 md:grid-cols-2">{lista.map((i) => <Item key={i.id} i={i} />)}</ul>;

  return (
    <>
      <CabecalhoPagina selo="quadrados" rotulo={`${todos.length} ${t.itensN}`} titulo={t.acervo} subtitulo={t.acervoIntro}
        acoes={podeAdicionar && <BotaoSecao id="novo" className="anel-foco forma-folha inline-flex h-14 items-center gap-2 bg-ac px-6 font-texto text-base font-semibold text-ac-ink hover:brightness-[.94]"><Icone nome="mais" tamanho={22} />{t.adicionar}</BotaoSecao>}
        filtros={<>
          <Chip href={link({ tipo: undefined })} ativo={!q.tipo} contagem={semTipo.length}>{t.todas}</Chip>
          {ACERVO_TIPOS.map((tp) => {
            const n = semTipo.filter((i) => i.tipo === tp).length;
            return (n > 0 || q.tipo === tp) && <Chip key={tp} href={link({ tipo: tp })} ativo={q.tipo === tp} icone={ICONE[tp]} contagem={n}>{t.tipos[tp]}</Chip>;
          })}
          {filtrando && <Chip href="/acervo" icone="fechar">{t.limpar}</Chip>}
        </>} />
      <ToastAoAbrir texto={q.erro ? undefined : q.ok} />

      {podeAdicionar && (
        <Recolhivel id="novo" titulo={t.novoItem} aberto={todos.length === 0}>
          <AcervoForm action={createAcervoAction} tipos={tiposOpc} projetos={projetos} labels={{ ...labels, salvar: t.adicionar }} />
        </Recolhivel>
      )}

      {/* busca + filtros (10.2): os seletores aplicam-se sozinhos */}
      <FiltroAuto className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,11rem)]">
        {q.tipo && <input type="hidden" name="tipo" value={q.tipo} />}
        <div className="col-span-2 md:col-span-1"><Campo tipo="busca" name="q" rotulo={t.buscar} defaultValue={q.q} /></div>
        <Campo tipo="selecao" name="projeto" rotulo={t.projeto} defaultValue={q.projeto ?? ""}><option value="">{t.todosProjetos}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
        <Campo tipo="selecao" name="ano" rotulo={t.ano} defaultValue={q.ano ?? ""}><option value="">{t.todosAnos}</option>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</Campo>
        <div className="col-span-2 md:col-span-1"><Campo tipo="selecao" name="ordem" rotulo={t.ordenar} defaultValue={ordem}>
          <option value="ano">{t.ordemAno}</option><option value="recentes">{t.ordemRecentes}</option><option value="az">{t.ordemAz}</option>
        </Campo></div>
      </FiltroAuto>
      {filtrando && <p className="meta mb-3 tabular-nums text-t2">{itens.length} {t.itensN}</p>}

      {todos.length === 0 ? <EstadoVazio compacto titulo={<>{t.acervoVazio}</>} /> : itens.length === 0 ? <EstadoVazio compacto titulo={<>{t.semItens}</>} /> : filtrando ? <Lista lista={itens} /> : (
        <div className="grid gap-7">
          {ACERVO_TIPOS.filter((tp) => itens.some((i) => i.tipo === tp)).map((tp) => (
            <section key={tp} className="grid gap-3">
              <h2 className="flex items-center gap-2"><Icone nome={ICONE[tp]} tamanho={20} className="text-t2" /><span className="titulo-secao">{t.tipos[tp]}</span><span className={CONTA}>{itens.filter((i) => i.tipo === tp).length}</span></h2>
              <Lista lista={itens.filter((i) => i.tipo === tp)} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
