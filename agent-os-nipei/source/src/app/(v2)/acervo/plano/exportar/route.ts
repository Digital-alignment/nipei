import { NextResponse } from "next/server";
import { currentUser } from "@/lib/v2/data";
import { planoTrabalho } from "@/lib/v2/planoTrabalho";

// Export of the "Agenda work plan" (Acervo tab, DS 10.24): CSV for the team (Excel pt-BR: `;` + BOM) or
// Markdown in English for Lynn. Gestão only; status and names of who is missing, never the answers.
export const dynamic = "force-dynamic";

const cel = (v: unknown) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const EST = { feito: ["feita", "done"], rascunho: ["em andamento", "in progress"], falta: ["pendente", "pending"] } as const;

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me?.gestao) return new NextResponse("Not found", { status: 404 });
  const p = planoTrabalho();
  if (!p) return new NextResponse("Nenhum diagnóstico da Lynn", { status: 404 });
  const md = new URL(req.url).searchParams.get("formato") === "md";
  const dia = new Date().toISOString().slice(0, 10);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  let corpo: string;
  if (md) {
    corpo = [
      `# ${p.d.modelo.titulo_en || p.d.titulo} — work plan status`, "",
      `Status on ${dia}: **${pct(p.feitas, p.total)}%** (${p.feitas} of ${p.total} answers and deliverables; ${p.rascunhos} drafts).`,
      `Answering: ${p.pessoas.map((x) => x.name.split(" (")[0]).join(", ")}.`, "",
      ...p.secoes.flatMap((s) => [
        `## ${s.numero}. ${s.titulo_en || s.titulo} — ${s.feitas}/${s.total} (${pct(s.feitas, s.total)}%)`, "",
        ...s.perguntas.map((q) => `- [${q.estado === "feito" ? "x" : " "}] ${q.texto_en || q.texto} — ${EST[q.estado][1]}${q.escopo === "individual"
          ? ` (${q.feitas}/${q.total}${q.faltam.length ? `; missing: ${q.faltam.join(", ")}` : ""})`
          : `${q.responsavel ? `; owner: ${q.responsavel}` : "; no owner yet"}${q.falta ? `; gap: ${q.falta}` : ""}`}`), "",
      ]),
      "## Deliverables", "",
      ...p.entregaveis.map((e) => `- [${e.feito ? "x" : " "}] ${e.rotulo_en}${e.detalhe ? ` — ${e.detalhe}` : ""}`), "",
    ].join("\n");
  } else {
    const linhas: unknown[][] = [
      ...p.secoes.flatMap((s) => s.perguntas.map((q) => [`${s.numero}. ${s.titulo}`, q.escopo, q.texto, q.texto_en, EST[q.estado][0], q.feitas, q.total, q.faltam.join(", "), q.responsavel, q.falta])),
      ...p.entregaveis.map((e) => ["Entregas", "entrega", e.rotulo, e.rotulo_en, e.feito ? "feita" : "pendente", e.feito ? 1 : 0, 1, "", "", e.detalhe]),
    ];
    corpo = "﻿" + [["seção", "tipo", "pergunta", "question (EN)", "estado", "respondidas", "total", "faltam", "responsável", "falta / detalhe"], ...linhas].map((l) => l.map(cel).join(";")).join("\r\n") + "\r\n";
  }
  return new NextResponse(corpo, { headers: {
    "Content-Type": md ? "text/markdown; charset=utf-8" : "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="work-plan-lynn-${dia}.${md ? "md" : "csv"}"`, "Cache-Control": "no-store",
  } });
}
