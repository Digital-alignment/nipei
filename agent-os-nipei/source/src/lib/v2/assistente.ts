import { queryVaultGrounding } from "@/lib/hermesRAG";
import { buscarConhecimento, formatarConhecimento } from "./conhecimento";
import { agendaDoDia, pulso } from "./hoje";
import {
  STATUS_RAW, can, comentar, createTarefa, getEquipes, getEventos, getPessoas, getTarefaDetalhe, getTarefas, today, updateTarefa,
  type Me, type Status, type Tarefa,
} from "./data";

// The Hoje assistant: one OpenRouter tool-calling loop over the platform's own getters (never a raw
// vault walk). Reading tools run at once; changing tools are only PROPOSED — the person confirms each
// card in the UI, and executarAcao re-checks permissions and writes through the normal writers.

export type Msg = { role: "user" | "assistant"; content: string };
export type Acao =
  | { tipo: "criar_tarefa"; titulo: string; prazo?: string; equipe?: string; responsaveis?: string[] }
  | { tipo: "mudar_status"; id: string; status: Status }
  | { tipo: "mudar_prazo"; id: string; prazo: string }
  | { tipo: "comentar"; id: string; texto: string }
  | { tipo: "atribuir"; id: string; pessoa: string };
export type AcaoProposta = Acao & { resumo: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MODELO = () => process.env.NIPEI_IA_MODEL || "anthropic/claude-haiku-5.5";
const s = (v: unknown) => (v == null ? "" : String(v).trim());

const curta = (t: Tarefa, pessoas = getPessoas(), equipes = getEquipes()) => ({
  id: t.id, titulo: t.title, status: STATUS_RAW[t.status], prazo: t.prazo || null,
  equipe: equipes.find((e) => e.id === t.equipe)?.nome ?? null,
  responsaveis: t.responsaveis.map((r) => pessoas.find((p) => p.id === r)?.name ?? r),
});

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

const TOOLS = [
  fn("minhas_tarefas", "Tarefas abertas da pessoa que fala com você.", { filtro: { type: "string", enum: ["atrasadas", "hoje", "proximas", "sem_data", "todas"] } }),
  fn("buscar_tarefas", "Busca tarefas da plataforma por palavras, equipe, pessoa ou status. Use para achar o id antes de propor mudanças.", {
    texto: { type: "string" }, equipe: { type: "string", description: "nome ou id da equipe" }, pessoa: { type: "string", description: "nome ou id" },
    status: { type: "string", enum: ["todo", "doing", "done", "abertas"] },
  }),
  fn("ver_tarefa", "Detalhes de uma tarefa: descrição, checklist e atividade recente.", { id: { type: "string" } }, ["id"]),
  fn("agenda", "Eventos dos próximos dias (com hora quando houver).", { dias: { type: "number" } }),
  fn("buscar_conhecimento", "Base de conhecimento do Nipëi (fatos confirmados pela gestão + notas antigas). Use para perguntas sobre o santuário, retiros, regras, valores, pessoas, projetos.", { pergunta: { type: "string" } }, ["pergunta"]),
  fn("pessoas", "Pessoas da comunidade: nome, id, equipes e função.", { texto: { type: "string" } }),
  fn("pulso_equipes", "Só gestão: tarefas abertas, atrasadas e sem responsável por equipe.", {}),
  fn("criar_tarefa", "PROPÕE criar uma tarefa (a pessoa confirma).", { titulo: { type: "string" }, prazo: { type: "string", description: "AAAA-MM-DD" }, equipe: { type: "string" }, responsaveis: { type: "array", items: { type: "string" } } }, ["titulo"]),
  fn("mudar_status", "PROPÕE mudar o status de uma tarefa (a pessoa confirma).", { id: { type: "string" }, status: { type: "string", enum: ["todo", "doing", "done"] } }, ["id", "status"]),
  fn("mudar_prazo", "PROPÕE mudar o prazo de uma tarefa (a pessoa confirma).", { id: { type: "string" }, prazo: { type: "string", description: "AAAA-MM-DD" } }, ["id", "prazo"]),
  fn("comentar", "PROPÕE comentar numa tarefa (a pessoa confirma).", { id: { type: "string" }, texto: { type: "string" } }, ["id", "texto"]),
  fn("atribuir", "PROPÕE adicionar um responsável a uma tarefa (a pessoa confirma).", { id: { type: "string" }, pessoa: { type: "string", description: "nome ou id" } }, ["id", "pessoa"]),
];

const PROPOSTAS = new Set(["criar_tarefa", "mudar_status", "mudar_prazo", "comentar", "atribuir"]);

/** Finds a person by id or (accent-insensitive) name prefix. */
function acharPessoa(q: string) {
  const n = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const ps = getPessoas();
  return ps.find((p) => p.id === q) ?? ps.find((p) => n(p.name).startsWith(n(q))) ?? ps.find((p) => n(p.name).includes(n(q)));
}
const acharEquipe = (q: string) => {
  const n = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return getEquipes().find((e) => e.id === q || n(e.nome).includes(n(q)));
};

/** Runs a reading tool. */
function ler(me: Me, nome: string, a: Record<string, unknown>): unknown {
  const hoje = today();
  if (nome === "minhas_tarefas") {
    const ts = getTarefas().filter((t) => t.status !== "done" && me.pessoa && t.responsaveis.includes(me.pessoa.id));
    const f = s(a.filtro) || "todas";
    const sel = f === "atrasadas" ? ts.filter((t) => t.prazo && t.prazo < hoje) : f === "hoje" ? ts.filter((t) => t.prazo === hoje)
      : f === "proximas" ? ts.filter((t) => t.prazo > hoje) : f === "sem_data" ? ts.filter((t) => !t.prazo) : ts;
    return { hoje, total: sel.length, tarefas: sel.slice(0, 25).map((t) => curta(t)) };
  }
  if (nome === "buscar_tarefas") {
    const n = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const palavras = n(s(a.texto)).split(/\s+/).filter((w) => w.length > 2);
    const eq = s(a.equipe) ? acharEquipe(s(a.equipe)) : null;
    const pe = s(a.pessoa) ? acharPessoa(s(a.pessoa)) : null;
    const st = s(a.status) || "abertas";
    const ts = getTarefas().filter((t) => (st === "abertas" ? t.status !== "done" : t.status === st)
      && (!eq || t.equipe === eq.id) && (!pe || t.responsaveis.includes(pe.id))
      && (!palavras.length || palavras.some((w) => n(t.title).includes(w))))
      .map((t) => ({ t, score: palavras.filter((w) => n(t.title).includes(w)).length }))
      .sort((x, y) => y.score - x.score).slice(0, 15).map((x) => curta(x.t));
    return { total: ts.length, tarefas: ts };
  }
  if (nome === "ver_tarefa") {
    const d = getTarefaDetalhe(s(a.id));
    if (!d) return { erro: "tarefa não encontrada" };
    return { ...curta(d.tarefa), descricao: d.doc.descricao.slice(0, 2000), checklist: d.doc.checklist.map((c) => `${c.feito ? "[x]" : "[ ]"} ${c.texto}`), atividade: d.doc.atividade.slice(0, 10) };
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
  if (nome === "pessoas") {
    const q = s(a.texto).toLowerCase();
    const eqs = getEquipes();
    return getPessoas().filter((p) => p.equipes.length && (!q || p.name.toLowerCase().includes(q) || p.funcao.toLowerCase().includes(q)))
      .slice(0, 30).map((p) => ({ id: p.id, nome: p.name, equipes: p.equipes.map((e) => eqs.find((x) => x.id === e)?.nome ?? e), funcao: p.funcao }));
  }
  if (nome === "pulso_equipes") return me.gestao ? pulso().linhas : { erro: "só a gestão vê o pulso" };
  return { erro: `ferramenta desconhecida: ${nome}` };
}

/** Validates a proposed change and describes it in plain words (or returns an error the model can fix). */
function validar(me: Me, nome: string, a: Record<string, unknown>): AcaoProposta | { erro: string } {
  const tarefa = (id: string) => getTarefas().find((t) => t.id === id);
  if (nome === "criar_tarefa") {
    const titulo = s(a.titulo).slice(0, 200);
    const equipe = s(a.equipe) ? acharEquipe(s(a.equipe))?.id ?? "" : me.equipes[0] ?? "";
    if (!titulo) return { erro: "título vazio" };
    if (!can.criarEm(me, equipe)) return { erro: "sem permissão para criar nessa equipe" };
    const prazo = ISO.test(s(a.prazo)) ? s(a.prazo) : "";
    const resp = (Array.isArray(a.responsaveis) ? a.responsaveis : []).map((x) => acharPessoa(s(x))?.id).filter(Boolean) as string[];
    const responsaveis = resp.length ? resp : me.pessoa ? [me.pessoa.id] : [];
    return { tipo: "criar_tarefa", titulo, prazo, equipe, responsaveis, resumo: `Criar "${titulo}"${prazo ? ` para ${prazo}` : ""}` };
  }
  const t = tarefa(s(a.id));
  if (!t) return { erro: "tarefa não encontrada: use buscar_tarefas para achar o id" };
  if (!can.editTarefa(me, t)) return { erro: "sem permissão para mudar essa tarefa" };
  if (nome === "mudar_status") {
    const st = s(a.status) as Status;
    if (!["todo", "doing", "done"].includes(st)) return { erro: "status inválido" };
    return { tipo: "mudar_status", id: t.id, status: st, resumo: `"${t.title}" → ${STATUS_RAW[st]}` };
  }
  if (nome === "mudar_prazo") {
    if (!ISO.test(s(a.prazo))) return { erro: "prazo deve ser AAAA-MM-DD" };
    return { tipo: "mudar_prazo", id: t.id, prazo: s(a.prazo), resumo: `"${t.title}": prazo ${t.prazo || "sem data"} → ${s(a.prazo)}` };
  }
  if (nome === "comentar") {
    const texto = s(a.texto).slice(0, 1000);
    if (!texto) return { erro: "comentário vazio" };
    return { tipo: "comentar", id: t.id, texto, resumo: `Comentar em "${t.title}": ${texto.slice(0, 80)}` };
  }
  if (nome === "atribuir") {
    const p = acharPessoa(s(a.pessoa));
    if (!p) return { erro: "pessoa não encontrada" };
    return { tipo: "atribuir", id: t.id, pessoa: p.id, resumo: `Adicionar ${p.name.split(" (")[0]} em "${t.title}"` };
  }
  return { erro: "ação desconhecida" };
}

/** Executes a confirmed action (permissions checked again: the card came from the browser). */
export function executarAcao(me: Me, acao: Acao, quem: string): string {
  const v = validar(me, acao.tipo, acao as unknown as Record<string, unknown>);
  if ("erro" in v) throw new Error(v.erro);
  if (v.tipo === "criar_tarefa") {
    const id = createTarefa({ title: v.titulo, equipe: v.equipe ?? "", prazo: v.prazo ?? "", responsaveis: v.responsaveis ?? [], projeto: "", objetivo: "", recorrencia: "" }, quem);
    return id;
  }
  const t = getTarefas().find((x) => x.id === v.id)!;
  const base = { title: t.title, equipe: t.equipe, area: t.area, projeto: t.projeto, objetivo: t.objetivo, prazo: t.prazo, responsaveis: t.responsaveis, status: t.status, recorrencia: t.recorrencia };
  if (v.tipo === "mudar_status") updateTarefa(t.id, { ...base, status: v.status }, quem);
  if (v.tipo === "mudar_prazo") updateTarefa(t.id, { ...base, prazo: v.prazo }, quem);
  if (v.tipo === "atribuir") updateTarefa(t.id, { ...base, responsaveis: [...new Set([...t.responsaveis, v.pessoa])] }, quem);
  if (v.tipo === "comentar") comentar(t.id, v.texto, quem);
  return t.id;
}

const SISTEMA = (me: Me, lang: string) => `Você é o assistente do Nipëi OS (Santuário Nipeihu, povo Yawanawá, Aldeia Mutum, Inirau), dentro da página Hoje.
Fala com ${me.pessoa?.name ?? me.username}${me.gestao ? " (gestão)" : ""}. Hoje é ${today()} (Bahia). Responda no idioma da pessoa (padrão: ${lang === "en" ? "inglês" : "português do Brasil"}), curto e direto: 1 a 4 frases ou uma lista curta.
Regras:
- Use as ferramentas para ler; nunca invente tarefas, datas, pessoas ou fatos. Se não achar, diga.
- Para mudar algo (criar, status, prazo, comentar, atribuir), chame a ferramenta correspondente: ela só PROPÕE; a pessoa confirma num cartão. Diga em uma frase o que propôs.
- Antes de mudar uma tarefa, ache o id com buscar_tarefas ou minhas_tarefas. Datas relativas ("sexta", "amanhã") viram AAAA-MM-DD a partir de hoje.
- Para perguntas sobre o santuário, retiros, regras e projetos, use buscar_conhecimento e diga se a informação é confirmada ou de notas antigas.`;

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type ApiMsg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };

/** One assistant turn: the model may read several times; changes come back as proposals to confirm. */
export async function conversar(me: Me, historico: Msg[], lang: string): Promise<{ resposta: string; acoes: AcaoProposta[] }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("IA não configurada no servidor (OPENROUTER_API_KEY)");
  const msgs: ApiMsg[] = [{ role: "system", content: SISTEMA(me, lang) }, ...historico.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))];
  const acoes: AcaoProposta[] = [];
  for (let volta = 0; volta < 6; volta++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://os.nipeihu.app", "X-Title": "Nipei OS" },
      body: JSON.stringify({ model: MODELO(), temperature: 0.2, max_tokens: 1500, tools: TOOLS, messages: msgs }),
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
        const v = validar(me, c.function.name, args);
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
