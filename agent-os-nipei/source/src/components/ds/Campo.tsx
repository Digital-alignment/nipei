"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { BotaoIcone } from "./Botao";

// Campo do design system (DESIGN-SYSTEM.md seção 9.5 e regra 4).
// Superfície s2, sem borda. Hover = brilho fraco (a única exceção de brilho fora da IA); foco = anel de
// acento + brilho; erro = anel vermelho + ícone + mensagem que diz como corrigir. Rótulo dentro, no topo.

export type TipoCampo = "texto" | "titulo" | "area" | "busca" | "selecao" | "data" | "senha";

type Comum = {
  /** Rótulo dentro do campo (na busca vira aria-label + placeholder). */
  rotulo: string;
  ajuda?: string;
  /** Mensagem de erro: diga o que corrigir ("Escreva um título com pelo menos 3 letras"). */
  erro?: string;
  iconeEsquerda?: NomeIcone;
  /** Botão ou ação à direita (ex.: <BotaoIcone> de filtro). */
  acaoDireita?: ReactNode;
  /** Linha de sugestão abaixo do texto (use <SugestaoPinu>). */
  sugestao?: ReactNode;
  /** Busca do Pinu: mini-anel à esquerda + microfone em acento (só com tipo="busca" e quando há `onMicrofone`). */
  pinu?: boolean;
  onMicrofone?: () => void;
  id?: string;
  className?: string;
};
type PropsInput = Comum & { tipo?: "texto" | "titulo" | "busca" | "data" | "senha" } & Omit<InputHTMLAttributes<HTMLInputElement>, keyof Comum>;
type PropsArea = Comum & { tipo: "area" } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof Comum>;
type PropsSelecao = Comum & { tipo: "selecao" } & Omit<SelectHTMLAttributes<HTMLSelectElement>, keyof Comum>;
export type PropsCampo = PropsInput | PropsArea | PropsSelecao;

/** Campo compacto (seção 9.2): select/input dentro de uma linha densa — tabela, barra de lote, atribuir na lista. Sem rótulo visível: use aria-label. 44 px no celular, 36 px a partir de sm. */
export const CAMPO_COMPACTO = "anel-foco h-11 sm:h-9 rounded-pilula bg-s2 px-3 font-texto text-sm text-t1 outline-none focus:shadow-foco disabled:text-t3";

const CONTROLE = "w-full min-w-0 bg-transparent text-t1 font-texto text-base outline-none placeholder:text-t3 disabled:text-t3 disabled:cursor-not-allowed";

export default function Campo(props: PropsCampo) {
  const { rotulo, ajuda, erro, iconeEsquerda, acaoDireita, sugestao, pinu, onMicrofone, id: idDado, className, tipo = "texto", ...resto } = props;
  const gerado = useId();
  const id = idDado ?? `campo${gerado}`;
  const idAjuda = `${id}-ajuda`, idErro = `${id}-erro`;
  const descrito = erro ? idErro : ajuda ? idAjuda : undefined; // com erro a ajuda some, então só o erro descreve o campo
  const a11y = { id, "aria-invalid": erro ? true : undefined, "aria-describedby": descrito };
  const busca = tipo === "busca";
  const varias = tipo === "area" || tipo === "titulo" || !!sugestao;

  const casca = [
    "group/campo relative flex bg-s2 transition-shadow duration-200",
    erro ? "shadow-[0_0_0_1.5px_var(--err)]" : "[&:hover:not(:focus-within)]:shadow-brilho-ia focus-within:shadow-foco",
    busca ? "min-h-14 items-center gap-2 rounded-pilula py-1.5 pl-4 pr-1.5" : varias ? "flex-col gap-1 rounded-cartao px-4 pb-3.5 pt-3" : "flex-col gap-0.5 rounded-pilula px-5 pb-2.5 pt-2",
    className ?? "",
  ].join(" ");

  let controle: ReactNode;
  if (tipo === "area") {
    controle = <textarea rows={3} {...a11y} className={`${CONTROLE} min-h-20 resize-y leading-normal`} {...(resto as TextareaHTMLAttributes<HTMLTextAreaElement>)} />;
  } else if (tipo === "selecao") {
    controle = (
      <span className="relative flex items-center">
        <select {...a11y} className={`${CONTROLE} cursor-pointer appearance-none pr-8`} {...(resto as SelectHTMLAttributes<HTMLSelectElement>)} />
        <Icone nome="abrir" tamanho={18} className="pointer-events-none absolute right-0 text-t2" />
      </span>
    );
  } else {
    const r = resto as InputHTMLAttributes<HTMLInputElement>;
    const tipoHtml = tipo === "data" ? "date" : tipo === "senha" ? "password" : busca ? "search" : "text";
    controle = (
      <span className="relative flex items-center">
        <input type={tipoHtml} {...a11y} aria-label={busca ? rotulo : undefined} placeholder={busca ? r.placeholder ?? rotulo : r.placeholder}
          className={`${CONTROLE} ${tipo === "titulo" ? "font-display text-[26px] font-light leading-tight" : ""} ${tipo === "data" ? "campo-data pr-8" : ""} ${busca ? "[&::-webkit-search-cancel-button]:hidden" : ""}`} {...r} />
        {tipo === "data" && <Icone nome="calendario" tamanho={18} className="pointer-events-none absolute right-0 text-t2" />}
      </span>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className={casca}>
        {busca ? (
          <>
            {pinu ? <span className="mini-anel" aria-hidden="true" /> : <Icone nome={iconeEsquerda ?? "buscar"} tamanho={20} className="text-t3" />}
            <span className="min-w-0 flex-1">{controle}</span>
            {acaoDireita}
            {pinu && onMicrofone && <BotaoIcone icone="microfone" aria-label="Falar com o Pinu" tamanho={44} variante="acento" onClick={onMicrofone} />}
          </>
        ) : (
          <>
            <label htmlFor={id} className="rotulo-campo text-t2 cursor-text">{rotulo}</label>
            <span className="flex items-center gap-2">
              {iconeEsquerda && <Icone nome={iconeEsquerda} tamanho={20} className="shrink-0 text-t3" />}
              <span className="min-w-0 flex-1">{controle}</span>
              {acaoDireita}
            </span>
            {ajuda && !erro && <span id={idAjuda} className="meta text-t3">{ajuda}</span>}
            {sugestao}
          </>
        )}
      </div>
      {erro && <p id={idErro} role="alert" className="meta flex items-center gap-1.5 px-4 text-err"><Icone nome="erro" tamanho={16} />{erro}</p>}
      {busca && ajuda && !erro && <p id={idAjuda} className="meta px-4 text-t3">{ajuda}</p>}
    </div>
  );
}

/**
 * Sugestão do Pinu dentro de um campo (seção 9.5): mini-anel + texto + ✓ usar + ⟳ gerar outra.
 * Por enquanto o texto vem por props; quem chama decide o que "usar" faz (ex.: preencher o campo).
 */
export function SugestaoPinu({ texto, onUsar, onOutra, carregando }: { texto: string; onUsar: () => void; onOutra?: () => void; carregando?: boolean }) {
  return (
    <div className="mt-1.5 flex items-center gap-2 border-t border-s3 pt-2" aria-live="polite">
      <span className="mini-anel" aria-hidden="true" />
      <span className="corpo min-w-0 flex-1 text-t1">{carregando ? "Pinu está pensando…" : texto}</span>
      <BotaoIcone icone="confirmar" aria-label="Usar sugestão" tamanho={40} variante="fantasma" onClick={onUsar} disabled={carregando} />
      {onOutra && <BotaoIcone icone="gerar-outra" aria-label="Outra sugestão" tamanho={40} variante="fantasma" onClick={onOutra} disabled={carregando} />}
    </div>
  );
}
