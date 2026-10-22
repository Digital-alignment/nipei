import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Compass, Plus, Target } from "lucide-react";
import { Avatar, Chip, Empty, Progress, TaskRow, Title } from "@/components/v2/ui";
import Abas from "@/components/v2/Abas";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import LoteBarra, { LoteToggle } from "@/components/v2/LoteBarra";
import PrazoRapido from "@/components/v2/PrazoRapido";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefas, novidadesPara, progresso, today, type Tarefa, responsaveisPara } from "@/lib/v2/data";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { getDiagnosticos } from "@/lib/v2/diagnostico";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { anotarProjetoAction } from "../../actions";

const ROTULO = "text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2";
const BOTAO = "shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900";

export default async function ProjetoDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ equipe?: string; pessoa?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getProjetos().find((x) => x.id === id);
  if (!p) notFound();
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
      <p className={`${ROTULO} ${alerta ? "!text-red-600 dark:!text-red-400" : ""}`}>{titulo} <span className="font-normal">({o.tarefas.length})</span></p>
      <ul>{o.tarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])} extra={extra} selecionar={gerir ? "lote-projeto" : undefined} />)}</ul>
    </div>
  );
  const pessoaFiltro = q.pessoa && q.pessoa !== "sem" ? q.pessoa : "";
  const tarefas = (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <Chip href={url({ equipe: undefined, pessoa: undefined })} on={!q.equipe && !q.pessoa}>{t.todas}</Chip>
        {semDono > 0 && <Chip href={url({ pessoa: q.pessoa === "sem" ? undefined : "sem" })} on={q.pessoa === "sem"}>{t.semDonoLbl} ({semDono})</Chip>}
        {pessoaFiltro && <Chip href={url({ pessoa: undefined })} on>✕ {primeiro(pessoaFiltro)}</Chip>}
        {p.equipes.length > 1 && p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && <Chip key={eid} href={url({ equipe: q.equipe === eid ? undefined : eid })} cor={e.cor} on={q.equipe === eid}>{e.nome}</Chip>; })}
      </div>
        {gerir && filtradas.length > 0 && <LoteToggle formId="lote-projeto" label={t.selecionarLbl} cancelar={t.cancelar} />}
      </div>
      {filtradas.length === 0 ? <Empty>{t.nadaPendente}</Empty> : (
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
      {objetivos.length === 0 && <Empty>{t.semObjetivosProjeto}</Empty>}
      {objetivos.map((o) => {
        const pr = progresso(o.id, todas);
        const dono = equipes.find((e) => e.id === o.equipe);
        return (
          <div key={o.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 pl-4 border-l-4" style={{ borderLeftColor: dono?.cor }}>
            <div className="flex items-start gap-2">
              <Link href={`/objetivos?ano=${o.ano}#${o.id}`} className="text-sm font-medium leading-snug flex-1 hover:underline">{o.titulo}</Link>
              <span className="text-xs text-neutral-400 tabular-nums">{o.ano}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1">{pr ? <Progress {...pr} /> : <span className="text-xs text-neutral-500">{t.semTarefasLigadas}</span>}</div>
              <Link href={`/tarefas/nova?objetivo=${o.id}&projeto=${id}&equipe=${o.equipe}&back=/projetos/${id}`} aria-label={t.novaTarefa} title={t.novaTarefa} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"><Plus size={18} /></Link>
            </div>
          </div>
        );
      })}
      <Link href="/objetivos" className="justify-self-start text-xs underline text-neutral-500 mt-1">{t.todosObjetivos}</Link>
    </div>
  );

  // ---- people tab: whoever owns open tasks here, busiest first
  const envolvidos = [...new Set(abertas.flatMap((x) => x.responsaveis))].map((pid) => {
    const suas = abertas.filter((x) => x.responsaveis.includes(pid));
    return { pessoa: pessoas.find((x) => x.id === pid), id: pid, n: suas.length, atr: suas.filter((x) => x.prazo && x.prazo < hoje).length };
  }).sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...envolvidos.map((x) => x.n));
  const pessoasAba = envolvidos.length === 0 ? <div className="mt-3"><Empty>{t.nadaPendente}</Empty></div> : (
    <ul className="mt-3 grid gap-1">
      {envolvidos.map((x) => (
        <li key={x.id}>
          <Link href={url({ pessoa: x.id, equipe: undefined })} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <Avatar name={x.pessoa?.name ?? x.id} size={32} src={x.pessoa?.foto ? `/pessoas/${x.id}/foto?v=${encodeURIComponent(x.pessoa.fotoEm || x.pessoa.dadosConfirmadosEm)}` : undefined} />
            <span className="text-sm flex-1 min-w-0 truncate">{x.pessoa?.name ?? x.id}</span>
            <div className="hidden sm:block h-1.5 w-24 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"><div className="h-full bg-neutral-400 dark:bg-neutral-500" style={{ width: `${(x.n / maxN) * 100}%` }} /></div>
            <span className="text-xs text-neutral-500 tabular-nums w-16 text-right">{x.n} {t.abertasLbl}</span>
            <span className={`text-xs tabular-nums w-14 text-right ${x.atr ? "text-red-600 dark:text-red-400" : "text-neutral-300 dark:text-neutral-700"}`}>{x.atr} {t.atrasadasLbl}</span>
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
          <input name="texto" required maxLength={500} placeholder={t.novaAtualizacao} className="flex-1 min-w-0 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm" />
          <BotaoEnviar enviando="…" className="shrink-0 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-2 text-sm font-medium">{t.publicar}</BotaoEnviar>
        </form>
      )}
      {atualizacoes.length === 0 ? <Empty>{t.semAtualizacoes}</Empty> : (
        <ol className="relative border-l border-neutral-200 dark:border-neutral-800 ml-1.5">
          {atualizacoes.slice(0, 30).map((a, i) => (
            <li key={i} className="ml-4 pb-4 last:pb-0">
              <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              {a.data && <p className="text-xs text-neutral-500">{fmtDate(a.data, lang)}{a.quem && ` · ${a.quem}`}</p>}
              <p className="text-sm">{a.texto}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  const Num = ({ v, label, cor, href }: { v: number | string; label: string; cor?: string; href?: string }) => {
    const c = <><p className={`text-lg font-semibold tabular-nums ${cor ?? ""}`}>{v}</p><p className="text-[11px] text-neutral-500 leading-tight">{label}</p></>;
    const cls = "rounded-lg bg-neutral-100 dark:bg-neutral-900 px-2 py-2 text-center";
    return href ? <Link href={href} className={`${cls} hover:ring-1 hover:ring-neutral-300 dark:hover:ring-neutral-700`}>{c}</Link> : <div className={cls}>{c}</div>;
  };
  const longa = p.descricao.length > 220;

  return (
    <>
      <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.projetos}</Link>
      <Title>{p.nome}</Title>
      {p.descricao && (longa ? (
        <details className="-mt-3 mb-4 group">
          <summary className="list-none cursor-pointer text-sm text-neutral-500"><span className="group-open:hidden line-clamp-2">{p.descricao}</span><span className="text-xs underline group-open:hidden">{t.lerMais}</span></summary>
          <p className="text-sm text-neutral-500 whitespace-pre-line">{p.descricao}</p>
        </details>
      ) : <p className="-mt-3 mb-4 text-sm text-neutral-500">{p.descricao}</p>)}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {p.equipes.map((eid) => { const e = equipes.find((x) => x.id === eid); return e && (
          <Link key={eid} href={`/equipes/${eid}`} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:underline">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.cor }} />{e.nome}
          </Link>
        ); })}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <Num v={abertas.length} label={t.abertasLbl} />
        <Num v={atrasadas} label={t.atrasadasLbl} cor={atrasadas ? "text-red-600 dark:text-red-400" : ""} />
        <Num v={semDono} label={t.semDonoLbl} cor={semDono ? "text-amber-700 dark:text-amber-400" : ""} href={semDono ? url({ pessoa: "sem", equipe: undefined }) : undefined} />
        <Num v={`${pct}%`} label={t.concluidoLbl} cor="text-green-700 dark:text-green-400" />
      </div>
      <div className="h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mb-4"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
        <Link href={`/tarefas/nova?projeto=${id}${q.equipe ? `&equipe=${q.equipe}` : ""}&back=/projetos/${id}`} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium"><Plus size={15} />{t.novaTarefa}</Link>
        <Link href={`/projetos/${id}/visao`} className={BOTAO}><Compass size={15} />{t.visaoHolistica}</Link>
        <Link href="/objetivos" className={BOTAO}><Target size={15} />{t.objetivos}</Link>
        {diags.map((d) => <Link key={d.id} href={`/diagnosticos/${d.id}`} className={BOTAO}><ClipboardList size={15} />{t.diagnostico}</Link>)}
      </div>

      <Abas id="projeto" inicial={q.equipe || q.pessoa ? "tarefas" : undefined} abas={[
        { id: "tarefas", label: t.tarefasLbl, count: filtradas.length, alerta: atrasadas > 0, conteudo: tarefas },
        { id: "objetivos", label: t.objetivos, count: objetivos.length, conteudo: objetivosAba },
        { id: "pessoas", label: t.pessoas, count: envolvidos.length, conteudo: pessoasAba },
        { id: "atualizacoes", label: t.atualizacoes, count: 0, conteudo: atualizacoesAba },
      ]} />
    </>
  );
}
