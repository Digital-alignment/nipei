import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Md from "@/components/v2/Md";
import { currentUser } from "@/lib/v2/data";
import { diaLocal } from "@/lib/v2/conhecimento";
import { getColetivo, getDiagnostico, participa, participantes } from "@/lib/v2/diagnostico";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { aceitarCodigoAction, codigoAction } from "../../../actions";

const btn = "rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm";

// D4: code of agreements — gestão drafts (AI) and publishes versions; each participant accepts the published one.
export default async function Codigo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !(me.gestao || participa(d, me.pessoa))) notFound();
  const c = getColetivo(d.id).codigo;
  const meu = me.pessoa ? c.aceites[me.pessoa.id] : undefined;
  const pendente = !!me.pessoa && participa(d, me.pessoa) && c.versao > 0 && (meu?.versao ?? 0) < c.versao;
  const hidden = <input type="hidden" name="diagnostico" value={d.id} />;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{d.titulo}</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.codigoAcordos}</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-4">
        {c.versao ? `${t.versao} ${c.versao} · ${c.status === "publicado" ? `${t.publicado} ${fmtDate(diaLocal(c.publicadoEm), lang)}` : t.emRevisao}` : t.naoGerado}
      </p>

      {pendente && (
        <form action={aceitarCodigoAction} className="mb-6 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3">
          {hidden}
          <BotaoEnviar enviando={t.salvando} className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">{t.aceitarCodigo} ({t.versao} {c.versao})</BotaoEnviar>
        </form>
      )}
      {meu && !pendente && <p className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400 mb-6"><CheckCircle2 size={16} />{t.aceitoEm} {fmtDate(diaLocal(meu.em), lang)} ({t.versao} {meu.versao})</p>}

      {me.gestao && (
        <div className="grid gap-3 mb-8">
          <form action={codigoAction}>{hidden}
            <BotaoEnviar name="acao" value="ia" enviando={t.processando} className={`${btn} inline-flex items-center gap-1.5`}><Sparkles size={14} />{c.texto ? t.atualizarIA : t.gerarIA}</BotaoEnviar>
            <p className="text-xs text-neutral-500 mt-2">{t.codigoAviso}</p>
          </form>
          {c.texto && (
            <form action={codigoAction} className="grid gap-2">{hidden}
              <textarea name="texto" defaultValue={c.texto} rows={18} className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2">
                <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} className={btn}>{t.salvarRascunho}</BotaoEnviar>
                <BotaoEnviar name="acao" value="publicar" enviando={t.salvando} className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">{t.publicarVersao}</BotaoEnviar>
              </div>
            </form>
          )}
          {c.versao > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{t.aceites}</p>
              <ul className="text-sm grid gap-0.5">
                {participantes(d).map((p) => {
                  const a = c.aceites[p.id];
                  return <li key={p.id}>{p.name}: {a?.versao === c.versao ? `✅ ${fmtDate(diaLocal(a.em), lang)}` : `⚠️ ${t.pendenteAceite}`}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {c.texto ? <Md>{c.texto}</Md> : null}
    </div>
  );
}
