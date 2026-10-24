"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const EVENTO = "nipei:secao";

/**
 * A collapsible page section (native <details>) that remembers open/closed on the device.
 * It opens itself when the URL hash is #id or when a shortcut (AtalhosSecao) points at it.
 * `forcar`: open now regardless of what was remembered (e.g. a search result was asked for).
 */
export default function Recolhivel({ id, titulo, contagem, alerta, aberto = true, forcar, children }: {
  id: string; titulo: ReactNode; contagem?: number; alerta?: boolean; aberto?: boolean; forcar?: boolean; children: ReactNode;
}) {
  const chave = `nipei:secao:${id}`;
  const [open, setOpen] = useState(forcar || aberto);
  useEffect(() => {
    if (!forcar) { try { const v = localStorage.getItem(chave); if (v !== null) setOpen(v === "1"); } catch { /* private mode */ } }
    const pelaHash = () => { if (location.hash === `#${id}`) setOpen(true); };
    const pedido = (e: Event) => { if ((e as CustomEvent<string>).detail === id) setOpen(true); };
    pelaHash();
    window.addEventListener("hashchange", pelaHash);
    window.addEventListener(EVENTO, pedido);
    return () => { window.removeEventListener("hashchange", pelaHash); window.removeEventListener(EVENTO, pedido); };
  }, [chave, id, forcar]);

  return (
    <details id={id} open={open} className="group scroll-mt-20 mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
      onToggle={(e) => { const o = e.currentTarget.open; setOpen(o); try { localStorage.setItem(chave, o ? "1" : "0"); } catch { /* private mode */ } }}>
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center gap-2 px-4 py-3">
        <span className="text-sm font-semibold">{titulo}</span>
        {contagem != null && <span className={`rounded-full px-2 text-xs tabular-nums ${alerta && contagem > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>{contagem}</span>}
        <ChevronDown size={16} className="ml-auto text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/** Opens a Recolhivel section and scrolls to it. */
function irPara(id: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  history.replaceState(null, "", `#${id}`);
}

/** A button anywhere on the page that opens one section (e.g. "+ Adicionar" → the add form). */
export function BotaoSecao({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return <button type="button" onClick={() => irPara(id)} className={className}>{children}</button>;
}

/** Shortcut cards on top of the page: open the section and scroll to it. */
export function AtalhosSecao({ itens }: { itens: { id: string; label: string; valor: number | string; alerta?: boolean }[] }) {
  const ir = irPara;
  return (
    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map((i) => (
        <button key={i.id} type="button" onClick={() => ir(i.id)}
          className={`rounded-xl border px-3 py-2.5 text-left ${i.alerta ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40" : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"}`}>
          <p className="text-xl font-semibold tabular-nums leading-tight">{i.valor}</p>
          <p className="text-xs text-neutral-500 leading-tight">{i.label}</p>
        </button>
      ))}
    </div>
  );
}
