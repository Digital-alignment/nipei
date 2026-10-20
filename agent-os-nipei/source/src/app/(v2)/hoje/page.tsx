import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, Empty, Section, TaskList, Title, byPrazo } from "@/components/v2/ui";
import VoiceTask from "@/components/v2/VoiceTask";
import { prontosPara } from "@/lib/v2/trabalhos";
import { perfilPendente } from "@/lib/v2/perfil";
import { getFatos, podeRevisar } from "@/lib/v2/conhecimento";
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
    [t.atrasadas, minhas.filter((x) => x.prazo && x.prazo < hoje)],
    [t.paraHoje, minhas.filter((x) => x.prazo === hoje)],
    [t.proximas, minhas.filter((x) => x.prazo > hoje)],
    [t.semData, minhas.filter((x) => !x.prazo)],
  ] as const;
  // dated events first ("2027-01"), then the ones with only a year ("2027")
  const eventos = getEventos().filter((e) => e.inicio >= hoje.slice(0, 7))
    .sort((a, b) => Number(a.inicio.length < 7) - Number(b.inicio.length < 7) || a.inicio.localeCompare(b.inicio)).slice(0, 3);
  const props = { equipes, pessoas, lang, hoje, me: user! };
  const revisar = user ? getFatos().filter((f) => f.status === "proposto" && podeRevisar(user, f)).length : 0;

  return (
    <>
      <Title sub={new Date().toLocaleDateString(lang === "en" ? "en-US" : "pt-BR", { weekday: "long", day: "numeric", month: "long" })}>
        {t.ola}, {(me?.name ?? user?.username ?? "").split(" ")[0]}
      </Title>

      {me && perfilPendente(me) && (
        <Link href={`/pessoas/${me.id}/editar`} className="block rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm mb-5">
          {perfilPendente(me) === "verificar" ? t.bannerVerificar : t.bannerConfirmar} <span className="underline font-medium">{t.bannerAcao}</span>
        </Link>
      )}

      {revisar > 0 && (
        <Link href="/conhecimento" className="block rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm mb-5">
          🧠 {revisar} {t.fatosPropostos} · <span className="underline font-medium">{t.conhecimento}</span>
        </Link>
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
      {grupos.map(([titulo, ts]) => ts.length > 0 && (
        <Section key={titulo} title={titulo} count={ts.length}><TaskList tarefas={ts} {...props} /></Section>
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
