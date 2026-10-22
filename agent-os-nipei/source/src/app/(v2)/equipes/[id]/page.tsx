import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Plus, Scale, Users } from "lucide-react";
import { Avatar, Card, Chip, Empty, Progress, TaskRow, Title } from "@/components/v2/ui";
import Abas from "@/components/v2/Abas";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import PrazoRapido from "@/components/v2/PrazoRapido";
import LoteBarra, { LoteToggle } from "@/components/v2/LoteBarra";
import { balancear } from "@/lib/v2/carga";
import { can, currentUser, getAcessos, getEquipes, getObjetivos, getPessoas, getTarefas, novidadesPara, progresso, today, type Pessoa, type Tarefa, responsaveisPara } from "@/lib/v2/data";
import { numerosDe } from "@/lib/v2/pessoasInfo";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { getT } from "@/lib/v2/i18n";
import { atribuirAction, reatribuirAction, setEquipeAcessoAction, setEquipeAvisosAction } from "../../actions";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 mb-3";
const BOTAO = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900";
const ROTULO = "text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2";
const sel = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-xs max-w-36";

export default async function EquipeDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string; pessoa?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes(), pessoas = getPessoas(), todas = getTarefas();
  const e = equipes.find((x) => x.id === id);
  if (!e) notFound();
  const hoje = today();
  const gerir = can.gerirEquipe(me, id);
  const daEquipe = todas.filter((x) => x.equipe === id);
  const abertasEq = daEquipe.filter((x) => x.status !== "done");

  // people: members + coordinators + anyone owning a task of this team (marked "outside the team")
  const ids = [...new Set([...e.coordenadores, ...e.membros, ...abertasEq.flatMap((x) => x.responsaveis)])];
  const acessos = getAcessos();
  const gente = ids.map((pid) => pessoas.find((p) => p.id === pid)).filter((p): p is Pessoa => !!p)
    .map((p) => ({ p, n: numerosDe(p, daEquipe, acessos, hoje), coord: e.coordenadores.includes(p.id), fora: !e.membros.includes(p.id) && !e.coordenadores.includes(p.id) }))
    .sort((a, b) => Number(b.coord) - Number(a.coord) || b.n.abertas - a.n.abertas || a.p.name.localeCompare(b.p.name, "pt"));
  const maxCarga = Math.max(1, ...gente.map((g) => g.n.abertas));
  const membrosEq = pessoas.filter((p) => p.equipes.includes(id));
  const primeiro = (pid: string) => pessoas.find((p) => p.id === pid)?.name.split(" ")[0] ?? pid;

  // task filters: área and pessoa ("sem" = no owner)
  const filtradas = abertasEq.filter((x) => (!q.area || x.area === q.area)
    && (!q.pessoa || (q.pessoa === "sem" ? !x.responsaveis.length : x.responsaveis.includes(q.pessoa))));
  const atrasadas = abertasEq.filter((x) => x.prazo && x.prazo < hoje).length;
  const semDono = abertasEq.filter((x) => !x.responsaveis.length).length;
  const feitas30 = daEquipe.filter((x) => x.concluidoEm && x.concluidoEm.slice(0, 10) > new Date(Date.parse(`${hoje}T12:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10));
  const ctx = { hoje, comNovidade: new Set(novidadesPara(me, 3, 50).map((x) => x.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const rowProps = { equipes, pessoas, lang, hoje, me };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.maisSemana, data: new Date(Date.parse(`${hoje}T12:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10) }];
  const url = (o: Record<string, string | undefined>) => `/equipes/${id}?` + new URLSearchParams(Object.entries({ area: q.area, pessoa: q.pessoa, ...o }).filter(([, v]) => v) as [string, string][]);

  const extra = (y: Tarefa) => (
    <span className="flex items-center gap-1">
      {gerir && !y.responsaveis.length && (
        <form action={atribuirAction} className="flex items-center gap-1">
          <input type="hidden" name="id" value={y.id} />
          <select name="pessoa" defaultValue="" aria-label={t.escolherPessoa} className={sel}>
            <option value="" disabled>{t.escolherPessoa}</option>
            {responsaveisPara(id).map((g) => (
              <optgroup key={g.grupo} label={t.gruposResp[g.grupo]}>
                {g.pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}{p.suspenso ? ` (${t.suspensoLbl})` : ""}</option>)}
              </optgroup>
            ))}
          </select>
          <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-xs">{t.atribuirPessoa}</BotaoEnviar>
        </form>
      )}
      {can.editTarefa(me, y) && <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} />}
    </span>
  );
  const grupo = (titulo: string, o: { tarefas: Tarefa[]; selos: Record<string, Selo[]> }, alerta = false) => o.tarefas.length > 0 && (
    <div className="mb-5">
      <p className={`${ROTULO} ${alerta ? "!text-red-600 dark:!text-red-400" : ""}`}>{titulo} <span className="font-normal">({o.tarefas.length})</span></p>
      <ul>{o.tarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])} extra={extra} selecionar={gerir ? "lote-equipe" : undefined} />)}</ul>
    </div>
  );

  const pessoaFiltro = q.pessoa && q.pessoa !== "sem" ? pessoas.find((p) => p.id === q.pessoa) : null;
  const tarefas = (
    <>
      <div className="flex items-center gap-2 mt-3 mb-2">
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <Chip href={url({ pessoa: undefined })} on={!q.pessoa}>{t.todas}</Chip>
        {me.pessoa && ids.includes(me.pessoa.id) && <Chip href={url({ pessoa: me.pessoa.id })} on={q.pessoa === me.pessoa.id}>{t.minhasLbl}</Chip>}
        <Chip href={url({ pessoa: "sem" })} on={q.pessoa === "sem"}>{t.semDonoLbl} ({semDono})</Chip>
        {pessoaFiltro && pessoaFiltro.id !== me.pessoa?.id && <Chip href={url({ pessoa: undefined })} on>✕ {pessoaFiltro.name.split(" ")[0]}</Chip>}
      </div>
        {gerir && filtradas.length > 0 && <LoteToggle formId="lote-equipe" label={t.selecionarLbl} cancelar={t.cancelar} />}
      </div>
      {e.areas.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 mb-3 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <Chip href={url({ area: undefined })} on={!q.area}>{t.todasAreas}</Chip>
          {e.areas.map((a) => <Chip key={a} href={url({ area: a })} on={q.area === a}>{a}</Chip>)}
        </div>
      )}
      {filtradas.length === 0 ? <Empty>{t.nadaPendente}</Empty> : (
        <>
          {grupo(t.agora, ordenarAgora(filtradas.filter((x) => x.prazo && x.prazo <= hoje), ctx), true)}
          {grupo(t.proximas, ordenarProximas(filtradas.filter((x) => x.prazo > hoje), ctx))}
          {grupo(t.semData, ordenarSemData(filtradas.filter((x) => !x.prazo), ctx))}
        </>
      )}
      {gerir && <LoteBarra formId="lote-equipe" pessoas={responsaveisPara(id).flatMap((g) => g.pessoas).map((p) => ({ id: p.id, nome: p.name + (p.suspenso ? ` (${t.suspensoLbl})` : "") }))}
        equipes={equipes.filter((x) => can.gerirEquipe(me, x.id)).map((x) => ({ id: x.id, nome: x.nome }))}
        labels={{ selecionadas: t.selecionadas, todas: t.selecionarTodas, limpar: t.limparSelecao, aplicar: t.aplicar, acao: t.acaoLote,
          atribuir: t.atribuirA, prazo: t.mudarPrazo, concluir: t.marcarConcluidas, prioridade: t.prioridade, mover: t.moverEquipe,
          prioridades: { urgente: t.prioUrgente, alta: t.prioAlta, "média": t.prioMedia, baixa: t.prioBaixa } }} />}
      {feitas30.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-neutral-500">{t.concluidasRecentes} ({feitas30.length})</summary>
          <ul className="mt-2">{feitas30.sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm)).slice(0, 20).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul>
        </details>
      )}
    </>
  );

  const bal = gerir ? balancear(abertasEq, membrosEq, hoje) : null;
  const estado = new Map(bal?.cargas.map((c) => [c.id, c.estado]) ?? []);
  const titulo = (tid: string) => todas.find((x) => x.id === tid)?.title ?? tid;
  const equilibrio = bal && (bal.sugestoes.length > 0 || bal.cargas.some((c) => c.estado === "sobrecarga")) && (
    <div className={`${CARTAO} mt-3`}>
      <p className={`${ROTULO} inline-flex items-center gap-1.5`}><Scale size={13} />{t.equilibrarCarga}</p>
      <p className="text-xs text-neutral-500 mb-2">{t.equilibrarIntro.replace("{media}", bal.media.toFixed(1))}</p>
      {bal.sugestoes.length === 0 ? <p className="text-sm text-neutral-500">{t.semSugestoesCarga}</p> : (
        <ul>
          {bal.sugestoes.map((s) => (
            <li key={s.tarefa} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/tarefas/${s.tarefa}`} className="block text-sm leading-snug hover:underline">{titulo(s.tarefa)}</Link>
                <p className="text-xs text-neutral-500">{s.de ? primeiro(s.de) : t.semDonoLbl} → <span className="text-neutral-800 dark:text-neutral-200 font-medium">{primeiro(s.para)}</span></p>
              </div>
              <form action={reatribuirAction}>
                <input type="hidden" name="id" value={s.tarefa} /><input type="hidden" name="de" value={s.de} /><input type="hidden" name="para" value={s.para} />
                <BotaoEnviar enviando="…" className="rounded-md border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs">{s.de ? t.moverPara : t.atribuirA} {primeiro(s.para)}</BotaoEnviar>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  const pessoasAba = (
    <>
    {equilibrio}
    <ul className="mt-3 grid gap-2">
      {gente.map(({ p, n, coord, fora }) => {
        const suas = ordenarAgora(abertasEq.filter((x) => x.responsaveis.includes(p.id)), ctx).tarefas;
        return (
          <li key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <details>
              <summary className="list-none cursor-pointer p-3 flex items-center gap-3">
                <Avatar name={p.name} size={36} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p.name}
                    {coord && <span className="ml-1.5 rounded bg-neutral-100 dark:bg-neutral-800 px-1 text-[10px] font-normal text-neutral-600 dark:text-neutral-300">{t.coordLbl}</span>}
                    {estado.get(p.id) === "sobrecarga" && <span className="ml-1.5 rounded bg-red-50 dark:bg-red-950/40 px-1 text-[10px] font-normal text-red-700 dark:text-red-400">{t.sobrecarga}</span>}
                    {estado.get(p.id) === "folga" && <span className="ml-1.5 rounded bg-green-50 dark:bg-green-950/40 px-1 text-[10px] font-normal text-green-700 dark:text-green-400">{t.temFolga}</span>}
                    {fora && <span className="ml-1.5 rounded bg-amber-50 dark:bg-amber-950/40 px-1 text-[10px] font-normal text-amber-700 dark:text-amber-400">{t.foraEquipe}</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"><div className="h-full" style={{ width: `${(n.abertas / maxCarga) * 100}%`, background: e.cor }} /></div>
                    <span className="text-xs text-neutral-500 tabular-nums">{n.abertas} {t.abertasLbl}</span>
                    {n.atrasadas > 0 && <span className="text-xs text-red-600 dark:text-red-400 tabular-nums">{n.atrasadas} {t.atrasadasLbl}</span>}
                    {n.feitas30 > 0 && <span className="text-xs text-green-700 dark:text-green-400 tabular-nums">✓ {n.feitas30}</span>}
                  </div>
                </div>
              </summary>
              <div className="px-3 pb-3">
                {suas.length ? <ul>{suas.slice(0, 8).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul> : <Empty>{t.nadaPendente}</Empty>}
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  {suas.length > 8 && <Link href={url({ pessoa: p.id })} className="underline">{t.verTodas} ({suas.length})</Link>}
                  <Link href={`/pessoas/${p.id}`} className="underline">{t.verFicha}</Link>
                  {gerir && <Link href={`/tarefas/nova?equipe=${id}&responsavel=${p.id}&back=/equipes/${id}`} className="underline">{t.atribuirTarefa}</Link>}
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
    </>
  );

  const objetivos = getObjetivos().filter((o) => o.equipe === id || o.apoio.includes(id));
  const objetivosAba = objetivos.length ? (
    <div className="grid gap-2 mt-3">
      {objetivos.map((o) => {
        const p = progresso(o.id, todas);
        return (
          <Card key={o.id} href={`/objetivos?ano=${o.ano}#${o.id}`}>
            <p className="text-sm font-medium">{o.titulo} <span className="text-neutral-500 font-normal">· {o.ano}{o.equipe !== id ? ` · ${t.apoio}` : ""}</span></p>
            {p && <div className="mt-2"><Progress {...p} /></div>}
          </Card>
        );
      })}
    </div>
  ) : <Empty>—</Empty>;

  const toggle = (action: typeof setEquipeAcessoAction, campo: string, valor: boolean, on: string, off: string) => (
    <form action={action}>
      <input type="hidden" name="equipe" value={e.id} /><input type="hidden" name={campo} value={String(!valor)} />
      <button className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs">{valor ? off : on}</button>
    </form>
  );
  const config = (
    <div className="mt-3">
      <div className={CARTAO}>
        <p className={ROTULO}>{t.acessoPlataforma}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={e.acesso ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>{e.acesso ? t.acessoLigado : t.acessoDesligado}</span>
          {me.gestao && !e.gestao && toggle(setEquipeAcessoAction, "acesso", e.acesso, t.ligar, t.desligar)}
        </div>
      </div>
      <div className={CARTAO}>
        <p className={ROTULO}>{t.avisosWhats}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={e.avisos ? "text-green-700 dark:text-green-400" : "text-neutral-500"}>{e.avisos ? t.avisosEquipeLigado : t.avisosEquipeDesligado}</span>
          {me.gestao && toggle(setEquipeAvisosAction, "avisos", e.avisos, t.ligarAvisos, t.desligarAvisos)}
        </div>
      </div>
    </div>
  );

  const Num = ({ v, label, cor, href }: { v: number; label: string; cor?: string; href?: string }) => {
    const c = <><p className={`text-lg font-semibold tabular-nums ${v ? cor ?? "" : ""}`}>{v}</p><p className="text-[11px] text-neutral-500">{label}</p></>;
    return href ? <Link href={href} className="rounded-lg bg-neutral-100 dark:bg-neutral-900 px-2 py-2 text-center hover:ring-1 hover:ring-neutral-300">{c}</Link>
      : <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 px-2 py-2 text-center">{c}</div>;
  };

  return (
    <>
      <Link href="/equipes" className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{t.equipes}</Link>
      <Title sub={e.coordenadores.length > 0 && <span className="text-sm text-neutral-500">{t.coordenacao}: {e.coordenadores.map(primeiro).join(", ")}</span>}>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: e.cor }} />{e.nome}</span>
      </Title>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
        <Link href={`/tarefas/nova?equipe=${id}${pessoaFiltro ? `&responsavel=${pessoaFiltro.id}` : ""}&back=/equipes/${id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium"><Plus size={15} />{t.novaTarefa}</Link>
        <Link href={`/equipes/${id}/reuniao`} className={BOTAO}><CalendarDays size={15} />{t.reuniaoEquipe}</Link>
        <Link href={`/pessoas?equipe=${id}`} className={BOTAO}><Users size={15} />{t.pessoas}</Link>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Num v={abertasEq.length} label={t.abertasLbl} />
        <Num v={atrasadas} label={t.atrasadasLbl} cor="text-red-600 dark:text-red-400" />
        <Num v={semDono} label={t.semDonoLbl} cor="text-amber-700 dark:text-amber-400" href={url({ pessoa: "sem" })} />
        <Num v={feitas30.length} label={t.feitas30} cor="text-green-700 dark:text-green-400" />
      </div>
      <Abas id="equipe" inicial={q.pessoa || q.area ? "tarefas" : undefined} abas={[
        { id: "tarefas", label: t.tarefasLbl, count: filtradas.length, alerta: atrasadas > 0, conteudo: tarefas },
        { id: "pessoas", label: t.membros, count: gente.length, conteudo: pessoasAba },
        { id: "objetivos", label: t.objetivos, count: objetivos.length, conteudo: objetivosAba },
        ...(gerir ? [{ id: "config", label: `🔒 ${t.configuracao}`, count: 0, conteudo: config }] : []),
      ]} />
    </>
  );
}
