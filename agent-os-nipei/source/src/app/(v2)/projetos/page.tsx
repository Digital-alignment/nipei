import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import Chip, { BadgeEstado, type EstadoBadge } from "@/components/ds/Chip";
import AvatarDS from "@/components/ds/Avatar";
import SecaoRecolhivel from "@/components/ds/SecaoRecolhivel";
import { Sparkline } from "@/components/ds/padroes/Tabela";
import { chaveEquipe } from "@/components/ds/equipes";
import { can, currentUser, getEquipes, getObjetivos, getPessoas, getTarefas, PROJETO_ESTADOS, projetosVisiveis, today, type Projeto } from "@/lib/v2/data";
import { PARADO_DIAS, diasParado, noPrazoProjeto } from "@/lib/v2/projetos";
import { getT } from "@/lib/v2/i18n";

const BADGE: Record<Projeto["status"], EstadoBadge> = { ativo: "andamento", ideia: "pendente", pausado: "interna", concluido: "feita" };

// Portfolio (DS 10.21): projects grouped by status, each with lead, teams, numbers, on-time trend and "stalled".
export default async function Projetos() {
  const { t } = await getT();
  const me = (await currentUser())!;
  const hoje = today();
  const equipes = getEquipes(), tarefas = getTarefas(), pessoas = getPessoas(), projetos = projetosVisiveis(me);
  const ano = Number(hoje.slice(0, 4));
  const ativosObj = getObjetivos().filter((o) => o.status === "ativo").length;
  const semProjeto = tarefas.filter((x) => x.status !== "done" && !x.projeto && can.editTarefa(me, x)).length;

  const Card = ({ p }: { p: Projeto }) => {
    const abertas = tarefas.filter((x) => x.projeto === p.id && x.status !== "done");
    const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length, semDono = abertas.filter((x) => !x.responsaveis.length).length;
    const pontos = noPrazoProjeto(tarefas, p.id, hoje).filter((x): x is number => x != null);
    const parado = p.status === "ativo" ? diasParado(p, tarefas, hoje) : null;
    const lider = pessoas.find((x) => x.id === p.lider);
    return (
      <li>
        <Cartao variante="clicavel" href={`/projetos/${p.id}`} className="h-full">
          <div className="flex items-start gap-2">
            <p className="titulo-cartao min-w-0 flex-1">{p.nome}</p>
            {p.privado && <BadgeEstado estado="interna">{t.pj.privadoCurto}</BadgeEstado>}
            <BadgeEstado estado={BADGE[p.status]}>{t.pj.estados[p.status]}</BadgeEstado>
          </div>
          {(p.sobre.objetivo || p.descricao) && <p className="meta line-clamp-2 text-t2">{p.sobre.objetivo || p.descricao}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {lider && <span className="meta inline-flex items-center gap-1.5 text-t2"><AvatarDS nome={lider.name} tamanho={24} />{lider.name.split(" ")[0]}</span>}
            {p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && <Chip key={id} tipo={chaveEquipe(id) ? "equipe" : "metadado"} equipe={id}>{e.nome}</Chip>; })}
          </div>
          <p className="meta mt-auto text-t2">
            {abertas.length} {t.abertasLbl}
            {atrasadas > 0 && <span className="text-err"> · {atrasadas} {t.atrasadasLbl}</span>}
            {semDono > 0 && <span className="text-warn"> · {semDono} {t.semDonoLbl}</span>}
          </p>
          <div className="flex items-center gap-2">
            {pontos.length >= 2 ? <><Sparkline pontos={pontos} rotulo={`${t.eq.noPrazo}: ${pontos.join("%, ")}%`} /><span className="meta text-t2">{t.eq.noPrazo}</span></> : <span className="meta text-t3">{t.eq.semHistorico}</span>}
            {parado != null && parado >= PARADO_DIAS && <span className="ml-auto"><BadgeEstado estado="aviso">{t.pj.parado.replace("{n}", String(parado))}</BadgeEstado></span>}
          </div>
        </Cartao>
      </li>
    );
  };
  const grade = (lista: Projeto[]) => <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{lista.map((p) => <Card key={p.id} p={p} />)}</ul>;
  const por = (s: Projeto["status"]) => projetos.filter((p) => p.status === s).sort((a, b) => a.nome.localeCompare(b.nome, "pt"));

  return (
    <>
      <CabecalhoPagina selo="broto" rotulo={`${projetos.length} ${t.projetos.toLowerCase()}`} titulo={t.projetos}
        acoes={<>
          <Botao href="/objetivos" variante="tonal" icone="sucesso" tamanho="M">{`${t.objetivos} · ${ativosObj}`}</Botao>
          {me.gestao && <Botao href="/projetos/novo" icone="mais" folha>{t.pj.novo}</Botao>}
        </>}
        filtros={semProjeto > 0 ? <Botao href="/projetos/sem-projeto" variante="tonal" tamanho="P" icone="filtrar">{`${semProjeto} ${t.pj.semProjeto}`}</Botao> : undefined} />
      {PROJETO_ESTADOS.map((s) => {
        const lista = por(s);
        if (!lista.length) return null;
        return s === "ativo" || s === "ideia"
          ? <section key={s} className="mb-6"><h2 className="titulo-secao mb-3">{t.pj.grupos[s]} <span className="meta text-t3">{lista.length}</span></h2>{grade(lista)}</section>
          : <SecaoRecolhivel key={s} id={`projetos-${s}`} titulo={t.pj.grupos[s]} contagem={lista.length} aberto={false}>{grade(lista)}</SecaoRecolhivel>;
      })}
    </>
  );
}
