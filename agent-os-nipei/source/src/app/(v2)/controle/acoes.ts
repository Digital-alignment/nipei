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

/** Starts "ver como" (read-only, 30 min) for one person, opening the chosen page. */
export async function iniciarVerComoAction(form: FormData) {
  const me = await admin();
  if (!(await adminConfirmado(me))) redirect("/controle");
  const { getPessoas, meDaPessoa, VER_COMO_COOKIE } = await import("@/lib/v2/data");
  const { signToken } = await import("@/lib/auth");
  const alvo = getPessoas().find((p) => p.id === String(form.get("pessoa")));
  if (!alvo || alvo.id === me.pessoa!.id) redirect("/controle?m=vercomo&erro=Escolha outra pessoa.");
  if (!meDaPessoa(alvo.id)) redirect(`/controle?m=vercomo&erro=${encodeURIComponent(`${alvo.name} não consegue entrar na plataforma agora.`)}`);
  const pg = String(form.get("pagina") ?? "/hoje");
  const destino = pg === "ficha" ? `/pessoas/${alvo.id}` : ["/hoje", "/agenda", "/equipes", "/projetos", "/conhecimento"].includes(pg) ? pg : "/hoje";
  (await cookies()).set({ name: VER_COMO_COOKIE, value: signToken("ver-como", `${me.pessoa!.id}|${alvo.id}`, 1800), httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1800 });
  registrarAdmin(me.pessoa!.id, `começou "ver como" ${alvo.id} (${destino})`);
  redirect(destino);
}

// ---------------------------------------------------------------- Operação
async function confirmado() {
  const me = await admin();
  if (!(await adminConfirmado(me))) redirect("/controle");
  return me;
}
const voltarOp = (msg: string) => redirect(`/controle?m=operacao&ok=${encodeURIComponent(msg)}`);

export async function alertasAction(form: FormData) {
  const me = await confirmado();
  const { avisarAdmins, ligarAlertas } = await import("@/lib/v2/alertas");
  const o = String(form.get("o"));
  if (o === "teste") {
    const ok = await avisarAdmins("Nipëi · painel de controle\n\n🔔 Alerta de teste: os avisos de saúde chegam aqui.");
    registrarAdmin(me.pessoa!.id, "enviou alerta de teste");
    voltarOp(ok ? "Alerta de teste enviado." : "Não consegui enviar (WhatsApp do Nipëi ou seu número).");
  }
  ligarAlertas(o === "ligar");
  registrarAdmin(me.pessoa!.id, `alertas ${o === "ligar" ? "ligados" : "desligados"}`);
  voltarOp(o === "ligar" ? "Alertas ligados." : "Alertas desligados.");
}

export async function operacaoAction(form: FormData) {
  const me = await confirmado();
  const o = String(form.get("o"));
  if (o === "backup") {
    const { pessoasConectadas, getConexoes } = await import("@/lib/v2/conexoes");
    const { backupPessoa } = await import("@/lib/v2/backup");
    const ids = pessoasConectadas().filter((p) => getConexoes(p).google);
    const r = await Promise.allSettled(ids.map((p) => backupPessoa(p)));
    registrarAdmin(me.pessoa!.id, `cópia no Drive de todos (${ids.length})`);
    voltarOp(`Cópia feita: ${r.filter((x) => x.status === "fulfilled").length} de ${ids.length}.`);
  }
  if (o === "sync") {
    const { requestSync } = await import("@/lib/tarefaNote");
    const { vault } = await import("@/lib/v2/data");
    requestSync(vault());
    registrarAdmin(me.pessoa!.id, "pediu sincronização do vault");
    voltarOp("Sincronização pedida (o servidor roda em alguns segundos).");
  }
  if (o === "bloqueios") {
    const { limparTodosBloqueios } = await import("@/lib/v2/seguranca");
    const n = limparTodosBloqueios();
    registrarAdmin(me.pessoa!.id, `limpou bloqueios de login (${n})`);
    voltarOp(`Bloqueios de login limpos (${n}).`);
  }
  voltarOp("Nada feito.");
}

// ---------------------------------------------------------------- Funções (switches)
/** o = desligar|ligar (whole feature) or pessoa (pessoa + valor = sim|nao|padrao). */
export async function funcoesAction(form: FormData) {
  const me = await confirmado();
  const { FUNCOES, lerFuncoes, salvarFuncoes } = await import("@/lib/v2/funcoes");
  const id = String(form.get("f")) as keyof typeof FUNCOES;
  if (!FUNCOES[id]) redirect("/controle?m=funcoes");
  const c = lerFuncoes(), f = (c[id] ??= {}), o = String(form.get("o"));
  let msg = "";
  if (o === "desligar" || o === "ligar") { f.desligada = o === "desligar"; msg = `${FUNCOES[id].nome}: ${o === "desligar" ? "desligada para todos" : "ligada de novo"}`; }
  else {
    const { getPessoas } = await import("@/lib/v2/data");
    const p = getPessoas().find((x) => x.id === String(form.get("pessoa")));
    if (!p) redirect("/controle?m=funcoes");
    const v = String(form.get("valor"));
    f.pessoas ??= {};
    if (v === "padrao") delete f.pessoas[p.id]; else f.pessoas[p.id] = v === "sim";
    msg = `${FUNCOES[id].nome}: ${p.name.split(" (")[0]} → ${v === "padrao" ? "regra normal" : v === "sim" ? "ligada" : "desligada"}`;
  }
  salvarFuncoes(c);
  registrarAdmin(me.pessoa!.id, msg);
  redirect(`/controle?m=funcoes&ok=${encodeURIComponent(msg)}`);
}
