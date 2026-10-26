import Link from "next/link";
import type { ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";
import Selo, { type NomeSelo } from "./Selo";

// Blocos de atalho e etapas (DESIGN-SYSTEM.md seções 6, 9.2 e 9.3).

/** Moldura dos blocos: superfície 1, raio 28, vão de 8 px; os blocos se ajustam à largura (mín. 150 px). */
export function MolduraBlocos({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2 rounded-moldura bg-s1 p-2 ${className ?? ""}`}>{children}</div>;
}

/**
 * Bloco de atalho: ícone (ou selo) no topo à esquerda, rótulo embaixo, ponto de estado (`indicador`)
 * ou `numero` no topo à direita. Hover = tom mais claro. Com `href` é link; senão, botão.
 */
export function Bloco({ icone, selo, rotulo, indicador, numero, href, onClick }: {
  icone?: NomeIcone; selo?: NomeSelo; rotulo: string; indicador?: boolean; numero?: number | string; href?: string; onClick?: () => void;
}) {
  const cls = "anel-foco relative flex aspect-[1/0.85] min-h-28 flex-col justify-between rounded-bloco bg-s2 p-4 text-left text-t1 transition-colors duration-150 hover:bg-s3 active:bg-s3";
  const dentro = (
    <>
      {selo ? <Selo nome={selo} tamanho={28} className="text-ac-text" /> : icone ? <Icone nome={icone} tamanho={24} /> : <span />}
      {indicador && numero == null && <span className="absolute right-4 top-4 size-1.5 rounded-pilula bg-ac"><span className="sr-only">novidade</span></span>}
      {numero != null && <span className="absolute right-4 top-3.5 font-display text-[13px] font-light text-t2 tabular-nums">{numero}</span>}
      <span className="corpo font-medium">{rotulo}</span>
    </>
  );
  return href ? <Link href={href} className={cls}>{dentro}</Link> : <button type="button" onClick={onClick} className={cls}>{dentro}</button>;
}

export type Passo = { rotulo: string; detalhe?: string };

/**
 * Etapas de um fluxo. `atual` começa em 0. Feita = sólida + ✓ · atual = acento em pétala + ▶ ·
 * próxima = hachurada · a última termina em ponta de seta.
 */
export function Etapas({ passos, atual, rotuloEtapa = "Etapa" }: { passos: Passo[]; atual: number; rotuloEtapa?: string }) {
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
      {passos.map((p, i) => {
        const estado = i < atual ? "feita" : i === atual ? "atual" : "proxima";
        const ultima = i === passos.length - 1;
        const cor = estado === "feita" ? "bg-s3 text-t1" : estado === "atual" ? "bg-ac text-ac-ink" : "hachurado text-t1"; // texto principal: o tracejado já diz "pendente" e o t2 sobre as linhas perde contraste
        const forma = ultima ? "rounded-bloco forma-seta pr-10" : estado === "atual" ? "forma-petala" : "rounded-bloco";
        return (
          <li key={i} aria-current={estado === "atual" ? "step" : undefined} className={`flex min-h-32 flex-col justify-between p-4 ${cor} ${forma}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="meta opacity-80">{rotuloEtapa} {i + 1}</span>
              {estado === "feita" ? <Icone nome="confirmar" tamanho={18} aria-label="feita" /> : estado === "atual" ? <Icone nome="avancar" tamanho={18} aria-label="atual" /> : null}
            </span>
            <span>
              <span className="corpo block font-medium">{p.rotulo}</span>
              {p.detalhe && <span className="meta block opacity-80">{p.detalhe}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
