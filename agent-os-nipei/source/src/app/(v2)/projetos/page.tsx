import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao from "@/components/ds/Botao";
import { BarraProgresso } from "@/components/ds/Progresso";
import Icone from "@/components/ds/Icone";
import { getEquipes, getObjetivos, getProjetos, getTarefas, today } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";

export default async function Projetos() {
  const { t, lang } = await getT();
  const hoje = today();
  const equipes = getEquipes(), tarefas = getTarefas(), objetivos = getObjetivos();
  const ano = Number(hoje.slice(0, 4));
  const doAno = objetivos.filter((o) => o.ano === ano).length;

  return (
    <>
      <CabecalhoPagina selo="broto" rotulo={`${getProjetos().length} ${t.projetos.toLowerCase()}`} titulo={t.projetos}
        acoes={<Botao href={`/objetivos?ano=${ano}`} variante="tonal" icone="sucesso" tamanho="M">{`${t.objetivos} · ${doAno}`}</Botao>} />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {getProjetos().map((p) => {
          const ts = tarefas.filter((x) => x.projeto === p.id);
          const abertas = ts.filter((x) => x.status !== "done");
          const atrasadas = abertas.filter((x) => x.prazo && x.prazo < hoje).length;
          const feitas = ts.length - abertas.length;
          const pct = ts.length ? Math.round((feitas / ts.length) * 100) : 0;
          const objs = objetivos.filter((o) => o.projeto === p.id).length;
          const ultima = p.atualizacoes[0]?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
          return (
            <li key={p.id}>
              <Link href={`/projetos/${p.id}`} className="group flex flex-col h-full rounded-cartao bg-s1 p-4 ">
                <div className="flex items-start gap-2">
                  <p className="font-semibold leading-snug flex-1">{p.nome}</p>
                  <Icone nome="avancar"  tamanho={18} className="text-t3 group-hover:text-t2 shrink-0" />
                </div>
                {p.descricao && <p className="text-xs text-t2 mt-1 line-clamp-2">{p.descricao}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.equipes.map((id) => { const e = equipes.find((x) => x.id === id); return e && (
                    <span key={id} className="inline-flex items-center gap-1 rounded-pilula bg-s2 px-2 py-0.5 text-xs text-t2">
                      <span className="w-1.5 h-1.5 rounded-pilula" style={{ background: e.cor }} />{e.nome}
                    </span>
                  ); })}
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 text-xs text-t2 mb-1.5">
                    <span className="tabular-nums">{abertas.length} {t.abertasLbl}</span>
                    {atrasadas > 0 && <span className="text-err tabular-nums">{atrasadas} {t.atrasadasLbl}</span>}
                    {objs > 0 && <span className="tabular-nums">· {objs} {t.objetivos.toLowerCase()}</span>}
                    <span className="ml-auto tabular-nums">{pct}%</span>
                  </div>
                  <BarraProgresso valor={pct} planejado rotuloAcessivel={t.concluidoLbl} />
                  {ultima && <p className="text-xs text-t3 mt-2">{t.atualizadoEm} {fmtDate(ultima, lang)}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
