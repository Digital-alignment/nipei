import { Card, Chip, Title } from "@/components/v2/ui";
import { getEquipes, getProjetos, getTarefas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export default async function Projetos() {
  const { t } = await getT();
  const equipes = getEquipes(), tarefas = getTarefas();
  return (
    <>
      <Title>{t.projetos}</Title>
      <div className="grid gap-3 sm:grid-cols-2">
        {getProjetos().map((p) => (
          <Card key={p.id} href={`/projetos/${p.id}`}>
            <p className="font-semibold">{p.nome}</p>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{p.descricao}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && <Chip key={id} cor={e.cor}>{e.nome}</Chip>; })}
              <span className="text-xs text-neutral-500 self-center">{tarefas.filter((x) => x.projeto === p.id && x.status !== "done").length} {t.tarefasAbertas.toLowerCase()}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
