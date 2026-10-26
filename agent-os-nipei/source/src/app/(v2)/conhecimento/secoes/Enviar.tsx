import Upload from "@/components/v2/Upload";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Campo from "@/components/ds/Campo";
import { enviarFonteAction, enviarFonteArquivoAction } from "../../actions";
import type { Ctx } from "./index";

/** Send a source: file/photo, link or pasted text. The AI splits it into facts to review. */
export default function Enviar({ ctx: { t } }: { ctx: Ctx }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Upload id="fonte" action={enviarFonteArquivoAction} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.csv"
          labels={{ arquivo: t.enviarArquivoFonte, foto: t.foto, enviando: t.enviando, maximo: t.maximo }} />
        <p className="meta text-t3">{t.formatosFonte}</p>
      </div>
      <form action={enviarFonteAction} className="grid gap-2">
        <Campo name="url" inputMode="url" rotulo="Link" placeholder={t.ouColeLink} />
        <Campo tipo="area" name="texto" rotulo={t.ouColeTexto} rows={3} maxLength={100000} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <Campo name="titulo" rotulo={t.tituloOpcional} maxLength={150} />
          <BotaoEnviar enviando="…" icone="enviar" variante="primario">{t.enviar}</BotaoEnviar>
        </div>
      </form>
    </div>
  );
}
