"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStatusAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";
import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import { BotaoIcone } from "@/components/ds/Botao";
import { BadgeEstado, type EstadoBadge } from "@/components/ds/Chip";
import { GrupoAvatares } from "@/components/ds/Avatar";
import MenuAcoes from "@/components/ds/MenuAcoes";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";

// Quadro (DESIGN-SYSTEM.md seção 10.7): uma coluna por estado, cartões compactos, arrastar muda o estado.
// Teclado e toque: o ⋯ de cada cartão tem "Mover para…". Sem sinal, a mudança entra na fila do aparelho
// (mesma fila do StatusBotao). No celular as colunas viram páginas deslizáveis.

type Status = "todo" | "doing" | "done";
export type CartaoQuadro = {
  id: string; titulo: string; status: Status; equipe?: string; nomeEquipe?: string;
  prazo?: string; vencido?: boolean; subtarefas?: string; urgente?: boolean;
  pessoas: { nome: string; foto?: string }[]; podeMover: boolean;
};
const ESTADO: Record<Status, EstadoBadge> = { todo: "pendente", doing: "andamento", done: "feita" };
const ORDEM: Status[] = ["todo", "doing", "done"];
const LIMITE = 30; // por coluna; o resto abre com "Mostrar mais" (colunas de 160 cartões não servem para arrastar)

export default function QuadroTarefas({ cartoes, rotulos, novaHref }: {
  cartoes: CartaoQuadro[]; novaHref: string;
  rotulos: { colunas: Record<Status, string>; moverPara: string; abrir: string; adicionar: string; vazio: string; arrastar: string; mostrarMais: string };
}) {
  const router = useRouter();
  const [locais, setLocais] = useState<Record<string, Status>>({});
  const [sobre, setSobre] = useState<Status | null>(null);
  const [todas, setTodas] = useState<Partial<Record<Status, boolean>>>({});
  const [, start] = useTransition();
  useEffect(() => setLocais({}), [cartoes]); // dados novos do servidor = verdade
  const status = (c: CartaoQuadro) => locais[c.id] ?? c.status;

  const mover = (c: CartaoQuadro, para: Status) => {
    if (!c.podeMover || status(c) === para) return;
    setLocais((l) => ({ ...l, [c.id]: para }));
    if (offline()) { enfileirar({ tipo: "status", id: c.id, valor: para }); return; }
    const f = new FormData();
    f.set("id", c.id);
    f.set("status", para);
    start(async () => { await setStatusAction(f); router.refresh(); });
  };

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {ORDEM.map((col) => {
        const lista = cartoes.filter((c) => status(c) === col);
        return (
          <section key={col} aria-label={rotulos.colunas[col]} data-estado={col}
            onDragOver={(e) => { if (e.dataTransfer.types.includes("text/nipei-tarefa")) { e.preventDefault(); setSobre(col); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null); }}
            onDrop={(e) => {
              e.preventDefault(); setSobre(null);
              const c = cartoes.find((x) => x.id === e.dataTransfer.getData("text/nipei-tarefa"));
              if (c) mover(c, col);
            }}
            className={`flex w-[85%] shrink-0 snap-center flex-col gap-2.5 rounded-cartao bg-s1 p-3 transition-shadow duration-150 md:w-auto ${sobre === col ? "shadow-[inset_0_0_0_1.5px_var(--ac)]" : ""}`}>
            <header className="flex items-center gap-2 px-1">
              <BadgeEstado estado={ESTADO[col]}>{rotulos.colunas[col]}</BadgeEstado>
              <span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{lista.length}</span>
              <span className="flex-1" />
              <BotaoIcone icone="mais" aria-label={`${rotulos.adicionar} · ${rotulos.colunas[col]}`} tamanho={40} variante="fantasma" href={`${novaHref}${novaHref.includes("?") ? "&" : "?"}status=${col}`} />
            </header>
            <ul className="grid gap-2">
              {lista.slice(0, todas[col] ? undefined : LIMITE).map((c) => {
                const eq = chaveEquipe(c.equipe);
                return (
                  <li key={c.id} draggable={c.podeMover} data-tarefa={c.id}
                    onDragStart={(e) => { e.dataTransfer.setData("text/nipei-tarefa", c.id); e.dataTransfer.effectAllowed = "move"; }}
                    className={`group relative grid gap-2 rounded-cartao bg-s2 p-3 pr-2 ${c.podeMover ? "md:cursor-grab md:active:cursor-grabbing" : ""}`}>
                    <div className="flex items-start gap-2">
                      <div className="grid min-w-0 flex-1 gap-1.5">
                        {(eq || c.nomeEquipe) && (
                          <span className="meta flex min-w-0 items-center gap-1.5 text-t3">
                            {eq && <Selo nome={EQUIPES_DS[eq].selo} tamanho={15} style={{ color: EQUIPES_DS[eq].cor }} />}
                            <span className="truncate">{c.nomeEquipe ?? EQUIPES_DS[eq!].nome}</span>
                          </span>
                        )}
                        <Link href={`/tarefas/${c.id}`} className={`anel-foco rounded-interno font-texto text-[15px] font-medium leading-snug hover:underline ${status(c) === "done" ? "text-t3 line-through" : "text-t1"}`}>
                          {c.urgente && <Icone nome="atencao" tamanho={15} aria-label="!" className="mr-1 inline align-[-2px] text-err" />}{c.titulo}
                        </Link>
                      </div>
                      <MenuAcoes rotulo={`${rotulos.moverPara}…`} itens={[
                        { icone: "avancar", rotulo: rotulos.abrir, href: `/tarefas/${c.id}` },
                        ...(c.podeMover ? ORDEM.filter((s) => s !== status(c)).map((s) => ({ icone: (s === "done" ? "confirmar" : s === "doing" ? "enviar" : "prazo") as "confirmar", rotulo: `${rotulos.moverPara}: ${rotulos.colunas[s]}`, onSelect: () => mover(c, s) })) : []),
                      ]} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.prazo && <span className={`inline-flex h-7 items-center gap-1.5 rounded-pilula bg-s3 px-2.5 font-texto text-[13px] ${c.vencido && status(c) !== "done" ? "text-err" : "text-t2"}`}><Icone nome="prazo" tamanho={14} />{c.prazo}</span>}
                      {c.subtarefas && <span className="inline-flex h-7 items-center gap-1.5 rounded-pilula bg-s3 px-2.5 font-texto text-[13px] text-t2"><Icone nome="tarefa" tamanho={14} />{c.subtarefas}</span>}
                      <span className="flex-1" />
                      {c.pessoas.length > 0 && <GrupoAvatares pessoas={c.pessoas} tamanho={24} anel="s2" />}
                    </div>
                  </li>
                );
              })}
            </ul>
            {lista.length > LIMITE && !todas[col] && (
              <button type="button" onClick={() => setTodas((x) => ({ ...x, [col]: true }))} className="anel-foco min-h-11 rounded-cartao font-texto text-sm font-medium text-t2 hover:bg-s2 hover:text-t1">{rotulos.mostrarMais} ({lista.length - LIMITE})</button>
            )}
            {lista.length === 0 && <p className="meta px-1 py-2 text-t3">{rotulos.vazio}</p>}
            {/* adicionar = planejado → hachurado (regra 6) */}
            <Link href={`${novaHref}${novaHref.includes("?") ? "&" : "?"}status=${col}`}
              className="anel-foco hachurado flex min-h-11 items-center justify-center gap-2 rounded-cartao font-texto text-sm font-medium text-t2 hover:text-t1">
              <Icone nome="mais" tamanho={16} />{rotulos.adicionar}
            </Link>
          </section>
        );
      })}
      <p className="sr-only">{rotulos.arrastar}</p>
    </div>
  );
}
