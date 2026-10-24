import fs from "fs";
import path from "path";
import { vault, type Me } from "./data";

// On/off switches per feature and per person, set only from the admin panel (/controle → Funções).
// Each feature keeps its normal rule (`padrao`); the panel can switch it off for everyone, or force it
// on/off for one person. `soGestao` features never go past Equipe 1, whatever the switch says.
// To put a new feature behind a switch: add it here and gate it with funcaoLigada("id", me).

export const FUNCOES = {
  assistente: { nome: "Assistente", descricao: "O assistente no painel (o botão flutuante).", padrao: (me: Me) => me.gestao, regra: "Equipe 1" },
  voz: { nome: "Voz do assistente", descricao: "Respostas faladas do assistente.", padrao: (me: Me) => me.gestao, regra: "Equipe 1" },
  whatsapp: { nome: "Assistente pelo WhatsApp", descricao: "Encaminhar mensagens ao número do Nipëi e confirmar propostas por lá.", padrao: (me: Me) => me.gestao, regra: "Equipe 1" },
  gmail: { nome: "Gmail no assistente", descricao: "Ler, buscar e enviar e-mails pelo assistente (precisa ativar o Gmail em Conexões).", padrao: (me: Me) => me.gestao, regra: "Equipe 1", soGestao: true },
  mcp: { nome: "Apps de IA (Claude, Gemini…)", descricao: "Usar o Nipëi de dentro de outros apps de IA.", padrao: () => true, regra: "todos" },
} satisfies Record<string, { nome: string; descricao: string; padrao: (me: Me) => boolean; regra: string; soGestao?: boolean }>;
export type FuncaoId = keyof typeof FUNCOES;
export type ConfigFuncoes = Partial<Record<FuncaoId, { desligada?: boolean; pessoas?: Record<string, boolean> }>>;

const ARQ = () => path.join(vault(), ".jobs", "admin", "funcoes.json");
export function lerFuncoes(): ConfigFuncoes { try { return JSON.parse(fs.readFileSync(ARQ(), "utf-8")); } catch { return {}; } }
export function salvarFuncoes(c: ConfigFuncoes) {
  fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
  fs.writeFileSync(ARQ(), JSON.stringify(c, null, 2), { encoding: "utf-8", mode: 0o600 });
}

export function funcaoLigada(id: FuncaoId, me: Me | null | undefined): boolean {
  if (!me) return false;
  const f: { padrao: (me: Me) => boolean; soGestao?: boolean } = FUNCOES[id], c = lerFuncoes()[id];
  if (c?.desligada) return false;
  if (f.soGestao && !me.gestao) return false;
  return (me.pessoa ? c?.pessoas?.[me.pessoa.id] : undefined) ?? f.padrao(me);
}
