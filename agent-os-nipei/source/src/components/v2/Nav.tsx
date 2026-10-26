"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import Selo, { type NomeSelo } from "@/components/ds/Selo";
import Campo from "@/components/ds/Campo";
import { OrbePinu } from "@/components/ds/Pinu";
import Tema from "@/components/ds/Tema";
import { ABRIR_ASSISTENTE } from "./AssistenteGlobal";

// Navegação da v2 (DESIGN-SYSTEM.md seção 10.10).
// Computador: menu lateral flutuante, recolhido por padrão (cookie nipei_menu, lido em app/(v2)/layout.tsx).
// Celular: barra inferior em pílula com o orbe do Pinu no centro, ligado por uma "ponte líquida" (filtro SVG).

type Chave = "hoje" | "tarefas" | "agenda" | "projetos" | "objetivos" | "equipes" | "pessoas" | "conhecimento" | "acervo" | "financas" | "painel";
type Item = { href: string; chave: Chave; selo?: NomeSelo; icone?: NomeIcone };

const GRUPOS: { chave: "principal" | "equipe" | "gestao"; itens: Item[] }[] = [
  { chave: "principal", itens: [
    { href: "/hoje", chave: "hoje", selo: "sol" },
    { href: "/tarefas", chave: "tarefas", icone: "tarefa" },
    { href: "/agenda", chave: "agenda", selo: "lua" },
    { href: "/projetos", chave: "projetos", selo: "broto" },
    { href: "/objetivos", chave: "objetivos", icone: "sucesso" },
  ] },
  { chave: "equipe", itens: [
    { href: "/equipes", chave: "equipes", icone: "pessoas" },
    { href: "/pessoas", chave: "pessoas", selo: "mao" },
    { href: "/conhecimento", chave: "conhecimento", selo: "espiral" },
    { href: "/acervo", chave: "acervo", selo: "quadrados" },
  ] },
  { chave: "gestao", itens: [
    { href: "/financas", chave: "financas", selo: "semente" },
    { href: "/controle", chave: "painel", selo: "olho" },
  ] },
];
const BARRA: Chave[] = ["hoje", "agenda", "equipes", "projetos"]; // celular: 2 de cada lado do orbe
const MENU_COOKIE = "nipei_menu";

export type RotulosNav = Record<Chave | "principal" | "equipe" | "gestao" | "recolher" | "expandir" | "configuracoes" | "falarPinu" | "novidade", string>;
export type RotulosConta = { configuracoes: string; tema: string; perfil: string; idioma: string; sair: string };

const abrirPinu = (detail?: { texto?: string; voz?: boolean }) => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE, { detail }));

function Simbolo({ item, tamanho }: { item: Item; tamanho: number }) {
  return item.selo ? <Selo nome={item.selo} tamanho={tamanho} /> : <Icone nome={item.icone!} tamanho={tamanho} />;
}

export default function Nav({ rotulos, conta, fechadoInicial = true, extras, contagens = {}, pinu }: {
  rotulos: RotulosNav; conta: ReactNode; fechadoInicial?: boolean;
  /** Itens de gestão visíveis para esta pessoa (finanças: gestão; painel: NIPEI_ADMINS). */
  extras: { financas?: boolean; painel?: boolean };
  /** Número ao lado do nome (aberto) / ponto vermelho de novidade (recolhido). */
  contagens?: Partial<Record<Chave, number>>;
  pinu: boolean;
}) {
  const path = usePathname() ?? "";
  const [fechado, setFechado] = useState(fechadoInicial);
  // barra do celular: acende o item tocado na hora, antes de a página nova chegar
  const [destino, setDestino] = useState("");
  useEffect(() => { setDestino(""); }, [path]);
  const em = (href: string) => path === href || path.startsWith(href + "/");
  const alternar = () => {
    const v = !fechado;
    setFechado(v);
    document.cookie = `${MENU_COOKIE}=${v ? "fechado" : "aberto"}; path=/; max-age=31536000; samesite=lax`;
  };
  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => (i.chave === "financas" ? extras.financas : i.chave === "painel" ? extras.painel : true)) })).filter((g) => g.itens.length);
  const todos = grupos.flatMap((g) => g.itens);
  const tooltip = "pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-interno bg-s3 px-2.5 py-1 meta text-t1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100";

  return (
    <>
      <div className={`print:hidden hidden shrink-0 transition-[width] duration-200 md:block ${fechado ? "w-[88px]" : "w-[264px]"}`}>
        <nav aria-label="Menu" className="sticky top-0 h-dvh p-3">
          <div className={`flex h-full flex-col gap-1.5 bg-s1 font-texto ${fechado ? "w-16 items-center rounded-pilula px-2 py-3" : "w-60 rounded-[24px] px-2.5 py-3.5"}`}>
            <div className={`flex items-center gap-2.5 ${fechado ? "flex-col" : "px-1"}`}>
              <Link href="/hoje" aria-label="Nipëi OS" className="anel-foco grid size-10 shrink-0 place-items-center rounded-[12px_4px_12px_4px] bg-ac font-display text-lg font-bold text-ac-ink">N</Link>
              {!fechado && <b className="flex-1 font-display text-base font-semibold">Nipëi OS</b>}
              <button type="button" onClick={alternar} aria-label={fechado ? rotulos.expandir : rotulos.recolher} title={fechado ? rotulos.expandir : rotulos.recolher}
                className="anel-foco grid size-8 place-items-center rounded-pilula bg-s2 text-t2 hover:text-t1">
                <Icone nome={fechado ? "avancar" : "voltar"} tamanho={14} />
              </button>
            </div>
            {grupos.map((g) => (
              <div key={g.chave} className={`flex flex-col gap-1 ${fechado ? "items-center" : ""}`}>
                {fechado ? <hr className="my-1 h-px w-3/5 border-0 bg-s3" /> : <p className="rotulo-maiusculo px-3.5 pb-1 pt-2.5 text-t3">{rotulos[g.chave]}</p>}
                <ul className="flex flex-col gap-1">
                  {g.itens.map((item) => {
                    const on = em(item.href), n = contagens[item.chave] ?? 0;
                    return (
                      <li key={item.href} className="group relative">
                        <Link href={item.href} aria-current={on ? "page" : undefined} aria-label={fechado ? rotulos[item.chave] : undefined}
                          className={`anel-foco relative flex items-center rounded-pilula transition-colors duration-150 ${fechado ? "size-11 justify-center" : "h-11 gap-3 px-3.5"} ${on
                            ? `bg-s2 text-t1 shadow-[inset_0_0_0_1px_var(--s3)] before:absolute before:inset-y-3 before:w-[3px] before:rounded-pilula before:bg-ac before:content-[''] ${fechado ? "before:-left-2" : "before:-left-2.5"}`
                            : "text-t3 hover:bg-s2 hover:text-t1"}`}>
                          <Simbolo item={item} tamanho={22} />
                          {!fechado && <span className="flex-1 truncate text-sm font-medium">{rotulos[item.chave]}</span>}
                          {n > 0 && (fechado
                            ? <span className="absolute right-2 top-2 size-2 rounded-pilula bg-err"><span className="sr-only">{rotulos.novidade}</span></span>
                            : <span className="rounded-pilula bg-s3 px-2 text-xs text-t2 tabular-nums">{n}</span>)}
                        </Link>
                        {fechado && <span role="tooltip" className={tooltip}>{rotulos[item.chave]}{n > 0 ? ` · ${n}` : ""}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <span className="flex-1" />
            <div className={`group relative ${fechado ? "" : "w-full"}`}>
              <button type="button" popoverTarget="nipei-conta-nav" aria-label={fechado ? rotulos.configuracoes : undefined}
                className={`anel-foco flex items-center rounded-pilula text-t3 transition-colors duration-150 hover:bg-s2 hover:text-t1 ${fechado ? "size-11 justify-center" : "h-11 w-full gap-3 px-3.5 text-sm font-medium"}`}>
                <Icone nome="configuracoes" tamanho={22} />{!fechado && rotulos.configuracoes}
              </button>
              {fechado && <span role="tooltip" className={tooltip}>{rotulos.configuracoes}</span>}
            </div>
            <div id="nipei-conta-nav" popover="auto" className={`fixed inset-auto bottom-3 m-0 overflow-visible border-0 bg-transparent p-0 ${fechado ? "left-[92px]" : "left-[268px]"}`}>{conta}</div>
            {pinu && (fechado ? (
              <div className="group relative">
                <button type="button" onClick={() => abrirPinu()} aria-label={rotulos.falarPinu} className="anel-foco grid rounded-pilula"><OrbePinu tamanho={40} /></button>
                <span role="tooltip" className={tooltip}>{rotulos.falarPinu}</span>
              </div>
            ) : (
              <button type="button" onClick={() => abrirPinu()} className="anel-foco flex items-center gap-2.5 rounded-pilula bg-ac-soft py-1.5 pl-1.5 pr-3.5 font-display text-sm font-semibold text-ac-text">
                <OrbePinu tamanho={32} />{rotulos.falarPinu}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <nav aria-label="Menu" className="print:hidden pointer-events-none fixed inset-x-0 bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 md:hidden">
        <div className="pointer-events-auto relative h-[84px] w-full max-w-[400px]">
          {/* ponte líquida: pílula + círculo do orbe fundidos (blur + contraste no alfa) */}
          <svg aria-hidden="true" width="0" height="0" className="absolute">
            <filter id="ponte-liquida"><feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" /><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -9" result="g" /><feComposite in="SourceGraphic" in2="g" operator="atop" /></filter>
          </svg>
          <div aria-hidden="true" className="absolute inset-0 [filter:url(#ponte-liquida)_drop-shadow(0_0_1px_var(--s4))_drop-shadow(0_6px_16px_var(--bg))]">
            <span className="absolute inset-x-0 top-1.5 h-[72px] rounded-pilula bg-s2" />
            {pinu && <span className="absolute left-1/2 top-0 size-[84px] -translate-x-1/2 rounded-pilula bg-s2" />}
          </div>
          <ul className="relative flex h-full items-center justify-around px-2">
            {BARRA.map((chave, i) => {
              const item = todos.find((x) => x.chave === chave)!;
              const on = destino ? destino === item.href : em(item.href);
              return [
                ...(pinu && i === 2 ? [(
                  <li key="pinu" className="grid w-[84px] shrink-0 place-items-center">
                    <button type="button" onClick={() => abrirPinu()} aria-label={rotulos.falarPinu} className="anel-foco grid rounded-pilula touch-manipulation [-webkit-tap-highlight-color:transparent]">
                      <OrbePinu tamanho={64} />
                    </button>
                  </li>
                )] : []),
                <li key={item.href}>
                  <Link href={item.href} aria-label={rotulos[chave]} aria-current={on ? "page" : undefined} onClick={() => { if (path !== item.href) setDestino(item.href); }}
                    className={`anel-foco grid size-14 place-items-center rounded-pilula transition-[background-color,transform] duration-150 touch-manipulation select-none active:scale-90 [-webkit-tap-highlight-color:transparent] ${on ? "bg-ac text-ac-ink" : "text-t2"}`}>
                    <Simbolo item={item} tamanho={24} />
                  </Link>
                </li>,
              ];
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}

/** Painel de configurações (tema, perfil, idioma, sair). Vai dentro de um elemento `popover`. */
export function PainelConta({ rotulos, perfilHref, idiomaAction, sairAction }: {
  rotulos: RotulosConta; perfilHref: string; idiomaAction: () => Promise<void>; sairAction: () => Promise<void>;
}) {
  const linha = "anel-foco flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-medium text-t1 hover:bg-s3";
  return (
    <div className="grid w-[340px] gap-1 rounded-[16px] bg-s2 p-3 font-texto text-t1 shadow-[0_0_0_1px_var(--s3)]">
      <p className="rotulo-maiusculo px-1 text-t3">{rotulos.configuracoes}</p>
      <Tema rotulo={rotulos.tema} />
      <hr className="my-1 h-px border-0 bg-s3" />
      <Link href={perfilHref} className={linha}><Icone nome="pessoa" tamanho={18} className="text-t2" />{rotulos.perfil}</Link>
      <form action={idiomaAction}><button className={linha}><Icone nome="mensagem" tamanho={18} className="text-t2" />{rotulos.idioma}</button></form>
      <form action={sairAction}><button className={linha}><Icone nome="voltar" tamanho={18} className="text-t2" />{rotulos.sair}</button></form>
    </div>
  );
}

/** Campo "Pergunte ao Pinu ou busque…" do cabeçalho: abre o Pinu com o texto (o microfone abre ouvindo). */
export function BuscaPinu({ rotulo, className }: { rotulo: string; className?: string }) {
  const [texto, setTexto] = useState("");
  return (
    <form role="search" className={className} onSubmit={(e) => { e.preventDefault(); abrirPinu({ texto: texto.trim() || undefined }); setTexto(""); }}>
      <Campo tipo="busca" pinu rotulo={rotulo} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} onMicrofone={() => abrirPinu({ voz: true })} />
    </form>
  );
}
