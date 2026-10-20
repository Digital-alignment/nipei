import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser } from "@/lib/v2/data";
import { TEMAS_REUNIAO, getColetivo, getDiagnostico, participa } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";
import { reuniaoAction } from "../../../../actions";

// Agenda of team meeting #1 or #2 (Lynn's topics, filled by the AI from the assessment's answers).
export default async function Reuniao({ params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !TEMAS_REUNIAO[n] || !(me.gestao || participa(d, me.pessoa))) notFound();
  const r = getColetivo(d.id).reunioes[n];

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{d.titulo}</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.reuniao} #{n}</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-4">{r?.data ? r.data.split("-").reverse().join("/") : t.semData} · {t.temas}: {TEMAS_REUNIAO[n].join(" · ")}</p>

      {me.gestao && (
        <form action={reuniaoAction} className="mb-6">
          <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="n" value={n} />
          <BotaoEnviar name="acao" value="pauta" enviando={t.processando} className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm inline-flex items-center gap-1.5">
            <Sparkles size={14} />{t.gerarPauta}
          </BotaoEnviar>
          <p className="text-xs text-neutral-500 mt-2">{t.pautaAviso}</p>
        </form>
      )}

      {r?.pauta
        ? <div className="text-sm whitespace-pre-wrap rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 leading-relaxed">{r.pauta}</div>
        : <p className="text-sm text-neutral-500">{t.semPauta}</p>}
    </div>
  );
}
