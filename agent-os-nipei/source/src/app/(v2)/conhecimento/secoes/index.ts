import type { ComponentType } from "react";
import type { Equipe, Me, Projeto } from "@/lib/v2/data";
import type { Fato, Fonte } from "@/lib/v2/conhecimento";
import type { Dict, Lang } from "@/lib/v2/i18n";
import Enviar from "./Enviar";
import Revisar from "./Revisar";
import Fontes from "./Fontes";
import Base from "./Base";
import Mapa from "./Mapa";

// The Conhecimento page is a list of collapsible sections (components/v2/Recolhivel.tsx). Each one is a
// component in this folder that gets the page's data in `ctx`. To add a view (a knowledge map, an editor,
// a timeline…): create the component here and add a line below. Order = order on the page; `atalho`
// puts a shortcut card on top.
export type Ctx = {
  me: Me; t: Dict; lang: Lang; q: { q?: string; equipe?: string; tipo?: string; projeto?: string; pessoa?: string; pergunta?: string };
  fontes: Fonte[]; fatos: Fato[]; equipes: Equipe[]; projetos: Projeto[];
  nome: (id: string) => string;
  /** facts of one source: proposed (to review) and already reviewed */
  porFonte: (fonteId: string) => { pendentes: Fato[]; revisados: number; total: number };
  paraMim: Fonte[];
  confirmados: Fato[];
};
export type Secao = {
  id: string;
  titulo: (c: Ctx) => string;
  contagem?: (c: Ctx) => number;
  alerta?: boolean;
  /** open the first time (afterwards the device remembers) */
  aberto: (c: Ctx) => boolean;
  /** open now, whatever was remembered */
  forcar?: (c: Ctx) => boolean;
  mostrar?: (c: Ctx) => boolean;
  atalho?: (c: Ctx) => string;
  Componente: ComponentType<{ ctx: Ctx }>;
};

export const SECOES: Secao[] = [
  { id: "enviar", titulo: (c) => c.t.enviar, aberto: () => true, Componente: Enviar },
  {
    id: "revisar", titulo: (c) => c.t.paraRevisar, alerta: true, contagem: (c) => c.paraMim.reduce((s, f) => s + c.porFonte(f.id).pendentes.length, 0),
    aberto: () => true, mostrar: (c) => c.paraMim.length > 0, atalho: (c) => c.t.fatosParaRevisar, Componente: Revisar,
  },
  { id: "mapa", titulo: (c) => c.t.mapaConhecimento, aberto: () => false, Componente: Mapa },
  { id: "fontes", titulo: (c) => c.t.fontes, contagem: (c) => c.fontes.length, aberto: () => false, atalho: (c) => c.t.fontesMin, Componente: Fontes },
  {
    id: "base", titulo: (c) => c.t.baseConfirmada, contagem: (c) => c.confirmados.length, aberto: () => false, forcar: (c) => !!(c.q.q || c.q.equipe || c.q.tipo || c.q.projeto || c.q.pessoa),
    atalho: (c) => c.t.fatosConfirmadosMin, Componente: Base,
  },
];
