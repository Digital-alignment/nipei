import fs from "fs";
import path from "path";
import type { Projeto, Tarefa } from "./data";
import { noPrazoSemanas } from "./pedidos";

// Projetos (DS 10.21): health, "stalled" and the AI triage of tasks without a project.

/** % done on time per week for a project (same rule as the team cards). */
export const noPrazoProjeto = (tarefas: Tarefa[], projeto: string, hoje: string) =>
  noPrazoSemanas(tarefas.filter((t) => t.projeto === projeto).map((t) => ({ ...t, equipe: "_p" })), "_p", hoje);

/** Days since anything moved in an active project (a task written or an update posted); null = has nothing yet. */
export function diasParado(p: Projeto, tarefas: Tarefa[], hoje: string): number | null {
  const datas = [...tarefas.filter((t) => t.projeto === p.id).map((t) => (t.atualizadoEm || "").slice(0, 10)), ...p.atualizacoes.map((a) => a.slice(0, 10))]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const ultima = datas.at(-1);
  return ultima ? Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${ultima}T12:00:00Z`)) / 86_400_000) : null;
}
export const PARADO_DIAS = 21;

// ---------------------------------------------------------------- AI suggestions for tasks without a project
// <vault>/.jobs/sugestoes-projeto.json: { tarefaId: projetoId } — suggestions only; nothing is written to a task until "Salvar".

const ARQ = (vault: string, tipo: Tipo = "tarefas") => path.join(vault, ".jobs", tipo === "fatos" ? "sugestoes-projeto-fatos.json" : "sugestoes-projeto.json");
type Tipo = "tarefas" | "fatos";
export function getSugestoes(vault: string, tipo: Tipo = "tarefas"): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(ARQ(vault, tipo), "utf-8")); } catch { return {}; }
}

const SISTEMA = (oque: string) => `Você organiza ${oque} da comunidade do Santuário Nipeihu por projeto. Para cada item, escolha o projeto mais provável da lista, pelo texto e pela equipe.
Se nenhum projeto servir claramente, use "". Identidade, missão, filosofia e regras gerais do lugar ficam no projeto geral do Santuário, se ele estiver na lista. Não invente projetos.
Responda só JSON: {"sugestoes": {"<id do item>": "<id do projeto ou vazio>"}}`;

export const sugerirProjetos = (vault: string, tarefas: Tarefa[], projetos: Projeto[], equipes: { id: string; nome: string }[]) =>
  sugerirProjetosItens(vault, "tarefas", tarefas.map((t) => ({ id: t.id, texto: t.title, equipe: t.equipe })), projetos, equipes);

/** One AI call per 60 items; only preselects (written to .jobs), never to the items themselves. */
export async function sugerirProjetosItens(vault: string, tipo: Tipo, itens: { id: string; texto: string; equipe: string }[], projetos: Projeto[], equipes: { id: string; nome: string }[]) {
  const { chamarIATexto } = await import("./ia");
  const catalogo = projetos.filter((p) => p.status !== "concluido").map((p) => `- ${p.id}: ${p.nome} (${p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e).join(", ")}) — ${(p.sobre.objetivo || p.descricao).replace(/\s+/g, " ").slice(0, 200)}`).join("\n");
  const validos = new Set(projetos.map((p) => p.id));
  const out = getSugestoes(vault, tipo);
  for (let i = 0; i < itens.length; i += 60) {
    const lote = itens.slice(i, i + 60).map((t) => `- ${t.id} | ${t.texto.replace(/\s+/g, " ").slice(0, 300)} | equipe: ${equipes.find((e) => e.id === t.equipe)?.nome ?? "-"}`).join("\n");
    const ids = new Set(itens.slice(i, i + 60).map((t) => t.id));
    const raw = await chamarIATexto(SISTEMA(tipo === "fatos" ? "os fatos da base de conhecimento" : "as tarefas"), [{ type: "text", text: `## Projetos\n${catalogo}\n\n## Itens (id | texto | equipe)\n${lote}` }], 8000, 150_000);
    // read "id": "projeto" pairs one by one: a stray brace or a cut-off answer loses one pair, not the batch
    for (const [, tid, pid] of raw.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g)) if (ids.has(tid) && validos.has(pid)) out[tid] = pid;
    // save after each batch: a later failing batch keeps what was already suggested
    fs.mkdirSync(path.dirname(ARQ(vault, tipo)), { recursive: true });
    fs.writeFileSync(ARQ(vault, tipo), JSON.stringify(out));
  }
  return out;
}

// self-check: npx tsx src/lib/v2/projetos.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/projetos.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const p = { id: "p1", atualizacoes: ["2026-10-01 · A · x"] } as Projeto;
  const t = (o: Partial<Tarefa>) => ({ projeto: "p1", atualizadoEm: "", prazo: "", concluidoEm: "", pedidoRecusado: "", equipe: "e", ...o }) as Tarefa;
  assert(diasParado(p, [t({ atualizadoEm: "2026-10-20T10:00:00Z" }), t({ projeto: "x", atualizadoEm: "2026-11-04T10:00:00Z" })], "2026-11-05") === 16, "parado conta só o projeto");
  assert(diasParado({ ...p, atualizacoes: [] }, [], "2026-11-05") === null, "sem nada = null");
  const s = noPrazoProjeto([t({ prazo: "2026-11-03", concluidoEm: "2026-11-03T10:00" }), t({ projeto: "x", prazo: "2026-11-03", concluidoEm: "2026-11-09T10:00" })], "p1", "2026-11-05");
  assert(s[7] === 100, `no prazo por projeto: ${s}`);
  console.log("projetos: ok");
}
