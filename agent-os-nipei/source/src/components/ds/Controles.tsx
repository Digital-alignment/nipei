"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import Icone from "./Icone";

// Interruptor, controle deslizante e linhas de configuração (DESIGN-SYSTEM.md seções 9.13–9.15).

/**
 * Interruptor (seção 9.14), 52 × 32 com área de toque de 44. Desligado: trilho s3, botão t3. Ligado: trilho
 * acento, botão "texto sobre acento". `name` manda o valor ("1"/"0") num formulário comum.
 */
export function Interruptor({ ligado, padrao = false, onChange, rotulo, name, desativado }: {
  ligado?: boolean; padrao?: boolean; onChange?: (v: boolean) => void; rotulo: string; name?: string; desativado?: boolean;
}) {
  const [interno, setInterno] = useState(padrao);
  const v = ligado ?? interno;
  return (
    <>
      <button type="button" role="switch" aria-checked={v} aria-label={rotulo} disabled={desativado}
        onClick={() => { setInterno(!v); onChange?.(!v); }}
        className={`anel-foco relative h-8 w-[52px] shrink-0 rounded-pilula transition-colors duration-200 after:absolute after:-inset-1.5 after:content-[''] disabled:cursor-not-allowed disabled:opacity-50 ${v ? "bg-ac" : "bg-s3"}`}>
        <span aria-hidden="true" className={`absolute left-1 top-1 size-6 rounded-pilula transition-[transform,background-color] duration-200 ${v ? "translate-x-5 bg-ac-ink" : "bg-t3"}`} />
      </button>
      {name && <input type="hidden" name={name} value={v ? "1" : "0"} />}
    </>
  );
}

/**
 * Controle deslizante (seção 9.13): trilho em pílula s2 de 64 px com pontos; parte preenchida s3 com um
 * cursor fino; rótulo à esquerda, valor à direita. Com `opcoes` escolhe entre opções ("1 dia antes").
 * É um <input type="range"> nativo por cima (teclado, leitores de tela e toque funcionam como sempre).
 */
export function ControleDeslizante({ rotulo, valor, padrao, min = 0, max = 100, passo = 1, formatar, opcoes, onChange, name }: {
  rotulo: string; valor?: number; padrao?: number; min?: number; max?: number; passo?: number; formatar?: (v: number) => string;
  /** Escolher entre opções: o valor é o índice. */
  opcoes?: string[]; onChange?: (v: number) => void; name?: string;
}) {
  const id = useId();
  const lo = opcoes ? 0 : min, hi = opcoes ? opcoes.length - 1 : max, step = opcoes ? 1 : passo;
  const [interno, setInterno] = useState(padrao ?? lo);
  const v = valor ?? interno;
  const texto = opcoes ? opcoes[v] : formatar ? formatar(v) : String(v);
  const p = hi > lo ? (v - lo) / (hi - lo) : 0;
  const pontos = opcoes ? opcoes.length : 6;
  return (
    <div className="relative flex h-16 items-center justify-between overflow-hidden rounded-pilula bg-s2 px-[22px] font-texto text-base transition-shadow duration-200 [&:hover:not(:focus-within)]:shadow-brilho-ia focus-within:shadow-foco">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-pilula bg-s3" style={{ width: `calc(64px + (100% - 64px) * ${p})` }}>
        <span className="absolute inset-y-6 right-[18px] w-0.5 rounded-pilula bg-t1" />
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[45%] right-[22%] flex items-center justify-between">
        {Array.from({ length: pontos }, (_, i) => <i key={i} className="size-1 rounded-pilula bg-t3 opacity-60" />)}
      </span>
      <label htmlFor={id} className="relative text-t1">{rotulo}</label>
      <span className="relative tabular-nums text-t1">{texto}</span>
      <input id={id} type="range" name={name} min={lo} max={hi} step={step} value={v} aria-valuetext={texto}
        onChange={(e) => { const n = Number(e.target.value); setInterno(n); onChange?.(n); }}
        className="absolute inset-0 size-full cursor-pointer opacity-0" />
    </div>
  );
}

/** Linhas de configuração agrupadas num cartão s2 com divisor fino (seção 9.15). */
export function ListaConfiguracoes({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <div className="grid gap-2">
      {titulo && <p className="rotulo-maiusculo px-1 text-t2">{titulo}</p>}
      <div className="divide-y divide-s3 overflow-hidden rounded-cartao bg-s2">{children}</div>
    </div>
  );
}

/**
 * "Rótulo ······ valor ▶" (com `onClick` ou `href`) ou "Rótulo ······ [interruptor]" (com `interruptor`).
 * Na linha com interruptor, tocar em qualquer parte da linha liga/desliga.
 */
export function LinhaConfiguracao({ rotulo, descricao, valor, interruptor, onClick, href }: {
  rotulo: string; descricao?: string; valor?: ReactNode;
  interruptor?: { ligado: boolean; onChange: (v: boolean) => void; desativado?: boolean };
  onClick?: () => void; href?: string;
}) {
  const texto = (
    <span className="min-w-0 flex-1">
      <span className="corpo block text-t1">{rotulo}</span>
      {descricao && <span className="meta block text-t3">{descricao}</span>}
    </span>
  );
  const linha = "flex min-h-14 w-full items-center gap-3 px-[18px] py-3 text-left";
  if (interruptor) {
    return (
      <div className={`${linha} cursor-pointer`} onClick={(e) => { if (!(e.target as HTMLElement).closest("button") && !interruptor.desativado) interruptor.onChange(!interruptor.ligado); }}>
        {texto}
        <Interruptor ligado={interruptor.ligado} onChange={interruptor.onChange} rotulo={rotulo} desativado={interruptor.desativado} />
      </div>
    );
  }
  const direita = <span className="meta flex shrink-0 items-center gap-1 text-t3">{valor}{(onClick || href) && <Icone nome="avancar" tamanho={14} />}</span>;
  if (href) return <Link href={href} className={`anel-foco ${linha} hover:bg-s3`}>{texto}{direita}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`anel-foco ${linha} hover:bg-s3`}>{texto}{direita}</button>;
  return <div className={linha}>{texto}{direita}</div>;
}
