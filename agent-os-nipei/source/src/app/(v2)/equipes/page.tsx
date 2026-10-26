import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import Selo from "@/components/ds/Selo";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import Icone from "@/components/ds/Icone";
import { Avatar } from "@/components/v2/ui";
import { currentUser, getEquipes, getObjetivos, getPessoas, getTarefas, today, type Equipe } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

const menos = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

export default async function Equipes() {
  const { t } = await getT();
  const me = (await currentUser())!;
  const hoje = today();
  const tarefas = getTarefas(), objetivos = getObjetivos(), pessoas = getPessoas();
  const pessoa = (id: string) => pessoas.find((p) => p.id === id);
  const equipes = getEquipes();
  const minhas = equipes.filter((e) => me.coordena.includes(e.id) || (me.pessoa && e.membros.includes(me.pessoa.id)));
  const outras = equipes.filter((e) => !minhas.includes(e));
  const semEquipe = tarefas.filter((x) => !x.equipe && x.status !== "done").length;

  const Cartao = ({ e }: { e: Equipe }) => {
    const ts = tarefas.filter((x) => x.equipe === e.id);
    const abertas = ts.filter((x) => x.status !== "done");
    const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
    const semDono = abertas.filter((x) => !x.responsaveis.length).length;
    const feitas = ts.filter((x) => x.concluidoEm && x.concluidoEm.slice(0, 10) > menos(hoje, 30)).length;
    const pessoasEq = [...new Set([...e.coordenadores, ...e.membros])];
    const emDia = abertas.length ? Math.round(((abertas.length - atrasadas) / abertas.length) * 100) : 100;
    return (
      <li className="relative rounded-cartao bg-s1 overflow-hidden ">
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-pilula" style={{ background: chaveEquipe(e.id) ? EQUIPES_DS[chaveEquipe(e.id)!].cor : "var(--s4)" }} />
        <Link href={`/equipes/${e.id}`} className="block p-4 pl-5">
          <div className="flex items-start gap-2">
            <p className="titulo-cartao flex flex-1 items-center gap-2">{chaveEquipe(e.id) && <Selo nome={EQUIPES_DS[chaveEquipe(e.id)!].selo} tamanho={22} style={{ color: EQUIPES_DS[chaveEquipe(e.id)!].cor }} />}{e.nome}</p>
            {me.gestao && !e.acesso && <span title={t.acessoDesligado} className="text-t3"><Icone nome="cadeado"  tamanho={14} /></span>}
            {me.gestao && e.avisos && <span title={t.avisosEquipeLigado} className="text-t3"><Icone nome="notificacao"  tamanho={14} /></span>}
          </div>
          <div className="flex items-center mt-3">
            <span className="flex -space-x-1.5">
              {pessoasEq.slice(0, 6).map((id) => { const p = pessoa(id); return p && <span key={id} className="rounded-pilula ring-2 ring-s1"><Avatar name={p.name} size={26} src={p.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined} /></span>; })}
            </span>
            {pessoasEq.length > 6 && <span className="ml-1.5 text-xs text-t2">+{pessoasEq.length - 6}</span>}
            <span className="ml-auto text-xs text-t2">{e.coordenadores.map((c) => pessoa(c)?.name.split(" ")[0]).filter(Boolean).join(", ")}</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-3 text-center">
            {[[abertas.length, t.abertasLbl, ""], [atrasadas, t.atrasadasLbl, atrasadas ? "text-err" : ""], [semDono, t.semDonoLbl, semDono ? "text-warn" : ""], [feitas, t.feitas30, ""]].map(([v, l, c]) => (
              <div key={String(l)} className="rounded-interno bg-s2 py-1.5">
                <p className={`font-display text-xl font-light tabular-nums ${c}`}>{v}</p>
                <p className="text-xs text-t2 leading-tight">{l}</p>
              </div>
            ))}
          </div>
          {abertas.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-t2">
              <div className="flex-1"><BarraProgresso valor={emDia} rotulo={`${emDia}% ${t.emDiaLbl}`} rotuloAcessivel={t.emDiaLbl} /></div>
            </div>
          )}
          <p className="mt-2 text-xs text-t2">{objetivos.filter((o) => o.equipe === e.id).length} {t.objetivos.toLowerCase()}{e.areas.length ? ` · ${e.areas.length} ${t.areasLbl}` : ""}</p>
        </Link>
      </li>
    );
  };

  const Grade = ({ titulo, lista }: { titulo?: string; lista: Equipe[] }) => lista.length ? (
    <>
      {titulo && <h2 className="titulo-secao mb-3">{titulo}</h2>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-6">{lista.map((e) => <Cartao key={e.id} e={e} />)}</ul>
    </>
  ) : null;

  return (
    <>
      <CabecalhoPagina selo="broto" rotulo={`${equipes.length} ${t.equipes.toLowerCase()}`} titulo={t.equipes}
        acoes={<Botao href="/pessoas" variante="tonal" icone="pessoas" tamanho="M">{`${t.pessoas} · ${pessoas.filter((p) => p.equipes.length).length}`}</Botao>} />
      {minhas.length && outras.length ? (<><Grade titulo={t.minhasEquipes} lista={minhas} /><Grade titulo={t.outrasEquipes} lista={outras} /></>) : <Grade lista={equipes} />}
      {semEquipe > 0 && (
        <Link href="/equipes/sem-equipe" className="anel-foco hachurado flex min-h-12 items-center justify-between rounded-cartao px-4 font-texto text-[15px] font-medium text-t1">
          <span>{t.semEquipe}</span><span className="text-warn tabular-nums">{semEquipe} {t.tarefasAbertas.toLowerCase()}</span>
        </Link>
      )}
    </>
  );
}
