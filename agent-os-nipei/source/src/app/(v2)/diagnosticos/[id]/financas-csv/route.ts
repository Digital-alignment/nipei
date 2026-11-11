import { NextResponse } from "next/server";
import { currentUser, getEquipes, getPessoas, getProjetos } from "@/lib/v2/data";
import { getColetivo, getDiagnostico, lancamentosDoPeriodo, podeEditarSecao, resumoFinanceiro } from "@/lib/v2/diagnostico";

// "Baixar CSV do período" (DS 10.25): the ledger of the retreat/dieta period plus budget vs real per category,
// for the accounting report of Lynn's section 4. Gestão or whoever is responsible for the finance section (404 otherwise).
export const dynamic = "force-dynamic";

const cel = (v: unknown) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const num = (v: number) => v.toFixed(2).replace(".", ","); // Excel pt-BR

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser();
  const d = getDiagnostico((await params).id);
  const c = d && getColetivo(d.id);
  if (!me || !d || !c || !podeEditarSecao(me, c, "financas")) return new NextResponse("Not found", { status: 404 });
  const lanc = lancamentosDoPeriodo(d, c.periodo).sort((a, b) => a.data.localeCompare(b.data));
  const r = resumoFinanceiro(lanc, c.orcamento);
  const pessoas = getPessoas(), projetos = getProjetos(), equipes = getEquipes();
  const linhas = [
    ["data", "tipo", "situação", "valor", "categoria", "descrição", "projeto", "equipe", "registrado por"],
    ...lanc.map((l) => [l.data, l.tipo, l.pendente ? (l.tipo === "entrada" ? "a receber" : "a pagar") : "pago", num(l.valor), l.categoria, l.descricao,
      projetos.find((p) => p.id === l.projeto)?.nome ?? l.projeto, equipes.find((e) => e.id === l.equipe)?.nome ?? l.equipe,
      pessoas.find((p) => p.id === l.registradoPor)?.name ?? l.registradoPor]),
    [],
    ["categoria", "tipo", "orçado", "real", "diferença"],
    ...r.comparacao.map((x) => [x.categoria, x.tipo, x.orcado ? num(x.orcado) : "", num(x.real), x.orcado ? num(x.diferenca) : ""]),
    [],
    ["total entradas", "", "", num(r.totalEntradas)], ["total despesas", "", "", num(r.totalDespesas)], ["resultado", "", "", num(r.resultado)],
    ["a receber", "", "", num(r.aReceber)], ["a pagar", "", "", num(r.aPagar)],
  ];
  const corpo = "﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
  const nome = `financas-${d.id}-${c.periodo.de || "inicio"}-${c.periodo.ate || "hoje"}.csv`;
  return new NextResponse(corpo, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store",
  } });
}
