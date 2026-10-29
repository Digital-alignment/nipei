import Link from "next/link";
import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import AvatarDS from "@/components/ds/Avatar";
import { BarraProgresso } from "@/components/ds/Progresso";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import { Section } from "@/components/v2/ui";
import { currentUser, getProjetos } from "@/lib/v2/data";
import { TEMAS_REUNIAO, getColetivo, getDiagnostico, participantes, progresso, secoesColetivas } from "@/lib/v2/diagnostico";
import { definirResponsavelAction, estadoDiagnosticoAction, reuniaoAction } from "../../actions";
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
  const c = getColetivo(d.id);
  const quem = participantes(d);

  return (
    <div className="max-w-2xl mx-auto">
      {projeto && <Link href={`/projetos/${projeto.id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{projeto.nome}</Link>}
      <CabecalhoPagina titulo={<>{d.titulo}</>} subtitulo={`${en ? d.modelo.titulo_en : d.modelo.titulo} · ${d.modelo.autor} · ${d.status === "aberto" ? t.aberto : t.encerrado}`} />
      <div className="flex flex-wrap gap-3 items-center mb-5 text-sm">
        <Link href="/diagnosticos" className="underline text-t2">{t.diagnosticos}</Link>
        <Link href={`/projetos/${d.projeto}/visao`} className="underline text-t2">{t.visaoHolistica}</Link>
        <form action={estadoDiagnosticoAction}>
          <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="aberto" value={String(d.status !== "aberto")} />
          <button className="anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s3 px-3.5 font-texto text-sm font-semibold text-t1 hover:bg-s4">{d.status === "aberto" ? t.encerrar : t.reabrir}</button>
        </form>
      </div>

      <Section title={t.participantes}>
        <ul className="grid gap-3">
          {participantes(d).map((p) => {
            const pr = progresso(d, p.id);
            return (
              <li key={p.id}>
                <Link href={`/pessoas/${p.id}/respostas?d=${d.id}`} className="flex items-center gap-3">
                  <AvatarDS nome={p.name} tamanho={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{p.name} <span className="text-xs text-t2">· {pr.respondidas}/{pr.total} {t.respondidas}{pr.rascunhos ? ` · ${pr.rascunhos} ${t.rascunhos}` : ""}</span></p>
                    <BarraProgresso valor={pr.respondidas} max={pr.total} rotulo={`${pr.total ? Math.round((pr.respondidas / pr.total) * 100) : 0}% · ${pr.respondidas}/${pr.total}`} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t.parteColetiva}>
        <ul className="grid gap-4">
          {secoesColetivas(d).map((s) => {
            const feitas = s.perguntas.filter((q) => c.respostas[q.id]?.status === "respondida").length;
            return (
              <li key={s.id} className="grid gap-1.5">
                <Link href={`/diagnosticos/${d.id}/coletivo?secao=${s.id}`} className="text-sm font-medium underline">{en ? s.titulo_en : s.titulo}</Link>
                <BarraProgresso valor={feitas} max={s.perguntas.length} rotulo={`${s.perguntas.length ? Math.round((feitas / s.perguntas.length) * 100) : 0}% · ${feitas}/${s.perguntas.length}`} />
                <form action={definirResponsavelAction} className="flex items-center gap-2 text-xs">
                  <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="secao" value={s.id} />
                  <span className="text-t2">{t.responsavel}:</span>
                  <select name="pessoa" defaultValue={c.responsaveis[s.id] ?? ""} aria-label={t.responsavel} className={CAMPO_COMPACTO}>
                    <option value="">{t.semResponsavel}</option>
                    {quem.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="rounded-interno bg-s2 px-2 py-1">{t.definir}</button>
                </form>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t.consolidacao}>
        <ul className="grid gap-2 text-sm">
          <li><Link href={`/diagnosticos/${d.id}/consolidado/retiro`} className="underline">{t.relatorioRetiro}</Link>{c.consolidados.retiro && <Icone nome="sucesso" tamanho={14} className="ml-1 inline text-ok" />}</li>
          <li><Link href={`/diagnosticos/${d.id}/consolidado/matriz`} className="underline">{t.matrizResp}</Link>{c.consolidados.matriz && <Icone nome="sucesso" tamanho={14} className="ml-1 inline text-ok" />}</li>
          <li><Link href={`/diagnosticos/${d.id}/codigo`} className="underline">{t.codigoAcordos}</Link>
            {c.codigo.versao ? ` · ${t.versao} ${c.codigo.versao} · ${Object.values(c.codigo.aceites).filter((a) => a.versao === c.codigo.versao).length}/${quem.length} ${t.aceites.toLowerCase()}` : ""}</li>
          <li><Link href={`/diagnosticos/${d.id}/documento`} className="underline font-medium">{t.documentoFinal} (PT / EN)</Link></li>
        </ul>
      </Section>

      <Section title={t.reunioes}>
        <ul className="grid gap-4">
          {(["1", "2"] as const).map((n) => {
            const r = c.reunioes[n];
            return (
              <li key={n} className="grid gap-1.5">
                <p className="text-sm font-medium">{t.reuniao} #{n}{r?.data ? ` · ${r.data.split("-").reverse().join("/")}` : ""}</p>
                <p className="text-xs text-t2">{t.temas}: {TEMAS_REUNIAO[n].join(" · ")}</p>
                <form action={reuniaoAction} className="flex flex-wrap items-center gap-2 text-xs">
                  <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="n" value={n} />
                  <input type="date" name="data" defaultValue={r?.data} required aria-label={t.data} className={CAMPO_COMPACTO} />
                  <button name="acao" value="agendar" className="rounded-interno bg-s2 px-2 py-1">{t.agendar}</button>
                  <Link href={`/diagnosticos/${d.id}/reuniao/${n}`} className="underline text-t2">{t.pauta} →</Link>
                </form>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
