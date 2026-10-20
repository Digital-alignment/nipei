import Link from "next/link";
import { ChevronRight, Target } from "lucide-react";
import { Title } from "@/components/v2/ui";
import { getEquipes, getObjetivos, getProjetos, getTarefas, today } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";

export default async function Projetos() {
  const { t, lang } = await getT();
  const hoje = today();
  const equipes = getEquipes(), tarefas = getTarefas(), objetivos = getObjetivos();
  const ano = Number(hoje.slice(0, 4));
  const doAno = objetivos.filter((o) => o.ano === ano).length;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Title>{t.projetos}</Title>
        <Link href={`/objetivos?ano=${ano}`} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900">
          <Target size={15} />{t.objetivos} <span className="text-neutral-400 tabular-nums">{doAno}</span>
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {getProjetos().map((p) => {
          const ts = tarefas.filter((x) => x.projeto === p.id);
          const abertas = ts.filter((x) => x.status !== "done");
          const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
          const feitas = ts.length - abertas.length;
          const pct = ts.length ? Math.round((feitas / ts.length) * 100) : 0;
          const objs = objetivos.filter((o) => o.projeto === p.id).length;
          const ultima = p.atualizacoes[0]?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
          return (
            <li key={p.id}>
              <Link href={`/projetos/${p.id}`} className="group flex flex-col h-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:border-neutral-400 dark:hover:border-neutral-600">
                <div className="flex items-start gap-2">
                  <p className="font-semibold leading-snug flex-1">{p.nome}</p>
                  <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-500 shrink-0" />
                </div>
                {p.descricao && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{p.descricao}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.cor }} />{e.nome}
                    </span>
                  ); })}
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 mb-1.5">
                    <span className="tabular-nums">{abertas.length} {t.abertasLbl}</span>
                    {atrasadas > 0 && <span className="text-red-600 dark:text-red-400 tabular-nums">{atrasadas} {t.atrasadasLbl}</span>}
                    {objs > 0 && <span className="tabular-nums">· {objs} {t.objetivos.toLowerCase()}</span>}
                    <span className="ml-auto tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div>
                  {ultima && <p className="text-[11px] text-neutral-400 mt-2">{t.atualizadoEm} {fmtDate(ultima, lang)}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
