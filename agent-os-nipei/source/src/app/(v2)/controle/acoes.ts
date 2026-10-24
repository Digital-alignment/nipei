"use server";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/v2/data";
import { ADMIN_COOKIE, adminConfirmado, cookieAdmin, ehAdmin, registrarAdmin } from "@/lib/v2/admin";

// Every action re-checks the allow-list (and the confirmation where it matters); anyone else gets a 404.
async function admin() {
  const me = await currentUser();
  if (!me || !ehAdmin(me)) notFound();
  return me;
}

/** Re-confirms with the password; 5 wrong tries in 15 min lock it. */
export async function confirmarAdminAction(form: FormData) {
  const me = await admin();
  const { bloqueado, conferirSenhaAtual, contarFalha, limparFalhas } = await import("@/lib/v2/seguranca");
  const chave = `adm:${me.pessoa!.id}`;
  if (bloqueado(chave, 5, 15 * 60_000)) redirect("/controle?erro=bloqueado");
  if (!conferirSenhaAtual(me.pessoa!, String(form.get("senha") ?? ""))) {
    contarFalha(chave);
    registrarAdmin(me.pessoa!.id, "confirmação com senha FALHOU");
    redirect("/controle?erro=senha");
  }
  limparFalhas(chave);
  (await cookies()).set(cookieAdmin(me.pessoa!.id));
  registrarAdmin(me.pessoa!.id, "abriu o painel (senha)");
  redirect("/controle");
}

export async function trancarAdminAction() {
  const me = await admin();
  (await cookies()).set({ name: ADMIN_COOKIE, value: "", path: "/controle", maxAge: 0 });
  registrarAdmin(me.pessoa!.id, "trancou o painel");
  redirect("/hoje");
}

export async function verificarSaudeAction() {
  const me = await admin();
  if (!(await adminConfirmado(me))) redirect("/controle");
  const { checarTudo } = await import("@/lib/v2/saude");
  await checarTudo(true);
  registrarAdmin(me.pessoa!.id, "verificou a saúde agora");
  revalidatePath("/controle");
}
