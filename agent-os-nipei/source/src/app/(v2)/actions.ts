"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/v2/i18n";
import { contarUso, proporIA, type ModoIA, type PropostaIA } from "@/lib/v2/ia";
import { criarFonte, getFatos, getFontes, podeRevisar, processarFonte, revisarFato } from "@/lib/v2/conhecimento";
import { ACOES, auditoriaSemanal, getAlertas, resolverAlerta, type Acao } from "@/lib/v2/auditor";
import { decidirProposta, getPropostas, podeDecidir, proporMudancas } from "@/lib/v2/propostas";
import {
  criarTarefasLacunas, definirResponsavel, enviarAoConhecimento, getColetivo, getDiagnostico, participa, participantes, podeEditarSecao,
  rascunhoColetivoIA, rascunhoIA, salvarColetivo, salvarRespostas, type Resposta,
  agendarReuniao, criarTarefasCalendario, criarTarefasItens, gerarCalendario, gerarPauta, itensSugeridos, salvarCalendario, salvarItens, salvarPeriodo, type Item,
  aceitarCodigo, gerarConsolidado, montarDocumento, publicarCodigo, rascunhoCodigo, salvarCodigo, traduzirDocumento,
  criarDiagnostico, encerrarDiagnostico,
} from "@/lib/v2/diagnostico";
import { pedirTrabalho } from "@/lib/v2/trabalhos";
import { RECORRENCIAS } from "@/lib/tarefaNote";
import {
  ACERVO_TIPOS, CATEGORIAS, addToEquipe, anularLancamento, can, createAcervo, createEvento, createLancamento, createPessoa, createTarefa,
  currentUser, getEquipes, getEventos, getObjetivos, getPessoas, getProjetos, getTarefas, setEquipeAcesso, setTarefaStatus,
  updateEvento, updateObjetivo, updateTarefa, type Status, mudarTarefa, today,
  addArquivo, addLink, aplicarSugestao, comentar, editChecklist, removeAnexo, setAvisosPessoa, setDescricao, setEquipeAvisos,
} from "@/lib/v2/data";

// Every action re-checks who is calling and what they may do (plan §4.4) — the hidden
// buttons in the UI are only a convenience, never the guard.
async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

/** How a person appears in a task's activity log: first name (or login). */
const actorName = (me: { username: string; pessoa: { name: string } | null }) => me.pessoa?.name.split(" (")[0] ?? me.username;

const pick = (v: FormDataEntryValue | null, allowed: string[]) => {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : "";
};
const recorrencia = (form: FormData) => pick(form.get("recorrencia"), [...RECORRENCIAS]);

const safeBack = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hoje";
};

export async function setStatusAction(form: FormData) {
  const me = await requireUser();
  const status = String(form.get("status")) as Status;
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  if (!t || !["todo", "doing", "done"].includes(status) || !can.editTarefa(me, t)) return;
  setTarefaStatus(t.id, status, actorName(me));
  revalidatePath("/", "layout");
  revalidatePath(`/tarefas/${t.id}`);
}

export async function createTarefaAction(form: FormData) {
  const me = await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const equipe = pick(form.get("equipe"), getEquipes().map((e) => e.id));
  if (!title || !can.criarEm(me, equipe)) return;
  const prazo = String(form.get("prazo") ?? "");
  const pessoas = getPessoas().map((p) => p.id);
  const projeto = pick(form.get("projeto"), getProjetos().map((p) => p.id));
  const objetivo = pick(form.get("objetivo"), getObjetivos().map((o) => o.id));
  const checklist = String(form.get("checklist") ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]|\[ ?x?\])\s*/i, "").trim().slice(0, 200)).filter(Boolean).slice(0, 30);
  const id = createTarefa({
    title,
    equipe,
    recorrencia: recorrencia(form),
    projeto,
    objetivo,
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : "",
    responsaveis: [...new Set(form.getAll("responsaveis").map(String))].filter((id) => pessoas.includes(id)),
    priority: pick(form.get("prioridade"), ["baixa", "média", "alta", "urgente"]) || undefined,
    area: pick(form.get("area"), getEquipes().find((e) => e.id === equipe)?.areas ?? []) || undefined,
  }, actorName(me), {
    descricao: String(form.get("descricao") ?? "").replace(/\r/g, "").trim().slice(0, 4000) || undefined,
    checklist: checklist.map((texto) => ({ feito: false, texto })),
  });
  revalidatePath("/", "layout");
  if (form.get("outra")) {
    // keep the context (team, project, objective, where to go back) for the next task
    const q = new URLSearchParams({ criada: id, ...(equipe ? { equipe } : {}), ...(projeto ? { projeto } : {}), ...(objetivo ? { objetivo } : {}), back: safeBack(form.get("back")) });
    redirect(`/tarefas/nova?${q}`);
  }
  redirect(safeBack(form.get("back")));
}

/** Adds a person to one or more teams (checkboxes send several `equipe`). */
export async function addToEquipeAction(form: FormData) {
  const me = await requireUser();
  const todas = getEquipes();
  const escolhidas = [...new Set(form.getAll("equipe").map(String))].filter((id) => {
    const e = todas.find((x) => x.id === id);
    // a management team gives full access to everything: only management can add people to it
    return !!e && can.gerirEquipe(me, id) && !(e.gestao && !me.gestao);
  });
  await tentar(async () => {
    if (!escolhidas.length) throw new Error("Escolha pelo menos uma equipe");
    for (const id of escolhidas) addToEquipe(String(form.get("pessoa")), id, actorName(me));
  });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- internal notes about a person (management only)

async function notasGestao(form: FormData) {
  const me = await requireUser();
  const { podeNotasInternas } = await import("@/lib/v2/notasInternas");
  if (!podeNotasInternas(me)) throw new Error("Só a gestão vê as notas internas");
  const pessoa = getPessoas().find((p) => p.id === String(form.get("pessoa")));
  if (!pessoa) throw new Error("Pessoa não encontrada");
  return { me, pessoa };
}

export async function notaInternaAction(form: FormData) {
  await tentar(async () => {
    const { me, pessoa } = await notasGestao(form);
    const n = await import("@/lib/v2/notasInternas");
    const texto = String(form.get("texto") ?? "");
    const nota = String(form.get("nota") ?? "");
    const modo = String(form.get("modo") ?? "nova");
    if (modo === "editar") n.editarNota(pessoa.id, nota, texto, actorName(me));
    else if (modo === "comentar") n.comentarNota(pessoa.id, nota, texto, actorName(me));
    else n.addNota(pessoa.id, texto, actorName(me));
  });
  revalidatePath("/", "layout");
}

/** Gestão: take a person out of a team. Guards: nobody removes themselves from management, and the
 *  management team never ends up empty (that would lock everyone out of the admin views). */
export async function removerDaEquipeAction(form: FormData) {
  const me = await requireUser();
  const pessoa = String(form.get("pessoa")), equipeId = String(form.get("equipe"));
  const e = getEquipes().find((x) => x.id === equipeId);
  await tentar(async () => {
    if (!me.gestao || !e) throw new Error("Só a gestão remove pessoas das equipes");
    if (e.gestao && pessoa === me.pessoa?.id) throw new Error("Você não pode tirar a si mesmo da gestão");
    if (e.gestao && e.membros.filter((m) => m !== pessoa).length === 0) throw new Error("A equipe de gestão não pode ficar vazia");
    const { removeFromEquipe } = await import("@/lib/v2/data");
    removeFromEquipe(pessoa, equipeId, actorName(me));
  });
  revalidatePath("/", "layout");
}

/** Gestão: send each selected person their own registration link (Notificar limits apply: it stops at the first limit). */
export async function cadastroLoteAction(form: FormData): Promise<{ enviados?: number; semWhats?: number; parou?: string; error?: string }> {
  const me = await requireUser();
  if (!me.gestao) return { error: "Só a gestão envia em lote" };
  const ids = [...new Set(form.getAll("ids").map(String))].slice(0, 30);
  const pessoas = getPessoas().filter((p) => ids.includes(p.id));
  const { enviar, textoLink } = await import("@/lib/v2/notificar");
  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  let enviados = 0, semWhats = 0, parou = "";
  for (const p of pessoas) {
    if (!p.whatsapp) { semWhats++; continue; }
    try { await enviar(p, textoLink(p, "cadastro", origin), "cadastro", actorName(me)); enviados++; }
    catch (e) { parou = (e as Error).message; if (/limite|Limite/.test(parou)) break; }
  }
  revalidatePath("/pessoas");
  return { enviados, semWhats, parou };
}

/** Gestão: suspend or restore someone's access (no login, no notices; teams and tasks stay). Never yourself. */
export async function suspensoAction(form: FormData) {
  const me = await requireUser();
  const pessoa = String(form.get("pessoa"));
  await tentar(async () => {
    if (!me.gestao) throw new Error("Só a gestão suspende acessos");
    if (pessoa === me.pessoa?.id) throw new Error("Você não pode suspender o próprio acesso");
    const { setSuspenso } = await import("@/lib/v2/data");
    setSuspenso(pessoa, form.get("suspenso") === "true", actorName(me));
  });
  revalidatePath("/", "layout");
}

/** Gestão: mark a note as an outside contact / group (or back to person). */
export async function externoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  const { setExterno } = await import("@/lib/v2/data");
  const pessoa = getPessoas().find((p) => p.id === String(form.get("pessoa")));
  await tentar(async () => {
    if (!pessoa) throw new Error("Pessoa não encontrada");
    const externo = form.get("externo") === "true";
    if (externo && pessoa.equipes.length) throw new Error("Tire a pessoa das equipes antes de marcar como contato externo");
    setExterno(pessoa.id, externo, actorName(me));
  });
  revalidatePath("/", "layout");
}

export async function funcaoAction(form: FormData) {
  const me = await requireUser();
  const p = getPessoas().find((x) => x.id === String(form.get("pessoa")));
  if (!p || !(me.gestao || can.gerirPessoa(me, p))) return;
  const { setFuncao } = await import("@/lib/v2/data");
  await tentar(async () => setFuncao(p.id, String(form.get("funcao") ?? ""), actorName(me)));
  revalidatePath("/", "layout");
}

export async function coordenacaoAction(form: FormData) {
  const me = await requireUser();
  const pessoa = String(form.get("pessoa")), equipeId = pick(form.get("equipe"), getEquipes().map((e) => e.id));
  await tentar(async () => {
    if (!me.gestao || !equipeId) throw new Error("Só a gestão muda a coordenação");
    const { setCoordenacao } = await import("@/lib/v2/data");
    setCoordenacao(pessoa, equipeId, form.get("coordena") === "true", actorName(me));
  });
  revalidatePath("/", "layout");
}

export async function createPessoaAction(form: FormData) {
  const me = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const equipe = pick(form.get("equipe"), getEquipes().map((e) => e.id));
  if (!name || !(equipe ? can.gerirEquipe(me, equipe) : me.gestao)) return;
  const id = createPessoa(name, equipe);
  revalidatePath("/", "layout");
  redirect(`/pessoas/${id}`);
}

export async function setEquipeAcessoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  setEquipeAcesso(String(form.get("equipe")), form.get("acesso") === "true");
  revalidatePath("/", "layout");
}

const isDate = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

/** Full edit of a task — also used to triage "Sem equipe" tasks into a team and to people. */
export async function updateTarefaAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  if (!t || !(can.editTarefa(me, t) || can.assumir(me, t))) return;
  const equipes = getEquipes().map((e) => e.id), pessoas = getPessoas().map((p) => p.id);
  const equipe = pick(form.get("equipe"), equipes);
  // Moving a task to another team needs rights there; only gestão may leave it without a team.
  if (equipe !== t.equipe && !(equipe ? can.criarEm(me, equipe) : me.gestao)) return;
  const status = String(form.get("status")) as Status;
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || t.title;
  updateTarefa(t.id, {
    title, equipe,
    area: equipe === t.equipe ? t.area : "", // an area belongs to the old team
    projeto: pick(form.get("projeto"), getProjetos().map((p) => p.id)),
    objetivo: pick(form.get("objetivo"), getObjetivos().map((o) => o.id)),
    prazo: isDate(form.get("prazo")),
    responsaveis: form.getAll("responsaveis").map(String).filter((id) => pessoas.includes(id)),
    status: ["todo", "doing", "done"].includes(status) ? status : t.status,
    recorrencia: form.has("recorrencia") ? recorrencia(form) : t.recorrencia,
  }, actorName(me));
  revalidatePath("/", "layout");
  redirect(safeBack(form.get("back")));
}

const eventoInput = (form: FormData) => {
  const inicio = isDate(form.get("inicio")), fim = isDate(form.get("fim"));
  return {
    titulo: String(form.get("titulo") ?? "").trim().slice(0, 150),
    inicio, fim: fim && inicio && fim >= inicio ? fim : "",
    status: form.get("status") === "confirmado" ? "confirmado" : "a_confirmar",
    equipe: pick(form.get("equipe"), getEquipes().map((e) => e.id)),
    hora: /^\d{2}:\d{2}$/.test(String(form.get("hora") ?? "")) ? String(form.get("hora")) : "",
  };
};

export async function createEventoAction(form: FormData) {
  const me = await requireUser();
  const input = eventoInput(form);
  if (!input.titulo || !input.equipe || !can.gerirEquipe(me, input.equipe)) return;
  createEvento(input);
  revalidatePath("/", "layout");
  redirect("/agenda");
}

export async function updateEventoAction(form: FormData) {
  const me = await requireUser();
  const e = getEventos().find((x) => x.id === String(form.get("id")));
  const input = eventoInput(form);
  // Keeping the old date when the field is cleared avoids wiping "2027-01" (month only) by accident.
  if (!e || !input.titulo || !can.editEvento(me, e) || (input.equipe !== e.equipe && !can.gerirEquipe(me, input.equipe))) return;
  updateEvento(e.id, { ...input, inicio: input.inicio || e.inicio, equipe: input.equipe || e.equipe });
  revalidatePath("/", "layout");
  redirect(safeBack(form.get("back")));
}

export async function updateObjetivoAction(form: FormData) {
  const me = await requireUser();
  if (!can.editObjetivo(me)) return;
  const equipes = getEquipes().map((e) => e.id);
  const equipe = pick(form.get("equipe"), equipes);
  if (!equipe) return;
  updateObjetivo(String(form.get("id")), {
    equipe,
    apoio: form.getAll("apoio").map(String).filter((id) => equipes.includes(id) && id !== equipe),
  });
  revalidatePath("/", "layout");
  redirect(safeBack(form.get("back")));
}

// ---------------------------------------------------------------- task detail (T1)

/** The task and whether the caller may change it (comments are open to anyone who can see it). */
async function tarefaEditavel(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  return { me, t, pode: !!t && (can.editTarefa(me, t) || can.assumir(me, t)) };
}
const voltarTarefa = (id: string) => revalidatePath(`/tarefas/${id}`);

export async function descricaoAction(form: FormData) {
  const { me, t, pode } = await tarefaEditavel(form);
  if (!t || !pode) return;
  setDescricao(t.id, String(form.get("descricao") ?? "").slice(0, 20000), actorName(me));
  voltarTarefa(t.id);
}

export async function checklistAction(form: FormData) {
  const { me, t, pode } = await tarefaEditavel(form);
  if (!t || !pode) return;
  const op = String(form.get("op"));
  if (op === "add") editChecklist(t.id, actorName(me), { tipo: "add", texto: String(form.get("texto") ?? "").slice(0, 300) });
  else if (op === "toggle" || op === "remove") editChecklist(t.id, actorName(me), { tipo: op, idx: Number(form.get("idx")) });
  voltarTarefa(t.id);
}

export async function comentarAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  const texto = String(form.get("texto") ?? "").trim();
  if (!t || !texto) return;
  comentar(t.id, texto, actorName(me));
  voltarTarefa(t.id);
}

export async function linkAction(form: FormData) {
  const { me, t, pode } = await tarefaEditavel(form);
  const url = String(form.get("url") ?? "").trim();
  if (!t || !pode || !/^https?:\/\/\S+$/.test(url)) return;
  addLink(t.id, String(form.get("titulo") ?? "").trim().slice(0, 150), url, actorName(me), me.pessoa?.id ?? me.username);
  voltarTarefa(t.id);
}

/** Returns an error message for the upload widget instead of throwing (the user sees why it failed). */
export async function uploadAction(form: FormData): Promise<{ error?: string }> {
  const { me, t, pode } = await tarefaEditavel(form);
  if (!t || !pode) return { error: "Sem permissão" };
  const file = form.get("arquivo");
  if (!(file instanceof File) || !file.size) return { error: "Nenhum arquivo" };
  try {
    addArquivo(t.id, { nome: file.name, bytes: Buffer.from(await file.arrayBuffer()) }, actorName(me), me.pessoa?.id ?? me.username);
  } catch (e) {
    return { error: (e as Error).message };
  }
  voltarTarefa(t.id);
  return {};
}

export async function removeAnexoAction(form: FormData) {
  const { me, t, pode } = await tarefaEditavel(form);
  if (!t || !pode) return;
  removeAnexo(t.id, String(form.get("anexo")), actorName(me));
  voltarTarefa(t.id);
}

// ---------------------------------------------------------------- task AI (T2)

export async function proporIAAction(id: string, modo: ModoIA): Promise<{ proposta?: PropostaIA; error?: string }> {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === id);
  if (!t || !can.usarIA(me, t)) return { error: "Sem permissão para usar a IA nesta tarefa" };
  if (!["detalhar", "proximo", "atualizar"].includes(modo)) return { error: "Modo inválido" };
  try {
    return { proposta: await proporIA(id, modo, me.username) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function fazerPorMimAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  if (!t || !can.usarIA(me, t)) return;
  try {
    pedirTrabalho(t.id, String(form.get("instrucao") ?? ""), me.pessoa?.id ?? me.username, actorName(me));
  } catch { /* already running: the page shows the banner */ }
  voltarTarefa(t.id);
}

const ORIGEM_IA: Record<string, string> = { detalhar: "Explicar e detalhar", proximo: "O que fazer agora", atualizar: "Atualizar com anexos" };

export async function aplicarIAAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  if (!t || !can.usarIA(me, t)) return;
  const status = String(form.get("status") ?? "");
  const prazo = String(form.get("prazo") ?? "");
  aplicarSugestao(t.id, `${actorName(me)} (IA)`, {
    descricao: form.get("usarDescricao") ? String(form.get("descricao") ?? "").slice(0, 20000) : null,
    adicionar: form.getAll("adicionar").map(String).map((x) => x.slice(0, 300)),
    concluir: form.getAll("concluir").map(String),
    status: form.get("usarStatus") && ["todo", "doing", "done"].includes(status) ? (status as Status) : null,
    prazo: form.get("usarPrazo") && /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : null,
    proximo: form.get("usarProximo") ? String(form.get("proximo") ?? "").trim() || null : null,
    origem: `${ORIGEM_IA[String(form.get("modo"))] ?? "IA"} · ${String(form.get("modelo") ?? "").slice(0, 60)}`,
  });
  voltarTarefa(t.id);
}

export async function createLancamentoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  const tipo = form.get("tipo") === "entrada" ? "entrada" : "despesa";
  // "1.234,56" (pt-BR) or "1234.56"
  const raw = String(form.get("valor") ?? "").replace(/\s|R\$/g, "");
  const valor = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  const data = String(form.get("data") ?? "");
  if (!(valor > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  createLancamento({
    tipo, valor, data,
    categoria: pick(form.get("categoria"), [...CATEGORIAS[tipo]]) || CATEGORIAS[tipo][CATEGORIAS[tipo].length - 1],
    descricao: String(form.get("descricao") ?? "").trim().slice(0, 200),
    projeto: pick(form.get("projeto"), getProjetos().map((p) => p.id)),
    equipe: pick(form.get("equipe"), getEquipes().map((e) => e.id)),
    registradoPor: me.pessoa?.id ?? me.username,
  });
  revalidatePath("/financas");
  redirect(`/financas?m=${data.slice(0, 7)}`);
}

export async function anularLancamentoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  anularLancamento(String(form.get("id")), me.pessoa?.id ?? me.username);
  revalidatePath("/financas");
}

export async function createAcervoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao && me.coordena.length === 0) return;
  const url = String(form.get("url") ?? "").trim();
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 150);
  if (!titulo || !/^https:\/\/\S+$/.test(url)) return;
  const ano = String(form.get("ano") ?? "");
  createAcervo({
    titulo, url,
    tipo: pick(form.get("tipo"), [...ACERVO_TIPOS]) || "outros",
    projeto: pick(form.get("projeto"), getProjetos().map((p) => p.id)),
    ano: /^\d{4}$/.test(ano) ? ano : "",
    descricao: String(form.get("descricao") ?? "").trim().slice(0, 300),
  }, me.pessoa?.id ?? me.username);
  revalidatePath("/acervo");
}

export async function setEquipeAvisosAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  setEquipeAvisos(String(form.get("equipe")), form.get("avisos") === "true");
  revalidatePath("/", "layout");
}

/** A person switches their own WhatsApp notices; gestão can do it for anyone. */
export async function setAvisosPessoaAction(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("pessoa"));
  if (!(me.gestao || me.pessoa?.id === id)) return;
  setAvisosPessoa(id, form.get("ligado") === "true");
  revalidatePath(`/pessoas/${id}`);
}

export async function toggleLangAction() {
  const jar = await cookies();
  jar.set(LANG_COOKIE, jar.get(LANG_COOKIE)?.value === "en" ? "pt" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------------------------------------------------------------- Conhecimento (K1)

const fonteFeita = (id: string) => {
  // the AI reads the source in the background (≈ 30 s); the page refreshes itself while "processando"
  void processarFonte(id);
  revalidatePath("/conhecimento", "layout");
};

export async function enviarFonteArquivoAction(form: FormData): Promise<{ error?: string }> {
  const me = await requireUser();
  const file = form.get("arquivo");
  if (!(file instanceof File) || !file.size) return { error: "Nenhum arquivo" };
  try {
    contarUso(me.pessoa?.id ?? me.username);
    fonteFeita(criarFonte({ tipo: "arquivo", titulo: file.name.replace(/\.[^.]+$/, ""), nome: file.name, bytes: Buffer.from(await file.arrayBuffer()), por: me.pessoa?.id ?? me.username }));
  } catch (e) {
    return { error: (e as Error).message };
  }
  return {};
}

export async function enviarFonteAction(form: FormData) {
  const me = await requireUser();
  const url = String(form.get("url") ?? "").trim();
  const texto = String(form.get("texto") ?? "");
  const titulo = String(form.get("titulo") ?? "").trim();
  if (!url && !texto.trim()) return;
  contarUso(me.pessoa?.id ?? me.username);
  const por = me.pessoa?.id ?? me.username;
  const id = url ? criarFonte({ tipo: "link", url, titulo, por }) : criarFonte({ tipo: "texto", texto, titulo, por });
  fonteFeita(id);
  redirect(`/conhecimento/${id}`);
}

export async function reprocessarFonteAction(form: FormData) {
  const me = await requireUser();
  const f = getFontes().find((x) => x.id === String(form.get("id")));
  if (!f || !(me.gestao || f.enviadoPor === (me.pessoa?.id ?? me.username))) return;
  contarUso(me.pessoa?.id ?? me.username);
  fonteFeita(f.id);
}

export async function revisarFatoAction(form: FormData) {
  const me = await requireUser();
  const acao = pick(form.get("acao"), ["confirmar", "descartar"]) as "confirmar" | "descartar" | "";
  const ids = form.getAll("id").map(String);
  const alertas = getAlertas().filter((a) => a.status === "aberta");
  const comAlerta = new Set(alertas.map((a) => a.fato));
  // "confirm all" leaves out facts with an open alert: those are decided in the alert
  const fatos = getFatos().filter((f) => ids.includes(f.id) && f.status === "proposto" && podeRevisar(me, f) && (ids.length === 1 || !comAlerta.has(f.id)));
  if (!acao) return;
  // one fact may come with an edited text; "confirm all" sends several ids and no text
  const texto = ids.length === 1 ? String(form.get("texto") ?? "") : undefined;
  for (const f of fatos) {
    revisarFato(f.id, acao, actorName(me), texto);
    // discarding the fact settles its alerts
    if (acao === "descartar") for (const a of alertas.filter((x) => x.fato === f.id)) resolverAlerta(a.id, "eliminar", actorName(me));
  }
  // K4: newly confirmed facts may change tasks/projects → proposals (in the background, ≈ 20 s; after saving, so they read as confirmed)
  if (acao === "confirmar" && fatos.length) void proporMudancas(fatos.map((f) => f.id)).catch((e) => console.warn("[propostas]", (e as Error).message));
  revalidatePath("/conhecimento", "layout");
}

export async function resolverAlertaAction(form: FormData) {
  const me = await requireUser();
  const a = getAlertas().find((x) => x.id === String(form.get("id")) && x.status === "aberta");
  const fato = a && getFatos().find((f) => f.id === a.fato);
  const acao = pick(form.get("acao"), [...ACOES]) as Acao | "";
  if (!a || !acao || !(fato ? podeRevisar(me, fato) : me.gestao)) return;
  resolverAlerta(a.id, acao, actorName(me), String(form.get("texto") ?? ""));
  if (acao === "substituir" || acao === "editar") void proporMudancas([a.fato]).catch((e) => console.warn("[propostas]", (e as Error).message));
  revalidatePath("/conhecimento", "layout");
}

export async function auditarAgoraAction() {
  const me = await requireUser();
  if (!me.gestao) return;
  void auditoriaSemanal(true);
  revalidatePath("/conhecimento", "layout");
}

export async function decidirPropostaAction(form: FormData) {
  const me = await requireUser();
  const p = getPropostas().find((x) => x.id === String(form.get("id")) && x.status === "aberta");
  if (!p || !podeDecidir(me, p)) return;
  decidirProposta(p.id, form.get("acao") === "aplicar", actorName(me), {
    prazo: String(form.get("prazo") ?? ""), titulo: String(form.get("titulo") ?? ""), texto: String(form.get("texto") ?? ""),
  });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Diagnóstico (D1): only the person writes their own answers

export async function salvarRespostasAction(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  if (!d || !me.pessoa || !participa(d, me.pessoa)) return;
  const responder = form.get("acao") === "responder";
  const novas: Record<string, Partial<Resposta>> = {};
  for (const [k, v] of form.entries()) {
    if (!k.startsWith("r:")) continue;
    const texto = String(v).trim();
    novas[k.slice(2)] = { texto, ...(responder && texto ? { status: "respondida" as const } : {}) };
  }
  salvarRespostas(d, me.pessoa.id, novas);
  revalidatePath("/", "layout");
}

export async function rascunhoIAAction(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  if (!d || !me.pessoa || !participa(d, me.pessoa)) return;
  await tentar(async () => { contarUso(me.pessoa!.id); await rascunhoIA(d, me.pessoa!.id, String(form.get("secao"))); });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Diagnóstico (D2): collective part

async function secaoEditavel(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  const secao = String(form.get("secao") ?? "");
  if (!d || !podeEditarSecao(me, getColetivo(d.id), secao)) return null;
  return { me, d, secao };
}

export async function definirResponsavelAction(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  const pessoa = String(form.get("pessoa") ?? "");
  if (!d || !me.gestao || (pessoa && !participantes(d).some((p) => p.id === pessoa))) return;
  definirResponsavel(d, String(form.get("secao")), pessoa);
  revalidatePath("/diagnosticos", "layout");
}

export async function salvarColetivoAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  const responder = form.get("acao") === "responder";
  const novas: Record<string, { texto: string; falta?: string; responder?: boolean }> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("r:")) novas[k.slice(2)] = { ...novas[k.slice(2)], texto: String(v), responder };
    if (k.startsWith("f:")) novas[k.slice(2)] = { ...(novas[k.slice(2)] ?? { texto: "" }), falta: String(v) };
  }
  salvarColetivo(ok.d, actorName(ok.me), novas);
  revalidatePath("/diagnosticos", "layout");
}

export async function rascunhoColetivoAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  await tentar(async () => { contarUso(ok.me.pessoa?.id ?? ok.me.username); await rascunhoColetivoIA(ok.d, ok.secao, actorName(ok.me)); });
  revalidatePath("/diagnosticos", "layout");
}

export async function tarefasLacunasAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  criarTarefasLacunas(ok.d, ok.secao, actorName(ok.me));
  revalidatePath("/", "layout");
}

export async function enviarConhecimentoAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  enviarAoConhecimento(ok.d, ok.secao, ok.me.pessoa?.id ?? ok.me.username);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Diagnóstico (D3): lists that become work

/** Rows posted as "<prefixo>:<i>:<campo>" → objects (row order kept). */
function linhas(form: FormData, prefixo: string) {
  const out: Record<string, Record<string, string>> = {};
  for (const [k, v] of form.entries()) {
    const m = k.match(new RegExp(`^${prefixo}:(\\d+):(\\w+)$`));
    if (m) (out[m[1]] ??= {})[m[2]] = String(v);
  }
  return Object.keys(out).sort((a, b) => +a - +b).map((k) => out[k]);
}

export async function salvarItensAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  const pergunta = String(form.get("pergunta"));
  const pessoas = new Set(getPessoas().map((p) => p.id));
  if (form.get("acao") === "sugerir") {
    if (!getColetivo(ok.d.id).itens[pergunta]?.length) salvarItens(ok.d, pergunta, itensSugeridos(ok.d, pergunta));
  } else {
    salvarItens(ok.d, pergunta, linhas(form, "i").map((r) => ({
      id: r.id ?? "", titulo: r.titulo ?? "", prioridade: (["alta", "media", "baixa"].includes(r.prioridade) ? r.prioridade : "media") as Item["prioridade"],
      custo: Number(r.custo) || 0, requisitos: r.requisitos ?? "", responsavel: pessoas.has(r.responsavel) ? r.responsavel : "",
    })));
    if (form.get("acao") === "tarefas") criarTarefasItens(ok.d, pergunta, actorName(ok.me));
  }
  revalidatePath("/", "layout");
}

export async function calendarioAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  const acao = String(form.get("acao"));
  if (acao === "gerar") gerarCalendario(ok.d, String(form.get("dataRetiro")));
  else {
    const pessoas = new Set(getPessoas().map((p) => p.id));
    salvarCalendario(ok.d, linhas(form, "e").map((r) => ({ id: r.id ?? "", data: r.data ?? "", acao: r.acao ?? "", responsavel: pessoas.has(r.responsavel) ? r.responsavel : "" })));
    if (acao === "tarefas") criarTarefasCalendario(ok.d, actorName(ok.me));
  }
  revalidatePath("/", "layout");
}

export async function periodoAction(form: FormData) {
  const ok = await secaoEditavel(form);
  if (!ok) return;
  salvarPeriodo(ok.d, String(form.get("de") ?? ""), String(form.get("ate") ?? ""));
  revalidatePath("/diagnosticos", "layout");
}

export async function reuniaoAction(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  const n = pick(form.get("n"), ["1", "2"]) as "1" | "2" | "";
  if (!d || !me.gestao || !n) return;
  if (form.get("acao") === "pauta") await tentar(() => gerarPauta(d, n));
  else agendarReuniao(d, n, String(form.get("data")));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Diagnóstico (D4): consolidation (gestão) and acceptance (each person)

/** Runs a slow/AI step; on failure returns to the page it came from with the message in ?erro= (shown by ErroAviso). */
async function tentar(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    const { headers } = await import("next/headers");
    const ref = (await headers()).get("referer") ?? "";
    let volta = "/hoje";
    try { const u = new URL(ref); u.searchParams.set("erro", (e as Error).message.slice(0, 200)); volta = u.pathname + u.search; } catch { /* no referer */ }
    redirect(volta);
  }
}

async function diagGestao(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  return d && me.gestao ? { me, d } : null;
}

export async function consolidadoAction(form: FormData) {
  const ok = await diagGestao(form);
  const tipo = pick(form.get("tipo"), ["retiro", "matriz"]) as "retiro" | "matriz" | "";
  if (!ok || !tipo) return;
  await tentar(async () => { contarUso(ok.me.pessoa?.id ?? ok.me.username); await gerarConsolidado(ok.d, tipo); });
  revalidatePath("/diagnosticos", "layout");
}

export async function codigoAction(form: FormData) {
  const ok = await diagGestao(form);
  if (!ok) return;
  const acao = String(form.get("acao"));
  if (acao === "ia") await tentar(async () => { contarUso(ok.me.pessoa?.id ?? ok.me.username); await rascunhoCodigo(ok.d); });
  if (acao === "salvar" || acao === "publicar") salvarCodigo(ok.d, String(form.get("texto") ?? ""));
  if (acao === "publicar") publicarCodigo(ok.d);
  revalidatePath("/", "layout");
}

export async function aceitarCodigoAction(form: FormData) {
  const me = await requireUser();
  const d = getDiagnostico(String(form.get("diagnostico")));
  if (!d || !me.pessoa || !participa(d, me.pessoa)) return;
  aceitarCodigo(d, me.pessoa.id);
  revalidatePath("/", "layout");
}

export async function documentoAction(form: FormData) {
  const ok = await diagGestao(form);
  if (!ok) return;
  montarDocumento(ok.d);
  if (form.get("acao") === "traduzir") await tentar(async () => { contarUso(ok.me.pessoa?.id ?? ok.me.username); await traduzirDocumento(ok.d); });
  revalidatePath("/diagnosticos", "layout");
}

// ---------------------------------------------------------------- D5: apply a template / holistic view (gestão)

export async function criarDiagnosticoAction(form: FormData) {
  const me = await requireUser();
  if (!me.gestao) return;
  let id = "";
  await tentar(async () => {
    id = criarDiagnostico({
      modelo: String(form.get("modelo") ?? ""), projeto: String(form.get("projeto") ?? ""), titulo: String(form.get("titulo") ?? ""),
      evento: String(form.get("evento") ?? ""), equipes: form.getAll("equipes").map(String),
    });
  });
  revalidatePath("/", "layout");
  if (id) redirect(`/diagnosticos/${id}`);
}

export async function estadoDiagnosticoAction(form: FormData) {
  const ok = await diagGestao(form);
  if (!ok) return;
  encerrarDiagnostico(ok.d, form.get("aberto") === "true");
  revalidatePath("/", "layout");
}

export async function visaoAction(form: FormData) {
  const me = await requireUser();
  const projeto = pick(form.get("projeto"), getProjetos().map((p) => p.id));
  if (!me.gestao || !projeto) return;
  const { gerarSintese } = await import("@/lib/v2/visao");
  await tentar(async () => { contarUso(me.pessoa?.id ?? me.username); await gerarSintese(projeto); });
  revalidatePath(`/projetos/${projeto}/visao`);
}

/** Hoje: one-tap new due date (overdue / undated groups). */
export async function prazoRapidoAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  const prazo = String(form.get("prazo") ?? "");
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(prazo) || !can.editTarefa(me, t)) return;
  updateTarefa(t.id, { title: t.title, equipe: t.equipe, area: t.area, projeto: t.projeto, objetivo: t.objetivo, prazo, responsaveis: t.responsaveis, status: t.status, recorrencia: t.recorrencia }, actorName(me));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Hoje: Bom dia, pulso

export async function bomDiaAction(): Promise<string> {
  const me = await requireUser();
  const { getLang } = await import("@/lib/v2/i18n");
  const { gerarBomDia } = await import("@/lib/v2/hoje");
  try { return await gerarBomDia(me, await getLang()); } catch (e) { console.warn("[bomDia]", (e as Error).message); return ""; }
}

/** Pulso: give an owner-less task an owner (gestão or the task's coordinator). */
export async function atribuirAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  const pessoa = pick(form.get("pessoa"), getPessoas().map((p) => p.id));
  if (!t || !pessoa || !(me.gestao || can.editTarefa(me, t))) return;
  updateTarefa(t.id, { title: t.title, equipe: t.equipe, area: t.area, projeto: t.projeto, objetivo: t.objetivo, prazo: t.prazo, responsaveis: [...new Set([...t.responsaveis, pessoa])], status: t.status, recorrencia: t.recorrencia }, actorName(me));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Assistant (global, Equipe 1)
// The conversation is stored per person on the server; cards are decided by index and the STORED
// proposal is executed (the browser never sends the action itself).

async function assistenteDono() {
  const me = await requireUser();
  if (!me.gestao) throw new Error("O assistente está disponível só para a Equipe 1 por enquanto");
  return { me, id: me.pessoa?.id ?? me.username };
}

export async function assistenteConversaAction() {
  try {
    const { id } = await assistenteDono();
    const { getConversa } = await import("@/lib/v2/assistente");
    return { msgs: getConversa(id) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function assistenteAction(texto: string, pagina: string) {
  try {
    const { me, id } = await assistenteDono();
    const q = String(texto ?? "").trim().slice(0, 2000);
    if (!q) return { error: "Mensagem vazia" };
    const { conversar, getConversa, paraModelo, salvarConversa } = await import("@/lib/v2/assistente");
    const { getLang } = await import("@/lib/v2/i18n");
    contarUso(id);
    const msgs = [...getConversa(id), { role: "user" as const, content: q, em: new Date().toISOString() }];
    const r = await conversar(me, paraModelo(msgs), await getLang(), String(pagina || "/hoje").slice(0, 300));
    msgs.push({ role: "assistant", content: r.resposta, em: new Date().toISOString(), ...(r.consultas.length ? { consultas: r.consultas } : {}), cartoes: r.acoes.map((a) => ({ ...a, estado: "pendente" as const })) });
    salvarConversa(id, msgs);
    return { msgs };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function decidirCartaoAction(msg: number, cartao: number, confirmar: boolean) {
  try {
    const { me, id } = await assistenteDono();
    const { executarAcao, getConversa, salvarConversa } = await import("@/lib/v2/assistente");
    const msgs = getConversa(id);
    const c = msgs[msg]?.cartoes?.[cartao];
    if (!c || c.estado !== "pendente") return { msgs };
    if (!confirmar) c.estado = "cancelado";
    else {
      try { c.link = await executarAcao(me, c, `${actorName(me)} (via assistente)`); c.estado = "feito"; } catch (e) { c.estado = "erro"; c.erro = (e as Error).message; }
    }
    salvarConversa(id, msgs);
    if (c.estado === "feito") revalidatePath("/", "layout");
    return { msgs };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function memoriaAction() {
  try {
    const { id } = await assistenteDono();
    const { getMemoria } = await import("@/lib/v2/assistente");
    return { itens: getMemoria(id) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function esquecerMemoriaAction(item: string) {
  try {
    const { id } = await assistenteDono();
    const { esquecer, getMemoria } = await import("@/lib/v2/assistente");
    esquecer(id, String(item));
    return { itens: getMemoria(id) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function novaConversaAction() {
  try {
    const { id } = await assistenteDono();
    const { salvarConversa } = await import("@/lib/v2/assistente");
    salvarConversa(id, []);
    return { msgs: [] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------- Pessoas: AI study (gestão)

export async function estudoAction(form: FormData) {
  const me = await requireUser();
  const pessoa = pick(form.get("pessoa"), getPessoas().map((p) => p.id));
  if (!me.gestao || !pessoa) return;
  const { gerarEstudo } = await import("@/lib/v2/pessoasInfo");
  await tentar(async () => { contarUso(me.pessoa?.id ?? me.username); await gerarEstudo(pessoa); });
  revalidatePath(`/pessoas/${pessoa}`);
}

// ---------------------------------------------------------------- Pessoas: Notificar (WhatsApp from the Nipëi number)

async function podeNotificar(pessoaId: string) {
  const me = await requireUser();
  const p = getPessoas().find((x) => x.id === pessoaId);
  if (!p || !(me.gestao || can.gerirPessoa(me, p))) throw new Error("Sem permissão");
  const { headers } = await import("next/headers");
  const h = await headers();
  return { me, p, origin: process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}` };
}

/** Draft for the panel: ready-made for resumo/links, AI for livre/alerta (always edited before sending). */
export async function notificarRascunhoAction(pessoaId: string, tipo: string, pedido: string): Promise<{ texto?: string; error?: string }> {
  try {
    const { me, p, origin } = await podeNotificar(pessoaId);
    const n = await import("@/lib/v2/notificar");
    if (tipo === "resumo") return { texto: n.resumoTarefas(p, origin) };
    if (tipo === "cadastro" || tipo === "acesso") return { texto: n.textoLink(p, tipo, origin) };
    if (!pedido.trim()) return { error: "Escreva o que a IA deve dizer" };
    contarUso(me.pessoa?.id ?? me.username);
    return { texto: await n.rascunhoIA(p, pedido.slice(0, 600), (n.TIPOS as readonly string[]).includes(tipo) ? tipo as never : "livre", actorName(me)) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function notificarEnviarAction(pessoaId: string, tipo: string, texto: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const { me, p } = await podeNotificar(pessoaId);
    const n = await import("@/lib/v2/notificar");
    await n.enviar(p, texto, (n.TIPOS as readonly string[]).includes(tipo) ? tipo as never : "livre", actorName(me));
    revalidatePath(`/pessoas/${p.id}`);
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Gestão tab: send the cadastro / login link from the Nipëi number in one tap. */
export async function enviarLinkAction(form: FormData) {
  const tipo = form.get("tipo") === "acesso" ? "acesso" : "cadastro";
  await tentar(async () => {
    const { me, p, origin } = await podeNotificar(String(form.get("pessoa")));
    const n = await import("@/lib/v2/notificar");
    await n.enviar(p, n.textoLink(p, tipo, origin), tipo, actorName(me));
  });
  revalidatePath("/pessoas", "layout");
}

// ---------------------------------------------------------------- Equipes: bulk actions, load balancing, team meeting

const PRIORIDADES = ["baixa", "média", "alta", "urgente"];

/** One action on many tasks (checkboxes on the team page). Each task is checked on its own. */
export async function loteAction(form: FormData) {
  const me = await requireUser();
  const ids = new Set(form.getAll("ids").map(String));
  const acao = String(form.get("acao") ?? "");
  const ts = getTarefas().filter((t) => ids.has(t.id) && (me.gestao || can.editTarefa(me, t))).slice(0, 100);
  const pessoa = pick(form.get("pessoa"), getPessoas().map((p) => p.id));
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(String(form.get("prazo"))) ? String(form.get("prazo")) : "";
  const prioridade = pick(form.get("prioridade"), PRIORIDADES);
  const equipe = pick(form.get("equipe"), getEquipes().map((e) => e.id));
  await tentar(async () => {
    if (!ts.length) throw new Error("Selecione ao menos uma tarefa");
    if (acao === "atribuir" && !pessoa) throw new Error("Escolha a pessoa");
    if (acao === "prazo" && !prazo) throw new Error("Escolha a data");
    if (acao === "prioridade" && !prioridade) throw new Error("Escolha a prioridade");
    if (acao === "equipe" && !(equipe && can.gerirEquipe(me, equipe))) throw new Error("Escolha uma equipe que você coordena");
    for (const t of ts) {
      if (acao === "atribuir") mudarTarefa(t.id, { responsaveis: [...new Set([...t.responsaveis, pessoa])] }, actorName(me));
      else if (acao === "prazo") mudarTarefa(t.id, { prazo }, actorName(me));
      else if (acao === "concluir") mudarTarefa(t.id, { status: "done" }, actorName(me));
      else if (acao === "prioridade") mudarTarefa(t.id, { priority: prioridade }, actorName(me));
      else if (acao === "equipe") mudarTarefa(t.id, { equipe }, actorName(me));
    }
  });
  revalidatePath("/", "layout");
}

/** Load balancing: move one task from `de` (empty = owner-less) to `para`. */
export async function reatribuirAction(form: FormData) {
  const me = await requireUser();
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  const para = pick(form.get("para"), getPessoas().map((p) => p.id));
  const de = String(form.get("de") ?? "");
  if (!t || !para || !t.equipe || !can.gerirEquipe(me, t.equipe)) return;
  mudarTarefa(t.id, { responsaveis: [...new Set([...t.responsaveis.filter((r) => r !== de), para])] }, actorName(me));
  revalidatePath("/", "layout");
}

export async function agendarReuniaoEquipeAction(form: FormData) {
  const me = await requireUser();
  const e = getEquipes().find((x) => x.id === String(form.get("equipe")));
  const data = String(form.get("data") ?? "");
  const hora = /^\d{2}:\d{2}$/.test(String(form.get("hora"))) ? String(form.get("hora")) : "";
  if (!e || !can.gerirEquipe(me, e.id) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  await tentar(async () => createEvento({ titulo: `Reunião ${e.nome}`, inicio: data, fim: "", status: "confirmado", equipe: e.id, hora }));
  revalidatePath("/", "layout");
}

export async function salvarAtaAction(form: FormData) {
  const me = await requireUser();
  const e = getEquipes().find((x) => x.id === String(form.get("equipe")));
  if (!e || !can.gerirEquipe(me, e.id)) return;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(form.get("data"))) ? String(form.get("data")) : today();
  const { salvarAta } = await import("@/lib/v2/reuniaoEquipe");
  await tentar(async () => salvarAta(e, {
    data, presentes: form.getAll("presentes").map(String).slice(0, 60),
    decisoes: String(form.get("decisoes") ?? "").slice(0, 5000), encaminhamentos: String(form.get("encaminhamentos") ?? "").slice(0, 5000),
  }, actorName(me)));
  revalidatePath("/", "layout");
  redirect(`/equipes/${e.id}/reuniao?salva=1`);
}

// ---------------------------------------------------------------- Projetos: updates

/** Short progress note on a project ("## Atualizações"): gestão or a coordinator of one of its teams. */
export async function anotarProjetoAction(form: FormData) {
  const me = await requireUser();
  const p = getProjetos().find((x) => x.id === String(form.get("projeto")));
  const texto = String(form.get("texto") ?? "").trim().slice(0, 500);
  if (!p || !texto || !(me.gestao || p.equipes.some((e) => me.coordena.includes(e)))) return;
  const { anotarProjeto } = await import("@/lib/v2/data");
  anotarProjeto(p.id, texto, actorName(me));
  revalidatePath(`/projetos/${p.id}`);
}

// ---------------------------------------------------------------- each person's own Google account

async function minhaConexao() {
  const me = await requireUser();
  if (!me.pessoa) throw new Error("Só quem tem ficha conecta uma conta Google");
  return { me, pessoaId: me.pessoa.id };
}

export async function desconectarGoogleAction() {
  await tentar(async () => {
    const { pessoaId } = await minhaConexao();
    const { desconectarGoogle } = await import("@/lib/v2/google");
    await desconectarGoogle(pessoaId);
  });
  revalidatePath("/", "layout");
}

export async function backupAgoraAction() {
  await tentar(async () => {
    const { pessoaId } = await minhaConexao();
    const { backupPessoa } = await import("@/lib/v2/backup");
    await backupPessoa(pessoaId);
  });
  revalidatePath("/", "layout");
}

/** Exports a page to the person's Google Drive (Doc, Sheet or Slides) and opens it. */
export async function exportarGoogleAction(form: FormData) {
  let link = "";
  await tentar(async () => {
    const { me, pessoaId } = await minhaConexao();
    const g = await import("@/lib/v2/google");
    const tipo = String(form.get("tipo")), id = String(form.get("id") ?? "");
    if (tipo === "visao") {
      const { coletarVisao, getSintese } = await import("@/lib/v2/visao");
      const v = coletarVisao(id), s = getSintese(id);
      if (!v) throw new Error("Projeto não encontrado");
      if (!s?.texto) throw new Error("Gere a síntese da visão antes de exportar");
      const numeros = `Tarefas: ${v.tarefas.abertas} abertas, ${v.tarefas.atrasadas} atrasadas, ${v.tarefas.semDono} sem responsável, ${v.tarefas.concluidas} concluídas · ${v.membros} pessoas · ${v.fatos.length} fatos confirmados`;
      if (form.get("formato") === "slides") {
        const secoes = s.texto.split(/^## /m).filter((x) => x.trim()).map((b) => { const [t, ...r] = b.split("\n"); return { titulo: t.trim(), texto: r.join("\n").replace(/^[-*]\s+/gm, "").replace(/\*\*/g, "").trim() }; });
        link = await g.criarApresentacao(pessoaId, `Visão · ${v.projeto.nome}`, [{ titulo: "Números", texto: numeros.replace(/ · /g, "\n") }, ...secoes]);
      } else {
        link = (await g.salvarArquivo(pessoaId, { nome: `Visão · ${v.projeto.nome} · ${today()}`, conteudo: `# Visão holística · ${v.projeto.nome}\n\n${numeros}\n\n${s.texto}\n`, tipo: "text/markdown", converter: true })).link;
      }
    } else if (tipo === "ata") {
      const { atas } = await import("@/lib/v2/reuniaoEquipe");
      const e = getEquipes().find((x) => x.id === String(form.get("equipe")));
      const a = e && atas(e.id).find((x) => x.file === id);
      if (!e || !a) throw new Error("Ata não encontrada");
      const nome = (pid: string) => getPessoas().find((p) => p.id === pid)?.name ?? pid;
      const md = `# Reunião · ${e.nome} · ${a.data}\n\nAta por ${a.por}. Presentes: ${a.presentes.map(nome).join(", ") || "-"}\n\n## Decisões\n\n${a.decisoes || "-"}\n\n## Encaminhamentos\n\n${a.encaminhamentos.map((x) => `- ${x.texto}`).join("\n") || "-"}\n`;
      link = (await g.salvarArquivo(pessoaId, { nome: `Reunião ${e.nome} · ${a.data}`, conteudo: md, tipo: "text/markdown", converter: true })).link;
    } else if (tipo === "financas") {
      if (!me.gestao) throw new Error("Só a gestão exporta as finanças");
      const { getLancamentos } = await import("@/lib/v2/data");
      const cel = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
      const linhas = getLancamentos().filter((l) => !l.anulado).sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => [l.data, l.tipo, l.valor, l.categoria, l.descricao, getProjetos().find((p) => p.id === l.projeto)?.nome ?? l.projeto, getEquipes().find((e) => e.id === l.equipe)?.nome ?? l.equipe, l.registradoPor].map(cel).join(","));
      link = (await g.salvarArquivo(pessoaId, { nome: `Finanças Nipëi · ${today()}`, conteudo: ["Data,Tipo,Valor,Categoria,Descrição,Projeto,Equipe,Registrado por", ...linhas].join("\n"), tipo: "text/csv", converter: true })).link;
    } else throw new Error("Exportação desconhecida");
  });
  if (link) redirect(link);
}
