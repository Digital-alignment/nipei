import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Empty, Section, TaskList, Title, byPrazo } from "@/components/v2/ui";
import VoiceTask from "@/components/v2/VoiceTask";
import Grupo from "@/components/v2/Grupo";
import PrazoRapido from "@/components/v2/PrazoRapido";

const TOM = {
  ambar: "border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30",
  azul: "border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30",
  neutro: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
} as const;
import { prontosPara } from "@/lib/v2/trabalhos";
import { perfilPendente } from "@/lib/v2/perfil";
import { getFatos, podeRevisar } from "@/lib/v2/conhecimento";
import { getAlertas } from "@/lib/v2/auditor";
import { getPropostas, podeDecidir } from "@/lib/v2/propostas";
import { codigoPendente, diagnosticosAbertos, getColetivo, progresso, secoesColetivas } from "@/lib/v2/diagnostico";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";

export default async function Hoje() {
  const { t, lang } = await getT();
  const user = await currentUser();
  const me = user?.pessoa;
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas();
  const minhas = getTarefas().filter((x) => x.status !== "done" && me && x.responsaveis.includes(me.id)).sort(byPrazo);
  const grupos = [
    ["atrasadas", t.atrasadas, minhas.filter((x) => x.prazo && x.prazo < hoje)],
    ["hoje", t.paraHoje, minhas.filter((x) => x.prazo === hoje)],
    ["proximas", t.proximas, minhas.filter((x) => x.prazo > hoje)],
    ["semdata", t.semData, minhas.filter((x) => !x.prazo)],
  ] as const;
  // dated events first ("2027-01"), then the ones with only a year ("2027")
  const eventos = getEventos().filter((e) => e.inicio >= hoje.slice(0, 7))
    .sort((a, b) => Number(a.inicio.length < 7) - Number(b.inicio.length < 7) || a.inicio.localeCompare(b.inicio)).slice(0, 3);
  const props = { equipes, pessoas, lang, hoje, me: user! };
  // one-tap dates (Bahia calendar): overdue → today/tomorrow/+7; undated → end of this/next week, end of month
  const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const dow = new Date(`${hoje}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const sexta = dia((5 - dow + 7) % 7);
  const fimMes = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7), 0)).toISOString().slice(0, 10);
  const OPCOES: Record<string, { label: string; data: string }[]> = {
    atrasadas: [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: dia(1) }, { label: t.maisSemana, data: dia(7) }],
    semdata: [{ label: t.estaSemana, data: sexta }, { label: t.proximaSemana, data: dia(((5 - dow + 7) % 7) + 7) }, { label: t.esteMes, data: fimMes }],
  };
  const comPrazo = (grupo: string) => OPCOES[grupo] && user
    ? (x: Tarefa) => can.editTarefa(user, x) ? <PrazoRapido id={x.id} opcoes={OPCOES[grupo]} outraData={t.outraData} /> : null
    : undefined;
  const novidades = user ? novidadesPara(user) : [];
  const fatosK = user ? getFatos() : [];
  const revisar = user ? fatosK.filter((f) => f.status === "proposto" && podeRevisar(user, f)).length : 0;
  const alertasK = user ? getAlertas().filter((a) => {
    const f = fatosK.find((x) => x.id === a.fato);
    return a.status === "aberta" && (f ? podeRevisar(user, f) : user.gestao);
  }).length + getPropostas().filter((p) => p.status === "aberta" && podeDecidir(user, p)).length : 0;

  // Everything that waits on this person, as one compact list (profile, assessment, knowledge).
  type Aviso = { href: string; icone: string; texto: string; acao: string; tom: keyof typeof TOM; progresso?: [number, number] };
  const avisos: Aviso[] = [];
  if (me && perfilPendente(me)) avisos.push({ href: `/pessoas/${me.id}/editar`, icone: "👤", texto: perfilPendente(me) === "verificar" ? t.bannerVerificar : t.bannerConfirmar, acao: t.bannerAcao, tom: "ambar" });
  for (const d of me ? diagnosticosAbertos(me) : []) {
    const pr = progresso(d, me!.id);
    if (pr.respondidas < pr.total) avisos.push({ href: `/pessoas/${me!.id}/respostas?d=${d.id}`, icone: "📝", texto: t.bannerDiag, acao: t.responderDiag, tom: "azul", progresso: [pr.respondidas, pr.total] });
    if (codigoPendente(d, me!.id)) avisos.push({ href: `/diagnosticos/${d.id}/codigo`, icone: "🤝", texto: t.bannerCodigo, acao: t.codigoAcordos, tom: "azul" });
    const c = getColetivo(d.id);
    for (const x of secoesColetivas(d).filter((x) => c.responsaveis[x.id] === me!.id)) {
      const feitas = x.perguntas.filter((q) => c.respostas[q.id]?.status === "respondida").length;
      if (feitas < x.perguntas.length) avisos.push({ href: `/diagnosticos/${d.id}/coletivo?secao=${x.id}`, icone: "📋", texto: `${t.parteColetiva}: ${lang === "en" ? x.titulo_en : x.titulo}`, acao: t.responderDiag, tom: "azul", progresso: [feitas, x.perguntas.length] });
    }
  }
  if (revisar > 0 || alertasK > 0) avisos.push({
    href: alertasK ? "/conhecimento/alertas" : "/conhecimento", icone: "🧠", tom: "neutro", acao: t.conhecimento,
    texto: [revisar && `${revisar} ${t.fatosPropostos}`, alertasK && `${alertasK} ${t.alertasEPropostas.toLowerCase()}`].filter(Boolean).join(" · "),
  });

  return (
    <>
      <Title sub={new Date().toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "long", day: "numeric", month: "long" })}>
        {t.ola}, {(me?.name ?? user?.username ?? "").split(" ")[0]}
      </Title>

      {avisos.length > 0 && (
        <ul className="mb-6 grid gap-1.5">
          {avisos.map((a) => (
            <li key={a.href + a.texto}>
              <Link href={a.href} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm hover:shadow-sm ${TOM[a.tom]}`}>
                <span aria-hidden className="text-base leading-none">{a.icone}</span>
                <span className="min-w-0 flex-1 truncate">{a.texto}</span>
                {a.progresso && (
                  <span className="flex items-center gap-1.5 text-xs text-neutral-500 tabular-nums">
                    <span className="hidden sm:block w-16 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <span className="block h-full bg-sky-600 dark:bg-sky-400" style={{ width: `${Math.round((a.progresso[0] / a.progresso[1]) * 100)}%` }} />
                    </span>
                    {a.progresso[0]}/{a.progresso[1]}
                  </span>
                )}
                <span className="shrink-0 text-xs font-medium underline underline-offset-2">{a.acao}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {me && <VoiceTask lang={lang} equipe={me.equipes[0] ?? ""} me={me.id}
        labels={{ falar: t.falar, ouvindo: t.ouvindo, vozIndisponivel: t.vozIndisponivel, criar: t.criar, cancelar: t.cancelar }} />}

      {me && prontosPara(me.id).length > 0 && (
        <Section title={t.prontosIA}>
          <ul className="grid gap-2">
            {prontosPara(me.id).map((j) => (
              <li key={j.id}>
                <Link href={`/tarefas/${j.taskId}`} className="block rounded-lg border border-violet-200 dark:border-violet-900 p-3 text-sm hover:underline">
                  {j.estado === "ok" ? "✅" : "⚠️"} {j.titulo} <span className="text-xs text-neutral-500">· {j.estado === "ok" ? t.verEntrega : t.falhou}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {novidades.length > 0 && (
        <Grupo id="novidades" titulo={t.novidades} count={novidades.length}>
          <ul className="grid">
            {novidades.map((n, i) => (
              <li key={`${n.tarefaId}${n.quando}${i}`} className="py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <Link href={`/tarefas/${n.tarefaId}`} className="block text-sm leading-snug hover:underline">{n.titulo}</Link>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2"><span className="font-medium text-neutral-700 dark:text-neutral-300">{n.quem}</span> {n.oque} · {fmtDate(n.quando.slice(0, 10), lang)} {n.quando.slice(11)}</p>
              </li>
            ))}
          </ul>
        </Grupo>
      )}

      {minhas.length === 0 && <Empty>{t.nadaPendente}</Empty>}
      {grupos.map(([id, titulo, ts]) => ts.length > 0 && (
        <Grupo key={id} id={id} titulo={titulo} count={ts.length} alerta={id === "atrasadas"} aberto={id !== "semdata" || ts.length <= 5}><TaskList tarefas={ts} {...props} extra={comPrazo(id)} /></Grupo>
      ))}

      {eventos.length > 0 && (
        <Section title={t.proximosEventos}>
          <div className="grid gap-2">
            {eventos.map((e) => (
              <Card key={e.id}>
                <p className="text-sm font-medium">{e.titulo}</p>
                <p className="text-xs text-neutral-500">{fmtDate(e.inicio, lang)} · {e.status === "confirmado" ? t.confirmado : t.aConfirmar}</p>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Link href="/tarefas/nova" aria-label={t.novaTarefa}
        className="fixed right-5 bottom-20 md:bottom-8 z-30 w-14 h-14 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-lg flex items-center justify-center">
        <Plus size={26} />
      </Link>
    </>
  );
}
