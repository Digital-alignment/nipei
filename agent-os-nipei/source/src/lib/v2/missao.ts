// "Missão da semana": a team mission with measurable goals, computed live from the platform's own data
// (no manual ticking). The current mission is a constant; the next one replaces it.
// ponytail: one mission in code; move to a vault note (Missoes/<id>.md) when gestão wants to edit them in the app.

export type Missao = {
  id: string; titulo: string; titulo_en: string; equipe: string; inicio: string; fim: string;
  /** starting values measured on day one (20/10, the app's own numbers) */
  base: { fatos: number; semDono: number; semEquipe: number; atrasadas: number };
  cargaMax: number; fontesPorPessoa: number;
};

export const MISSAO: Missao = {
  id: "equipe1-2026-10", titulo: "Completar os buracos de informação e organizar tudo", titulo_en: "Fill the information gaps and organise everything",
  equipe: "equipe_1", inicio: "2026-10-20", fim: "2026-10-27",
  base: { fatos: 87, semDono: 107, semEquipe: 34, atrasadas: 35 },
  cargaMax: 20, fontesPorPessoa: 3,
};

export type Entrada = {
  membros: { id: string; perfilOk: boolean; abertas: number; diagnosticoOk: boolean }[];
  fatosPropostos: number; fontesNovas: number; semDono: number; semEquipe: number; atrasadas: number;
  objetivos: { total: number; comDono: number };
};
export type Meta = { id: "perfis" | "fatos" | "fontes" | "tarefas" | "atrasadas" | "carga" | "objetivos" | "diagnostico"; atual: number; alvo: number; pct: number; texto: string };

const pct = (x: number) => Math.max(0, Math.min(100, Math.round(x * 100)));
/** "from base down to 0" goals: progress = how much of the starting pile is gone */
const reduzir = (base: number, atual: number) => (base <= 0 ? (atual <= 0 ? 100 : 0) : pct((base - atual) / base));

export function calcularMissao(m: Missao, e: Entrada, hoje: string) {
  const n = e.membros.length || 1;
  const metas: Meta[] = [
    { id: "perfis", atual: e.membros.filter((x) => x.perfilOk).length, alvo: n, pct: 0, texto: "" },
    { id: "fatos", atual: e.fatosPropostos, alvo: 0, pct: reduzir(m.base.fatos, e.fatosPropostos), texto: `${m.base.fatos} → ${e.fatosPropostos}` },
    { id: "fontes", atual: e.fontesNovas, alvo: n * m.fontesPorPessoa, pct: 0, texto: "" },
    { id: "tarefas", atual: e.semDono + e.semEquipe, alvo: 0, pct: reduzir(m.base.semDono + m.base.semEquipe, e.semDono + e.semEquipe), texto: `${e.semDono} / ${e.semEquipe}` },
    { id: "atrasadas", atual: e.atrasadas, alvo: 0, pct: reduzir(m.base.atrasadas, e.atrasadas), texto: `${m.base.atrasadas} → ${e.atrasadas}` },
    { id: "carga", atual: e.membros.filter((x) => x.abertas <= m.cargaMax).length, alvo: n, pct: 0, texto: "" },
    { id: "objetivos", atual: e.objetivos.comDono, alvo: e.objetivos.total, pct: 0, texto: "" },
    { id: "diagnostico", atual: e.membros.filter((x) => x.diagnosticoOk).length, alvo: n, pct: 0, texto: "" },
  ];
  for (const x of metas) if (x.alvo > 0) { x.pct = pct(x.atual / x.alvo); x.texto = `${x.atual} / ${x.alvo}`; }
  const dia = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
  return {
    metas,
    total: Math.round(metas.reduce((a, x) => a + x.pct, 0) / metas.length),
    diasRestantes: Math.max(0, Math.round((dia(m.fim) - dia(hoje)) / 86_400_000)),
    ativa: hoje >= m.inicio && hoje <= new Date(dia(m.fim) + 3 * 86_400_000).toISOString().slice(0, 10), // stays 3 days after, for the review
  };
}

/** Self-check: node --experimental-strip-types src/lib/v2/missao.ts */
if (typeof process !== "undefined" && process.argv[1]?.endsWith("missao.ts")) {
  const ok = (c: boolean, msg: string) => { if (!c) { console.error("FALHOU:", msg); process.exit(1); } };
  const membros = [
    { id: "a", perfilOk: true, abertas: 48, diagnosticoOk: false },
    { id: "b", perfilOk: false, abertas: 5, diagnosticoOk: true },
  ];
  const dia1 = calcularMissao(MISSAO, { membros, fatosPropostos: 87, fontesNovas: 0, semDono: 107, semEquipe: 34, atrasadas: 35, objetivos: { total: 13, comDono: 8 } }, "2026-10-20");
  const g = (r: typeof dia1, id: Meta["id"]) => r.metas.find((x) => x.id === id)!;
  ok(g(dia1, "fatos").pct === 0 && g(dia1, "tarefas").pct === 0 && g(dia1, "atrasadas").pct === 0, "no dia 1 as pilhas começam em 0%");
  ok(g(dia1, "perfis").pct === 50 && g(dia1, "carga").pct === 50 && g(dia1, "objetivos").pct === 62, "contagens por pessoa / objetivos");
  ok(g(dia1, "fontes").alvo === 6, "3 fontes por pessoa");
  ok(dia1.diasRestantes === 7 && dia1.ativa, "7 dias, ativa");
  const fim = calcularMissao(MISSAO, { membros: membros.map((x) => ({ ...x, perfilOk: true, abertas: 10, diagnosticoOk: true })), fatosPropostos: 0, fontesNovas: 9, semDono: 0, semEquipe: 0, atrasadas: 0, objetivos: { total: 13, comDono: 13 } }, "2026-10-27");
  ok(fim.total === 100 && fim.diasRestantes === 0, "tudo cumprido = 100%");
  ok(g(calcularMissao(MISSAO, { membros, fatosPropostos: 120, fontesNovas: 0, semDono: 0, semEquipe: 0, atrasadas: 0, objetivos: { total: 0, comDono: 0 } }, "2026-10-20"), "fatos").pct === 0, "pilha maior que a base não fica negativa");
  ok(!calcularMissao(MISSAO, { membros, fatosPropostos: 0, fontesNovas: 0, semDono: 0, semEquipe: 0, atrasadas: 0, objetivos: { total: 0, comDono: 0 } }, "2026-10-31").ativa, "some 3 dias depois do fim");
  console.log("missao ok", dia1.total + "%");
}
