"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Tabs that show one panel at a time; the last tab opened is remembered on the device. */
export default function Abas({ id, abas }: { id: string; abas: { id: string; label: string; count: number; alerta?: boolean; conteudo: ReactNode }[] }) {
  const chave = `nipei:aba:${id}`;
  const [atual, setAtual] = useState(abas[0]?.id ?? "");
  useEffect(() => {
    try { const v = localStorage.getItem(chave); if (v && abas.some((a) => a.id === v)) setAtual(v); } catch { /* private mode */ }
  }, [chave, abas]);
  const escolher = (a: string) => { setAtual(a); try { localStorage.setItem(chave, a); } catch { /* private mode */ } };
  const aba = abas.find((a) => a.id === atual) ?? abas[0];
  return (
    <div className="mb-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 -mx-1 px-1">
        {abas.map((a) => (
          <button key={a.id} role="tab" type="button" aria-selected={a.id === aba?.id} onClick={() => escolher(a.id)}
            className={`shrink-0 px-2.5 py-2 text-sm -mb-px border-b-2 ${a.id === aba?.id ? "border-neutral-900 dark:border-white font-medium" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"}`}>
            {a.label} <span className={`text-xs tabular-nums ${a.alerta && a.count ? "text-red-600 dark:text-red-400" : "text-neutral-400"}`}>{a.count}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel">{aba?.conteudo}</div>
    </div>
  );
}
