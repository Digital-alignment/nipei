import fs from "fs";
import path from "path";
import type { Fato } from "./conhecimento";

// DS 10.28: is a confirmed fact fit for material for outsiders (slides, proposals, web), and what is it for.
// The AI only preselects (<vault>/.jobs/sugestoes-publico.json); a person saves on /conhecimento/publico.

export const USOS = ["identidade", "historia", "oferta", "precos", "pessoas", "numeros", "regras", "procedimento", "outro"] as const;
export type Sugestao = { p: boolean; u: string };

const ARQ = (vault: string) => path.join(vault, ".jobs", "sugestoes-publico.json");
export function getSugestoesPublico(vault: string): Record<string, Sugestao> {
  try { return JSON.parse(fs.readFileSync(ARQ(vault), "utf-8")); } catch { return {}; }
}

const SISTEMA = `Você classifica fatos da base de conhecimento do Santuário Nipeihu (comunidade do povo Yawanawá) para materiais.
Para cada fato decida:
1. "p" (público) se pode aparecer em material para quem é de fora — visitantes, participantes de retiros, parceiros, financiadores, site e redes: identidade, história, missão, cultura que a comunidade compartilha, o que oferecemos, regras para hóspedes, números gerais.
   "i" (interno) se é só para a equipe: gestão e decisões internas, conflitos, avaliações de pessoas, finanças e valores de orçamento, questões jurídicas, contatos, procedimentos de funcionários, segurança, qualquer coisa marcada como não confirmada ou "a confirmar". Na dúvida, "i".
2. o uso, um destes: ${USOS.join(", ")}.
Responda só JSON: {"<id>": "p:<uso>" ou "i:<uso>", …}`;

/** Parses the model's "id": "p:uso" pairs one by one (a stray brace loses one pair, not the batch). Pure. */
export function lerSugestoes(raw: string, ids: Set<string>): Record<string, Sugestao> {
  const out: Record<string, Sugestao> = {};
  for (const [, id, p, u] of raw.matchAll(/"([^"]+)"\s*:\s*"([pi]):([a-z]+)"/g)) {
    if (ids.has(id)) out[id] = { p: p === "p", u: (USOS as readonly string[]).includes(u) ? u : "outro" };
  }
  return out;
}

/** One AI call per 60 facts; saves after each batch. Only preselects. */
export async function sugerirPublico(vault: string, fatos: Fato[], nomeProjeto: (id: string) => string) {
  if (!fatos.length) return {};
  const { chamarIATexto } = await import("./ia");
  const out = getSugestoesPublico(vault);
  for (let i = 0; i < fatos.length; i += 60) {
    const lote = fatos.slice(i, i + 60);
    const linhas = lote.map((f) => `- ${f.id} | ${f.tipo} | ${f.projetos.map(nomeProjeto).join(", ") || "-"} | ${f.texto.replace(/\s+/g, " ").slice(0, 400)}`).join("\n");
    const raw = await chamarIATexto(SISTEMA, [{ type: "text", text: `## Fatos (id | tipo | projetos | texto)\n${linhas}` }], 6000, 150_000);
    Object.assign(out, lerSugestoes(raw, new Set(lote.map((f) => f.id))));
    fs.mkdirSync(path.dirname(ARQ(vault)), { recursive: true });
    fs.writeFileSync(ARQ(vault), JSON.stringify(out));
  }
  return out;
}

// self-check: npx tsx src/lib/v2/publico.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/publico.ts")) {
  const r = lerSugestoes(`{"a": "p:historia", "b": "i:numeros", "c": "p:qualquer", "x": "p:oferta"`, new Set(["a", "b", "c"]));
  if (r.a?.p !== true || r.a.u !== "historia" || r.b?.p !== false || r.c?.u !== "outro" || "x" in r) throw new Error(JSON.stringify(r));
  console.log("publico: ok");
}
