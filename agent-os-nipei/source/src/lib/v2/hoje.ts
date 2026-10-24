import { getEquipes, getEventos, getPessoas, getTarefas, today, type Evento, type Me } from "./data";

// Hoje: today's agenda strip and the team pulse (gestão).

/** Events happening today (a day inside start–end), by time; else the next ones within 3 days. */
export function agendaDoDia(me: Me): { hoje: Evento[]; proximos: Evento[] } {
  const hoje = today();
  const em = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const dias = (e: Evento) => e.inicio.length === 10;
  const relevante = (e: Evento) => me.gestao || !e.equipe || me.equipes.includes(e.equipe);
  const eventos = getEventos().filter((e) => dias(e) && relevante(e));
  const dentro = (e: Evento, d: string) => e.inicio === d || (!!e.fim && e.inicio <= d && d <= e.fim);
  const porHora = (a: Evento, b: Evento) => (a.hora || "99").localeCompare(b.hora || "99");
  return {
    hoje: eventos.filter((e) => dentro(e, hoje)).sort(porHora),
    proximos: eventos.filter((e) => e.inicio > hoje && e.inicio <= em(3)).sort((a, b) => a.inicio.localeCompare(b.inicio) || porHora(a, b)).slice(0, 3),
  };
}

// ---------------------------------------------------------------- Pulso (gestão)

/** Per team: open, overdue and owner-less tasks — the team's health at a glance. */
export function pulso() {
  const hoje = today();
  const abertas = getTarefas().filter((t) => t.status !== "done");
  const equipes = getEquipes();
  const linhas = [...equipes.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor })), { id: "", nome: "", cor: "#a3a3a3" }].map((e) => {
    const ts = abertas.filter((t) => t.equipe === e.id);
    return { ...e, abertas: ts.length, atrasadas: ts.filter((t) => t.prazo && t.prazo < hoje).length, semDono: ts.filter((t) => !t.responsaveis.length).length };
  }).filter((l) => l.abertas > 0);
  return {
    linhas,
    atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length,
    semDono: abertas.filter((t) => !t.responsaveis.length).length,
    abertas: abertas.length,
    pessoas: getPessoas().filter((p) => p.equipes.length),
  };
}
