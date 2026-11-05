import Botao from "@/components/ds/Botao";
import ChipDS, { BadgeEstado } from "@/components/ds/Chip";
import AvatarDS from "@/components/ds/Avatar";
import { chaveEquipe } from "@/components/ds/equipes";
import { EstadoVazio } from "@/components/ds/Estados";
import { BarraProgresso } from "@/components/ds/Progresso";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import { currentUser, getEquipes, getObjetivos, getPessoas, getTarefas, projetosVisiveis, today } from "@/lib/v2/data";
import { BADGE_RITMO, avanco, checkinPendente, ritmo, rotuloAvanco } from "@/lib/v2/objetivos";
import { fmtDate, getT } from "@/lib/v2/i18n";

// Objetivos (DS 10.22): results with a deadline, owner and target; the nearest deadline first.
export default async function Objetivos({ searchParams }: { searchParams: Promise<{ vista?: string; equipe?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const hoje = today();
  const equipes = getEquipes(), projetos = projetosVisiveis(me), tarefas = getTarefas(), pessoas = getPessoas();
  const fechados = q.vista === "fechados";
  const visivel = (projeto: string) => !projeto || projetos.some((p) => p.id === projeto);
  const todos = getObjetivos().filter((o) => visivel(o.projeto) && (fechados ? o.status !== "ativo" : o.status === "ativo"));
  const lista = todos.filter((o) => !q.equipe || o.equipe === q.equipe || o.apoio.includes(q.equipe))
    .sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999") || a.titulo.localeCompare(b.titulo, "pt"));
  const link = (o: Record<string, string | undefined>) => "/objetivos?" + new URLSearchParams(Object.entries({ vista: q.vista, equipe: q.equipe, ...o }).filter(([, v]) => v) as [string, string][]);
  const rot = { de: t.ob.de, marcos: t.ob.marcos, tarefas: t.ob.tarefas };

  return (
    <>
      <div className="-ml-3 mb-2"><Botao href="/projetos" variante="fantasma" tamanho="P" icone="voltar">{t.projetos}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={`${lista.length} ${t.objetivos.toLowerCase()}`} titulo={t.objetivos}
        acoes={me.gestao ? <Botao href="/objetivos/novo" icone="mais" folha>{t.ob.novo}</Botao> : undefined}
        abas={<div className="flex gap-2">
          <ChipDS ativo={!fechados} href={link({ vista: undefined })}>{t.ob.ativos}</ChipDS>
          <ChipDS ativo={fechados} href={link({ vista: "fechados" })}>{t.ob.fechados}</ChipDS>
        </div>}
        filtros={<>
          <ChipDS ativo={!q.equipe} href={link({ equipe: undefined })}>{t.todas}</ChipDS>
          {equipes.filter((e) => !e.contatos).map((e) => <ChipDS tipo={chaveEquipe(e.id) ? "equipe" : "filtro"} equipe={e.id} ativo={q.equipe === e.id} key={e.id} href={link({ equipe: e.id })}>{e.nome}</ChipDS>)}
        </>} />
      {lista.length === 0 && <EstadoVazio selo="broto" titulo={t.ob.nenhum} texto={t.ob.vazioAjuda} />}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((o) => {
          const r = ritmo(o, tarefas, hoje), a = avanco(o, tarefas), resp = pessoas.find((p) => p.id === o.responsavel);
          const projeto = projetos.find((p) => p.id === o.projeto);
          const pendente = !fechados && checkinPendente(o, hoje) && !!me.pessoa && me.pessoa.id === o.responsavel;
          return (
            <li key={o.id} id={o.id} className="scroll-mt-20">
              <Cartao variante="clicavel" href={`/objetivos/${o.id}`} equipe={o.equipe} className="h-full">
                <div className="flex items-start gap-2">
                  <p className="titulo-cartao min-w-0 flex-1">{o.titulo}</p>
                  {o.status === "fechado" ? <BadgeEstado estado="interna">{t.ob.fechado}</BadgeEstado> : <BadgeEstado estado={BADGE_RITMO[r]}>{t.ob.ritmos[r]}</BadgeEstado>}
                </div>
                <p className="meta flex flex-wrap items-center gap-1.5 text-t2">
                  {resp && <><AvatarDS nome={resp.name} tamanho={24} />{resp.name.split(" ")[0]}</>}
                  {o.prazo && <span>· {t.ob.ate} {fmtDate(o.prazo, lang)}</span>}
                  {projeto && <span>· {projeto.nome}</span>}
                </p>
                {a != null && <div className="mt-auto"><BarraProgresso valor={Math.round(a * 100)} rotulo={rotuloAvanco(o, tarefas, rot)} rotuloAcessivel={t.ob.comoMedimos} /></div>}
                {pendente && <span className="meta inline-flex items-center gap-1 font-semibold text-ac-text">{t.ob.checkin} →</span>}
              </Cartao>
            </li>
          );
        })}
      </ul>
    </>
  );
}
