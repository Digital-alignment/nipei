import Link from "next/link";
import { Plus } from "lucide-react";
import { Empty, TaskList, byPrazo } from "@/components/v2/ui";
import Abas from "@/components/v2/Abas";
import BomDia from "@/components/v2/BomDia";
import PrazoRapido from "@/components/v2/PrazoRapido";
import Assistente from "@/components/v2/Assistente";
import { prontosPara } from "@/lib/v2/trabalhos";
import { perfilPendente } from "@/lib/v2/perfil";
import { getFatos, podeRevisar } from "@/lib/v2/conhecimento";
import { getAlertas } from "@/lib/v2/auditor";
import { getPropostas, podeDecidir } from "@/lib/v2/propostas";
import { codigoPendente, diagnosticosAbertos, getColetivo, progresso, secoesColetivas } from "@/lib/v2/diagnostico";
import { agendaDoDia, bomDiaGuardado, pulso } from "@/lib/v2/hoje";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { ordenarAgora, ordenarProximas, ordenarSemData, type Selo } from "@/lib/v2/ordem";


const PILULA = "inline-flex items-center gap-1 shrink-0 rounded-full border px-2.5 py-1 text-xs";
const TOM = {
  azul: "border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200",
  ambar: "border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
  neutro: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
} as const;

// Hoje, compact: what matters today in three lines (Bom dia, agenda, pending pills), one place to ask,
// and one task list at a time (tabs).
export default async function Hoje({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
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
  type Pilula = { href: string; icone: string; texto: string; tom: keyof typeof TOM; titulo: string };
  const pilulas: Pilula[] = [];
  if (me && perfilPendente(me)) pilulas.push({ href: `/pessoas/${me.id}/editar`, icone: "👤", texto: t.meuPerfil, tom: "ambar", titulo: perfilPendente(me) === "verificar" ? t.bannerVerificar : t.bannerConfirmar });
  for (const d of me ? diagnosticosAbertos(me) : []) {
    const pr = progresso(d, me!.id);
    if (pr.respondidas < pr.total) pilulas.push({ href: `/pessoas/${me!.id}/respostas?d=${d.id}`, icone: "📝", texto: `${pr.respondidas}/${pr.total}`, tom: "azul", titulo: t.bannerDiag });
    if (codigoPendente(d, me!.id)) pilulas.push({ href: `/diagnosticos/${d.id}/codigo`, icone: "🤝", texto: t.codigoAcordos, tom: "azul", titulo: t.bannerCodigo });
    const c = getColetivo(d.id);
    for (const x of secoesColetivas(d).filter((x) => c.responsaveis[x.id] === me!.id)) {
      const feitas = x.perguntas.filter((q) => c.respostas[q.id]?.status === "respondida").length;
      if (feitas < x.perguntas.length) pilulas.push({ href: `/diagnosticos/${d.id}/coletivo?secao=${x.id}`, icone: "📋", texto: `${lang === "en" ? x.titulo_en : x.titulo} ${feitas}/${x.perguntas.length}`, tom: "azul", titulo: t.parteColetiva });
    }
  }
  const fatos = getFatos();
  const revisar = fatos.filter((f) => f.status === "proposto" && podeRevisar(user, f)).length;
  const alertas = getAlertas().filter((a) => {
    const f = fatos.find((x) => x.id === a.fato);
    return a.status === "aberta" && (f ? podeRevisar(user, f) : user.gestao);
  }).length + getPropostas().filter((p) => p.status === "aberta" && podeDecidir(user, p)).length;
  if (revisar || alertas) pilulas.push({ href: alertas ? "/conhecimento/alertas" : "/conhecimento", icone: "🧠", texto: [revisar, alertas && `⚠ ${alertas}`].filter(Boolean).join(" · "), tom: "neutro", titulo: t.conhecimento });
  if (prontos.length) pilulas.push({ href: `/tarefas/${prontos[0].taskId}`, icone: "🤖", texto: `${prontos.length} ${t.prontoHermes}`, tom: "neutro", titulo: t.prontosIA });
  const p = user.gestao ? pulso() : null;

  const linhaTarefas = (ts: Tarefa[], grupo: keyof typeof OPCOES, selos?: Record<string, Selo[]>) =>
    ts.length ? <TaskList tarefas={ts} {...props} extra={comPrazo(grupo)} selos={selos && legiveis(selos)} /> : <Empty>{t.nadaPendente}</Empty>;
  const doDia = diaSel ? ordenarAgora(minhas.filter((x) => x.prazo === diaSel), ctx) : null;

  return (
    <>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold tracking-tight">{t.ola}, {(me?.name ?? user.username).split(/[\s(]/)[0]}</h1>
        <p className="text-xs text-neutral-500 first-letter:uppercase">{new Date().toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Bahia" })}</p>
      </div>

      {me && <BomDia inicial={bomDiaGuardado(user)} />}

      {(eventosHoje.length > 0 || proximos.length > 0) && (
        <div className="flex gap-1.5 overflow-x-auto mb-2 -mx-1 px-1" aria-label={t.agenda}>
          {eventosHoje.map((e) => (
            <Link key={e.id} href={`/eventos/${e.id}`} className={`${PILULA} ${TOM.azul}`}>🕒 {e.hora && <b className="font-medium">{e.hora}</b>} {e.titulo}</Link>
          ))}
          {proximos.map((e) => (
            <Link key={e.id} href={`/eventos/${e.id}`} className={`${PILULA} ${TOM.neutro} text-neutral-600 dark:text-neutral-300`}>
              {e.inicio === dia(1) ? t.amanhaLbl : fmtDate(e.inicio, lang)}{e.hora && ` ${e.hora}`} · {e.titulo}
            </Link>
          ))}
        </div>
      )}

      {(pilulas.length > 0 || p) && (
        <div className="flex gap-1.5 overflow-x-auto mb-4 -mx-1 px-1">
          {pilulas.map((x) => <Link key={x.href + x.texto} href={x.href} title={x.titulo} className={`${PILULA} ${TOM[x.tom]}`}><span aria-hidden>{x.icone}</span>{x.texto}</Link>)}
          {p && (p.atrasadas > 0 || p.semDono > 0) && (
            <Link href="/pulso" title={t.pulso} className={`${PILULA} ${TOM.ambar}`}>📊 {p.atrasadas} {t.atrasadasLbl} · {p.semDono} {t.semDonoLbl}</Link>
          )}
        </div>
      )}

      <Assistente lang={lang} labels={{ placeholder: t.perguntePeca, ouvindo: t.ouvindoAssist, confirmar: t.confirmar, cancelar: t.cancelar, feito: t.feitoLbl, limpar: t.limpar, pensando: t.pensando, sugestoes: t.sugestoes, verConversa: t.verConversa }} />

      {me && (
        <nav aria-label={t.semanaLbl} className="grid grid-cols-7 gap-1 mb-2 text-center">
          {semana.map((x, i) => {
            const data = new Date(`${x.d}T12:00:00Z`);
            const sel = x.d === diaSel;
            const pontos = Math.min(x.tarefasDia, 3);
            return (
              <Link key={x.d} href={sel ? "/hoje" : `/hoje?dia=${x.d}`} scroll={false} aria-current={sel ? "date" : undefined}
                className={`rounded-lg py-1.5 ${sel ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : i === 0 ? "bg-neutral-100 dark:bg-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-900"}`}>
                <span className={`block text-[10px] uppercase ${sel ? "" : "text-neutral-500"}`}>{data.toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3)}</span>
                <span className="block text-sm font-medium tabular-nums">{data.getUTCDate()}</span>
                <span className="flex justify-center gap-0.5 h-1.5 mt-0.5">
                  {Array.from({ length: pontos }, (_, k) => <span key={k} className={`w-1 h-1 rounded-full ${sel ? "bg-current" : "bg-neutral-500"}`} />)}
                  {x.eventosDia > 0 && <span className={`w-1 h-1 rounded-full ${sel ? "bg-current" : "bg-sky-500"}`} />}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {me && doDia && (
        <div className="mb-6">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 py-2">
            <p className="text-sm font-medium first-letter:uppercase">{new Date(`${diaSel}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
            <Link href="/hoje" scroll={false} className="text-xs text-neutral-500 underline">{t.verTudo}</Link>
          </div>
          {getEventos().filter((e) => e.inicio === diaSel || (!!e.fim && e.inicio <= diaSel && diaSel <= e.fim)).map((e) => (
            <Link key={e.id} href={`/eventos/${e.id}`} className="flex gap-2 py-2 text-sm border-b border-neutral-100 dark:border-neutral-800"><span className="text-sky-600 dark:text-sky-400">🕒 {e.hora || "—"}</span>{e.titulo}</Link>
          ))}
          {linhaTarefas(doDia.tarefas, "datadas", doDia.selos)}
        </div>
      )}

      {me && !doDia && (
        <Abas id="hoje" abas={[
          { id: "agora", label: t.agora, count: agora.length, alerta: atrasadas > 0, conteudo: linhaTarefas(agora, "datadas", oAgora.selos) },
          { id: "proximas", label: t.proximas, count: proximas.length, conteudo: linhaTarefas(proximas, "datadas", oProx.selos) },
          { id: "semdata", label: t.semData, count: semData.length, conteudo: linhaTarefas(semData, "semdata", oSem.selos) },
          {
            id: "novidades", label: t.novidades, count: novidades.length, conteudo: novidades.length ? (
              <ul>
                {novidades.map((n, i) => (
                  <li key={`${n.tarefaId}${n.quando}${i}`} className="py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <Link href={`/tarefas/${n.tarefaId}`} className="block text-sm leading-snug hover:underline">{n.titulo}</Link>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2"><span className="font-medium text-neutral-700 dark:text-neutral-300">{n.quem}</span> {n.oque} · {fmtDate(n.quando.slice(0, 10), lang)} {n.quando.slice(11)}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>{t.nadaPendente}</Empty>,
          },
        ]} />
      )}

      <Link href="/tarefas/nova" aria-label={t.novaTarefa}
        className="fixed right-5 bottom-20 md:bottom-8 z-30 w-14 h-14 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg flex items-center justify-center">
        <Plus size={26} />
      </Link>
    </>
  );
}
