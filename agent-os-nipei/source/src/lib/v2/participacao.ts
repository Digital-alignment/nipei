import type { Pessoa, Tarefa } from "./data";

// Participação (gestão only): how much a person delivers and uses the platform — NOT how good their
// work is. Four parts, each 0–100 or null when there isn't enough data; the total is their average.
//   Entrega  of the tasks due in the last 90 days, how many are done (on time weighs more)
//   Em dia   open overdue tasks pull it down
//   Ritmo    tasks finished in the last 30 days (5 = 100)
//   Uso      last use, own actions in task logs, profile confirmed, WhatsApp verified, assessment
// With fewer than 2 parts it says "dados insuficientes" instead of a low number.

export type Partes = { entrega: number | null; emDia: number | null; ritmo: number | null; uso: number | null };
export type Participacao = { total: number | null; partes: Partes; nivel: "alta" | "media" | "baixa" | "sem"; tendencia: number | null };
export type Fontes = {
  tarefas: Tarefa[]; // all tasks of the platform
  acoes: string[]; // ISO days of this person's own entries in task activity logs
  ultimoUso: string; // ISO day or ""
  diagnostico: number; // 0..1 answered share of the individual part
};

/** Text colour per level (list and profile). */
export const NIVEL_COR = { alta: "text-green-700 dark:text-green-400", media: "text-amber-700 dark:text-amber-400", baixa: "text-red-600 dark:text-red-400", sem: "text-neutral-400" } as const;

const DIA = 86_400_000;
/** Completion dates and last use are recorded from this day on: before 30 days of data, Ritmo and the trend stay empty. */
export const INICIO_REGISTRO = "2026-10-20";
const menos = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - n * DIA).toISOString().slice(0, 10);
const media = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };

/** The indicator as of `hoje` (pass an earlier day to get the previous period for the trend). */
export function calcular(p: Pessoa, f: Fontes, hoje: string, comPerfil = true): { total: number | null; partes: Partes } {
  const minhas = f.tarefas.filter((t) => t.responsaveis.includes(p.id));
  const venceram = minhas.filter((t) => t.prazo && t.prazo < hoje && t.prazo >= menos(hoje, 90));
  const entrega = venceram.length < 3 ? null : Math.round(100 * venceram.reduce((a, t) => {
    if (t.status !== "done") return a;
    if (!t.concluidoEm) return a + 0.9; // done before we recorded dates
    return a + (t.concluidoEm.slice(0, 10) <= t.prazo ? 1 : 0.8);
  }, 0) / venceram.length);
  const abertas = minhas.filter((t) => t.status !== "done" && (!t.concluidoEm || t.concluidoEm.slice(0, 10) > hoje));
  const atrasadas = abertas.filter((t) => t.prazo && t.prazo < hoje).length;
  const emDia = abertas.length ? Math.max(0, 100 - 15 * atrasadas) : null;
  const feitas30 = minhas.filter((t) => t.concluidoEm && t.concluidoEm.slice(0, 10) <= hoje && t.concluidoEm.slice(0, 10) > menos(hoje, 30)).length;
  const ritmo = menos(hoje, 30) < INICIO_REGISTRO || (feitas30 === 0 && minhas.length < 3) ? null : Math.min(100, feitas30 * 20);
  const acoes30 = f.acoes.filter((d) => d <= hoje && d > menos(hoje, 30)).length;
  let uso = Math.min(30, acoes30 * 5);
  if (f.ultimoUso && f.ultimoUso <= hoje) uso += f.ultimoUso > menos(hoje, 7) ? 40 : f.ultimoUso > menos(hoje, 30) ? 20 : 0;
  if (comPerfil) {
    if (p.dadosConfirmadosEm) uso += 10;
    if (p.whatsappVerificado) uso += 10;
    if (f.diagnostico >= 0.5) uso += 10;
  }
  const partes: Partes = { entrega, emDia, ritmo, uso: Math.min(100, uso) };
  const conhecidas = Object.values(partes).filter((x) => x != null).length;
  return { total: conhecidas >= 2 ? media(Object.values(partes)) : null, partes };
}

export function participacao(p: Pessoa, f: Fontes, hoje: string): Participacao {
  const agora = calcular(p, f, hoje);
  // previous period: same rules a month earlier (last use isn't known back then, profile bonuses ignored)
  const antes = calcular(p, { ...f, ultimoUso: "" }, menos(hoje, 30), false);
  const nivel = agora.total == null ? "sem" : agora.total >= 70 ? "alta" : agora.total >= 40 ? "media" : "baixa";
  const comparavel = menos(hoje, 60) >= INICIO_REGISTRO; // the previous month must also have recorded data
  return { ...agora, nivel, tendencia: comparavel && agora.total != null && antes.total != null ? agora.total - antes.total : null };
}

/** Self-check: node --experimental-strip-types src/lib/v2/participacao.ts */
if (typeof process !== "undefined" && process.argv[1]?.endsWith("participacao.ts")) {
  const p = { id: "ana", dadosConfirmadosEm: "2026-10-01", whatsappVerificado: true } as Pessoa;
  const t = (o: Partial<Tarefa>): Tarefa => ({ id: Math.random().toString(), file: "", title: "", status: "todo", statusRaw: "", prazo: "", priority: "", equipe: "", area: "", projeto: "", objetivo: "", responsaveis: ["ana"], responsible: "", checklist: { feitos: 0, total: 0 }, anexos: 0, recorrencia: "", atualizadoEm: "", concluidoEm: "", ...o });
  const hoje = "2027-01-20";
  const vazio = participacao(p, { tarefas: [], acoes: [], ultimoUso: "", diagnostico: 0 }, hoje);
  console.assert(vazio.nivel === "sem" && vazio.total == null, "sem dados", vazio);
  const tarefas = [
    t({ prazo: "2027-01-01", status: "done", concluidoEm: "2026-12-30T10:00:00Z" }),
    t({ prazo: "2027-01-05", status: "done", concluidoEm: "2027-01-10T10:00:00Z" }),
    t({ prazo: "2027-01-10" }),
    t({ prazo: "2027-02-01" }),
  ];
  const r = participacao(p, { tarefas, acoes: ["2027-01-18", "2027-01-19"], ultimoUso: "2027-01-20", diagnostico: 0.6 }, hoje);
  console.assert(r.partes.entrega === 60, "entrega (1 + 0.8 + 0)/3", r.partes);
  console.assert(r.partes.emDia === 85, "1 atrasada", r.partes);
  console.assert(r.partes.ritmo === 40, "2 feitas em 30 dias", r.partes);
  console.assert(r.partes.uso === 80, "uso: 2 ações (10) + usou hoje (40) + perfil, WhatsApp, diagnóstico (30)", r.partes);
  console.assert(r.total === 66 && r.nivel === "media", "total = média de 60, 85, 40, 80", r);
  console.log("participacao ok:", JSON.stringify(r));
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("participacao.ts")) {
  const p = { id: "ana" } as Pessoa;
  const r = participacao(p, { tarefas: [], acoes: [], ultimoUso: "2026-10-20", diagnostico: 0 }, "2026-10-25");
  console.assert(r.partes.ritmo === null && r.tendencia === null, "arranque: sem ritmo nem tendência", r);
  console.log("arranque ok");
}
