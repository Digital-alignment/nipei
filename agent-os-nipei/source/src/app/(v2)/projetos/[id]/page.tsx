import Link from "next/link";
import { AbasComPainel } from "@/components/ds/Abas";
import OQueSabemos from "@/components/v2/OQueSabemos";
import { filtrarConfirmados } from "@/lib/v2/conhecimento";
import ChipDS from "@/components/ds/Chip";
import { chaveEquipe } from "@/components/ds/equipes";
import { EstadoVazio } from "@/components/ds/Estados";
import AvatarDS from "@/components/ds/Avatar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Campo from "@/components/ds/Campo";
import { BarraProgresso } from "@/components/ds/Progresso";
import LinhaDoTempo from "@/components/ds/padroes/LinhaDoTempo";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import { TaskRow } from "@/components/v2/ui";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import LoteBarra, { LoteToggle } from "@/components/v2/LoteBarra";
import PrazoRapido from "@/components/v2/PrazoRapido";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, novidadesPara, progresso, today, type Tarefa, responsaveisPara } from "@/lib/v2/data";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { getDiagnosticos } from "@/lib/v2/diagnostico";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { anotarProjetoAction } from "../../actions";


export default async function ProjetoDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ equipe?: string; pessoa?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getProjetos().find((x) => x.id === id);
  if (!p) notFound();
  const sabemos = filtrarConfirmados({ projeto: p.id });
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas(), todas = getTarefas();
  const gerir = me.gestao || p.equipes.some((e) => me.coordena.includes(e));
  const ts = todas.filter((x) => x.projeto === id);
  const abertas = ts.filter((x) => x.status !== "done");
  const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
  const semDono = abertas.filter((x) => !x.responsaveis.length).length;
  const pct = ts.length ? Math.round(((ts.length - abertas.length) / ts.length) * 100) : 0;
  const objetivos = getObjetivos().filter((o) => o.projeto === id).sort((a, b) => a.ano - b.ano);
  const diags = me.gestao ? getDiagnosticos().filter((d) => d.projeto === id) : [];
  const primeiro = (pid: string) => pessoas.find((x) => x.id === pid)?.name.split(" ")[0] ?? pid;
  const url = (o: Record<string, string | undefined>) => `/projetos/${id}?` + new URLSearchParams(Object.entries({ equipe: q.equipe, pessoa: q.pessoa, ...o }).filter(([, v]) => v) as [string, string][]);

  // ---- tasks tab
  const filtradas = abertas.filter((x) => (!q.equipe || x.equipe === q.equipe) && (!q.pessoa || (q.pessoa === "sem" ? !x.responsaveis.length : x.responsaveis.includes(q.pessoa))));
  const ctx = { hoje, comNovidade: new Set(novidadesPara(me, 3, 50).map((x) => x.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const rowProps = { equipes, pessoas, lang, hoje, me };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.maisSemana, data: new Date(Date.parse(`${hoje}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10) }];
  const extra = (y: Tarefa) => can.editTarefa(me, y) ? <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} /> : null;
  const grupo = (titulo: string, o: { tarefas: Tarefa[]; selos: Record<string, Selo[]> }, alerta = false) => o.tarefas.length > 0 && (
    <div className="mb-5">
      <h3 className="mb-2 flex items-center gap-2"><span className="titulo-cartao">{titulo}</span><span className={`rounded-pilula px-2.5 py-0.5 text-xs font-semibold tabular-nums ${alerta ? "bg-err-bg text-err" : "bg-s2 text-t2"}`}>{o.tarefas.length}</span></h3>
      <ul>{o.tarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])} extra={extra} selecionar={gerir ? "lote-projeto" : undefined} />)}</ul>
    </div>
  );
  const pessoaFiltro = q.pessoa && q.pessoa !== "sem" ? q.pessoa : "";
  const tarefas = (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <ChipDS ativo={!q.equipe && !q.pessoa} href={url({ equipe: undefined, pessoa: undefined })}>{t.todas}</ChipDS>
        {semDono > 0 && <ChipDS ativo={q.pessoa === "sem"} href={url({ pessoa: q.pessoa === "sem" ? undefined : "sem" })}>{t.semDonoLbl} ({semDono})</ChipDS>}
        {pessoaFiltro && <ChipDS ativo={true} href={url({ pessoa: undefined })}>✕ {primeiro(pessoaFiltro)}</ChipDS>}
        {p.equipes.length > 1 && p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <ChipDS tipo={chaveEquipe(e.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(e.cor)} ativo={q.equipe === eid} key={eid} href={url({ equipe: q.equipe === eid ? undefined : eid })}>{e.nome}</ChipDS>; })}
      </div>
        {gerir && filtradas.length > 0 && <LoteToggle formId="lote-projeto" label={t.selecionarLbl} cancelar={t.cancelar} />}
      </div>
      {filtradas.length === 0 ? <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} /> : (
        <>
          {grupo(t.agora, ordenarAgora(filtradas.filter((x) => x.prazo && x.prazo <= hoje), ctx), true)}
          {grupo(t.proximas, ordenarProximas(filtradas.filter((x) => x.prazo > hoje), ctx))}
          {grupo(t.semData, ordenarSemData(filtradas.filter((x) => !x.prazo), ctx))}
        </>
      )}
      {gerir && <LoteBarra formId="lote-projeto"
        pessoas={responsaveisPara(p.equipes[0]).flatMap((g) => g.pessoas).map((x) => ({ id: x.id, nome: x.name + (x.suspenso ? ` (${t.suspensoLbl})` : "") }))}
        equipes={equipes.filter((x) => can.gerirEquipe(me, x.id)).map((x) => ({ id: x.id, nome: x.nome }))}
        labels={{ selecionadas: t.selecionadas, todas: t.selecionarTodas, limpar: t.limparSelecao, aplicar: t.aplicar, acao: t.acaoLote,
          atribuir: t.atribuirA, prazo: t.mudarPrazo, concluir: t.marcarConcluidas, prioridade: t.prioridade, mover: t.moverEquipe,
          prioridades: { urgente: t.prioUrgente, alta: t.prioAlta, "média": t.prioMedia, baixa: t.prioBaixa } }} />}
    </div>
  );

  // ---- objectives tab
  const objetivosAba = (
    <div className="mt-3 grid gap-2">
      {objetivos.length === 0 && <EstadoVazio compacto titulo={<>{t.semObjetivosProjeto}</>} />}
      {objetivos.map((o) => {
        const pr = progresso(o.id, todas);
        const dono = equipes.find((e) => e.id === o.equipe);
        return (
          <div key={o.id} className="rounded-cartao bg-s1 p-3 pl-4 border-l-4" style={{ borderLeftColor: dono?.cor }}>
            <div className="flex items-start gap-2">
              <Link href={`/objetivos?ano=${o.ano}#${o.id}`} className="text-sm font-medium leading-snug flex-1 hover:underline">{o.titulo}</Link>
              <span className="text-xs text-t3 tabular-nums">{o.ano}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1">{pr ? <BarraProgresso valor={pr.done} max={pr.total} rotulo={`${pr.total ? Math.round((pr.done / pr.total) * 100) : 0}% · ${pr.done}/${pr.total}`} /> : <span className="text-xs text-t2">{t.semTarefasLigadas}</span>}</div>
              <Link href={`/tarefas/nova?objetivo=${o.id}&projeto=${id}&equipe=${o.equipe}&back=/projetos/${id}`} aria-label={t.novaTarefa} title={t.novaTarefa} className="text-t3 hover:text-t1"><Icone nome="mais"  tamanho={18} /></Link>
            </div>
          </div>
        );
      })}
      <Link href="/objetivos" className="justify-self-start text-xs underline text-t2 mt-1">{t.todosObjetivos}</Link>
    </div>
  );

  // ---- people tab: whoever owns open tasks here, busiest first
  const envolvidos = [...new Set(abertas.flatMap((x) => x.responsaveis))].map((pid) => {
    const suas = abertas.filter((x) => x.responsaveis.includes(pid));
    return { pessoa: pessoas.find((x) => x.id === pid), id: pid, n: suas.length, atr: suas.filter((x) => x.prazo && x.prazo < hoje).length };
  }).sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...envolvidos.map((x) => x.n));
  const pessoasAba = envolvidos.length === 0 ? <div className="mt-3"><EstadoVazio compacto titulo={<>{t.nadaPendente}</>} /></div> : (
    <ul className="mt-3 grid gap-1">
      {envolvidos.map((x) => (
        <li key={x.id}>
          <Link href={url({ pessoa: x.id, equipe: undefined })} className="flex items-center gap-3 rounded-interno px-2 py-2 hover:bg-s2">
            <AvatarDS nome={x.pessoa?.name ?? x.id} foto={x.pessoa?.foto ? `/pessoas/${x.id}/foto?v=${encodeURIComponent(x.pessoa.fotoEm || x.pessoa.dadosConfirmadosEm)}` : undefined} tamanho={32} />
            <span className="text-sm flex-1 min-w-0 truncate">{x.pessoa?.name ?? x.id}</span>
            <div className="hidden sm:block h-1.5 w-24 rounded-pilula bg-s2 overflow-hidden"><div className="h-full bg-t3" style={{ width: `${(x.n / maxN) * 100}%` }} /></div>
            <span className="text-xs text-t2 tabular-nums w-16 text-right">{x.n} {t.abertasLbl}</span>
            <span className={`text-xs tabular-nums w-14 text-right ${x.atr ? "text-err" : "text-t3"}`}>{x.atr} {t.atrasadasLbl}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  // ---- updates tab
  const atualizacoes = p.atualizacoes.map((a) => { const m = a.match(/^(\d{4}-\d{2}-\d{2})\s*·\s*([^·]+?)\s*·\s*([\s\S]*)$/); return m ? { data: m[1], quem: m[2], texto: m[3] } : { data: "", quem: "", texto: a }; });
  const atualizacoesAba = (
    <div className="mt-3">
      {gerir && (
        <form action={anotarProjetoAction} className="flex gap-2 mb-4">
          <input type="hidden" name="projeto" value={id} />
          <div className="min-w-0 flex-1"><Campo name="texto" rotulo={t.novaAtualizacao} required maxLength={500} /></div>
          <BotaoEnviar enviando="…" icone="enviar" variante="primario" tamanho="G">{t.publicar}</BotaoEnviar>
        </form>
      )}
      {atualizacoes.length === 0 ? <EstadoVazio compacto titulo={<>{t.semAtualizacoes}</>} /> : (
        <LinhaDoTempo itens={atualizacoes.slice(0, 30).map((a) => ({ dia: a.data ? fmtDate(a.data, lang) : "—", tipo: "comentou" as const, quem: a.quem || "—", texto: t.publicar.toLowerCase(), comentario: a.texto }))} />
      )}
    </div>
  );

  const Num = ({ v, label, cor, href }: { v: number | string; label: string; cor?: string; href?: string }) => {
    const c = <><p className={`font-display text-2xl font-light leading-none tabular-nums md:text-3xl ${cor || "text-t1"}`}>{v}</p><p className="meta text-t2">{label}</p></>;
    const cls = "grid gap-0.5 rounded-cartao bg-s1 px-3 py-3";
    return href ? <Link href={href} className={`anel-foco ${cls} transition-colors hover:bg-s2`}>{c}</Link> : <div className={cls}>{c}</div>;
  };
  const longa = p.descricao.length > 220;

  return (
    <>
      <div className="-ml-3 mb-2"><Botao href="/projetos" variante="fantasma" tamanho="P" icone="voltar">{t.projetos}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.projetos} titulo={p.nome}
        acoes={<>
          <BotaoIcone icone="informacao" aria-label={t.visaoHolistica} href={`/projetos/${id}/visao`} />
          <BotaoIcone icone="sucesso" aria-label={t.objetivos} href="/objetivos" />
          {diags.map((d) => <BotaoIcone key={d.id} icone="tarefa" aria-label={t.diagnostico} href={`/diagnosticos/${d.id}`} />)}
          <Botao href={`/tarefas/nova?projeto=${id}${q.equipe ? `&equipe=${q.equipe}` : ""}&back=/projetos/${id}`} icone="mais" folha>{t.novaTarefa}</Botao>
        </>}
        filtros={p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <ChipDS tipo={chaveEquipe(e.cor) ? "equipe" : "filtro"} equipe={chaveEquipe(e.cor)} key={eid} href={`/equipes/${eid}`}>{e.nome}</ChipDS>; })} />
      {p.descricao && (longa ? (
        <details className="-mt-3 mb-5 group">
          <summary className="anel-foco corpo cursor-pointer list-none rounded-interno text-t2"><span className="line-clamp-2 group-open:hidden">{p.descricao}</span><span className="meta underline group-open:hidden">{t.lerMais}</span></summary>
          <p className="corpo whitespace-pre-line text-t2">{p.descricao}</p>
        </details>
      ) : <p className="corpo -mt-3 mb-5 text-t2">{p.descricao}</p>)}

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Num v={abertas.length} label={t.abertasLbl} />
        <Num v={atrasadas} label={t.atrasadasLbl} cor={atrasadas ? "text-err" : ""} />
        <Num v={semDono} label={t.semDonoLbl} cor={semDono ? "text-warn" : ""} href={semDono ? url({ pessoa: "sem", equipe: undefined }) : undefined} />
        <Num v={`${pct}%`} label={t.concluidoLbl} cor="text-ok" />
      </div>
      <div className="mb-6"><BarraProgresso valor={pct} planejado rotuloAcessivel={t.concluidoLbl} /></div>


      <AbasComPainel id="projeto" inicial={q.equipe || q.pessoa ? "tarefas" : undefined} abas={[
        { id: "tarefas", rotulo: t.tarefasLbl, contagem: filtradas.length, alerta: atrasadas > 0, conteudo: tarefas },
        { id: "objetivos", rotulo: t.objetivos, contagem: objetivos.length, conteudo: objetivosAba },
        { id: "pessoas", rotulo: t.pessoas, contagem: envolvidos.length, conteudo: pessoasAba },
        { id: "atualizacoes", rotulo: t.atualizacoes, contagem: 0, conteudo: atualizacoesAba },
        { id: "sabemos", rotulo: t.oQueSabemos, contagem: sabemos.length, conteudo: <OQueSabemos fatos={sabemos} t={t} base={`/conhecimento?projeto=${p.id}#base`} /> },
      ]} />
    </>
  );
}
