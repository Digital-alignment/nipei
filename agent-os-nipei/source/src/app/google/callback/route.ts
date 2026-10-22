import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { concluirConexao } from "@/lib/v2/google";
import { backupPessoa } from "@/lib/v2/backup";

export const dynamic = "force-dynamic";

// Google sends the person back here with ?code&state (the signed person id, checked against the login).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const me = await currentUser();
  const volta = (q: string) => NextResponse.redirect(new URL(`/pessoas/${me?.pessoa?.id ?? ""}?aba=conexoes${q}`, base));
  if (!me?.pessoa) return NextResponse.redirect(new URL("/login", base));
  if (url.searchParams.get("error")) return volta(`&erro=${encodeURIComponent("Conexão cancelada no Google")}`);
  try {
    const pessoaId = await concluirConexao(url.searchParams.get("state") ?? "", url.searchParams.get("code") ?? "", base, me.pessoa.id);
    backupPessoa(pessoaId).catch(() => null); // first copy right away, in the background
    return volta("&google=ok");
  } catch (e) {
    return volta(`&erro=${encodeURIComponent((e as Error).message)}`);
  }
}
