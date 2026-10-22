import Link from "next/link";
import { FileText, Presentation, Sheet } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import { exportarGoogleAction } from "@/app/(v2)/actions";
import { getConexoes } from "@/lib/v2/conexoes";
import { googleConfigurado } from "@/lib/v2/google";
import type { Dict } from "@/lib/v2/i18n";

const ICONE = { doc: FileText, slides: Presentation, sheet: Sheet };

/** "Export to Google" buttons; the file lands in the person's own Nipëi folder and opens. */
export default function ExportarGoogle({ pessoaId, t, campos, formatos }: {
  pessoaId?: string; t: Dict; campos: Record<string, string>; formatos: { formato: "doc" | "slides" | "sheet"; label: string }[];
}) {
  if (!pessoaId || !googleConfigurado()) return null;
  if (!getConexoes(pessoaId).google) {
    return <Link href={`/pessoas/${pessoaId}?aba=conexoes`} className="text-xs text-neutral-500 underline">{t.cx.conecteGoogle}</Link>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {formatos.length > 1 && <span className="text-neutral-500">{t.cx.exportar}</span>}
      {formatos.map((f) => {
        const I = ICONE[f.formato];
        return (
          <form key={f.formato} action={exportarGoogleAction}>
            {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input type="hidden" name="formato" value={f.formato} />
            <BotaoEnviar enviando="…" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1"><I size={13} />{f.label}</BotaoEnviar>
          </form>
        );
      })}
    </div>
  );
}
