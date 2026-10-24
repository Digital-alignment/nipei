import fs from "fs";
import path from "path";
import { vault } from "./data";

// What each AI call cost: one line per call in <vault>/.jobs/custos/AAAA-MM.jsonl
// {em, pessoa, origem, provedor, modelo, tin, tout, usd}. `usd` only when the provider reports it
// (OpenRouter does, with usage.include); Gemini and personal keys report tokens only. `pessoa` is ""
// for background jobs. Personal keys are logged too (marked "pessoal": the person pays, not the platform).

export type CustoIA = { em: string; pessoa: string; origem: string; provedor: string; modelo: string; tin: number; tout: number; usd: number | null; pessoal?: boolean };
export const ORIGENS: Record<string, string> = { assistente: "Assistente", whatsapp: "WhatsApp", ia: "IA nas tarefas e relatórios", voz: "Voz", transcricao: "Transcrição de áudio" };

const arq = (mes: string) => path.join(vault(), ".jobs", "custos", `${mes}.jsonl`);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** `usage` as the provider returned it: OpenAI format (prompt/completion_tokens, cost) or Gemini usageMetadata. Never throws. */
export function registrarCustoIA(pessoa: string | null | undefined, origem: string, provedor: string, modelo: string, usage: Record<string, unknown> | null | undefined, pessoal = false) {
  try {
    if (!usage) return;
    const c: CustoIA = {
      em: new Date().toISOString(), pessoa: pessoa ?? "", origem, provedor, modelo,
      tin: n(usage.prompt_tokens ?? usage.promptTokenCount), tout: n(usage.completion_tokens ?? usage.candidatesTokenCount),
      usd: usage.cost === undefined || usage.cost === null ? null : n(usage.cost), ...(pessoal ? { pessoal } : {}),
    };
    fs.mkdirSync(path.dirname(arq(c.em.slice(0, 7))), { recursive: true });
    fs.appendFileSync(arq(c.em.slice(0, 7)), JSON.stringify(c) + "\n", { mode: 0o600 });
  } catch { /* cost logging never breaks the call */ }
}

/** Every call logged in month AAAA-MM. */
export function custosDoMes(mes: string): CustoIA[] {
  try { return fs.readFileSync(arq(mes), "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
}
export function mesesComCusto(): string[] {
  try { return fs.readdirSync(path.dirname(arq("x"))).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, 7)).sort().reverse(); } catch { return []; }
}
