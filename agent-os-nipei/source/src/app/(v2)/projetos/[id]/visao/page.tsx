import Link from "next/link";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import { Card, Progress, Section, Title } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Imprimir from "@/components/v2/Imprimir";
import Md from "@/components/v2/Md";
import { currentUser, getPessoas } from "@/lib/v2/data";
import { diaLocal } from "@/lib/v2/conhecimento";
import { coletarVisao, getSintese } from "@/lib/v2/visao";
import { fmtDate, getT } from "@/lib/v2/i18n";
import ExportarGoogle from "@/components/v2/ExportarGoogle";
import { visaoAction } from "../../../actions";

const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const Num = ({ n, label, alerta }: { n: number | string; label: string; alerta?: boolean }) => (
  <div className="rounded-interno px-3 py-2">
    <p className={`text-xl font-semibold tabular-nums ${alerta ? "text-warn" : ""}`}>{n}</p>
    <p className="text-xs text-t2">{label}</p>
  </div>
);

// D5: holistic view of a project — live numbers + the assessment's results + an AI synthesis.
export default async function VisaoProjeto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const v = coletarVisao(id);
  if (!v) notFound();
  const sintese = getSintese(id);
  const c = v.coletivo, d = v.diag;
  const nome = (pid: string) => getPessoas().find((p) => p.id === pid)?.name ?? pid;
  const prio = { alta: t.prio_alta, media: t.prio_media, baixa: t.prio_baixa };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/projetos/${id}`} className="print:hidden inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{v.projeto.nome}</Link>
      <Title sub={t.visaoIntro}>{t.visaoHolistica} · {v.projeto.nome}</Title>

      <Section title={t.numeros}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Num n={v.membros} label={`${t.membrosLbl} · ${v.equipes.length} ${t.equipes.toLowerCase()}`} />
          <Num n={v.tarefas.abertas} label={t.tarefasAbertasLbl} />
          <Num n={v.tarefas.atrasadas} label={t.atrasadasLbl} alerta={v.tarefas.atrasadas > 0} />
          <Num n={v.tarefas.semDono} label={t.semDonoLbl} alerta={v.tarefas.semDono > 0} />
          <Num n={v.fatos.length} label={t.fatosConfirmados} />
          {v.financas?.n ? <Num n={brl(v.financas.resultado)} label={t.resultado} alerta={v.financas.resultado < 0} /> : null}
          {v.melhorias.length ? <Num n={brl(v.melhorias.reduce((a, i) => a + i.custo, 0))} label={`${t.melhoriasLbl} (${v.melhorias.length})`} /> : null}
          {c?.codigo.versao ? <Num n={`v${c.codigo.versao}`} label={t.codigoAcordos} /> : null}
        </div>
      </Section>

      <Section title={t.sintese}>
        {me.gestao && (
          <form action={visaoAction} className="print:hidden flex flex-wrap items-center gap-2 mb-3">
            <input type="hidden" name="projeto" value={id} />
            <BotaoEnviar enviando={t.processando} className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4 inline-flex items-center gap-1.5">
              <Icone nome="gerar-outra"  tamanho={14} />{sintese ? t.atualizarSintese : t.gerarSintese}
            </BotaoEnviar>
            {sintese && <Imprimir label={t.imprimir} />}
            <p className="text-xs text-t2 basis-full">{t.sinteseAviso}</p>
          </form>
        )}
        {sintese && <div className="print:hidden mb-3"><ExportarGoogle pessoaId={me.pessoa?.id} t={t} campos={{ tipo: "visao", id }} formatos={[{ formato: "doc", label: t.cx.exportarDoc }, { formato: "slides", label: t.cx.exportarSlides }]} /></div>}
        {sintese
          ? <><p className="text-xs text-t2 mb-2">{t.geradoEm} {fmtDate(diaLocal(sintese.geradaEm), lang)}</p><Md>{sintese.texto}</Md></>
          : <p className="text-sm text-t2">{t.naoGerado}</p>}
      </Section>

      {v.objetivos.length > 0 && (
        <Section title={t.objetivos} count={v.objetivos.length}>
          <div className="grid gap-2">
            {v.objetivos.map((o) => (
              <Card key={o.id} href={`/objetivos?ano=${o.ano}#${o.id}`}>
                <p className="text-sm font-medium">{o.titulo} <span className="text-t2 font-normal">· {o.ano}</span></p>
                <div className="mt-2">{o.progresso ? <Progress {...o.progresso} /> : <span className="text-xs text-t2">{t.semTarefasLigadas}</span>}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {v.melhorias.length > 0 && (
        <Section title={t.melhoriasLbl}>
          <ul className="grid gap-1 text-sm">
            {[...v.melhorias].sort((a, b) => ["alta", "media", "baixa"].indexOf(a.prioridade) - ["alta", "media", "baixa"].indexOf(b.prioridade)).slice(0, 12).map((i) => (
              <li key={i.id} className="flex justify-between gap-3"><span>{i.titulo} <span className="text-xs text-t2">· {prio[i.prioridade]}{i.responsavel ? ` · ${nome(i.responsavel)}` : ""}</span></span><span className="tabular-nums text-t2">{i.custo ? brl(i.custo) : "—"}</span></li>
            ))}
          </ul>
        </Section>
      )}

      {v.proximasAcoes.length > 0 && (
        <Section title={t.proximasAcoes}>
          <ul className="grid gap-1 text-sm">{v.proximasAcoes.map((e) => <li key={e.id}>{e.data.split("-").reverse().join("/")} · {e.acao}{e.responsavel ? ` — ${nome(e.responsavel)}` : ""}</li>)}</ul>
        </Section>
      )}

      {v.eventos.length > 0 && (
        <Section title={t.proximosEventos}>
          <ul className="grid gap-1 text-sm">{v.eventos.map((e) => <li key={e.id}>{e.inicio} · {e.titulo}</li>)}</ul>
        </Section>
      )}

      <Section title={t.diagnostico}>
        {d ? (
          <ul className="grid gap-1 text-sm">
            <li>{me.gestao ? <Link href={`/diagnosticos/${d.id}`} className="underline">{d.titulo}</Link> : d.titulo} · {d.status === "aberto" ? t.aberto : t.encerrado}</li>
            {me.gestao && c?.consolidados.retiro && <li><Link href={`/diagnosticos/${d.id}/consolidado/retiro`} className="underline">{t.relatorioRetiro}</Link></li>}
            {me.gestao && c?.consolidados.matriz && <li><Link href={`/diagnosticos/${d.id}/consolidado/matriz`} className="underline">{t.matrizResp}</Link></li>}
            {c?.codigo.versao ? <li><Link href={`/diagnosticos/${d.id}/codigo`} className="underline">{t.codigoAcordos}</Link> ({t.versao} {c.codigo.versao})</li> : null}
            {me.gestao && <li><Link href={`/diagnosticos/${d.id}/documento`} className="underline">{t.documentoFinal}</Link></li>}
          </ul>
        ) : (
          <p className="text-sm text-t2">{t.semDiagnosticoProjeto} {me.gestao && <Link href={`/diagnosticos?projeto=${id}`} className="underline">{t.novoDiagnostico}</Link>}</p>
        )}
      </Section>
    </div>
  );
}
