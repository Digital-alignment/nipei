import type { Equipe, Pessoa, Tarefa } from "./data";

// Pedidos à equipe (DS 10.14) and team health (DS 10.15). Pure helpers + the WhatsApp to the coordination.

/** Open requests a team still has to pick an owner for. */
export const pedidosNovos = (tarefas: Tarefa[], equipe: string) =>
  tarefas.filter((t) => t.equipe === equipe && t.pedidoPor && !t.responsaveis.length && t.status !== "done")
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

/** Who gets the WhatsApp when a request arrives: the team's coordination, same filters as the other notices. */
export function avisadosPedido(e: Equipe, pessoas: Pessoa[], quemPediu: string) {
  return pessoas.filter((p) => e.coordenadores.includes(p.id) && p.id !== quemPediu && p.whatsapp && p.whatsappVerificado && p.avisosWhatsapp && !p.suspenso && !p.contato);
}

export async function avisarPedido(e: Equipe, t: { id: string; titulo: string; prazo: string }, quem: { id: string; nome: string }) {
  if (process.env.NODE_ENV !== "production") return; // npm run dev has the real Evolution keys: never send from there
  const { getPessoas } = await import("./data");
  const { enviarWhatsApp } = await import("./whatsapp");
  const texto = `Novo pedido para ${e.nome}, de ${quem.nome.split(/[\s(]/)[0]}: "${t.titulo}"${t.prazo ? ` (até ${t.prazo.split("-").reverse().join("/")})` : ""}. Escolha quem faz: https://os.nipeihu.app/equipes/${e.id}?aba=pedidos`;
  await Promise.all(avisadosPedido(e, getPessoas(), quem.id).map((p) => enviarWhatsApp(p.whatsapp, texto).catch(() => false)));
}

// ---------------------------------------------------------------- health: % done on time per week

const semana = (dia: string) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

/** Last `n` weeks (Monday-based, oldest first): % of tasks done that week with a due date that were done by it. null = none. */
export function noPrazoSemanas(tarefas: Tarefa[], equipe: string, hoje: string, n = 8): (number | null)[] {
  const fim = semana(hoje);
  const semanas = Array.from({ length: n }, (_, i) => new Date(Date.parse(`${fim}T12:00:00Z`) - (n - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10));
  return semanas.map((w) => {
    const ts = tarefas.filter((t) => t.equipe === equipe && t.prazo && t.concluidoEm && !t.pedidoRecusado && semana(t.concluidoEm.slice(0, 10)) === w);
    return ts.length ? Math.round((ts.filter((t) => t.concluidoEm.slice(0, 10) <= t.prazo).length / ts.length) * 100) : null;
  });
}

/** Trend from the weeks with data: last half vs first half (±10 points = steady). */
export function tendencia(pontos: (number | null)[]): "melhorando" | "estavel" | "caindo" | null {
  const v = pontos.filter((x): x is number => x != null);
  if (v.length < 2) return null;
  const meio = Math.floor(v.length / 2), media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const d = media(v.slice(meio)) - media(v.slice(0, meio));
  return d > 10 ? "melhorando" : d < -10 ? "caindo" : "estavel";
}

// self-check: npx tsx src/lib/v2/pedidos.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/pedidos.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const t = (o: Partial<Tarefa>) => ({ equipe: "e1", prazo: "", concluidoEm: "", pedidoRecusado: "", pedidoPor: "", responsaveis: [], status: "todo", criadoEm: "", ...o }) as Tarefa;
  assert(semana("2026-11-05") === "2026-11-02" && semana("2026-11-08") === "2026-11-02", "semana começa na segunda");
  const ts = [
    t({ prazo: "2026-11-03", concluidoEm: "2026-11-03T10:00" }), t({ prazo: "2026-11-03", concluidoEm: "2026-11-04T10:00" }), // this week: 50%
    t({ prazo: "2026-10-28", concluidoEm: "2026-10-27T10:00" }), // last week: 100%
    t({ prazo: "2026-11-03", concluidoEm: "2026-11-04T10:00", equipe: "e2" }), // other team
    t({ prazo: "2026-11-01", concluidoEm: "2026-11-04T10:00", pedidoRecusado: "não é conosco" }), // refused: ignored
  ];
  const p = noPrazoSemanas(ts, "e1", "2026-11-05");
  assert(p.length === 8 && p[7] === 50 && p[6] === 100 && p[0] === null, `semanas: ${p}`);
  assert(tendencia(p) === "caindo" && tendencia([null, 80]) === null && tendencia([50, 55]) === "estavel", "tendência");
  const novos = pedidosNovos([t({ pedidoPor: "ana" }), t({ pedidoPor: "ana", responsaveis: ["bia"] }), t({ pedidoPor: "ana", status: "done" }), t({})], "e1");
  assert(novos.length === 1, "pedidos novos = sem responsável e abertos");
  console.log("pedidos: ok");
}
