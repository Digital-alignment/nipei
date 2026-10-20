import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Section } from "@/components/v2/ui";
import AutoRefresh from "@/components/v2/AutoRefresh";
import { currentUser, getEquipes, getObjetivos, getPessoas, getProjetos } from "@/lib/v2/data";
import { diaLocal, getFatos, getFontes, podeRevisar, type StatusFato } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { reprocessarFonteAction, revisarFatoAction } from "../../actions";

const small = "rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs";
const STATUS_COR: Record<StatusFato, string> = {
  proposto: "text-amber-700 dark:text-amber-400", confirmado: "text-green-700 dark:text-green-400",
  substituido: "text-neutral-400", descartado: "text-neutral-400",
};

export default async function FonteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const f = getFontes().find((x) => x.id === id);
  if (!f) notFound();
  const fatos = getFatos().filter((x) => x.fonte === id).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const meus = fatos.filter((x) => x.status === "proposto" && podeRevisar(me, x));
  const equipes = getEquipes(), projetos = getProjetos(), objetivos = getObjetivos(), pessoas = getPessoas();
  const nome = (pid: string) => pessoas.find((p) => p.id === pid)?.name.split(" (")[0] ?? pid;
  const podeReprocessar = f.status !== "processando" && (me.gestao || f.enviadoPor === (me.pessoa?.id ?? me.username));
  const statusTxt: Record<StatusFato, string> = { proposto: t.status_proposto, confirmado: t.status_confirmado, substituido: t.status_substituido, descartado: t.status_descartado };
  const ligados = (x: (typeof fatos)[number]) => [
    equipes.find((e) => e.id === x.equipe)?.nome, ...x.projetos.map((p) => projetos.find((y) => y.id === p)?.nome),
    ...x.objetivos.map((o) => objetivos.find((y) => y.id === o)?.titulo), ...x.pessoas.map(nome), x.dataReferencia && fmtDate(x.dataReferencia, lang),
  ].filter(Boolean).join(" · ");

  return (
    <>
      <AutoRefresh ativo={f.status === "processando"} />
      <Link href="/conhecimento" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.conhecimento}</Link>
      <h1 className="text-2xl font-semibold tracking-tight break-words">{f.titulo || f.url}</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-4">
        {t.enviadoPor} {nome(f.enviadoPor)} · {fmtDate(diaLocal(f.enviadoEm), lang)}
        {f.arquivo && <> · <a href={`/conhecimento/${f.id}/arquivo`} target="_blank" className="underline inline-flex items-center gap-0.5">{t.verOriginal}<ExternalLink size={12} /></a></>}
        {f.url && <> · <a href={f.url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">{t.verOriginal}<ExternalLink size={12} /></a></>}
      </p>

      {f.status === "processando" && <p className="text-sm text-neutral-500 mb-6">{t.processando}</p>}
      {f.status === "erro" && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{t.erroFonte}: {f.erro}</p>}
      {podeReprocessar && (f.status === "erro" || meus.length > 0 || fatos.length === 0) && (
        <form action={reprocessarFonteAction} className="mb-6"><input type="hidden" name="id" value={f.id} /><button className={small}>{t.reprocessar}</button></form>
      )}

      {f.resumo && f.status === "pronta" && (
        <Section title={t.resumoFonte}><div className="text-sm whitespace-pre-wrap">{f.resumo}</div></Section>
      )}

      {f.status === "pronta" && (
        <Section title={`${t.fatos} (${fatos.length})`}>
          {meus.length > 1 && (
            <form action={revisarFatoAction} className="mb-4">
              {meus.map((x) => <input key={x.id} type="hidden" name="id" value={x.id} />)}
              <button name="acao" value="confirmar" className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm">{t.confirmarTodos} ({meus.length})</button>
            </form>
          )}
          {fatos.length === 0 && <p className="text-sm text-neutral-500">{t.semFatos}</p>}
          <ul className="grid gap-3">
            {fatos.map((x) => (
              <li key={x.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
                <p className="text-[11px] uppercase tracking-wide text-neutral-400 mb-1">
                  {t.tiposFato[x.tipo as keyof typeof t.tiposFato] ?? x.tipo} · <span className={STATUS_COR[x.status]}>{statusTxt[x.status]}</span>
                  {x.revisadoPor && ` · ${x.revisadoPor}`}
                </p>
                {x.status === "proposto" && podeRevisar(me, x) ? (
                  <form action={revisarFatoAction} className="grid gap-2">
                    <input type="hidden" name="id" value={x.id} />
                    <textarea name="texto" defaultValue={x.texto} rows={2} maxLength={600}
                      className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" />
                    <div className="flex gap-2">
                      <button name="acao" value="confirmar" className={`${small} border-green-600 text-green-700 dark:text-green-400`}>{t.confirmar}</button>
                      <button name="acao" value="descartar" className={small}>{t.descartar}</button>
                    </div>
                  </form>
                ) : (
                  <p className={`text-sm ${x.status === "descartado" ? "line-through text-neutral-400" : ""}`}>{x.texto}</p>
                )}
                {ligados(x) && <p className="text-xs text-neutral-500 mt-1">{ligados(x)}</p>}
                {x.status === "proposto" && !podeRevisar(me, x) && <p className="text-xs text-neutral-400 mt-1">{t.aguardandoRevisao}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {f.texto && f.status === "pronta" && (
        <details className="mb-8"><summary className="text-sm text-neutral-500 cursor-pointer">{t.textoFonte}</summary>
          <div className="text-xs whitespace-pre-wrap mt-2 text-neutral-600 dark:text-neutral-400">{f.texto}</div>
        </details>
      )}
    </>
  );
}
