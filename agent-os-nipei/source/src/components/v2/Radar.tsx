"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checklistAction, prazoRapidoAction, setStatusAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";
import Historias from "@/components/ds/Historias";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Cartao from "@/components/ds/Cartao";
import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import MenuAcoes, { type ItemMenu } from "@/components/ds/MenuAcoes";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EQUIPES_DS, type ChaveEquipe } from "@/components/ds/equipes";
import { ABRIR_ASSISTENTE } from "@/components/v2/AssistenteGlobal";

// Radar (DESIGN-SYSTEM.md seção 10.29): as minhas tarefas do dia, uma por cartão, para resolver ali mesmo.
// A lista é congelada ao abrir: concluir/adiar marcam o cartão; a página só se atualiza ao fechar.

export type CartaoRadar = {
  id: string; titulo: string; rotulo: string; equipe?: ChaveEquipe;
  motivo: "foco" | "sugestao" | "atrasada" | "hoje" | "pedido"; atraso: number;
  descricao: string; passos: { texto: string; feito: boolean }[]; anexos: number;
  podeEditar: boolean; menu: ItemMenu[];
};
export type TextosRadar = {
  radar: string; fechar: string; anterior: string; proximo: string; posicao: string; opcoes: string;
  foco: string; sugestao: string; hoje: string; atrasada1: string; atrasadaN: string; verMais: string; passos: string; anexo1: string; anexosN: string;
  adiar: string; amanha: string; proxSemana: string; outraData: string; abrir: string; concluir: string; feito: string; para: string;
  feitasHoje: string; feitaHoje: string; semana: string; fecharDia: string; tudoFeito: string;
};

type Estado = { feito?: boolean; para?: string; passos?: { texto: string; feito: boolean }[] };

export default function Radar({ cartoes, feitasHoje, semana, datas, fmt, t }: {
  cartoes: CartaoRadar[]; feitasHoje: number;
  semana: { letra: string; nome: string; feito: boolean; hoje: boolean }[];
  datas: { amanha: string; proxSemana: string };
  /** dd/mm de cada data que pode aparecer em "Para …" (amanhã e próxima semana); outra data cai no formato curto */
  fmt: Record<string, string>;
  t: TextosRadar;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<CartaoRadar[]>([]);
  const [atual, setAtual] = useState(0);
  const [estado, setEstado] = useState<Record<string, Estado>>({});
  const [adiando, setAdiando] = useState(false);
  const [, iniciar] = useTransition();

  const abrir = () => { setLista(cartoes); setEstado({}); setAtual(0); setAdiando(false); setAberto(true); };
  const fechar = useCallback(() => { setAberto(false); router.refresh(); }, [router]);
  const mudar = useCallback((i: number) => { setAtual(i); setAdiando(false); }, []);

  // um pedido ao Pinu pelo ⋯ abre o painel do Pinu: o Radar sai da frente (fase 2: voltar ao mesmo cartão)
  useEffect(() => {
    if (!aberto) return;
    const sair = () => setAberto(false);
    window.addEventListener(ABRIR_ASSISTENTE, sair);
    return () => window.removeEventListener(ABRIR_ASSISTENTE, sair);
  }, [aberto]);

  const marcar = (id: string, e: Estado) => setEstado((s) => ({ ...s, [id]: { ...s[id], ...e } }));
  const seguir = () => setTimeout(() => setAtual((i) => Math.min(i + 1, lista.length)), 400);
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
  const dataCurta = (d: string) => fmt[d] ?? `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  const feitasAgora = feitasHoje + Object.values(estado).filter((e) => e.feito).length;
  const atualCartao = lista[atual];

  const cartao = (c: CartaoRadar) => {
    const e = estado[c.id] ?? {}, passos = e.passos ?? c.passos, resolvido = e.feito || !!e.para;
    const fundo = c.equipe ? `color-mix(in srgb, var(--eq-${c.equipe}) 22%, var(--s1))` : "var(--s1)";
    const motivo = c.motivo === "atrasada"
      ? <BadgeEstado estado="atrasada">{c.atraso === 1 ? t.atrasada1 : t.atrasadaN.replace("{n}", String(c.atraso))}</BadgeEstado>
      : c.motivo === "foco" ? <BadgeEstado estado="andamento">{t.foco}</BadgeEstado>
      : c.motivo === "sugestao" ? <BadgeEstado estado="pendente">{t.sugestao}</BadgeEstado>
      : c.motivo === "hoje" ? <BadgeEstado estado="aviso">{t.hoje}</BadgeEstado> : null;
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-cartao" style={{ background: fundo }}>
        <div className="grid min-h-0 flex-1 content-start justify-items-center gap-3 overflow-y-auto px-5 pb-4 pt-6 text-center">
          <Selo nome={c.equipe ? EQUIPES_DS[c.equipe].selo : "broto"} tamanho={120} className="size-20 text-t1 opacity-85 sm:size-[120px]" />
          <p className="rotulo-maiusculo text-t2">{c.rotulo}</p>
          {/* wrapped: a grid item is blockified and line-clamp needs -webkit-box */}
          <div className="w-full"><h3 className="saudacao line-clamp-3 text-balance !text-[26px] !leading-[1.2] text-t1 sm:!text-[30px]">{c.titulo}</h3></div>
          <div className="flex flex-wrap justify-center gap-2">
            {e.feito ? <BadgeEstado estado="feita">{t.feito}</BadgeEstado>
              : e.para ? <BadgeEstado estado="pendente">{t.para.replace("{data}", dataCurta(e.para))}</BadgeEstado>
              : motivo}
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
                      <span className={`grid size-[22px] shrink-0 place-items-center rounded-pilula ${p.feito ? "bg-ac text-ac-ink" : "shadow-[inset_0_0_0_2px_var(--t2)]"}`}>{p.feito && <Icone nome="confirmar" tamanho={13} />}</span>
                      <span className={`corpo min-w-0 flex-1 ${p.feito ? "text-t2 line-through" : "text-t1"}`}>{p.texto}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.anexos > 0 && <Chip href={`/tarefas/${c.id}`} icone="pasta">{c.anexos === 1 ? t.anexo1 : t.anexosN.replace("{n}", String(c.anexos))}</Chip>}
        </div>
        {adiando && !resolvido && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-3">
            <Chip onClick={() => adiar(c, datas.amanha)} icone="prazo">{t.amanha}</Chip>
            <Chip onClick={() => adiar(c, datas.proxSemana)} icone="prazo">{t.proxSemana}</Chip>
            <label className="anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s2 px-3 text-sm font-medium text-t1">
              <span className="sr-only">{t.outraData}</span>
              <input type="date" min={datas.amanha} aria-label={t.outraData} onChange={(ev) => adiar(c, ev.target.value)} className="bg-transparent text-t1 outline-none" />
            </label>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 pb-4">
          {c.podeEditar && !resolvido && <BotaoIcone icone="prazo" aria-label={t.adiar} aria-expanded={adiando} tamanho={52} variante={adiando ? "acento" : "tonal"} onClick={() => setAdiando((x) => !x)} />}
          <Botao href={`/tarefas/${c.id}`} variante="tonal" tamanho="M" icone="abrir-fora" largo className="flex-1">{t.abrir}</Botao>
          {c.podeEditar && !resolvido && <BotaoIcone icone="confirmar" aria-label={t.concluir} tamanho={52} variante="acento" onClick={() => concluir(c)} />}
        </div>
      </div>
    );
  };

  const final = (
    <Cartao variante="pinu" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="grid gap-1">
        <span className="numero-display">{feitasAgora}</span>
        <span className="rotulo-maiusculo text-t2">{feitasAgora === 1 ? t.feitaHoje : t.feitasHoje}</span>
      </div>
      <div aria-label={t.semana} role="list" className="flex gap-2">
        {semana.map((d, i) => {
          const feito = d.feito || (d.hoje && feitasAgora > 0);
          return (
            <span key={i} role="listitem" aria-label={`${d.nome}: ${feito ? t.feito : "—"}`} className="grid justify-items-center gap-1.5">
              <span className={`grid size-8 place-items-center rounded-pilula ${feito ? "bg-ac text-ac-ink" : "bg-s3"} ${d.hoje ? "ring-2 ring-t1 ring-offset-2 ring-offset-s1" : ""}`}>{feito && <Icone nome="confirmar" tamanho={16} />}</span>
              <span className="meta text-t2" aria-hidden="true">{d.letra}</span>
            </span>
          );
        })}
      </div>
      {lista.length > 0 && lista.every((c) => estado[c.id]?.feito || estado[c.id]?.para) && <p className="corpo text-t2">{t.tudoFeito}</p>}
      <Botao icone="confirmar" onClick={fechar}>{t.fecharDia}</Botao>
    </Cartao>
  );

  if (!cartoes.length) return null;
  return (
    <>
      <Chip onClick={abrir} icone="ver" contagem={cartoes.length}>{t.radar}</Chip>
      {aberto && (
        <Historias titulo={t.radar} atual={atual} onMudar={mudar} onFechar={fechar}
          rotulos={{ fechar: t.fechar, anterior: t.anterior, proximo: t.proximo, posicao: t.posicao }}
          acoes={atualCartao && atualCartao.menu.length > 0 ? <MenuAcoes key={atualCartao.id} itens={atualCartao.menu} rotulo={t.opcoes} /> : undefined}
          cartoes={[...lista.map(cartao), final]} />
      )}
    </>
  );
}
