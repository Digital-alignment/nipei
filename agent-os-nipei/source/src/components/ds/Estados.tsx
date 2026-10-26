import type { ReactNode } from "react";
import Selo, { type NomeSelo } from "./Selo";
import { SIMBOLOS } from "./simbolos.generated";

// Carregando, estado vazio e skeleton (DESIGN-SYSTEM.md seções 9.17 e 9.18).

/**
 * Arco cinza girando (genérico; dentro de botões use `arco-girando`). Com menos movimento pedido pelo aparelho,
 * o arco some e aparece o texto "Carregando…". Leitores de tela sempre ouvem o texto.
 */
export function Carregando({ tamanho = 28, texto = "Carregando…" }: { tamanho?: 16 | 28 | 40; texto?: string }) {
  const borda = tamanho >= 28 ? 3 : 2;
  return (
    <span role="status" className="inline-flex items-center gap-2 text-t2">
      <span aria-hidden="true" className="motion-reduce:hidden rounded-pilula border-s3 animate-[ds-girar_.9s_linear_infinite]"
        style={{ width: tamanho, height: tamanho, borderWidth: borda, borderStyle: "solid", borderTopColor: "var(--t2)" }} />
      <span className="meta sr-only motion-reduce:not-sr-only">{texto}</span>
    </span>
  );
}

/** Padrão de selos a 5% (estados vazios de destaque e entrada); usa os próprios selos do lote 1, em currentColor. */
function PadraoSelos() {
  const a = SIMBOLOS["simbolo-03"], b = SIMBOLOS["simbolo-18"];
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-[.05]">
      <defs>
        <pattern id="padrao-selos" width="110" height="110" patternUnits="userSpaceOnUse">
          <svg x="10" y="10" width="34" height="34" viewBox={a.viewBox} fill="currentColor"><path d={a.d} /></svg>
          <svg x="64" y="64" width="34" height="34" viewBox={b.viewBox} fill="currentColor"><path d={b.d} /></svg>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#padrao-selos)" />
    </svg>
  );
}

/**
 * Estado vazio: selo grande num círculo s2 · título · uma frase que diz o que fazer · uma ação.
 * `destaque` = padrão de selos a 5% + selo verde. `compacto` = uma linha só, para dentro de listas.
 */
export function EstadoVazio({ selo = "olho", titulo, texto, acao, destaque, compacto }: {
  selo?: NomeSelo; titulo?: ReactNode; texto?: ReactNode; acao?: ReactNode; destaque?: boolean; compacto?: boolean;
}) {
  if (compacto) {
    return (
      <p className="flex items-center gap-2.5 py-3 text-t2">
        <span className="grid size-8 shrink-0 place-items-center rounded-pilula bg-s2 text-t3"><Selo nome={selo} tamanho={18} /></span>
        <span className="corpo">{titulo ?? texto}</span>
      </p>
    );
  }
  return (
    <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-cartao bg-s1 px-5 py-7 text-center text-t1">
      {destaque && <PadraoSelos />}
      <span className={`relative grid size-16 place-items-center rounded-pilula ${destaque ? "bg-ac-soft text-ac-text" : "bg-s2 text-t2"}`}><Selo nome={selo} tamanho={36} /></span>
      {titulo && <p className="titulo-secao relative mt-1.5">{titulo}</p>}
      {texto && <p className="corpo relative mb-2 max-w-[30ch] text-t2">{texto}</p>}
      {acao && <div className="relative">{acao}</div>}
    </div>
  );
}

/** Uma peça de skeleton (seção 9.17). `largura` em % ou px. */
export function Skeleton({ forma = "linha", largura, altura, className }: {
  forma?: "linha" | "circulo" | "pilula" | "bloco"; largura?: number | string; altura?: number; className?: string;
}) {
  const padrao = { linha: { h: 12, w: "100%" }, circulo: { h: 40, w: 40 }, pilula: { h: 24, w: 80 }, bloco: { h: 64, w: "100%" } }[forma];
  const raio = forma === "bloco" ? "rounded-interno" : "rounded-pilula";
  const h = altura ?? padrao.h;
  return <span aria-hidden="true" className={`skeleton block shrink-0 ${raio} ${className ?? ""}`} style={{ width: forma === "circulo" ? h : largura ?? padrao.w, height: h }} />;
}

/** Skeleton de um cartão: avatar, título, duas linhas e chips. */
export function SkeletonCartao() {
  return (
    <div className="grid gap-3 rounded-cartao bg-s1 p-4">
      <span className="flex items-center gap-3"><Skeleton forma="circulo" /><span className="grid flex-1 gap-2"><Skeleton largura="55%" altura={16} /><Skeleton largura="35%" /></span></span>
      <Skeleton largura="90%" /><Skeleton largura="70%" />
      <span className="flex gap-2"><Skeleton forma="pilula" /><Skeleton forma="pilula" largura={56} /></span>
    </div>
  );
}

/** Skeleton de uma lista (linhas de tarefa: círculo + título + metadado). */
export function SkeletonLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="grid gap-3.5">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} className="flex items-center gap-3">
          <Skeleton forma="circulo" altura={22} />
          <span className="grid flex-1 gap-1.5"><Skeleton largura={`${85 - i * 9}%`} altura={14} /><Skeleton largura={96} altura={10} /></span>
        </span>
      ))}
    </div>
  );
}
