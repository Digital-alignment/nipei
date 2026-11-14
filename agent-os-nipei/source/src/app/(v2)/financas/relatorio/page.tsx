import { redirect } from "next/navigation";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { BotaoIcone } from "@/components/ds/Botao";
import Imprimir from "@/components/v2/Imprimir";
import ExportarGoogle from "@/components/v2/ExportarGoogle";
import Md from "@/components/v2/Md";
import { currentUser, today } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { nomeMes, relatorioMensal } from "@/lib/v2/relatorioFinancas";
import { podeFinancas } from "@/lib/v2/funcoes";

// Relatório mensal (DS 10.25, gestão): the month in markdown — printable to PDF and exportable to Google Docs (same text).
export const dynamic = "force-dynamic";

const addMes = (ym: string, n: number) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };

export default async function Relatorio({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = (await currentUser())!;
  if (!podeFinancas(me)) redirect("/hoje");
  const q = await searchParams;
  const { t } = await getT();
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : today().slice(0, 7);
  // the page shows the title in the header: the markdown's own "# …" is dropped here (it stays in the Google Doc)
  const md = relatorioMensal(mes).replace(/^# .*\n+/, "");
  return (
    <div className="mx-auto max-w-3xl">
      <div className="print:hidden">
        <CabecalhoPagina selo="semente" rotulo={<>{t.gestaoLbl} · {t.financas}</>} titulo={<>{t.relatorioTitulo} · <span className="first-letter:uppercase">{nomeMes(mes)}</span></>}
          acoes={<div className="flex flex-wrap items-center gap-2">
            <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={`/financas/relatorio?m=${addMes(mes, -1)}`} />
            <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={`/financas/relatorio?m=${addMes(mes, 1)}`} />
            <Imprimir label={t.imprimir} />
            <ExportarGoogle pessoaId={me.pessoa?.id} t={t} campos={{ tipo: "relatorio", id: mes }} formatos={[{ formato: "doc", label: t.cx.exportarDoc }]} />
          </div>} />
      </div>
      <h1 className="hidden print:block print:text-2xl print:font-semibold">{t.relatorioTitulo} · {nomeMes(mes)}</h1>
      <article className="print:text-black"><Md>{md}</Md></article>
    </div>
  );
}
