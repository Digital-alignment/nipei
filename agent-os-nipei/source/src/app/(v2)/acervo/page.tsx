import { ExternalLink } from "lucide-react";
import { Chip, Empty, Title } from "@/components/v2/ui";
import { ACERVO_TIPOS, currentUser, getAcervo, getProjetos } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { createAcervoAction } from "../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

export default async function Acervo({ searchParams }: { searchParams: Promise<{ tipo?: string; projeto?: string; q?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const projetos = getProjetos();
  const busca = (q.q ?? "").toLowerCase().trim();
  const itens = getAcervo().filter((i) => (!q.tipo || i.tipo === q.tipo) && (!q.projeto || i.projeto === q.projeto)
    && (!busca || `${i.titulo} ${i.descricao}`.toLowerCase().includes(busca)));
  const link = (p: Record<string, string | undefined>) =>
    "/acervo?" + new URLSearchParams(Object.entries({ tipo: q.tipo, projeto: q.projeto, q: q.q, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <Title sub={t.acervoIntro}>{t.acervo}</Title>
      <form className="mb-3">
        {q.tipo && <input type="hidden" name="tipo" value={q.tipo} />}
        {q.projeto && <input type="hidden" name="projeto" value={q.projeto} />}
        <input name="q" type="search" defaultValue={q.q} placeholder={t.buscar} className={field} />
      </form>
      <div className="flex flex-wrap gap-2 mb-2">
        <Chip href={link({ tipo: undefined })} on={!q.tipo}>{t.todas}</Chip>
        {ACERVO_TIPOS.map((tp) => <Chip key={tp} href={link({ tipo: tp })} on={q.tipo === tp}>{t.tipos[tp]}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {projetos.map((p) => <Chip key={p.id} href={link({ projeto: q.projeto === p.id ? undefined : p.id })} on={q.projeto === p.id}>{p.nome}</Chip>)}
      </div>

      {itens.length === 0 ? <Empty>{t.semItens}</Empty> : (
        <ul className="grid gap-2">
          {itens.map((i) => (
            <li key={i.id}>
              <a href={i.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 hover:border-neutral-400 dark:hover:border-neutral-600">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.titulo}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {t.tipos[i.tipo] ?? i.tipo}{i.ano && ` · ${i.ano}`}{i.projeto && ` · ${projetos.find((p) => p.id === i.projeto)?.nome ?? i.projeto}`}
                  </p>
                  {i.descricao && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{i.descricao}</p>}
                </div>
                <ExternalLink size={16} className="text-neutral-400 shrink-0 mt-0.5" aria-label={t.abrir} />
              </a>
            </li>
          ))}
        </ul>
      )}

      {(me.gestao || me.coordena.length > 0) && (
        <details className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">+ {t.novoItem}</summary>
          <form action={createAcervoAction} className="grid gap-3 px-4 pb-4">
            <label className="grid gap-1 text-sm">{t.titulo}<input name="titulo" required maxLength={150} className={field} /></label>
            <label className="grid gap-1 text-sm">{t.link}<input name="url" type="url" required pattern="https://.*" placeholder="https://drive.google.com/…" className={field} /></label>
            <div className="grid grid-cols-3 gap-3">
              <label className="grid gap-1 text-sm">{t.tipo}
                <select name="tipo" className={field}>{ACERVO_TIPOS.map((tp) => <option key={tp} value={tp}>{t.tipos[tp]}</option>)}</select>
              </label>
              <label className="grid gap-1 text-sm">{t.projeto}
                <select name="projeto" className={field}><option value="">{t.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              </label>
              <label className="grid gap-1 text-sm">{t.ano}<input name="ano" inputMode="numeric" pattern="\d{4}" maxLength={4} className={field} /></label>
            </div>
            <label className="grid gap-1 text-sm">{t.descricao}<input name="descricao" maxLength={300} className={field} /></label>
            <button className="justify-self-start rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{t.adicionar}</button>
          </form>
        </details>
      )}
    </>
  );
}
