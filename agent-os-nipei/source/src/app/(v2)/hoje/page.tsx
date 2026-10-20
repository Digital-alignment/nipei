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
import { can, currentUser, getEquipes, getPessoas, getTarefas, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";

const PILULA = "inline-flex items-center gap-1 shrink-0 rounded-full border px-2.5 py-1 text-xs";
const TOM = {
  azul: "border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200",
  ambar: "border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
  neutro: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
} as const;

// Hoje, compact: what matters today in three lines (Bom dia, agenda, pending pills), one place to ask,
// and one task list at a time (tabs).
export default async function Hoje() {
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

  const agora = minhas.filter((x) => x.prazo && x.prazo <= hoje);
  const atrasadas = agora.filter((x) => x.prazo < hoje).length;
  const proximas = minhas.filter((x) => x.prazo > hoje);
  const semData = minhas.filter((x) => !x.prazo);
  const novidades = novidadesPara(user);
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

  const linhaTarefas = (ts: Tarefa[], grupo: keyof typeof OPCOES) => ts.length ? <TaskList tarefas={ts} {...props} extra={comPrazo(grupo)} /> : <Empty>{t.nadaPendente}</Empty>;

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

      <Assistente lang={lang} labels={{ placeholder: t.perguntePeca, ouvindo: t.ouvindoAssist, confirmar: t.confirmar, cancelar: t.cancelar, feito: t.feitoLbl, limpar: t.limpar, pensando: t.pensando }} />

      {me && (
        <Abas id="hoje" abas={[
          { id: "agora", label: t.agora, count: agora.length, alerta: atrasadas > 0, conteudo: linhaTarefas(agora, "datadas") },
          { id: "proximas", label: t.proximas, count: proximas.length, conteudo: linhaTarefas(proximas, "datadas") },
          { id: "semdata", label: t.semData, count: semData.length, conteudo: linhaTarefas(semData, "semdata") },
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
