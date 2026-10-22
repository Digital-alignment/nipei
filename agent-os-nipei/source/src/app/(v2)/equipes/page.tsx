import Link from "next/link";
import { Bell, Lock, Users } from "lucide-react";
import { Avatar, Title } from "@/components/v2/ui";
import { currentUser, getEquipes, getObjetivos, getPessoas, getTarefas, today, type Equipe } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

const menos = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

export default async function Equipes() {
  const { t } = await getT();
  const me = (await currentUser())!;
  const hoje = today();
  const tarefas = getTarefas(), objetivos = getObjetivos(), pessoas = getPessoas();
  const pessoa = (id: string) => pessoas.find((p) => p.id === id);
  const equipes = getEquipes();
  const minhas = equipes.filter((e) => me.coordena.includes(e.id) || (me.pessoa && e.membros.includes(me.pessoa.id)));
  const outras = equipes.filter((e) => !minhas.includes(e));
  const semEquipe = tarefas.filter((x) => !x.equipe && x.status !== "done").length;

  const Cartao = ({ e }: { e: Equipe }) => {
    const ts = tarefas.filter((x) => x.equipe === e.id);
    const abertas = ts.filter((x) => x.status !== "done");
    const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
    const semDono = abertas.filter((x) => !x.responsaveis.length).length;
    const feitas = ts.filter((x) => x.concluidoEm && x.concluidoEm.slice(0, 10) > menos(hoje, 30)).length;
    const pessoasEq = [...new Set([...e.coordenadores, ...e.membros])];
    const emDia = abertas.length ? Math.round(((abertas.length - atrasadas) / abertas.length) * 100) : 100;
    return (
      <li className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:border-neutral-400 dark:hover:border-neutral-600">
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: e.cor }} />
        <Link href={`/equipes/${e.id}`} className="block p-4 pl-5">
          <div className="flex items-start gap-2">
            <p className="font-semibold leading-snug flex-1">{e.nome}</p>
            {me.gestao && !e.acesso && <span title={t.acessoDesligado} className="text-neutral-400"><Lock size={14} /></span>}
            {me.gestao && e.avisos && <span title={t.avisosEquipeLigado} className="text-neutral-400"><Bell size={14} /></span>}
          </div>
          <div className="flex items-center mt-3">
            <span className="flex -space-x-1.5">
              {pessoasEq.slice(0, 6).map((id) => { const p = pessoa(id); return p && <span key={id} className="rounded-full ring-2 ring-white dark:ring-neutral-900"><Avatar name={p.name} size={26} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} /></span>; })}
            </span>
            {pessoasEq.length > 6 && <span className="ml-1.5 text-xs text-neutral-500">+{pessoasEq.length - 6}</span>}
            <span className="ml-auto text-xs text-neutral-500">{e.coordenadores.map((c) => pessoa(c)?.name.split(" ")[0]).filter(Boolean).join(", ")}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-3 text-center">
            {[[abertas.length, t.abertasLbl, ""], [atrasadas, t.atrasadasLbl, atrasadas ? "text-red-600 dark:text-red-400" : ""], [semDono, t.semDonoLbl, semDono ? "text-amber-700 dark:text-amber-400" : ""], [feitas, t.feitas30, ""]].map(([v, l, c]) => (
              <div key={String(l)} className="rounded-md bg-neutral-50 dark:bg-neutral-800/60 py-1.5">
                <p className={`text-base font-semibold tabular-nums ${c}`}>{v}</p>
                <p className="text-[10px] text-neutral-500 leading-tight">{l}</p>
              </div>
            ))}
          </div>
          {abertas.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500">
              <div className="h-1.5 flex-1 rounded-full bg-red-200 dark:bg-red-950 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${emDia}%` }} /></div>
              {emDia}% {t.emDiaLbl}
            </div>
          )}
          <p className="mt-2 text-[11px] text-neutral-500">{objetivos.filter((o) => o.equipe === e.id).length} {t.objetivos.toLowerCase()}{e.areas.length ? ` · ${e.areas.length} ${t.areasLbl}` : ""}</p>
        </Link>
      </li>
    );
  };

  const Grade = ({ titulo, lista }: { titulo?: string; lista: Equipe[] }) => lista.length ? (
    <>
      {titulo && <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{titulo}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-6">{lista.map((e) => <Cartao key={e.id} e={e} />)}</ul>
    </>
  ) : null;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Title>{t.equipes}</Title>
        <Link href="/pessoas" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900">
          <Users size={15} />{t.pessoas} <span className="text-neutral-400 tabular-nums">{pessoas.filter((p) => p.equipes.length).length}</span>
        </Link>
      </div>
      {minhas.length && outras.length ? (<><Grade titulo={t.minhasEquipes} lista={minhas} /><Grade titulo={t.outrasEquipes} lista={outras} /></>) : <Grade lista={equipes} />}
      {semEquipe > 0 && (
        <Link href="/equipes/sem-equipe" className="flex items-center justify-between rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm">
          <span>{t.semEquipe}</span><span className="text-amber-700 dark:text-amber-400 tabular-nums">{semEquipe} {t.tarefasAbertas.toLowerCase()}</span>
        </Link>
      )}
    </>
  );
}
