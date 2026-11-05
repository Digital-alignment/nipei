import Link from "next/link";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { BadgeEstado, type EstadoBadge } from "@/components/ds/Chip";
import { EstadoVazio } from "@/components/ds/Estados";
import Selo from "@/components/ds/Selo";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import { ToastAoAbrir } from "@/components/ds/Toast";
import { currentUser, estadoPedido, getEquipes, getPessoas, getTarefas, today, type Tarefa } from "@/lib/v2/data";
import { pedidosNovos } from "@/lib/v2/pedidos";
import { fmtDate, getT } from "@/lib/v2/i18n";

// Pedidos (DS 10.14): para as equipes que eu coordeno (escolher quem faz) e os que eu fiz (com o estado).
export default async function Pedidos({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const hoje = today();
  const equipes = getEquipes(), pessoas = getPessoas(), tarefas = getTarefas();
  const minhasEq = equipes.filter((e) => !e.contatos && (me.gestao ? me.coordena.includes(e.id) || e.gestao : me.coordena.includes(e.id)));
  const paraMim = minhasEq.flatMap((e) => pedidosNovos(tarefas, e.id));
  const meus = me.pessoa ? tarefas.filter((x) => x.pedidoPor === me.pessoa!.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 30) : [];
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" ")[0] ?? id;
  const badge: Record<ReturnType<typeof estadoPedido>, [EstadoBadge, string]> = {
    pendente: ["pendente", t.eq.novo], andamento: ["andamento", t.eq.atribuidoA], feita: ["feita", t.eq.feito], atrasada: ["atrasada", t.eq.atrasado], recusado: ["interna", t.eq.recusado],
  };

  const Linha = ({ x, meu }: { x: Tarefa; meu: boolean }) => {
    const e = equipes.find((y) => y.id === x.equipe), k = chaveEquipe(x.equipe);
    const est = estadoPedido(x, hoje), [b, rot] = badge[est];
    return (
      <li className="rounded-cartao bg-s1 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <BadgeEstado estado={b}>{est === "andamento" ? `${rot} ${x.responsaveis.map(nome).join(", ")}` : rot}</BadgeEstado>
          <Link href={meu || est !== "pendente" ? `/tarefas/${x.id}` : `/equipes/${x.equipe}?aba=pedidos`} className="titulo-cartao min-w-0 flex-1 hover:underline">{x.title}</Link>
        </div>
        <p className="meta mt-1 flex flex-wrap items-center gap-1.5 text-t2">
          {k && <Selo nome={EQUIPES_DS[k].selo} tamanho={14} style={{ color: EQUIPES_DS[k].cor }} />}{e?.nome ?? x.equipe}
          {!meu && <> · {nome(x.pedidoPor)} {t.eq.pedidoPor}</>}
          {x.criadoEm && <> · {fmtDate(x.criadoEm.slice(0, 10), lang)}</>}
          {x.prazo && <> · {t.eq.ate} {fmtDate(x.prazo, lang)}</>}
        </p>
        {x.pedidoRecusado && <p className="meta mt-1 text-t2">{t.eq.motivo}: {x.pedidoRecusado}</p>}
      </li>
    );
  };

  return (
    <>
      <CabecalhoPagina selo="mao" rotulo={t.equipes} titulo={t.eq.pedidos} subtitulo={t.eq.pedidosAjuda}
        acoes={<Botao href="/pedidos/novo" icone="enviar" folha>{t.eq.pedirAlgo}</Botao>} />
      {minhasEq.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2"><span className="titulo-secao">{t.eq.paraMinhas}</span><span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{paraMim.length}</span></h2>
          {paraMim.length ? <ul className="grid gap-2">{paraMim.map((x) => <Linha key={x.id} x={x} meu={false} />)}</ul> : <EstadoVazio compacto titulo={t.eq.semPedidos} />}
        </section>
      )}
      <section>
        <h2 className="mb-3 flex items-center gap-2"><span className="titulo-secao">{t.eq.meusPedidos}</span><span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{meus.length}</span></h2>
        {meus.length ? <ul className="grid gap-2">{meus.map((x) => <Linha key={x.id} x={x} meu />)}</ul>
          : <EstadoVazio selo="mao" titulo={t.eq.semMeus} texto={t.eq.pedidosAjuda} acao={<Botao href="/pedidos/novo" icone="enviar" tamanho="M">{t.eq.pedirAlgo}</Botao>} />}
      </section>
      <ToastAoAbrir texto={q.enviado ? t.eq.pedidoEnviado : undefined} parametro="enviado" />
    </>
  );
}
