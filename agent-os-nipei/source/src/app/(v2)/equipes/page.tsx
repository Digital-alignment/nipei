import { Card, Title } from "@/components/v2/ui";
import { getEquipes, getObjetivos, getTarefas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

export default async function Equipes() {
  const { t } = await getT();
  const tarefas = getTarefas(), objetivos = getObjetivos();
  return (
    <>
      <Title>{t.equipes}</Title>
      <div className="grid gap-3 sm:grid-cols-2">
        {getEquipes().map((e) => (
          <Card key={e.id} href={`/equipes/${e.id}`} cor={e.cor}>
            <p className="font-semibold">{e.nome}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {e.membros.length} {t.membros.toLowerCase()} · {tarefas.filter((x) => x.equipe === e.id && x.status !== "done").length} {t.tarefasAbertas.toLowerCase()} · {objetivos.filter((o) => o.equipe === e.id).length} {t.objetivos.toLowerCase()}
            </p>
          </Card>
        ))}
        <Card href="/equipes/sem-equipe">
          <p className="font-semibold">{t.semEquipe}</p>
          <p className="text-xs text-neutral-500 mt-1">{tarefas.filter((x) => !x.equipe && x.status !== "done").length} {t.tarefasAbertas.toLowerCase()}</p>
        </Card>
      </div>
    </>
  );
}
