"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checklistAction, focoAction, prazoRapidoAction, setStatusAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";
import Historias from "@/components/ds/Historias";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import MenuAcoes, { type ItemMenu } from "@/components/ds/MenuAcoes";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EQUIPES_DS, type ChaveEquipe } from "@/components/ds/equipes";
import { ABRIR_ASSISTENTE, FECHOU_ASSISTENTE } from "@/components/v2/AssistenteGlobal";
import { abrirPinu } from "@/components/v2/PedirPinu";

// Radar (DESIGN-SYSTEM.md seção 10.29): as minhas tarefas do dia, uma por cartão, para resolver ali mesmo.
// A lista é congelada ao abrir: concluir/adiar marcam o cartão; a página só se atualiza ao fechar.

export type CartaoRadar = {
  id: string; titulo: string; rotulo: string; equipe?: ChaveEquipe;
  motivo: "foco" | "sugestao" | "atrasada" | "hoje" | "pedido"; atraso: number;
  descricao: string; passos: { texto: string; feito: boolean }[]; anexos: number;
  podeEditar: boolean; noFoco: boolean; menu: ItemMenu[];
  /** phase 2: the 2 Pinu suggestions (rules, lib/v2/sugestoesPinu.ts) and whether "Fazer por mim" is running */
  sugestoes: { rotulo: string; texto: string }[]; iaRodando: boolean;
};
export type TextosRadar = {
  radar: string; fechar: string; anterior: string; proximo: string; posicao: string; opcoes: string;
  foco: string; sugestao: string; hoje: string; atrasada1: string; atrasadaN: string; verMais: string; passos: string; anexo1: string; anexosN: string;
  adiar: string; amanha: string; proxSemana: string; outraData: string; abrir: string; concluir: string; feito: string; para: string;
  feitasHoje: string; feitaHoje: string; semana: string; fecharDia: string; tudoFeito: string;
  diga: string; digaPrefixo: string; falar: string; iaFazendo: string;
  entradaMeta: string; porFoco: string; noFoco: string; passada: string; faltam: string; planejarAmanha: string;
};

type Estado = { feito?: boolean; para?: string; passos?: { texto: string; feito: boolean }[]; foco?: boolean };

/** Counts from 0 up to `alvo` once it becomes visible (600 ms; straight to the number with less motion). */
function Contagem({ alvo, ativo }: { alvo: number; ativo: boolean }) {
  const [n, setN] = useState(alvo);
  useEffect(() => {
    if (!ativo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(alvo); return; }
    let raf = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / 600);
      setN(Math.round(alvo * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, ativo]);
  return <span className="numero-display tabular-nums">{n}</span>;
}

export default function Radar({ cartoes, feitasHoje, semana, datas, fmt, pinu, foco, t }: {
  cartoes: CartaoRadar[]; feitasHoje: number;
  /** the person has the assistant (DS 10.29 phase 2: suggestions, "Diga o que fazer") */
  pinu: boolean;
  semana: { letra: string; nome: string; feito: boolean; hoje: boolean }[];
  datas: { amanha: string; proxSemana: string };
  /** dd/mm de cada data que pode aparecer em "Para …" (amanhã e próxima semana); outra data cai no formato curto */
  fmt: Record<string, string>;
  /** today's focus: how many are in it now and the maximum */
  foco: { n: number; max: number };
  t: TextosRadar;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  // while the Pinu panel is open the Radar steps aside, keeping its card; it comes back when the panel closes
  const [oculto, setOculto] = useState(false);
  const [lista, setLista] = useState<CartaoRadar[]>([]);
  const [atual, setAtual] = useState(0);
  const [estado, setEstado] = useState<Record<string, Estado>>({});
  const [adiando, setAdiando] = useState(false);
  const [, iniciar] = useTransition();

  const abrir = () => { setLista(cartoes); setEstado({}); setAtual(0); setAdiando(false); setOculto(false); setAberto(true); };
  const fechar = useCallback(() => { setAberto(false); router.refresh(); }, [router]);
  const mudar = useCallback((i: number) => { setAtual(i); setAdiando(false); }, []);

  useEffect(() => {
    if (!aberto) return;
    const sair = () => setOculto(true), voltar = () => setOculto(false);
    window.addEventListener(ABRIR_ASSISTENTE, sair);
    window.addEventListener(FECHOU_ASSISTENTE, voltar);
    return () => { window.removeEventListener(ABRIR_ASSISTENTE, sair); window.removeEventListener(FECHOU_ASSISTENTE, voltar); };
  }, [aberto]);

  const marcar = (id: string, e: Estado) => setEstado((s) => ({ ...s, [id]: { ...s[id], ...e } }));
  const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the ✓ grows (300 ms) before moving on
  const seguir = () => setTimeout(() => setAtual((i) => Math.min(i + 1, lista.length)), reduzido() ? 200 : 600);
  const enviar = (acao: (f: FormData) => unknown, campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    iniciar(async () => { await acao(f); });
  };
  const concluir = (c: CartaoRadar) => {
    if (offline()) enfileirar({ tipo: "status", id: c.id, valor: "done" });
    else enviar(setStatusAction, { id: c.id, status: "done" });
    marcar(c.id, { feito: true }); seguir();
  };
  const adiar = (c: CartaoRadar, data: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
    if (offline()) enfileirar({ tipo: "prazo", id: c.id, valor: data });
    else enviar(prazoRapidoAction, { id: c.id, prazo: data });
    marcar(c.id, { para: data }); setAdiando(false); seguir();
  };
  const alternarPasso = (c: CartaoRadar, i: number) => {
    const ps = (estado[c.id]?.passos ?? c.passos).map((p, k) => (k === i ? { ...p, feito: !p.feito } : p));
    marcar(c.id, { passos: ps });
    enviar(checklistAction, { id: c.id, op: "toggle", idx: String(i) });
  };
  const noFoco = (c: CartaoRadar) => estado[c.id]?.foco ?? c.noFoco;
  const focoAgora = foco.n + lista.reduce((n, c) => n + (estado[c.id]?.foco === undefined || estado[c.id].foco === c.noFoco ? 0 : estado[c.id].foco ? 1 : -1), 0);
  const alternarFoco = (c: CartaoRadar) => { marcar(c.id, { foco: !noFoco(c) }); enviar(focoAction, { id: c.id }); };
  const dataCurta = (d: string) => fmt[d] ?? `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  const concluidos = lista.filter((c) => estado[c.id]?.feito), adiados = lista.filter((c) => estado[c.id]?.para && !estado[c.id]?.feito);
  const pendentes = lista.filter((c) => !estado[c.id]?.feito && !estado[c.id]?.para);
  const feitasAgora = feitasHoje + concluidos.length;
  const atualCartao = lista[atual];

  const cartao = (c: CartaoRadar) => {
    const e = estado[c.id] ?? {}, passos = e.passos ?? c.passos, resolvido = e.feito || !!e.para;
    const fundo = c.equipe ? `color-mix(in srgb, var(--eq-${c.equipe}) 22%, var(--s1))` : "var(--s1)";
    const pagina = `/tarefas/${c.id}`;
    const motivo = c.motivo === "atrasada"
      ? <BadgeEstado estado="atrasada">{c.atraso === 1 ? t.atrasada1 : t.atrasadaN.replace("{n}", String(c.atraso))}</BadgeEstado>
      : c.motivo === "foco" ? <BadgeEstado estado="andamento">{t.foco}</BadgeEstado>
      : c.motivo === "sugestao" ? <BadgeEstado estado="pendente">{t.sugestao}</BadgeEstado>
      : c.motivo === "hoje" ? <BadgeEstado estado="aviso">{t.hoje}</BadgeEstado> : null;
    const focado = noFoco(c), podeFoco = c.podeEditar && !resolvido && (focado || focoAgora < foco.max);
    const pedirPinu = (texto: string, rotulo?: string) => abrirPinu({ texto, rotulo, pagina, assunto: { titulo: c.titulo, href: pagina } });
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-cartao" style={{ background: fundo }}>
        {e.feito && (
          // concluir: the ✓ grows in the middle of the card, then the Radar moves on
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span className="radar-crescer grid size-24 place-items-center rounded-pilula bg-ac text-ac-ink"><Icone nome="confirmar" tamanho={44} /></span>
          </div>
        )}
        {/* centred when short (my-auto inside a scrolling flex column: never clips the top when long) */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3 pt-5">
        <div className="my-auto grid justify-items-center gap-3 text-center">
          <Selo nome={c.equipe ? EQUIPES_DS[c.equipe].selo : "broto"} tamanho={64} className="size-14 text-t1 opacity-85 sm:size-16" />
          <p className="rotulo-maiusculo text-t2">{c.rotulo}</p>
          {/* the title opens the task; wrapped because a grid item is blockified and line-clamp needs -webkit-box */}
          <div className="w-full">
            <Link href={pagina} className="anel-foco saudacao line-clamp-3 rounded-interno text-balance !text-[26px] !leading-[1.2] text-t1 hover:underline sm:!text-[30px]">{c.titulo}</Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {e.feito ? <span className="radar-crescer"><BadgeEstado estado="feita">{t.feito}</BadgeEstado></span>
              : e.para ? <span className="radar-crescer"><BadgeEstado estado="pendente">{t.para.replace("{data}", dataCurta(e.para))}</BadgeEstado></span>
              : motivo}
            {c.iaRodando && !e.feito && <BadgeEstado estado="andamento">{t.iaFazendo}</BadgeEstado>}
            {podeFoco && <Chip icone="inicio" ativo={focado} onClick={() => alternarFoco(c)}>{focado ? t.noFoco : t.porFoco}</Chip>}
          </div>
          {c.descricao && (
            <details className="group w-full text-left">
              <summary className="anel-foco list-none rounded-interno [&::-webkit-details-marker]:hidden">
                <span className="corpo line-clamp-3 text-t1 group-open:line-clamp-none">{c.descricao}</span>
                <span className="meta mt-1 inline-flex items-center gap-1 font-medium text-t2 group-open:hidden">{t.verMais}<Icone nome="abrir" tamanho={16} /></span>
              </summary>
            </details>
          )}
          {passos.length > 0 && (
            <div className="grid w-full gap-1 text-left">
              <BarraProgresso valor={passos.filter((p) => p.feito).length} segmentos={passos.length} rotulo={`${passos.filter((p) => p.feito).length}/${passos.length}`} rotuloAcessivel={t.passos} />
              <ul>
                {passos.slice(0, 8).map((p, i) => (
                  <li key={i}>
                    <button type="button" disabled={!c.podeEditar} onClick={() => alternarPasso(c, i)}
                      className="anel-foco flex min-h-11 w-full items-center gap-3 rounded-interno text-left disabled:cursor-default">
                      <span className={`grid size-[22px] shrink-0 place-items-center rounded-pilula transition-colors duration-150 ${p.feito ? "bg-ac text-ac-ink" : "shadow-[inset_0_0_0_2px_var(--t2)]"}`}>{p.feito && <Icone nome="confirmar" tamanho={13} />}</span>
                      <span className={`corpo min-w-0 flex-1 ${p.feito ? "text-t2 line-through" : "text-t1"}`}>{p.texto}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.anexos > 0 && <Chip href={pagina} icone="pasta">{c.anexos === 1 ? t.anexo1 : t.anexosN.replace("{n}", String(c.anexos))}</Chip>}
        </div>
        </div>

        {/* bottom bar (DS 10.29): row 1 = Pinu suggestions (or postpone options), row 2 = field + Adiar + Concluir */}
        {!resolvido && (
          <div className="grid gap-2 px-3 pb-3 pt-1">
            {adiando ? (
              <div className="flex items-center gap-2 overflow-x-auto">
                <Chip onClick={() => adiar(c, datas.amanha)} icone="prazo">{t.amanha}</Chip>
                <Chip onClick={() => adiar(c, datas.proxSemana)} icone="prazo">{t.proxSemana}</Chip>
                <label className="anel-foco inline-flex h-9 shrink-0 items-center rounded-pilula bg-s2 px-3 text-sm font-medium text-t1">
                  <input type="date" min={datas.amanha} aria-label={t.outraData} onChange={(ev) => adiar(c, ev.target.value)} className="bg-transparent text-t1 outline-none" />
                </label>
              </div>
            ) : pinu && c.sugestoes.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                {c.sugestoes.map((x) => <span key={x.rotulo} className="shrink-0"><Chip tipo="pinu" onClick={() => pedirPinu(x.texto, x.rotulo)}>{x.rotulo}</Chip></span>)}
              </div>
            )}
            <div className="flex items-center gap-2">
              {pinu ? (
                <form className="min-w-0 flex-1" onSubmit={(ev) => {
                  ev.preventDefault();
                  const campo = ev.currentTarget.elements.namedItem("pedido") as HTMLInputElement;
                  const texto = campo.value.trim();
                  if (texto) { campo.value = ""; pedirPinu(`${t.digaPrefixo.replace("{t}", c.titulo)}${texto}`); }
                }}>
                  <Campo tipo="busca" pinu name="pedido" rotulo={t.diga} autoComplete="off" maxLength={500}
                    onMicrofone={() => abrirPinu({ voz: true, prefixo: t.digaPrefixo.replace("{t}", c.titulo), pagina, assunto: { titulo: c.titulo, href: pagina } })} />
                </form>
              ) : <Botao href={pagina} variante="tonal" tamanho="M" icone="abrir-fora" largo className="flex-1">{t.abrir}</Botao>}
              {c.podeEditar && <BotaoIcone icone="prazo" aria-label={t.adiar} aria-expanded={adiando} tamanho={52} variante={adiando ? "acento" : "tonal"} onClick={() => setAdiando((x) => !x)} />}
              {c.podeEditar && <BotaoIcone icone="confirmar" aria-label={t.concluir} tamanho={52} variante="acento" onClick={() => concluir(c)} />}
            </div>
          </div>
        )}
      </div>
    );
  };

  const noFinal = atual === lista.length;
  const final = (
    <Cartao variante="pinu" className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto text-center">
      <div className="grid gap-1">
        <Contagem alvo={feitasAgora} ativo={noFinal} />
        <span className="rotulo-maiusculo text-t2">{feitasAgora === 1 ? t.feitaHoje : t.feitasHoje}</span>
      </div>
      <div aria-label={t.semana} role="list" className="flex gap-2">
        {semana.map((d, i) => {
          const feito = d.feito || (d.hoje && feitasAgora > 0);
          return (
            <span key={`${i}${noFinal}`} role="listitem" aria-label={`${d.nome}: ${feito ? t.feito : "—"}`} className="grid justify-items-center gap-1.5">
              <span style={{ animationDelay: `${i * 40}ms` }} className={`radar-crescer grid size-8 place-items-center rounded-pilula ${feito ? "bg-ac text-ac-ink" : "bg-s3"} ${d.hoje ? "ring-2 ring-t1 ring-offset-2 ring-offset-s1" : ""}`}>{feito && <Icone nome="confirmar" tamanho={16} />}</span>
              <span className="meta text-t2" aria-hidden="true">{d.letra}</span>
            </span>
          );
        })}
      </div>
      {(concluidos.length > 0 || adiados.length > 0) && (
        // this pass: what was done and postponed here
        <div className="grid max-w-sm gap-1">
          <p className="corpo font-medium text-t1">{t.passada.replace("{f}", String(concluidos.length)).replace("{a}", String(adiados.length))}</p>
          {concluidos.length > 0 && <p className="meta line-clamp-3 text-t2">{concluidos.slice(0, 5).map((c) => c.titulo).join(" · ")}</p>}
        </div>
      )}
      {lista.length > 0 && !pendentes.length && <p className="corpo text-t2">{t.tudoFeito}</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {pendentes.length > 0 && <Botao variante="tonal" icone="voltar" onClick={() => mudar(lista.indexOf(pendentes[0]))}>{t.faltam.replace("{n}", String(pendentes.length))}</Botao>}
        {pinu && <Chip tipo="pinu" onClick={() => abrirPinu({ atalho: "amanha", rotulo: t.planejarAmanha })}>{t.planejarAmanha}</Chip>}
        <Botao icone="confirmar" onClick={fechar}>{t.fecharDia}</Botao>
      </div>
    </Cartao>
  );

  if (!cartoes.length) return null;
  return (
    <>
      {/* entry (DS 10.29): a 56 px pill with the radar sweep (loops; still with less motion) and the count */}
      <button type="button" onClick={abrir}
        className="anel-foco flex min-h-14 w-full items-center gap-3 rounded-pilula bg-s2 py-2 pl-2 pr-4 text-left transition-colors duration-150 hover:bg-s3 sm:w-fit">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-pilula bg-s3">
          <span aria-hidden="true" className="radar-varredura absolute inset-0 rounded-pilula" />
          <span className="relative font-semibold tabular-nums text-ac-text">{cartoes.length}</span>
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="titulo-cartao leading-tight text-t1">{t.radar}</span>
          <span className="meta truncate text-t2">{t.entradaMeta.replace("{n}", String(cartoes.length))}</span>
        </span>
        <Icone nome="avancar" tamanho={20} className="shrink-0 text-t2" />
      </button>
      {aberto && !oculto && (
        <Historias titulo={t.radar} atual={atual} onMudar={mudar} onFechar={fechar}
          rotulos={{ fechar: t.fechar, anterior: t.anterior, proximo: t.proximo, posicao: t.posicao }}
          acoes={atualCartao && atualCartao.menu.length > 0 ? <MenuAcoes key={atualCartao.id} itens={atualCartao.menu} rotulo={t.opcoes} /> : undefined}
          cartoes={[...lista.map(cartao), final]} />
      )}
    </>
  );
}
