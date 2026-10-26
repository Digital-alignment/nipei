"use client";

import Icone, { type NomeIcone } from "./Icone";

export type OpcaoSegmentado<V extends string> = { valor: V; rotulo: string; icone: NomeIcone };

/**
 * Seletor segmentado (DESIGN-SYSTEM.md seção 9.4): pílula s2; ativo = s3 + contorno de 1 px, ícone em acento.
 * Usos: tema, vista (lista/grade), período. `soIcone` esconde o texto (fica como rótulo acessível + tooltip).
 */
export default function Segmentado<V extends string>({ opcoes, valor, onChange, rotulo, soIcone }: {
  opcoes: OpcaoSegmentado<V>[]; valor: V; onChange: (v: V) => void; rotulo: string; soIcone?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex gap-0.5 rounded-pilula bg-s2 p-1 font-texto">
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <button key={o.valor} type="button" role="radio" aria-checked={on} aria-label={soIcone ? o.rotulo : undefined} title={soIcone ? o.rotulo : undefined}
            onClick={() => onChange(o.valor)}
            className={`anel-foco inline-flex min-h-11 items-center justify-center gap-2 rounded-pilula text-sm font-medium transition-colors duration-150 ${soIcone ? "w-[52px]" : "px-4"} ${on ? "bg-s3 text-t1 ring-1 ring-inset ring-s4" : "text-t2 hover:bg-s3/50 hover:text-t1"}`}>
            <Icone nome={o.icone} tamanho={18} className={on ? "text-ac-text" : undefined} />
            {!soIcone && o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
