import Link from "next/link";
import { headers } from "next/headers";
import { Suspense, type CSSProperties } from "react";
import { TaskRow, Empty } from "@/components/v2/ui";
import PrazoRapido from "@/components/v2/PrazoRapido";
import ArrastarAgenda from "@/components/v2/ArrastarAgenda";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CopiarBotao from "@/components/v2/CopiarBotao";
import LembrarVista from "@/components/v2/LembrarVista";
import { AbasLinks } from "@/components/v2/VistaLinks";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import MenuAcoes from "@/components/ds/MenuAcoes";
import { GrupoTarefas } from "@/components/ds/padroes/LinhaTarefa";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import { signToken } from "@/lib/auth";
import { can, currentUser, getEquipes, getEventos, getPessoas, getTarefas, novidadesPara, today, type Evento, type Tarefa } from "@/lib/v2/data";
import { ordenarAgora, type Selo as SeloOrdem } from "@/lib/v2/ordem";
import { fmtDate, getT, type Lang } from "@/lib/v2/i18n";
import { loteAction } from "../actions";
import { getConexoes } from "@/lib/v2/conexoes";
import { eventosGoogle, type EventoGoogle } from "@/lib/v2/google";

// Agenda (DESIGN-SYSTEM.md 10.5 e 10.6): Dia (faixa da semana + grade de horas), Semana e Lista (dia a dia,
// número display) e Mês (pontos por equipe; lista do dia embaixo no celular, ao lado a partir de 1024 px).
// Arrastar uma tarefa (li[data-tarefa]) para um dia (data-dia) muda o prazo (ArrastarAgenda).

const ICS_TTL = 60 * 60 * 24 * 365 * 3;
type T = Awaited<ReturnType<typeof getT>>["t"];
type Quem = "minhas" | "equipe" | "todas";
type Vista = "dia" | "semana" | "lista" | "mes";

const somar = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const segunda = (iso: string) => somar(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const ehDia = (x?: string) => /^\d{4}-\d{2}-\d{2}$/.test(x ?? "");
/** A dated event covers every day from inicio to fim. */
const noDia = (e: Evento, d: string) => e.inicio.length === 10 && e.inicio <= d && (e.fim || e.inicio) >= d;
const porHora = (a: { hora: string }, b: { hora: string }) => (a.hora || "99").localeCompare(b.hora || "99");
/** From this many tasks due in one day, the day is flagged as full. */
const SOBRECARGA = 5;
const corEquipe = (id?: string) => { const k = chaveEquipe(id); return k ? EQUIPES_DS[k].cor : "var(--s4)"; };
/** Bloco tingido: a cor da equipe misturada com a superfície 1 (tinta, não brilho). */
const tinta = (id?: string): CSSProperties => ({ background: `color-mix(in srgb, ${corEquipe(id)} 24%, var(--s1))` });
const minutos = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); };

type Comum = {
  hoje: string; comPrazo: Tarefa[]; eventos: Evento[]; gevs: EventoGoogle[]; linhas: (ts: Tarefa[], max?: number) => React.ReactNode[];
  t: T; lang: Lang; podeEvento: boolean; link: (p: Record<string, string | undefined>) => string;
  /** a pessoa pode mudar o prazo desta tarefa (arrastar) */
  mover: (x: Tarefa) => boolean;
};

export default async function Agenda({ searchParams }: { searchParams: Promise<{ equipe?: string; vista?: string; m?: string; dia?: string; s?: string; quem?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const user = (await currentUser())!;
  const me = user.pessoa;
  const equipes = getEquipes(), pessoas = getPessoas();
  const vista: Vista = q.vista === "dia" || q.vista === "lista" || q.vista === "mes" ? q.vista : "semana";
  // whose agenda: everyone starts with their own; a team chip shows that team (gestão sees the whole picture in /pulso)
  const quem: Quem = q.equipe ? "todas" : q.quem === "equipe" || q.quem === "todas" ? q.quem : "minhas";
  const equipe = quem === "todas" ? q.equipe : undefined;

  const visivel = (x: Tarefa) => quem === "minhas" ? !!me && x.responsaveis.includes(me.id)
    : quem === "equipe" ? user.equipes.includes(x.equipe) : !equipe || x.equipe === equipe;
  const abertas = getTarefas().filter((x) => x.status !== "done" && visivel(x));
  const comPrazo = abertas.filter((x) => x.prazo);
  const semPrazo = abertas.filter((x) => !x.prazo);
  const eventos = getEventos().filter((e) => quem === "todas" ? !equipe || e.equipe === equipe : !e.equipe || user.equipes.includes(e.equipe) || user.gestao);

  const ctx = { hoje, comNovidade: new Set(novidadesPara(user, 3, 50).map((n) => n.tarefaId)) };
  const rotSelo: Record<SeloOrdem, string> = { urgente: t.seloUrgente, andamento: t.seloAndamento, novidade: t.seloNovidade, quasePronta: t.seloQuasePronta, parada: t.seloParada };
  const opcoes = [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: somar(hoje, 1) }, { label: t.maisSemana, data: somar(hoje, 7) }];
  const rowProps = { equipes, pessoas, lang, hoje, me: user };
  const linhas = (ts: Tarefa[], max = Infinity) => {
    const o = ordenarAgora(ts, ctx);
    return o.tarefas.slice(0, max).map((x) => (
      <TaskRow key={x.id} t={x} {...rowProps} selos={o.selos[x.id]?.map((s) => rotSelo[s])} arrastavel={can.editTarefa(user, x)}
        extra={(y) => can.editTarefa(user, y) ? <PrazoRapido id={y.id} opcoes={opcoes} outraData={t.outraData} rotulo={t.reprogramar} /> : null} />
    ));
  };
  const link = (p: Record<string, string | undefined>) =>
    "/agenda?" + new URLSearchParams(Object.entries({ quem: q.quem, equipe, vista: q.vista, ...p }).filter(([, v]) => v) as [string, string][]).toString();

  const atrasadas = comPrazo.filter((x) => x.prazo < hoje);
  const reprogramaveis = atrasadas.filter((x) => user.gestao || can.editTarefa(user, x));
  const deHoje = comPrazo.filter((x) => x.prazo === hoje).length + eventos.filter((e) => noDia(e, hoje)).length;
  const proximos7 = comPrazo.filter((x) => x.prazo > hoje && x.prazo <= somar(hoje, 7)).length;
  const podeEvento = equipes.some((e) => can.gerirEquipe(user, e.id));
  // events with only a month or a year: shown as "to be scheduled" (they don't fit a day)
  const semDia = eventos.filter((e) => e.inicio.length < 10 && e.inicio >= hoje.slice(0, e.inicio.length)).sort((a, b) => a.inicio.localeCompare(b.inicio));

  const diaSel = ehDia(q.dia) ? q.dia! : hoje;
  const semanaIni = ehDia(q.s) ? segunda(q.s!) : segunda(vista === "dia" ? diaSel : hoje);
  const mesSel = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7);
  // the person's own Google Calendar (read-only here), for the range on screen
  const [gDe, gAte] = vista === "dia" ? [diaSel, somar(diaSel, 1)] : vista === "semana" ? [semanaIni, somar(semanaIni, 6)] : vista === "mes" ? [`${mesSel}-01`, `${addMonths(mesSel, 1)}-01`] : [hoje, somar(hoje, 30)];
  let gevs: EventoGoogle[] = [], gErro = "";
  if (me && getConexoes(me.id).google) gevs = await eventosGoogle(me.id, gDe, gAte).catch((e: Error) => { gErro = e.message; return []; });

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const icsUrl = `${origin}/api/agenda/ics?token=${signToken("ics", user.username, ICS_TTL)}${equipe ? `&equipe=${equipe}` : ""}`;
  const c: Comum = { hoje, comPrazo, eventos, gevs, linhas, t, lang, podeEvento, link, mover: (x) => can.editTarefa(user, x) };
  const diaAlvo = vista === "dia" ? diaSel : vista === "mes" && ehDia(q.dia) ? q.dia! : hoje;

  return (
    <>
      <CabecalhoPagina selo="lua" rotulo={quem === "minhas" ? t.minhas : quem === "equipe" ? t.minhaEquipe : equipe ? equipes.find((e) => e.id === equipe)?.nome : t.todas}
        titulo={t.agenda}
        subtitulo={<>
          <a href="#atrasadas" className={atrasadas.length ? "text-err hover:underline" : undefined}>{atrasadas.length} {t.atrasadasLbl}</a>
          {" · "}{deHoje} {t.hoje.toLowerCase()} · {proximos7} {t.proximos7.toLowerCase()} · <a href="#sem-prazo" className="hover:underline">{semPrazo.length} {t.semPrazoTitulo.toLowerCase()}</a>
        </>}
        acoes={<>
          <BotaoIcone icone="tarefa" aria-label={`${t.novaTarefa}`} href={`/tarefas/nova?back=/agenda${diaAlvo >= hoje ? `&prazo=${diaAlvo}` : ""}`} />
          {podeEvento && <Botao href={`/eventos/novo${diaAlvo >= hoje ? `?inicio=${diaAlvo}` : ""}`} icone="calendario" folha>{t.novoEvento}</Botao>}
        </>}
        abas={<AbasLinks rotulo={t.agenda} ativa={vista === "lista" ? "semana" : vista} itens={[
          { id: "dia", rotulo: t.diaLbl, icone: "tema-claro", href: link({ vista: "dia", dia: undefined, s: undefined, m: undefined }) },
          // TODO(ícones): trocar "calendario" pelos ícones `semana` e `mes` quando existirem (pedidos em ICONES.md)
          { id: "semana", rotulo: t.semanaLbl, icone: "calendario", href: link({ vista: "semana", dia: undefined, s: undefined, m: undefined }) },
          { id: "mes", rotulo: t.mes, icone: "calendario", href: link({ vista: "mes", dia: undefined, s: undefined, m: undefined }) },
        ]} />}
        filtros={<>
          {me && <Chip href={link({ quem: "minhas", equipe: undefined })} ativo={quem === "minhas"} icone="pessoa">{t.minhas}</Chip>}
          <Chip href={link({ quem: "equipe", equipe: undefined })} ativo={quem === "equipe"} icone="pessoas">{t.minhaEquipe}</Chip>
          <Chip href={link({ quem: "todas", equipe: undefined })} ativo={quem === "todas" && !equipe} icone="calendario">{t.todas}</Chip>
          {equipes.filter((e) => chaveEquipe(e.id)).map((e) => (
            <Chip key={e.id} tipo="equipe" equipe={e.id} ativo={equipe === e.id} href={link({ quem: "todas", equipe: equipe === e.id ? undefined : e.id })}>{e.nome}</Chip>
          ))}
        </>}
      />

      {atrasadas.length > 0 && (
        <section id="atrasadas" className="mb-6 grid scroll-mt-20 gap-2">
          {reprogramaveis.length > 1 && (
            <form action={loteAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="acao" value="prazo" />
              {reprogramaveis.map((x) => <input key={x.id} type="hidden" name="ids" value={x.id} />)}
              <span className="meta text-t2">{t.moverTodasPara.replace("{n}", String(reprogramaveis.length))}</span>
              {[[t.paraHoje, hoje], [t.amanha, somar(hoje, 1)], [t.proximaSemana, segunda(somar(hoje, 7))]].map(([rot, d]) => (
                <BotaoEnviar key={d} name="prazo" value={d} enviando="…" className="anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula bg-s2 px-3.5 font-texto text-sm font-medium text-t2 hover:bg-s3 hover:text-t1"><Icone nome="prazo" tamanho={16} />{rot}</BotaoEnviar>
              ))}
            </form>
          )}
          <GrupoTarefas titulo={t.atrasadas} contagem={atrasadas.length} alerta>{linhas(atrasadas)}</GrupoTarefas>
          <p className="meta text-t3">{t.atrasadasAjuda}</p>
        </section>
      )}

      {gErro && <p className="meta mb-3 inline-flex items-center gap-1.5 text-warn"><Icone nome="atencao" tamanho={16} />{t.cx.doGoogle}: {gErro}</p>}
      <Suspense><LembrarVista chave="agenda" params={["vista", "quem"]} /></Suspense>
      <ArrastarAgenda dica={t.dicaArrastar} />
      {vista === "dia" && <DiaGrade d={diaSel} inicioSemana={semanaIni} {...c} />}
      {vista === "semana" && <Semana inicio={semanaIni} {...c} />}
      {vista === "lista" && <Lista {...c} />}
      {vista === "mes" && <Mes mes={mesSel} dia={q.dia} {...c} />}

      <section id="sem-prazo" className="mt-8 grid scroll-mt-20 gap-2">
        {semPrazo.length ? (
          <>
            <GrupoTarefas titulo={t.semPrazoTitulo} contagem={semPrazo.length}>{linhas(semPrazo, 8)}</GrupoTarefas>
            <p className="meta text-t3">{t.semPrazoAjuda}</p>
            {semPrazo.length > 8 && <div><Botao href="/tarefas?vista=lista" variante="fantasma" tamanho="P" icone="avancar">{t.verTodas} ({semPrazo.length})</Botao></div>}
          </>
        ) : <Empty>{t.tudoComPrazo}</Empty>}
      </section>

      {semDia.length > 0 && (
        <details className="group mt-4 rounded-cartao bg-s1 p-4">
          <summary className="anel-foco flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-interno">
            <span className="titulo-cartao">{t.aDefinirData}</span><span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{semDia.length}</span>
            <Icone nome="abrir" tamanho={18} className="ml-auto text-t3 transition-transform group-open:rotate-180" />
          </summary>
          <p className="meta mt-1 text-t3">{t.aDefinirAjuda}</p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {semDia.map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${encodeURIComponent(e.id)}`} title={t.definirData} className="anel-foco flex min-h-11 items-center gap-2.5 rounded-[14px] px-3 font-texto text-[15px] text-t1 hover:underline" style={tinta(e.equipe)}>
                  <span className="meta w-16 shrink-0 tabular-nums text-t2">{e.inicio.length === 7 ? fmtDate(e.inicio, lang) : e.inicio}</span>
                  <span className="truncate">{e.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="group mt-4 rounded-cartao bg-s1 p-4">
        <summary className="anel-foco flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-interno">
          <Icone nome="calendario" tamanho={18} className="text-t2" /><span className="titulo-cartao">{t.googleTitulo}</span>
          <Icone nome="abrir" tamanho={18} className="ml-auto text-t3 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Botao href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsUrl.replace(/^https?:/, "webcal:"))}`} target="_blank" rel="noreferrer" icone="abrir-fora" tamanho="M">{t.adicionarGoogle}</Botao>
            <CopiarBotao texto={icsUrl} label={t.copiarLinkCal} copiado={t.copiado} />
          </div>
          <p className="meta text-t2">{t.googleTexto}</p>
        </div>
      </details>

      {/* "+" flutuante: criar no dia que está na tela */}
      <div className="print:hidden fixed bottom-[calc(7.25rem+env(safe-area-inset-bottom))] right-4 z-30 md:bottom-8 md:right-8">
        <MenuAcoes gatilho="criar" rotulo={t.criarLbl} itens={[
          { icone: "tarefa", rotulo: t.novaTarefa, href: `/tarefas/nova?back=/agenda${diaAlvo >= hoje ? `&prazo=${diaAlvo}` : ""}` },
          ...(podeEvento ? [{ icone: "calendario" as const, rotulo: t.novoEvento, href: `/eventos/novo${diaAlvo >= hoje ? `?inicio=${diaAlvo}` : ""}` }] : []),
        ]} />
      </div>
    </>
  );
}

const loc = (lang: Lang) => (lang === "en" ? "en-US" : "pt-BR");
const diaCurto = (d: string, lang: Lang) => new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(lang), { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3);

/** Faixa da semana (10.5): pílulas verticais; dia escolhido em acento; pontos = eventos na cor da equipe. Cada dia aceita tarefa arrastada. */
function FaixaSemana({ inicio, sel, href, hoje, comPrazo, eventos, gevs, lang, t, link }: Comum & { inicio: string; sel?: string; href: (d: string) => string }) {
  const dias = Array.from({ length: 7 }, (_, i) => somar(inicio, i));
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(lang), { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div className="mb-5 grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={link({ s: somar(inicio, -7), dia: sel ? somar(sel, -7) : undefined })} />
        <div className="grid justify-items-center">
          <p className="titulo-cartao">{fmt(dias[0])} – {fmt(dias[6])}</p>
          {(hoje < dias[0] || hoje > dias[6]) && <Link href={link({ s: undefined, dia: undefined })} className="meta text-t2 underline">{t.voltarHoje}</Link>}
        </div>
        <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={link({ s: somar(inicio, 7), dia: sel ? somar(sel, 7) : undefined })} />
      </div>
      <nav aria-label={t.semanaLbl} className="grid grid-cols-7 gap-1.5 md:gap-2">
        {dias.map((d) => {
          const on = d === sel, n = d < hoje ? 0 : comPrazo.filter((x) => x.prazo === d).length;
          const cores = [...new Set(eventos.filter((e) => noDia(e, d)).map((e) => corEquipe(e.equipe)))].slice(0, 3);
          return (
            <Link key={d} href={href(d)} data-dia={d} aria-current={on ? "date" : undefined} scroll={false}
              className={`anel-foco flex flex-col items-center gap-1 rounded-pilula py-3 transition-colors duration-150 ${on ? "bg-ac text-ac-ink" : d === hoje ? "bg-s2 text-t1 shadow-[inset_0_0_0_1px_var(--s3)]" : "bg-s1 text-t2 hover:bg-s2 hover:text-t1"} ${d < hoje && !on ? "opacity-60" : ""}`}>
              <span className="meta uppercase">{diaCurto(d, lang)}</span>
              <span className="font-display text-2xl font-light leading-none tabular-nums md:text-3xl">{Number(d.slice(8))}</span>
              <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                {cores.map((cor) => <span key={cor} className="size-1.5 rounded-pilula" style={{ background: on ? "currentColor" : cor }} />)}
                {gevs.some((e) => e.dia === d) && <span className="size-1.5 rounded-pilula shadow-[inset_0_0_0_1px_currentColor]" />}
              </span>
              {n > 0 && <span className={`rounded-pilula px-1.5 text-xs font-semibold tabular-nums ${on ? "bg-ac-ink/15" : n >= SOBRECARGA ? "bg-warn-bg text-warn" : "bg-s3 text-t2"}`}>{n}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Pílula de tarefa ou lembrete (10.6): ícone + ponto da equipe; arrastável para outro dia. */
function PilulaTarefa({ x, arrastavel }: { x: Tarefa; arrastavel: boolean }) {
  return (
    <li draggable={arrastavel || undefined} data-tarefa={arrastavel ? x.id : undefined}>
      <Link href={`/tarefas/${x.id}`} className="anel-foco inline-flex min-h-9 max-w-full items-center gap-2 rounded-pilula bg-s2 py-1 pl-2.5 pr-3.5 font-texto text-sm font-medium text-t1 hover:bg-s3">
        <Icone nome="tarefa" tamanho={16} className="shrink-0 text-t2" />
        <span className="size-2 shrink-0 rounded-pilula" style={{ background: corEquipe(x.equipe) }} aria-hidden="true" />
        <span className="truncate">{x.title}</span>
      </Link>
    </li>
  );
}

/** Vista Dia: faixa da semana + dia inteiro (eventos sem hora, tarefas) + grade de horas com a linha do agora. */
function DiaGrade({ d, inicioSemana, ...c }: Comum & { d: string; inicioSemana: string }) {
  const { hoje, comPrazo, eventos, gevs, t, lang, link } = c;
  const evs = eventos.filter((e) => noDia(e, d));
  const comHora = [
    ...evs.filter((e) => e.hora).map((e) => ({ id: e.id, titulo: e.titulo, ini: minutos(e.hora), fim: minutos(e.hora) + 60, equipe: e.equipe, href: `/eventos/${encodeURIComponent(e.id)}`, google: false, aConfirmar: e.status !== "confirmado" })),
    ...gevs.filter((e) => e.dia === d && e.hora).map((e) => ({ id: e.id, titulo: e.titulo, ini: minutos(e.hora), fim: /^\d{2}:\d{2}$/.test(e.fim) ? Math.max(minutos(e.hora) + 30, minutos(e.fim)) : minutos(e.hora) + 60, equipe: "", href: e.link, google: true, aConfirmar: false })),
  ].sort((a, b) => a.ini - b.ini);
  const semHora = evs.filter((e) => !e.hora);
  const gSemHora = gevs.filter((e) => e.dia === d && !e.hora);
  const ts = d < hoje ? [] : comPrazo.filter((x) => x.prazo === d);
  // faixas lado a lado quando os eventos se sobrepõem (ponytail: uma largura só para o dia todo)
  const faixas: number[] = [];
  const pos = comHora.map((e) => { let i = faixas.findIndex((f) => f <= e.ini); if (i < 0) { faixas.push(0); i = faixas.length - 1; } faixas[i] = e.fim; return i; });
  const agora = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" });
  const de = Math.min(7, ...comHora.map((e) => Math.floor(e.ini / 60)), d === hoje ? Math.floor(minutos(agora) / 60) : 24);
  const ate = Math.max(21, ...comHora.map((e) => Math.ceil(e.fim / 60)));
  const H = 64; // px por hora
  const titulo = new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <>
      <FaixaSemana inicio={inicioSemana} sel={d} href={(x) => link({ vista: "dia", dia: x, s: undefined })} {...c} />
      <section data-dia={d} className="grid gap-4 rounded-cartao bg-s1 p-4">
        <h2 className="flex items-baseline gap-3">
          <span className={`numero-display ${d === hoje ? "text-ac-text" : ""}`}>{Number(d.slice(8))}</span>
          <span className="titulo-secao first-letter:uppercase">{titulo}</span>
        </h2>
        {(semHora.length > 0 || gSemHora.length > 0 || ts.length > 0) && (
          <div className="grid gap-2">
            <p className="rotulo-maiusculo text-t3">{t.diaInteiro}</p>
            <ul className="flex flex-wrap gap-2">
              {semHora.map((e) => (
                <li key={e.id}><Link href={`/eventos/${encodeURIComponent(e.id)}`} className="anel-foco relative inline-flex min-h-9 items-center gap-2 overflow-hidden rounded-[12px] py-1 pl-3.5 pr-3.5 font-texto text-sm font-medium text-t1 hover:underline" style={tinta(e.equipe)}>
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: corEquipe(e.equipe) }} />{e.titulo}
                </Link></li>
              ))}
              {gSemHora.map((e) => <li key={e.id}><a href={e.link || undefined} target="_blank" rel="noreferrer" className="anel-foco inline-flex min-h-9 items-center gap-2 rounded-[12px] px-3.5 font-texto text-sm text-t2 shadow-[inset_0_0_0_1px_var(--s4)] [border-style:dashed] hover:underline"><Icone nome="calendario" tamanho={16} />{e.titulo}</a></li>)}
              {ts.map((x) => <PilulaTarefa key={x.id} x={x} arrastavel={c.mover(x)} />)}
            </ul>
          </div>
        )}
        <div className="relative grid" style={{ gridTemplateColumns: "3.25rem 1fr" }}>
          {Array.from({ length: ate - de }, (_, i) => (
            <div key={i} className="contents">
              <span className="meta -translate-y-2 pr-2 text-right tabular-nums text-t3" style={{ height: H }}>{String(de + i).padStart(2, "0")}:00</span>
              <span className="border-t border-s2" style={{ height: H }} />
            </div>
          ))}
          <div className="absolute inset-y-0 left-[3.25rem] right-0">
            {comHora.map((e, i) => {
              const top = ((e.ini - de * 60) / 60) * H, alto = Math.max(28, ((e.fim - e.ini) / 60) * H - 4);
              const largura = 100 / faixas.length;
              const corpo = (
                <>
                  {!e.google && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: corEquipe(e.equipe) }} />}
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="meta shrink-0 tabular-nums text-t2">{String(Math.floor(e.ini / 60)).padStart(2, "0")}:{String(e.ini % 60).padStart(2, "0")}</span>
                    <span className="truncate font-texto text-sm font-semibold text-t1">{e.titulo}</span>
                  </span>
                  {e.equipe && chaveEquipe(e.equipe) && <span className="meta flex items-center gap-1 text-t2"><Selo nome={EQUIPES_DS[chaveEquipe(e.equipe)!].selo} tamanho={14} style={{ color: corEquipe(e.equipe) }} />{EQUIPES_DS[chaveEquipe(e.equipe)!].nome}</span>}
                </>
              );
              const cls = `anel-foco absolute flex flex-col gap-0.5 overflow-hidden rounded-[12px] py-1.5 pl-3 pr-2 hover:brightness-110 ${e.google ? "bg-s1 shadow-[inset_0_0_0_1px_var(--s4)]" : ""} ${e.aConfirmar ? "hachurado" : ""}`;
              const st: CSSProperties = { top, height: alto, left: `calc(${pos[i] * largura}% + 4px)`, width: `calc(${largura}% - 8px)`, ...(e.google ? {} : tinta(e.equipe)) };
              return e.google
                ? <a key={e.id} href={e.href || undefined} target="_blank" rel="noreferrer" className={cls} style={st}>{corpo}</a>
                : <Link key={e.id} href={e.href} className={cls} style={st}>{corpo}</Link>;
            })}
            {d === hoje && minutos(agora) >= de * 60 && minutos(agora) <= ate * 60 && (
              // linha do agora (âmbar)
              <span role="img" aria-label={`${t.agoraLbl} ${agora}`} className="pointer-events-none absolute -left-1.5 right-0 z-10 flex items-center" style={{ top: ((minutos(agora) - de * 60) / 60) * H - 5 }}>
                <span className="size-2.5 shrink-0 rounded-pilula bg-warn" /><span className="h-0.5 flex-1 bg-warn" />
              </span>
            )}
          </div>
        </div>
        {!comHora.length && !semHora.length && !ts.length && !gSemHora.length && <p className="meta text-t3">{t.semEventos}</p>}
      </section>
    </>
  );
}

/** One day block (Semana / Lista / Mês): número display + eventos (blocos tingidos) + tarefas (linhas). */
function Dia({ d, hoje, comPrazo, eventos, gevs, linhas, t, lang, podeEvento, vazio = true, compacto }: Comum & { d: string; vazio?: boolean; compacto?: boolean }) {
  const evs = eventos.filter((e) => noDia(e, d)).sort(porHora);
  const gs = gevs.filter((e) => e.dia === d).sort(porHora);
  const ts = d < hoje ? [] : comPrazo.filter((x) => x.prazo === d);
  if ((!vazio || d < hoje) && !evs.length && !ts.length && !gs.length) return null;
  const ehHoje = d === hoje;
  const nome = d === hoje ? t.hoje : d === somar(hoje, 1) ? t.amanha : new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(lang), { weekday: "long", timeZone: "UTC" });
  const acoes = d >= hoje && (
    <span className="ml-auto flex gap-1">
      <BotaoIcone icone="tarefa" aria-label={`${t.novaTarefa} · ${nome}`} tamanho={40} variante="fantasma" href={`/tarefas/nova?prazo=${d}&back=/agenda`} />
      {podeEvento && <BotaoIcone icone="calendario" aria-label={`${t.novoEvento} · ${nome}`} tamanho={40} variante="fantasma" href={`/eventos/novo?inicio=${d}`} />}
    </span>
  );
  const vazioDia = !evs.length && !ts.length && !gs.length;
  return (
    <section id={`d-${d}`} data-dia={d} className={`scroll-mt-20 rounded-cartao transition-shadow ${compacto ? "" : "py-2"} ${d < hoje ? "opacity-70" : ""}`}>
      <h2 className="flex items-center gap-3 px-1 pb-2">
        {!compacto && <span className={`grid min-w-14 place-items-center rounded-pilula px-2 numero-display ${ehHoje ? "bg-ac text-ac-ink" : "text-t1"}`}>{Number(d.slice(8))}</span>}
        <span className="grid">
          <span className="titulo-cartao first-letter:uppercase">{nome}</span>
          {(ts.length > 0 || evs.length > 0) && <span className={`meta tabular-nums ${ts.length >= SOBRECARGA ? "font-semibold text-warn" : "text-t3"}`}>{evs.length + ts.length + gs.length}{ts.length >= SOBRECARGA ? ` · ${t.diaCheio}` : ""}</span>}
          {vazioDia && <span className="meta text-t3">{t.semEventos}</span>}
        </span>
        {acoes}
      </h2>
      {(evs.length > 0 || gs.length > 0) && (
        <ul className="mb-2 grid gap-1.5">
          {evs.map((e) => (
            <li key={e.id}>
              <Link href={`/eventos/${encodeURIComponent(e.id)}`} className={`anel-foco relative flex min-h-12 items-center gap-3 overflow-hidden rounded-[14px] py-2 pl-4 pr-3 hover:brightness-110 ${e.status !== "confirmado" ? "hachurado" : ""}`} style={tinta(e.equipe)}>
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: corEquipe(e.equipe) }} />
                <span className="meta w-11 shrink-0 tabular-nums text-t2">{e.hora || "—"}</span>
                <span className="min-w-0 flex-1 truncate font-texto text-[15px] font-semibold text-t1">{e.titulo}</span>
                {e.fim && e.fim !== e.inicio && <span className="meta shrink-0 text-t2">→ {fmtDate(e.fim, lang)}</span>}
                {e.status !== "confirmado" && <span className="meta shrink-0 text-t2">{t.aConfirmar}</span>}
              </Link>
            </li>
          ))}
          {gs.map((e) => (
            <li key={e.id}>
              <a href={e.link || undefined} target="_blank" rel="noreferrer" className="anel-foco flex min-h-12 items-center gap-3 rounded-[14px] py-2 pl-4 pr-3 shadow-[inset_0_0_0_1px_var(--s4)] hover:bg-s2">
                <span className="meta w-11 shrink-0 tabular-nums text-t2">{e.hora || "—"}</span>
                <span className="min-w-0 flex-1 truncate font-texto text-[15px] text-t2">{e.titulo}</span>
                <span className="meta inline-flex shrink-0 items-center gap-1 text-t3"><Icone nome="calendario" tamanho={14} />{t.cx.doGoogle}{e.fim ? ` · ${e.fim}` : ""}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {ts.length > 0 && <ul className="overflow-hidden rounded-cartao bg-s1">{linhas(ts)}</ul>}
    </section>
  );
}

function Semana({ inicio, ...c }: Comum & { inicio: string }) {
  const dias = Array.from({ length: 7 }, (_, i) => somar(inicio, i));
  return (
    <>
      <FaixaSemana inicio={inicio} href={(d) => `#d-${d}`} {...c} />
      <div className="grid gap-2">{dias.map((d) => <Dia key={d} d={d} {...c} />)}</div>
      <div className="mt-3"><Botao href={c.link({ vista: "lista", s: undefined })} variante="fantasma" tamanho="P" icone="avancar">{c.t.proximos30}</Botao></div>
    </>
  );
}

/** Day by day from today; days far ahead fold by month. */
function Lista(c: Comum) {
  const { hoje, comPrazo, eventos, t, lang } = c;
  const dias = [...new Set([
    ...comPrazo.filter((x) => x.prazo >= hoje).map((x) => x.prazo),
    ...eventos.filter((e) => e.inicio.length === 10 && (e.fim || e.inicio) >= hoje).map((e) => (e.inicio < hoje ? hoje : e.inicio)),
    ...c.gevs.filter((e) => e.dia >= hoje).map((e) => e.dia),
  ])].sort();
  if (!dias.length) return <Empty>{t.semTarefas}</Empty>;
  const limite = somar(hoje, 30);
  const perto = dias.filter((d) => d <= limite);
  const meses = new Map<string, string[]>();
  for (const d of dias.filter((d) => d > limite)) meses.set(d.slice(0, 7), [...(meses.get(d.slice(0, 7)) ?? []), d]);
  return (
    <div className="grid gap-2">
      {perto.map((d) => <Dia key={d} d={d} {...c} vazio={false} />)}
      {[...meses].map(([m, ds]) => (
        <details key={m} className="group rounded-cartao bg-s1 p-3">
          <summary className="anel-foco flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-interno">
            <span className="titulo-cartao first-letter:uppercase">{fmtDate(m, lang)}</span><span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{ds.length}</span>
            <Icone nome="abrir" tamanho={18} className="ml-auto text-t3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 grid gap-2">{ds.map((d) => <Dia key={d} d={d} {...c} vazio={false} />)}</div>
        </details>
      ))}
    </div>
  );
}

function Mes({ mes, dia, ...c }: Comum & { mes: string; dia?: string }) {
  const { hoje, comPrazo, eventos, t, lang, link } = c;
  const [y, m] = mes.split("-").map(Number);
  const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // weeks start on Monday
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const iso = (d: number) => `${mes}-${String(d).padStart(2, "0")}`;
  const sel = ehDia(dia) && dia!.startsWith(mes) ? dia! : hoje.startsWith(mes) ? hoje : iso(1);
  const cab = [...t.semana.slice(1), t.semana[0]];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
      <section className="rounded-cartao bg-s1 p-3 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <BotaoIcone icone="voltar" aria-label="‹" tamanho={44} variante="fantasma" href={link({ m: addMonths(mes, -1), dia: undefined })} />
          <div className="grid justify-items-center">
            <p className="titulo-secao first-letter:uppercase">{fmtDate(mes, lang)}</p>
            {!hoje.startsWith(mes) && <Link href={link({ m: undefined, dia: undefined })} className="meta text-t2 underline">{t.voltarHoje}</Link>}
          </div>
          <BotaoIcone icone="avancar" aria-label="›" tamanho={44} variante="fantasma" href={link({ m: addMonths(mes, 1), dia: undefined })} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {cab.map((d, i) => <div key={i} className="rotulo-maiusculo py-1 text-t3">{d}</div>)}
          {Array.from({ length: first }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const d = iso(i + 1);
            const n = d < hoje ? 0 : comPrazo.filter((x) => x.prazo === d).length;
            // pontos na cor de cada equipe (eventos e tarefas do dia)
            const cores = [...new Set([...eventos.filter((e) => noDia(e, d)).map((e) => e.equipe), ...comPrazo.filter((x) => x.prazo === d && d >= hoje).map((x) => x.equipe)].map(corEquipe))].slice(0, 4);
            return (
              <Link key={d} href={link({ m: mes, dia: d })} data-dia={d} scroll={false} aria-current={d === sel ? "date" : undefined}
                className={`anel-foco flex min-h-14 flex-col items-center justify-start gap-1 rounded-[14px] pt-1.5 transition-colors duration-150 md:min-h-20 ${d === sel ? "bg-s2 shadow-[inset_0_0_0_1px_var(--s4)]" : "hover:bg-s2"} ${d < hoje ? "opacity-55" : ""}`}>
                <span className={`grid size-8 place-items-center rounded-pilula font-texto text-sm tabular-nums ${d === hoje ? "bg-ac font-bold text-ac-ink" : "text-t1"}`}>{i + 1}</span>
                <span className="flex gap-0.5" aria-hidden="true">{cores.map((cor) => <span key={cor} className="size-1.5 rounded-pilula" style={{ background: cor }} />)}</span>
                {n >= SOBRECARGA && <span className="meta font-semibold tabular-nums text-warn">{n}</span>}
              </Link>
            );
          })}
        </div>
      </section>
      <div className="lg:sticky lg:top-4"><Dia d={sel} {...c} compacto={false} /></div>
    </div>
  );
}
