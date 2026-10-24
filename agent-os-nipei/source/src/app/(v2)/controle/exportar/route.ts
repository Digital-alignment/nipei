import { NextResponse } from "next/server";
import { currentUser, getPessoas } from "@/lib/v2/data";
import { adminConfirmado, ehAdmin, registrarAdmin } from "@/lib/v2/admin";

// CSV downloads for the admin panel (/controle → Relatórios). Same gate as the panel: allow-list +
// fresh confirmation (the cookie only travels to /controle/*). `;` and a BOM so Excel in pt-BR opens it right.
export const dynamic = "force-dynamic";

const cel = (v: unknown) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (cab: string[], linhas: unknown[][]) => "﻿" + [cab, ...linhas].map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
const quando = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Bahia" });

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me || !ehAdmin(me)) return new NextResponse("Not found", { status: 404 });
  if (!(await adminConfirmado(me))) return NextResponse.redirect(new URL("/controle", req.url));
  const q = new URL(req.url).searchParams, r = q.get("r") ?? "";
  const dias = Math.min(365, Math.max(1, Number(q.get("dias")) || 30));
  const mes = /^\d{4}-\d{2}$/.test(q.get("mes") ?? "") ? q.get("mes")! : new Date().toISOString().slice(0, 7);
  const ps = getPessoas(), nome = (id: string) => (id ? ps.find((p) => p.id === id || p.usuario === id)?.name.split(" (")[0] ?? id : "(sistema)");

  let corpo: string;
  if (r === "atividade") {
    const { atividade } = await import("@/lib/v2/eventos");
    corpo = csv(["quando", "pessoa", "canal", "ação", "detalhe"], atividade(dias).map((e) => [quando(e.em), nome(e.pessoa), e.canal, e.tipo, e.detalhe]));
  } else if (r === "uso") {
    const { usoPeriodo, SECOES } = await import("@/lib/v2/uso");
    corpo = csv(["dia", "pessoa", "seção", "minutos"], usoPeriodo(dias).sort((a, b) => a.dia.localeCompare(b.dia)).map((u) => [u.dia, nome(u.pessoa), SECOES[u.secao] ?? u.secao, u.min]));
  } else if (r === "acessos") {
    const { todosAcessos } = await import("@/lib/v2/seguranca");
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
    corpo = csv(["quando", "pessoa", "como", "aparelho"], todosAcessos().filter((a) => a.em >= desde).map((a) => [quando(a.em), nome(a.pessoa), a.metodo, a.disp]));
  } else if (r === "custos") {
    const { custosDoMes, ORIGENS } = await import("@/lib/v2/custosIA");
    corpo = csv(["quando", "pessoa", "uso", "provedor", "modelo", "tokens entrada", "tokens saída", "custo USD", "chave"], custosDoMes(mes).map((c) => [quando(c.em), nome(c.pessoa), ORIGENS[c.origem] ?? c.origem, c.provedor, c.modelo, c.tin, c.tout, c.usd === null ? "" : c.usd.toFixed(6).replace(".", ","), c.pessoal ? "própria" : "plataforma"]));
  } else if (r === "erros") {
    const { errosRecentes } = await import("@/lib/v2/erros");
    corpo = csv(["quando", "onde", "erro", "digest", "pilha"], errosRecentes(dias).map((e) => [quando(e.em), e.onde, e.msg, e.digest ?? "", e.pilha ?? ""]));
  } else return new NextResponse("Relatório desconhecido", { status: 400 });

  registrarAdmin(me.pessoa!.id, `exportou ${r} (${r === "custos" ? mes : `${dias} dias`})`);
  return new NextResponse(corpo, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nipei-${r}-${r === "custos" ? mes : `${dias}d`}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
