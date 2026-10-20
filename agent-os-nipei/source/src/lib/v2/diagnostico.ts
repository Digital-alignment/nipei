import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIA } from "./ia";
import { buscarConhecimento, formatarConhecimento } from "./conhecimento";
import { getEquipes, getPessoas, getProjetos, getTarefas, vault, type Me, type Pessoa } from "./data";

// Diagnósticos (D0/D1): a questionnaire template (Diagnosticos/_modelos/<id>.md, e.g. Lynn's
// "Team Development Agenda") applied to a project (Diagnosticos/<id>/diagnostico.md).
// Individual sections are answered by each member of the listed teams and stored privately in
// Diagnosticos/<id>/individuais/<pessoa>.md (only the person and gestão read them).
// Collective sections are answered by the team (D2).

export type Pergunta = { id: string; texto: string; texto_en: string; guia: string[]; fontes?: string[] };
export type Secao = {
  id: string; titulo: string; titulo_en: string; escopo: "individual" | "coletivo"; destino: "perfil" | "evento" | "diagnostico";
  intro: string; perguntas: Pergunta[];
};
export type Modelo = { id: string; titulo: string; titulo_en: string; autor: string; secoes: Secao[] };
export type Diagnostico = { id: string; titulo: string; modelo: Modelo; projeto: string; evento: string; equipes: string[]; status: string };
export type Resposta = { texto: string; status: "rascunho" | "respondida"; ia: boolean; em: string };

const DIR = "Diagnosticos";
const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);

/** Fewer words than this and the page asks for a deeper answer. */
export const PALAVRAS_MINIMAS = 40;
export const palavrasDe = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

function lerFrontmatter(abs: string): Record<string, unknown> | null {
  if (!fs.existsSync(abs)) return null;
  const m = fs.readFileSync(abs, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const o = m ? yaml.load(m[1]) : null;
  return o && typeof o === "object" ? (o as Record<string, unknown>) : null;
}

export function getModelo(id: string): Modelo | null {
  const fm = lerFrontmatter(path.join(vault(), DIR, "_modelos", `${id}.md`));
  if (!fm) return null;
  const secoes = (Array.isArray(fm.secoes) ? fm.secoes : []) as Record<string, unknown>[];
  return {
    id: s(fm.id), titulo: s(fm.titulo), titulo_en: s(fm.titulo_en), autor: s(fm.autor),
    secoes: secoes.map((x) => ({
      id: s(x.id), titulo: s(x.titulo), titulo_en: s(x.titulo_en), escopo: s(x.escopo) === "coletivo" ? "coletivo" : "individual",
      destino: (s(x.destino) || "diagnostico") as Secao["destino"], intro: s(x.intro),
      perguntas: ((Array.isArray(x.perguntas) ? x.perguntas : []) as Record<string, unknown>[]).map((p) => ({
        id: s(p.id), texto: s(p.texto), texto_en: s(p.texto_en), guia: arr(p.guia), fontes: arr(p.fontes),
      })),
    })),
  };
}

export function getDiagnosticos(): Diagnostico[] {
  const raiz = path.join(vault(), DIR);
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith("_")).flatMap((d) => {
    const fm = lerFrontmatter(path.join(raiz, d.name, "diagnostico.md"));
    const modelo = fm && getModelo(s(fm.modelo));
    return fm && modelo ? [{ id: s(fm.id) || d.name, titulo: s(fm.titulo), modelo, projeto: s(fm.projeto), evento: s(fm.evento), equipes: arr(fm.equipes), status: s(fm.status) || "aberto" }] : [];
  });
}

export const getDiagnostico = (id: string) => getDiagnosticos().find((d) => d.id === id) ?? null;
export const secoesIndividuais = (d: Diagnostico) => d.modelo.secoes.filter((x) => x.escopo === "individual");

/** Members of the diagnostic's teams answer the individual part. */
export const participa = (d: Diagnostico, p: Pessoa | null | undefined) => !!p && p.equipes.some((e) => d.equipes.includes(e));
export const participantes = (d: Diagnostico) => getPessoas().filter((p) => participa(d, p));
/** Individual answers are private: the person and gestão. */
export const podeVer = (me: Me, pessoaId: string) => me.gestao || me.pessoa?.id === pessoaId;

/** Open diagnostics this person still has to answer. */
export const diagnosticosAbertos = (p: Pessoa | null | undefined) => getDiagnosticos().filter((d) => d.status === "aberto" && participa(d, p));

// ---------------------------------------------------------------- answers

const arquivoRespostas = (diagId: string, pessoaId: string) => path.join(vault(), DIR, diagId, "individuais", `${pessoaId.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`);

export function getRespostas(diagId: string, pessoaId: string): Record<string, Resposta> {
  const fm = lerFrontmatter(arquivoRespostas(diagId, pessoaId));
  const r = (fm?.respostas ?? {}) as Record<string, Record<string, unknown>>;
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {
    texto: s(v?.texto), status: s(v?.status) === "respondida" ? "respondida" : "rascunho", ia: v?.ia === true, em: s(v?.em),
  } as Resposta]));
}

export function progresso(d: Diagnostico, pessoaId: string) {
  const r = getRespostas(d.id, pessoaId);
  const qs = secoesIndividuais(d).flatMap((x) => x.perguntas);
  return { respondidas: qs.filter((q) => r[q.id]?.status === "respondida").length, rascunhos: qs.filter((q) => r[q.id]?.texto && r[q.id].status !== "respondida").length, total: qs.length };
}

/** Writes the person's answers (merged), as YAML for the app and readable markdown for Obsidian. */
export function salvarRespostas(d: Diagnostico, pessoaId: string, novas: Record<string, Partial<Resposta>>) {
  const validas = new Set(secoesIndividuais(d).flatMap((x) => x.perguntas.map((q) => q.id)));
  const atual = getRespostas(d.id, pessoaId);
  const agora = new Date().toISOString();
  for (const [id, r] of Object.entries(novas)) {
    if (!validas.has(id)) continue;
    const antes = atual[id];
    const texto = (r.texto ?? antes?.texto ?? "").trim().slice(0, 8000);
    if (!texto && !antes) continue;
    const mudou = texto !== (antes?.texto ?? "") || (r.status && r.status !== antes?.status);
    atual[id] = {
      texto, status: texto ? (r.status ?? antes?.status ?? "rascunho") : "rascunho",
      // an AI draft stays marked as such until the person changes its text
      ia: r.ia ?? (antes?.ia === true && texto === antes.texto),
      em: mudou ? agora : antes?.em ?? agora,
    };
  }
  const pessoa = getPessoas().find((p) => p.id === pessoaId);
  const corpo = d.modelo.secoes.filter((x) => x.escopo === "individual").map((sec) => [
    `## ${sec.titulo}`,
    ...sec.perguntas.map((q) => `### ${q.texto}\n${atual[q.id]?.texto || "_(sem resposta)_"}${atual[q.id]?.status === "respondida" ? "" : atual[q.id]?.texto ? "\n_(rascunho)_" : ""}`),
  ].join("\n\n")).join("\n\n");
  const fm = { type: "respostas_individuais", diagnostico: d.id, pessoa: pessoaId, privado: true, atualizado_em: agora, respostas: atual };
  const abs = arquivoRespostas(d.id, pessoaId);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n\n<!-- agente: nipei-os v2 (diagnóstico) -->\n# ${d.titulo} — ${pessoa?.name ?? pessoaId}\n\n${corpo}\n`, "utf-8");
  requestSync(vault());
}

// ---------------------------------------------------------------- AI drafts

/** Sections the AI may draft from what the platform knows (the rest is personal). */
export const SECOES_IA = ["papel", "retiro"];

const SISTEMA = `Você ajuda um integrante do Nipëi (Santuário Nipeihu, povo Yawanawá) a preparar suas respostas a um questionário da equipe. Responda em português do Brasil.
Escreva RASCUNHOS na primeira pessoa, só com o que está no contexto (ficha, tarefas, base de conhecimento, anotações da gestão). Zero invenção: nada de nomes, números, datas ou opiniões que não estejam no contexto.
Quando faltar informação, escreva o que dá e termine com uma linha "A completar: ..." dizendo exatamente o que a pessoa precisa acrescentar (seguindo o guia da pergunta).
Seja concreto e completo, seguindo o guia de cada pergunta. Se não houver NADA no contexto para uma pergunta, devolva "".
Responda APENAS com JSON: {"respostas": {"<id da pergunta>": "texto"}}`;

export async function rascunhoIA(d: Diagnostico, pessoaId: string, secaoId: string): Promise<number> {
  const sec = secoesIndividuais(d).find((x) => x.id === secaoId);
  if (!sec || !SECOES_IA.includes(secaoId)) throw new Error("A IA não prepara esta seção");
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p) throw new Error("Pessoa não encontrada");
  const equipes = getEquipes(), projetos = getProjetos();
  const minhas = getTarefas().filter((t) => t.responsaveis.includes(pessoaId));
  const base = buscarConhecimento(`${p.name} ${p.funcao} ${p.area} ${sec.titulo} ${sec.perguntas.map((q) => q.texto).join(" ")}`, { pessoas: [pessoaId], limite: 25, minimo: 0.15 });
  const contexto = [
    `# ${p.name} (${p.id})`, `Função: ${p.funcao || "-"} · Área: ${p.area || "-"} · Disponibilidade: ${p.disponibilidade || "-"}`,
    `Equipes: ${p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e).join(", ")}${p.coordena.length ? ` · coordena: ${p.coordena.join(", ")}` : ""}`,
    "", `## Tarefas atribuídas (${minhas.length})`,
    ...minhas.slice(0, 80).map((t) => `- ${t.title} [${t.statusRaw || "A fazer"}${t.prazo ? `, ${t.prazo}` : ""}; ${projetos.find((x) => x.id === t.projeto)?.nome ?? t.projeto ?? ""}]`),
    "", "## Base de conhecimento confirmada", base.length ? formatarConhecimento(base) : "(nada)",
    "", `## Contexto do diagnóstico: ${d.titulo} · Evento: ${d.evento}`,
    secaoId === "retiro" ? `## Anotações da gestão sobre o retiro (do documento da Lynn)\n${sec.perguntas.flatMap((q) => q.guia).join("\n")}` : "",
    "", `## Perguntas (${sec.titulo})`, ...sec.perguntas.map((q) => `- ${q.id}: ${q.texto}\n  Guia: ${q.guia.join(" | ")}`),
  ].join("\n");
  const { o } = await chamarIA(SISTEMA, [{ type: "text", text: contexto }], 4000, 120_000);
  const r = (o.respostas ?? {}) as Record<string, unknown>;
  const atuais = getRespostas(d.id, pessoaId);
  const novas: Record<string, Partial<Resposta>> = {};
  for (const q of sec.perguntas) {
    const texto = s(r[q.id]);
    // never overwrite what the person already wrote
    if (texto && !atuais[q.id]?.texto) novas[q.id] = { texto, status: "rascunho", ia: true };
  }
  if (Object.keys(novas).length) salvarRespostas(d, pessoaId, novas);
  return Object.keys(novas).length;
}
