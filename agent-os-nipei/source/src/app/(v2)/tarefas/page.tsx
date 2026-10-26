import Link from "next/link";
import { TaskRow, Empty } from "@/components/v2/ui";
import PrazoRapido from "@/components/v2/PrazoRapido";
import QuadroTarefas from "@/components/v2/QuadroTarefas";
import { AbasLinks, SegmentadoLinks } from "@/components/v2/VistaLinks";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Cartao, { GradeBento } from "@/components/ds/Cartao";
import Icone from "@/components/ds/Icone";
import Selo from "@/components/ds/Selo";
import { GrupoAvatares } from "@/components/ds/Avatar";
import { GrupoTarefas } from "@/components/ds/padroes/LinhaTarefa";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import { can, currentUser, getEquipes, getPessoas, getTarefas, today, type Tarefa } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { ordenarAgora } from "@/lib/v2/ordem";

type Q = { vista?: string; quem?: string; equipe?: string; q?: string };
const sn = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

// Tarefas (DESIGN-SYSTEM.md 10.1–10.4, 10.7): Lista (linhas agrupadas por prazo, ou grade de cartões) e Quadro.
export default async function Tarefas({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const user = (await currentUser())!;
  const me = user.pessoa;
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas();
  const vista = q.vista === "quadro" ? "quadro" : q.vista === "grade" ? "grade" : "lista";
  const quem = q.quem === "equipe" || q.quem === "todas" ? q.quem : me ? "minhas" : "todas";
  const minha = (x: Tarefa) => !!me && x.responsaveis.includes(me.id);
  // o que esta pessoa vê: gestão tudo; os outros, as das suas equipes e as que têm com eles
  const visivel = (x: Tarefa) => user.gestao || minha(x) || (!!x.equipe && (user.equipes.includes(x.equipe) || user.coordena.includes(x.equipe)));
  const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const mes = dia(-30);

  const base = getTarefas().filter(visivel).filter((x) =>
    (quem === "minhas" ? minha(x) : quem === "equipe" ? !!x.equipe && (user.equipes.includes(x.equipe) || user.coordena.includes(x.equipe)) : true)
    && (!q.equipe || x.equipe === q.equipe)
    && (!q.q || sn(x.title).includes(sn(q.q))));
  const abertas = base.filter((x) => x.status !== "done");
  const feitasRecentes = base.filter((x) => x.status === "done" && (x.concluidoEm || "").slice(0, 10) >= mes);
  const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
  const comVoce = abertas.filter(minha).length;
  const ordem = ordenarAgora(abertas, { hoje, comNovidade: new Set() });

  const url = (mudar: Partial<Q>) => {
    const p = new URLSearchParams(Object.entries({ vista, quem, equipe: q.equipe, q: q.q, ...mudar }).filter(([, v]) => v) as [string, string][]);
    if (p.get("vista") === "lista") p.delete("vista");
    return `/tarefas${p.size ? `?${p}` : ""}`;
  };
  const props = { equipes, pessoas, lang, hoje, me: user };
  const opcoesPrazo = [{ label: t.paraHoje, data: hoje }, { label: t.amanha, data: dia(1) }, { label: t.maisSemana, data: dia(7) }];
  const linha = (x: Tarefa) => <TaskRow key={x.id} t={x} {...props}
    extra={(tt) => (can.editTarefa(user, tt) ? <PrazoRapido id={tt.id} opcoes={opcoesPrazo} outraData={t.outraData} rotulo={t.reprogramar} /> : null)} />;
  const foto = (id: string) => {
    const p = pessoas.find((x) => x.id === id);
    return { nome: p?.name ?? id, foto: p?.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined };
  };
  const novaHref = `/tarefas/nova?back=${encodeURIComponent(url({}))}`;

  const GRUPOS = [
    { id: "atrasadas", titulo: t.atrasadas, dentro: (x: Tarefa) => !!x.prazo && x.prazo < hoje, alerta: true },
    { id: "hoje", titulo: t.grpHoje, dentro: (x: Tarefa) => x.prazo === hoje },
    { id: "amanha", titulo: t.grpAmanha, dentro: (x: Tarefa) => x.prazo === dia(1) },
    { id: "semana", titulo: t.grpSemana, dentro: (x: Tarefa) => x.prazo > dia(1) && x.prazo <= dia(7) },
    { id: "depois", titulo: t.grpDepois, dentro: (x: Tarefa) => x.prazo > dia(7) },
    { id: "semdata", titulo: t.semData, dentro: (x: Tarefa) => !x.prazo },
  ];

  return (
    <>
      <CabecalhoPagina selo="broto" rotulo={quem === "minhas" ? t.minhasTarefas : quem === "equipe" ? t.minhaEquipe : t.todas} titulo={t.tarefasTitulo}
        subtitulo={<>{abertas.length} {t.tarefasAbertasLbl} · <span className={atrasadas ? "text-err" : undefined}>{atrasadas} {t.atrasadasLbl}</span>{me && <> · {comVoce} {t.comVoce}</>}</>}
        acoes={<>
          <form action="/tarefas" role="search" className="flex items-center">
            {vista !== "lista" && <input type="hidden" name="vista" value={vista} />}
            <input type="hidden" name="quem" value={quem} />{q.equipe && <input type="hidden" name="equipe" value={q.equipe} />}
            <label className="group/b relative flex h-[52px] items-center rounded-pilula bg-s3 focus-within:shadow-foco">
              <Icone nome="buscar" tamanho={20} className="pointer-events-none absolute left-4 text-t1" />
              <input type="search" name="q" defaultValue={q.q} placeholder={t.buscarTarefas} aria-label={t.buscarTarefas}
                className="h-full w-[52px] rounded-pilula bg-transparent pl-12 font-texto text-base text-t1 outline-none transition-[width] duration-200 placeholder:text-transparent focus:w-56 focus:placeholder:text-t3 md:w-56 md:placeholder:text-t3 [&::-webkit-search-cancel-button]:hidden" />
            </label>
          </form>
          <Botao href={novaHref} icone="mais" folha>{t.novaTarefa}</Botao>
        </>}
        abas={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AbasLinks rotulo={t.tarefasTitulo} ativa={vista === "grade" ? "lista" : vista} itens={[
              { id: "lista", rotulo: t.vistaLista, icone: "tarefa", contagem: abertas.length, href: url({ vista: vista === "grade" ? "grade" : "lista" }) },
              { id: "quadro", rotulo: t.vistaQuadro, icone: "filtrar", href: url({ vista: "quadro" }) },
              { id: "agenda", rotulo: t.agenda, icone: "calendario", href: "/agenda" },
            ]} />
            {vista !== "quadro" && <SegmentadoLinks rotulo={t.vistaLista} valor={vista} opcoes={[
              { valor: "lista", rotulo: t.vistaLista, icone: "tarefa", href: url({ vista: "lista" }) },
              { valor: "grade", rotulo: t.vistaGrade, icone: "imagem", href: url({ vista: "grade" }) },
            ]} />}
          </div>
        }
        filtros={<>
          {me && <Chip href={url({ quem: "minhas" })} ativo={quem === "minhas"} icone="pessoa">{t.minhas}</Chip>}
          <Chip href={url({ quem: "equipe" })} ativo={quem === "equipe"} icone="pessoas">{t.minhaEquipe}</Chip>
          <Chip href={url({ quem: "todas" })} ativo={quem === "todas"} icone="tarefa">{t.todas}</Chip>
          {equipes.filter((e) => chaveEquipe(e.id)).map((e) => (
            <Chip key={e.id} tipo="equipe" equipe={e.id} ativo={q.equipe === e.id} href={url({ equipe: q.equipe === e.id ? undefined : e.id })}>{e.nome}</Chip>
          ))}
          {(q.q || q.equipe) && <Chip href={url({ q: undefined, equipe: undefined })} icone="fechar">{t.limparFiltros}</Chip>}
        </>}
      />

      {vista === "quadro" ? (
        <QuadroTarefas novaHref={novaHref} cartoes={[...ordem.tarefas, ...feitasRecentes].map((x) => {
          const eq = equipes.find((e) => e.id === x.equipe);
          return {
            id: x.id, titulo: x.title, status: x.status, equipe: eq?.id, nomeEquipe: chaveEquipe(eq?.id) ? undefined : eq?.nome,
            prazo: x.prazo ? fmtDate(x.prazo, lang) : undefined, vencido: !!x.prazo && x.prazo < hoje, urgente: x.priority === "urgente",
            subtarefas: x.checklist.total ? `${x.checklist.feitos}/${x.checklist.total}` : undefined,
            pessoas: x.responsaveis.map(foto), podeMover: can.editTarefa(user, x),
          };
        })} rotulos={{ colunas: { todo: t.aFazer, doing: t.fazendo, done: t.feito }, moverPara: t.moverPara, abrir: t.abrir, adicionar: t.adicionarTarefa, vazio: t.nadaPendente, arrastar: t.dicaQuadro, mostrarMais: t.mostrarMais }} />
      ) : abertas.length === 0 ? (
        <Empty>{q.q || q.equipe ? t.nenhumResultado : t.nadaPendente}</Empty>
      ) : vista === "grade" ? (
        <GradeBento>
          {ordem.tarefas.slice(0, 60).map((x, i) => {
            const eq = chaveEquipe(x.equipe);
            const vencido = !!x.prazo && x.prazo < hoje;
            // o primeiro (o mais urgente pela ordem inteligente) é o único destaque da tela (regra 5)
            return (
              <Cartao key={x.id} variante={i === 0 ? "destaque" : "padrao"} recorte
                acaoRecorte={<BotaoIcone icone="abrir-fora" aria-label={`${t.abrir}: ${x.title}`} tamanho={44} variante={i === 0 ? "acento" : "tonal"} href={`/tarefas/${x.id}`} />}>
                <span className={`meta flex items-center gap-1.5 ${i === 0 ? "opacity-80" : "text-t3"}`}>
                  {eq && <Selo nome={EQUIPES_DS[eq].selo} tamanho={16} style={i === 0 ? undefined : { color: EQUIPES_DS[eq].cor }} />}
                  <span className="truncate">{equipes.find((e) => e.id === x.equipe)?.nome ?? t.semEquipe}</span>
                </span>
                <Link href={`/tarefas/${x.id}`} className="titulo-cartao line-clamp-3 text-[22px] hover:underline">{x.title}</Link>
                {x.prazo && <span className={`meta inline-flex items-center gap-1.5 ${i === 0 ? "" : vencido ? "font-medium text-err" : "text-t2"}`}><Icone nome="prazo" tamanho={14} />{fmtDate(x.prazo, lang)}</span>}
                <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                  {x.responsaveis.length > 0 ? <GrupoAvatares pessoas={x.responsaveis.map(foto)} tamanho={24} anel={i === 0 ? "bg" : "s1"} /> : <span />}
                  {i !== 0 && <BadgeEstado estado={vencido ? "atrasada" : x.status === "doing" ? "andamento" : "pendente"} />}
                </span>
              </Cartao>
            );
          })}
        </GradeBento>
      ) : (
        <div>
          {GRUPOS.map((g) => {
            const itens = ordem.tarefas.filter(g.dentro);
            return itens.length ? <GrupoTarefas key={g.id} titulo={g.titulo} contagem={itens.length} alerta={g.alerta}>{itens.slice(0, 80).map(linha)}</GrupoTarefas> : null;
          })}
        </div>
      )}
    </>
  );
}
