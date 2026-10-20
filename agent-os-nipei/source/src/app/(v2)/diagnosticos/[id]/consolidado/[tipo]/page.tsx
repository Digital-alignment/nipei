import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Md from "@/components/v2/Md";
import { currentUser } from "@/lib/v2/data";
import { getColetivo, getDiagnostico } from "@/lib/v2/diagnostico";
import { diaLocal } from "@/lib/v2/conhecimento";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { consolidadoAction } from "../../../../actions";

// D4: consolidated retreat report / responsibility matrix (gestão).
export default async function Consolidado({ params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !me.gestao || !["retiro", "matriz"].includes(tipo)) notFound();
  const c = getColetivo(d.id).consolidados[tipo];

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{d.titulo}</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{tipo === "retiro" ? t.relatorioRetiro : t.matrizResp}</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-4">{c?.geradoEm ? `${t.geradoEm} ${fmtDate(diaLocal(c.geradoEm), lang)}` : t.naoGerado}</p>
      <form action={consolidadoAction} className="mb-6">
        <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="tipo" value={tipo} />
        <BotaoEnviar enviando={t.processando} className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm inline-flex items-center gap-1.5">
          <Sparkles size={14} />{c ? t.atualizarIA : t.gerarIA}
        </BotaoEnviar>
        <p className="text-xs text-neutral-500 mt-2">{t.consolidadoAviso}</p>
      </form>
      {c?.texto && <Md>{c.texto}</Md>}
    </div>
  );
}
