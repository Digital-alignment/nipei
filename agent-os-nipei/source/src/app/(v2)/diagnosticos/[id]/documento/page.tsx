import Link from "next/link";
import ChipDS from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Imprimir from "@/components/v2/Imprimir";
import Md from "@/components/v2/Md";

import { currentUser } from "@/lib/v2/data";
import { diaLocal } from "@/lib/v2/conhecimento";
import { getDiagnostico, getDocumento } from "@/lib/v2/diagnostico";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { documentoAction } from "../../../actions";


// D4: the final document for Lynn, in Portuguese and English, printable to PDF.
export default async function Documento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !me.gestao) notFound();
  const idioma = q.lang === "en" ? "en" : "pt";
  const doc = getDocumento(d.id, idioma);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="print:hidden">
        <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{d.titulo}</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t.documentoFinal}</h1>
        <p className="text-sm text-t2 mt-1 mb-3">{doc?.geradoEm ? `${t.geradoEm} ${fmtDate(diaLocal(doc.geradoEm), lang)}` : t.naoGerado}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          <ChipDS ativo={idioma === "pt"} href={`/diagnosticos/${d.id}/documento`}>Português</ChipDS>
          <ChipDS ativo={idioma === "en"} href={`/diagnosticos/${d.id}/documento?lang=en`}>English</ChipDS>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          <form action={documentoAction}><input type="hidden" name="diagnostico" value={d.id} />
            <BotaoEnviar name="acao" value="montar" enviando={t.processando} icone="tarefa" variante="tonal">{t.montarPT}</BotaoEnviar>
          </form>
          <form action={documentoAction}><input type="hidden" name="diagnostico" value={d.id} />
            <BotaoEnviar name="acao" value="traduzir" enviando={t.processando} icone="gerar-outra" variante="tonal">{t.traduzirEN}</BotaoEnviar>
          </form>
          {doc && <Imprimir label={t.imprimir} />}
        </div>
        <p className="text-xs text-t2 mb-8">{t.documentoAviso}</p>
      </div>
      {doc ? <article className="print:text-black"><Md>{doc.texto}</Md></article> : <p className="text-sm text-t2">{t.naoGerado}</p>}
    </div>
  );
}
