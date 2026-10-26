import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import Icone, { type NomeIcone } from "../Icone";
import Selo from "../Selo";
import { GrupoAvatares } from "../Avatar";
import { BadgeEstado, type EstadoBadge } from "../Chip";
import MenuAcoes, { type ItemMenu } from "../MenuAcoes";
import { EQUIPES_DS, chaveEquipe } from "../equipes";

// Linha de tarefa (DESIGN-SYSTEM.md seção 10.3):
// [barra da equipe 3 px] [◯ concluir] [título + selo da equipe · prazo] [metadados] [avatares] [estado] [⋯]
// Feita = círculo em acento com ✓ (o próprio botão), título riscado e apagado. No celular somem metadados e estado.

export type MetadadoTarefa = { icone?: NomeIcone; texto: ReactNode; rotulo?: string };

export default function LinhaTarefa({ href, titulo, equipe, nomeEquipe, prazo, prioridade, metadados = [], pessoas = [], estado, feita, concluir, acoes, extra, antes, ...li }: {
  href: string; titulo: ReactNode;
  /** Chave, id do vault ou cor antiga: desenha a barra e o selo. Sem uma das 4 equipes, só o nome. */
  equipe?: string; nomeEquipe?: string;
  /** Texto do prazo (ex.: "26 de out", "Concluída em 1 out") e se está vencido (vermelho). */
  prazo?: { texto: ReactNode; vencido?: boolean };
  prioridade?: { nivel: "alta" | "urgente"; rotulo: string };
  metadados?: MetadadoTarefa[];
  pessoas?: { nome: string; foto?: string }[];
  estado?: EstadoBadge; feita?: boolean;
  /** O círculo de concluir (ex.: <StatusBotao>, que funciona sem sinal). */
  concluir: ReactNode;
  acoes?: ItemMenu[];
  /** Ação rápida antes do ⋯ (ex.: mudar prazo); pode abrir uma linha inteira embaixo (`basis-full`). */
  extra?: ReactNode;
  /** Antes do círculo (ex.: caixa de seleção do lote). */
  antes?: ReactNode;
} & Omit<HTMLAttributes<HTMLLIElement>, "title">) {
  const eq = chaveEquipe(equipe);
  return (
    <li {...li} className="group/linha flex flex-wrap items-center gap-x-3 border-t border-s2 py-1.5 pr-2 transition-colors duration-150 first:border-t-0 hover:bg-s2">
      <span aria-hidden="true" className="-mr-1 w-[3px] self-stretch rounded-r-[3px]" style={{ background: eq ? EQUIPES_DS[eq].cor : "transparent" }} />
      {antes}
      {concluir}
      <div className="grid min-w-0 flex-1 gap-0.5 py-1">
        <Link href={href} className={`anel-foco alvo-toque block rounded-interno font-texto text-[15px] font-medium hover:underline ${feita ? "text-t3 line-through" : "text-t1"}`}>
          <span className="line-clamp-2 break-words md:line-clamp-1">
          {prioridade && <Icone nome="atencao" tamanho={15} aria-label={prioridade.rotulo} className={`mr-1 inline align-[-2px] ${prioridade.nivel === "urgente" ? "text-err" : "text-warn"}`} />}
          {titulo}
          </span>
        </Link>
        {(eq || nomeEquipe || prazo) && (
          <span className="meta flex min-w-0 items-center gap-1.5 text-t3">
            {eq && <Selo nome={EQUIPES_DS[eq].selo} tamanho={15} style={{ color: EQUIPES_DS[eq].cor }} />}
            {(nomeEquipe || eq) && <span className="hidden truncate sm:inline">{nomeEquipe ?? EQUIPES_DS[eq!].nome}</span>}
            {(nomeEquipe || eq) && prazo && <span aria-hidden="true" className="hidden sm:inline">·</span>}
            {prazo && <span className={`inline-flex shrink-0 items-center gap-1 ${prazo.vencido ? "font-medium text-err" : ""}`}><Icone nome="prazo" tamanho={14} />{prazo.texto}</span>}
          </span>
        )}
      </div>
      {metadados.length > 0 && (
        <span className={`hidden items-center gap-1.5 md:flex ${feita ? "opacity-50" : ""}`}>
          {metadados.map((m, i) => (
            <span key={i} title={m.rotulo} className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pilula bg-s3 px-2.5 font-texto text-[13px] text-t2">
              {m.icone && <Icone nome={m.icone} tamanho={14} />}{m.texto}{m.rotulo && <span className="sr-only">{m.rotulo}</span>}
            </span>
          ))}
        </span>
      )}
      {pessoas.length > 0 && <span className={feita ? "opacity-50" : ""}><GrupoAvatares pessoas={pessoas} tamanho={24} anel="s1" /></span>}
      {estado && <span className="hidden md:inline-flex"><BadgeEstado estado={estado} /></span>}
      {extra}
      {acoes && acoes.length > 0 && <MenuAcoes itens={acoes} />}
    </li>
  );
}

/** Grupo de linhas (Atrasadas / Hoje / Amanhã…): título + contagem e a lista numa superfície 1. */
export function GrupoTarefas({ titulo, contagem, alerta, children }: { titulo: ReactNode; contagem?: number; alerta?: boolean; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 flex items-center gap-2">
        <span className="titulo-cartao text-t1">{titulo}</span>
        {contagem != null && <span className={`rounded-pilula px-2.5 py-0.5 text-xs font-semibold tabular-nums ${alerta ? "bg-err-bg text-err" : "bg-s2 text-t2"}`}>{contagem}</span>}
      </h3>
      <ul className="overflow-hidden rounded-cartao bg-s1">{children}</ul>
    </section>
  );
}
