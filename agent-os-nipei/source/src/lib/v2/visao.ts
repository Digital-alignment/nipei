import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIATexto } from "./ia";
import { buscarConhecimento, formatarConhecimento, getFatos } from "./conhecimento";
import { getColetivo, getDiagnosticos, getRespostas, lancamentosDoPeriodo, participantes, resumoFinanceiro, secoesColetivas, type Diagnostico } from "./diagnostico";
import { getEquipes, getEventos, getObjetivos, getPessoas, getProjetos, getTarefas, progresso, today, vault } from "./data";

// D5 — holistic view of a project: live platform data (teams, objectives, tasks, events, finances,
// confirmed knowledge) + what its latest assessment produced (consolidated reports, code of agreements,
// improvements, marketing calendar) + an AI synthesis kept in Projetos/_visao/<projeto>.md.

const ARQ = (projetoId: string) => path.join(vault(), "Projetos", "_visao", `${projetoId.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`);

/** Everything the page shows, computed from the vault (no AI). */
export function coletarVisao(projetoId: string) {
  const projeto = getProjetos().find((p) => p.id === projetoId);
  if (!projeto) return null;
  const hoje = today();
  const tarefas = getTarefas().filter((t) => t.projeto === projetoId);
  const abertas = tarefas.filter((t) => t.status !== "done");
  const equipes = getEquipes().filter((e) => projeto.equipes.includes(e.id) || tarefas.some((t) => t.equipe === e.id));
  const pessoas = getPessoas();
  const objetivos = getObjetivos().filter((o) => o.projeto === projetoId).map((o) => ({ ...o, progresso: progresso(o.id, getTarefas()) }));
  const eventos = getEventos().filter((e) => e.inicio >= hoje.slice(0, 7)).slice(0, 6);
  const fatos = getFatos().filter((f) => f.status === "confirmado" && f.projetos.includes(projetoId));
  const diag: Diagnostico | null = getDiagnosticos().filter((d) => d.projeto === projetoId).sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;
  const c = diag ? getColetivo(diag.id) : null;
  return {
    projeto, equipes, objetivos, eventos, fatos, diag, coletivo: c,
    tarefas: {
      abertas: abertas.length, atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length, semDono: abertas.filter((t) => !t.responsaveis.length).length,
      concluidas: tarefas.length - abertas.length, total: tarefas.length,
    },
    membros: pessoas.filter((p) => p.equipes.some((e) => equipes.some((x) => x.id === e))).length,
    financas: c && diag ? resumoFinanceiro(lancamentosDoPeriodo(diag, c.periodo)) : null,
    melhorias: c ? Object.values(c.itens).flat() : [],
    proximasAcoes: c ? c.calendario.entradas.filter((e) => e.data >= hoje).slice(0, 5) : [],
  };
}

export type Visao = NonNullable<ReturnType<typeof coletarVisao>>;

export function getSintese(projetoId: string): { texto: string; geradaEm: string } | null {
  const abs = ARQ(projetoId);
  if (!fs.existsSync(abs)) return null;
  const m = fs.readFileSync(abs, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = (m && (yaml.load(m[1]) as Record<string, unknown>)) || {};
  return { texto: (m?.[2] ?? "").replace(/^<!--[\s\S]*?-->\s*/, "").trim(), geradaEm: String(fm.gerada_em ?? "") };
}

const SISTEMA = `Você escreve a visão holística de um projeto do Nipëi (Santuário Nipeihu, povo Yawanawá; Inirau; outros), para a gestão e a Lynn. Português do Brasil, markdown.
Seções, nesta ordem: "## Propósito e valores", "## Pessoas e papéis", "## Como operamos", "## Finanças", "## Comunicação e marketing", "## Espaço e experiência", "## Objetivos e andamento", "## Riscos e lacunas", "## Próximos 90 dias".
Em cada uma: 2 a 5 frases ou tópicos concretos, com números quando houver. Diga claramente o que ainda não se sabe. Use só o contexto; nada de frases genéricas.
Responda só com o markdown.`;

/** AI synthesis from the collected data and the latest assessment's answers. */
export async function gerarSintese(projetoId: string): Promise<string> {
  const v = coletarVisao(projetoId);
  if (!v) throw new Error("Projeto não encontrado");
  const c = v.coletivo, d = v.diag;
  const base = buscarConhecimento(`${v.projeto.nome} ${v.projeto.descricao}`, { projetos: [projetoId], limite: 30, minimo: 0.1 });
  const visaoIndividual = d ? participantes(d).flatMap((p) => {
    const r = getRespostas(d.id, p.id);
    return Object.entries(r).filter(([k, x]) => k.startsWith("visao.") && x.texto).map(([k, x]) => `- [${k}] ${x.texto.slice(0, 500)}`);
  }) : [];
  const coletivas = d && c ? secoesColetivas(d).flatMap((sec) => sec.perguntas.filter((q) => c.respostas[q.id]?.texto).map((q) => `- [${sec.titulo}] ${q.texto}: ${c.respostas[q.id].texto.slice(0, 500)}`)) : [];
  const contexto = [
    `# ${v.projeto.nome}\n${v.projeto.descricao}`, `Hoje: ${today()}`,
    `Equipes: ${v.equipes.map((e) => e.nome).join(", ")} · ${v.membros} pessoas`,
    `Tarefas: ${v.tarefas.abertas} abertas (${v.tarefas.atrasadas} atrasadas, ${v.tarefas.semDono} sem responsável), ${v.tarefas.concluidas} concluídas`,
    "## Objetivos", ...v.objetivos.map((o) => `- ${o.ano}: ${o.titulo}${o.progresso ? ` (${o.progresso.done}/${o.progresso.total} tarefas)` : " (sem tarefas ligadas)"}`),
    "## Próximos eventos", ...v.eventos.map((e) => `- ${e.inicio}: ${e.titulo} (${e.status})`),
    v.projeto.atualizacoes.length ? `## Atualizações do projeto\n${v.projeto.atualizacoes.slice(0, 10).map((a) => `- ${a}`).join("\n")}` : "",
    "## Base de conhecimento confirmada", base.length ? formatarConhecimento(base) : "(nada)",
    v.financas?.n ? `## Finanças do período\nEntradas ${v.financas.totalEntradas} · Despesas ${v.financas.totalDespesas} · Resultado ${v.financas.resultado}` : "## Finanças: sem lançamentos no período",
    v.melhorias.length ? `## Melhorias do espaço\n${v.melhorias.map((i) => `- ${i.titulo} (${i.prioridade}${i.custo ? `, R$ ${i.custo}` : ""})`).join("\n")}` : "",
    c?.consolidados.retiro?.texto ? `## Relatório consolidado do retiro\n${c.consolidados.retiro.texto.slice(0, 6000)}` : "",
    c?.consolidados.matriz?.texto ? `## Matriz de responsabilidades\n${c.consolidados.matriz.texto.slice(0, 5000)}` : "",
    c?.codigo.texto ? `## Código de acordos (v${c.codigo.versao})\n${c.codigo.texto.slice(0, 4000)}` : "",
    coletivas.length ? `## Respostas coletivas do diagnóstico\n${coletivas.join("\n")}` : "",
    visaoIndividual.length ? `## Visão de cada integrante\n${visaoIndividual.join("\n")}` : "",
  ].filter(Boolean).join("\n");
  const texto = await chamarIATexto(SISTEMA, [{ type: "text", text: contexto }], 5000, 180_000);
  const abs = ARQ(projetoId);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\n${yaml.dump({ type: "visao_projeto", projeto: projetoId, gerada_em: new Date().toISOString(), diagnostico: d?.id ?? "" })}---\n<!-- agente: nipei-os v2 (visão D5) -->\n${texto}\n`, "utf-8");
  requestSync(vault());
  return texto;
}
