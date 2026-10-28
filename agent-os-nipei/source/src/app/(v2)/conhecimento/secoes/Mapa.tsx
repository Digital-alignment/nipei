import Link from "next/link";
import Selo from "@/components/ds/Selo";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import { mapaConhecimento } from "@/lib/v2/conhecimento";
import type { Ctx } from "./index";

/**
 * Knowledge map as a heat table: teams × projects (+ "no team" / "no project" = the gaps). Number = confirmed
 * facts (stronger accent = more), "+N" hatched = still to review, "·" = nothing yet. Each cell opens the base
 * filtered. Data comes from mapaConhecimento() (nodes + links), which an interactive graph can reuse as is.
 */
export default function Mapa({ ctx }: { ctx: Ctx }) {
  const { t } = ctx;
  const { nos, ligacoes } = mapaConhecimento();
  const linhas = nos.filter((n) => n.tipo === "equipe" && (n.id !== "e:-" || n.confirmados + n.pendentes > 0));
  const colunas = nos.filter((n) => n.tipo === "projeto" && (n.id !== "p:-" || n.confirmados + n.pendentes > 0));
  const celula = (e: string, p: string) => ligacoes.find((l) => l.de === e && l.para === p) ?? { confirmados: 0, pendentes: 0 };
  const max = Math.max(1, ...linhas.flatMap((e) => colunas.map((p) => celula(e.id, p.id).confirmados)));
  const nome = (n: (typeof nos)[number]) => n.nome || (n.tipo === "equipe" ? t.semEquipeFato : t.semProjeto);
  const href = (e: string, p: string) => `/conhecimento?equipe=${encodeURIComponent(e.slice(2))}&projeto=${encodeURIComponent(p.slice(2))}#base`;

  return (
    <div className="grid gap-3">
      <p className="meta text-t2">{t.mapaAjuda}</p>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-max border-separate border-spacing-1">
          <thead>
            <tr>
              <th scope="col" className="sr-only">{t.equipe}</th>
              {colunas.map((p) => (
                <th key={p.id} scope="col" className="max-w-28 px-1 pb-1 text-left align-bottom">
                  <span className="meta block font-semibold text-t2">{nome(p)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((e) => {
              const eq = chaveEquipe(e.id.slice(2));
              return (
                <tr key={e.id}>
                  <th scope="row" className="sticky left-0 z-10 bg-bg pr-2 text-left">
                    <span className="inline-flex max-w-40 items-center gap-1.5 font-texto text-sm font-medium text-t1 md:max-w-60">
                      {eq && <Selo nome={EQUIPES_DS[eq].selo} tamanho={18} style={{ color: EQUIPES_DS[eq].cor }} />}
                      <span className="truncate">{nome(e)}</span>
                    </span>
                  </th>
                  {colunas.map((p) => {
                    const c = celula(e.id, p.id);
                    const vazio = !c.confirmados && !c.pendentes;
                    const forca = c.confirmados ? 18 + Math.round((c.confirmados / max) * 72) : 0; // % of accent mixed into the surface
                    const rotulo = `${nome(e)} · ${nome(p)}: ${c.confirmados} ${t.fatosConfirmadosMin}${c.pendentes ? `, ${c.pendentes} ${t.fatosParaRevisar}` : ""}`;
                    return (
                      <td key={p.id} className="p-0">
                        {vazio ? (
                          <span aria-label={rotulo} className="grid h-12 min-w-16 place-items-center rounded-interno bg-s1 text-t3">·</span>
                        ) : (
                          <Link href={href(e.id, p.id)} aria-label={rotulo} title={rotulo}
                            className="anel-foco grid h-12 min-w-16 place-items-center rounded-interno px-2 font-texto text-sm font-semibold tabular-nums transition-[filter] hover:brightness-110"
                            style={{ background: c.confirmados ? `color-mix(in srgb, var(--ac) ${forca}%, var(--s2))` : "var(--s2)", color: forca >= 55 ? "var(--ac-ink)" : "var(--t1)" }}>
                            <span className="inline-flex items-center gap-1">
                              {c.confirmados || ""}
                              {c.pendentes > 0 && <span className="hachurado rounded-pilula px-1.5 text-xs font-medium text-t1">+{c.pendentes}</span>}
                            </span>
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
