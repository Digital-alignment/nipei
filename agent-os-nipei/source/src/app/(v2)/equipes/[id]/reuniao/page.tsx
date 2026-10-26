import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EstadoVazio } from "@/components/ds/Estados";
import Campo, { CAMPO_COMPACTO } from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import Icone from "@/components/ds/Icone";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TaskRow } from "@/components/v2/ui";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CopiarBotao from "@/components/v2/CopiarBotao";
import { can, currentUser, getEquipes, getEventos, getPessoas, today, type Tarefa } from "@/lib/v2/data";
import { atas, pauta, textoPauta } from "@/lib/v2/reuniaoEquipe";
import { fmtDate, getT } from "@/lib/v2/i18n";
import ExportarGoogle from "@/components/v2/ExportarGoogle";
import { agendarReuniaoEquipeAction, salvarAtaAction } from "../../../actions";
import { ToastAoAbrir } from "@/components/ds/Toast";


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
      <p className={`rotulo-maiusculo text-t3 mb-2 ${cor}`}>{titulo} <span className="font-normal">({ts.length})</span></p>
      <ul>{ts.slice(0, max).map((x) => <TaskRow key={x.id} t={x} {...rowProps} />)}</ul>
      {ts.length > max && <p className="text-xs text-t2 mt-1">+{ts.length - max}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/equipes/${id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{e.nome}</Link>
      <CabecalhoPagina titulo={<>{t.reuniaoEquipe}</>} subtitulo={proxima ? <span className="inline-flex items-center gap-1.5"><Icone nome="calendario" tamanho={16} />{fmtDate(proxima.inicio, lang)}{proxima.hora ? ` · ${proxima.hora}` : ""}</span> : undefined} />
      <ToastAoAbrir texto={q.salva ? t.ataSalva : undefined} parametro="salva" />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CopiarBotao texto={texto} label={t.copiarPauta} copiado={t.copiado} />
        {gerir && (
          <form action={agendarReuniaoEquipeAction} className="flex flex-wrap items-center gap-1.5">
            <input type="hidden" name="equipe" value={id} />
            <input type="date" name="data" required min={hoje} aria-label={t.data} className={CAMPO_COMPACTO} />
            <input type="time" name="hora" aria-label={t.hora} className={CAMPO_COMPACTO} />
            <BotaoEnviar enviando="…" className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4">{t.agendarReuniao}</BotaoEnviar>
          </form>
        )}
      </div>

      <Cartao className="mb-3">
        <p className="text-sm font-medium mb-3">{t.pautaLbl} · <span className="text-t2 font-normal">{p.ultima ? `${t.desdeUltima} (${fmtDate(p.desde, lang)})` : t.desdeDias}</span></p>
        {bloco(t.pendentesUltima, p.pendentesDaUltima)}
        {bloco(t.feitasDesde, p.feitas, "!text-ok")}
        {bloco(t.atrasadas, p.atrasadas, "!text-err")}
        {bloco(t.proximos7, p.semana)}
        {bloco(t.semDonoLbl, p.semDono, "!text-warn", 6)}
        {!p.feitas.length && !p.atrasadas.length && !p.semana.length && !p.semDono.length && !p.pendentesDaUltima.length && <EstadoVazio compacto titulo={<>{t.nadaPendente}</>} />}
      </Cartao>

      {gerir && (
        <form action={salvarAtaAction} className="rounded-cartao bg-s1 p-4 mb-3">
          <p className="rotulo-maiusculo text-t3 mb-2">{t.ataLbl}</p>
          <input type="hidden" name="equipe" value={id} />
          <div className="max-w-44"><Campo tipo="data" rotulo={t.data} name="data" defaultValue={hoje} /></div>
          <p className="text-xs text-t2 mb-1">{t.presentes}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {membros.map((m) => (
              <label key={m.id} className="inline-flex items-center gap-1.5 rounded-pilula bg-s2 px-2.5 py-1 text-xs has-[:checked]:bg-s3 has-[:checked]:text-t1 has-[:checked]:shadow-[inset_0_0_0_1px_var(--s4)]">
                <input type="checkbox" name="presentes" value={m.id} className="sr-only" />{m.name.split(" ")[0]}
              </label>
            ))}
          </div>
          <Campo tipo="area" rotulo={t.decisoes} name="decisoes" rows={3} maxLength={5000} />
          <Campo tipo="area" rotulo={t.encaminhamentos} name="encaminhamentos" rows={4} maxLength={5000} placeholder={`Ligar para o fornecedor @${membros[0]?.name.split(" ")[0] ?? "Nome"} até 25/10`} />
          <p className="text-xs text-t2 mb-3">{t.encaminhamentosAjuda}</p>
          <BotaoEnviar enviando="…" className="anel-foco inline-flex h-10 items-center gap-2 rounded-pilula bg-ac px-4 font-texto text-sm font-semibold text-ac-ink hover:brightness-[.94]">{t.salvarAta}</BotaoEnviar>
        </form>
      )}

      {historico.length > 0 && (
        <Cartao className="mb-3">
          <p className="rotulo-maiusculo text-t3 mb-2">{t.atasAnteriores}</p>
          {historico.slice(0, 12).map((a) => (
            <details key={a.file} className="border-t border-s2 first:border-0 py-2">
              <summary className="cursor-pointer text-sm">{fmtDate(a.data, lang)} <span className="text-xs text-t2">· {t.porLbl} {a.por}{a.presentes.length ? ` · ${a.presentes.map(nome).join(", ")}` : ""}</span></summary>
              {a.decisoes && <p className="text-sm whitespace-pre-wrap mt-2">{a.decisoes}</p>}
              {a.encaminhamentos.length > 0 && (
                <ul className="mt-2 text-sm list-disc pl-5">
                  {a.encaminhamentos.map((x) => <li key={x.tarefa}><Link href={`/tarefas/${x.tarefa}`} className="hover:underline">{x.texto}</Link></li>)}
                </ul>
              )}
              <div className="mt-2"><ExportarGoogle pessoaId={me.pessoa?.id} t={t} campos={{ tipo: "ata", id: a.file, equipe: id }} formatos={[{ formato: "doc", label: t.cx.exportarDoc }]} /></div>
            </details>
          ))}
        </Cartao>
      )}
    </div>
  );
}
