import fs from "fs";
import path from "path";
import { requestSync } from "@/lib/tarefaNote";
import { chamarIA } from "./ia";
import { getFatos, getFontes, palavras, type Fato } from "./conhecimento";
import {
  anotarProjeto, can, comentar, createTarefa, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, noteText, readDir, today,
  updateNote, updateTarefa, vault, type FmValue, type Me, type Tarefa,
} from "./data";

// K4 — when facts are confirmed, the AI proposes what should change in the platform because of them.
// Nothing is applied by itself: someone who may edit that task/project presses "Aplicar" (or edits first).
//
//   mudar_prazo     a task's due date            (tarefa, prazo)
//   nova_tarefa     a task that should exist      (titulo, equipe, prazo, projeto, objetivo, responsaveis)
//   comentar_tarefa new information for a task    (tarefa, texto) → goes into the task's activity
//   nota_projeto    news for a project            (projeto, texto) → "## Atualizações" in the project note
//
//   Conhecimento/Propostas/<id>.md

const DIR = path.join("Conhecimento", "Propostas");
export const TIPOS_PROPOSTA = ["mudar_prazo", "nova_tarefa", "comentar_tarefa", "nota_projeto"] as const;
export type TipoProposta = (typeof TIPOS_PROPOSTA)[number];

export type Proposta = {
  id: string; file: string; tipo: TipoProposta; fatos: string[]; tarefa: string; projeto: string; objetivo: string; equipe: string;
  prazo: string; titulo: string; responsaveis: string[]; texto: string; motivo: string;
  status: "aberta" | "aplicada" | "recusada"; criadoEm: string; decididoPor: string; decididoEm: string;
};

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const arr = (v: unknown) => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function getPropostas(): Proposta[] {
  return readDir(DIR).filter(({ fm }) => fm.type === "proposta").map(({ file, fm }) => ({
    id: s(fm.id), file, tipo: s(fm.tipo) as TipoProposta, fatos: arr(fm.fatos), tarefa: s(fm.tarefa), projeto: s(fm.projeto), objetivo: s(fm.objetivo),
    equipe: s(fm.equipe), prazo: s(fm.prazo), titulo: s(fm.titulo), responsaveis: arr(fm.responsaveis), texto: s(fm.texto), motivo: s(fm.motivo),
    status: (s(fm.status) || "aberta") as Proposta["status"], criadoEm: s(fm.criado_em), decididoPor: s(fm.decidido_por), decididoEm: s(fm.decidido_em),
  })).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

/** Who may decide a proposal: whoever may edit that task / create in that team; project notes are gestão. */
export function podeDecidir(me: Me, p: Proposta, tarefas: Tarefa[] = getTarefas()) {
  if (p.tipo === "nota_projeto") return me.gestao;
  if (p.tipo === "nova_tarefa") return can.criarEm(me, p.equipe);
  const t = tarefas.find((x) => x.id === p.tarefa);
  return !!t && can.editTarefa(me, t);
}

// ---------------------------------------------------------------- proposing

const SISTEMA = `Você ajuda a manter o Nipëi OS em dia. Responda em português do Brasil.
Você recebe FATOS recém-confirmados pela gestão, as TAREFAS abertas que parecem ligadas a eles e os PROJETOS.
Proponha só mudanças que os fatos tornam necessárias, com certeza:
- "mudar_prazo": o fato muda a data de uma tarefa existente → {"tarefa": id, "prazo": "AAAA-MM-DD"};
- "nova_tarefa": o fato pede um trabalho que nenhuma tarefa cobre → {"titulo", "equipe": id, "prazo": "AAAA-MM-DD"|"", "projeto": id|"", "objetivo": id|"", "responsaveis": [ids]};
- "comentar_tarefa": o fato traz informação útil para uma tarefa existente (valor, regra, contato, decisão) → {"tarefa": id, "texto"};
- "nota_projeto": o fato é uma novidade importante para um projeto → {"projeto": id, "texto"}.
Não repita o que a tarefa já diz. Não crie tarefa que já existe com outro nome. Use só ids das listas. No máximo 8 propostas; nenhuma se nada precisar mudar.
Cada proposta: {"tipo", "fatos": [ids dos fatos], "motivo": uma frase, ...campos do tipo}.
Responda APENAS com JSON: {"propostas": [...]}`;

const linhaTarefa = (t: Tarefa) => `- ${t.id}: ${t.title} [${t.statusRaw || "A fazer"}; prazo ${t.prazo || "sem"}; equipe ${t.equipe || "-"}; projeto ${t.projeto || "-"}; responsáveis ${t.responsaveis.join(", ") || "-"}]`;

/** Open tasks most related to these facts (shared words, team, project, objective, people). */
function tarefasLigadas(fatos: Fato[], todas: Tarefa[]) {
  const pf = fatos.map((f) => ({ w: palavras(f.texto), f }));
  return todas.filter((t) => t.status !== "done").map((t) => {
    const w = palavras(t.title);
    let score = 0;
    for (const { w: fw, f } of pf) {
      const comuns = [...w].filter((x) => fw.has(x)).length;
      score = Math.max(score, comuns / Math.max(1, Math.min(w.size, fw.size))
        + (f.equipe && f.equipe === t.equipe ? 0.1 : 0) + (t.projeto && f.projetos.includes(t.projeto) ? 0.2 : 0)
        + (t.objetivo && f.objetivos.includes(t.objetivo) ? 0.2 : 0) + (t.responsaveis.some((r) => f.pessoas.includes(r)) ? 0.1 : 0));
    }
    return { t, score };
  }).filter((x) => x.score >= 0.3).sort((a, b) => b.score - a.score).slice(0, 25).map((x) => x.t);
}

/** Proposes platform changes for newly confirmed facts. Never throws to the caller's flow; returns how many. */
export async function proporMudancas(fatoIds: string[]): Promise<number> {
  const fatos = getFatos().filter((f) => fatoIds.includes(f.id) && f.status === "confirmado").slice(0, 40);
  if (!fatos.length) return 0;
  const todas = getTarefas();
  const ligadas = tarefasLigadas(fatos, todas);
  const equipes = getEquipes(), projetos = getProjetos(), objetivos = getObjetivos(), pessoas = getPessoas().filter((p) => p.equipes.length);
  const fontes = new Map(getFontes().map((f) => [f.id, f.titulo]));
  const texto = [
    `Hoje: ${today()}`,
    "## Fatos recém-confirmados", ...fatos.map((f) => `- ${f.id} [${f.tipo}${f.dataReferencia ? `, ${f.dataReferencia}` : ""}] ${f.texto} (fonte: ${fontes.get(f.fonte) ?? f.fonte}; equipe ${f.equipe || "-"}; projetos ${f.projetos.join(", ") || "-"})`),
    "", "## Tarefas abertas ligadas", ...(ligadas.length ? ligadas.map(linhaTarefa) : ["(nenhuma)"]),
    "", "## Projetos", ...projetos.map((p) => `- ${p.id}: ${p.nome} — ${p.descricao.slice(0, 200)}`),
    "", "## Equipes", equipes.map((e) => `${e.id} (${e.nome})`).join("; "),
    "## Objetivos", objetivos.map((o) => `${o.id} (${o.ano}: ${o.titulo})`).join("; "),
    "## Pessoas", pessoas.map((p) => `${p.id} (${p.name})`).join("; "),
  ].join("\n");
  const { o } = await chamarIA(SISTEMA, [{ type: "text", text: texto }], 3000, 120_000);

  const ids = { tarefa: new Set(ligadas.map((t) => t.id)), fato: new Set(fatos.map((f) => f.id)), equipe: new Set(equipes.map((e) => e.id)),
    projeto: new Set(projetos.map((p) => p.id)), objetivo: new Set(objetivos.map((x) => x.id)), pessoa: new Set(pessoas.map((p) => p.id)) };
  const abertas = new Set(getPropostas().filter((p) => p.status === "aberta").map((p) => `${p.tipo}|${p.tarefa}|${p.projeto}|${p.prazo}|${p.titulo.toLowerCase()}`));
  const titulosAbertos = todas.filter((t) => t.status !== "done").map((t) => palavras(t.title));
  let n = 0;
  for (const x of ((Array.isArray(o.propostas) ? o.propostas : []) as Record<string, unknown>[]).slice(0, 8)) {
    const tipo = s(x.tipo) as TipoProposta;
    const p: Record<string, FmValue> = {
      tipo, fatos: arr(x.fatos).filter((f) => ids.fato.has(f)), tarefa: "", projeto: "", objetivo: "", equipe: "", prazo: "", titulo: "", responsaveis: [],
      texto: "", motivo: s(x.motivo).slice(0, 300),
    };
    if (!(p.fatos as string[]).length) continue;
    if (tipo === "mudar_prazo") {
      const t = ligadas.find((y) => y.id === s(x.tarefa));
      if (!t || !ISO.test(s(x.prazo)) || t.prazo === s(x.prazo)) continue;
      Object.assign(p, { tarefa: t.id, prazo: s(x.prazo), equipe: t.equipe });
    } else if (tipo === "nova_tarefa") {
      const titulo = s(x.titulo).slice(0, 200);
      const w = palavras(titulo);
      // skip if an open task already has (almost) the same words
      if (!titulo || titulosAbertos.some((tw) => { const c = [...w].filter((y) => tw.has(y)).length; return c / Math.max(1, Math.min(w.size, tw.size)) >= 0.7; })) continue;
      Object.assign(p, {
        titulo, equipe: ids.equipe.has(s(x.equipe)) ? s(x.equipe) : "", prazo: ISO.test(s(x.prazo)) ? s(x.prazo) : "",
        projeto: ids.projeto.has(s(x.projeto)) ? s(x.projeto) : "", objetivo: ids.objetivo.has(s(x.objetivo)) ? s(x.objetivo) : "",
        responsaveis: arr(x.responsaveis).filter((r) => ids.pessoa.has(r)),
      });
    } else if (tipo === "comentar_tarefa") {
      const t = ligadas.find((y) => y.id === s(x.tarefa));
      if (!t || !s(x.texto)) continue;
      Object.assign(p, { tarefa: t.id, texto: s(x.texto).slice(0, 600), equipe: t.equipe });
    } else if (tipo === "nota_projeto") {
      if (!ids.projeto.has(s(x.projeto)) || !s(x.texto)) continue;
      Object.assign(p, { projeto: s(x.projeto), texto: s(x.texto).slice(0, 600) });
    } else continue;
    const chave = `${p.tipo}|${p.tarefa}|${p.projeto}|${p.prazo}|${String(p.titulo).toLowerCase()}`;
    if (abertas.has(chave)) continue;
    abertas.add(chave);
    const id = `prp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    fs.mkdirSync(path.join(vault(), DIR), { recursive: true });
    fs.writeFileSync(path.join(vault(), DIR, `${tipo}_${id.slice(4)}.md`),
      noteText({ id, type: "proposta", ...p, status: "aberta", criado_em: new Date().toISOString(), decidido_por: "", decidido_em: "" }, `${p.motivo}\n\nFatos: ${(p.fatos as string[]).map((f) => `[[${f}]]`).join(", ")}`), "utf-8");
    n++;
  }
  if (n) requestSync(vault());
  return n;
}

// ---------------------------------------------------------------- deciding

/** Applies a proposal (optionally with the person's edits) through the normal writers, or refuses it. */
export function decidirProposta(id: string, aplicar: boolean, quem: string, ajuste: { prazo?: string; titulo?: string; texto?: string } = {}) {
  const p = getPropostas().find((x) => x.id === id && x.status === "aberta");
  if (!p) throw new Error("Proposta não encontrada");
  if (aplicar) {
    const prazo = ajuste.prazo && ISO.test(ajuste.prazo) ? ajuste.prazo : p.prazo;
    const texto = ajuste.texto?.trim().slice(0, 600) || p.texto;
    const origem = `(Conhecimento: ${p.motivo || "fato confirmado"})`;
    if (p.tipo === "mudar_prazo") {
      const t = getTarefas().find((x) => x.id === p.tarefa);
      if (!t) throw new Error("Tarefa não encontrada");
      updateTarefa(t.id, { title: t.title, equipe: t.equipe, area: t.area, projeto: t.projeto, objetivo: t.objetivo, prazo, responsaveis: t.responsaveis, status: t.status, recorrencia: t.recorrencia }, quem);
      comentar(t.id, `🧠 prazo atualizado ${origem}`, quem);
    } else if (p.tipo === "nova_tarefa") {
      createTarefa({ title: ajuste.titulo?.trim().slice(0, 200) || p.titulo, equipe: p.equipe, prazo, responsaveis: p.responsaveis, projeto: p.projeto, objetivo: p.objetivo, recorrencia: "" }, quem);
    } else if (p.tipo === "comentar_tarefa") {
      comentar(p.tarefa, `🧠 ${texto}`, quem);
    } else if (p.tipo === "nota_projeto") {
      anotarProjeto(p.projeto, texto, quem);
    }
  }
  updateNote(p.file, { status: aplicar ? "aplicada" : "recusada", decidido_por: quem, decidido_em: new Date().toISOString() });
}
