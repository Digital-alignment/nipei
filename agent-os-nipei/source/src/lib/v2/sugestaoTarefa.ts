// "Nova tarefa": the Pinu suggests team, priority, due date, owners and project from the title (DS 10.26).
// Nothing is written: the form shows the suggestion and the person applies it. The server keeps only valid ids.
import { chamarIA, contarUso } from "./ia";
import { getEquipes, getPessoas, getTarefas, projetosVisiveis, today, type Me } from "./data";

export type SugestaoTarefa = { equipe: string; prioridade: string; prazo: string; responsaveis: string[]; projeto: string; motivo: string };

const PRIORIDADES = ["baixa", "média", "alta", "urgente"];
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const somar = (dia: string, n: number) => { const d = new Date(`${dia}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

/** Pure: keep only what exists and makes sense (ids from the lists, a date from today to one year, up to 3 owners). */
export function validarSugestao(o: Record<string, unknown>, l: { equipes: string[]; pessoas: string[]; projetos: string[]; hoje: string }): SugestaoTarefa {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const prio = s(o.prioridade).toLowerCase().replace(/^media$/, "média");
  const prazo = s(o.prazo);
  return {
    equipe: l.equipes.includes(s(o.equipe)) ? s(o.equipe) : "",
    prioridade: PRIORIDADES.includes(prio) ? prio : "",
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo) && prazo >= l.hoje && prazo <= somar(l.hoje, 365) ? prazo : "",
    responsaveis: [...new Set((Array.isArray(o.responsaveis) ? o.responsaveis : []).map(s).filter((id) => l.pessoas.includes(id)))].slice(0, 3),
    projeto: l.projetos.includes(s(o.projeto)) ? s(o.projeto) : "",
    motivo: s(o.motivo).slice(0, 120),
  };
}

const SISTEMA = `Você ajuda a criar tarefas no Nipëi OS (Santuário Nipëihu). A partir do título (e da descrição, se houver), sugira:
- "equipe": o id da equipe dona do assunto (pelo propósito e temas);
- "prioridade": baixa | média | alta | urgente (média se nada indicar urgência);
- "prazo": AAAA-MM-DD só se o texto disser quando ("amanhã", "sexta", "até dia 20", "antes do retiro" com data); senão "";
- "responsaveis": até 3 ids de pessoas, só se alguém for claramente a pessoa certa (citada pelo nome, papel ou "referente de"); senão [];
- "projeto": o id do projeto se o assunto for claramente dele; senão "";
- "motivo": por quê, em até 12 palavras, em português (sem ids nem datas).
Use só ids das listas. Responda só com JSON: {"equipe":"","prioridade":"","prazo":"","responsaveis":[],"projeto":"","motivo":""}`;

export async function sugerirTarefa(me: Me, entrada: { titulo: string; descricao?: string; anterior?: string }): Promise<SugestaoTarefa> {
  contarUso(me.username);
  const hoje = today();
  const equipes = getEquipes().filter((e) => !e.contatos);
  const pessoas = getPessoas().filter((p) => !p.externo && !p.contato && p.equipes.length > 0);
  const projetos = projetosVisiveis(me).filter((p) => p.status === "ativo");
  const abertas = new Map<string, number>();
  for (const t of getTarefas()) if (t.status !== "done") for (const r of t.responsaveis) abertas.set(r, (abertas.get(r) ?? 0) + 1);
  const dias = Array.from({ length: 14 }, (_, i) => somar(hoje, i)).map((d) => `${d} ${DIAS[new Date(`${d}T12:00:00Z`).getUTCDay()]}`).join(", ");
  const texto = [
    `Hoje: ${hoje}. Próximos dias: ${dias}.`,
    `Quem cria: ${me.pessoa?.name ?? me.username} (id ${me.pessoa?.id ?? "-"}).`,
    `\nEquipes:\n${equipes.map((e) => `- ${e.id}: ${e.nome}${e.sobre.proposito ? ` — ${e.sobre.proposito.slice(0, 160)}` : ""}${e.temas.length ? ` (temas: ${e.temas.slice(0, 8).join(", ")})` : ""}`).join("\n")}`,
    `\nPessoas:\n${pessoas.map((p) => `- ${p.id}: ${p.name.split(" (")[0]}${p.funcao ? `, ${p.funcao}` : ""} · equipes ${p.equipes.join("/")}${p.referenteDe.length ? ` · referente de ${p.referenteDe.join(", ")}` : ""} · ${abertas.get(p.id) ?? 0} abertas`).join("\n")}`,
    `\nProjetos ativos:\n${projetos.map((p) => `- ${p.id}: ${p.nome}${p.sobre.objetivo ? ` — ${p.sobre.objetivo.slice(0, 120)}` : ""}`).join("\n")}`,
    `\nTítulo: ${entrada.titulo.slice(0, 200)}`,
    entrada.descricao ? `Descrição: ${entrada.descricao.slice(0, 1000)}` : "",
    entrada.anterior ? `\nA pessoa pediu outra sugestão; a anterior foi: ${entrada.anterior.slice(0, 300)}. Proponha algo diferente se fizer sentido.` : "",
  ].filter(Boolean).join("\n");
  const { o } = await chamarIA(SISTEMA, [{ type: "text", text: texto }], 400, 20_000);
  return validarSugestao(o, { equipes: equipes.map((e) => e.id), pessoas: pessoas.map((p) => p.id), projetos: projetos.map((p) => p.id), hoje });
}

const SISTEMA_PEDIDO = `Você ajuda alguém a pedir algo a uma equipe do Santuário Nipëihu. A partir do pedido, sugira:
- "equipe": o id da equipe que deve receber (pelo propósito, pelo que decide, pelo "como pedir" e pelos temas de cada equipe);
- "prazo": AAAA-MM-DD só se o texto disser quando ("amanhã", "sexta", "até dia 20"); senão "";
- "motivo": por quê, em até 12 palavras, em português (sem ids nem datas).
Use só ids da lista. Responda só com JSON: {"equipe":"","prazo":"","motivo":""}`;

// ponytail: per-process daily counter like contarUso (resets on deploy); pedidos are open to everyone, so a lower cap
const LIMITE_PEDIDO = 15;
const usoPedido = new Map<string, { dia: string; n: number }>();

/** Pedido (DS 10.14): only team and due date; the prompt carries the teams, never people. */
export async function sugerirPedido(me: Me, entrada: { titulo: string; descricao?: string; anterior?: string }): Promise<SugestaoTarefa> {
  const hoje = today();
  const u = usoPedido.get(me.username);
  const n = u?.dia === hoje ? u.n : 0;
  if (n >= LIMITE_PEDIDO) throw new Error(`Limite diário de ${LIMITE_PEDIDO} sugestões atingido`);
  usoPedido.set(me.username, { dia: hoje, n: n + 1 });
  const equipes = getEquipes().filter((e) => !e.contatos);
  const dias = Array.from({ length: 14 }, (_, i) => somar(hoje, i)).map((d) => `${d} ${DIAS[new Date(`${d}T12:00:00Z`).getUTCDay()]}`).join(", ");
  const curto = (x: string, n: number) => x.replace(/\s+/g, " ").slice(0, n);
  const texto = [
    `Hoje: ${hoje}. Próximos dias: ${dias}.`,
    `\nEquipes:\n${equipes.map((e) => `- ${e.id}: ${e.nome}${e.sobre.proposito ? ` — propósito: ${curto(e.sobre.proposito, 160)}` : ""}${e.sobre.decide ? ` · decide: ${curto(e.sobre.decide, 120)}` : ""}${e.sobre.comoPedir ? ` · como pedir: ${curto(e.sobre.comoPedir, 120)}` : ""}${e.temas.length ? ` · temas: ${e.temas.slice(0, 8).join(", ")}` : ""}`).join("\n")}`,
    `\nPedido: ${entrada.titulo.slice(0, 200)}`,
    entrada.descricao ? `Detalhes: ${entrada.descricao.slice(0, 1000)}` : "",
    entrada.anterior ? `\nA pessoa pediu outra sugestão; a anterior foi: ${entrada.anterior.slice(0, 300)}. Proponha algo diferente se fizer sentido.` : "",
  ].filter(Boolean).join("\n");
  const { o } = await chamarIA(SISTEMA_PEDIDO, [{ type: "text", text: texto }], 250, 20_000);
  return validarSugestao(o, { equipes: equipes.map((e) => e.id), pessoas: [], projetos: [], hoje });
}

if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/sugestaoTarefa.ts")) {
  let ok = 0;
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); ok++; };
  const l = { equipes: ["equipe_1", "equipe_4"], pessoas: ["jordao", "ana"], projetos: ["casa"], hoje: "2026-11-16" };
  const v = validarSugestao({ equipe: "equipe_4", prioridade: "Alta", prazo: "2026-11-20", responsaveis: ["jordao", "x", "jordao"], projeto: "casa", motivo: "obra" }, l);
  assert(v.equipe === "equipe_4" && v.prioridade === "alta" && v.prazo === "2026-11-20" && v.projeto === "casa", `válida ${JSON.stringify(v)}`);
  assert(v.responsaveis.length === 1 && v.responsaveis[0] === "jordao", "ids desconhecidos e repetidos saem");
  const r = validarSugestao({ equipe: "equipe_9", prioridade: "media", prazo: "2026-11-10", responsaveis: "jordao", projeto: "outro" }, l);
  assert(r.equipe === "" && r.prioridade === "média" && r.prazo === "" && r.responsaveis.length === 0 && r.projeto === "", `inválida ${JSON.stringify(r)}`);
  assert(validarSugestao({ prazo: "2028-01-01" }, l).prazo === "", "prazo além de 1 ano");
  assert(validarSugestao({ responsaveis: ["jordao", "ana", "jordao", "ana"] }, { ...l, pessoas: ["jordao", "ana", "c", "d"] }).responsaveis.length === 2, "sem repetidos");
  assert(validarSugestao({}, l).motivo === "", "vazia");
  console.log(`sugestaoTarefa: ${ok} ok`);
}
