import Link from "next/link";
import { AbasComPainel } from "@/components/ds/Abas";
import OQueSabemos from "@/components/v2/OQueSabemos";
import { filtrarConfirmados } from "@/lib/v2/conhecimento";
import ChipDS from "@/components/ds/Chip";
import { EstadoVazio } from "@/components/ds/Estados";
import AvatarDS from "@/components/ds/Avatar";
import { BarraProgresso } from "@/components/ds/Progresso";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import { TaskRow } from "@/components/v2/ui";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import PrazoRapido from "@/components/v2/PrazoRapido";
import LoteBarra, { LoteToggle } from "@/components/v2/LoteBarra";
import { balancear } from "@/lib/v2/carga";
import { can, currentUser, getAcessos, getEquipes, getObjetivos, getPessoas, getTarefas, novidadesPara, progresso, today, type Pessoa, type Tarefa, responsaveisPara } from "@/lib/v2/data";
import { numerosDe } from "@/lib/v2/pessoasInfo";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { getT } from "@/lib/v2/i18n";
import { atribuirAction, reatribuirAction, setEquipeAcessoAction, setEquipeAvisosAction } from "../../actions";


export default async function EquipeDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ area?: string; pessoa?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes(), pessoas = getPessoas(), todas = getTarefas();
  const e = equipes.find((x) => x.id === id);
  if (!e) notFound();
  const sabemos = filtrarConfirmados({ equipe: e.id });
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
          <Campo tipo="selecao" rotulo={t.escolherPessoa} name="pessoa" defaultValue=""><option value="" disabled>{t.escolherPessoa}</option>{responsaveisPara(id).map((g) => (
              <optgroup key={g.grupo} label={t.gruposResp[g.grupo]}>
                {g.pessoas.map((p) => <option key={p.id} value={p.id}>{p.name}{p.suspenso ? ` (${t.suspensoLbl})` : ""}</option>)}
              </optgroup>
            ))}</Campo>
          <BotaoEnviar enviando="…" icone="pessoa" variante="tonal" tamanho="P">{t.atribuirPessoa}</BotaoEnviar>
        </form>
      )}
      {can.editTarefa(me, y) && <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} />}
    </span>
  );
  const grupo = (titulo: string, o: { tarefas: Tarefa[]; selos: Record<string, Selo[]> }, alerta = false) => o.tarefas.length > 0 && (
    <div className="mb-5">
      <h3 className="mb-2 flex items-center gap-2"><span className="titulo-cartao">{titulo}</span><span className={`rounded-pilula px-2.5 py-0.5 text-xs font-semibold tabular-nums ${alerta ? "bg-err-bg text-err" : "bg-s2 text-t2"}`}>{o.tarefas.length}</span></h3>
      <ul>{o.tarefas.map((x) => <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])} extra={extra} selecionar={gerir ? "lote-equipe" : undefined} />)}</ul>
    </div>
  );

  const pessoaFiltro = q.pessoa && q.pessoa !== "sem" ? pessoas.find((p) => p.id === q.pessoa) : null;
  const tarefas = (
    <>
      <div className="flex items-center gap-2 mt-3 mb-2">
      <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto -mx-1 px-1 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
        <ChipDS ativo={!q.pessoa} href={url({ pessoa: undefined })}>{t.todas}</ChipDS>
        {me.pessoa && ids.includes(me.pessoa.id) && <ChipDS ativo={q.pessoa === me.pessoa.id} href={url({ pessoa: me.pessoa.id })}>{t.minhasLbl}</ChipDS>}
        <ChipDS ativo={q.pessoa === "sem"} href={url({ pessoa: "sem" })}>{t.semDonoLbl} ({semDono})</ChipDS>
        {pessoaFiltro && pessoaFiltro.id !== me.pessoa?.id && <ChipDS ativo={true} href={url({ pessoa: undefined })}>✕ {pessoaFiltro.name.split(" ")[0]}</ChipDS>}
      </div>
        {gerir && filtradas.length > 0 && <LoteToggle formId="lote-equipe" label={t.selecionarLbl} cancelar={t.cancelar} />}
      </div>
      {e.areas.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 mb-3 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <ChipDS ativo={!q.area} href={url({ area: undefined })}>{t.todasAreas}</ChipDS>
          {e.areas.map((a) => <ChipDS ativo={q.area === a} key={a} href={url({ area: a })}>{a}</ChipDS>)}
        </div>
      )}
      {filtradas.length === 0 ? <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} /> : (
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
          <summary className="cursor-pointer text-sm text-t2">{t.concluidasRecentes} ({feitas30.length})</summary>
          <ul className="mt-2">{feitas30.sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm)).slice(0, 20).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul>
        </details>
      )}
    </>
  );

  const bal = gerir ? balancear(abertasEq, membrosEq, hoje) : null;
  const estado = new Map(bal?.cargas.map((c) => [c.id, c.estado]) ?? []);
  const titulo = (tid: string) => todas.find((x) => x.id === tid)?.title ?? tid;
  const equilibrio = bal && (bal.sugestoes.length > 0 || bal.cargas.some((c) => c.estado === "sobrecarga")) && (
    <Cartao className="mb-3 mt-3">
      <p className="rotulo-maiusculo text-t3 mb-2 inline-flex items-center gap-1.5"><Icone nome="pessoas" tamanho={16} />{t.equilibrarCarga}</p>
      <p className="text-xs text-t2 mb-2">{t.equilibrarIntro.replace("{media}", bal.media.toFixed(1))}</p>
      {bal.sugestoes.length === 0 ? <p className="text-sm text-t2">{t.semSugestoesCarga}</p> : (
        <ul>
          {bal.sugestoes.map((s) => (
            <li key={s.tarefa} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-s2 last:border-0">
              <div className="min-w-0 flex-1">
                <Link href={`/tarefas/${s.tarefa}`} className="block text-sm leading-snug hover:underline">{titulo(s.tarefa)}</Link>
                <p className="text-xs text-t2">{s.de ? primeiro(s.de) : t.semDonoLbl} → <span className="text-t1 font-medium">{primeiro(s.para)}</span></p>
              </div>
              <form action={reatribuirAction}>
                <input type="hidden" name="id" value={s.tarefa} /><input type="hidden" name="de" value={s.de} /><input type="hidden" name="para" value={s.para} />
                <BotaoEnviar enviando="…" icone="pessoa" variante="tonal" tamanho="P">{s.de ? t.moverPara : t.atribuirA} {primeiro(s.para)}</BotaoEnviar>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
  const pessoasAba = (
    <>
    {equilibrio}
    <ul className="mt-3 grid gap-2">
      {gente.map(({ p, n, coord, fora }) => {
        const suas = ordenarAgora(abertasEq.filter((x) => x.responsaveis.includes(p.id)), ctx).tarefas;
        return (
          <li key={p.id} className="rounded-cartao bg-s1">
            <details>
              <summary className="list-none cursor-pointer p-3 flex items-center gap-3">
                <AvatarDS nome={p.name} foto={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} tamanho={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {p.name}
                    {coord && <span className="ml-1.5 rounded bg-s2 px-1 text-xs font-normal text-t2">{t.coordLbl}</span>}
                    {estado.get(p.id) === "sobrecarga" && <span className="ml-1.5 rounded bg-err-bg px-1 text-xs font-normal text-err">{t.sobrecarga}</span>}
                    {estado.get(p.id) === "folga" && <span className="ml-1.5 rounded bg-ok-bg px-1 text-xs font-normal text-ok">{t.temFolga}</span>}
                    {fora && <span className="ml-1.5 rounded bg-warn-bg px-1 text-xs font-normal text-warn">{t.foraEquipe}</span>}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-pilula bg-s2 overflow-hidden"><div className="h-full" style={{ width: `${(n.abertas / maxCarga) * 100}%`, background: e.cor }} /></div>
                    <span className="text-xs text-t2 tabular-nums">{n.abertas} {t.abertasLbl}</span>
                    {n.atrasadas > 0 && <span className="text-xs text-err tabular-nums">{n.atrasadas} {t.atrasadasLbl}</span>}
                    {n.feitas30 > 0 && <span className="inline-flex items-center gap-1 text-xs text-ok tabular-nums"><Icone nome="confirmar" tamanho={12} />{n.feitas30}</span>}
                  </div>
                </div>
              </summary>
              <div className="px-3 pb-3">
                {suas.length ? <ul>{suas.slice(0, 8).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul> : <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />}
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
          <Cartao key={o.id} variante="clicavel" className="block" href={`/objetivos?ano=${o.ano}#${o.id}`}>
            <p className="text-sm font-medium">{o.titulo} <span className="text-t2 font-normal">· {o.ano}{o.equipe !== id ? ` · ${t.apoio}` : ""}</span></p>
            {p && <div className="mt-2"><BarraProgresso valor={p.done} max={p.total} rotulo={`${p.total ? Math.round((p.done / p.total) * 100) : 0}% · ${p.done}/${p.total}`} /></div>}
          </Cartao>
        );
      })}
    </div>
  ) : <EstadoVazio compacto titulo={<>—</>} />;

  const toggle = (action: typeof setEquipeAcessoAction, campo: string, valor: boolean, on: string, off: string) => (
    <form action={action}>
      <input type="hidden" name="equipe" value={e.id} /><input type="hidden" name={campo} value={String(!valor)} />
      <button className="anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s3 px-3.5 font-texto text-sm font-semibold text-t1 hover:bg-s4">{valor ? off : on}</button>
    </form>
  );
  const config = (
    <div className="mt-3">
      <Cartao className="mb-3">
        <p className="rotulo-maiusculo text-t3 mb-2">{t.acessoPlataforma}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={e.acesso ? "text-ok" : "text-t2"}>{e.acesso ? t.acessoLigado : t.acessoDesligado}</span>
          {me.gestao && !e.gestao && toggle(setEquipeAcessoAction, "acesso", e.acesso, t.ligar, t.desligar)}
        </div>
      </Cartao>
      <Cartao className="mb-3">
        <p className="rotulo-maiusculo text-t3 mb-2">{t.avisosWhats}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={e.avisos ? "text-ok" : "text-t2"}>{e.avisos ? t.avisosEquipeLigado : t.avisosEquipeDesligado}</span>
          {me.gestao && toggle(setEquipeAvisosAction, "avisos", e.avisos, t.ligarAvisos, t.desligarAvisos)}
        </div>
      </Cartao>
    </div>
  );

  const Num = ({ v, label, cor, href }: { v: number; label: string; cor?: string; href?: string }) => {
    const c = <><p className={`font-display text-2xl font-light leading-none tabular-nums md:text-3xl ${v ? cor ?? "text-t1" : "text-t1"}`}>{v}</p><p className="meta text-t2">{label}</p></>;
    return href ? <Link href={href} className="anel-foco grid gap-0.5 rounded-cartao bg-s1 px-3 py-3 transition-colors hover:bg-s2">{c}</Link>
      : <div className="grid gap-0.5 rounded-cartao bg-s1 px-3 py-3">{c}</div>;
  };

  return (
    <>
      <div className="-ml-3 mb-2"><Botao href="/equipes" variante="fantasma" tamanho="P" icone="voltar">{t.equipes}</Botao></div>
      <CabecalhoPagina selo={chaveEquipe(e.id) ? EQUIPES_DS[chaveEquipe(e.id)!].selo : "broto"} rotulo={e.coordenadores.length > 0 ? `${t.coordenacao}: ${e.coordenadores.map(primeiro).join(", ")}` : t.equipes}
        titulo={e.nome}
        acoes={<>
          <BotaoIcone icone="calendario" aria-label={t.reuniaoEquipe} href={`/equipes/${id}/reuniao`} />
          <BotaoIcone icone="pessoas" aria-label={t.pessoas} href={`/pessoas?equipe=${id}`} />
          <Botao href={`/tarefas/nova?equipe=${id}${pessoaFiltro ? `&responsavel=${pessoaFiltro.id}` : ""}&back=/equipes/${id}`} icone="mais" folha>{t.novaTarefa}</Botao>
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Num v={abertasEq.length} label={t.abertasLbl} />
        <Num v={atrasadas} label={t.atrasadasLbl} cor="text-err" />
        <Num v={semDono} label={t.semDonoLbl} cor="text-warn" href={url({ pessoa: "sem" })} />
        <Num v={feitas30.length} label={t.feitas30} cor="text-ok" />
      </div>
      <AbasComPainel id="equipe" inicial={q.pessoa || q.area ? "tarefas" : undefined} abas={[
        { id: "tarefas", rotulo: t.tarefasLbl, contagem: filtradas.length, alerta: atrasadas > 0, conteudo: tarefas },
        { id: "pessoas", rotulo: t.membros, contagem: gente.length, conteudo: pessoasAba },
        { id: "objetivos", rotulo: t.objetivos, contagem: objetivos.length, conteudo: objetivosAba },
        { id: "sabemos", rotulo: t.oQueSabemos, contagem: sabemos.length, conteudo: <OQueSabemos fatos={sabemos} t={t} base={`/conhecimento?equipe=${e.id}#base`} /> },
        ...(gerir ? [{ id: "config", rotulo: t.configuracao, contagem: 0, conteudo: config }] : []),
      ]} />
    </>
  );
}
