import { notFound } from "next/navigation";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import { BadgeEstado } from "@/components/ds/Chip";
import { EstadoVazio } from "@/components/ds/Estados";
import { BarraProgresso } from "@/components/ds/Progresso";
import LinhaDoTempo from "@/components/ds/padroes/LinhaDoTempo";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { TaskRow } from "@/components/v2/ui";
import { checkinObjetivoAction, fecharObjetivoAction } from "../../actions";
import { currentUser, getEquipes, getObjetivos, getPessoas, getTarefas, projetosVisiveis, today } from "@/lib/v2/data";
import { BADGE_RITMO, avanco, ritmo, rotuloAvanco } from "@/lib/v2/objetivos";
import { fmtDate, getT } from "@/lib/v2/i18n";

// One objective (DS 10.22): target and pace, the weekly check-in (owner and gestão), history and linked tasks.
export default async function ObjetivoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const o = getObjetivos().find((x) => x.id === id);
  const projetos = projetosVisiveis(me);
  if (!o || (o.projeto && !projetos.some((p) => p.id === o.projeto))) notFound();
  const hoje = today(), tarefas = getTarefas(), pessoas = getPessoas(), equipes = getEquipes();
  const r = ritmo(o, tarefas, hoje), a = avanco(o, tarefas), resp = pessoas.find((p) => p.id === o.responsavel);
  const projeto = projetos.find((p) => p.id === o.projeto);
  const podeCheckin = o.status === "ativo" && (me.gestao || (!!me.pessoa && o.responsavel === me.pessoa.id));
  const podeEditar = me.gestao || me.coordena.includes(o.equipe) || (!!me.pessoa && o.responsavel === me.pessoa.id);
  const ligadas = tarefas.filter((x) => x.objetivo === o.id).sort((x, y) => Number(x.status === "done") - Number(y.status === "done"));
  const dia = (d: string) => (d === hoje ? t.hoje : fmtDate(d, lang));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="-ml-3 mb-2"><Botao href="/objetivos" variante="fantasma" tamanho="P" icone="voltar">{t.objetivos}</Botao></div>
      <CabecalhoPagina selo="broto" titulo={o.titulo}
        rotulo={[projeto?.nome, resp && `${t.ob.responsavel}: ${resp.name.split(" ")[0]}`, o.prazo && `${t.ob.prazo}: ${fmtDate(o.prazo, lang)}`].filter(Boolean).join(" · ") || t.objetivos}
        acoes={podeEditar ? <BotaoIcone icone="editar" aria-label={t.ob.editar} href={`/objetivos/${o.id}/editar`} /> : undefined} />
      {o.descricao && <p className="corpo -mt-3 mb-4 whitespace-pre-line text-t2">{o.descricao}</p>}

      <Cartao className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {o.status === "fechado" ? <BadgeEstado estado="interna">{t.ob.fechado}</BadgeEstado> : <BadgeEstado estado={BADGE_RITMO[r]}>{t.ob.ritmos[r]}</BadgeEstado>}
          <span className="meta text-t2">{rotuloAvanco(o, tarefas, { de: t.ob.de, marcos: t.ob.marcos, tarefas: t.ob.tarefas })}</span>
        </div>
        {a != null && <BarraProgresso valor={Math.round(a * 100)} rotulo={`${Math.round(a * 100)}%`} rotuloAcessivel={t.ob.comoMedimos} />}
        {o.marcos.length > 0 && !podeCheckin && (
          <ul className="grid gap-1">{o.marcos.map((m, i) => <li key={i} className={`corpo ${m.feito ? "text-t3 line-through" : "text-t1"}`}>{m.feito ? "✓" : "○"} {m.texto}</li>)}</ul>
        )}
        {o.status === "fechado" && o.motivoFechado && <p className="meta text-t2">{t.ob.motivo}: {o.motivoFechado}</p>}
      </Cartao>

      {podeCheckin && (
        <Cartao className="mb-4">
          <p className="titulo-cartao">{t.ob.checkinTitulo}</p>
          <form action={checkinObjetivoAction} className="grid gap-3">
            <input type="hidden" name="id" value={o.id} />
            {o.meta && <Campo name="valor" type="number" step="any" rotulo={`${t.ob.valorAtual}${o.meta.unidade ? ` (${o.meta.unidade})` : ""} · ${t.ob.alvo}: ${o.meta.alvo}`} defaultValue={String(o.meta.atual)} />}
            {o.marcos.length > 0 && (
              <fieldset className="grid gap-1">
                <legend className="rotulo-campo mb-1 text-t2">{t.ob.marcosLbl}</legend>
                {o.marcos.map((m, i) => (
                  <label key={i} className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input type="checkbox" name="marco" value={i} defaultChecked={m.feito} className="size-5 accent-ac" />
                    <span className={`corpo ${m.feito ? "text-t3" : "text-t1"}`}>{m.texto}</span>
                  </label>
                ))}
              </fieldset>
            )}
            <Campo name="texto" rotulo={t.ob.oQueAvancou} maxLength={400} />
            <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{t.ob.registrar}</BotaoEnviar></div>
          </form>
        </Cartao>
      )}

      <section className="mb-6">
        <h2 className="titulo-secao mb-2">{t.ob.historico}</h2>
        <LinhaDoTempo itens={o.checkins.map((c) => ({ dia: dia(c.data), tipo: "comentou" as const, quem: c.quem, texto: t.ob.atualizou, comentario: c.texto }))}
          vazio={<p className="meta text-t3">{t.ob.semCheckins}</p>} />
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="titulo-secao">{t.ob.tarefasLigadas} <span className="meta text-t3">{ligadas.length}</span></h2>
          <Botao href={`/tarefas/nova?objetivo=${o.id}${o.projeto ? `&projeto=${o.projeto}` : ""}&equipe=${o.equipe}&back=/objetivos/${o.id}`} variante="tonal" tamanho="P" icone="mais">{t.novaTarefa}</Botao>
        </div>
        {ligadas.length ? <ul>{ligadas.map((x) => <TaskRow key={x.id} t={x} equipes={equipes} pessoas={pessoas} lang={lang} hoje={hoje} me={me} />)}</ul> : <EstadoVazio compacto titulo={t.semTarefasLigadas} />}
      </section>

      {podeEditar && o.status === "ativo" && (
        <details className="mb-6">
          <summary className="anel-foco meta inline-flex min-h-11 cursor-pointer list-none items-center rounded-pilula px-3 text-t2 hover:bg-s2">{t.ob.fechar}</summary>
          <form action={fecharObjetivoAction} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={o.id} />
            <Campo name="motivo" rotulo={t.ob.motivo} required maxLength={300} className="min-w-64 flex-1" />
            <BotaoEnviar enviando="…" icone="fechar" variante="tonal">{t.ob.fechar}</BotaoEnviar>
          </form>
        </details>
      )}
    </div>
  );
}
