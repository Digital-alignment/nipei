import { NotebookPen } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import { addToEquipeAction, notaInternaAction } from "@/app/(v2)/actions";
import type { Dict } from "@/lib/v2/i18n";

type Equipe = { id: string; nome: string; cor: string; gestao: boolean };

/**
 * "Escolher equipe" for one person: tick one or more teams and add them in one go, plus the quick
 * action "Nota interna" (management only) that saves a private note on the person's profile.
 * Plain forms (no client state), so it works in lists of many people.
 */
export default function EscolherEquipes({ pessoaId, equipes, t, notas = 0, comNota = true }: {
  pessoaId: string; equipes: Equipe[]; t: Dict; notas?: number; comNota?: boolean;
}) {
  return (
    <div className="grid gap-2 w-full sm:w-auto">
      {equipes.length > 0 && (
        <form action={addToEquipeAction} aria-label={t.marqueEquipes} title={t.marqueEquipes} className="flex flex-wrap items-center gap-1.5">
          <input type="hidden" name="pessoa" value={pessoaId} />
          {equipes.map((e) => (
            <label key={e.id} title={e.gestao ? t.gestaoCompleta : undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs cursor-pointer select-none has-[:checked]:bg-neutral-900 has-[:checked]:text-white has-[:checked]:border-neutral-900 dark:has-[:checked]:bg-white dark:has-[:checked]:text-neutral-900">
              <input type="checkbox" name="equipe" value={e.id} className="sr-only" />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.cor }} />{e.nome}{e.gestao ? " *" : ""}
            </label>
          ))}
          <BotaoEnviar enviando="…" className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs">{t.adicionar}</BotaoEnviar>
        </form>
      )}
      {comNota && (
        <details className="group">
          <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            <NotebookPen size={13} />{t.notaInterna}{notas > 0 && <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-1.5 tabular-nums">{notas}</span>}
          </summary>
          <form action={notaInternaAction} className="grid gap-1.5 mt-2">
            <input type="hidden" name="pessoa" value={pessoaId} /><input type="hidden" name="modo" value="nova" />
            <textarea name="texto" required rows={2} maxLength={4000} placeholder={t.notaPlaceholder}
              className="w-full sm:w-80 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm" />
            <div className="flex items-center gap-2">
              <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs">{t.salvarNota}</BotaoEnviar>
              <span className="text-[11px] text-neutral-500">{t.soEquipe1}</span>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
