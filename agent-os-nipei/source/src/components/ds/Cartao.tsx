import Link from "next/link";
import type { ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";
import { BotaoIcone } from "./Botao";
import { EQUIPES_DS, chaveEquipe } from "./equipes";

// Cartão e variantes (DESIGN-SYSTEM.md seções 6 e 9.9). Sem borda, sem sombra, raio-cartao, superfície 1.

export type VarianteCartao = "padrao" | "clicavel" | "destaque" | "kpi" | "evento" | "pinu";

const VARIANTE: Record<VarianteCartao, string> = {
  padrao: "bg-s1 text-t1",
  clicavel: "bg-s1 text-t1 hover:bg-s2 transition-colors duration-150",
  // o "um por tela" (regra 5): acento preenchido no escuro, bloco escuro no claro
  destaque: "bg-destaque-bg text-destaque-ink",
  kpi: "bg-s1 text-t1",
  evento: "bg-s1 text-t1",
  // só o que é do Pinu tem brilho (regra 4)
  pinu: "bg-[linear-gradient(160deg,var(--ac-soft),var(--s1)_70%)] text-t1 shadow-brilho-ia",
};

/**
 * Cartão. `href` torna o cartão todo um link (use variante "clicavel"). `equipe` (chave, id do vault ou cor
 * antiga) desenha a barra lateral da equipe — obrigatória na variante "evento". `recorte` + `acaoRecorte`
 * (um <BotaoIcone>) = cartão com ação rápida no canto (seção 6); o botão fica fora da parte mascarada.
 */
export default function Cartao({ variante = "padrao", href, equipe, recorte, acaoRecorte, className, children }: {
  variante?: VarianteCartao; href?: string; equipe?: string; recorte?: boolean; acaoRecorte?: ReactNode; className?: string; children: ReactNode;
}) {
  const eq = chaveEquipe(equipe);
  const corpo = `relative flex min-w-0 flex-col gap-2.5 rounded-cartao p-4 ${VARIANTE[variante]} ${eq ? "pl-5" : ""} ${recorte ? "recorte-cartao pr-16" : ""} ${href ? "anel-foco" : ""}`;
  const barra = eq && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-pilula" style={{ background: EQUIPES_DS[eq].cor }} />;
  const el = href
    ? <Link href={href} className={`${corpo} ${recorte ? "" : className ?? ""}`}>{barra}{children}</Link>
    : <div className={`${corpo} ${recorte ? "" : className ?? ""}`}>{barra}{children}</div>;
  if (!recorte) return el;
  return (
    <div className={`relative min-w-0 ${className ?? ""}`}>
      {el}
      {acaoRecorte && <div className="absolute right-1.5 top-1.5">{acaoRecorte}</div>}
    </div>
  );
}

/** Cabeçalho padrão: [ícone em círculo] Título ······ [⋯ ou ↗]. */
export function CabecalhoCartao({ icone, titulo, acao, rotuloAcao, hrefAcao, onAcao }: {
  icone?: NomeIcone; titulo: ReactNode; acao?: "mais-opcoes" | "abrir-fora"; rotuloAcao?: string; hrefAcao?: string; onAcao?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {icone && <span className="grid size-9 shrink-0 place-items-center rounded-pilula bg-[color-mix(in_srgb,currentColor_12%,transparent)]"><Icone nome={icone} tamanho={18} /></span>}
      <span className="titulo-cartao min-w-0 flex-1 truncate">{titulo}</span>
      {acao && <BotaoIcone icone={acao} aria-label={rotuloAcao ?? (acao === "mais-opcoes" ? "Mais opções" : "Abrir")} tamanho={40} variante="fantasma" href={hrefAcao} onClick={onAcao} />}
    </div>
  );
}

/**
 * Conteúdo do cartão KPI: número display em dois tons (parte principal + `unidade` em texto terciário)
 * e variação (positiva = sucesso, negativa = erro), sempre com ícone + texto.
 * `sobreDestaque`: dentro do cartão destaque tudo usa a tinta do destaque (verde/vermelho/cinza perderiam contraste).
 */
export function NumeroKpi({ numero, unidade, rotulo, variacao, sobreDestaque }: {
  numero: ReactNode; unidade?: string; rotulo?: string; variacao?: { texto: string; positiva: boolean }; sobreDestaque?: boolean;
}) {
  return (
    <div className="grid gap-1">
      {rotulo && <span className={`meta ${sobreDestaque ? "opacity-80" : "text-t2"}`}>{rotulo}</span>}
      <span className="numero-display">{numero}{unidade && <span className={sobreDestaque ? "opacity-55" : "text-t3"}>{unidade}</span>}</span>
      {variacao && (
        <span className={`meta inline-flex items-center gap-1 ${sobreDestaque ? "font-semibold" : variacao.positiva ? "text-ok" : "text-err"}`}>
          <Icone nome="abrir" tamanho={14} className={variacao.positiva ? "rotate-180" : undefined} />{variacao.texto}
        </span>
      )}
    </div>
  );
}

/** Grade bento: 3 colunas a partir de 1024 px, 1 no celular. Use `lg:col-span-2` num cartão para alargar. */
export function GradeBento({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid items-start gap-3 lg:grid-cols-3 ${className ?? ""}`}>{children}</div>;
}
