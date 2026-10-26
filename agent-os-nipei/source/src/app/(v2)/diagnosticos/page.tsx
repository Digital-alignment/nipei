import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { BarraProgresso } from "@/components/ds/Progresso";
import Campo from "@/components/ds/Campo";
import { notFound } from "next/navigation";
import { Section } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { currentUser, getEquipes, getProjetos } from "@/lib/v2/data";
import { getDiagnosticos, getModelos, participantes, progresso, secoesIndividuais } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";
import { criarDiagnosticoAction } from "../actions";


// D5: every assessment, and "apply a template" to a project (Inirau, new projects…). Gestão only.
export default async function Diagnosticos({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  const projetos = getProjetos(), equipes = getEquipes(), modelos = getModelos();
  const lista = getDiagnosticos().filter((d) => !q.projeto || d.projeto === q.projeto);

  return (
    <div className="max-w-2xl mx-auto">
      <CabecalhoPagina titulo={<>{t.diagnosticos}</>} subtitulo={t.diagnosticosIntro} />

      <Section title={t.diagnosticos}>
        {lista.length === 0 ? <p className="text-sm text-t2">{t.semDiagnosticos}</p> : (
          <ul className="grid gap-3">
            {lista.map((d) => {
              const ps = participantes(d);
              const total = ps.length * secoesIndividuais(d).reduce((a, s) => a + s.perguntas.length, 0);
              const feitas = ps.reduce((a, p) => a + progresso(d, p.id).respondidas, 0);
              return (
                <li key={d.id}>
                  <Link href={`/diagnosticos/${d.id}`} className="text-sm font-medium underline">{d.titulo}</Link>
                  <p className="text-xs text-t2 mb-1">
                    {projetos.find((p) => p.id === d.projeto)?.nome ?? d.projeto} · {lang === "en" ? d.modelo.titulo_en : d.modelo.titulo} · {d.status === "aberto" ? t.aberto : t.encerrado}
                  </p>
                  {total > 0 && <BarraProgresso valor={feitas} max={total} rotulo={`${total ? Math.round((feitas / total) * 100) : 0}% · ${feitas}/${total}`} />}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t.novoDiagnostico}>
        <form action={criarDiagnosticoAction} className="grid gap-3">
          <Campo tipo="selecao" rotulo={t.modelo} name="modelo">{modelos.map((m) => <option key={m.id} value={m.id}>{lang === "en" ? m.titulo_en : m.titulo} ({m.autor}, {m.secoes.reduce((a, s) => a + s.perguntas.length, 0)})</option>)}</Campo>
          <Campo tipo="selecao" rotulo={t.projetoLbl} name="projeto" defaultValue={q.projeto}>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Campo>
          <Campo tipo="texto" rotulo={t.tituloLbl} name="titulo" required maxLength={150} placeholder="Inirau — desenvolvimento da equipe 2027" />
          <Campo tipo="texto" rotulo={t.eventoRef} name="evento" maxLength={150} />
          <fieldset className="grid gap-1 text-sm">
            <legend className="mb-1">{t.quemResponde}</legend>
            {equipes.map((e) => <label key={e.id} className="flex items-center gap-2"><input type="checkbox" name="equipes" value={e.id} defaultChecked={e.gestao} />{e.nome}</label>)}
          </fieldset>
          <BotaoEnviar enviando={t.salvando} className="justify-self-start anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.criar_}</BotaoEnviar>
          <p className="text-xs text-t2">{t.modeloAviso}</p>
        </form>
      </Section>
    </div>
  );
}
