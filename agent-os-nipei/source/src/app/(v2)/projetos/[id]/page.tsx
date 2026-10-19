import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Card, Chip, Empty, Progress, Section, TaskList, Title, byPrazo } from "@/components/v2/ui";
import { getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, progresso, today } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export default async function ProjetoDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ equipe?: string }> }) {
  const { id } = await params;
  const { equipe } = await searchParams;
  const { t, lang } = await getT();
  const p = getProjetos().find((x) => x.id === id);
  if (!p) notFound();
  const equipes = getEquipes(), pessoas = getPessoas(), tarefas = getTarefas();
  const objetivos = getObjetivos().filter((o) => o.projeto === id);
  const abertas = tarefas.filter((x) => x.projeto === id && x.status !== "done" && (!equipe || x.equipe === equipe)).sort(byPrazo);

  return (
    <>
      <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.projetos}</Link>
      <Title sub={p.descricao}>{p.nome}</Title>

      <div className="flex flex-wrap gap-2 mb-6">
        <Chip href={`/projetos/${id}`} on={!equipe}>{t.todas}</Chip>
        {p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <Chip key={eid} href={`/projetos/${id}?equipe=${eid}`} cor={e.cor} on={equipe === eid}>{e.nome}</Chip>; })}
      </div>

      {objetivos.length > 0 && (
        <Section title={t.objetivos} count={objetivos.length}>
          <div className="grid gap-2">
            {objetivos.map((o) => {
              const pr = progresso(o.id, tarefas);
              return (
                <Card key={o.id} href={`/objetivos?ano=${o.ano}#${o.id}`}>
                  <p className="text-sm font-medium">{o.titulo} <span className="text-neutral-500 font-normal">· {o.ano}</span></p>
                  <div className="mt-2">{pr ? <Progress {...pr} /> : <span className="text-xs text-neutral-500">{t.semTarefasLigadas}</span>}</div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      <Section title={t.tarefasAbertas} count={abertas.length}>
        <Link href={`/tarefas/nova?projeto=${id}&back=/projetos/${id}`} className="inline-flex items-center gap-1 text-sm mb-1 text-neutral-600 dark:text-neutral-400"><Plus size={16} />{t.novaTarefa}</Link>
        {abertas.length ? <TaskList tarefas={abertas} equipes={equipes} pessoas={pessoas} lang={lang} hoje={today()} /> : <Empty>{t.semTarefas}</Empty>}
      </Section>
    </>
  );
}
