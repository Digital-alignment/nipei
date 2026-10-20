import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Avatar, Chip, Title } from "@/components/v2/ui";
import { can, currentUser, getEquipes, getPessoas, type Pessoa } from "@/lib/v2/data";
import { resumoPessoas } from "@/lib/v2/pessoasInfo";
import { NIVEL_COR } from "@/lib/v2/participacao";
import { getT } from "@/lib/v2/i18n";
import { addToEquipeAction, createPessoaAction } from "../actions";

const waLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;
const small = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs";
const btn = "rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-1 text-xs";

export default async function Pessoas({ searchParams }: { searchParams: Promise<{ q?: string; equipe?: string; ordem?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes();
  const gerenciaveis = equipes.filter((e) => can.gerirEquipe(me, e.id));
  const info = resumoPessoas(me.gestao); // Participação only for gestão
  const busca = (q.q ?? "").toLowerCase().trim();
  const todas = getPessoas().filter((p) => !busca || `${p.name} ${p.apelido} ${p.funcao} ${p.nipeiId}`.toLowerCase().includes(busca));
  const ordem = me.gestao && ["carga", "atrasadas", "participacao"].includes(q.ordem ?? "") ? q.ordem! : "nome";
  const ordenar = (ps: Pessoa[]) => [...ps].sort((a, b) => {
    const A = info.get(a.id)!, B = info.get(b.id)!;
    if (ordem === "carga") return B.abertas - A.abertas;
    if (ordem === "atrasadas") return B.atrasadas - A.atrasadas;
    if (ordem === "participacao") return (B.participacao?.total ?? -1) - (A.participacao?.total ?? -1);
    return a.name.localeCompare(b.name, "pt");
  });
  const ativas = ordenar(todas.filter((p) => p.equipes.length > 0 && (!q.equipe || p.equipes.includes(q.equipe))));
  const inativas = todas.filter((p) => p.equipes.length === 0);
  const link = (o: Record<string, string | undefined>) => "/pessoas?" + new URLSearchParams(Object.entries({ q: q.q, equipe: q.equipe, ordem: q.ordem, ...o }).filter(([, v]) => v) as [string, string][]);

  const Cartao = ({ p }: { p: Pessoa }) => {
    const n = info.get(p.id)!;
    const part = n.participacao;
    return (
      <li className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 hover:border-neutral-400 dark:hover:border-neutral-600">
        <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 after:absolute after:inset-0">
          <Avatar name={p.name} size={40} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.dadosConfirmadosEm)}` : undefined} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-xs text-neutral-500 truncate">{p.funcao || p.area || p.nipeiId}</p>
          </div>
        </Link>
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <span className="flex gap-1">{p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && <span key={id} title={e.nome} className="w-2 h-2 rounded-full" style={{ background: e.cor }} />; })}</span>
          <span className="text-neutral-500 tabular-nums">{n.abertas} {t.abertasLbl}</span>
          {n.atrasadas > 0 && <span className="text-red-600 dark:text-red-400 tabular-nums">{n.atrasadas} {t.atrasadasLbl}</span>}
          {part && <span title={t.participacao} className={`ml-auto tabular-nums font-medium ${NIVEL_COR[part.nivel]}`}>{part.total ?? "—"}</span>}
          {p.whatsapp && <a href={waLink(p.whatsapp)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={`relative z-10 text-neutral-400 hover:text-green-600 ${part ? "" : "ml-auto"}`}><MessageCircle size={16} /></a>}
        </div>
      </li>
    );
  };

  return (
    <>
      {(() => { const e = q.equipe ? equipes.find((x) => x.id === q.equipe) : null; return (
        <Link href={e ? `/equipes/${e.id}` : "/equipes"} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{e ? e.nome : t.equipes}</Link>
      ); })()}
      <Title>{t.pessoas}</Title>
      <form className="mb-3">
        {q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
        {q.ordem && <input type="hidden" name="ordem" value={q.ordem} />}
        <input name="q" defaultValue={q.q} placeholder={t.buscar} type="search"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
      </form>
      <div className="flex gap-1.5 overflow-x-auto mb-2 -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <Chip href={link({ equipe: undefined })} on={!q.equipe}>{t.todas}</Chip>
        {[...equipes].sort((a, b) => Number(b.id === q.equipe) - Number(a.id === q.equipe)).map((e) => <Chip key={e.id} href={link({ equipe: e.id })} cor={e.cor} on={q.equipe === e.id}>{e.nome}</Chip>)}
      </div>
      {me.gestao && (
        <div className="flex items-center gap-1.5 mb-5 whitespace-nowrap text-xs text-neutral-500 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {t.ordenar}:
          {(["nome", "carga", "atrasadas", "participacao"] as const).map((o) => (
            <Link key={o} href={link({ ordem: o === "nome" ? undefined : o })} className={`rounded-full px-2 py-0.5 ${ordem === o ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-700"}`}>
              {o === "nome" ? t.nome : o === "carga" ? t.maisCarga : o === "atrasadas" ? t.atrasadas : t.participacao}
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{t.membros} <span className="font-normal">({ativas.length})</span></p>
      <ul className="grid gap-2 sm:grid-cols-2 mb-6">{ativas.map((p) => <Cartao key={p.id} p={p} />)}</ul>

      {gerenciaveis.length > 0 && (
        <details className="mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">+ {t.novaPessoa}</summary>
          <form action={createPessoaAction} className="flex flex-wrap items-center gap-2 px-4 pb-4">
            <input name="name" required maxLength={120} placeholder={t.nome} className={`${small} flex-1 min-w-40 py-1.5 text-sm`} />
            <select name="equipe" aria-label={t.equipe} className={small}>
              {me.gestao && <option value="">{t.semEquipe}</option>}
              {gerenciaveis.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <button className={btn}>{t.adicionar}</button>
          </form>
        </details>
      )}

      {inativas.length > 0 && (
        <details className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t.inativos} ({inativas.length})</summary>
          <ul className="px-4 pb-2">
            {inativas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5 border-t border-neutral-100 dark:border-neutral-800">
                <Link href={`/pessoas/${p.id}`} className="flex items-center gap-3 flex-1 min-w-32"><Avatar name={p.name} size={28} /><span className="text-sm">{p.name}</span></Link>
                {gerenciaveis.length > 0 && (
                  <form action={addToEquipeAction} className="flex items-center gap-2">
                    <input type="hidden" name="pessoa" value={p.id} />
                    <select name="equipe" aria-label={t.ativarEm} className={small}>{gerenciaveis.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
                    <button className={btn}>{t.ativar}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {me.gestao && <p className="mt-8 text-xs text-neutral-500"><Link href="/legacy" className="underline">{t.versaoAnterior}</Link></p>}
    </>
  );
}
