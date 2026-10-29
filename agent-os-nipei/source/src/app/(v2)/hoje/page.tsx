import Link from "next/link";
import { AbasComPainel } from "@/components/ds/Abas";
import { EstadoVazio } from "@/components/ds/Estados";
import { TaskRow, byPrazo } from "@/components/v2/ui";

import PrazoRapido from "@/components/v2/PrazoRapido";
import { CampoAssistente } from "@/components/v2/AssistenteGlobal";
import EscolherEquipes from "@/components/v2/EscolherEquipes";
import { funcaoLigada } from "@/lib/v2/funcoes";
import { prontosPara } from "@/lib/v2/trabalhos";
import { perfilPendente } from "@/lib/v2/perfil";
import { getFatos, podeRevisar } from "@/lib/v2/conhecimento";
import { getAlertas } from "@/lib/v2/auditor";
import { getPropostas, podeDecidir } from "@/lib/v2/propostas";
import { codigoPendente, diagnosticosAbertos, getColetivo, progresso, secoesColetivas } from "@/lib/v2/diagnostico";
import { agendaDoDia, pulso } from "@/lib/v2/hoje";
import { can, currentUser, esperandoPor, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { missaoDaSemana, primeirosPassos } from "@/lib/v2/missaoDados";
import { organizacao } from "@/lib/v2/organizacao";
import { MAX_FOCO, getFoco } from "@/lib/v2/foco";
import { getConexoes } from "@/lib/v2/conexoes";
import { eventosGoogle, type EventoGoogle } from "@/lib/v2/google";
import Campo from "@/components/ds/Campo";
import Aviso from "@/components/ds/Aviso";
import { BotaoIcone } from "@/components/ds/Botao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { createTarefaAction, focoAction } from "../actions";
import Chip from "@/components/ds/Chip";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import Cartao from "@/components/ds/Cartao";
import SecaoRecolhivel from "@/components/ds/SecaoRecolhivel";
import Botao from "@/components/ds/Botao";
import MenuAcoes from "@/components/ds/MenuAcoes";
import { AnelProgresso, BarraProgresso } from "@/components/ds/Progresso";
import { GrupoTarefas } from "@/components/ds/padroes/LinhaTarefa";

// Hoje, compact: what matters today (agenda, pending pills), one place to ask,
// and one task list at a time (tabs).
export default async function Hoje({ searchParams }: { searchParams: Promise<{ dia?: string; aba?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const user = (await currentUser())!;
  const me = user.pessoa;
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas();
  const minhas = getTarefas().filter((x) => x.status !== "done" && me && x.responsaveis.includes(me.id)).sort(byPrazo);
  const props = { equipes, pessoas, lang, hoje, me: user };

  // one-tap dates (Bahia calendar)
  const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const dow = new Date(`${hoje}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const ateSexta = (5 - dow + 7) % 7;
  const fimMes = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7), 0)).toISOString().slice(0, 10);
  const locale = lang === "en" ? "en-US" : "pt-BR";
  const nomeDia = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", timeZone: "UTC" });

  // Google Agenda pessoal (se conectada): até 2,5 s, senão a página segue sem ela; cache de 5 min em lib/v2/google.ts
  const googleEvs: EventoGoogle[] = me && getConexoes(me.id).google
    ? await Promise.race([eventosGoogle(me.id, hoje, dia(6)).catch(() => []), new Promise<EventoGoogle[]>((r) => setTimeout(() => r([]), 2500))])
    : [];

  // mini week: today + 6 days, a ring per day (my tasks due that day: done / total), a dot per event; a tap filters the list to that day
  const doMeu = me ? getTarefas().filter((x) => x.responsaveis.includes(me.id)) : [];
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = dia(i);
    const doDiaTodas = doMeu.filter((x) => x.prazo === d);
    const tarefasDia = doDiaTodas.length, feitasDia = doDiaTodas.filter((x) => x.status === "done").length;
    const eventosDia = getEventos().filter((e) => e.inicio.length === 10 && (e.inicio === d || (!!e.fim && e.inicio <= d && d <= e.fim)) && (user.gestao || !e.equipe || user.equipes.includes(e.equipe))).length;
    return { d, tarefasDia, feitasDia, abertasDia: tarefasDia - feitasDia, eventosDia, googleDia: googleEvs.filter((e) => e.dia === d).length };
  });
  // dia carregado: muito acima da média da semana (e pelo menos 4 abertas); o mais leve (de amanhã em diante) é para onde mover
  const media = semana.reduce((n, x) => n + x.abertasDia, 0) / 7;
  const carregado = (x: (typeof semana)[number]) => x.abertasDia >= Math.max(4, 2 * media);
  const diaLeve = semana.slice(1).reduce((a, b) => (b.abertasDia < a.abertasDia ? b : a));
  const diaSel = q.dia && semana.some((x) => x.d === q.dia) ? q.dia : "";
  const selCarregado = semana.find((x) => x.d === diaSel && carregado(x));

  const OPCOES = {
    datadas: [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: dia(1) }, { label: t.maisSemana, data: dia(7) }],
    semdata: [{ label: t.estaSemana, data: dia(ateSexta) }, { label: t.proximaSemana, data: dia(ateSexta + 7) }, { label: t.esteMes, data: fimMes }],
    // no dia carregado escolhido, a primeira opção é o dia mais leve da semana
    carregado: [{ label: t.paraDia.replace("{dia}", nomeDia(diaLeve.d)), data: diaLeve.d }, { label: t.amanha, data: dia(1) }, { label: t.maisSemana, data: dia(7) }],
  };
  // foco de hoje (até 3): escolhido pela pessoa; vazio = sugestão (as 3 primeiras da ordem inteligente)
  const focoIds = me ? getFoco(me.id, hoje) : [];
  const botaoFoco = (x: Tarefa) => {
    const no = focoIds.includes(x.id);
    if (!me || (!no && (x.status === "done" || focoIds.length >= MAX_FOCO))) return null;
    return (
      <form action={focoAction} className="contents">
        <input type="hidden" name="id" value={x.id} />
        <BotaoIcone type="submit" selo="sol" aria-label={no ? t.focoTirar : t.focoPor} aria-pressed={no} tamanho={40} variante={no ? "acento" : "fantasma"} />
      </form>
    );
  };
  const comPrazo = (grupo: keyof typeof OPCOES) => (x: Tarefa) => <>
    {botaoFoco(x)}
    {can.editTarefa(user, x) && <PrazoRapido id={x.id} opcoes={OPCOES[grupo]} outraData={t.outraData} rotulo={t.reprogramar} />}
  </>;

  const novidades = novidadesPara(user);
  // smart order (lib/v2/ordem.ts) + the reasons shown as small badges
  const ctx = { hoje, comNovidade: new Set(novidadesPara(user, 3, 50).map((n) => n.tarefaId)) };
  const rotSelo: Record<Selo, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const legiveis = (s: Record<string, Selo[]>) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.map((x) => rotSelo[x])]));
  const oAgora = ordenarAgora(minhas.filter((x) => x.prazo && x.prazo <= hoje), ctx);
  const oProx = ordenarProximas(minhas.filter((x) => x.prazo > hoje), ctx);
  const oSem = ordenarSemData(minhas.filter((x) => !x.prazo), ctx);
  const agora = oAgora.tarefas, proximas = oProx.tarefas, semData = oSem.tarefas;
  const atrasadas = agora.filter((x) => x.prazo < hoje).length;
  const foco = focoIds.map((id) => getTarefas().find((x) => x.id === id)).filter((x): x is Tarefa => !!x);
  const sugestao = foco.length ? [] : [...agora, ...proximas].slice(0, MAX_FOCO);
  // tarefa rápida em "Agora": nasce para hoje, comigo, na minha primeira equipe (a gestão pode criar sem equipe)
  const equipeRapida = user.equipes.find((id) => equipes.some((e) => e.id === id)) ?? "";
  const podeRapida = !!me && can.criarEm(user, equipeRapida);

  const esperando = esperandoPor(user);
  const prontos = me ? prontosPara(me.id) : [];
  const { hoje: eventosHoje, proximos } = agendaDoDia(user);

  // pending items as small pills (each opens its page)
  type Pilula = { href: string; icone: NomeIcone; texto: string; titulo: string };
  const pilulas: Pilula[] = [];
  const passos = primeirosPassos(user);
  const comPassos = passos.some((x) => !x.feito);
  const missao = missaoDaSemana(user);
  const org = user.gestao ? organizacao() : null;
  const mostrarOrg = !!org && (org.semEquipe.length > 0 || org.semCoordenacao.length > 0 || org.semFuncao.length > 0);
  if (me && perfilPendente(me) && !comPassos) pilulas.push({ href: `/pessoas/${me.id}/editar`, icone: "pessoa", texto: t.meuPerfil, titulo: perfilPendente(me) === "verificar" ? t.bannerVerificar : t.bannerConfirmar });
  for (const d of me ? diagnosticosAbertos(me) : []) {
    const pr = progresso(d, me!.id);
    if (pr.respondidas < pr.total && !comPassos) pilulas.push({ href: `/pessoas/${me!.id}/respostas?d=${d.id}`, icone: "tarefa", texto: `${t.diagnostico} ${pr.respondidas}/${pr.total}`, titulo: t.bannerDiag });
    if (codigoPendente(d, me!.id)) pilulas.push({ href: `/diagnosticos/${d.id}/codigo`, icone: "mensagem", texto: t.codigoAcordos, titulo: t.bannerCodigo });
    const c = getColetivo(d.id);
    for (const x of secoesColetivas(d).filter((x) => c.responsaveis[x.id] === me!.id)) {
      const feitas = x.perguntas.filter((q) => c.respostas[q.id]?.status === "respondida").length;
      if (feitas < x.perguntas.length) pilulas.push({ href: `/diagnosticos/${d.id}/coletivo?secao=${x.id}`, icone: "tarefa", texto: `${lang === "en" ? x.titulo_en : x.titulo} ${feitas}/${x.perguntas.length}`, titulo: t.parteColetiva });
    }
  }
  const fatos = getFatos();
  const revisar = fatos.filter((f) => f.status === "proposto" && podeRevisar(user, f)).length;
  const alertas = getAlertas().filter((a) => {
    const f = fatos.find((x) => x.id === a.fato);
    return a.status === "aberta" && (f ? podeRevisar(user, f) : user.gestao);
  }).length + getPropostas().filter((p) => p.status === "aberta" && podeDecidir(user, p)).length;
  if (revisar) pilulas.push({ href: "/conhecimento/revisar", icone: "informacao", texto: `${revisar} ${t.aRevisar}`, titulo: t.conhecimento });
  if (alertas) pilulas.push({ href: "/conhecimento/alertas", icone: "atencao", texto: `${alertas} ${t.alertasLbl}`, titulo: t.conhecimento });
  if (esperando.length) pilulas.push({ href: "/hoje?aba=esperando", icone: "mensagem", texto: `${esperando.length} ${t.esperandoVoce}`, titulo: t.esperandoTitulo });
  if (prontos.length) pilulas.push({ href: `/tarefas/${prontos[0].taskId}`, icone: "sucesso", texto: `${prontos.length} ${t.prontoHermes}`, titulo: t.prontosIA });
  const p = user.gestao ? pulso() : null;

  const linha = (x: Tarefa, grupo: keyof typeof OPCOES, selos?: Record<string, Selo[]>) =>
    <TaskRow key={x.id} t={x} {...props} extra={comPrazo(grupo)} selos={selos && legiveis(selos)[x.id]} />;
  // Agrupada por Atrasadas / Hoje / Amanhã / … com contagem (seção 10.3); a ordem inteligente vale dentro de cada grupo
  const grupos = (ts: Tarefa[], grupo: keyof typeof OPCOES, selos: Record<string, Selo[]> | undefined, defs: { id: string; titulo: string; dentro: (x: Tarefa) => boolean; alerta?: boolean }[]) => {
    const gs = defs.map((d) => ({ ...d, itens: ts.filter(d.dentro) })).filter((g) => g.itens.length);
    return gs.length
      ? <div>{gs.map((g) => <GrupoTarefas key={g.id} titulo={g.titulo} contagem={g.itens.length} alerta={g.alerta}>{g.itens.map((x) => linha(x, grupo, selos))}</GrupoTarefas>)}</div>
      : <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />;
  };
  const doDia = diaSel ? ordenarAgora(minhas.filter((x) => x.prazo === diaSel), ctx) : null;
  const eventosDoDia = diaSel ? getEventos().filter((e) => e.inicio === diaSel || (!!e.fim && e.inicio <= diaSel && diaSel <= e.fim)) : [];
  // eventos da Agenda Google: abrem no Google (ícone "abrir fora"), para não confundir com os da comunidade
  const chipGoogle = (e: EventoGoogle) => <Chip key={`g${e.id}`} href={e.link} icone="abrir-fora">{e.hora && <b className="font-semibold text-t1">{e.hora}</b>} {e.titulo}</Chip>;
  const googleDoDia = diaSel ? googleEvs.filter((e) => e.dia === diaSel) : [];
  // fechamento do dia: nada pendente em Agora e algo concluído hoje → resumo + o que vem amanhã
  const feitasHoje = doMeu.filter((x) => x.status === "done" && x.concluidoEm.slice(0, 10) === hoje);
  const fechouDia = !!me && agora.length === 0 && feitasHoje.length > 0;
  const amanha = semana[1].abertasDia;
  // linhas de atividade (Novidades, Esperando você): tarefa + quem fez o quê, quando
  const atividades = (itens: typeof novidades) => (
    <ul className="overflow-hidden rounded-cartao bg-s1">
      {itens.map((n, i) => (
        <li key={`${n.tarefaId}${n.quando}${i}`} className="border-t border-s2 px-4 py-3 first:border-t-0">
          <Link href={`/tarefas/${n.tarefaId}`} className="anel-foco block rounded-interno text-[15px] font-medium leading-snug text-t1 hover:underline">{n.titulo}</Link>
          <p className="meta mt-0.5 line-clamp-2 text-t2"><span className="font-semibold text-t1">{n.quem}</span> {n.oque} · {fmtDate(n.quando.slice(0, 10), lang)} {n.quando.slice(11)}</p>
        </li>
      ))}
    </ul>
  );
  const nome = (me?.name ?? user.username).split(/[\s(]/)[0];
  const passosFeitos = passos.filter((x) => x.feito).length;
  const comPulso = !!p && (p.atrasadas > 0 || p.semDono > 0);

  return (
    <>
      <header className="mb-5 grid gap-3">
        {/* saudação em dois tons (display fino) */}
        <h1 className="saudacao">
          <span className="text-t1">{t.ola}, {nome}.</span>{" "}
          <span className="text-t3">{new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bahia" })}</span>
        </h1>
        {(eventosHoje.length > 0 || googleEvs.some((e) => e.dia === hoje) || proximos.length > 0 || pilulas.length > 0 || comPulso) && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {eventosHoje.map((e) => <Chip key={e.id} href={`/eventos/${e.id}`} icone="calendario">{e.hora && <b className="font-semibold text-t1">{e.hora}</b>} {e.titulo}</Chip>)}
            {googleEvs.filter((e) => e.dia === hoje).map(chipGoogle)}
            {proximos.map((e) => <Chip key={e.id} href={`/eventos/${e.id}`} icone="prazo">{e.inicio === dia(1) ? t.amanhaLbl : fmtDate(e.inicio, lang)}{e.hora && ` ${e.hora}`} · {e.titulo}</Chip>)}
            {pilulas.map((x) => <span key={x.href + x.texto} title={x.titulo} className="contents"><Chip href={x.href} icone={x.icone}>{x.texto}</Chip></span>)}
            {comPulso && <Chip href="/pulso" icone="atencao">{p!.atrasadas} {t.atrasadasLbl} · {p!.semDono} {t.semDonoLbl}</Chip>}
          </div>
        )}
      </header>

      {missao && (
        // o único destaque de conteúdo da tela (regra 5)
        <Cartao variante="destaque" className="mb-4">
          <details className="group">
            <summary className="anel-foco grid cursor-pointer list-none gap-2 rounded-interno">
              <span className="flex items-center gap-2">
                <span className="titulo-secao min-w-0 flex-1">{t.missaoSemana}</span>
                <span className="meta tabular-nums opacity-80">{missao.diasRestantes ? t.diasRestantes.replace("{n}", String(missao.diasRestantes)) : t.ultimoDia}</span>
                <Icone nome="abrir" tamanho={18} className="transition-transform duration-150 group-open:rotate-180" />
              </span>
              <span className="meta line-clamp-1 opacity-80">{lang === "en" ? missao.missao.titulo_en : missao.missao.titulo}</span>
              <span className="flex items-center gap-3">
                <span className="numero-display">{missao.total}<span className="opacity-55">%</span></span>
                <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={missao.total} aria-label={t.missaoSemana} className="h-1.5 flex-1 overflow-hidden rounded-pilula bg-current/20">
                  <span className="block h-full rounded-pilula bg-current" style={{ width: `${missao.total}%` }} />
                </span>
              </span>
            </summary>
            <ul className="mt-3 grid gap-x-6 gap-y-1 border-t border-current/20 pt-3 sm:grid-cols-2">
              {missao.metas.map((m) => (
                <li key={m.id}>
                  <Link href={{ perfis: `/pessoas?equipe=${missao.missao.equipe}`, fatos: "/conhecimento", fontes: "/conhecimento", tarefas: "/pulso", atrasadas: "/pulso?ver=atrasadas", carga: `/equipes/${missao.missao.equipe}`, objetivos: "/objetivos", diagnostico: me ? `/pessoas/${me.id}/respostas` : "/hoje" }[m.id]}
                    className="anel-foco group/m block min-h-11 rounded-interno py-1.5">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 group-hover/m:underline">{t.metas[m.id]}</span>
                      <span className="meta inline-flex shrink-0 items-center gap-1 tabular-nums">{m.pct >= 100 ? <Icone nome="confirmar" tamanho={16} aria-label="100%" /> : m.texto}</span>
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-pilula bg-current/20"><span className="block h-full bg-current" style={{ width: `${Math.min(100, m.pct)}%` }} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </Cartao>
      )}

      {comPassos && (
        <Cartao className="mb-4">
          <SecaoRecolhivel id="hoje-passos" emCartao titulo={t.primeirosPassos} contagem={`${passosFeitos} / ${passos.length}`}
            resumo={<BarraProgresso valor={passosFeitos} max={passos.length} planejado rotuloAcessivel={t.primeirosPassos} />}>
            <ul className="grid gap-x-4 sm:grid-cols-2">
              {passos.map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className={`anel-foco flex min-h-11 items-center gap-3 rounded-interno text-[15px] ${x.feito ? "text-t3" : "text-t1 hover:underline"}`}>
                    <span className={`grid size-[26px] shrink-0 place-items-center rounded-pilula ${x.feito ? "bg-ac text-ac-ink" : "hachurado shadow-[inset_0_0_0_2px_var(--s4)]"}`}>{x.feito && <Icone nome="confirmar" tamanho={15} />}</span>
                    <span className={`min-w-0 flex-1 ${x.feito ? "line-through" : ""}`}>{t.passos[x.id]}</span>
                    {!x.feito && <Icone nome="avancar" tamanho={16} className="shrink-0 text-t3" />}
                  </Link>
                </li>
              ))}
            </ul>
          </SecaoRecolhivel>
        </Cartao>
      )}

      {mostrarOrg && org && (
        <Cartao className="mb-4">
          <SecaoRecolhivel id="hoje-organizar" emCartao contagem={`${org.pct}%`}
            titulo={<span className="flex items-center gap-2.5"><span className="grid size-10 shrink-0 place-items-center rounded-pilula bg-s2 text-t1"><Icone nome="pessoas" tamanho={20} /></span>{t.organizarEquipes}</span>}
            resumo={<BarraProgresso valor={org.pct} planejado rotuloAcessivel={t.organizarEquipes} />}>
            <p className="corpo text-t2">{t.organizarHojeIntro}</p>
            <div className="flex flex-wrap gap-1.5">
              {org.semEquipe.length > 0 && <Chip tipo="metadado" icone="pessoa">{org.semEquipe.length} {t.semEquipeCurto}</Chip>}
              {org.semCoordenacao.length > 0 && <Chip tipo="metadado" icone="atencao">{org.semCoordenacao.length} {t.equipesSemCoord}</Chip>}
              {org.semFuncao.length > 0 && <Chip tipo="metadado" icone="editar">{org.semFuncao.length} {t.semFuncaoCurto}</Chip>}
            </div>
            {org.semEquipe.length > 0 && (
              <ul className="grid gap-3">
                {org.semEquipe.slice(0, 3).map((pe) => (
                  <li key={pe.id} className="grid gap-1.5">
                    <Link href={`/pessoas/${pe.id}`} className="anel-foco alvo-toque min-w-0 rounded-interno text-[15px] font-medium text-t1 hover:underline"><span className="block truncate">{pe.name}</span></Link>
                    <EscolherEquipes pessoaId={pe.id} equipes={equipes} t={t} />
                  </li>
                ))}
              </ul>
            )}
            <div><Botao href="/pessoas/organizar" variante="fantasma" tamanho="M" icone="pessoas" iconeDireita="avancar">{t.organizarTodos}</Botao></div>
          </SecaoRecolhivel>
        </Cartao>
      )}

      {me && (
        // faixa da semana em anéis (seção 10.5): anel = minhas tarefas do dia feitas/total, número no centro; ponto azul = evento
        <nav aria-label={t.semanaLbl} className="-mx-4 mb-5 mt-6 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-7 md:gap-2 md:px-0">
          {semana.map((x, i) => {
            const data = new Date(`${x.d}T12:00:00Z`);
            const sel = x.d === diaSel, cheio = carregado(x);
            return (
              <Link key={x.d} href={sel ? "/hoje" : `/hoje?dia=${x.d}`} scroll={false} aria-current={sel ? "date" : undefined}
                className={`anel-foco flex min-w-16 flex-1 flex-col items-center gap-1.5 rounded-pilula py-3 transition-colors duration-150 ${sel ? "bg-s3 text-t1 shadow-[inset_0_0_0_2px_var(--ac)]" : cheio ? "bg-warn-bg text-t1" : i === 0 ? "bg-s2 text-t1" : "bg-s1 text-t2 hover:bg-s2 hover:text-t1"}`}>
                <span className={`meta uppercase ${cheio ? "font-semibold text-warn" : sel || i === 0 ? "text-t1" : ""}`}>{data.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3)}</span>
                <span className={x.tarefasDia ? "" : "opacity-40"}><AnelProgresso tamanho={48} valor={x.feitasDia} max={x.tarefasDia} centro={<span className="text-xl">{data.getUTCDate()}</span>}
                  rotulo={`${x.feitasDia} / ${x.tarefasDia} ${t.tarefas}${x.eventosDia > 0 ? `, ${x.eventosDia} ${t.agenda}` : ""}${x.googleDia > 0 ? `, ${x.googleDia} ${t.googleAgenda}` : ""}${cheio ? ` · ${t.diaCarregado}` : ""}`} /></span>
                <span className="flex h-1.5 gap-1" aria-hidden="true">
                  {x.eventosDia > 0 && <span className="size-1.5 rounded-pilula bg-info" />}
                  {x.googleDia > 0 && <span className="size-1.5 rounded-pilula bg-t2" />}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {me && doDia && (
        <section className="mb-6 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="titulo-secao first-letter:uppercase">{new Date(`${diaSel}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</h2>
            <Botao href="/hoje" variante="fantasma" tamanho="P" icone="fechar">{t.verTudo}</Botao>
          </div>
          {(eventosDoDia.length > 0 || googleDoDia.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {eventosDoDia.map((e) => <Chip key={e.id} href={`/eventos/${e.id}`} icone="calendario">{e.hora && <b className="font-semibold text-t1">{e.hora}</b>} {e.titulo}</Chip>)}
              {googleDoDia.map(chipGoogle)}
            </div>
          )}
          {selCarregado && (
            <Aviso estado="atencao" titulo={t.diaCarregado}
              mensagem={t.diaCarregadoMsg.replace("{n}", String(selCarregado.abertasDia)).replace("{dia}", nomeDia(diaLeve.d)).replace("{m}", String(diaLeve.abertasDia))} />
          )}
          {doDia.tarefas.length
            ? <GrupoTarefas titulo={t.minhasTarefas} contagem={doDia.tarefas.length}>{doDia.tarefas.map((x) => linha(x, selCarregado ? "carregado" : "datadas", doDia.selos))}</GrupoTarefas>
            : <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />}
        </section>
      )}

      {fechouDia && !doDia && (
        // fechamento do dia (seção 10.5.1): o anel de hoje fechou; mostra o que foi feito e o que vem amanhã
        <Aviso estado="sucesso" className="mb-6" titulo={t.diaFechado}
          mensagem={<>
            {t.diaFechadoMsg.replace("{n}", String(feitasHoje.length))}{" "}
            {amanha ? <Link href={`/hoje?dia=${dia(1)}`} scroll={false} className="anel-foco rounded-interno font-semibold text-t1 hover:underline">{t.amanhaN.replace("{n}", String(amanha))}</Link> : t.amanhaLivre}
            <span className="mt-1.5 block text-t2">{feitasHoje.slice(0, 5).map((x) => x.title).join(" · ")}{feitasHoje.length > 5 ? " …" : ""}</span>
          </>} />
      )}

      {me && !doDia && (foco.length > 0 || sugestao.length > 0) && (
        // foco de hoje (seção 10.5.1): até 3 tarefas; vazio = sugestão da ordem inteligente com "Usar estas"
        <section aria-label={t.focoHoje} className="mb-6">
          <GrupoTarefas titulo={<>{t.focoHoje}{!foco.length && <span className="meta ml-2 font-normal text-t3">{t.focoSugestao}</span>}</>} contagem={foco.length ? foco.length : undefined}>
            {(foco.length ? foco : sugestao).map((x) => linha(x, "datadas"))}
          </GrupoTarefas>
          {!foco.length && (
            <form action={focoAction} className="mt-2">
              {sugestao.map((x) => <input key={x.id} type="hidden" name="ids" value={x.id} />)}
              <BotaoEnviar enviando="…" icone="inicio" variante="fantasma" tamanho="P">{t.focoUsar}</BotaoEnviar>
            </form>
          )}
        </section>
      )}

      {me && !doDia && (
        <AbasComPainel id="hoje" inicial={q.aba === "novidades" || (q.aba === "esperando" && esperando.length) ? q.aba : undefined} abas={[
          { id: "agora", rotulo: t.agora, contagem: agora.length, alerta: atrasadas > 0, conteudo: <>
            {podeRapida && (
              <form action={createTarefaAction} className="mb-4">
                <input type="hidden" name="equipe" value={equipeRapida} />
                <input type="hidden" name="prazo" value={hoje} />
                <input type="hidden" name="responsaveis" value={me!.id} />
                <input type="hidden" name="back" value="/hoje" />
                <Campo tipo="busca" iconeEsquerda="mais" name="title" rotulo={t.tarefaRapidaPh} required maxLength={200} autoComplete="off"
                  acaoDireita={<BotaoIcone type="submit" icone="enviar" aria-label={t.tarefaRapidaAdd} tamanho={44} variante="acento" />} />
              </form>
            )}
            {grupos(agora, "datadas", oAgora.selos, [
              { id: "atrasadas", titulo: t.atrasadas, dentro: (x) => x.prazo < hoje, alerta: true },
              { id: "hoje", titulo: t.grpHoje, dentro: (x) => x.prazo === hoje },
            ])}
          </> },
          { id: "proximas", rotulo: t.proximas, contagem: proximas.length, conteudo: grupos(proximas, "datadas", oProx.selos, [
            { id: "amanha", titulo: t.grpAmanha, dentro: (x) => x.prazo === dia(1) },
            { id: "semana", titulo: t.grpSemana, dentro: (x) => x.prazo > dia(1) && x.prazo <= dia(7) },
            { id: "depois", titulo: t.grpDepois, dentro: (x) => x.prazo > dia(7) },
          ]) },
          { id: "semdata", rotulo: t.semData, contagem: semData.length, conteudo: grupos(semData, "semdata", oSem.selos, [{ id: "semdata", titulo: t.semData, dentro: () => true }]) },
          // esperando você: só aparece quando há algo (comentários que pedem resposta minha)
          ...(esperando.length ? [{ id: "esperando", rotulo: t.esperandoTitulo, contagem: esperando.length, alerta: true, conteudo: atividades(esperando) }] : []),
          { id: "novidades", rotulo: t.novidades, contagem: novidades.length, conteudo: novidades.length ? atividades(novidades) : <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} /> },
        ]} />
      )}

      {funcaoLigada("assistente", user) && !user.vendoComo && <section className="mt-8 pb-16 md:pb-0"><CampoAssistente placeholder={t.perguntePeca} sugestoes={t.sugestoesHoje} /></section>}

      {/* "+" flutuante: ações de criação (acima da barra do celular) */}
      <div className="print:hidden fixed bottom-[calc(7.25rem+env(safe-area-inset-bottom))] right-4 z-30 md:bottom-8 md:right-8">
        <MenuAcoes gatilho="criar" rotulo={t.criarLbl} itens={[
          { icone: "tarefa", rotulo: t.novaTarefa, href: "/tarefas/nova" },
          { icone: "calendario", rotulo: t.novoEvento, href: "/eventos/novo" },
          { icone: "enviar", rotulo: t.novaFonteConhecimento, href: "/conhecimento#enviar" },
          ...(user.gestao || user.coordena.length ? [{ icone: "mais" as const, rotulo: t.adicionarAcervo, href: "/acervo#novo" }] : []),
        ]} />
      </div>
    </>
  );
}
