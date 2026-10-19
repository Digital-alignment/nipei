import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { Avatar, Chip, Section, Title } from "@/components/v2/ui";
import { getEquipes, getPessoas, type Pessoa } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";
import { addToEquipeAction } from "../actions";

const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

export default async function Pessoas({ searchParams }: { searchParams: Promise<{ q?: string; equipe?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const equipes = getEquipes();
  const busca = (q.q ?? "").toLowerCase().trim();
  const todas = getPessoas().filter((p) => !busca || p.name.toLowerCase().includes(busca));
  const ativas = todas.filter((p) => p.equipes.length > 0 && (!q.equipe || p.equipes.includes(q.equipe)));
  const inativas = todas.filter((p) => p.equipes.length === 0);

  const Row = ({ p }: { p: Pessoa }) => (
    <li className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <Avatar name={p.name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{p.name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && <Chip key={id} cor={e.cor}>{e.nome}</Chip>; })}
          {p.incompleta && <span className="text-[11px] text-amber-700 dark:text-amber-400">{t.fichaIncompleta}</span>}
        </div>
      </div>
      {p.whatsapp && <a href={waLink(p.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="p-2 text-neutral-500 hover:text-green-600"><MessageCircle size={18} /></a>}
      {p.email && <a href={`mailto:${p.email}`} aria-label="E-mail" className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Mail size={18} /></a>}
    </li>
  );

  return (
    <>
      <Title>{t.pessoas}</Title>
      <form className="mb-4">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        <input name="q" defaultValue={q.q} placeholder={t.buscar} type="search"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
      </form>
      <div className="flex flex-wrap gap-2 mb-5">
        <Chip href={`/pessoas${busca ? `?q=${encodeURIComponent(busca)}` : ""}`} on={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} href={`/pessoas?equipe=${e.id}`} cor={e.cor} on={q.equipe === e.id}>{e.nome}</Chip>)}
      </div>

      <Section title={t.membros} count={ativas.length}>
        <ul>{ativas.map((p) => <Row key={p.id} p={p} />)}</ul>
      </Section>

      {inativas.length > 0 && (
        <details className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.inativos} ({inativas.length})</summary>
          <ul className="px-4 pb-2">
            {inativas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 border-t border-neutral-100 dark:border-neutral-800">
                <Avatar name={p.name} size={28} />
                <span className="text-sm flex-1 min-w-32">{p.name}</span>
                <form action={addToEquipeAction} className="flex items-center gap-2">
                  <input type="hidden" name="pessoa" value={p.id} />
                  <select name="equipe" aria-label={t.ativarEm} className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs">
                    {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                  <button className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs">{t.ativar}</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-8 text-xs text-neutral-500"><Link href="/legacy" className="underline">{t.versaoAnterior}</Link></p>
    </>
  );
}
