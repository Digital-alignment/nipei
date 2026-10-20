import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Empty, TaskRow, Title } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CopiarBotao from "@/components/v2/CopiarBotao";
import { can, currentUser, getEquipes, getEventos, getPessoas, today, type Tarefa } from "@/lib/v2/data";
import { atas, pauta, textoPauta } from "@/lib/v2/reuniaoEquipe";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { agendarReuniaoEquipeAction, salvarAtaAction } from "../../../actions";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 mb-3";
const ROTULO = "text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2";
const campo = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm";

// Team meeting: live agenda (since the last minutes), schedule it, write the minutes → tasks.
export default async function ReuniaoEquipe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salva?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const equipes = getEquipes(), pessoas = getPessoas();
  const e = equipes.find((x) => x.id === id);
  if (!e) notFound();
  const gerir = can.gerirEquipe(me, id);
  const hoje = today();
  const p = pauta(e, hoje);
  const historico = atas(id);
  const proxima = getEventos().filter((x) => x.equipe === id && x.titulo.startsWith("Reunião") && x.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const texto = textoPauta(e, p, proxima?.inicio || hoje, pessoas, origin);
  const rowProps = { equipes, pessoas, lang, hoje, me };
  const nome = (pid: string) => pessoas.find((x) => x.id === pid)?.name.split(" ")[0] ?? pid;
  const membros = pessoas.filter((x) => x.equipes.includes(id));

  const bloco = (titulo: string, ts: Tarefa[], cor = "", max = 12) => ts.length > 0 && (
    <div className="mb-4">
      <p className={`${ROTULO} ${cor}`}>{titulo} <span className="font-normal">({ts.length})</span></p>
      <ul>{ts.slice(0, max).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul>
      {ts.length > max && <p className="text-xs text-neutral-500 mt-1">+{ts.length - max}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <Link href={`/equipes/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{e.nome}</Link>
      <Title sub={proxima ? `📅 ${fmtDate(proxima.inicio, lang)}${proxima.hora ? ` · ${proxima.hora}` : ""}` : undefined}>{t.reuniaoEquipe}</Title>
      {q.salva && <p className="mb-3 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm text-green-800 dark:text-green-300">✓ {t.ataSalva}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CopiarBotao texto={texto} label={t.copiarPauta} copiado={t.copiado} />
        {gerir && (
          <form action={agendarReuniaoEquipeAction} className="flex flex-wrap items-center gap-1.5">
            <input type="hidden" name="equipe" value={id} />
            <input type="date" name="data" required min={hoje} aria-label={t.data} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" />
            <input type="time" name="hora" aria-label={t.hora} className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm" />
            <BotaoEnviar enviando="…" className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">{t.agendarReuniao}</BotaoEnviar>
          </form>
        )}
      </div>

      <div className={CARTAO}>
        <p className="text-sm font-medium mb-3">{t.pautaLbl} · <span className="text-neutral-500 font-normal">{p.ultima ? `${t.desdeUltima} (${fmtDate(p.desde, lang)})` : t.desdeDias}</span></p>
        {bloco(t.pendentesUltima, p.pendentesDaUltima)}
        {bloco(t.feitasDesde, p.feitas, "!text-green-700 dark:!text-green-400")}
        {bloco(t.atrasadas, p.atrasadas, "!text-red-600 dark:!text-red-400")}
        {bloco(t.proximos7, p.semana)}
        {bloco(t.semDonoLbl, p.semDono, "!text-amber-700 dark:!text-amber-400", 6)}
        {!p.feitas.length && !p.atrasadas.length && !p.semana.length && !p.semDono.length && !p.pendentesDaUltima.length && <Empty>{t.nadaPendente}</Empty>}
      </div>

      {gerir && (
        <form action={salvarAtaAction} className={CARTAO}>
          <p className={ROTULO}>{t.ataLbl}</p>
          <input type="hidden" name="equipe" value={id} />
          <label className="grid gap-1 text-xs text-neutral-500 mb-3">{t.data}
            <input type="date" name="data" defaultValue={hoje} className={`${campo} max-w-44`} />
          </label>
          <p className="text-xs text-neutral-500 mb-1">{t.presentes}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {membros.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-2.5 py-1 text-xs has-[:checked]:bg-neutral-900 has-[:checked]:text-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-neutral-900">
                <input type="checkbox" name="presentes" value={m.id} className="sr-only" />{m.name.split(" ")[0]}
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-xs text-neutral-500 mb-3">{t.decisoes}
            <textarea name="decisoes" rows={3} maxLength={5000} className={campo} />
          </label>
          <label className="grid gap-1 text-xs text-neutral-500 mb-1">{t.encaminhamentos}
            <textarea name="encaminhamentos" rows={4} maxLength={5000} placeholder={`Ligar para o fornecedor @${membros[0]?.name.split(" ")[0] ?? "Nome"} até 25/10`} className={campo} />
          </label>
          <p className="text-[11px] text-neutral-500 mb-3">{t.encaminhamentosAjuda}</p>
          <BotaoEnviar enviando="…" className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium">{t.salvarAta}</BotaoEnviar>
        </form>
      )}

      {historico.length > 0 && (
        <div className={CARTAO}>
          <p className={ROTULO}>{t.atasAnteriores}</p>
          {historico.slice(0, 12).map((a) => (
            <details key={a.file} className="border-t border-neutral-100 dark:border-neutral-800 first:border-0 py-2">
              <summary className="cursor-pointer text-sm">{fmtDate(a.data, lang)} <span className="text-xs text-neutral-500">· {t.porLbl} {a.por}{a.presentes.length ? ` · ${a.presentes.map(nome).join(", ")}` : ""}</span></summary>
              {a.decisoes && <p className="text-sm whitespace-pre-wrap mt-2">{a.decisoes}</p>}
              {a.encaminhamentos.length > 0 && (
                <ul className="mt-2 text-sm list-disc pl-5">
                  {a.encaminhamentos.map((x) => <li key={x.tarefa}><Link href={`/tarefas/${x.tarefa}`} className="hover:underline">{x.texto}</Link></li>)}
                </ul>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
