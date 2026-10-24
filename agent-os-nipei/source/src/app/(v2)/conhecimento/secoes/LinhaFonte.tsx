import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { diaLocal, type Fonte } from "@/lib/v2/conhecimento";
import { fmtDate } from "@/lib/v2/i18n";
import type { Ctx } from "./index";

/** One source: who sent it, when, state, and how much of it is already reviewed. */
export default function LinhaFonte({ f, ctx }: { f: Fonte; ctx: Ctx }) {
  const { t, lang, nome } = ctx;
  const { pendentes, revisados, total } = ctx.porFonte(f.id);
  return (
    <li>
      <Link href={`/conhecimento/${f.id}`} className="flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{f.titulo || f.url || "…"}</p>
          <p className="text-xs text-neutral-500">
            {nome(f.enviadoPor)} · {fmtDate(diaLocal(f.enviadoEm), lang)} · {" "}
            {f.status === "processando" ? t.processando : f.status === "erro" ? <span className="text-red-600">{t.erroFonte}</span>
              : pendentes.length ? <span className="text-amber-700 dark:text-amber-400">{pendentes.length} {t.fatosPropostos}</span> : t.pronta}
          </p>
          {total > 0 && (
            <span className="mt-1.5 flex items-center gap-2" title={`${revisados}/${total} ${t.revisados}`}>
              <span className="h-1 flex-1 max-w-40 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden"><span className="block h-full bg-green-600" style={{ width: `${(revisados / total) * 100}%` }} /></span>
              <span className="text-[11px] text-neutral-400 tabular-nums">{revisados}/{total}</span>
            </span>
          )}
        </div>
        <ChevronRight size={16} className="text-neutral-400 shrink-0" />
      </Link>
    </li>
  );
}
