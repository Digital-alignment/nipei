import Link from "next/link";
import type { ReactNode } from "react";
import Icone, { type NomeIcone } from "../Icone";
import { MiniAnelPinu } from "../Pinu";
import { EQUIPES_DS, chaveEquipe } from "../equipes";

// Linha do tempo de atividade (DESIGN-SYSTEM.md seção 10.9): agrupada por dia; nó redondo com ícone na cor do
// tipo (concluiu = acento · comentou = azul · mudou estado = âmbar · pedido = cor da equipe · Pinu = mini-anel);
// "Quem fez o quê em qual item" · hora à direita; comentário em balão; mudança em "antes ▶ depois";
// pedidos com Aprovar / Recusar (`acoes`) no próprio item.

export type TipoTempo = "concluiu" | "comentou" | "estado" | "pedido" | "pinu" | "outro";
export type ItemTempo = {
  /** Rótulo do dia (ex.: "Hoje", "24 de out"): itens seguidos com o mesmo dia ficam no mesmo grupo. */
  dia: string;
  hora?: string;
  tipo: TipoTempo;
  quem: ReactNode;
  /** O que foi feito ("mudou o prazo", "comentou"). */
  texto: ReactNode;
  item?: { rotulo: string; href?: string };
  comentario?: string;
  antes?: string; depois?: string;
  /** Cor do nó para pedidos (chave, id ou cor antiga da equipe). */
  equipe?: string;
  /** Aprovar / Recusar etc. */
  acoes?: ReactNode;
};

const NO: Record<Exclude<TipoTempo, "pinu" | "pedido">, { cls: string; icone: NomeIcone }> = {
  concluiu: { cls: "bg-ac text-ac-ink", icone: "confirmar" },
  comentou: { cls: "bg-info-bg text-info", icone: "mensagem" },
  estado: { cls: "bg-warn-bg text-warn", icone: "gerar-outra" },
  outro: { cls: "bg-s2 text-t2", icone: "editar" },
};

function No({ tipo, equipe }: { tipo: TipoTempo; equipe?: string }) {
  if (tipo === "pinu") return <span className="grid size-8 place-items-center rounded-pilula bg-s1"><MiniAnelPinu tamanho={20} /></span>;
  if (tipo === "pedido") {
    const k = chaveEquipe(equipe);
    const cor = k ? EQUIPES_DS[k].cor : "var(--s4)";
    return <span className="grid size-8 place-items-center rounded-pilula text-t1" style={{ background: `color-mix(in srgb, ${cor} 30%, var(--s1))` }}><Icone nome="pessoa" tamanho={16} /></span>;
  }
  return <span className={`grid size-8 place-items-center rounded-pilula ${NO[tipo].cls}`}><Icone nome={NO[tipo].icone} tamanho={16} /></span>;
}

export default function LinhaDoTempo({ itens, vazio }: { itens: ItemTempo[]; vazio?: ReactNode }) {
  if (!itens.length) return <>{vazio ?? null}</>;
  const grupos: { dia: string; itens: ItemTempo[] }[] = [];
  for (const i of itens) {
    const g = grupos.at(-1);
    if (g && g.dia === i.dia) g.itens.push(i); else grupos.push({ dia: i.dia, itens: [i] });
  }
  return (
    <div className="grid gap-5">
      {grupos.map((g, gi) => (
        <section key={gi} className="grid gap-2">
          <h3 className="rotulo-maiusculo text-t3 first-letter:uppercase">{g.dia}</h3>
          <ol className="relative grid gap-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-s3 before:content-['']">
            {g.itens.map((i, k) => (
              <li key={k} className="relative flex gap-3">
                <span className="relative z-10 shrink-0"><No tipo={i.tipo} equipe={i.equipe} /></span>
                <div className="grid min-w-0 flex-1 gap-1.5 pt-1">
                  <p className="flex items-start gap-3">
                    <span className="corpo min-w-0 flex-1 text-t2">
                      <b className="font-semibold text-t1">{i.quem}</b> {i.texto}
                      {i.item && <> {i.item.href ? <Link href={i.item.href} className="anel-foco rounded-interno font-semibold text-t1 hover:underline">{i.item.rotulo}</Link> : <b className="font-semibold text-t1">{i.item.rotulo}</b>}</>}
                    </span>
                    {i.hora && <span className="meta shrink-0 tabular-nums text-t3">{i.hora}</span>}
                  </p>
                  {(i.antes || i.depois) && (
                    <p className="flex flex-wrap items-center gap-1.5">
                      {i.antes && <span className="inline-flex h-7 items-center rounded-pilula bg-s2 px-2.5 font-texto text-[13px] text-t2 line-through">{i.antes}</span>}
                      <Icone nome="avancar" tamanho={14} className="text-t3" />
                      {i.depois && <span className="inline-flex h-7 items-center rounded-pilula bg-s3 px-2.5 font-texto text-[13px] font-medium text-t1">{i.depois}</span>}
                    </p>
                  )}
                  {i.comentario && <p className="corpo max-w-[60ch] whitespace-pre-wrap rounded-[16px_16px_16px_6px] bg-s2 px-3.5 py-2.5 text-t1">{i.comentario}</p>}
                  {i.acoes && <div className="flex flex-wrap gap-2">{i.acoes}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * Converte uma linha de `## Atividade` (lib/tarefaNote: "- AAAA-MM-DD HH:MM · quem · o que mudou") num item:
 * "Status A → B" vira antes ▶ depois (Concluído = concluiu), comentários vão para o balão, "(via assistente)"/"(IA)" = Pinu.
 */
export function deAtividade(p: { quem: string; texto: string; quando: string; comentario?: string | null }, rotuloDia: (iso: string) => string, item?: ItemTempo["item"]): ItemTempo {
  const dia = rotuloDia(p.quando.slice(0, 10)), hora = p.quando.slice(11, 16);
  const pinu = /\((?:via [^)]*|IA)\)/i.test(p.quem);
  const quem = p.quem.replace(/\s*\((?:via [^)]*|IA)\)/i, "");
  if (p.comentario != null) return { dia, hora, tipo: pinu ? "pinu" : "comentou", quem, texto: "comentou", comentario: p.comentario, item };
  const m = p.texto.match(/^(Status|Prazo|Prioridade|Responsáveis?|Equipe)\s+(.+?)\s+→\s+(.+)$/i);
  if (m) {
    const concluiu = /^status$/i.test(m[1]) && /conclu/i.test(m[3]);
    return { dia, hora, tipo: pinu ? "pinu" : concluiu ? "concluiu" : "estado", quem, texto: m[1].toLowerCase(), antes: m[2], depois: m[3], item };
  }
  return { dia, hora, tipo: pinu ? "pinu" : "outro", quem, texto: p.texto, item };
}
