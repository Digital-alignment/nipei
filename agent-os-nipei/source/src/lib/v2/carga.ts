import type { Pessoa, Tarefa } from "./data";

// Load balancing for a team: who is overloaded, who has room, and concrete moves (task → person).
// Deterministic, no AI. Nothing is applied here: each suggestion is a button the coordinator presses.
//   overloaded: open tasks ≥ max(average × 1.5, average + 3), or ≥ 3 overdue
//   room:       open tasks ≤ average × 0.6
//   moves:      from the overloaded, tasks they own ALONE and haven't started (overdue first, then the
//               nearest due date; never urgent ones) → the lightest person, same área when possible;
//               owner-less tasks → the lightest people. Counts update after each move.

export type Carga = { id: string; abertas: number; atrasadas: number; estado: "sobrecarga" | "folga" | "ok" };
export type Sugestao = { tarefa: string; de: string; para: string; motivo: "sobrecarga" | "semDono" };

const MAX_POR_PESSOA = 3, MAX_SEM_DONO = 5, MAX_TOTAL = 10;

export function balancear(tarefas: Tarefa[], membros: Pessoa[], hoje: string) {
  const abertas = tarefas.filter((t) => t.status !== "done");
  const conta = new Map(membros.map((p) => [p.id, abertas.filter((t) => t.responsaveis.includes(p.id)).length]));
  const media = membros.length ? [...conta.values()].reduce((a, b) => a + b, 0) / membros.length : 0;
  const limite = Math.max(media * 1.5, media + 3);
  const cargas: Carga[] = membros.map((p) => {
    const n = conta.get(p.id)!, atr = abertas.filter((t) => t.responsaveis.includes(p.id) && t.prazo && t.prazo < hoje).length;
    return { id: p.id, abertas: n, atrasadas: atr, estado: n >= limite && n > 0 || atr >= 3 ? "sobrecarga" : n <= media * 0.6 ? "folga" : "ok" };
  });
  const sobre = new Set(cargas.filter((c) => c.estado === "sobrecarga").map((c) => c.id));
  const leve = (area: string, exceto: string) => membros.filter((p) => p.id !== exceto && !sobre.has(p.id))
    .sort((a, b) => Number(!!area && b.area === area) - Number(!!area && a.area === area) || conta.get(a.id)! - conta.get(b.id)!)
    .find((p) => conta.get(p.id)! < media || conta.get(p.id)! === 0);
  const sugestoes: Sugestao[] = [];
  const mover = (t: Tarefa, de: string, motivo: Sugestao["motivo"]) => {
    const para = leve(t.area, de);
    if (!para) return false;
    sugestoes.push({ tarefa: t.id, de, para: para.id, motivo });
    conta.set(para.id, conta.get(para.id)! + 1);
    if (de) conta.set(de, conta.get(de)! - 1);
    return true;
  };
  for (const c of [...cargas].filter((c) => sobre.has(c.id)).sort((a, b) => b.abertas - a.abertas)) {
    const candidatas = abertas.filter((t) => t.responsaveis.length === 1 && t.responsaveis[0] === c.id && t.status !== "doing" && t.priority !== "urgente")
      .sort((a, b) => Number(!!b.prazo && b.prazo < hoje) - Number(!!a.prazo && a.prazo < hoje) || (a.prazo || "9999").localeCompare(b.prazo || "9999"));
    let n = 0;
    for (const t of candidatas) {
      if (n >= MAX_POR_PESSOA || conta.get(c.id)! <= media) break;
      if (mover(t, c.id, "sobrecarga")) n++; else break;
    }
  }
  const semDono = abertas.filter((t) => !t.responsaveis.length).sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999"));
  for (const t of semDono.slice(0, MAX_SEM_DONO)) if (!mover(t, "", "semDono")) break;
  return { cargas, media, sugestoes: sugestoes.slice(0, MAX_TOTAL) };
}

/** Self-check: node --experimental-strip-types src/lib/v2/carga.ts */
if (typeof process !== "undefined" && process.argv[1]?.endsWith("carga.ts")) {
  const base = { file: "", title: "", status: "todo", statusRaw: "", prazo: "", priority: "média", equipe: "e", area: "", projeto: "", objetivo: "", responsaveis: [], responsible: "", checklist: { feitos: 0, total: 0 }, anexos: 0, recorrencia: "", atualizadoEm: "", concluidoEm: "" } as unknown as Tarefa;
  const t = (id: string, o: Partial<Tarefa>): Tarefa => ({ ...base, id, ...o });
  const p = (id: string, area = "") => ({ id, area } as Pessoa);
  const ts = [
    ...Array.from({ length: 10 }, (_, i) => t(`a${i}`, { responsaveis: ["ana"], prazo: i < 2 ? "2026-10-01" : "2026-12-01" })),
    t("urg", { responsaveis: ["ana"], priority: "urgente", prazo: "2026-09-01" }),
    t("doing", { responsaveis: ["ana"], status: "doing" }),
    t("dupla", { responsaveis: ["ana", "bia"] }),
    t("b1", { responsaveis: ["bia"] }), t("b2", { responsaveis: ["bia"] }),
    t("solta", {}),
  ];
  const r = balancear(ts, [p("ana"), p("bia"), p("caio")], "2026-10-20");
  const ok = (c: boolean, m: string) => { if (!c) { console.error("FALHOU:", m, JSON.stringify(r, null, 1)); process.exit(1); } };
  ok(r.cargas.find((c) => c.id === "ana")!.estado === "sobrecarga", "ana sobrecarregada");
  ok(r.cargas.find((c) => c.id === "caio")!.estado === "folga", "caio com folga");
  const daAna = r.sugestoes.filter((s) => s.de === "ana");
  ok(daAna.length === 3, "no máximo 3 da ana");
  ok(daAna[0].tarefa === "a0" && daAna[1].tarefa === "a1", "atrasadas primeiro");
  ok(!r.sugestoes.some((s) => ["urg", "doing", "dupla"].includes(s.tarefa)), "nunca urgente, em andamento ou dividida");
  ok(daAna.every((s) => s.para !== "ana"), "não move para si");
  ok(r.sugestoes.some((s) => s.tarefa === "solta" && s.de === ""), "sem dono recebe alguém");
  ok(balancear([], [], "2026-10-20").sugestoes.length === 0, "vazio");
  console.log("carga ok", r.sugestoes.map((s) => `${s.tarefa}:${s.de || "∅"}→${s.para}`).join(" "));
}
