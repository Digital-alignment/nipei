import type { NomeSelo } from "./Selo";

// As 4 equipes no design system (DESIGN-SYSTEM.md seção 3.4): cada uma tem selo + token de cor.
// Equipe aparece sempre com selo + nome (nunca só a cor).

export type ChaveEquipe = "escritorio" | "producao" | "guardioes" | "manutencao";

export const EQUIPES_DS: Record<ChaveEquipe, { selo: NomeSelo; cor: string; nome: string }> = {
  escritorio: { selo: "escritorio", cor: "var(--eq-escritorio)", nome: "Escritório / Gestão Geral" },
  producao: { selo: "producao", cor: "var(--eq-producao)", nome: "Produção Yawanawa" },
  guardioes: { selo: "guardioes", cor: "var(--eq-guardioes)", nome: "Guardiões" },
  manutencao: { selo: "manutencao", cor: "var(--eq-manutencao)", nome: "Manutenção e Logística" },
};

// Como o vault identifica cada equipe: id da nota (Equipes/*.md) e a cor antiga do campo `cor`,
// que componentes da v2 ainda passam (Chip cor={e.cor}). É uma tabela de dados, não cor de interface.
const DO_VAULT: Record<string, ChaveEquipe> = {
  equipe_1: "escritorio", equipe_2: "producao", equipe_3: "guardioes", equipe_4: "manutencao",
  // ds-permitido: cores antigas gravadas no vault (dado, não cor de interface)
  "#2563eb": "escritorio", "#16a34a": "producao", "#d97706": "guardioes", "#7c3aed": "manutencao",
};

/** Chave do design system a partir da chave, do id da equipe no vault ou da cor antiga. */
export function chaveEquipe(x?: string | null): ChaveEquipe | undefined {
  if (!x) return undefined;
  if (x in EQUIPES_DS) return x as ChaveEquipe;
  return DO_VAULT[x.toLowerCase()];
}
