"use server";

import { revalidatePath } from "next/cache";
import { verifyToken } from "@/lib/auth";
import { currentUser } from "@/lib/v2/data";
import { enviarCodigo, salvarFoto, salvarPerfil, verificarCodigo, type DadosPerfil } from "@/lib/v2/perfil";
import { normalizarFone } from "@/lib/v2/whatsapp";

// Used by "Meu perfil" (/pessoas/[id]/editar, logged in) and the public cadastro link (/cadastro).
// Who may edit a profile: the person, gestão, or whoever holds that person's cadastro link.
async function pode(pessoaId: string, cadastro: string) {
  if (cadastro) return verifyToken(cadastro, "cadastro") === pessoaId;
  const me = await currentUser();
  return !!me && (me.gestao || me.pessoa?.id === pessoaId);
}
const erro = (e: unknown) => ({ error: (e as Error).message });

export async function enviarCodigoAction(pessoaId: string, fone: string, cadastro = ""): Promise<{ token?: string; numero?: string; error?: string }> {
  if (!(await pode(pessoaId, cadastro))) return { error: "Sem permissão" };
  const numero = normalizarFone(fone);
  if (!numero) return { error: "Número de WhatsApp inválido (confira o código do país e o DDD)" };
  try {
    return { token: await enviarCodigo(pessoaId, numero), numero };
  } catch (e) {
    return erro(e);
  }
}

export async function verificarCodigoAction(pessoaId: string, token: string, codigo: string, cadastro = ""): Promise<{ prova?: string; error?: string }> {
  if (!(await pode(pessoaId, cadastro))) return { error: "Sem permissão" };
  try {
    return { prova: verificarCodigo(pessoaId, token, codigo) };
  } catch (e) {
    return erro(e);
  }
}

const CAMPOS: (keyof DadosPerfil)[] = [
  "name", "apelido", "native_name", "data_nascimento", "nacionalidade", "whatsapp", "email", "cidade", "pais", "idioma",
  "area", "funcao", "disponibilidade", "emergencia_nome", "emergencia_whatsapp",
];

export async function salvarPerfilAction(form: FormData): Promise<{ ok?: boolean; verificado?: boolean; error?: string }> {
  const pessoaId = String(form.get("pessoa") ?? "");
  const cadastro = String(form.get("cadastro") ?? "");
  if (!(await pode(pessoaId, cadastro))) return { error: "Sem permissão" };
  try {
    const dados = Object.fromEntries(CAMPOS.map((k) => [k, String(form.get(k) ?? "")])) as DadosPerfil;
    const r = salvarPerfil(pessoaId, dados, String(form.get("prova") ?? ""), form.get("lgpd") === "on");
    revalidatePath(`/pessoas/${pessoaId}`, "layout");
    return { ok: true, verificado: r.verificado };
  } catch (e) {
    return erro(e);
  }
}

export async function uploadFotoAction(form: FormData): Promise<{ error?: string }> {
  const pessoaId = String(form.get("id") ?? "");
  if (!(await pode(pessoaId, String(form.get("cadastro") ?? "")))) return { error: "Sem permissão" };
  const file = form.get("arquivo");
  if (!(file instanceof File) || !file.size) return { error: "Nenhuma foto" };
  try {
    await salvarFoto(pessoaId, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return erro(e);
  }
  revalidatePath(`/pessoas/${pessoaId}`, "layout");
  return {};
}
