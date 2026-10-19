import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Avatar, Card, Chip, Empty, Progress, Section, TaskList, Title, byPrazo } from "@/components/v2/ui";
import { getEquipes, getObjetivos, getPessoas, getTarefas, progresso, today } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export default async function EquipeDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string }> }) {
  const { id } = await params;
  const { area } = await searchParams;
  const { t, lang } = await getT();
  const equipes = getEquipes(), pessoas = getPessoas(), tarefas = getTarefas();
  const e = equipes.find((x) => x.id === id);
  if (!e) notFound();
  const objetivos = getObjetivos().filter((o) => o.equipe === id || o.apoio.includes(id));
  const abertas = tarefas.filter((x) => x.equipe === id && x.status !== "done" && (!area || x.area === area)).sort(byPrazo);
  const nome = (pid: string) => pessoas.find((p) => p.id === pid)?.name ?? pid;

  return (
    <>
      <Link href="/equipes" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.equipes}</Link>
      <Title sub={e.areas.length > 0 && (
        <span className="flex flex-wrap gap-2 mt-2">
          <Chip href={`/equipes/${id}`} on={!area}>{t.todas}</Chip>
          {e.areas.map((a) => <Chip key={a} href={`/equipes/${id}?area=${a}`} on={area === a}>{a}</Chip>)}
        </span>
      )}>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: e.cor }} />{e.nome}</span>
      </Title>

      <Section title={t.tarefasAbertas} count={abertas.length}>
        <Link href={`/tarefas/nova?equipe=${id}&back=/equipes/${id}`} className="inline-flex items-center gap-1 text-sm mb-1 text-neutral-600 dark:text-neutral-400"><Plus size={16} />{t.novaTarefa}</Link>
        {abertas.length ? <TaskList tarefas={abertas} equipes={equipes} pessoas={pessoas} lang={lang} hoje={today()} /> : <Empty>{t.semTarefas}</Empty>}
      </Section>

      <Section title={t.objetivos} count={objetivos.length}>
        <div className="grid gap-2">
          {objetivos.map((o) => {
            const p = progresso(o.id, tarefas);
            return (
              <Card key={o.id} href={`/objetivos?ano=${o.ano}#${o.id}`}>
                <p className="text-sm font-medium">{o.titulo} <span className="text-neutral-500 font-normal">· {o.ano}{o.equipe !== id ? ` · ${t.apoio}` : ""}</span></p>
                {p && <div className="mt-2"><Progress {...p} /></div>}
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title={t.coordenacao}>
        <div className="flex flex-wrap gap-3">
          {e.coordenadores.map((c) => <span key={c} className="inline-flex items-center gap-2 text-sm"><Avatar name={nome(c)} size={28} />{nome(c)}</span>)}
        </div>
      </Section>

      <Section title={t.membros} count={e.membros.length}>
        <div className="flex flex-wrap gap-3">
          {e.membros.map((m) => <span key={m} className="inline-flex items-center gap-2 text-sm"><Avatar name={nome(m)} size={28} />{nome(m)}</span>)}
        </div>
      </Section>
    </>
  );
}
