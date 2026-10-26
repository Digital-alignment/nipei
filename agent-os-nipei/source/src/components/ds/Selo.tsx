import type { SVGProps } from "react";
import { SIMBOLOS, type ArquivoSimbolo } from "./simbolos.generated";

// Selo (símbolo de natureza) do Nipëi — DESIGN-SYSTEM.md seções 3.4 e 7.5.
// Use o nome semântico (sol, lua, broto…) para menu, seções e equipes; o nome do arquivo
// (simbolo-NN, simbolo2-NN, simbolo3-NN) fica para ilustrações e estados vazios.
// Não misture lotes num mesmo grupo (o menu usa só o lote 1). Os símbolos sagrados de
// outros povos do lote 2 não existem aqui (o gerador os bloqueia).

export const SELOS = {
  sol: "simbolo-27", // Hoje
  lua: "simbolo-14", // Agenda
  broto: "simbolo-03", // Tarefas
  espiral: "simbolo-18", // Conhecimento
  quadrados: "simbolo-54", // Acervo
  mao: "simbolo-17", // Pessoas
  olho: "simbolo-57", // Painel
  semente: "simbolo-46", // Finanças
  irradiacao: "simbolo-47", // Pinu / IA (em menus)
  escritorio: "simbolo-13", // Escritório / Gestão Geral
  producao: "simbolo-11", // Produção Yawanawa
  guardioes: "simbolo-10", // Guardiões
  manutencao: "simbolo-62", // Manutenção e Logística
} as const satisfies Record<string, ArquivoSimbolo>;

export type NomeSelo = keyof typeof SELOS;
export type { ArquivoSimbolo };

type Props = { nome: NomeSelo | ArquivoSimbolo; tamanho?: number; className?: string; "aria-label"?: string } & Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "children">;

/** Arquivo do símbolo para um nome semântico ou de arquivo. */
export const arquivoDoSelo = (nome: NomeSelo | ArquivoSimbolo): ArquivoSimbolo => (nome in SELOS ? SELOS[nome as NomeSelo] : (nome as ArquivoSimbolo));

export default function Selo({ nome, tamanho = 32, className, "aria-label": rotulo, ...resto }: Props) {
  const { viewBox, d } = SIMBOLOS[arquivoDoSelo(nome)];
  return (
    <svg viewBox={viewBox} width={tamanho} height={tamanho} fill="currentColor" className={className} focusable="false"
      {...(rotulo ? { role: "img", "aria-label": rotulo } : { "aria-hidden": true })} {...resto}>
      <path d={d} />
    </svg>
  );
}
