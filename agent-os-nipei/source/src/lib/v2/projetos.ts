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

const ARQ = (vault: string) => path.join(vault, ".jobs", "sugestoes-projeto.json");
export function getSugestoes(vault: string): Record<string, string> {
  try { return JSON.parse(fs.readFileSync(ARQ(vault), "utf-8")); } catch { return {}; }
}

const SISTEMA = `Você organiza as tarefas da comunidade do Santuário Nipeihu por projeto. Para cada tarefa, escolha o projeto mais provável da lista, pelo título, descrição e equipe.
Se nenhum projeto servir claramente, use "". Não invente projetos.
Responda só JSON: {"sugestoes": {"<id da tarefa>": "<id do projeto ou vazio>"}}`;

export async function sugerirProjetos(vault: string, tarefas: Tarefa[], projetos: Projeto[], equipes: { id: string; nome: string }[]) {
  const { chamarIA } = await import("./ia");
  const catalogo = projetos.filter((p) => p.status !== "concluido").map((p) => `- ${p.id}: ${p.nome} (${p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e).join(", ")}) — ${(p.sobre.objetivo || p.descricao).replace(/\s+/g, " ").slice(0, 200)}`).join("\n");
  const validos = new Set(projetos.map((p) => p.id));
  const out = getSugestoes(vault);
  for (let i = 0; i < tarefas.length; i += 60) { // batches: one call per 60 tasks
    const lote = tarefas.slice(i, i + 60).map((t) => `- ${t.id} | ${t.title} | equipe: ${equipes.find((e) => e.id === t.equipe)?.nome ?? "-"}`).join("\n");
    const { o } = await chamarIA(SISTEMA, [{ type: "text", text: `## Projetos\n${catalogo}\n\n## Tarefas (id | título | equipe)\n${lote}` }], 4000, 120_000);
    for (const [tid, pid] of Object.entries((o.sugestoes as Record<string, unknown>) ?? {})) if (validos.has(String(pid))) out[tid] = String(pid);
  }
  fs.mkdirSync(path.dirname(ARQ(vault)), { recursive: true });
  fs.writeFileSync(ARQ(vault), JSON.stringify(out));
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
