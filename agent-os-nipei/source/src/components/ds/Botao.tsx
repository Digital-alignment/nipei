import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";
import Selo, { type NomeSelo } from "./Selo";

// Botões do design system (DESIGN-SYSTEM.md seções 6 e 9.1). Plano, sem borda, sempre com ícone,
// foco visível em anel de acento, área de toque ≥ 44 px.

export type VarianteBotao = "primario" | "tonal" | "fantasma" | "destrutivo";
export type TamanhoBotao = "G" | "M" | "P";

const VARIANTE: Record<VarianteBotao, string> = {
  primario: "bg-ac text-ac-ink hover:brightness-[.94] active:bg-ac-press",
  tonal: "bg-s3 text-t1 hover:bg-s4 active:bg-s4",
  fantasma: "bg-transparent text-t1 hover:bg-s2 active:bg-s3",
  destrutivo: "bg-err text-ac-ink hover:brightness-[.94] active:brightness-90",
};
const TAMANHO: Record<TamanhoBotao, string> = {
  G: "h-14 px-7 gap-2.5 text-base", // 56 px — padrão, "grande sempre que possível"
  M: "h-12 px-6 gap-2 text-[15px]", // 48 px
  P: "h-11 lg:h-10 px-4 gap-2 text-sm", // 40 px só no computador (no celular fica 44 px de toque)
};
const ICONE: Record<TamanhoBotao, number> = { G: 20, M: 18, P: 18 };
const BASE = "anel-foco relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-texto font-semibold transition-[background-color,filter,color] duration-150 disabled:cursor-not-allowed";
const DESATIVADO = "bg-s2 text-t3";

type Comum = {
  /** Obrigatório: todo botão tem ícone (regra 7). */
  icone: NomeIcone;
  /** Ícone à direita do texto, ex.: "Ver tudo ▶" (avancar). */
  iconeDireita?: NomeIcone;
  /**
   * primario = ação principal · tonal = secundário (inclui "Remover" fora do diálogo) · fantasma = terciário ("Cancelar").
   * **destrutivo = SÓ o "Remover" dentro do diálogo de confirmação** (regra 9: fora dele, remover nunca é vermelho).
   */
  variante?: VarianteBotao;
  /** G 56 px (padrão) · M 48 px · P 40 px (só computador denso). */
  tamanho?: TamanhoBotao;
  /** Raio 8/28 alternado: **só a ação principal da tela** (uma por tela, seção 6). */
  folha?: boolean;
  /** Arco girando + texto (padrão "Salvando…"); o botão fica desativado. */
  carregando?: boolean;
  textoCarregando?: string;
  /** Visual desativado com cadeado (seção 9.1). */
  desativado?: boolean;
  /** Ocupa a largura toda. */
  largo?: boolean;
  className?: string;
  children: ReactNode;
};
type ComoBotao = Comum & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled" | "className">;
type ComoLink = Comum & { href: string; target?: string; rel?: string };

/** Botão do design system. Com `href` vira link com a mesma aparência. */
export default function Botao(props: ComoBotao | ComoLink) {
  const { icone, iconeDireita, variante = "primario", tamanho = "G", folha, carregando, textoCarregando = "Salvando…", desativado, largo, className, children, ...resto } = props;
  const parado = desativado || carregando;
  const cls = [
    BASE, TAMANHO[tamanho], desativado ? DESATIVADO : VARIANTE[variante],
    folha ? "forma-folha" : "rounded-pilula", largo ? "w-full" : "", carregando ? "cursor-progress" : "", className ?? "",
  ].join(" ");
  const conteudo = (
    <>
      {carregando ? <span className="arco-girando" aria-hidden="true" /> : <Icone nome={desativado ? "cadeado" : icone} tamanho={ICONE[tamanho]} />}
      <span>{carregando ? textoCarregando : children}</span>
      {iconeDireita && !carregando && <Icone nome={iconeDireita} tamanho={ICONE[tamanho]} />}
    </>
  );
  if ("href" in resto && resto.href !== undefined) {
    const { href, target, rel } = resto as ComoLink;
    if (parado) return <span className={cls} aria-disabled="true">{conteudo}</span>;
    return <Link href={href} target={target} rel={rel} className={cls}>{conteudo}</Link>;
  }
  const { type = "button", ...attrs } = resto as Omit<ComoBotao, keyof Comum>;
  return <button type={type} disabled={parado} aria-busy={carregando || undefined} className={cls} {...attrs}>{conteudo}</button>;
}

/**
 * Botão só com ícone (seção 9.1): círculo tonal 52 / 44 / 40 px (`acento` = microfone da busca do Pinu). `aria-label` é obrigatório e vira
 * também o tooltip (aparece ao passar o mouse e no foco por teclado). `selo` troca o ícone por um selo do menu (ex.: sol = foco de hoje).
 */
export function BotaoIcone({ icone, selo, "aria-label": rotulo, tamanho = 52, variante = "tonal", href, className, ...resto }:
  { icone?: NomeIcone; selo?: NomeSelo; "aria-label": string; tamanho?: 52 | 44 | 40; variante?: "tonal" | "fantasma" | "acento"; href?: string; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "className">) {
  const dim = tamanho === 52 ? "size-[52px]" : tamanho === 44 ? "size-11" : "size-11 lg:size-10";
  const cls = `anel-foco group relative inline-flex shrink-0 items-center justify-center rounded-pilula transition-colors duration-150 ${dim} ${variante === "tonal" ? "bg-s3 text-t1 hover:bg-s4" : variante === "acento" ? "bg-ac text-ac-ink hover:brightness-[.94] active:bg-ac-press" : "text-t1 hover:bg-s2 active:bg-s3"} disabled:bg-s2 disabled:text-t3 disabled:cursor-not-allowed ${className ?? ""}`;
  const dentro = (
    <>
      {selo ? <Selo nome={selo} tamanho={tamanho === 52 ? 22 : 20} /> : <Icone nome={icone!} tamanho={tamanho === 52 ? 22 : 20} />}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-interno bg-s3 px-2.5 py-1 meta text-t1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">{rotulo}</span>
    </>
  );
  if (href) return <Link href={href} aria-label={rotulo} className={cls}>{dentro}</Link>;
  const { type = "button", ...attrs } = resto;
  return <button type={type} aria-label={rotulo} className={cls} {...attrs}>{dentro}</button>;
}

/**
 * Botão dividido (seção 9.1): rótulo + peça com ▶, separadas por um corte diagonal. Para **avançar**
 * em fluxos ("Continuar", "Criar tarefa"). Um botão só (uma ação); `invertido` troca as cores.
 */
export function BotaoDividido({ rotulo, invertido, className, ...resto }: { rotulo: string; invertido?: boolean; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">) {
  const tonal = "bg-s3 text-t1", acento = "bg-ac text-ac-ink";
  const { type = "button", ...attrs } = resto;
  return (
    <button type={type} className={`anel-foco group inline-flex h-14 items-stretch rounded-[18px] font-texto text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ""}`} {...attrs}>
      <span className={`corte-esq flex items-center pl-6 pr-9 transition-[filter] duration-150 group-hover:brightness-110 group-active:brightness-95 ${invertido ? acento : tonal}`}>{rotulo}</span>
      <span className={`corte-dir grid w-16 place-items-center transition-[filter] duration-150 group-hover:brightness-110 group-active:brightness-95 ${invertido ? tonal : acento}`}><Icone nome="avancar" tamanho={20} /></span>
    </button>
  );
}
