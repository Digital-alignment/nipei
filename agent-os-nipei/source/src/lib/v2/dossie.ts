import { getAcervo, getEquipes, getEventos, getObjetivos, getPessoas, getProjetos, getTarefas, projetosVisiveis, today, type Me, type Projeto } from "./data";
import { getFatos, getFontes, palavras, projetosOcultos, registrarUsoFatos, semResposta, type Fato } from "./conhecimento";
import { avanco } from "./objetivos";
import { getMateriais, secaoMateriais } from "./materiais";

// Dossier: everything confirmed about a topic in ONE call, grouped, for an AI that has to produce something
// (slides, proposal, web text, welcome material). `buscar_conhecimento` returns 8 facts by shared words; this
// returns all of them, ordered, plus the projects' "Sobre", numbers and what the base doesn't know.
// "externo" = material for people outside the community: facts marked public on /conhecimento/publico (DS 10.28);
// a fact not classified yet falls back to the old rule (no contacts, Financeiro, Jurídico). Private projects never.

export type Para = "interno" | "externo";
const SO_INTERNO_PROJETOS = new Set(["financeiro", "juridico"]);
const TUDO = new Set(["santuario", "nipeihu", "nipei", "geral", "tudo", "todo", "base", "inteira"]);
/** Empty topic, or only words like "santuário nipeihu" / "tudo" = the whole base. */
const ehGeral = (alvo: Set<string>) => [...alvo].every((w) => TUDO.has(w));
const ORDEM_TIPO = ["valor", "decisao", "fato", "prazo", "procedimento", "contato"];
const ORDEM_USO = ["identidade", "historia", "oferta", "pessoas", "numeros", "precos", "regras", "procedimento", "outro", ""];
const ROTULO_TIPO: Record<string, string> = { valor: "valor", decisao: "decisão", prazo: "prazo", procedimento: "procedimento", contato: "contato" };
const LIMITE = 45_000;

/** Which confirmed facts go into the dossier (pure: easy to check). */
export function selecionarFatos(fatos: Fato[], tema: string, para: Para, ocultos: Set<string>, privados: Set<string>, projeto: Projeto | null, titulos: Map<string, string>): Fato[] {
  const alvo = palavras(tema), geral = ehGeral(alvo);
  const minimo = Math.max(1, Math.ceil(alvo.size / 3));
  return fatos.filter((f) => {
    if (f.status !== "confirmado") return false;
    if (f.projetos.some((p) => ocultos.has(p))) return false;
    if (para === "externo") {
      if (f.publico === false || f.projetos.some((p) => privados.has(p))) return false;
      if (f.publico === null && (f.tipo === "contato" || f.projetos.some((p) => SO_INTERNO_PROJETOS.has(p)))) return false;
    }
    if (geral) return true;
    if (projeto) return f.projetos.includes(projeto.id);
    const w = palavras(`${f.texto} ${titulos.get(f.fonte) ?? ""}`);
    return [...alvo].filter((x) => w.has(x)).length >= minimo;
  });
}

export async function montarDossie(me: Me, temaBruto: string, para: Para): Promise<string> {
  const tema = temaBruto.trim().slice(0, 200), hoje = today();
  const visiveis = projetosVisiveis(me);
  const n = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const geral = ehGeral(palavras(tema));
  const projeto = geral ? null : visiveis.find((p) => p.id === tema || (n(tema).length >= 4 && n(p.nome).includes(n(tema)))) ?? null;
  if (projeto && para === "externo" && (projeto.privado || SO_INTERNO_PROJETOS.has(projeto.id))) return `O projeto "${projeto.nome}" é interno: não entra em material externo.`;
  const privados = new Set(getProjetos().filter((p) => p.privado).map((p) => p.id));
  const titulos = new Map(getFontes().map((f) => [f.id, f.titulo]));
  const fatos = selecionarFatos(getFatos(), tema, para, projetosOcultos(me), privados, projeto, titulos);
  registrarUsoFatos(fatos.map((f) => f.id), "dossie");

  const nomeProjeto = new Map(getProjetos().map((p) => [p.id, p.nome]));
  const grupos = new Map<string, Fato[]>();
  for (const f of fatos) {
    const g = projeto ? projeto.nome : (f.projetos.map((p) => nomeProjeto.get(p)).find(Boolean) ?? "Geral");
    grupos.set(g, [...(grupos.get(g) ?? []), f]);
  }
  const rotulo = (f: Fato) => f.uso ? `(${f.uso}) ` : ROTULO_TIPO[f.tipo] ? `(${ROTULO_TIPO[f.tipo]}) ` : "";
  const linha = (f: Fato) => `- ${rotulo(f)}${f.texto.replace(/\s+/g, " ").trim()}${f.dataReferencia ? ` [ref. ${f.dataReferencia}]` : ""}`;
  const blocos = [...grupos].sort((a, b) => b[1].length - a[1].length).map(([g, fs]) =>
    `### ${g} (${fs.length})\n${[...fs].sort((a, b) => ORDEM_USO.indexOf(a.uso) - ORDEM_USO.indexOf(b.uso) || ORDEM_TIPO.indexOf(a.tipo) - ORDEM_TIPO.indexOf(b.tipo)).map(linha).join("\n")}`);

  // the projects this dossier touches: their "Sobre" (written by people) is the best narrative base
  const ids = projeto ? [projeto.id] : [...new Set(fatos.flatMap((f) => f.projetos))];
  const projs = visiveis.filter((p) => ids.includes(p.id) && p.status !== "concluido" && (para === "interno" || (!p.privado && !SO_INTERNO_PROJETOS.has(p.id))));
  const sobre = projs.map((p) => {
    const s = Object.entries(p.sobre).filter(([, v]) => v).map(([k, v]) => `  - ${k === "paraQuem" ? "para quem" : k === "comoMedimos" ? "como medimos" : k}: ${v.replace(/\s+/g, " ")}`);
    return s.length ? `- **${p.nome}** (${p.status})\n${s.join("\n")}` : "";
  }).filter(Boolean);

  const pessoas = getPessoas().filter((p) => !p.contato && p.equipes.length);
  const equipes = getEquipes().filter((e) => !e.contatos);
  const numeros = [
    `- ${equipes.length} equipes: ${equipes.map((e) => e.nome).join(", ")}`,
    `- ${pessoas.length} pessoas nas equipes`,
    `- ${visiveis.filter((p) => p.status === "ativo" && (para === "interno" || (!p.privado && !SO_INTERNO_PROJETOS.has(p.id)))).length} projetos ativos`,
    `- ${fatos.length} fatos confirmados neste dossiê`,
  ];

  const interno: string[] = [];
  if (para === "interno") {
    const tarefas = getTarefas();
    const objs = getObjetivos().filter((o) => o.status === "ativo" && (projeto ? o.projeto === projeto.id : ids.includes(o.projeto)));
    if (objs.length) interno.push(`## Objetivos ativos (interno)\n${objs.map((o) => { const a = avanco(o, tarefas); return `- ${o.titulo}${o.prazo ? ` · até ${o.prazo}` : ""}${a != null ? ` · ${Math.round(a)}%` : ""}`; }).join("\n")}`);
    const evs = getEventos().filter((e) => e.inicio >= hoje && e.inicio <= new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10)).slice(0, 15);
    if (evs.length) interno.push(`## Próximos eventos (120 dias, interno)\n${evs.map((e) => `- ${e.inicio}${e.fim && e.fim !== e.inicio ? ` → ${e.fim}` : ""}: ${e.titulo}`).join("\n")}`);
  }

  const alvo = palavras(tema);
  const acervo = getAcervo().filter((a) => (projeto ? a.projeto === projeto.id : geral || [...palavras(`${a.titulo} ${a.descricao}`)].some((w) => alvo.has(w))))
    .filter((a) => para === "interno" || !privados.has(a.projeto)).slice(0, 25);
  const lacunas = semResposta(90).filter((x) => geral || [...palavras(x.pergunta)].some((w) => alvo.has(w))).slice(0, 8);

  const partes = [
    `# Dossiê: ${projeto?.nome ?? (geral ? "Santuário Nipeihu (toda a base)" : tema)} · ${para === "externo" ? "para público EXTERNO" : "uso INTERNO"} · ${hoje}`,
    `Use só o que está aqui para escrever. O que faltar, não invente: marque [falta: …] e diga quem poderia saber. ${para === "externo" ? "Material externo: só fatos marcados como públicos (os ainda não classificados entram sem contatos, finanças e jurídico); projetos privados foram tirados." : "Material interno: pode conter procedimentos e números da gestão; não use em material público."}`,
    sobre.length ? `## Sobre os projetos (escrito pela equipe)\n${sobre.join("\n")}` : "",
    `## Números\n${numeros.join("\n")}`,
    secaoMateriais(await getMateriais(), projeto?.nome ?? tema, geral),
    `## Fatos confirmados\n${blocos.join("\n\n") || "(nada confirmado sobre este tema)"}`,
    ...interno,
    acervo.length ? `## Arquivos no Acervo (links do Google Drive; podem ser privados)\n${acervo.map((a) => `- ${a.titulo} (${a.tipo}${a.ano ? `, ${a.ano}` : ""}): ${a.url}`).join("\n")}` : "",
    lacunas.length ? `## O que a base ainda não sabe (perguntas sem resposta)\n${lacunas.map((x) => `- ${x.pergunta}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return partes.length > LIMITE ? `${partes.slice(0, LIMITE)}\n\n[dossiê cortado: peça um tema mais específico ou um projeto]` : partes;
}
