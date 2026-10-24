"use server";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/v2/data";
import { emitirCodigo, getCliente } from "@/lib/v2/oauthMcp";

/** The person said yes (or no) on the consent page; everything is checked again here. */
export async function decidirAction(form: FormData) {
  const me = await currentUser();
  const cliente = getCliente(String(form.get("client_id")));
  const redirectUri = String(form.get("redirect_uri"));
  const state = String(form.get("state") ?? "");
  if (!me?.pessoa || !cliente || !cliente.redirects.includes(redirectUri)) redirect("/hoje");
  const u = new URL(redirectUri);
  if (state) u.searchParams.set("state", state);
  if (form.get("decisao") !== "permitir") {
    u.searchParams.set("error", "access_denied");
  } else {
    u.searchParams.set("code", emitirCodigo(me.pessoa.id, cliente.id, redirectUri, String(form.get("code_challenge"))));
    u.searchParams.set("iss", process.env.NEXT_PUBLIC_APP_URL || "https://os.nipeihu.app");
  }
  redirect(u.toString());
}
