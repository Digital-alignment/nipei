import BotaoEnviar from "./BotaoEnviar";
import Icone from "@/components/ds/Icone";
import { notaInternaAction } from "@/app/(v2)/actions";
import type { NotaInterna } from "@/lib/v2/notasInternas";
import type { Dict } from "@/lib/v2/i18n";

const quando = (iso: string) => iso.slice(0, 16).replace("T", " ");
const campo = "w-full rounded-interno bg-s2 px-2.5 py-1.5 text-sm";
const sec = "anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s3 px-3.5 font-texto text-sm font-semibold text-t1 hover:bg-s4";

/** Profile card (management only): internal notes about the person, editable and commentable by Equipe 1. */
export default function NotasInternas({ pessoaId, notas, t }: { pessoaId: string; notas: NotaInterna[]; t: Dict }) {
  const oculto = (modo: string, nota: string) => (<><input type="hidden" name="pessoa" value={pessoaId} /><input type="hidden" name="modo" value={modo} /><input type="hidden" name="nota" value={nota} /></>);
  return (
    <div className="rounded-cartao border bg-warn-bg p-4 grid gap-3">
      <div className="flex items-center gap-2">
        <Icone nome="cadeado"  tamanho={13} className="text-warn" />
        <p className="rotulo-maiusculo text-t3 flex-1">{t.notasInternasTitulo}</p>
        <span className="text-xs text-t2">{t.soEquipe1}</span>
      </div>
      <form action={notaInternaAction} className="grid gap-1.5">
        {oculto("nova", "")}
        <textarea name="texto" required rows={2} maxLength={4000} placeholder={t.notaPlaceholder} className={campo} />
        <BotaoEnviar enviando="…" className="justify-self-start anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.salvarNota}</BotaoEnviar>
      </form>
      {notas.length === 0 && <p className="text-sm text-t2">{t.semNotas}</p>}
      <ul className="grid gap-3">
        {notas.map((n) => (
          <li key={n.id} className="rounded-[16px] bg-s1 p-3 grid gap-2">
            <p className="text-xs text-t2">{quando(n.em)} · {n.por}{n.editadoEm && ` · ${t.notaEditada} ${n.editadoPor} ${quando(n.editadoEm)}`}</p>
            <p className="text-sm whitespace-pre-wrap">{n.texto}</p>
            {n.comentarios.length > 0 && (
              <ul className="grid gap-1 border-l-2 border-s3 pl-3">
                {n.comentarios.map((c, i) => <li key={i} className="text-sm"><span className="text-xs text-t2">{quando(c.em)} · {c.por}: </span>{c.texto}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <details>
                <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs text-t2"><Icone nome="mensagem"  tamanho={12} />{t.comentar}</summary>
                <form action={notaInternaAction} className="flex gap-1.5 mt-1.5">
                  {oculto("comentar", n.id)}
                  <input name="texto" required maxLength={1500} placeholder={t.comentarPlaceholder} className={`${campo} min-w-0 flex-1 sm:w-72`} />
                  <BotaoEnviar enviando="…" className={sec}>{t.comentar}</BotaoEnviar>
                </form>
              </details>
              <details>
                <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs text-t2"><Icone nome="editar"  tamanho={12} />{t.editar}</summary>
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
