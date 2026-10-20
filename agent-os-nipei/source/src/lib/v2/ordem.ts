import type { Tarefa } from "./data";

// Smart order for Hoje's lists. Each task gets a score from signals the platform already has, and
// the strongest signals become small badges ("why is this here?"):
//   priority (urgente/alta/baixa) · how overdue (capped at 30 days) · due today · already in progress
//   · someone else acted on it lately (novidade) · checklist almost done (quick win)
//   · stale: overdue > 60 days and untouched for 30 → goes DOWN with a "parada" badge (re-plan it,
//     don't let it bury the real work) · recurring (routine, slightly lower).

export type Selo = "urgente" | "andamento" | "novidade" | "quasePronta" | "parada";
export type Ctx = { hoje: string; comNovidade: Set<string> };

const DIA = 86_400_000;
const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA);
const peso = (p: string) => (p === "urgente" ? 40 : p === "alta" ? 25 : p === "baixa" ? -10 : 0);
const quase = (t: Tarefa) => t.checklist.total >= 2 && t.checklist.feitos < t.checklist.total && t.checklist.feitos / t.checklist.total >= 0.7;
const parada = (t: Tarefa, hoje: string) =>
  !!t.prazo && dias(t.prazo, hoje) > 60 && (!t.atualizadoEm || dias(t.atualizadoEm.slice(0, 10), hoje) > 30);

export function pontuar(t: Tarefa, { hoje, comNovidade }: Ctx) {
  const selos: Selo[] = [];
  let p = peso(t.priority);
  if (t.priority === "urgente") selos.push("urgente");
  if (t.prazo && t.prazo < hoje) p += 20 + Math.min(dias(t.prazo, hoje), 30) / 2;
  else if (t.prazo === hoje) p += 10;
  if (t.status === "doing") { p += 12; selos.push("andamento"); }
  if (comNovidade.has(t.id)) { p += 10; selos.push("novidade"); }
  if (quase(t)) { p += 8; selos.push("quasePronta"); }
  if (parada(t, hoje)) { p -= 30; selos.push("parada"); }
  if (t.recorrencia) p -= 5;
  return { p, selos };
}

/** Agora (overdue + today): by score, then oldest due date. */
export function ordenarAgora(ts: Tarefa[], ctx: Ctx) {
  return ordenar(ts, ctx, (a, b) => (a.prazo || "").localeCompare(b.prazo || ""));
}

/** Próximas: by date first (it's a calendar), priority and progress break ties. */
export function ordenarProximas(ts: Tarefa[], ctx: Ctx) {
  const r = ordenar(ts, ctx);
  return { ...r, tarefas: [...ts].sort((a, b) => a.prazo.localeCompare(b.prazo) || r.score.get(b.id)! - r.score.get(a.id)!) };
}

/** Sem data: score, then the most recently touched (fresh work before forgotten ideas). */
export function ordenarSemData(ts: Tarefa[], ctx: Ctx) {
  return ordenar(ts, ctx, (a, b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""));
}

function ordenar(ts: Tarefa[], ctx: Ctx, desempate: (a: Tarefa, b: Tarefa) => number = () => 0) {
  const score = new Map<string, number>(), selos: Record<string, Selo[]> = {};
  for (const t of ts) { const r = pontuar(t, ctx); score.set(t.id, r.p); if (r.selos.length) selos[t.id] = r.selos; }
  return { tarefas: [...ts].sort((a, b) => score.get(b.id)! - score.get(a.id)! || desempate(a, b)), selos, score };
}

/** Self-check: node --experimental-strip-types src/lib/v2/ordem.ts */
if (typeof process !== "undefined" && process.argv[1]?.endsWith("ordem.ts")) {
  const base: Tarefa = { id: "", file: "", title: "", status: "todo", statusRaw: "", prazo: "", priority: "média", equipe: "", area: "", projeto: "", objetivo: "", responsaveis: [], responsible: "", checklist: { feitos: 0, total: 0 }, anexos: 0, recorrencia: "", atualizadoEm: "" };
  const t = (id: string, o: Partial<Tarefa>): Tarefa => ({ ...base, id, title: id, ...o });
  const ctx: Ctx = { hoje: "2026-10-20", comNovidade: new Set(["novidade"]) };
  const lista = [
    t("hoje", { prazo: "2026-10-20" }),
    t("atrasada2d", { prazo: "2026-10-18" }),
    t("altaHoje", { prazo: "2026-10-20", priority: "alta" }),
    t("parada", { prazo: "2026-05-01", atualizadoEm: "2026-06-01T00:00:00Z" }),
    t("novidade", { prazo: "2026-10-20" }),
    t("urgente", { prazo: "2026-10-20", priority: "urgente" }),
  ];
  const ordem = ordenarAgora(lista, ctx).tarefas.map((x) => x.id);
  console.assert(ordem[0] === "urgente", ordem);
  console.assert(ordem.indexOf("altaHoje") < ordem.indexOf("hoje"), ordem);
  console.assert(ordem.indexOf("atrasada2d") < ordem.indexOf("hoje"), ordem);
  console.assert(ordem.indexOf("novidade") < ordem.indexOf("hoje"), ordem);
  console.assert(ordem[ordem.length - 1] === "parada", ordem);
  console.log("ordem ok:", ordem.join(" > "));
}
