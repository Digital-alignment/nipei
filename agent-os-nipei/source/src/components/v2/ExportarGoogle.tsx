import Link from "next/link";
import type { NomeIcone } from "@/components/ds/Icone";
import BotaoEnviar from "./BotaoEnviar";
import { exportarGoogleAction } from "@/app/(v2)/actions";
import { getConexoes } from "@/lib/v2/conexoes";
import { googleConfigurado } from "@/lib/v2/google";
import type { Dict } from "@/lib/v2/i18n";

// TODO(ícones): documento, apresentação, planilha (pedidos em ICONES.md)
const ICONE: Record<"doc" | "slides" | "sheet", NomeIcone> = { doc: "tarefa", slides: "imagem", sheet: "filtrar" };

/** "Export to Google" buttons; the file lands in the person's own Nipëi folder and opens. */
export default function ExportarGoogle({ pessoaId, t, campos, formatos }: {
  pessoaId?: string; t: Dict; campos: Record<string, string>; formatos: { formato: "doc" | "slides" | "sheet"; label: string }[];
}) {
  if (!pessoaId || !googleConfigurado()) return null;
  if (!getConexoes(pessoaId).google) {
    return <Link href={`/pessoas/${pessoaId}?aba=conexoes`} className="meta text-t2 underline">{t.cx.conecteGoogle}</Link>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {formatos.length > 1 && <span className="meta text-t2">{t.cx.exportar}</span>}
      {formatos.map((f) => {
        return (
          <form key={f.formato} action={exportarGoogleAction}>
            {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input type="hidden" name="formato" value={f.formato} />
            <BotaoEnviar enviando="…" icone={ICONE[f.formato]} tamanho="P">{f.label}</BotaoEnviar>
          </form>
        );
      })}
    </div>
  );
}
