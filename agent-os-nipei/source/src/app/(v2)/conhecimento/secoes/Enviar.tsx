import Upload from "@/components/v2/Upload";
import { enviarFonteAction, enviarFonteArquivoAction } from "../../actions";
import type { Ctx } from "./index";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const btn = "rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium";

/** Send a source: file/photo, link or pasted text. The AI splits it into facts to review. */
export default function Enviar({ ctx: { t } }: { ctx: Ctx }) {
  return (
    <div className="grid gap-3">
      <div>
        <Upload id="fonte" action={enviarFonteArquivoAction} accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.csv"
          labels={{ arquivo: t.enviarArquivoFonte, foto: t.foto, enviando: t.enviando, maximo: t.maximo }} />
        <p className="text-xs text-neutral-500 mt-1">{t.formatosFonte}</p>
      </div>
      <form action={enviarFonteAction} className="grid gap-2">
        <input name="url" type="url" placeholder={t.ouColeLink} className={field} />
        <textarea name="texto" rows={3} placeholder={t.ouColeTexto} maxLength={100000} className={field} />
        <div className="flex gap-2">
          <input name="titulo" placeholder={t.tituloOpcional} maxLength={150} className={field} />
          <button className={btn}>{t.enviar}</button>
        </div>
      </form>
    </div>
  );
}
