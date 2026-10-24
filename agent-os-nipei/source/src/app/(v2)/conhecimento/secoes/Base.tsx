import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Chip, Empty } from "@/components/v2/ui";
import type { Ctx } from "./index";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const MAX = 60;

/** The confirmed facts — the only knowledge the AIs treat as true. Search + team filter (?q ?equipe). */
export default function Base({ ctx }: { ctx: Ctx }) {
  const { q, t, equipes, confirmados } = ctx;
  const acervoDe = new Map(ctx.fontes.filter((f) => f.acervo).map((f) => [f.id, f.acervo]));
  const busca = (q.q ?? "").toLowerCase().trim();
  const lista = confirmados.filter((f) => (!q.equipe || f.equipe === q.equipe) && (!busca || f.texto.toLowerCase().includes(busca)))
    .sort((a, b) => b.revisadoEm.localeCompare(a.revisadoEm));
  const url = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
    return `/conhecimento${s ? `?${s}` : ""}#base`;
  };
  return (
    <>
      <form action="/conhecimento#base" className="mb-3">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        <input name="q" type="search" defaultValue={q.q} placeholder={t.buscar} className={field} />
      </form>
      <div className="flex flex-wrap gap-2 mb-3">
        <Chip href={url({ q: q.q })} on={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} cor={e.cor} on={q.equipe === e.id} href={url({ q: q.q, equipe: e.id })}>{e.nome}</Chip>)}
      </div>
      {lista.length ? (
        <>
          <ul className="grid gap-2">
            {lista.slice(0, MAX).map((f) => (
              <li key={f.id} className="text-sm">
                <span className="text-[11px] uppercase tracking-wide text-neutral-400 mr-2">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</span>
                {f.texto} <Link href={`/conhecimento/${f.fonte}`} className="text-xs text-neutral-400 underline">↗</Link>
                {acervoDe.has(f.fonte) && <Link href={`/acervo#${acervoDe.get(f.fonte)}`} title={t.noAcervo} aria-label={t.noAcervo} className="ml-1 inline-flex align-middle text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"><FolderOpen size={13} /></Link>}
              </li>
            ))}
          </ul>
          {lista.length > MAX && <p className="text-xs text-neutral-500 mt-3">{t.mostrando} {MAX} / {lista.length} — {t.refineBusca}</p>}
        </>
      ) : <Empty>{t.semItens}</Empty>}
    </>
  );
}
