import fs from "fs";
import path from "path";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import { buscarConhecimento, formatarConhecimento, getFatos, podeRevisar, revisarFato } from "./conhecimento";
import { getAlertas } from "./auditor";
import { agendaDoDia, pulso } from "./hoje";
import { missaoDaSemana } from "./missaoDados";
import {
  STATUS_RAW, anotarProjeto, can, comentar, createEvento, createTarefa, getEquipes, getEventos, getLancamentos, getObjetivos, getPessoas,
  getProjetos, getTarefaDetalhe, getTarefas, mudarTarefa, progresso, today, updateTarefa, vault,
  type Me, type Status, type Tarefa,
} from "./data";

// The Nipëi assistant (Equipe 1): one OpenRouter tool-calling loop over the platform's own getters
// (never a raw vault walk), available on every page. It knows who is talking and which page they are
// on. Reading tools run at once; changing tools are only PROPOSED: the proposal is stored with the
// conversation on the server, the person confirms the card, and executarAcao runs the STORED proposal
// (never one sent by the browser), re-checking permissions and writing through the normal writers.

export type Msg = { role: "user" | "assistant"; content: string };
export type Acao =
  | { tipo: "criar_tarefa"; titulo: string; prazo?: string; equipe?: string; responsaveis?: string[]; projeto?: string; prioridade?: string; descricao?: string }
  | { tipo: "mudar_status"; id: string; status: Status }
  | { tipo: "mudar_prazo"; id: string; prazo: string }
  | { tipo: "mudar_prioridade"; id: string; prioridade: string }
  | { tipo: "comentar"; id: string; texto: string }
  | { tipo: "atribuir"; id: string; pessoa: string }
  | { tipo: "criar_evento"; titulo: string; inicio: string; fim?: string; hora?: string; equipe: string }
  | { tipo: "nota_projeto"; projeto: string; texto: string }
  | { tipo: "revisar_fato"; id: string; decisao: "confirmar" | "descartar" }
  | { tipo: "enviar_whatsapp"; pessoa: string; texto: string };
export type AcaoProposta = Acao & { resumo: string; detalhe?: string };
export type Cartao = AcaoProposta & { estado: "pendente" | "feito" | "cancelado" | "erro"; erro?: string; link?: string };
export type MsgSalva = Msg & { em: string; cartoes?: Cartao[] };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
const PRIORIDADES = ["baixa", "média", "alta", "urgente"];
const MODELO = () => process.env.NIPEI_IA_MODEL || "anthropic/claude-haiku-5.5";
const s = (v: unknown) => (v == null ? "" : String(v).trim());
const n = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
const primeiro = (nome: string) => nome.split(" (")[0];

// ---------------------------------------------------------------- saved conversation (one per person)
// <vault>/.jobs/assistente/<pessoa>.json — private (outside git); follows the person across pages and devices.

const MAX_SALVAS = 40;
const ARQ = (id: string) => path.join(vault(), ".jobs", "assistente", `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
export function getConversa(id: string): MsgSalva[] {
  try { return JSON.parse(fs.readFileSync(ARQ(id), "utf-8")); } catch { return []; }
}
export function salvarConversa(id: string, msgs: MsgSalva[]) {
  fs.mkdirSync(path.dirname(ARQ(id)), { recursive: true });
  fs.writeFileSync(ARQ(id), JSON.stringify(msgs.slice(-MAX_SALVAS)), "utf-8");
}

// ---------------------------------------------------------------- helpers

const curta = (t: Tarefa, pessoas = getPessoas(), equipes = getEquipes()) => ({
  id: t.id, titulo: t.title, status: STATUS_RAW[t.status], prazo: t.prazo || null, prioridade: t.priority || null,
  equipe: equipes.find((e) => e.id === t.equipe)?.nome ?? null,
  responsaveis: t.responsaveis.map((r) => primeiro(pessoas.find((p) => p.id === r)?.name ?? r)),
});
function acharPessoa(q: string) {
  const ps = getPessoas();
  return ps.find((p) => p.id === q) ?? ps.find((p) => n(p.name).startsWith(n(q))) ?? ps.find((p) => p.apelido && n(p.apelido) === n(q)) ?? ps.find((p) => n(p.name).includes(n(q)));
}
// "Equipe 1" / "equipe 2" is how people name teams; the notes use ids equipe_1… and long names
const acharEquipe = (q: string) => { const num = n(q).match(/^equipe\s*_?(\d+)$/)?.[1]; return getEquipes().find((e) => e.id === q || (!!num && e.id === `equipe_${num}`) || n(e.nome).includes(n(q))); };
const dm = (iso: string) => (ISO.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso);
const acharProjeto = (q: string) => getProjetos().find((p) => p.id === q || n(p.nome).includes(n(q)));
const abertasDe = (f: (t: Tarefa) => boolean) => getTarefas().filter((t) => t.status !== "done" && f(t));
const contagem = (ts: Tarefa[], hoje = today()) => ({ abertas: ts.length, atrasadas: ts.filter((t) => t.prazo && t.prazo < hoje).length, sem_responsavel: ts.filter((t) => !t.responsaveis.length).length });

// ---------------------------------------------------------------- page context

/** What the person is looking at, in a few lines (so "esta tarefa", "este projeto" make sense). */
export function contextoPagina(me: Me, pagina: string): string {
  const [rota] = pagina.split("?");
  const p = rota.split("/").filter(Boolean);
  const hoje = today();
  if (p[0] === "tarefas" && p[1] && p[1] !== "nova") {
    const t = getTarefas().find((x) => x.id === p[1]);
    if (t) return `Página da tarefa ${JSON.stringify(curta(t))}. "Esta tarefa" = ${t.id}.`;
  }
  if (p[0] === "projetos" && p[1]) {
    const pr = getProjetos().find((x) => x.id === p[1]);
    if (pr) return `Página do projeto "${pr.nome}" (id ${pr.id}${p[2] === "visao" ? ", visão holística" : ""}): ${JSON.stringify(contagem(abertasDe((t) => t.projeto === pr.id)))}. "Este projeto" = ${pr.id}.`;
  }
  if (p[0] === "equipes" && p[1] && p[1] !== "sem-equipe") {
    const e = getEquipes().find((x) => x.id === p[1]);
    if (e) return `Página da equipe "${e.nome}" (id ${e.id}${p[2] === "reuniao" ? ", reunião da equipe" : ""}): ${JSON.stringify(contagem(abertasDe((t) => t.equipe === e.id)))}. "Esta equipe" = ${e.id}.`;
  }
  if (p[0] === "pessoas" && p[1]) {
    const pe = getPessoas().find((x) => x.id === p[1]);
    if (pe) return `Ficha de ${pe.name} (id ${pe.id}, função ${pe.funcao || "-"}): ${JSON.stringify(contagem(abertasDe((t) => t.responsaveis.includes(pe.id))))}. "Esta pessoa" = ${pe.id}.`;
  }
  if (p[0] === "eventos" && p[1]) {
    const ev = getEventos().find((x) => x.id === p[1]);
    if (ev) return `Página do evento "${ev.titulo}" (${ev.inicio}${ev.hora ? ` ${ev.hora}` : ""}).`;
  }
  const nomes: Record<string, string> = {
    hoje: "Hoje (o dia da pessoa)", agenda: "Agenda", equipes: "lista de Equipes", projetos: "lista de Projetos", objetivos: "Objetivos",
    pessoas: "lista de Pessoas", conhecimento: "Conhecimento (fatos e fontes)", financas: "Finanças", pulso: "Pulso das equipes", diagnosticos: "Diagnósticos", acervo: "Acervo",
  };
  return `Página: ${nomes[p[0] ?? "hoje"] ?? rota} (hoje ${hoje}).`;
}

// ---------------------------------------------------------------- tools

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });
const DATA = { type: "string", description: "AAAA-MM-DD" };

const TOOLS = [
  // read
  fn("minhas_tarefas", "Tarefas abertas da pessoa que fala com você.", { filtro: { type: "string", enum: ["atrasadas", "hoje", "proximas", "sem_data", "todas"] } }),
  fn("buscar_tarefas", "Busca tarefas por palavras, equipe, pessoa, projeto ou status. Use para achar o id antes de propor mudanças.", {
    texto: { type: "string" }, equipe: { type: "string", description: "nome ou id" }, pessoa: { type: "string", description: "nome ou id" }, projeto: { type: "string" },
    status: { type: "string", enum: ["todo", "doing", "done", "abertas"] }, sem_responsavel: { type: "boolean" }, atrasadas: { type: "boolean" },
  }),
  fn("ver_tarefa", "Detalhes de uma tarefa: descrição, checklist e atividade recente.", { id: { type: "string" } }, ["id"]),
  fn("agenda", "Eventos dos próximos dias (com hora quando houver).", { dias: { type: "number" } }),
  fn("buscar_conhecimento", "Base de conhecimento (fatos confirmados + notas antigas). Para perguntas sobre o santuário, retiros, regras, valores, pessoas, projetos, empresas.", { pergunta: { type: "string" } }, ["pergunta"]),
  fn("conhecimento_pendente", "Fatos propostos esperando revisão (com id) e alertas do auditor abertos.", { equipe: { type: "string" }, texto: { type: "string" } }),
  fn("pessoas", "Pessoas da comunidade: nome, id, equipes, função e carga de tarefas.", { texto: { type: "string" }, equipe: { type: "string" } }),
  fn("projetos", "Projetos: lista com números, ou detalhes de um (objetivos, atualizações, tarefas abertas).", { projeto: { type: "string", description: "nome ou id; vazio = todos" } }),
  fn("equipe", "Saúde de uma equipe: números, carga por membro, tarefas sem responsável.", { equipe: { type: "string" } }, ["equipe"]),
  fn("objetivos", "Objetivos do ano com progresso e equipe dona.", { ano: { type: "number" } }),
  fn("pulso_equipes", "Tarefas abertas, atrasadas e sem responsável por equipe.", {}),
  fn("missao_semana", "Progresso da Missão da semana da Equipe 1 (metas e números).", {}),
  fn("financas_resumo", "Resumo de entradas e despesas (por categoria e projeto) num período.", { de: DATA, ate: DATA }),
  // propose (the person confirms each card)
  fn("criar_tarefa", "PROPÕE criar uma tarefa. Para planejar várias, chame várias vezes.", {
    titulo: { type: "string" }, prazo: DATA, equipe: { type: "string" }, responsaveis: { type: "array", items: { type: "string" } },
    projeto: { type: "string" }, prioridade: { type: "string", enum: PRIORIDADES }, descricao: { type: "string" },
  }, ["titulo"]),
  fn("mudar_status", "PROPÕE mudar o status de uma tarefa.", { id: { type: "string" }, status: { type: "string", enum: ["todo", "doing", "done"] } }, ["id", "status"]),
  fn("mudar_prazo", "PROPÕE mudar o prazo de uma tarefa.", { id: { type: "string" }, prazo: DATA }, ["id", "prazo"]),
  fn("mudar_prioridade", "PROPÕE mudar a prioridade de uma tarefa.", { id: { type: "string" }, prioridade: { type: "string", enum: PRIORIDADES } }, ["id", "prioridade"]),
  fn("comentar", "PROPÕE comentar numa tarefa (use @Nome para avisar alguém).", { id: { type: "string" }, texto: { type: "string" } }, ["id", "texto"]),
  fn("atribuir", "PROPÕE adicionar um responsável a uma tarefa.", { id: { type: "string" }, pessoa: { type: "string", description: "nome ou id" } }, ["id", "pessoa"]),
  fn("criar_evento", "PROPÕE criar um evento na Agenda.", { titulo: { type: "string" }, inicio: DATA, fim: DATA, hora: { type: "string", description: "HH:MM" }, equipe: { type: "string" } }, ["titulo", "inicio", "equipe"]),
  fn("nota_projeto", "PROPÕE publicar uma atualização na linha do tempo de um projeto.", { projeto: { type: "string" }, texto: { type: "string" } }, ["projeto", "texto"]),
  fn("revisar_fato", "PROPÕE confirmar ou descartar um fato proposto do Conhecimento (id de conhecimento_pendente).", { id: { type: "string" }, decisao: { type: "string", enum: ["confirmar", "descartar"] } }, ["id", "decisao"]),
  fn("enviar_whatsapp", "PROPÕE enviar uma mensagem de WhatsApp pelo número do Nipëi a uma pessoa (a pessoa vê o texto antes).", { pessoa: { type: "string" }, texto: { type: "string" } }, ["pessoa", "texto"]),
];
const PROPOSTAS = new Set(["criar_tarefa", "mudar_status", "mudar_prazo", "mudar_prioridade", "comentar", "atribuir", "criar_evento", "nota_projeto", "revisar_fato", "enviar_whatsapp"]);

/** Runs a reading tool. */
function ler(me: Me, nome: string, a: Record<string, unknown>): unknown {
  const hoje = today();
  const pessoas = getPessoas(), equipes = getEquipes();
  if (nome === "minhas_tarefas") {
    const ts = abertasDe((t) => !!me.pessoa && t.responsaveis.includes(me.pessoa.id));
    const f = s(a.filtro) || "todas";
    const sel = f === "atrasadas" ? ts.filter((t) => t.prazo && t.prazo < hoje) : f === "hoje" ? ts.filter((t) => t.prazo === hoje)
      : f === "proximas" ? ts.filter((t) => t.prazo > hoje) : f === "sem_data" ? ts.filter((t) => !t.prazo) : ts;
    return { hoje, total: sel.length, tarefas: sel.slice(0, 25).map((t) => curta(t, pessoas, equipes)) };
  }
  if (nome === "buscar_tarefas") {
    const palavras = n(s(a.texto)).split(/\s+/).filter((w) => w.length > 2);
    const eq = s(a.equipe) ? acharEquipe(s(a.equipe)) : null;
    const pe = s(a.pessoa) ? acharPessoa(s(a.pessoa)) : null;
    const pr = s(a.projeto) ? acharProjeto(s(a.projeto)) : null;
    const st = s(a.status) || "abertas";
    const ts = getTarefas().filter((t) => (st === "abertas" ? t.status !== "done" : t.status === st)
      && (!eq || t.equipe === eq.id) && (!pe || t.responsaveis.includes(pe.id)) && (!pr || t.projeto === pr.id)
      && (!a.sem_responsavel || !t.responsaveis.length) && (!a.atrasadas || (!!t.prazo && t.prazo < hoje))
      && (!palavras.length || palavras.some((w) => n(t.title).includes(w))))
      .map((t) => ({ t, score: palavras.filter((w) => n(t.title).includes(w)).length }))
      .sort((x, y) => y.score - x.score);
    return { total: ts.length, tarefas: ts.slice(0, 20).map((x) => curta(x.t, pessoas, equipes)) };
  }
  if (nome === "ver_tarefa") {
    const d = getTarefaDetalhe(s(a.id));
    if (!d) return { erro: "tarefa não encontrada" };
    return { ...curta(d.tarefa, pessoas, equipes), projeto: d.tarefa.projeto || null, descricao: d.doc.descricao.slice(0, 2000), checklist: d.doc.checklist.map((c) => `${c.feito ? "[x]" : "[ ]"} ${c.texto}`), atividade: d.doc.atividade.slice(0, 10) };
  }
  if (nome === "agenda") {
    const dias = Math.min(60, Math.max(1, Number(a.dias) || 7));
    const ate = new Date(Date.parse(`${hoje}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
    const { hoje: deHoje } = agendaDoDia(me);
    return { hoje, deHoje: deHoje.map((e) => `${e.hora || ""} ${e.titulo}`.trim()), eventos: getEventos().filter((e) => e.inicio >= hoje.slice(0, e.inicio.length) && e.inicio <= ate).map((e) => ({ titulo: e.titulo, inicio: e.inicio, hora: e.hora || null, status: e.status })) };
  }
  if (nome === "buscar_conhecimento") {
    const p = s(a.pergunta);
    const fatos = buscarConhecimento(p, { limite: 8 });
    const rag = queryVaultGrounding(p).citations.filter((c) => !c.path.startsWith("Conhecimento/")).slice(0, 3);
    return { confirmados: formatarConhecimento(fatos) || "(nada confirmado)", notasAntigas: rag.map((c) => `${c.title}: ${c.snippet.slice(0, 500)}`) };
  }
  if (nome === "conhecimento_pendente") {
    const eq = s(a.equipe) ? acharEquipe(s(a.equipe)) : null;
    const palavras = n(s(a.texto)).split(/\s+/).filter((w) => w.length > 2);
    const props = getFatos().filter((f) => f.status === "proposto" && podeRevisar(me, f) && (!eq || f.equipe === eq.id) && (!palavras.length || palavras.some((w) => n(f.texto).includes(w))));
    return {
      total: props.length,
      fatos: props.slice(0, 15).map((f) => ({ id: f.id, texto: f.texto.slice(0, 300), equipe: equipes.find((e) => e.id === f.equipe)?.nome ?? null, fonte: f.fonte })),
      alertas_abertos: getAlertas().filter((x) => x.status === "aberta").length,
    };
  }
  if (nome === "pessoas") {
    const q = n(s(a.texto));
    const eq = s(a.equipe) ? acharEquipe(s(a.equipe)) : null;
    const abertas = abertasDe(() => true);
    return pessoas.filter((p) => p.equipes.length && (!eq || p.equipes.includes(eq.id)) && (!q || n(p.name).includes(q) || n(p.funcao).includes(q)))
      .slice(0, 30).map((p) => ({ id: p.id, nome: p.name, funcao: p.funcao, equipes: p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e), ...contagem(abertas.filter((t) => t.responsaveis.includes(p.id))) }));
  }
  if (nome === "projetos") {
    const pr = s(a.projeto) ? acharProjeto(s(a.projeto)) : null;
    if (!pr) return getProjetos().map((p) => ({ id: p.id, nome: p.nome, equipes: p.equipes.map((e) => equipes.find((x) => x.id === e)?.nome ?? e), ...contagem(abertasDe((t) => t.projeto === p.id)) }));
    const objs = getObjetivos().filter((o) => o.projeto === pr.id);
    const ts = abertasDe((t) => t.projeto === pr.id);
    return {
      id: pr.id, nome: pr.nome, descricao: pr.descricao.slice(0, 600), ...contagem(ts),
      objetivos: objs.map((o) => ({ titulo: o.titulo, ano: o.ano, progresso: progresso(o.id, getTarefas()) })),
      atualizacoes: pr.atualizacoes.slice(0, 6), tarefas: ts.slice(0, 15).map((t) => curta(t, pessoas, equipes)),
    };
  }
  if (nome === "equipe") {
    const e = acharEquipe(s(a.equipe));
    if (!e) return { erro: "equipe não encontrada" };
    const ts = abertasDe((t) => t.equipe === e.id);
    const membros = pessoas.filter((p) => p.equipes.includes(e.id));
    return {
      id: e.id, nome: e.nome, ...contagem(ts), coordenacao: e.coordenadores.map((c) => primeiro(pessoas.find((p) => p.id === c)?.name ?? c)),
      carga: membros.map((p) => ({ nome: primeiro(p.name), ...contagem(ts.filter((t) => t.responsaveis.includes(p.id))) })).sort((x, y) => y.abertas - x.abertas),
      sem_responsavel: ts.filter((t) => !t.responsaveis.length).slice(0, 10).map((t) => curta(t, pessoas, equipes)),
    };
  }
  if (nome === "objetivos") {
    const ano = Number(a.ano) || Number(hoje.slice(0, 4));
    return getObjetivos().filter((o) => o.ano === ano).map((o) => ({ titulo: o.titulo, equipe: equipes.find((e) => e.id === o.equipe)?.nome ?? null, dono_confirmado: o.donoConfirmado, projeto: o.projeto || null, progresso: progresso(o.id, getTarefas()) }));
  }
  if (nome === "pulso_equipes") return me.gestao ? pulso().linhas : { erro: "só a gestão vê o pulso" };
  if (nome === "missao_semana") {
    const m = missaoDaSemana(me);
    return m ? { titulo: m.missao.titulo, fim: m.missao.fim, dias_restantes: m.diasRestantes, total: `${m.total}%`, metas: m.metas.map((x) => ({ meta: x.id, valor: x.texto, progresso: `${x.pct}%` })) } : { erro: "nenhuma missão ativa" };
  }
  if (nome === "financas_resumo") {
    if (!me.gestao) return { erro: "só a gestão vê finanças" };
    const de = ISO.test(s(a.de)) ? s(a.de) : `${hoje.slice(0, 8)}01`, ate = ISO.test(s(a.ate)) ? s(a.ate) : hoje;
    const ls = getLancamentos().filter((l) => !l.anulado && l.data >= de && l.data <= ate);
    const somar = (f: (l: (typeof ls)[number]) => string) => ls.reduce<Record<string, number>>((acc, l) => { const k = `${l.tipo}:${f(l) || "-"}`; acc[k] = (acc[k] ?? 0) + l.valor; return acc; }, {});
    return {
      periodo: `${de} a ${ate}`, entradas: ls.filter((l) => l.tipo === "entrada").reduce((x, l) => x + l.valor, 0), despesas: ls.filter((l) => l.tipo === "despesa").reduce((x, l) => x + l.valor, 0),
      por_categoria: somar((l) => l.categoria), por_projeto: somar((l) => l.projeto), lancamentos: ls.length,
    };
  }
  return { erro: `ferramenta desconhecida: ${nome}` };
}

/** Validates a proposed change and describes it in plain words (or returns an error the model can fix). */
function validar(me: Me, nome: string, a: Record<string, unknown>): AcaoProposta | { erro: string } {
  if (nome === "criar_tarefa") {
    const titulo = s(a.titulo).slice(0, 200);
    const pr = s(a.projeto) ? acharProjeto(s(a.projeto)) : null;
    const equipe = s(a.equipe) ? acharEquipe(s(a.equipe))?.id ?? "" : pr?.equipes[0] ?? me.equipes[0] ?? "";
    if (!titulo) return { erro: "título vazio" };
    if (!can.criarEm(me, equipe)) return { erro: "sem permissão para criar nessa equipe" };
    const prazo = ISO.test(s(a.prazo)) ? s(a.prazo) : "";
    const resp = (Array.isArray(a.responsaveis) ? a.responsaveis : []).map((x) => acharPessoa(s(x))?.id).filter(Boolean) as string[];
    const responsaveis = resp.length ? resp : me.pessoa ? [me.pessoa.id] : [];
    const prioridade = PRIORIDADES.includes(s(a.prioridade)) ? s(a.prioridade) : "";
    const nomes = responsaveis.map((r) => primeiro(getPessoas().find((p) => p.id === r)?.name ?? r)).join(", ");
    return {
      tipo: "criar_tarefa", titulo, prazo, equipe, responsaveis, projeto: pr?.id ?? "", prioridade, descricao: s(a.descricao).slice(0, 2000),
      resumo: `Criar "${titulo}"`, detalhe: [prazo && `prazo ${dm(prazo)}`, nomes, getEquipes().find((e) => e.id === equipe)?.nome, pr?.nome, prioridade].filter(Boolean).join(" · "),
    };
  }
  if (nome === "criar_evento") {
    const titulo = s(a.titulo).slice(0, 150), inicio = s(a.inicio);
    const equipe = acharEquipe(s(a.equipe))?.id ?? "";
    if (!titulo || !ISO.test(inicio)) return { erro: "evento precisa de título e data AAAA-MM-DD" };
    if (!equipe || !can.gerirEquipe(me, equipe)) return { erro: "sem permissão para criar evento nessa equipe" };
    const fim = ISO.test(s(a.fim)) && s(a.fim) >= inicio ? s(a.fim) : "", hora = HORA.test(s(a.hora)) ? s(a.hora) : "";
    return { tipo: "criar_evento", titulo, inicio, fim, hora, equipe, resumo: `Evento "${titulo}"`, detalhe: [dm(inicio) + (fim ? ` → ${dm(fim)}` : ""), hora, getEquipes().find((e) => e.id === equipe)?.nome].filter(Boolean).join(" · ") };
  }
  if (nome === "nota_projeto") {
    const pr = acharProjeto(s(a.projeto)), texto = s(a.texto).slice(0, 500);
    if (!pr || !texto) return { erro: "projeto ou texto inválido" };
    if (!(me.gestao || pr.equipes.some((e) => me.coordena.includes(e)))) return { erro: "sem permissão nesse projeto" };
    return { tipo: "nota_projeto", projeto: pr.id, texto, resumo: `Atualização em ${pr.nome}`, detalhe: texto };
  }
  if (nome === "revisar_fato") {
    const f = getFatos().find((x) => x.id === s(a.id));
    const decisao = s(a.decisao) === "descartar" ? "descartar" : "confirmar";
    if (!f || f.status !== "proposto") return { erro: "fato não encontrado ou já revisado (use conhecimento_pendente)" };
    if (!podeRevisar(me, f)) return { erro: "sem permissão para revisar esse fato" };
    return { tipo: "revisar_fato", id: f.id, decisao, resumo: `${decisao === "confirmar" ? "Confirmar" : "Descartar"} fato`, detalhe: f.texto.slice(0, 240) };
  }
  if (nome === "enviar_whatsapp") {
    const p = acharPessoa(s(a.pessoa)), texto = s(a.texto).slice(0, 1500);
    if (!p || !texto) return { erro: "pessoa ou texto inválido" };
    if (!(me.gestao || can.gerirPessoa(me, p))) return { erro: "sem permissão para enviar a essa pessoa" };
    if (!p.whatsapp) return { erro: `${primeiro(p.name)} não tem WhatsApp na ficha` };
    return { tipo: "enviar_whatsapp", pessoa: p.id, texto, resumo: `WhatsApp para ${primeiro(p.name)}`, detalhe: texto };
  }
  const t = getTarefas().find((x) => x.id === s(a.id));
  if (!t) return { erro: "tarefa não encontrada: use buscar_tarefas para achar o id" };
  if (!can.editTarefa(me, t)) return { erro: "sem permissão para mudar essa tarefa" };
  if (nome === "mudar_status") {
    const st = s(a.status) as Status;
    if (!["todo", "doing", "done"].includes(st)) return { erro: "status inválido" };
    return { tipo: "mudar_status", id: t.id, status: st, resumo: `"${t.title}"`, detalhe: `${STATUS_RAW[t.status]} → ${STATUS_RAW[st]}` };
  }
  if (nome === "mudar_prazo") {
    if (!ISO.test(s(a.prazo))) return { erro: "prazo deve ser AAAA-MM-DD" };
    return { tipo: "mudar_prazo", id: t.id, prazo: s(a.prazo), resumo: `"${t.title}"`, detalhe: `prazo ${t.prazo ? dm(t.prazo) : "sem data"} → ${dm(s(a.prazo))}` };
  }
  if (nome === "mudar_prioridade") {
    if (!PRIORIDADES.includes(s(a.prioridade))) return { erro: "prioridade inválida" };
    return { tipo: "mudar_prioridade", id: t.id, prioridade: s(a.prioridade), resumo: `"${t.title}"`, detalhe: `prioridade ${t.priority || "-"} → ${s(a.prioridade)}` };
  }
  if (nome === "comentar") {
    const texto = s(a.texto).slice(0, 1000);
    if (!texto) return { erro: "comentário vazio" };
    return { tipo: "comentar", id: t.id, texto, resumo: `Comentar em "${t.title}"`, detalhe: texto };
  }
  if (nome === "atribuir") {
    const p = acharPessoa(s(a.pessoa));
    if (!p) return { erro: "pessoa não encontrada" };
    return { tipo: "atribuir", id: t.id, pessoa: p.id, resumo: `"${t.title}"`, detalhe: `+ ${primeiro(p.name)}` };
  }
  return { erro: "ação desconhecida" };
}

/** Executes a confirmed (server-stored) action; permissions are checked again. Returns a link when there is one. */
export async function executarAcao(me: Me, acao: Acao, quem: string): Promise<string> {
  const v = validar(me, acao.tipo, acao as unknown as Record<string, unknown>);
  if ("erro" in v) throw new Error(v.erro);
  if (v.tipo === "criar_tarefa") {
    const id = createTarefa({ title: v.titulo, equipe: v.equipe ?? "", prazo: v.prazo ?? "", responsaveis: v.responsaveis ?? [], projeto: v.projeto ?? "", objetivo: "", recorrencia: "", priority: v.prioridade || undefined }, quem, { descricao: v.descricao || undefined });
    return `/tarefas/${id}`;
  }
  if (v.tipo === "criar_evento") { createEvento({ titulo: v.titulo, inicio: v.inicio, fim: v.fim ?? "", status: "confirmado", equipe: v.equipe, hora: v.hora }); return "/agenda"; }
  if (v.tipo === "nota_projeto") { anotarProjeto(v.projeto, v.texto, quem); return `/projetos/${v.projeto}`; }
  if (v.tipo === "revisar_fato") {
    revisarFato(v.id, v.decisao, quem);
    if (v.decisao === "confirmar") { const { proporMudancas } = await import("./propostas"); void proporMudancas([v.id]).catch(() => {}); }
    return "/conhecimento";
  }
  if (v.tipo === "enviar_whatsapp") {
    const p = getPessoas().find((x) => x.id === v.pessoa)!;
    const { enviar } = await import("./notificar");
    await enviar(p, v.texto, "livre", quem);
    return `/pessoas/${p.id}`;
  }
  const t = getTarefas().find((x) => x.id === v.id)!;
  const base = { title: t.title, equipe: t.equipe, area: t.area, projeto: t.projeto, objetivo: t.objetivo, prazo: t.prazo, responsaveis: t.responsaveis, status: t.status, recorrencia: t.recorrencia };
  if (v.tipo === "mudar_status") updateTarefa(t.id, { ...base, status: v.status }, quem);
  if (v.tipo === "mudar_prazo") updateTarefa(t.id, { ...base, prazo: v.prazo }, quem);
  if (v.tipo === "mudar_prioridade") mudarTarefa(t.id, { priority: v.prioridade }, quem);
  if (v.tipo === "atribuir") updateTarefa(t.id, { ...base, responsaveis: [...new Set([...t.responsaveis, v.pessoa])] }, quem);
  if (v.tipo === "comentar") comentar(t.id, v.texto, quem);
  return `/tarefas/${t.id}`;
}

// ---------------------------------------------------------------- the conversation

const SISTEMA = (me: Me, lang: string, pagina: string) => {
  const p = me.pessoa;
  const equipes = getEquipes();
  const nomeEq = (id: string) => equipes.find((e) => e.id === id)?.nome ?? id;
  const dia = new Date(`${today()}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  return `Você é o assistente do Nipëi OS (Santuário Nipeihu, povo Yawanawá, Aldeia Mutum, Inirau): conhece a plataforma inteira e ajuda a consultar, planejar e executar.
Você fala com ${p ? primeiro(p.name) : me.username}${p?.funcao ? ` (${p.funcao})` : ""}${me.gestao ? ", da gestão (Equipe 1)" : ""}. Equipes: ${(p?.equipes ?? []).map(nomeEq).join(", ") || "-"}${me.coordena.length ? `; coordena: ${me.coordena.map(nomeEq).join(", ")}` : ""}.
Hoje é ${dia}, ${today()} (horário da Bahia). ${contextoPagina(me, pagina)}
Equipes da plataforma (as pessoas dizem "Equipe 1", "Equipe 2"…): ${equipes.map((e) => `${e.id.replace("equipe_", "Equipe ")} = ${e.nome}`).join("; ")}.
Responda no idioma da pessoa (padrão: ${lang === "en" ? "inglês" : "português do Brasil"}), curto e direto: 1 a 4 frases ou uma lista curta. Chame a pessoa pelo primeiro nome só de vez em quando.
Regras:
- Use as ferramentas para ler; nunca invente tarefas, datas, pessoas, valores ou fatos. Se não achar, diga.
- Nunca mostre ids internos (task_…, evt_…) para a pessoa: fale pelos títulos e nomes. Os ids são só para as ferramentas.
- Para mudar algo, chame a ferramenta correspondente: ela só PROPÕE e a pessoa confirma num cartão. Diga em uma frase o que propôs. Nunca diga que já fez.
- Para planejar (um retiro, uma semana, um projeto), proponha as tarefas uma a uma com criar_tarefa (máx. 8 por vez), com prazos e responsáveis coerentes.
- Antes de mudar uma tarefa, ache o id. Datas relativas ("sexta", "amanhã") viram AAAA-MM-DD a partir de hoje.
- "Esta tarefa / este projeto / esta equipe / esta pessoa" = o que está na página atual.
- WhatsApp: escreva a mensagem completa no idioma de quem recebe; ela só sai depois da confirmação.
- Sobre o santuário, retiros, regras e projetos, use buscar_conhecimento e diga se é confirmado ou de notas antigas.`;
};

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type ApiMsg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };

/** Saved messages → model history (the cards are told back as one line, so it knows what was decided). */
export function paraModelo(salvas: MsgSalva[]): Msg[] {
  return salvas.map((m) => ({
    role: m.role,
    content: m.content + (m.cartoes?.length ? `\n[propostas: ${m.cartoes.map((c) => `${c.resumo} (${c.estado})`).join("; ")}]` : ""),
  }));
}

/** One assistant turn: the model may read several times; changes come back as proposals to confirm. */
export async function conversar(me: Me, historico: Msg[], lang: string, pagina = "/hoje"): Promise<{ resposta: string; acoes: AcaoProposta[] }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("IA não configurada no servidor (OPENROUTER_API_KEY)");
  const msgs: ApiMsg[] = [{ role: "system", content: SISTEMA(me, lang, pagina) }, ...historico.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))];
  const acoes: AcaoProposta[] = [];
  for (let volta = 0; volta < 8; volta++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://os.nipeihu.app", "X-Title": "Nipei OS" },
      body: JSON.stringify({ model: MODELO(), temperature: 0.2, max_tokens: 2000, tools: TOOLS, messages: msgs }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`IA indisponível (${res.status})`);
    const m = (await res.json())?.choices?.[0]?.message as ApiMsg | undefined;
    if (!m) throw new Error("A IA não respondeu");
    const calls = m.tool_calls ?? [];
    if (!calls.length) return { resposta: s(m.content), acoes };
    msgs.push({ role: "assistant", content: m.content ?? null, tool_calls: calls });
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.function.arguments || "{}"); } catch { /* bad args → tool error below */ }
      let saida: unknown;
      if (PROPOSTAS.has(c.function.name)) {
        const v = acoes.length >= 8 ? { erro: "limite de 8 propostas por vez; peça para a pessoa confirmar estas primeiro" } : validar(me, c.function.name, args);
        if ("erro" in v) saida = v;
        else { acoes.push(v); saida = { proposta: v.resumo, aguardando_confirmacao: true }; }
      } else {
        try { saida = ler(me, c.function.name, args); } catch (e) { saida = { erro: (e as Error).message }; }
      }
      msgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(saida).slice(0, 12000) });
    }
  }
  return { resposta: acoes.length ? "" : "Não consegui concluir; tente perguntar de outro jeito.", acoes };
}
