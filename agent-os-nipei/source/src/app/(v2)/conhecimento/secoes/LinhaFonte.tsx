import Link from "next/link";
import Icone from "@/components/ds/Icone";
import { BarraProgresso } from "@/components/ds/Progresso";
import { diaLocal, type Fonte } from "@/lib/v2/conhecimento";
import { fmtDate } from "@/lib/v2/i18n";
import type { Ctx } from "./index";

/** One source: who sent it, when, state, and how much of it is already reviewed. */
export default function LinhaFonte({ f, ctx }: { f: Fonte; ctx: Ctx }) {
  const { t, lang, nome } = ctx;
  const { pendentes, revisados, total } = ctx.porFonte(f.id);
  return (
    <li className="border-t border-s2 first:border-t-0">
      <Link href={`/conhecimento/${f.id}`} className="anel-foco flex items-center gap-3 rounded-interno px-3 py-3 transition-colors hover:bg-s2">
        <span className={`grid size-10 shrink-0 place-items-center rounded-pilula ${f.status === "erro" ? "bg-err-bg text-err" : "bg-s2 text-t2"}`}>
          <Icone nome={f.status === "erro" ? "erro" : f.url ? "abrir-fora" : "tarefa"} tamanho={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-texto text-[15px] font-medium text-t1">{f.titulo || f.url || "…"}</p>
          <p className="meta text-t3">
            {nome(f.enviadoPor)} · {fmtDate(diaLocal(f.enviadoEm), lang)}{f.acervo && ` · ${t.doAcervo}`} · {" "}
            {f.status === "processando" ? t.processando : f.status === "erro" ? <span className="text-err">{t.erroFonte}</span>
              : pendentes.length ? <span className="font-semibold text-warn">{pendentes.length} {t.fatosPropostos}</span> : t.pronta}
          </p>
          {total > 0 && <div className="mt-1.5 max-w-60"><BarraProgresso valor={revisados} max={total} planejado rotulo={`${revisados}/${total}`} rotuloAcessivel={t.revisados} /></div>}
        </div>
        <Icone nome="avancar" tamanho={16} className="shrink-0 text-t3" />
      </Link>
    </li>
  );
}
