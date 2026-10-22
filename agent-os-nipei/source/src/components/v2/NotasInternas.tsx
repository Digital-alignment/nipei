import { Lock, MessageSquare, Pencil } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import { notaInternaAction } from "@/app/(v2)/actions";
import type { NotaInterna } from "@/lib/v2/notasInternas";
import type { Dict } from "@/lib/v2/i18n";

const quando = (iso: string) => iso.slice(0, 16).replace("T", " ");
const campo = "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm";
const sec = "rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs";

/** Profile card (management only): internal notes about the person, editable and commentable by Equipe 1. */
export default function NotasInternas({ pessoaId, notas, t }: { pessoaId: string; notas: NotaInterna[]; t: Dict }) {
  const oculto = (modo: string, nota: string) => (<><input type="hidden" name="pessoa" value={pessoaId} /><input type="hidden" name="modo" value={modo} /><input type="hidden" name="nota" value={nota} /></>);
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/10 p-4 grid gap-3">
      <div className="flex items-center gap-2">
        <Lock size={13} className="text-amber-700 dark:text-amber-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex-1">{t.notasInternasTitulo}</p>
        <span className="text-[11px] text-neutral-500">{t.soEquipe1}</span>
      </div>
      <form action={notaInternaAction} className="grid gap-1.5">
        {oculto("nova", "")}
        <textarea name="texto" required rows={2} maxLength={4000} placeholder={t.notaPlaceholder} className={campo} />
        <BotaoEnviar enviando="…" className="justify-self-start rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs">{t.salvarNota}</BotaoEnviar>
      </form>
      {notas.length === 0 && <p className="text-sm text-neutral-500">{t.semNotas}</p>}
      <ul className="grid gap-3">
        {notas.map((n) => (
          <li key={n.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 grid gap-2">
            <p className="text-xs text-neutral-500">{quando(n.em)} · {n.por}{n.editadoEm && ` · ${t.notaEditada} ${n.editadoPor} ${quando(n.editadoEm)}`}</p>
            <p className="text-sm whitespace-pre-wrap">{n.texto}</p>
            {n.comentarios.length > 0 && (
              <ul className="grid gap-1 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3">
                {n.comentarios.map((c, i) => <li key={i} className="text-sm"><span className="text-xs text-neutral-500">{quando(c.em)} · {c.por}: </span>{c.texto}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <details>
                <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs text-neutral-500"><MessageSquare size={12} />{t.comentar}</summary>
                <form action={notaInternaAction} className="flex gap-1.5 mt-1.5">
                  {oculto("comentar", n.id)}
                  <input name="texto" required maxLength={1500} placeholder={t.comentarPlaceholder} className={`${campo} min-w-0 flex-1 sm:w-72`} />
                  <BotaoEnviar enviando="…" className={sec}>{t.comentar}</BotaoEnviar>
                </form>
              </details>
              <details>
                <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs text-neutral-500"><Pencil size={12} />{t.editar}</summary>
                <form action={notaInternaAction} className="grid gap-1.5 mt-1.5">
                  {oculto("editar", n.id)}
                  <textarea name="texto" required rows={3} maxLength={4000} defaultValue={n.texto} className={`${campo} sm:w-96`} />
                  <BotaoEnviar enviando="…" className={`${sec} justify-self-start`}>{t.salvar}</BotaoEnviar>
                </form>
              </details>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
