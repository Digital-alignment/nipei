import Icone from "@/components/ds/Icone";
import { presencaAction } from "@/app/(v2)/actions";
import type { Dict } from "@/lib/v2/i18n";

const ESTILO: Record<string, string> = {
  s: "bg-ac-soft text-ac-text",
  r: "bg-s3 text-t1",
  f: "hachurado text-t2 shadow-[inset_0_0_0_1px_var(--s4)]",
  "": "bg-s2 text-t3",
};

// "Onde estou esta semana" (DS 10.18): 7 pills, Monday first; a tap cycles — → Santuário → Remoto → Fora.
// Each pill is its own tiny form (works without JavaScript); today has the accent ring.
export default function SemanaPresenca({ pessoa, dias, hojeIdx, t, editar }: { pessoa: string; dias: string[]; hojeIdx: number; t: Dict; editar: boolean }) {
  const tr = t.rot;
  return (
    <ul className="grid grid-cols-7 gap-1.5" aria-label={tr.ondeEstou}>
      {dias.map((d, i) => {
        const conteudo = (
          <>
            <span className="text-xs font-semibold">{tr.diasCurtos[i]}</span>
            {d === "s" ? <Icone nome="inicio" tamanho={16} /> : d === "r" ? <Icone nome="mensagem" tamanho={16} /> : d === "f" ? <Icone nome="fechar" tamanho={16} /> : <span className="h-4" aria-hidden="true">—</span>}
            <span className="hidden w-full truncate text-center text-xs sm:block">{d ? tr.estados[d] : ""}</span>
          </>
        );
        const cls = `flex min-h-16 w-full flex-col items-center justify-center gap-0.5 rounded-interno px-0.5 py-1.5 font-texto ${ESTILO[d] ?? ESTILO[""]} ${i === hojeIdx ? "ring-2 ring-ac" : ""}`;
        return (
          <li key={i}>
            {editar ? (
              <form action={presencaAction}>
                <input type="hidden" name="pessoa" value={pessoa} /><input type="hidden" name="dia" value={i} />
                <button type="submit" className={`anel-foco ${cls} transition-colors hover:brightness-110`} aria-label={`${tr.dias[i]}: ${tr.estados[d]}. ${tr.tocarParaMudar}`}>{conteudo}</button>
              </form>
            ) : <span className={cls} aria-label={`${tr.dias[i]}: ${tr.estados[d]}`}>{conteudo}</span>}
          </li>
        );
      })}
    </ul>
  );
}
