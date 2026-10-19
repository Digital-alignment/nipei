"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/v2/i18n";
import {
  ACERVO_TIPOS, CATEGORIAS, addToEquipe, anularLancamento, can, createAcervo, createEvento, createLancamento, createPessoa, createTarefa,
  currentUser, getEquipes, getEventos, getObjetivos, getPessoas, getProjetos, getTarefas, setEquipeAcesso, setTarefaStatus,
  updateEvento, updateObjetivo, updateTarefa, type Status,
} from "@/lib/v2/data";

// Every action re-checks who is calling and what they may do (plan §4.4) — the hidden
// buttons in the UI are only a convenience, never the guard.
async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

const pick = (v: FormDataEntryValue | null, allowed: string[]) => {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : "";
};
const safeBack = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hoje";
};

export async function setStatusAction(form: FormData) {
  const me = await requireUser();
  const status = String(form.get("status")) as Status;
  const t = getTarefas().find((x) => x.id === String(form.get("id")));
  if (!t || !["todo", "doing", "done"].includes(status) || !can.editTarefa(me, t)) return;
  setTarefaStatus(t.id, status);
  revalidatePath("/", "layout");
}

export async function createTarefaAction(form: FormData) {
  const me = await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  const equipe = pick(form.get("equipe"), getEquipes().map((e) => e.id));
  if (!title || !can.criarEm(me, equipe)) return;
  const prazo = String(form.get("prazo") ?? "");
  const pessoas = getPessoas().map((p) => p.id);
  createTarefa({
    title,
    equipe,
    projeto: pick(form.get("projeto"), getProjetos().map((p) => p.id)),
    objetivo: pick(form.get("objetivo"), getObjetivos().map((o) => o.id)),
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : "",
    responsaveis: form.getAll("responsaveis").map(String).filter((id) => pessoas.includes(id)),
  });
  revalidatePath("/", "layout");
  redirect(safeBack(form.get("back")));
}

export async function addToEquipeAction(form: FormData) {
  const me = await requireUser();
  const equipe = String(form.get("equipe"));
  if (!can.gerirEquipe(me, equipe)) return;
  addToEquipe(String(form.get("pessoa")), equipe);
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
  });
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

export async function toggleLangAction() {
  const jar = await cookies();
  jar.set(LANG_COOKIE, jar.get(LANG_COOKIE)?.value === "en" ? "pt" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
