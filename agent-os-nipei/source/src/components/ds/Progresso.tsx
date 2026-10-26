import type { ReactNode } from "react";

// Progresso (DESIGN-SYSTEM.md seção 9.16). Hachurado = planejado (regra 6), sólido = feito.

/**
 * Barra de 6 px em pílula. `planejado`: o resto da barra é hachurado (meta planejada). `segmentos`: uma peça
 * por item (subtarefas), `valor` delas preenchidas. `marcador`: bolinha no fim + etiqueta (texto ou "N%").
 * `variante="info"` = envio/upload. `rotulo` aparece à direita (padrão: nada).
 */
export function BarraProgresso({ valor, max = 100, planejado, segmentos, marcador, variante = "acento", rotulo, rotuloAcessivel }: {
  valor: number; max?: number; planejado?: boolean; segmentos?: number; marcador?: boolean | string; variante?: "acento" | "info"; rotulo?: ReactNode; rotuloAcessivel?: string;
}) {
  const p = max > 0 ? Math.max(0, Math.min(1, valor / max)) : 0;
  const cor = variante === "info" ? "bg-info" : "bg-ac";
  const a11y = { role: "progressbar" as const, "aria-valuemin": 0, "aria-valuemax": segmentos ?? max, "aria-valuenow": valor, "aria-label": rotuloAcessivel };
  const barra = segmentos ? (
    <span className="flex flex-1 gap-1" {...a11y}>
      {Array.from({ length: segmentos }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-pilula ${i < valor ? cor : "hachurado"}`} />)}
    </span>
  ) : (
    <span className={`relative h-1.5 flex-1 rounded-pilula ${planejado ? "hachurado" : "bg-s3"}`} {...a11y}>
      <span className={`absolute inset-y-0 left-0 rounded-pilula ${cor}`} style={{ width: `${p * 100}%` }}>
        {marcador && (
          <>
            <span aria-hidden="true" className="absolute -right-1.5 -top-1 size-3.5 rounded-pilula bg-t1 ring-[3px] ring-bg" />
            <span className="absolute -right-5 -top-7 whitespace-nowrap rounded-pilula bg-ac px-2 py-0.5 text-xs font-semibold text-ac-ink">{typeof marcador === "string" ? marcador : `${Math.round(p * 100)}%`}</span>
          </>
        )}
      </span>
    </span>
  );
  return (
    <span className={`flex items-center gap-2.5 ${marcador ? "pt-7" : ""}`}>
      {barra}
      {rotulo != null && <span className="meta shrink-0 text-t2">{rotulo}</span>}
    </span>
  );
}

const TRACO: Record<number, number> = { 140: 10, 72: 7, 48: 5, 24: 3 };
const FONTE: Record<number, string> = { 140: "text-[40px]", 72: "text-[22px]", 48: "text-[15px]", 24: "" };

/** Anel de progresso (140 · 72 · 48 · 24); número display no centro (o de 24 é só o anel, para dentro de linhas). */
export function AnelProgresso({ valor, max = 100, tamanho = 72, rotulo, centro }: {
  valor: number; max?: number; tamanho?: 140 | 72 | 48 | 24; rotulo?: string; centro?: ReactNode;
}) {
  const p = max > 0 ? Math.max(0, Math.min(1, valor / max)) : 0;
  const w = TRACO[tamanho], r = (tamanho - w) / 2, c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: tamanho, height: tamanho }}
      role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor} aria-label={rotulo}>
      <svg width={tamanho} height={tamanho} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={w} style={{ stroke: "var(--s3)" }} />
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={w} strokeLinecap="round" style={{ stroke: "var(--ac)" }} strokeDasharray={`${c * p} ${c}`} />
      </svg>
      {tamanho > 24 && <span className={`relative font-display font-extralight tabular-nums text-t1 ${FONTE[tamanho]}`}>{centro ?? <>{Math.round(p * 100)}<span className="text-t3">%</span></>}</span>}
    </span>
  );
}

/** Semana em anéis: um anel por dia; hoje em pílula tonal. */
export function SemanaAneis({ dias }: { dias: { rotulo: string; valor: number; max?: number; hoje?: boolean }[] }) {
  return (
    <div className="inline-flex max-w-full gap-1.5 overflow-x-auto rounded-pilula bg-s1 p-2.5">
      {dias.map((d, i) => (
        <span key={i} className={`flex flex-col items-center gap-1 rounded-pilula px-1 py-1.5 ${d.hoje ? "bg-s3" : ""}`}>
          <AnelProgresso valor={d.valor} max={d.max} tamanho={24} rotulo={`${d.rotulo}: ${d.valor}${d.max ? ` de ${d.max}` : "%"}`} />
          <span className={`text-xs font-medium ${d.hoje ? "text-t1" : "text-t3"}`}>{d.rotulo}</span>
        </span>
      ))}
    </div>
  );
}
