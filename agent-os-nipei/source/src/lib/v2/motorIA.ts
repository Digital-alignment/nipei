import { getConexoes, salvarConexoes } from "./conexoes";

// The one place that decides which AI engine answers. Default: the platform's OpenRouter key and model.
// A person can save their own API key (Conexões tab); the assistant then runs on it — the panel, WhatsApp
// and anything else that passes `pessoaId`. All four providers speak the OpenAI chat-completions format
// (with tools), so the calling code doesn't change. A personal key that fails falls back to the platform.

export type Provedor = "gemini" | "anthropic" | "openrouter" | "openai";
export const PROVEDORES: Record<Provedor, { nome: string; url: string; modelo: string; chave: string }> = {
  gemini: { nome: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", modelo: "gemini-flash-latest", chave: "https://aistudio.google.com/apikey" },
  anthropic: { nome: "Anthropic (Claude)", url: "https://api.anthropic.com/v1/chat/completions", modelo: "claude-haiku-5-5", chave: "https://console.anthropic.com/settings/keys" },
  openrouter: { nome: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", modelo: "anthropic/claude-haiku-5.5", chave: "https://openrouter.ai/keys" },
  openai: { nome: "OpenAI", url: "https://api.openai.com/v1/chat/completions", modelo: "gpt-5-mini", chave: "https://platform.openai.com/api-keys" },
};
export type ChaveIA = { provedor: Provedor; key: string; modelo: string; salvaEm: string; pausada?: boolean; erro?: string; erroEm?: string; uso?: { dia: string; n: number } };
export type Motor = { url: string; key: string; modelo: string; headers: Record<string, string>; pessoal: boolean; provedor: Provedor | "plataforma" };

const cabecalhos = (key: string) => ({ Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://os.nipeihu.app", "X-Title": "Nipei OS" });

export function motorIA(pessoaId?: string): Motor {
  const ia = pessoaId ? getConexoes(pessoaId).ia : undefined;
  if (ia?.key && !ia.pausada) {
    const p = PROVEDORES[ia.provedor];
    return { url: p.url, key: ia.key, modelo: ia.modelo || p.modelo, headers: cabecalhos(ia.key), pessoal: true, provedor: ia.provedor };
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("IA não configurada no servidor (OPENROUTER_API_KEY)");
  return { url: PROVEDORES.openrouter.url, key, modelo: process.env.NIPEI_IA_MODEL || PROVEDORES.openrouter.modelo, headers: cabecalhos(key), pessoal: false, provedor: "plataforma" };
}

/** After each call with a personal key: count today's use, or keep the error to show it in Conexões. */
export function registrarUsoIA(pessoaId: string, erro?: string) {
  const c = getConexoes(pessoaId);
  if (!c.ia) return;
  const dia = new Date().toISOString().slice(0, 10);
  if (erro) Object.assign(c.ia, { erro, erroEm: new Date().toISOString() });
  else c.ia.uso = { dia, n: (c.ia.uso?.dia === dia ? c.ia.uso.n : 0) + 1 };
  salvarConexoes(pessoaId, c);
}

/** Provider error → one readable line (providers answer {error:{message}} or [{error:{message}}]). */
export function erroLegivel(status: number, corpo: string, modelo = "") {
  const msg = (() => { try { const j = JSON.parse(corpo); return String(j?.error?.message ?? j?.[0]?.error?.message ?? ""); } catch { return ""; } })();
  if (status === 401 || status === 403 || /api key/i.test(msg)) return "Chave recusada pelo provedor";
  if (status === 404) return `Modelo "${modelo}" não encontrado`;
  if (status === 429) return "Limite ou cota da sua conta atingido";
  return `O provedor respondeu ${status || "sem conexão"}${msg ? `: ${msg.slice(0, 160)}` : ""}`;
}

/** One tiny call with a tool, the way the assistant uses it; null when the key and model work. */
export async function testarChave(provedor: Provedor, key: string, modelo: string): Promise<string | null> {
  const p = PROVEDORES[provedor];
  try {
    const r = await fetch(p.url, {
      method: "POST", headers: cabecalhos(key), signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: modelo || p.modelo, max_tokens: 50, messages: [{ role: "user", content: "Responda só: ok" }],
        tools: [{ type: "function", function: { name: "ping", description: "teste", parameters: { type: "object", properties: {}, required: [] } } }],
      }),
    });
    return r.ok ? null : erroLegivel(r.status, await r.text(), modelo || p.modelo);
  } catch (e) {
    return `Não consegui falar com o provedor (${(e as Error).message})`;
  }
}
