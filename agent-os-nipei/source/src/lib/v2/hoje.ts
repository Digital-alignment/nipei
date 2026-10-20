import fs from "fs";
import path from "path";
import { chamarIATexto, contarUso } from "./ia";
import { getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, vault, type Evento, type Me } from "./data";

// Hoje: today's agenda strip, the daily "Bom dia" summary and the team pulse (gestão).

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

// ---------------------------------------------------------------- Bom dia

// ponytail: cached per person per day in .jobs/ (gitignored, so 7 people × 365 days don't land in git).
const ARQ = (pessoa: string, dia: string) => path.join(vault(), ".jobs", "bomdia", `${pessoa.replace(/[^a-zA-Z0-9_-]/g, "_")}-${dia}-v2.txt`);

export function bomDiaGuardado(me: Me): string | null {
  if (!me.pessoa) return null;
  const f = ARQ(me.pessoa.id, today());
  return fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : null;
}

const SISTEMA = (lang: string) => `Você escreve a linha de abertura do dia de uma pessoa da equipe do Nipëi: UMA frase curta, no máximo 18 palavras, em ${lang === "en" ? "inglês" : "português do Brasil"}, tom caloroso e direto.
Diga só o que mais importa hoje (um compromisso, ou quantas tarefas estão atrasadas e a mais importante pelo título curto). Sem saudação, sem nome da pessoa (o título já cumprimenta), sem "Bom dia", sem listas, sem emojis. Use só o contexto.`;

/** Today's summary for this person (generated once a day, then read from the cache). */
export async function gerarBomDia(me: Me, lang: string): Promise<string> {
  const p = me.pessoa;
  if (!p) return "";
  const guardado = bomDiaGuardado(me);
  if (guardado) return guardado;
  contarUso(p.id);
  const hoje = today();
  const minhas = getTarefas().filter((t) => t.status !== "done" && t.responsaveis.includes(p.id));
  const { hoje: eventos, proximos } = agendaDoDia(me);
  const contexto = [
    `Pessoa: ${p.name.split(" (")[0]} · hoje ${hoje}`,
    `Compromissos hoje: ${eventos.map((e) => `${e.hora ? `${e.hora} ` : ""}${e.titulo}`).join("; ") || "nenhum"}`,
    `Próximos dias: ${proximos.map((e) => `${e.inicio} ${e.titulo}`).join("; ") || "nada"}`,
    `Atrasadas (${minhas.filter((t) => t.prazo && t.prazo < hoje).length}): ${minhas.filter((t) => t.prazo && t.prazo < hoje).slice(0, 4).map((t) => t.title).join("; ") || "-"}`,
    `Vencem hoje: ${minhas.filter((t) => t.prazo === hoje).map((t) => t.title).join("; ") || "-"}`,
    `Sem data: ${minhas.filter((t) => !t.prazo).length}`,
    `Novidades: ${novidadesPara(me, 2, 4).map((n) => `${n.quem} em "${n.titulo}"`).join("; ") || "-"}`,
  ].join("\n");
  const texto = (await chamarIATexto(SISTEMA(lang), [{ type: "text", text: contexto }], 1500, 40_000)).replace(/\s+/g, " ").trim().slice(0, 200);
  const f = ARQ(p.id, hoje);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, texto, "utf-8");
  return texto;
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
