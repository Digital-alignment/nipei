"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE } from "@/lib/auth";
import { LANG_COOKIE } from "@/lib/v2/i18n";
import {
  addToEquipe, createTarefa, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, setTarefaStatus, type Status,
} from "@/lib/v2/data";

// ponytail: every logged-in user may edit everything — only Equipe 1 (gestão) has logins today.
// Add the per-team rules of plan §4.4 when other teams get access (fase 4).
async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

const pick = (v: FormDataEntryValue | null, allowed: string[]) => {
  const s = String(v ?? "");
  return allowed.includes(s) ? s : "";
};

export async function setStatusAction(form: FormData) {
  await requireUser();
  const status = String(form.get("status")) as Status;
  if (!["todo", "doing", "done"].includes(status)) return;
  setTarefaStatus(String(form.get("id")), status);
  revalidatePath("/", "layout");
}

export async function createTarefaAction(form: FormData) {
  await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) return;
  const prazo = String(form.get("prazo") ?? "");
  const pessoas = getPessoas().map((p) => p.id);
  createTarefa({
    title,
    equipe: pick(form.get("equipe"), getEquipes().map((e) => e.id)),
    projeto: pick(form.get("projeto"), getProjetos().map((p) => p.id)),
    objetivo: pick(form.get("objetivo"), getObjetivos().map((o) => o.id)),
    prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : "",
    responsaveis: form.getAll("responsaveis").map(String).filter((id) => pessoas.includes(id)),
  });
  revalidatePath("/", "layout");
  redirect(String(form.get("back") || "/hoje").startsWith("/") ? String(form.get("back") || "/hoje") : "/hoje");
}

export async function addToEquipeAction(form: FormData) {
  await requireUser();
  addToEquipe(String(form.get("pessoa")), String(form.get("equipe")));
  revalidatePath("/", "layout");
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
