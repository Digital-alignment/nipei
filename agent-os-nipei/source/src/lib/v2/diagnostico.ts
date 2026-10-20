import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { requestSync } from "@/lib/tarefaNote";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { chamarIA } from "./ia";
import { buscarConhecimento, criarFonte, formatarConhecimento, processarFonte } from "./conhecimento";
import { createTarefa, getEquipes, getLancamentos, getPessoas, getProjetos, getTarefas, today, vault, type Me, type Pessoa } from "./data";

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

// ---------------------------------------------------------------- D2: collective part
// Diagnosticos/<id>/coletivo.md holds, per collective section, its responsible person and the answers.
// Gestão assigns the responsible; gestão and that person edit the section; every participant reads it.

export type RespostaColetiva = Resposta & { por: string; fontes: string[]; falta: string; tarefa: string };
export type Coletivo = { responsaveis: Record<string, string>; respostas: Record<string, RespostaColetiva>; enviadas: Record<string, string> };

const arquivoColetivo = (diagId: string) => path.join(vault(), DIR, diagId, "coletivo.md");
export const secoesColetivas = (d: Diagnostico) => d.modelo.secoes.filter((x) => x.escopo === "coletivo");

export function getColetivo(diagId: string): Coletivo {
  const fm = lerFrontmatter(arquivoColetivo(diagId)) ?? {};
  const r = (fm.respostas ?? {}) as Record<string, Record<string, unknown>>;
  return {
    responsaveis: Object.fromEntries(Object.entries((fm.responsaveis ?? {}) as Record<string, unknown>).map(([k, v]) => [k, s(v)])),
    enviadas: Object.fromEntries(Object.entries((fm.enviadas ?? {}) as Record<string, unknown>).map(([k, v]) => [k, s(v)])),
    respostas: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {
      texto: s(v?.texto), status: s(v?.status) === "respondida" ? "respondida" : "rascunho", ia: v?.ia === true, em: s(v?.em),
      por: s(v?.por), fontes: arr(v?.fontes), falta: s(v?.falta), tarefa: s(v?.tarefa),
    } as RespostaColetiva])),
  };
}

export const podeEditarSecao = (me: Me, c: Coletivo, secaoId: string) => me.gestao || (!!me.pessoa && c.responsaveis[secaoId] === me.pessoa.id);

function escreverColetivo(d: Diagnostico, c: Coletivo) {
  const pessoas = getPessoas();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name ?? id;
  const corpo = secoesColetivas(d).map((sec) => [
    `## ${sec.titulo}${c.responsaveis[sec.id] ? ` — responsável: ${nome(c.responsaveis[sec.id])}` : ""}`,
    ...sec.perguntas.map((q) => {
      const r = c.respostas[q.id];
      return [`### ${q.texto}`, r?.texto || "_(sem resposta)_", r?.texto && r.status !== "respondida" ? "_(rascunho)_" : "", r?.falta ? `**Falta:** ${r.falta}` : "", r?.tarefa ? `Tarefa: [[${r.tarefa}]]` : ""].filter(Boolean).join("\n");
    }),
  ].join("\n\n")).join("\n\n");
  const fm = { type: "respostas_coletivas", diagnostico: d.id, atualizado_em: new Date().toISOString(), ...c };
  const abs = arquivoColetivo(d.id);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n\n<!-- agente: nipei-os v2 (diagnóstico coletivo) -->\n# ${d.titulo} — parte coletiva\n\n${corpo}\n`, "utf-8");
  requestSync(vault());
}

export function definirResponsavel(d: Diagnostico, secaoId: string, pessoaId: string) {
  if (!secoesColetivas(d).some((x) => x.id === secaoId)) throw new Error("Seção inválida");
  const c = getColetivo(d.id);
  if (pessoaId) c.responsaveis[secaoId] = pessoaId; else delete c.responsaveis[secaoId];
  escreverColetivo(d, c);
}

export function salvarColetivo(d: Diagnostico, quem: string, novas: Record<string, { texto: string; falta?: string; responder?: boolean }>) {
  const validas = new Set(secoesColetivas(d).flatMap((x) => x.perguntas.map((q) => q.id)));
  const c = getColetivo(d.id);
  const agora = new Date().toISOString();
  for (const [id, n] of Object.entries(novas)) {
    if (!validas.has(id)) continue;
    const antes = c.respostas[id];
    const texto = n.texto.trim().slice(0, 12000);
    if (!texto && !antes) continue;
    const mudou = texto !== (antes?.texto ?? "");
    c.respostas[id] = {
      texto, status: texto && (n.responder || (antes?.status === "respondida" && !mudou)) ? "respondida" : "rascunho",
      ia: antes?.ia === true && !mudou, em: mudou || n.responder ? agora : antes?.em ?? agora, por: mudou ? quem : antes?.por ?? quem,
      fontes: antes?.fontes ?? [], falta: n.falta !== undefined ? n.falta.trim().slice(0, 600) : antes?.falta ?? "", tarefa: antes?.tarefa ?? "",
    };
  }
  escreverColetivo(d, c);
}

const SISTEMA_COLETIVO = `Você prepara RASCUNHOS de respostas coletivas da equipe do Nipëi (Santuário Nipeihu, povo Yawanawá) para um diagnóstico pedido pela Lynn. Responda em português do Brasil.
Use SÓ o contexto (base de conhecimento confirmada, notas do vault, tarefas, lançamentos financeiros, projeto). Zero invenção: nada de números, nomes ou datas fora do contexto.
Para cada pergunta, siga o guia e escreva uma resposta completa e concreta com o que existe. Em "fontes", liste as notas/fatos/tarefas que usou.
Em "falta", diga exatamente que informação ainda falta para uma resposta completa (o quê, de quem, onde buscar). Se o contexto não tiver nada, "texto" fica "" e "falta" explica tudo o que é preciso.
Responda APENAS com JSON: {"respostas": {"<id>": {"texto": string, "fontes": [string], "falta": string}}}`;

/** AI drafts for a collective section (never overwrites a written answer; always refreshes "falta"). */
export async function rascunhoColetivoIA(d: Diagnostico, secaoId: string, quem: string): Promise<number> {
  const sec = secoesColetivas(d).find((x) => x.id === secaoId);
  if (!sec) throw new Error("Seção inválida");
  const projeto = getProjetos().find((p) => p.id === d.projeto);
  const consulta = `${projeto?.nome ?? ""} ${sec.titulo} ${sec.perguntas.map((q) => `${q.texto} ${q.guia.join(" ")}`).join(" ")}`;
  const base = buscarConhecimento(consulta, { projetos: d.projeto ? [d.projeto] : [], limite: 30, minimo: 0.12 });
  const rag = queryVaultGrounding(`${projeto?.nome ?? ""} retiro dieta ${sec.titulo}`.slice(0, 400));
  const tarefas = getTarefas().filter((t) => !d.projeto || t.projeto === d.projeto);
  const lanc = secaoId === "financas" ? getLancamentos().filter((l) => !l.anulado && (!d.projeto || l.projeto === d.projeto)) : [];
  const contexto = [
    `Hoje: ${today()} · Diagnóstico: ${d.titulo} · Evento: ${d.evento}`,
    projeto ? `Projeto: ${projeto.nome} — ${projeto.descricao}` : "",
    "## Base de conhecimento confirmada", base.length ? formatarConhecimento(base) : "(nada)",
    "## Notas do vault (não revisadas)", ...(rag.citations ?? []).filter((c) => !c.path.startsWith("Conhecimento/")).slice(0, 6).map((c) => `### ${c.title} (${c.path})\n${c.snippet.slice(0, 1200)}`),
    `## Tarefas do projeto (${tarefas.length})`, ...tarefas.slice(0, 80).map((t) => `- ${t.id}: ${t.title} [${t.statusRaw || "A fazer"}${t.prazo ? `, ${t.prazo}` : ""}]`),
    secaoId === "financas" ? `## Lançamentos financeiros do projeto (${lanc.length})\n${lanc.slice(0, 150).map((l) => `- ${l.data} ${l.tipo} R$ ${l.valor} ${l.categoria}: ${l.descricao}`).join("\n") || "(nenhum lançamento registrado)"}` : "",
    `## Perguntas (${sec.titulo})`, ...sec.perguntas.map((q) => `- ${q.id}: ${q.texto}\n  Guia: ${q.guia.join(" | ")}`),
  ].filter(Boolean).join("\n");
  const { o } = await chamarIA(SISTEMA_COLETIVO, [{ type: "text", text: contexto }], 6000, 150_000);
  const r = (o.respostas ?? {}) as Record<string, Record<string, unknown>>;
  const c = getColetivo(d.id);
  const agora = new Date().toISOString();
  let n = 0;
  for (const q of sec.perguntas) {
    const x = r[q.id];
    if (!x) continue;
    const atual = c.respostas[q.id];
    const texto = s(x.texto).slice(0, 12000);
    const falta = s(x.falta).slice(0, 600);
    if (atual?.texto) { if (atual.status !== "respondida") atual.falta = falta; continue; }
    if (!texto && !falta) continue;
    c.respostas[q.id] = { texto, status: "rascunho", ia: !!texto, em: agora, por: quem, fontes: arr(x.fontes).slice(0, 10), falta, tarefa: atual?.tarefa ?? "" };
    n++;
  }
  escreverColetivo(d, c);
  return n;
}

/** One task per open gap of the section (skips gaps that already have a task). Returns how many were created. */
export function criarTarefasLacunas(d: Diagnostico, secaoId: string, quem: string): number {
  const sec = secoesColetivas(d).find((x) => x.id === secaoId);
  if (!sec) throw new Error("Seção inválida");
  const c = getColetivo(d.id);
  const responsavel = c.responsaveis[secaoId];
  const abertas = new Set(getTarefas().filter((t) => t.status !== "done").map((t) => t.id));
  let n = 0;
  for (const q of sec.perguntas) {
    const r = c.respostas[q.id];
    if (!r?.falta || r.status === "respondida" || (r.tarefa && abertas.has(r.tarefa))) continue;
    // no WhatsApp per task: a whole section of gaps would be a burst of messages; Hoje shows the owner's section instead
    const id = createTarefa({
      title: `Diagnóstico · ${sec.titulo}: ${q.texto}`.slice(0, 200), equipe: d.equipes[0] ?? "", prazo: "",
      responsaveis: responsavel ? [responsavel] : [], projeto: d.projeto, objetivo: "", recorrencia: "",
    }, quem, {
      semAviso: true,
      descricao: [`Informação que falta para responder a pergunta do diagnóstico **${d.titulo}** (pedido da ${d.modelo.autor}):`, "", r.falta, "",
        `Pergunta: ${q.texto}`, `Guia: ${q.guia.join(" · ")}`, "", `Quando tiver a informação, complete a resposta em /diagnosticos/${d.id}/coletivo?secao=${secaoId}`].join("\n"),
    });
    r.tarefa = id;
    n++;
  }
  if (n) escreverColetivo(d, c);
  return n;
}

/** Sends the section's answered questions to Conhecimento as a source (facts go through the usual review). */
export function enviarAoConhecimento(d: Diagnostico, secaoId: string, quem: string): string {
  const sec = secoesColetivas(d).find((x) => x.id === secaoId);
  if (!sec) throw new Error("Seção inválida");
  const c = getColetivo(d.id);
  const prontas = sec.perguntas.filter((q) => c.respostas[q.id]?.status === "respondida");
  if (!prontas.length) throw new Error("Nenhuma resposta marcada como respondida");
  const texto = [`${d.titulo} — ${sec.titulo}`, "", ...prontas.map((q) => `## ${q.texto}\n${c.respostas[q.id].texto}`)].join("\n\n");
  const id = criarFonte({ tipo: "texto", titulo: `Diagnóstico: ${sec.titulo} (${d.titulo})`.slice(0, 150), texto, por: quem });
  c.enviadas[secaoId] = id;
  escreverColetivo(d, c);
  void processarFonte(id);
  return id;
}
