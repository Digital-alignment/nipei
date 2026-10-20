import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar, Progress, Section, Title } from "@/components/v2/ui";
import { currentUser, getProjetos } from "@/lib/v2/data";
import { getDiagnostico, participantes, progresso } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";

// Gestão overview of an assessment: who answered how much (the answers themselves are on each person's page).
export default async function DiagnosticoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !me.gestao) notFound();
  const projeto = getProjetos().find((p) => p.id === d.projeto);
  const en = lang === "en";

  return (
    <div className="max-w-2xl">
      {projeto && <Link href={`/projetos/${projeto.id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{projeto.nome}</Link>}
      <Title sub={`${en ? d.modelo.titulo_en : d.modelo.titulo} · ${d.modelo.autor}`}>{d.titulo}</Title>

      <Section title={t.participantes}>
        <ul className="grid gap-3">
          {participantes(d).map((p) => {
            const pr = progresso(d, p.id);
            return (
              <li key={p.id}>
                <Link href={`/pessoas/${p.id}/respostas?d=${d.id}`} className="flex items-center gap-3">
                  <Avatar name={p.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{p.name} <span className="text-xs text-neutral-500">· {pr.respondidas}/{pr.total} {t.respondidas}{pr.rascunhos ? ` · ${pr.rascunhos} ${t.rascunhos}` : ""}</span></p>
                    <Progress done={pr.respondidas} total={pr.total} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={en ? "Sections" : "Seções"}>
        <ul className="grid gap-1 text-sm">
          {d.modelo.secoes.map((s) => (
            <li key={s.id}>{en ? s.titulo_en : s.titulo} <span className="text-xs text-neutral-500">· {s.escopo === "individual" ? (en ? "individual" : "individual") : (en ? "team (next phase)" : "coletivo (próxima fase)")} · {s.perguntas.length}</span></li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
