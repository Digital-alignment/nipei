import fs from "fs";
import path from "path";
import { chamarIA } from "./ia";
import { diagnosticosAbertos, getRespostas, participa, progresso, secoesIndividuais } from "./diagnostico";
import { participacao, type Participacao } from "./participacao";
import { getAcessos, getEquipes, getPessoas, getTarefas, readDir, today, vault, type Pessoa, type Tarefa } from "./data";

// Numbers for Pessoas (list and profile), the Participação indicator and the AI study (gestão).

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const primeiro = (n: string) => norm(n.split(/[\s(]/)[0] ?? "");
const menos = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

/** Days of each person's own entries in task activity logs ("- 2026-10-20 09:15 · Jordão · …"). */
function acoesPorPessoa(pessoas: Pessoa[]): Map<string, string[]> {
  const porNome = new Map<string, string>();
  for (const p of pessoas) if (!porNome.has(primeiro(p.name))) porNome.set(primeiro(p.name), p.id);
  const out = new Map<string, string[]>();
  for (const { body } of readDir(path.join("Productivity", "Tarefas"))) {
    const log = body.match(/## Atividade\r?\n([\s\S]*?)(?=\r?\n## |$)/)?.[1] ?? "";
    for (const m of log.matchAll(/^- (\d{4}-\d{2}-\d{2}) \d{2}:\d{2} · ([^·]+) · /gm)) {
      const id = porNome.get(primeiro(m[2]));
      if (id) out.set(id, [...(out.get(id) ?? []), m[1]]);
    }
  }
  return out;
}

export type Numeros = { abertas: number; atrasadas: number; feitas30: number; ultimoUso: string };

export function numerosDe(p: Pessoa, tarefas: Tarefa[], acessos: Record<string, string>, hoje = today()): Numeros {
  const minhas = tarefas.filter((t) => t.responsaveis.includes(p.id));
  const abertas = minhas.filter((t) => t.status !== "done");
  return {
    abertas: abertas.length,
    atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length,
    feitas30: minhas.filter((t) => t.concluidoEm && t.concluidoEm.slice(0, 10) > menos(hoje, 30)).length,
    ultimoUso: acessos[p.id] ?? "",
  };
}

/** Numbers for everyone (+ Participação when asked: gestão only). */
export function resumoPessoas(comParticipacao: boolean) {
  const hoje = today();
  const pessoas = getPessoas(), tarefas = getTarefas(), acessos = getAcessos();
  const acoes = comParticipacao ? acoesPorPessoa(pessoas) : new Map<string, string[]>();
  const out = new Map<string, Numeros & { participacao?: Participacao }>();
  for (const p of pessoas) {
    const n = numerosDe(p, tarefas, acessos, hoje);
    if (!comParticipacao) { out.set(p.id, n); continue; }
    const diag = diagnosticosAbertos(p)[0];
    const pr = diag ? progresso(diag, p.id) : null;
    out.set(p.id, { ...n, participacao: participacao(p, { tarefas, acoes: acoes.get(p.id) ?? [], ultimoUso: acessos[p.id] ?? "", diagnostico: pr ? pr.respondidas / pr.total : 0 }, hoje) });
  }
  return out;
}

// ---------------------------------------------------------------- AI study (gestão)
// .jobs/estudos/<pessoa>.json — private, outside git; regenerated on request.

export type Estudo = { texto: string; sugestoes: { tarefa: string; motivo: string }[]; geradoEm: string };
const ARQ = (id: string) => path.join(vault(), ".jobs", "estudos", `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

export function getEstudo(id: string): Estudo | null {
  try { return JSON.parse(fs.readFileSync(ARQ(id), "utf-8")); } catch { return null; }
}

const SISTEMA = `Você ajuda a gestão do Nipëi (Santuário Nipeihu, povo Yawanawá) a entender uma pessoa da equipe e distribuir melhor o trabalho. Português do Brasil.
Com base só no contexto, escreva em "texto" (markdown curto, até 180 palavras) com estas partes: **Pontos fortes**, **Carga atual**, **Riscos** (sobrecarga, tarefas paradas, pouco uso da plataforma) e **Como apoiar**.
Seja respeitoso e concreto; não julgue a pessoa, descreva o trabalho. Se faltar informação, diga.
Em "sugestoes", até 5 tarefas SEM responsável da lista que combinam com essa pessoa (use o id exato), cada uma com o motivo em uma frase. Não sugira se ela já estiver sobrecarregada (muitas atrasadas): diga isso no texto.
Responda APENAS com JSON: {"texto": string, "sugestoes": [{"tarefa": id, "motivo": string}]}`;

export async function gerarEstudo(pessoaId: string): Promise<Estudo> {
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p) throw new Error("Pessoa não encontrada");
  const hoje = today();
  const tarefas = getTarefas();
  const equipes = getEquipes();
  const r = resumoPessoas(true).get(p.id)!;
  const minhas = tarefas.filter((t) => t.responsaveis.includes(p.id));
  const semDono = tarefas.filter((t) => t.status !== "done" && !t.responsaveis.length)
    .sort((a, b) => Number(p.equipes.includes(b.equipe)) - Number(p.equipes.includes(a.equipe)) || (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""))
    .slice(0, 40);
  const diag = diagnosticosAbertos(p).find((d) => participa(d, p));
  const papel = diag ? (() => {
    const resp = getRespostas(diag.id, p.id);
    return secoesIndividuais(diag).filter((s) => s.id === "papel").flatMap((s) => s.perguntas.filter((q) => resp[q.id]?.texto).map((q) => `- ${q.texto}: ${resp[q.id].texto.slice(0, 600)}`));
  })() : [];
  const contexto = [
    `# ${p.name} — hoje ${hoje}`,
    `Função: ${p.funcao || "-"} · Área: ${p.area || "-"} · Disponibilidade: ${p.disponibilidade || "-"}`,
    `Equipes: ${p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e).join(", ") || "-"}${p.coordena.length ? ` · coordena: ${p.coordena.join(", ")}` : ""}`,
    `Números: ${r.abertas} abertas, ${r.atrasadas} atrasadas, ${r.feitas30} concluídas em 30 dias, último uso ${r.ultimoUso || "nunca registrado"}`,
    r.participacao ? `Participação: ${r.participacao.total ?? "dados insuficientes"} (${JSON.stringify(r.participacao.partes)})` : "",
    "## Tarefas abertas", ...minhas.filter((t) => t.status !== "done").slice(0, 40).map((t) => `- ${t.title} [${t.statusRaw || "A fazer"}${t.prazo ? `, ${t.prazo}` : ""}]`),
    "## Concluídas", ...minhas.filter((t) => t.status === "done").slice(0, 25).map((t) => `- ${t.title}`),
    papel.length ? `## Como a pessoa descreve o próprio papel (diagnóstico)\n${papel.join("\n")}` : "",
    "## Tarefas sem responsável (candidatas)", ...semDono.map((t) => `- ${t.id}: ${t.title} [${equipes.find((e) => e.id === t.equipe)?.nome ?? "sem equipe"}${t.prazo ? `, ${t.prazo}` : ""}]`),
  ].filter(Boolean).join("\n");
  const { o } = await chamarIA(SISTEMA, [{ type: "text", text: contexto }], 2500, 90_000);
  const ids = new Set(semDono.map((t) => t.id));
  const estudo: Estudo = {
    texto: String(o.texto ?? "").trim(),
    sugestoes: (Array.isArray(o.sugestoes) ? o.sugestoes : []).map((x: Record<string, unknown>) => ({ tarefa: String(x.tarefa ?? ""), motivo: String(x.motivo ?? "").slice(0, 200) }))
      .filter((x: { tarefa: string }) => ids.has(x.tarefa)).slice(0, 5),
    geradoEm: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(ARQ(p.id)), { recursive: true });
  fs.writeFileSync(ARQ(p.id), JSON.stringify(estudo), "utf-8");
  return estudo;
}
