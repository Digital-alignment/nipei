import Link from "next/link";
import { notFound } from "next/navigation";
import { Progress, Section, Title } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser, getEquipes, getProjetos } from "@/lib/v2/data";
import { getDiagnosticos, getModelos, participantes, progresso, secoesIndividuais } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";
import { criarDiagnosticoAction } from "../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

// D5: every assessment, and "apply a template" to a project (Inirau, new projects…). Gestão only.
export default async function Diagnosticos({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const projetos = getProjetos(), equipes = getEquipes(), modelos = getModelos();
  const lista = getDiagnosticos().filter((d) => !q.projeto || d.projeto === q.projeto);

  return (
    <div className="max-w-2xl">
      <Title sub={t.diagnosticosIntro}>{t.diagnosticos}</Title>

      <Section title={t.diagnosticos}>
        {lista.length === 0 ? <p className="text-sm text-neutral-500">{t.semDiagnosticos}</p> : (
          <ul className="grid gap-3">
            {lista.map((d) => {
              const ps = participantes(d);
              const total = ps.length * secoesIndividuais(d).reduce((a, s) => a + s.perguntas.length, 0);
              const feitas = ps.reduce((a, p) => a + progresso(d, p.id).respondidas, 0);
              return (
                <li key={d.id}>
                  <Link href={`/diagnosticos/${d.id}`} className="text-sm font-medium underline">{d.titulo}</Link>
                  <p className="text-xs text-neutral-500 mb-1">
                    {projetos.find((p) => p.id === d.projeto)?.nome ?? d.projeto} · {lang === "en" ? d.modelo.titulo_en : d.modelo.titulo} · {d.status === "aberto" ? t.aberto : t.encerrado}
                  </p>
                  {total > 0 && <Progress done={feitas} total={total} />}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t.novoDiagnostico}>
        <form action={criarDiagnosticoAction} className="grid gap-3">
          <label className="grid gap-1 text-sm">{t.modelo}
            <select name="modelo" className={field}>{modelos.map((m) => <option key={m.id} value={m.id}>{lang === "en" ? m.titulo_en : m.titulo} ({m.autor}, {m.secoes.reduce((a, s) => a + s.perguntas.length, 0)})</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">{t.projetoLbl}
            <select name="projeto" defaultValue={q.projeto} className={field}>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </label>
          <label className="grid gap-1 text-sm">{t.tituloLbl}<input name="titulo" required maxLength={150} placeholder="Inirau — desenvolvimento da equipe 2027" className={field} /></label>
          <label className="grid gap-1 text-sm">{t.eventoRef}<input name="evento" maxLength={150} className={field} /></label>
          <fieldset className="grid gap-1 text-sm">
            <legend className="mb-1">{t.quemResponde}</legend>
            {equipes.map((e) => <label key={e.id} className="flex items-center gap-2"><input type="checkbox" name="equipes" value={e.id} defaultChecked={e.gestao} />{e.nome}</label>)}
          </fieldset>
          <BotaoEnviar enviando={t.salvando} className="justify-self-start rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-4 py-2 text-sm font-medium">{t.criar_}</BotaoEnviar>
          <p className="text-xs text-neutral-500">{t.modeloAviso}</p>
        </form>
      </Section>
    </div>
  );
}
