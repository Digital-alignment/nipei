import Link from "next/link";
import { TaskRow, Empty, byPrazo } from "@/components/v2/ui";
import Abas from "@/components/v2/Abas";
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
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";
import { missaoDaSemana, primeirosPassos } from "@/lib/v2/missaoDados";
import { organizacao } from "@/lib/v2/organizacao";
import Chip from "@/components/ds/Chip";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import Cartao from "@/components/ds/Cartao";
import Botao from "@/components/ds/Botao";
import MenuAcoes from "@/components/ds/MenuAcoes";
import { BarraProgresso } from "@/components/ds/Progresso";
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
  const OPCOES = {
    datadas: [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: dia(1) }, { label: t.maisSemana, data: dia(7) }],
    semdata: [{ label: t.estaSemana, data: dia(ateSexta) }, { label: t.proximaSemana, data: dia(ateSexta + 7) }, { label: t.esteMes, data: fimMes }],
  };
  const comPrazo = (grupo: keyof typeof OPCOES) => (x: Tarefa) =>
    can.editTarefa(user, x) ? <PrazoRapido id={x.id} opcoes={OPCOES[grupo]} outraData={t.outraData} rotulo={t.reprogramar} /> : null;

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

  // mini week: today + 6 days, a dot per task due / event; a tap filters the list to that day
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = dia(i);
    const tarefasDia = minhas.filter((x) => x.prazo === d).length;
    const eventosDia = getEventos().filter((e) => e.inicio.length === 10 && (e.inicio === d || (!!e.fim && e.inicio <= d && d <= e.fim)) && (user.gestao || !e.equipe || user.equipes.includes(e.equipe))).length;
    return { d, tarefasDia, eventosDia };
  });
  const diaSel = q.dia && semana.some((x) => x.d === q.dia) ? q.dia : "";
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
  if (revisar) pilulas.push({ href: "/conhecimento#revisar", icone: "informacao", texto: `${revisar} ${t.aRevisar}`, titulo: t.conhecimento });
  if (alertas) pilulas.push({ href: "/conhecimento/alertas", icone: "atencao", texto: `${alertas} ${t.alertasLbl}`, titulo: t.conhecimento });
  if (prontos.length) pilulas.push({ href: `/tarefas/${prontos[0].taskId}`, icone: "sucesso", texto: `${prontos.length} ${t.prontoHermes}`, titulo: t.prontosIA });
  const p = user.gestao ? pulso() : null;

  const linha = (x: Tarefa, grupo: keyof typeof OPCOES, selos?: Record<string, Selo[]>) =>
    <TaskRow key={x.id} t={x} {...props} extra={comPrazo(grupo)} selos={selos && legiveis(selos)[x.id]} />;
  // Agrupada por Atrasadas / Hoje / Amanhã / … com contagem (seção 10.3); a ordem inteligente vale dentro de cada grupo
  const grupos = (ts: Tarefa[], grupo: keyof typeof OPCOES, selos: Record<string, Selo[]> | undefined, defs: { id: string; titulo: string; dentro: (x: Tarefa) => boolean; alerta?: boolean }[]) => {
    const gs = defs.map((d) => ({ ...d, itens: ts.filter(d.dentro) })).filter((g) => g.itens.length);
    return gs.length
      ? <div>{gs.map((g) => <GrupoTarefas key={g.id} titulo={g.titulo} contagem={g.itens.length} alerta={g.alerta}>{g.itens.map((x) => linha(x, grupo, selos))}</GrupoTarefas>)}</div>
      : <Empty>{t.nadaPendente}</Empty>;
  };
  const doDia = diaSel ? ordenarAgora(minhas.filter((x) => x.prazo === diaSel), ctx) : null;
  const eventosDoDia = diaSel ? getEventos().filter((e) => e.inicio === diaSel || (!!e.fim && e.inicio <= diaSel && diaSel <= e.fim)) : [];
  const locale = lang === "en" ? "en-US" : "pt-BR";
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
        {(eventosHoje.length > 0 || proximos.length > 0 || pilulas.length > 0 || comPulso) && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {eventosHoje.map((e) => <Chip key={e.id} href={`/eventos/${e.id}`} icone="calendario">{e.hora && <b className="font-semibold text-t1">{e.hora}</b>} {e.titulo}</Chip>)}
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
                    className="anel-foco group/m block rounded-interno py-1.5">
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
          <section aria-label={t.primeirosPassos} className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="titulo-secao">{t.primeirosPassos}</h2>
              <p className="meta tabular-nums text-t2">{passosFeitos} / {passos.length}</p>
            </div>
            <BarraProgresso valor={passosFeitos} max={passos.length} planejado rotuloAcessivel={t.primeirosPassos} />
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
          </section>
        </Cartao>
      )}

      {mostrarOrg && org && (
        <Cartao className="mb-4">
          <section aria-label={t.organizarEquipes} className="grid gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-pilula bg-s2 text-t1"><Icone nome="pessoas" tamanho={20} /></span>
              <h2 className="titulo-secao flex-1">{t.organizarEquipes}</h2>
              <span className="meta font-semibold tabular-nums">{org.pct}%</span>
            </div>
            <p className="corpo text-t2">{t.organizarHojeIntro}</p>
            <BarraProgresso valor={org.pct} planejado rotuloAcessivel={t.organizarEquipes} />
            <div className="flex flex-wrap gap-1.5">
              {org.semEquipe.length > 0 && <Chip tipo="metadado" icone="pessoa">{org.semEquipe.length} {t.semEquipeCurto}</Chip>}
              {org.semCoordenacao.length > 0 && <Chip tipo="metadado" icone="atencao">{org.semCoordenacao.length} {t.equipesSemCoord}</Chip>}
              {org.semFuncao.length > 0 && <Chip tipo="metadado" icone="editar">{org.semFuncao.length} {t.semFuncaoCurto}</Chip>}
            </div>
            {org.semEquipe.length > 0 && (
              <ul className="grid gap-3">
                {org.semEquipe.slice(0, 3).map((pe) => (
                  <li key={pe.id} className="grid gap-1.5">
                    <Link href={`/pessoas/${pe.id}`} className="anel-foco truncate rounded-interno text-[15px] font-medium text-t1 hover:underline">{pe.name}</Link>
                    <EscolherEquipes pessoaId={pe.id} equipes={equipes} t={t} />
                  </li>
                ))}
              </ul>
            )}
            <div><Botao href="/pessoas/organizar" variante="fantasma" tamanho="M" icone="pessoas" iconeDireita="avancar">{t.organizarTodos}</Botao></div>
          </section>
        </Cartao>
      )}

      {me && (
        // faixa da semana (seção 10.5): pílulas verticais; dia escolhido em acento; pontos = tarefas, ponto azul = evento
        <nav aria-label={t.semanaLbl} className="mb-5 mt-6 grid grid-cols-7 gap-1.5 md:gap-2">
          {semana.map((x, i) => {
            const data = new Date(`${x.d}T12:00:00Z`);
            const sel = x.d === diaSel;
            return (
              <Link key={x.d} href={sel ? "/hoje" : `/hoje?dia=${x.d}`} scroll={false} aria-current={sel ? "date" : undefined}
                className={`anel-foco flex flex-col items-center gap-1 rounded-pilula py-3 transition-colors duration-150 ${sel ? "bg-ac text-ac-ink" : i === 0 ? "bg-s2 text-t1 shadow-[inset_0_0_0_1px_var(--s3)]" : "bg-s1 text-t2 hover:bg-s2 hover:text-t1"}`}>
                <span className="meta uppercase">{data.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3)}</span>
                <span className="font-display text-2xl font-light leading-none tabular-nums md:text-3xl">{data.getUTCDate()}</span>
                <span className="flex h-1.5 justify-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: Math.min(x.tarefasDia, 3) }, (_, k) => <span key={k} className={`size-1.5 rounded-pilula ${sel ? "bg-current" : "bg-t3"}`} />)}
                  {x.eventosDia > 0 && <span className={`size-1.5 rounded-pilula ${sel ? "bg-current" : "bg-info"}`} />}
                </span>
                {(x.tarefasDia > 0 || x.eventosDia > 0) && <span className="sr-only">{x.tarefasDia} {t.tarefas}{x.eventosDia > 0 ? `, ${x.eventosDia} ${t.agenda}` : ""}</span>}
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
          {eventosDoDia.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {eventosDoDia.map((e) => <Chip key={e.id} href={`/eventos/${e.id}`} icone="calendario">{e.hora && <b className="font-semibold text-t1">{e.hora}</b>} {e.titulo}</Chip>)}
            </div>
          )}
          {doDia.tarefas.length
            ? <GrupoTarefas titulo={t.minhasTarefas} contagem={doDia.tarefas.length}>{doDia.tarefas.map((x) => linha(x, "datadas", doDia.selos))}</GrupoTarefas>
            : <Empty>{t.nadaPendente}</Empty>}
        </section>
      )}

      {me && !doDia && (
        <Abas id="hoje" inicial={q.aba === "novidades" ? "novidades" : undefined} abas={[
          { id: "agora", label: t.agora, count: agora.length, alerta: atrasadas > 0, conteudo: grupos(agora, "datadas", oAgora.selos, [
            { id: "atrasadas", titulo: t.atrasadas, dentro: (x) => x.prazo < hoje, alerta: true },
            { id: "hoje", titulo: t.grpHoje, dentro: (x) => x.prazo === hoje },
          ]) },
          { id: "proximas", label: t.proximas, count: proximas.length, conteudo: grupos(proximas, "datadas", oProx.selos, [
            { id: "amanha", titulo: t.grpAmanha, dentro: (x) => x.prazo === dia(1) },
            { id: "semana", titulo: t.grpSemana, dentro: (x) => x.prazo > dia(1) && x.prazo <= dia(7) },
            { id: "depois", titulo: t.grpDepois, dentro: (x) => x.prazo > dia(7) },
          ]) },
          { id: "semdata", label: t.semData, count: semData.length, conteudo: grupos(semData, "semdata", oSem.selos, [{ id: "semdata", titulo: t.semData, dentro: () => true }]) },
          {
            id: "novidades", label: t.novidades, count: novidades.length, conteudo: novidades.length ? (
              <ul className="overflow-hidden rounded-cartao bg-s1">
                {novidades.map((n, i) => (
                  <li key={`${n.tarefaId}${n.quando}${i}`} className="border-t border-s2 px-4 py-3 first:border-t-0">
                    <Link href={`/tarefas/${n.tarefaId}`} className="anel-foco block rounded-interno text-[15px] font-medium leading-snug text-t1 hover:underline">{n.titulo}</Link>
                    <p className="meta mt-0.5 line-clamp-2 text-t2"><span className="font-semibold text-t1">{n.quem}</span> {n.oque} · {fmtDate(n.quando.slice(0, 10), lang)} {n.quando.slice(11)}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>{t.nadaPendente}</Empty>,
          },
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
