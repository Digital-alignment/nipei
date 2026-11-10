import fs from "fs";
import path from "path";
import type { Equipe, Objetivo, Pessoa, Projeto, Tarefa } from "./data";
import { palavras } from "./conhecimento";

// Pessoas (DS 10.23): what a person is responsible for, "who knows about X", and the AI suggestions for "Completar fichas".

const n = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
// same words as the knowledge search (3-letter acronyms like ONG count, stop words don't)
const comum = (a: Set<string>, b: Set<string>) => [...a].filter((w) => b.has(w)).length;

export type Responsabilidades = { coordena: Equipe[]; lidera: Projeto[]; objetivos: Objetivo[]; procedimentos: { id: string; titulo: string; equipe: string }[] };

export function responsabilidades(p: Pessoa, d: { equipes: Equipe[]; projetos: Projeto[]; objetivos: Objetivo[]; procedimentos: { id: string; titulo: string; equipe: string; responsavel: string; arquivado: boolean }[] }): Responsabilidades {
  return {
    coordena: d.equipes.filter((e) => e.coordenadores.includes(p.id)),
    lidera: d.projetos.filter((x) => x.lider === p.id && x.status !== "concluido"),
    objetivos: d.objetivos.filter((o) => o.responsavel === p.id && o.status === "ativo"),
    procedimentos: d.procedimentos.filter((x) => x.responsavel === p.id && !x.arquivado),
  };
}

/** Who to ask about a subject: scored by "referente de", role, team topics, projects led, objectives owned and facts naming the person. Pure. */
export function quemSabe(assunto: string, d: { pessoas: Pessoa[]; equipes: Equipe[]; projetos: Projeto[]; objetivos: Objetivo[]; fatos: { texto: string; pessoas: string[] }[] }) {
  const q = palavras(assunto);
  if (!q.size) return [];
  return d.pessoas.filter((p) => !p.contato && !p.externo).map((p) => {
    const motivos: string[] = []; let pontos = 0;
    const ref = p.referenteDe.filter((r) => comum(q, palavras(r)) > 0);
    if (ref.length) { pontos += 3 * ref.length; motivos.push(`referente de ${ref.join(", ")}`); }
    if (p.funcao && comum(q, palavras(p.funcao))) { pontos += 2; motivos.push(`papel: ${p.funcao}`); }
    for (const e of d.equipes.filter((e) => (p.equipes.includes(e.id) || e.coordenadores.includes(p.id)) && comum(q, palavras(e.temas.join(" "))))) { pontos += e.coordenadores.includes(p.id) ? 2 : 1; motivos.push(`${e.coordenadores.includes(p.id) ? "coordena" : "equipe"} ${e.nome}`); }
    for (const x of d.projetos.filter((x) => x.lider === p.id && comum(q, palavras(`${x.nome} ${x.sobre.objetivo}`)))) { pontos += 2; motivos.push(`lidera ${x.nome}`); }
    for (const o of d.objetivos.filter((o) => o.responsavel === p.id && o.status === "ativo" && comum(q, palavras(o.titulo)))) { pontos += 2; motivos.push(`responsável por "${o.titulo}"`); }
    const fatos = d.fatos.filter((f) => f.pessoas.includes(p.id) && comum(q, palavras(f.texto))).length;
    if (fatos) { pontos += Math.min(3, fatos); motivos.push(`${fatos} fato(s) do Conhecimento`); }
    return { pessoa: p, pontos, motivos };
  }).filter((x) => x.pontos > 0).sort((a, b) => b.pontos - a.pontos).slice(0, 5);
}

// ---------------------------------------------------------------- AI suggestions (only preselect; nothing written until "Salvar fichas")
// <vault>/.jobs/sugestoes-pessoas.json: { pessoaId: { papel, equipe, referente: [] } }
export type SugestaoPessoa = { papel?: string; equipe?: string; referente?: string[] };
const ARQ = (vault: string) => path.join(vault, ".jobs", "sugestoes-pessoas.json");
export function getSugestoesPessoas(vault: string): Record<string, SugestaoPessoa> {
  try { return JSON.parse(fs.readFileSync(ARQ(vault), "utf-8")); } catch { return {}; }
}

const SISTEMA = `Você ajuda a gestão do Santuário Nipeihu (povo Yawanawá) a completar as fichas das pessoas da comunidade.
Para cada pessoa, a partir das tarefas, dos fatos do Conhecimento e das equipes, proponha:
- papel: o cargo ou função real em poucas palavras (ex.: "Coordenadora de retiros", "Engenheiro e arquiteto", "Cozinheira");
- equipe: o id de UMA equipe da lista, só se a pessoa ainda não tem equipe e ficar claro;
- referente: até 3 temas em que a pessoa é a referência (ex.: "rede elétrica", "rapé").
Se não houver informação suficiente para um campo, deixe vazio. Não invente.
Responda uma linha por pessoa, exatamente assim: id | papel | equipe | tema1, tema2`;

export async function sugerirFichas(vault: string, pessoas: Pessoa[], d: { equipes: Equipe[]; tarefas: Tarefa[]; fatos: { texto: string; pessoas: string[] }[]; projetos: Projeto[] }) {
  const { chamarIATexto } = await import("./ia");
  const out = getSugestoesPessoas(vault);
  const equipes = d.equipes.filter((e) => !e.contatos);
  const validas = new Set(equipes.map((e) => e.id));
  const catalogo = equipes.map((e) => `- ${e.id}: ${e.nome} (temas: ${e.temas.join(", ")})`).join("\n");
  for (let i = 0; i < pessoas.length; i += 12) { // small batches: the model also spends tokens reasoning
    const lote = pessoas.slice(i, i + 12).map((p) => {
      const ts = d.tarefas.filter((t) => t.responsaveis.includes(p.id)).slice(0, 12).map((t) => t.title).join("; ");
      const fs_ = d.fatos.filter((f) => f.pessoas.includes(p.id)).slice(0, 4).map((f) => f.texto.slice(0, 160)).join(" / ");
      const pr = d.projetos.filter((x) => x.lider === p.id).map((x) => x.nome).join(", ");
      return `## ${p.id} — ${p.name}\nequipes: ${p.equipes.join(", ") || "nenhuma"} · papel atual: ${p.funcao || "-"}${pr ? ` · lidera: ${pr}` : ""}\ntarefas: ${ts || "-"}\nfatos: ${fs_ || "-"}`;
    }).join("\n\n");
    const raw = await chamarIATexto(SISTEMA, [{ type: "text", text: `## Equipes\n${catalogo}\n\n# Pessoas\n${lote}` }], 8000, 150_000);
    const ids = new Set(pessoas.slice(i, i + 12).map((p) => p.id));
    for (const linha of raw.split(/\r?\n/)) {
      const [id, papel, equipe, temas] = linha.replace(/^[-*\s]+/, "").split("|").map((x) => (x ?? "").trim());
      if (!ids.has(id)) continue;
      out[id] = {
        papel: papel && papel !== "-" ? papel.slice(0, 80) : undefined,
        equipe: validas.has(equipe) ? equipe : undefined,
        referente: (temas ?? "").split(",").map((x) => x.trim()).filter((x) => x && x !== "-").slice(0, 3),
      };
    }
    fs.mkdirSync(path.dirname(ARQ(vault)), { recursive: true });
    fs.writeFileSync(ARQ(vault), JSON.stringify(out)); // after each batch
  }
  return out;
}

// self-check: npx tsx src/lib/v2/pessoasFicha.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/pessoasFicha.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  const P = (o: Partial<Pessoa>) => ({ id: "x", name: "X", equipes: [], coordena: [], funcao: "", referenteDe: [], contato: false, externo: false, ...o }) as Pessoa;
  const melo = P({ id: "melo", name: "Melo", referenteDe: ["rede elétrica", "bombas d'água"], equipes: ["e4"] });
  const bruna = P({ id: "bruna", name: "Bruna", funcao: "Coordenadora de retiros", equipes: ["e3"] });
  const d = {
    pessoas: [melo, bruna, P({ id: "c", contato: true, referenteDe: ["elétrica"] })],
    equipes: [{ id: "e4", nome: "Manutenção", temas: ["água, luz e energia"], coordenadores: [] }, { id: "e3", nome: "Guardiões", temas: ["retiros e eventos"], coordenadores: ["bruna"] }] as unknown as Equipe[],
    projetos: [] as Projeto[], objetivos: [] as Objetivo[], fatos: [{ texto: "Só o Melo conhece a rede elétrica", pessoas: ["melo"] }],
  };
  const r = quemSabe("quem cuida da rede elétrica?", d);
  assert(r[0]?.pessoa.id === "melo" && r.every((x) => x.pessoa.id !== "c"), `elétrica → Melo (sem contatos): ${r.map((x) => x.pessoa.id)}`);
  assert(quemSabe("organizar os retiros", d)[0]?.pessoa.id === "bruna", "retiros → Bruna");
  assert(quemSabe("", d).length === 0, "sem assunto");
  console.log("pessoasFicha: ok");
}
