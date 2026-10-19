import Link from "next/link";
import { Plus } from "lucide-react";
import { Chip, Progress, Title } from "@/components/v2/ui";
import { getEquipes, getObjetivos, getProjetos, getTarefas, progresso } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export default async function Objetivos({ searchParams }: { searchParams: Promise<{ ano?: string; equipe?: string }> }) {
  const q = await searchParams;
  const ano = q.ano === "2027" ? 2027 : 2026;
  const { t } = await getT();
  const equipes = getEquipes(), projetos = getProjetos(), tarefas = getTarefas();
  const objetivos = getObjetivos().filter((o) => o.ano === ano && (!q.equipe || o.equipe === q.equipe || o.apoio.includes(q.equipe)));
  const eq = (id: string) => equipes.find((e) => e.id === id);

  return (
    <>
      <Title>{t.objetivos}</Title>
      <div className="flex flex-wrap gap-2 mb-3">
        {[2026, 2027].map((a) => <Chip key={a} href={`/objetivos?ano=${a}`} on={ano === a}>{a}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Chip href={`/objetivos?ano=${ano}`} on={!q.equipe}>{t.todas}</Chip>
        {equipes.map((e) => <Chip key={e.id} href={`/objetivos?ano=${ano}&equipe=${e.id}`} cor={e.cor} on={q.equipe === e.id}>{e.nome}</Chip>)}
      </div>
      <div className="grid gap-3">
        {objetivos.map((o) => {
          const p = progresso(o.id, tarefas);
          const dono = eq(o.equipe);
          return (
            <article key={o.id} id={o.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 scroll-mt-20" style={dono ? { borderLeft: `4px solid ${dono.cor}` } : undefined}>
              <p className="font-semibold">{o.titulo}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 whitespace-pre-line">{o.descricao}</p>
              <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                {dono && <Chip cor={dono.cor}>{dono.nome}</Chip>}
                {o.apoio.map((a) => { const e = eq(a); return e && <Chip key={a} cor={e.cor}>{t.apoio}: {e.nome}</Chip>; })}
                {o.projeto && <Chip href={`/projetos/${o.projeto}`}>{projetos.find((x) => x.id === o.projeto)?.nome ?? o.projeto}</Chip>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">{p ? <Progress {...p} /> : <span className="text-xs text-neutral-500">{t.semTarefasLigadas}</span>}</div>
                <Link href={`/tarefas/nova?objetivo=${o.id}&equipe=${o.equipe}&back=/objetivos?ano=${ano}`} aria-label={t.novaTarefa} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Plus size={18} /></Link>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
