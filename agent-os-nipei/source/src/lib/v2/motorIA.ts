// The one place that decides which AI engine answers (today: the platform's OpenRouter key and model).
// Every v2 AI call (tasks, Conhecimento, assistant) goes through here, so a person's own key
// (plan phase 5) only has to be picked here — `pessoaId` is already passed for that.

export type Motor = { url: string; key: string; modelo: string; headers: Record<string, string> };

export function motorIA(_pessoaId?: string): Motor {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("IA não configurada no servidor (OPENROUTER_API_KEY)");
  return {
    url: "https://openrouter.ai/api/v1/chat/completions", key, modelo: process.env.NIPEI_IA_MODEL || "anthropic/claude-haiku-5.5",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://os.nipeihu.app", "X-Title": "Nipei OS" },
  };
}
