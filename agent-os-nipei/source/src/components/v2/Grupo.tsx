"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** Collapsible task group; each person's open/closed choice is remembered on their device. */
export default function Grupo({ id, titulo, count, aberto = true, alerta, children }: {
  id: string; titulo: string; count: number; aberto?: boolean; alerta?: boolean; children: ReactNode;
}) {
  const chave = `nipei:grupo:${id}`;
  const [open, setOpen] = useState(aberto);
  useEffect(() => {
    try { const v = localStorage.getItem(chave); if (v) setOpen(v === "1"); } catch { /* private mode */ }
  }, [chave]);
  const alternar = () => {
    setOpen((o) => { try { localStorage.setItem(chave, o ? "0" : "1"); } catch { /* private mode */ } return !o; });
  };
  return (
    <section className="mb-5">
      <button type="button" onClick={alternar} aria-expanded={open}
        className="flex w-full items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        <span className={alerta ? "text-red-600 dark:text-red-400" : ""}>{titulo}</span>
        <span className="font-normal">({count})</span>
      </button>
      {open && <div className="mt-1">{children}</div>}
    </section>
  );
}
