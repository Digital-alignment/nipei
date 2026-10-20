import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { requestSync } from "@/lib/tarefaNote";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { chamarIA, chamarIATexto } from "./ia";
import { buscarConhecimento, criarFonte, formatarConhecimento, processarFonte } from "./conhecimento";
import { createTarefa, getEquipes, getLancamentos, getPessoas, getProjetos, getTarefas, noteText, slugify, today, vault, type Lancamento, type Me, type Pessoa } from "./data";
import { getAlertas } from "./auditor";

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
export type Item = { id: string; titulo: string; prioridade: "alta" | "media" | "baixa"; custo: number; requisitos: string; responsavel: string; tarefa: string };
export type Entrada = { id: string; data: string; acao: string; responsavel: string; tarefa: string };
export type Reuniao = { data: string; evento: string; pauta: string; geradaEm: string };
export type Coletivo = {
  responsaveis: Record<string, string>; respostas: Record<string, RespostaColetiva>; enviadas: Record<string, string>;
  itens: Record<string, Item[]>; // D3: improvement items per "espaco" question
  calendario: { dataRetiro: string; entradas: Entrada[] }; // D3: marketing calendar
  periodo: { de: string; ate: string }; // D3: finance period of the retreat/dieta
  reunioes: Record<string, Reuniao>; // D3: team meetings #1 and #2
  consolidados: Record<string, { texto: string; geradoEm: string }>; // D4: "retiro", "matriz"
  codigo: Codigo; // D4: code of agreements
};
export type Codigo = { texto: string; versao: number; status: "rascunho" | "publicado"; publicadoEm: string; aceites: Record<string, { versao: number; em: string }> };

const arquivoColetivo = (diagId: string) => path.join(vault(), DIR, diagId, "coletivo.md");
export const secoesColetivas = (d: Diagnostico) => d.modelo.secoes.filter((x) => x.escopo === "coletivo");

export function getColetivo(diagId: string): Coletivo {
  const fm = lerFrontmatter(arquivoColetivo(diagId)) ?? {};
  const r = (fm.respostas ?? {}) as Record<string, Record<string, unknown>>;
  return {
    responsaveis: Object.fromEntries(Object.entries((fm.responsaveis ?? {}) as Record<string, unknown>).map(([k, v]) => [k, s(v)])),
    enviadas: Object.fromEntries(Object.entries((fm.enviadas ?? {}) as Record<string, unknown>).map(([k, v]) => [k, s(v)])),
    itens: Object.fromEntries(Object.entries((fm.itens ?? {}) as Record<string, unknown>).map(([k, v]) => [k, ((Array.isArray(v) ? v : []) as Record<string, unknown>[]).map((i) => ({
      id: s(i.id), titulo: s(i.titulo), prioridade: (["alta", "media", "baixa"].includes(s(i.prioridade)) ? s(i.prioridade) : "media") as Item["prioridade"],
      custo: Number(i.custo) || 0, requisitos: s(i.requisitos), responsavel: s(i.responsavel), tarefa: s(i.tarefa),
    }))])),
    calendario: (() => {
      const c = (fm.calendario ?? {}) as Record<string, unknown>;
      return { dataRetiro: s(c.dataRetiro), entradas: ((Array.isArray(c.entradas) ? c.entradas : []) as Record<string, unknown>[]).map((e) => ({ id: s(e.id), data: s(e.data), acao: s(e.acao), responsavel: s(e.responsavel), tarefa: s(e.tarefa) })) };
    })(),
    periodo: { de: s((fm.periodo as Record<string, unknown>)?.de), ate: s((fm.periodo as Record<string, unknown>)?.ate) },
    reunioes: Object.fromEntries(Object.entries((fm.reunioes ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => [k, { data: s(v?.data), evento: s(v?.evento), pauta: s(v?.pauta), geradaEm: s(v?.geradaEm) }])),
    consolidados: Object.fromEntries(Object.entries((fm.consolidados ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => [k, { texto: s(v?.texto), geradoEm: s(v?.geradoEm) }])),
    codigo: (() => {
      const c = (fm.codigo ?? {}) as Record<string, unknown>;
      return {
        texto: s(c.texto), versao: Number(c.versao) || 0, status: s(c.status) === "publicado" ? "publicado" : "rascunho", publicadoEm: s(c.publicadoEm),
        aceites: Object.fromEntries(Object.entries((c.aceites ?? {}) as Record<string, Record<string, unknown>>).map(([k, v]) => [k, { versao: Number(v?.versao) || 0, em: s(v?.em) }])),
      } as Codigo;
    })(),
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
  const lanc = secaoId === "financas" ? lancamentosDoPeriodo(d, getColetivo(d.id).periodo) : [];
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

// ---------------------------------------------------------------- D3: lists that become work

const novoItemId = () => Math.random().toString(36).slice(2, 9);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PRIORIDADE_TAREFA = { alta: "Alta", media: "Média", baixa: "Baixa" } as const;
/** Which team carries out each improvement question (maintenance for the grounds; the office for services). */
const EQUIPE_ITEM: Record<string, string> = { "espaco.shuhu": "equipe_4", "espaco.casa_cura": "equipe_4", "espaco.cura": "equipe_1" };

/** First list for an improvement question: the items Lynn named (from the guide), ready to prioritise. */
export function itensSugeridos(d: Diagnostico, perguntaId: string): Item[] {
  const q = secoesColetivas(d).flatMap((x) => x.perguntas).find((x) => x.id === perguntaId);
  return (q?.guia[0] ?? "").replace(/\.$/, "").split(/,\s*/).map((t) => t.trim()).filter(Boolean)
    .map((t) => ({ id: novoItemId(), titulo: t.charAt(0).toUpperCase() + t.slice(1), prioridade: "media", custo: 0, requisitos: "", responsavel: "", tarefa: "" }));
}

export function salvarItens(d: Diagnostico, perguntaId: string, itens: Omit<Item, "tarefa">[]) {
  const c = getColetivo(d.id);
  const antes = new Map((c.itens[perguntaId] ?? []).map((i) => [i.id, i]));
  c.itens[perguntaId] = itens.filter((i) => i.titulo.trim()).map((i) => ({
    ...i, id: i.id || novoItemId(), titulo: i.titulo.trim().slice(0, 200), requisitos: i.requisitos.trim().slice(0, 500),
    custo: Math.max(0, Math.round(Number(i.custo) || 0)), tarefa: antes.get(i.id)?.tarefa ?? "",
  }));
  escreverColetivo(d, c);
}

/** One task per item that has none yet (priority and estimated cost in the task). */
export function criarTarefasItens(d: Diagnostico, perguntaId: string, quem: string): number {
  const c = getColetivo(d.id);
  const q = secoesColetivas(d).flatMap((x) => x.perguntas).find((x) => x.id === perguntaId);
  let n = 0;
  for (const i of c.itens[perguntaId] ?? []) {
    if (i.tarefa) continue;
    i.tarefa = createTarefa({
      title: i.titulo, equipe: EQUIPE_ITEM[perguntaId] ?? d.equipes[0] ?? "", prazo: "", responsaveis: i.responsavel ? [i.responsavel] : [],
      projeto: d.projeto, objetivo: "", recorrencia: "", priority: PRIORIDADE_TAREFA[i.prioridade],
    }, quem, {
      semAviso: true,
      descricao: [`Melhoria levantada no diagnóstico **${d.titulo}** (${q?.texto ?? perguntaId}).`, "",
        `- Prioridade: ${PRIORIDADE_TAREFA[i.prioridade]}`, `- Custo aproximado: ${i.custo ? `R$ ${i.custo.toLocaleString("pt-BR")}` : "a orçar"}`,
        `- O que precisa: ${i.requisitos || "a definir"}`].join("\n"),
    });
    n++;
  }
  if (n) escreverColetivo(d, c);
  return n;
}

/** Standard countdown to a retreat (days relative to its first day). Owners and dates stay editable before becoming tasks. */
const CALENDARIO_PADRAO: [number, string][] = [
  [-150, "Definir datas, preços e vagas; publicar a página do retiro no site"],
  [-120, "Abrir inscrições e enviar e-mail de anúncio (save the date)"],
  [-120, "Post de anúncio nas redes sociais"],
  [-105, "Selecionar fotos e vídeos do acervo; fechar o calendário de posts"],
  [-90, "E-mail: programa e facilitadores do retiro"],
  [-75, "Contatar parceiros e colaboradores de divulgação"],
  [-60, "Fim do early-bird: e-mail e post de lembrete"],
  [-45, "E-mail e posts com depoimentos de participantes"],
  [-30, "Última chamada (e-mail + redes)"],
  [-21, "Revisão de inscrições: vagas, lista de espera, pagamentos pendentes"],
  [-14, "Enviar orientações aos inscritos (PDF de boas-vindas, transfers, o que levar)"],
  [-7, "Confirmações finais com cada participante"],
  [7, "E-mail de agradecimento + formulário de feedback"],
  [30, "Compartilhar fotos e depoimentos; abrir lista de interesse do próximo retiro"],
];

const somarDias = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

/** Fills the marketing calendar from the retreat date (entries already turned into tasks are kept). */
export function gerarCalendario(d: Diagnostico, dataRetiro: string) {
  if (!ISO.test(dataRetiro)) throw new Error("Data do retiro inválida");
  const c = getColetivo(d.id);
  const dono = c.responsaveis.marketing ?? "";
  const feitas = c.calendario.entradas.filter((e) => e.tarefa);
  c.calendario = {
    dataRetiro,
    entradas: [...feitas, ...CALENDARIO_PADRAO.filter(([, acao]) => !feitas.some((e) => e.acao === acao))
      .map(([dias, acao]) => ({ id: novoItemId(), data: somarDias(dataRetiro, dias), acao, responsavel: dono, tarefa: "" }))]
      .sort((a, b) => a.data.localeCompare(b.data)),
  };
  escreverColetivo(d, c);
}

export function salvarCalendario(d: Diagnostico, entradas: Omit<Entrada, "tarefa">[]) {
  const c = getColetivo(d.id);
  const antes = new Map(c.calendario.entradas.map((e) => [e.id, e]));
  c.calendario.entradas = entradas.filter((e) => e.acao.trim() && ISO.test(e.data))
    .map((e) => ({ ...e, id: e.id || novoItemId(), acao: e.acao.trim().slice(0, 200), tarefa: antes.get(e.id)?.tarefa ?? "" }))
    .sort((a, b) => a.data.localeCompare(b.data));
  escreverColetivo(d, c);
}

/** Calendar entries → tasks with due dates (they show in Agenda); plus one weekly registration check-in. */
export function criarTarefasCalendario(d: Diagnostico, quem: string): number {
  const c = getColetivo(d.id);
  const projeto = d.projeto;
  let n = 0;
  for (const e of c.calendario.entradas) {
    if (e.tarefa) continue;
    e.tarefa = createTarefa({ title: `Marketing: ${e.acao}`.slice(0, 200), equipe: d.equipes[0] ?? "", prazo: e.data, responsaveis: e.responsavel ? [e.responsavel] : [], projeto, objetivo: "", recorrencia: "" },
      quem, { semAviso: true, descricao: `Calendário de marketing do próximo grande retiro (início ${c.calendario.dataRetiro}), diagnóstico **${d.titulo}**.` });
    n++;
  }
  const inicio = c.calendario.dataRetiro && somarDias(c.calendario.dataRetiro, -120);
  const titulo = "Marketing: revisão semanal de inscrições e divulgação";
  if (inicio && !getTarefas().some((t) => t.title === titulo && t.status !== "done")) {
    createTarefa({ title: titulo, equipe: d.equipes[0] ?? "", prazo: inicio > today() ? inicio : today(), responsaveis: c.responsaveis.marketing ? [c.responsaveis.marketing] : [], projeto, objetivo: "", recorrencia: "semanal" },
      quem, { semAviso: true, descricao: `Check-in semanal de inscrições e marketing até o retiro (${c.calendario.dataRetiro}). Ao concluir, a próxima é criada sozinha.` });
    n++;
  }
  if (n) escreverColetivo(d, c);
  return n;
}

export function lancamentosDoPeriodo(d: Diagnostico, p: { de: string; ate: string }): Lancamento[] {
  return getLancamentos().filter((l) => !l.anulado && (!d.projeto || !l.projeto || l.projeto === d.projeto) && (!p.de || l.data >= p.de) && (!p.ate || l.data <= p.ate));
}

export function salvarPeriodo(d: Diagnostico, de: string, ate: string) {
  const c = getColetivo(d.id);
  c.periodo = { de: ISO.test(de) ? de : "", ate: ISO.test(ate) ? ate : "" };
  escreverColetivo(d, c);
}

/** Totals for the finance section: income and expenses by category, and the result. */
export function resumoFinanceiro(lanc: Lancamento[]) {
  const por = (tipo: "entrada" | "despesa") => {
    const m = new Map<string, number>();
    for (const l of lanc.filter((x) => x.tipo === tipo)) m.set(l.categoria || "—", (m.get(l.categoria || "—") ?? 0) + l.valor);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const entradas = por("entrada"), despesas = por("despesa");
  const soma = (x: [string, number][]) => x.reduce((a, [, v]) => a + v, 0);
  return { entradas, despesas, totalEntradas: soma(entradas), totalDespesas: soma(despesas), resultado: soma(entradas) - soma(despesas), n: lanc.length };
}

// ---------------------------------------------------------------- D3: team meetings

/** Lynn's topics for each meeting. */
export const TEMAS_REUNIAO: Record<string, string[]> = {
  "1": ["Papéis e responsabilidades", "O que está funcionando bem", "O que está caindo no esquecimento", "Lições do retiro e da dieta",
    "Desafios de comunicação", "Onde cada um precisa de mais apoio", "Prioridades operacionais imediatas"],
  "2": ["Papéis e responsabilidades da equipe", "Expectativas de comunicação", "Código de acordos e ética", "Processo de decisão",
    "Responsáveis e calendário de marketing", "Prioridades operacionais", "Melhorias do espaço e da experiência do convidado", "Necessidades de equipe", "Estrutura operacional"],
};

/** Schedules meeting #n as an event in the Agenda (Equipe 1). */
export function agendarReuniao(d: Diagnostico, n: "1" | "2", data: string) {
  if (!ISO.test(data)) throw new Error("Data inválida");
  const c = getColetivo(d.id);
  const titulo = `Reunião #${n} da equipe — ${d.titulo}`;
  const base = `${data}_${slugify(`reuniao_${n}_${d.id}`)}`;
  const id = `evt_${base}`;
  const dir = path.join(vault(), "Eventos");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${base}.md`), noteText({ id, type: "evento", titulo, inicio: data, fim: "", status: "confirmado", equipe: d.equipes[0] ?? "", projeto: d.projeto, updated_at: new Date().toISOString() },
    `# ${titulo}\n\nPauta: /diagnosticos/${d.id}/reuniao/${n}`), "utf-8");
  // a new date replaces the previous event of this meeting
  const antigo = c.reunioes[n]?.evento;
  if (antigo && antigo !== id) for (const f of fs.readdirSync(dir)) if (f.endsWith(".md") && fs.readFileSync(path.join(dir, f), "utf-8").includes(`id: "${antigo}"`)) fs.unlinkSync(path.join(dir, f));
  c.reunioes[n] = { ...(c.reunioes[n] ?? { pauta: "", geradaEm: "" }), data, evento: id };
  escreverColetivo(d, c);
}

const SISTEMA_PAUTA = `Você prepara a pauta de uma reunião da equipe do Nipëi (Santuário Nipeihu) a partir das respostas do diagnóstico pedido pela Lynn. Responda em português do Brasil, em markdown.
Para cada tema, em ordem: um título "## Tema", 2 a 5 pontos concretos levantados nas respostas (sem citar quem disse o quê em assuntos sensíveis como tensões e preocupações pessoais), e "Decidir:" com as perguntas que a reunião precisa fechar.
Termine com "## Pendências" (lacunas e tarefas abertas do diagnóstico) e "## Próximos passos".
Use só o contexto. Seja objetivo: a reunião tem 2 horas. Responda só com o markdown da pauta.`;

/** AI agenda from the individual and team answers, open gaps and alerts. */
export async function gerarPauta(d: Diagnostico, n: "1" | "2"): Promise<string> {
  const pessoas = participantes(d);
  const c = getColetivo(d.id);
  const individuais = pessoas.map((p) => {
    const r = getRespostas(d.id, p.id);
    const linhas = secoesIndividuais(d).flatMap((sec) => sec.perguntas.filter((q) => r[q.id]?.texto).map((q) => `- [${sec.titulo}] ${q.texto}: ${r[q.id].texto.slice(0, 700)}`));
    return linhas.length ? `### ${p.name}\n${linhas.join("\n")}` : "";
  }).filter(Boolean);
  const coletivas = secoesColetivas(d).map((sec) => `### ${sec.titulo}\n${sec.perguntas.map((q) => {
    const r = c.respostas[q.id];
    return `- ${q.texto}: ${r?.texto ? r.texto.slice(0, 500) : "(sem resposta)"}${r?.falta ? ` | FALTA: ${r.falta}` : ""}`;
  }).join("\n")}`);
  const abertas = getTarefas().filter((t) => t.status !== "done" && /^(Diagnóstico ·|Marketing:)/.test(t.title));
  const contexto = [
    `Reunião #${n} · ${d.titulo} · data ${c.reunioes[n]?.data || "a definir"}`, `Temas (da Lynn): ${TEMAS_REUNIAO[n].join("; ")}`,
    "## Respostas individuais", individuais.join("\n\n") || "(ninguém respondeu ainda)",
    "## Respostas coletivas", ...coletivas,
    `## Tarefas abertas do diagnóstico (${abertas.length})`, ...abertas.slice(0, 40).map((t) => `- ${t.title}`),
    `## Alertas de conhecimento abertos: ${getAlertas().filter((a) => a.status === "aberta").length}`,
  ].join("\n");
  let pauta = "";
  try {
    pauta = await chamarIATexto(SISTEMA_PAUTA, [{ type: "text", text: contexto }], 5000, 150_000);
  } catch { /* fall back to the plain topic list */ }
  if (!pauta) pauta = TEMAS_REUNIAO[n].map((t) => `## ${t}\n- \nDecidir: `).join("\n\n");
  const c2 = getColetivo(d.id);
  c2.reunioes[n] = { ...(c2.reunioes[n] ?? { data: "", evento: "" }), pauta, geradaEm: new Date().toISOString() };
  escreverColetivo(d, c2);
  return pauta;
}

// ---------------------------------------------------------------- D4: consolidated views

/** Everyone's answers to the individual sections listed (text only, for AI synthesis). */
function respostasDe(d: Diagnostico, secoes: string[]) {
  return participantes(d).map((p) => {
    const r = getRespostas(d.id, p.id);
    const linhas = secoesIndividuais(d).filter((x) => secoes.includes(x.id)).flatMap((sec) => sec.perguntas.filter((q) => r[q.id]?.texto).map((q) => `- ${q.texto}: ${r[q.id].texto.slice(0, 1500)}`));
    return linhas.length ? `### ${p.name} (${p.id})\n${linhas.join("\n")}` : "";
  }).filter(Boolean);
}

const SISTEMAS_CONSOLIDADO: Record<string, string> = {
  retiro: `Você consolida os relatórios individuais da equipe do Nipëi sobre o último retiro e a dieta, para a Lynn e a gestão. Português do Brasil, markdown.
Para cada pergunta do relatório (o que funcionou, o que não funcionou, o que organizar diferente, bolas que caíram, responsabilidades pouco claras, comunicação, tensões, sucessos, o que os convidados valorizaram, feedback, repetir, mudar): um título "## ..." e os pontos em comum e divergentes, indicando quantas pessoas citaram cada ponto ("3 de 5").
Tensões e preocupações pessoais: descreva o tema sem identificar quem disse. Use só as respostas e as anotações da gestão. Termine com "## Recomendações para o próximo retiro" (concretas, com dono sugerido quando der).
Responda só com o markdown.`,
  matriz: `Você monta a matriz de responsabilidades da equipe do Nipëi a partir das descrições de papel de cada pessoa, das tarefas atribuídas e dos responsáveis das seções do diagnóstico. Português do Brasil, markdown.
Produza: "## Matriz" como tabela | Responsabilidade | Dono hoje | Recorrência | Situação | Sugestão |, onde Situação é "clara", "sobrecarregada", "sem dono" ou "cai no esquecimento". Depois "## Sem dono claro", "## Sobrecarga" e "## Onde cada pessoa precisa de apoio" (sem expor preocupações pessoais).
Use só o contexto; quando faltar informação, diga. Responda só com o markdown.`,
};

export async function gerarConsolidado(d: Diagnostico, tipo: "retiro" | "matriz"): Promise<string> {
  const c = getColetivo(d.id);
  const pessoas = getPessoas();
  let contexto: string;
  if (tipo === "retiro") {
    const sec = secoesIndividuais(d).find((x) => x.id === "retiro");
    contexto = [`${d.titulo} · ${d.evento}`, "## Anotações da gestão (documento da Lynn)", ...(sec?.perguntas.flatMap((q) => q.guia) ?? []),
      "## Relatórios individuais", respostasDe(d, ["retiro"]).join("\n\n") || "(nenhum relatório ainda)"].join("\n");
  } else {
    const tarefas = getTarefas().filter((t) => t.status !== "done");
    contexto = [`${d.titulo}`, "## Descrições de papel", respostasDe(d, ["papel", "compromisso"]).join("\n\n") || "(nenhuma ainda)",
      "## Responsáveis das seções do diagnóstico", ...Object.entries(c.responsaveis).map(([k, v]) => `- ${k}: ${pessoas.find((p) => p.id === v)?.name ?? v}`),
      "## Tarefas abertas por pessoa", ...participantes(d).map((p) => `- ${p.name}: ${tarefas.filter((t) => t.responsaveis.includes(p.id)).map((t) => t.title).slice(0, 25).join("; ") || "(nenhuma)"}`),
      `## Tarefas abertas sem responsável: ${tarefas.filter((t) => !t.responsaveis.length && (!d.projeto || t.projeto === d.projeto)).length}`].join("\n");
  }
  const texto = await chamarIATexto(SISTEMAS_CONSOLIDADO[tipo], [{ type: "text", text: contexto }], 6000, 180_000);
  const c2 = getColetivo(d.id);
  c2.consolidados[tipo] = { texto, geradoEm: new Date().toISOString() };
  escreverColetivo(d, c2);
  return texto;
}

// ---------------------------------------------------------------- D4: code of agreements

const SISTEMA_CODIGO = `Você redige o rascunho do Código de Acordos e Valores da equipe do Nipëi (Santuário Nipeihu, povo Yawanawá), a partir das ideias de cada integrante e dos exemplos da Lynn. Português do Brasil, markdown.
Estrutura: "## Nosso propósito e valores" (3 a 6 valores, cada um com uma frase de como aparece no dia a dia) e depois seções de acordos (Comunicação respeitosa, Conflitos, Pontualidade e comunicação a tempo, Limites profissionais, Decisões, Passagem de responsabilidades, Erros e feedback, Equipe e participantes, Segurança dos participantes, Queixas da equipe). Cada acordo é uma frase que dá para cumprir e verificar.
Quando houver divergência entre as pessoas, escreva a opção mais apoiada e registre a alternativa em "> Para decidir: ...". Use só o contexto. Responda só com o markdown.`;

const EXEMPLOS_LYNN = "Participantes em primeiro lugar; Ambiente seguro (físico, emocional, psicológico e espiritual); Comunicação gentil e respeitosa; Resolução direta de conflitos com a pessoa envolvida; Conversas sensíveis em privado; Mediador neutro acordado por ambos; Pontualidade; Responder comunicações num prazo combinado (24 h?); Avisar o quanto antes atrasos, ausências ou impedimentos.";

export async function rascunhoCodigo(d: Diagnostico): Promise<string> {
  const contexto = [`${d.titulo}`, `## Exemplos da Lynn\n${EXEMPLOS_LYNN}`, "## Ideias de cada integrante", respostasDe(d, ["acordos"]).join("\n\n") || "(ninguém respondeu ainda)"].join("\n");
  const texto = await chamarIATexto(SISTEMA_CODIGO, [{ type: "text", text: contexto }], 5000, 150_000);
  salvarCodigo(d, texto);
  return texto;
}

/** Saving the text keeps it a draft (a published version stays accepted until a new one is published). */
export function salvarCodigo(d: Diagnostico, texto: string) {
  const c = getColetivo(d.id);
  c.codigo = { ...c.codigo, texto: texto.trim().slice(0, 30000), status: "rascunho" };
  escreverColetivo(d, c);
}

/** Publishes a new version: everyone is asked to accept it again in their profile. */
export function publicarCodigo(d: Diagnostico) {
  const c = getColetivo(d.id);
  if (!c.codigo.texto) throw new Error("Código vazio");
  c.codigo = { ...c.codigo, versao: c.codigo.versao + 1, status: "publicado", publicadoEm: new Date().toISOString() };
  escreverColetivo(d, c);
}

export function aceitarCodigo(d: Diagnostico, pessoaId: string) {
  const c = getColetivo(d.id);
  if (c.codigo.status !== "publicado" && !c.codigo.versao) throw new Error("Nenhuma versão publicada");
  c.codigo.aceites[pessoaId] = { versao: c.codigo.versao, em: new Date().toISOString() };
  escreverColetivo(d, c);
}

/** The published version the person still has to accept (null when up to date or nothing published). */
export function codigoPendente(d: Diagnostico, pessoaId: string) {
  const c = getColetivo(d.id).codigo;
  return c.versao > 0 && (c.aceites[pessoaId]?.versao ?? 0) < c.versao ? c : null;
}

// ---------------------------------------------------------------- D4: final document (PT, then EN)

const ARQ_DOC = (diagId: string, lang: "pt" | "en") => path.join(vault(), DIR, diagId, `documento-${lang}.md`);
const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
/** Private answers stay out of the document (they reach it only anonymised, through the consolidated report). */
const PRIVADAS = new Set(["compromisso.necessidades", "retiro.tensoes"]);

export function getDocumento(diagId: string, lang: "pt" | "en") {
  const abs = ARQ_DOC(diagId, lang);
  if (!fs.existsSync(abs)) return null;
  const t = fs.readFileSync(abs, "utf-8");
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = (m && (yaml.load(m[1]) as Record<string, unknown>)) || {};
  return { texto: (m?.[2] ?? t).replace(/^<!--[\s\S]*?-->\s*/, ""), geradoEm: s(fm.gerado_em) };
}

function salvarDocumento(d: Diagnostico, lang: "pt" | "en", texto: string) {
  const abs = ARQ_DOC(d.id, lang);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `---\n${yaml.dump({ type: "documento_diagnostico", diagnostico: d.id, lang, gerado_em: new Date().toISOString(), confidencial: true })}---\n<!-- agente: nipei-os v2 (diagnóstico D4) -->\n${texto}\n`, "utf-8");
  requestSync(vault());
}

/** Embedded reports start at "###" so they sit under the document's numbered "##" sections. */
const rebaixar = (md: string) => md.replace(/^(#{1,5}) /gm, (_, h: string) => `${h}${h.length === 1 ? "##" : "#"} `);

/** Compiles the Portuguese document from everything the assessment holds (no AI). */
export function montarDocumento(d: Diagnostico): string {
  const c = getColetivo(d.id);
  const pessoas = getPessoas();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name ?? id;
  const tarefas = getTarefas();
  const projeto = getProjetos().find((p) => p.id === d.projeto);
  const partes: string[] = [
    `# ${d.titulo}`,
    `**${d.modelo.titulo}** — pedido de ${d.modelo.autor}. Projeto: ${projeto?.nome ?? d.projeto}. Gerado em ${today().split("-").reverse().join("/")} pelo Nipëi OS.`,
    "> Confidencial: equipe de gestão. Respostas pessoais sensíveis (preocupações e tensões) aparecem só de forma anônima no relatório consolidado.",
    "## Sumário",
    "1. Equipe: compromisso e papéis  \n2. Matriz de responsabilidades  \n3. Retiro e dieta  \n4. Revisão financeira  \n5. Plano de marketing  \n6. Código de acordos e valores  \n7. Espaço e experiência do convidado  \n8. Visão  \n9. Reuniões  \n10. Pendências",
  ];
  // 1. people
  partes.push("## 1. Equipe: compromisso e papéis");
  for (const p of participantes(d)) {
    const r = getRespostas(d.id, p.id);
    const qs = secoesIndividuais(d).filter((x) => x.id === "compromisso" || x.id === "papel").flatMap((x) => x.perguntas).filter((q) => !PRIVADAS.has(q.id) && r[q.id]?.texto);
    partes.push(`### ${p.name}${p.funcao ? ` — ${p.funcao}` : ""}`, qs.length ? qs.map((q) => `**${q.texto}**\n${r[q.id].texto}`).join("\n\n") : "_Ainda não respondeu._");
  }
  partes.push("## 2. Matriz de responsabilidades", c.consolidados.matriz?.texto ? rebaixar(c.consolidados.matriz.texto) : "_Ainda não gerada._");
  partes.push("## 3. Retiro e dieta", c.consolidados.retiro?.texto ? rebaixar(c.consolidados.retiro.texto) : "_Relatório consolidado ainda não gerado._");
  // collective sections
  const secao = (id: string) => secoesColetivas(d).find((x) => x.id === id);
  const respostas = (id: string) => (secao(id)?.perguntas ?? []).map((q) => {
    const r = c.respostas[q.id];
    return `**${q.texto}**\n${r?.texto || "_Sem resposta._"}${r?.status === "respondida" ? "" : r?.texto ? " _(rascunho)_" : ""}${r?.falta && r.status !== "respondida" ? `\n> Falta: ${r.falta}` : ""}`;
  }).join("\n\n");
  const fin = resumoFinanceiro(lancamentosDoPeriodo(d, c.periodo));
  partes.push("## 4. Revisão financeira",
    fin.n ? [`Período: ${c.periodo.de || "…"} a ${c.periodo.ate || "…"} · ${fin.n} lançamentos.`, "", "| | Valor |", "|---|---:|",
      ...fin.entradas.map(([k, v]) => `| Entrada · ${k} | ${brl(v)} |`), ...fin.despesas.map(([k, v]) => `| Despesa · ${k} | ${brl(v)} |`),
      `| **Resultado** | **${brl(fin.resultado)}** |`].join("\n") : "_Sem lançamentos registrados no período._",
    respostas("financas"));
  partes.push("## 5. Plano de marketing", respostas("marketing"),
    c.calendario.entradas.length ? ["### Calendário", `Início do retiro: ${c.calendario.dataRetiro}`, "", "| Data | Ação | Responsável |", "|---|---|---|",
      ...c.calendario.entradas.map((e) => `| ${e.data} | ${e.acao} | ${e.responsavel ? nome(e.responsavel) : "—"} |`)].join("\n") : "");
  partes.push("## 6. Código de acordos e valores",
    c.codigo.texto ? `${c.codigo.versao ? `Versão ${c.codigo.versao}${c.codigo.status === "publicado" ? " (publicada)" : " (em revisão)"} · aceita por ${Object.values(c.codigo.aceites).filter((a) => a.versao === c.codigo.versao).length} de ${participantes(d).length}.` : "Rascunho."}\n\n${rebaixar(c.codigo.texto)}` : "_Ainda não redigido._");
  partes.push("## 7. Espaço e experiência do convidado");
  for (const q of secao("espaco")?.perguntas ?? []) {
    const itens = c.itens[q.id] ?? [];
    partes.push(`### ${q.texto}`, c.respostas[q.id]?.texto ?? "",
      itens.length ? ["| Item | Prioridade | Custo aprox. | O que precisa | Responsável |", "|---|---|---:|---|---|",
        ...itens.map((i) => `| ${i.titulo} | ${i.prioridade} | ${i.custo ? brl(i.custo) : "a orçar"} | ${i.requisitos || "—"} | ${i.responsavel ? nome(i.responsavel) : "—"} |`),
        `| **Total** | | **${brl(itens.reduce((a, i) => a + i.custo, 0))}** | | |`].join("\n") : "_Sem itens._");
  }
  partes.push("## 8. Visão", ...secoesIndividuais(d).filter((x) => x.id === "visao").flatMap((sec) => sec.perguntas.map((q) => {
    const vozes = participantes(d).map((p) => getRespostas(d.id, p.id)[q.id]?.texto).filter(Boolean) as string[];
    return `**${q.texto}**\n${vozes.length ? vozes.map((v) => `- ${v.replace(/\s+/g, " ").slice(0, 600)}`).join("\n") : "_Sem respostas._"}`;
  })));
  partes.push("## 9. Reuniões", ...(["1", "2"] as const).map((n) => {
    const r = c.reunioes[n];
    return `### Reunião #${n}${r?.data ? ` — ${r.data.split("-").reverse().join("/")}` : ""}\n${r?.pauta ? rebaixar(rebaixar(r.pauta)) : "_Pauta ainda não gerada._"}`;
  }));
  const abertas = tarefas.filter((t) => t.status !== "done" && (t.title.startsWith("Diagnóstico ·") || t.title.startsWith("Marketing:") || Object.values(c.itens).flat().some((i) => i.tarefa === t.id)));
  partes.push("## 10. Pendências", abertas.length ? abertas.map((t) => `- ${t.title}${t.responsaveis.length ? ` — ${t.responsaveis.map(nome).join(", ")}` : ""}${t.prazo ? ` (${t.prazo.split("-").reverse().join("/")})` : ""}`).join("\n") : "_Nenhuma._");
  const texto = partes.filter(Boolean).join("\n\n");
  salvarDocumento(d, "pt", texto);
  return texto;
}

const SISTEMA_TRADUCAO = `Translate this Portuguese markdown document into clear, natural English for Lynn (an English speaker who leads the team's development). Keep the markdown structure, tables, names, numbers and dates exactly; translate "R$" amounts as they are. Keep these community words untranslated: dieta, Daime, Nipëi, Shuhu, Casa Cura, Yawa, Yawanawá, Guardiões, vekuxi, sharing. Do not summarise or add anything.
Answer with the translated markdown only.`;

/** English version: translated part by part (top-level sections) so long documents fit. */
export async function traduzirDocumento(d: Diagnostico): Promise<string> {
  const pt = getDocumento(d.id, "pt")?.texto ?? montarDocumento(d);
  const blocos = pt.split(/\n(?=## )/);
  const lotes: string[] = [];
  for (const b of blocos) {
    if (lotes.length && (lotes[lotes.length - 1] + b).length < 12000) lotes[lotes.length - 1] += `\n${b}`;
    else lotes.push(b);
  }
  const en: string[] = [];
  for (const l of lotes) {
    en.push(await chamarIATexto(SISTEMA_TRADUCAO, [{ type: "text", text: l }], 8000, 180_000));
  }
  const texto = en.join("\n\n");
  salvarDocumento(d, "en", texto);
  return texto;
}

// ---------------------------------------------------------------- D5: apply a template to another project

export function getModelos(): Modelo[] {
  const dir = path.join(vault(), DIR, "_modelos");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => getModelo(f.slice(0, -3))).filter((m): m is Modelo => !!m);
}

/** New assessment for a project from a template (e.g. Lynn's team-development for Inirau). Returns its id. */
export function criarDiagnostico(input: { modelo: string; projeto: string; titulo: string; evento: string; equipes: string[] }): string {
  if (!getModelo(input.modelo)) throw new Error("Modelo não encontrado");
  if (!getProjetos().some((p) => p.id === input.projeto)) throw new Error("Projeto não encontrado");
  const titulo = input.titulo.trim().slice(0, 150);
  if (!titulo) throw new Error("Informe o título");
  const equipes = input.equipes.filter((e) => getEquipes().some((x) => x.id === e));
  if (!equipes.length) throw new Error("Escolha ao menos uma equipe");
  let id = `${input.projeto}-${today().slice(0, 4)}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  for (let i = 2; fs.existsSync(path.join(vault(), DIR, id)); i++) id = `${input.projeto}-${today().slice(0, 4)}-${i}`;
  const fm = { id, type: "diagnostico", modelo: input.modelo, projeto: input.projeto, titulo, evento: input.evento.trim().slice(0, 150), equipes, status: "aberto", criado_em: today() };
  fs.mkdirSync(path.join(vault(), DIR, id), { recursive: true });
  fs.writeFileSync(path.join(vault(), DIR, id, "diagnostico.md"), `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n<!-- agente: nipei-os v2 (diagnóstico) -->\n# ${titulo}\n`, "utf-8");
  requestSync(vault());
  return id;
}

export function encerrarDiagnostico(d: Diagnostico, aberto: boolean) {
  const abs = path.join(vault(), DIR, d.id, "diagnostico.md");
  fs.writeFileSync(abs, fs.readFileSync(abs, "utf-8").replace(/^status: .*$/m, `status: ${aberto ? "aberto" : "encerrado"}`), "utf-8");
  requestSync(vault());
}
