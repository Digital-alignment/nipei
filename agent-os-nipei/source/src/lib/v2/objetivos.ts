import fs from "fs";
import path from "path";
import type { Objetivo, Tarefa } from "./data";

// Objetivos as results (DS 10.22): progress from the target (number or milestones), pace from the dates,
// weekly check-ins. The note body keeps: description · "## Marcos" (checklist) · "## Check-ins" (newest first).

export type Ritmo = "em_ritmo" | "em_risco" | "atrasado" | "concluido" | "sem_prazo";
/** BadgeEstado for each pace (DS 10.22): always icon + text, no new colours. */
export const BADGE_RITMO = { em_ritmo: "feita", em_risco: "aviso", atrasado: "atrasada", concluido: "feita", sem_prazo: "pendente" } as const satisfies Record<Ritmo, string>;
const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** 0–1 progress: the number target, else the milestones, else the linked tasks; null = nothing to measure yet. */
export function avanco(o: Objetivo, tarefas: Tarefa[]): number | null {
  if (o.meta && o.meta.alvo !== o.meta.inicial) return Math.max(0, Math.min(1, (o.meta.atual - o.meta.inicial) / (o.meta.alvo - o.meta.inicial)));
  if (o.marcos.length) return o.marcos.filter((m) => m.feito).length / o.marcos.length;
  const ts = tarefas.filter((t) => t.objetivo === o.id);
  return ts.length ? ts.filter((t) => t.status === "done").length / ts.length : null;
}

/** Pace for the date: behind by more than 20 points of the time elapsed = at risk; past the deadline = late. */
export function ritmo(o: Objetivo, tarefas: Tarefa[], hoje: string): Ritmo {
  const a = avanco(o, tarefas) ?? 0;
  if (o.status === "concluido" || a >= 1) return "concluido";
  if (!o.prazo) return "sem_prazo";
  if (hoje > o.prazo) return "atrasado";
  const inicio = o.inicio || o.prazo;
  const total = dias(inicio, o.prazo);
  const esperado = total > 0 ? Math.max(0, Math.min(1, dias(inicio, hoje) / total)) : 0;
  return a < esperado - 0.2 ? "em_risco" : "em_ritmo";
}

/** Weekly check-in due for the owner (none yet counts from the start date). */
export const checkinPendente = (o: Objetivo, hoje: string) =>
  o.status === "ativo" && !!o.responsavel && dias(o.checkins[0]?.data || o.inicio || hoje, hoje) > 7;

/** "3 de 8 retiros", "2 de 5 marcos", "4/9 tarefas". */
export function rotuloAvanco(o: Objetivo, tarefas: Tarefa[], t: { de: string; marcos: string; tarefas: string }) {
  if (o.meta) return `${o.meta.atual} ${t.de} ${o.meta.alvo}${o.meta.unidade ? ` ${o.meta.unidade}` : ""}`;
  if (o.marcos.length) return `${o.marcos.filter((m) => m.feito).length} ${t.de} ${o.marcos.length} ${t.marcos}`;
  const ts = tarefas.filter((x) => x.objetivo === o.id);
  return ts.length ? `${ts.filter((x) => x.status === "done").length}/${ts.length} ${t.tarefas}` : "";
}

// ---------------------------------------------------------------- writers

export type ObjetivoInput = {
  id?: string; titulo: string; descricao: string; projeto: string; equipe: string; apoio: string[]; responsavel: string; inicio: string; prazo: string;
  meta: { inicial: number; alvo: number; atual?: number; unidade: string } | null; marcos: string[];
};

const corpo = (descricao: string, marcos: { texto: string; feito: boolean }[], checkins: string[], titulo: string) =>
  `<!-- agente: nipei-os v2 (objetivo) -->\n# ${titulo}\n\n${descricao.trim()}\n${marcos.length ? `\n## Marcos\n${marcos.map((m) => `- [${m.feito ? "x" : " "}] ${m.texto}`).join("\n")}\n` : ""}${checkins.length ? `\n## Check-ins\n${checkins.join("\n")}\n` : ""}`;

/** Create or update an objective; keeps the check-ins and which milestones were already done (by text). */
export async function salvarObjetivo(input: ObjetivoInput) {
  const { getObjetivos, noteText, setFrontmatter, slugify, today, vault } = await import("./data");
  const { requestSync } = await import("@/lib/tarefaNote");
  const atual = input.id ? getObjetivos().find((o) => o.id === input.id) : undefined;
  if (input.id && !atual) throw new Error("Objetivo não encontrado");
  const ano = Number((input.prazo || today()).slice(0, 4));
  const fm = {
    titulo: input.titulo, ano, equipe: input.equipe, apoio: input.apoio, projeto: input.projeto, responsavel: input.responsavel,
    inicio: input.inicio || atual?.inicio || today(), prazo: input.prazo, status: atual?.status ?? "ativo", dono_confirmado: true,
    meta_inicial: input.meta ? input.meta.inicial : "", meta_alvo: input.meta ? input.meta.alvo : "",
    meta_atual: input.meta ? input.meta.atual ?? atual?.meta?.atual ?? input.meta.inicial : "", meta_unidade: input.meta?.unidade ?? "",
    updated_at: new Date().toISOString(),
  };
  const feitos = new Set(atual?.marcos.filter((m) => m.feito).map((m) => m.texto));
  const marcos = input.marcos.map((texto) => ({ texto, feito: feitos.has(texto) }));
  const checkins = (atual?.checkins ?? []).map((c) => `- ${c.data} · ${c.quem} · ${c.texto}`);
  if (atual) {
    const full = path.join(vault(), atual.file);
    const head = fs.readFileSync(full, "utf-8").match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)?.[0] ?? "";
    fs.writeFileSync(full, setFrontmatter(head + corpo(input.descricao, marcos, checkins, input.titulo), fm), "utf-8");
    requestSync(vault());
    return atual.id;
  }
  const ids = new Set(getObjetivos().map((o) => o.id));
  let id = `obj_${ano}_${slugify(input.titulo).slice(0, 40)}`;
  for (let i = 2; ids.has(id); i++) id = `obj_${ano}_${slugify(input.titulo).slice(0, 40)}_${i}`;
  fs.writeFileSync(path.join(vault(), "Objetivos", `${id}.md`), noteText({ id, type: "objetivo", ...fm }, corpo(input.descricao, marcos, [], input.titulo)), { encoding: "utf-8", flag: "wx" });
  requestSync(vault());
  return id;
}

/** Weekly check-in: new value and/or milestones done, plus a line of what moved. */
export async function checkinObjetivo(id: string, quem: string, c: { valor?: number; marcosFeitos?: number[]; texto: string }) {
  const { getObjetivos, setFrontmatter, today, vault } = await import("./data");
  const { requestSync } = await import("@/lib/tarefaNote");
  const o = getObjetivos().find((x) => x.id === id);
  if (!o) throw new Error("Objetivo não encontrado");
  const marcos = o.marcos.map((m, i) => ({ ...m, feito: c.marcosFeitos ? c.marcosFeitos.includes(i) : m.feito }));
  const partes = [
    o.meta && c.valor != null && c.valor !== o.meta.atual ? `${o.meta.atual} → ${c.valor}${o.meta.unidade ? ` ${o.meta.unidade}` : ""}` : "",
    ...marcos.filter((m, i) => m.feito && !o.marcos[i].feito).map((m) => `✓ ${m.texto}`),
    c.texto.replace(/\s+/g, " ").trim(),
  ].filter(Boolean);
  const linha = `- ${today()} · ${quem} · ${partes.join(" · ") || "sem mudança"}`;
  const full = path.join(vault(), o.file);
  const head = fs.readFileSync(full, "utf-8").match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)?.[0] ?? "";
  const concluiu = (o.meta ? (c.valor ?? o.meta.atual) >= o.meta.alvo && o.meta.alvo > o.meta.inicial : false) || (marcos.length > 0 && marcos.every((m) => m.feito));
  const fm: Record<string, string | number> = { updated_at: new Date().toISOString(), ...(o.meta && c.valor != null ? { meta_atual: c.valor } : {}), ...(concluiu ? { status: "concluido" } : {}) };
  fs.writeFileSync(full, setFrontmatter(head + corpo(o.descricao, marcos, [linha, ...o.checkins.map((x) => `- ${x.data} · ${x.quem} · ${x.texto}`)], o.titulo), fm), "utf-8");
  requestSync(vault());
}

/** Closing keeps the note and its history ("fechado" + reason); reopening is editing the status back. */
export async function fecharObjetivo(id: string, motivo: string, quem: string) {
  const { getObjetivos, updateNote, today } = await import("./data");
  const o = getObjetivos().find((x) => x.id === id);
  if (!o) throw new Error("Objetivo não encontrado");
  updateNote(o.file, { status: "fechado", motivo_fechado: `${today()} · ${quem} · ${motivo.replace(/\s+/g, " ").trim().slice(0, 300) || "fechado"}` });
}

// self-check: npx tsx src/lib/v2/objetivos.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/objetivos.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const base = { id: "o", status: "ativo", inicio: "2026-11-01", prazo: "2026-12-31", meta: null, marcos: [], checkins: [], responsavel: "ana" } as unknown as Objetivo;
  const num = { ...base, meta: { inicial: 0, alvo: 10, atual: 5, unidade: "x" } };
  assert(avanco(num, []) === 0.5, "meta numérica");
  assert(avanco({ ...base, marcos: [{ texto: "a", feito: true }, { texto: "b", feito: false }] }, []) === 0.5, "marcos");
  assert(avanco(base, []) === null, "sem meta nem tarefas");
  assert(ritmo(num, [], "2026-11-20") === "em_ritmo", "50% com 31% do tempo = em ritmo");
  assert(ritmo({ ...num, meta: { ...num.meta, atual: 0 } }, [], "2026-12-15") === "em_risco", "0% com 74% do tempo = em risco");
  assert(ritmo({ ...num, meta: { ...num.meta, atual: 0 } }, [], "2027-01-05") === "atrasado", "passou do prazo");
  assert(ritmo({ ...num, meta: { ...num.meta, atual: 10 } }, [], "2027-01-05") === "concluido", "100% = concluído");
  assert(ritmo({ ...base, prazo: "" }, [], "2026-11-20") === "sem_prazo", "sem prazo");
  assert(checkinPendente(base, "2026-11-09") && !checkinPendente(base, "2026-11-05"), "check-in a cada 7 dias desde o início");
  console.log("objetivos: ok");
}
