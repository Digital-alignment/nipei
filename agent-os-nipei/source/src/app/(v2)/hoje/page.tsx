import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Empty, Section, TaskList, Title, byPrazo } from "@/components/v2/ui";
import VoiceTask from "@/components/v2/VoiceTask";
import Grupo from "@/components/v2/Grupo";

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
import { currentUser, getEquipes, getEventos, getPessoas, getTarefas, today } from "@/lib/v2/data";
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

      {minhas.length === 0 && <Empty>{t.nadaPendente}</Empty>}
      {grupos.map(([id, titulo, ts]) => ts.length > 0 && (
        <Grupo key={id} id={id} titulo={titulo} count={ts.length} alerta={id === "atrasadas"}><TaskList tarefas={ts} {...props} /></Grupo>
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
