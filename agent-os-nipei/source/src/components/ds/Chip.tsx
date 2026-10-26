import Link from "next/link";
import type { ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";
import Selo from "./Selo";
import { EQUIPES_DS, chaveEquipe } from "./equipes";

// Chip, contagem e badge de estado (DESIGN-SYSTEM.md seções 9.6 e 9.7).

export type TipoChip = "filtro" | "equipe" | "metadado" | "pinu";

/**
 * - filtro: pílula s2 + ícone + texto + contagem; ativo = s3 + contorno interno + ✓ em acento.
 * - equipe: selo na cor da equipe + nome; ativo = anel de 1,5 px na cor da equipe. `equipe` aceita a chave
 *   (escritorio…), o id do vault (equipe_1…) ou a cor antiga.
 * - metadado: menor, s3, ícone 14 (prioridade, prazo, subtarefas, comentários) — dentro de cartões.
 * - pinu: sugerido pelo Pinu (fundo verde suave + mini-anel + texto em acento).
 * Com `href` vira link; com `onClick`, botão; senão, só rótulo. Visual de 36 px com área de toque de 44.
 */
export default function Chip({ tipo = "filtro", icone, ativo, contagem, equipe, href, onClick, children, className }: {
  tipo?: TipoChip; icone?: NomeIcone; ativo?: boolean; contagem?: number; equipe?: string; href?: string; onClick?: () => void; children: ReactNode; className?: string;
}) {
  const eq = tipo === "equipe" ? chaveEquipe(equipe) : undefined;
  const clicavel = !!(href || onClick);
  const meta = tipo === "metadado";
  const base = `relative inline-flex shrink-0 items-center whitespace-nowrap rounded-pilula font-texto transition-colors duration-150 ${meta ? "h-7 gap-1.5 px-2.5 text-[13px]" : "h-9 gap-2 pl-3 pr-3.5 text-sm font-medium"} ${clicavel ? "anel-foco cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']" : ""}`;
  const cor =
    tipo === "pinu" ? "bg-ac-soft text-ac-text"
    : meta ? "bg-s3 text-t2"
    : ativo ? `bg-s3 text-t1 ${tipo === "filtro" ? "ring-1 ring-inset ring-s4" : ""}`
    : `bg-s2 text-t2 ${clicavel ? "hover:bg-s3 hover:text-t1" : ""}`;
  const estilo = eq && ativo ? { boxShadow: `inset 0 0 0 1.5px ${EQUIPES_DS[eq].cor}` } : undefined;
  const dentro = (
    <>
      {tipo === "pinu" ? <span className="mini-anel scale-75" aria-hidden="true" />
        : eq ? <Selo nome={EQUIPES_DS[eq].selo} tamanho={20} style={{ color: EQUIPES_DS[eq].cor }} />
        : tipo === "filtro" && ativo ? <Icone nome="confirmar" tamanho={16} className="text-ac-text" />
        : icone ? <Icone nome={icone} tamanho={meta ? 14 : 16} /> : null}
      <span>{children}</span>
      {contagem != null && <span className="rounded-pilula bg-s1 px-1.5 text-xs text-t2 tabular-nums">{contagem}</span>}
    </>
  );
  const cls = `${base} ${cor} ${className ?? ""}`;
  if (href) return <Link href={href} aria-current={ativo ? "true" : undefined} className={cls} style={estilo}>{dentro}</Link>;
  if (onClick) return <button type="button" aria-pressed={ativo} onClick={onClick} className={cls} style={estilo}>{dentro}</button>;
  return <span className={cls} style={estilo}>{dentro}</span>;
}

/**
 * Contagem no canto de um ícone (seção 9.7): círculo vermelho com número, ou só ponto sem `valor`.
 * O pai precisa de `relative`. O anel tem a cor do fundo (`anel`, padrão = fundo da página).
 */
export function Contagem({ valor, rotulo, anel = "bg" }: { valor?: number; rotulo?: string; anel?: "bg" | "s1" | "s2" }) {
  const ring = anel === "s1" ? "ring-s1" : anel === "s2" ? "ring-s2" : "ring-bg";
  if (valor == null) return <span className={`absolute right-1 top-1 size-2.5 rounded-pilula bg-err ring-[3px] ${ring}`}><span className="sr-only">{rotulo ?? "novidade"}</span></span>;
  return (
    <span className={`absolute -right-1 -top-0.5 h-5 min-w-5 rounded-pilula bg-err px-1.5 text-center font-texto text-xs font-bold leading-5 text-ac-ink tabular-nums ring-[3px] ${ring}`}>
      {valor > 99 ? "99+" : valor}{rotulo && <span className="sr-only"> {rotulo}</span>}
    </span>
  );
}

export type EstadoBadge = "pendente" | "andamento" | "feita" | "atrasada" | "interna";
const ESTADO: Record<EstadoBadge, { icone: NomeIcone; texto: string; cls: string }> = {
  pendente: { icone: "prazo", texto: "Pendente", cls: "hachurado text-t1 ring-1 ring-inset ring-s3" },
  andamento: { icone: "enviar", texto: "Em andamento", cls: "bg-info-bg text-info" },
  feita: { icone: "sucesso", texto: "Feita", cls: "bg-ok-bg text-ok" },
  atrasada: { icone: "atencao", texto: "Atrasada", cls: "bg-err-bg text-err" },
  interna: { icone: "cadeado", texto: "Nota interna", cls: "bg-s3 text-t1" },
};

/** Estado sempre com ícone + texto (regra 10). Pendente = hachurado (regra 6). */
export function BadgeEstado({ estado, children }: { estado: EstadoBadge; children?: ReactNode }) {
  const e = ESTADO[estado];
  return (
    <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pilula px-2.5 font-texto text-[13px] font-medium ${e.cls}`}>
      <Icone nome={e.icone} tamanho={14} />{children ?? e.texto}
    </span>
  );
}
