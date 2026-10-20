"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BotMessageSquare, CalendarDays, FolderKanban, PanelLeftClose, PanelLeftOpen, Sun, Target, Users, UsersRound } from "lucide-react";
import { ABRIR_ASSISTENTE } from "./AssistenteGlobal";

const ITEMS = [
  { href: "/hoje", key: "hoje", Icon: Sun },
  { href: "/agenda", key: "agenda", Icon: CalendarDays },
  { href: "/equipes", key: "equipes", Icon: UsersRound },
  { href: "/projetos", key: "projetos", Icon: FolderKanban },
] as const;
// Sub-pages that live inside a main section (own URL, no slot in the bar; the section stays lit).
const SUB: Record<string, { href: string; key: "objetivos" | "pessoas"; Icon: typeof Target }[]> = {
  "/equipes": [{ href: "/pessoas", key: "pessoas", Icon: Users }],
  "/projetos": [{ href: "/objetivos", key: "objetivos", Icon: Target }],
};
const MENU_COOKIE = "nipei_menu"; // read by app/(v2)/layout.tsx

type Labels = Record<(typeof ITEMS)[number]["key"] | "objetivos" | "pessoas" | "recolher" | "expandir", string>;

/**
 * Desktop: floating rail, open (icons + labels, sub-items on a tree line) or closed (icons only; hover
 * shows the label, or a flyout with the sub-items). The choice is kept in a cookie so the server renders
 * the right width on the next load. Phone: bottom bar with the 4 sections (unchanged).
 */
export default function Nav({ labels, fechadoInicial = false, assistente }: { labels: Labels; fechadoInicial?: boolean; assistente?: string }) {
  const path = usePathname() ?? "";
  const [fechado, setFechado] = useState(fechadoInicial);
  // Phone bar: light up the tapped section at once (optimistic), before the new page arrives.
  const [destino, setDestino] = useState("");
  useEffect(() => { setDestino(""); }, [path]);
  const em = (href: string) => path === href || path.startsWith(href + "/");
  const active = (href: string) => em(href) || (SUB[href] ?? []).some((s) => em(s.href));
  const ativoBarra = (href: string) => (destino ? destino === href : active(href));
  const alternar = () => {
    const v = !fechado;
    setFechado(v);
    document.cookie = `${MENU_COOKIE}=${v ? "fechado" : "aberto"}; path=/; max-age=31536000; samesite=lax`;
  };

  const ativo = "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm";
  const inativo = "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white";
  const flutuante = "pointer-events-none opacity-0 -translate-x-1 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-x-0 transition duration-150";
  const arvore = (subs: (typeof SUB)[string], recuo: string) => (
    <ul className={`relative ${recuo} pl-4 mt-1 before:absolute before:left-0 before:top-0 before:bottom-[17px] before:w-px before:bg-neutral-200 dark:before:bg-neutral-700`}>
      {subs.map((s) => (
        <li key={s.href} className="relative before:absolute before:-left-4 before:top-1/2 before:w-3 before:h-px before:bg-neutral-200 dark:before:bg-neutral-700">
          <Link href={s.href} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] whitespace-nowrap ${em(s.href) ? `${ativo} font-medium` : inativo}`}>
            <s.Icon size={15} />{labels[s.key]}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className={`print:hidden hidden md:block shrink-0 transition-[width] duration-200 ${fechado ? "w-[88px]" : "w-64"}`}>
        <nav aria-label="Menu" className="sticky top-14 z-30 h-[calc(100vh-3.5rem)] p-3">
          <div className="h-full flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-2">
            <ul className="flex flex-col gap-1">
              {ITEMS.map(({ href, key, Icon }) => {
                const subs = SUB[href] ?? [];
                return (
                  <li key={href} className="relative group">
                    <Link href={href} aria-label={fechado ? labels[key] : undefined}
                      className={`flex items-center rounded-xl text-sm transition-colors ${fechado ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-3 py-2.5"} ${active(href) ? `${ativo} font-medium` : inativo}`}>
                      <Icon size={fechado ? 20 : 18} className="shrink-0" />{!fechado && labels[key]}
                    </Link>
                    {!fechado && subs.length > 0 && arvore(subs, "ml-[22px]")}
                    {fechado && (subs.length === 0 ? (
                      <span role="tooltip" className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-neutral-900 text-white dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium shadow-lg ${flutuante}`}>{labels[key]}</span>
                    ) : (
                      // flyout; the pl-3 is an invisible bridge so the pointer can move from the icon into the card
                      <div className={`absolute left-full top-0 pl-3 z-50 ${flutuante}`}>
                        <div className="min-w-44 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl p-2">
                          <Link href={href} className={`block rounded-lg px-2.5 py-1.5 text-sm font-medium ${em(href) ? ativo : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>{labels[key]}</Link>
                          {arvore(subs, "ml-3")}
                        </div>
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={alternar} aria-label={fechado ? labels.expandir : labels.recolher} title={fechado ? labels.expandir : labels.recolher}
              className={`mt-auto flex items-center rounded-xl text-sm ${inativo} ${fechado ? "justify-center w-12 h-12 mx-auto" : "gap-3 px-3 py-2.5"}`}>
              {fechado ? <PanelLeftOpen size={20} /> : <><PanelLeftClose size={18} />{labels.recolher}</>}
            </button>
          </div>
        </nav>
      </div>
      <nav aria-label="Menu" className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <ul className={`grid ${assistente ? "grid-cols-5" : "grid-cols-4"} h-16 px-2`}>
          {ITEMS.map(({ href, key, Icon }, i) => {
            const on = ativoBarra(href);
            return [
              ...(assistente && i === 2 ? [(
                <li key="assistente" className="flex">
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(ABRIR_ASSISTENTE))} aria-label={assistente}
                    className="group flex-1 flex flex-col items-center justify-center gap-1 touch-manipulation select-none [-webkit-tap-highlight-color:transparent]">
                    <span className="flex items-center justify-center w-11 h-11 -mt-1 rounded-full bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-md ring-4 ring-white dark:ring-neutral-950 transition-transform duration-150 group-active:scale-90">
                      <BotMessageSquare size={21} />
                    </span>
                    <span className="sr-only">{assistente}</span>
                  </button>
                </li>
              )] : []),
              <li key={href} className="flex">
                <Link href={href} aria-current={on ? "page" : undefined}
                  onClick={() => { if (!em(href) || path !== href) setDestino(href); }}
                  className="group flex-1 flex flex-col items-center justify-center gap-1 touch-manipulation select-none [-webkit-tap-highlight-color:transparent]">
                  <span className={`flex items-center justify-center w-14 h-8 rounded-full transition-all duration-150 group-active:scale-90 ${on ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "text-neutral-500 dark:text-neutral-400"}`}>
                    <Icon size={20} strokeWidth={on ? 2.25 : 1.75} />
                  </span>
                  <span className={`text-[11px] leading-none ${on ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>{labels[key]}</span>
                </Link>
              </li>,
            ];
          })}
        </ul>
      </nav>
    </>
  );
}
