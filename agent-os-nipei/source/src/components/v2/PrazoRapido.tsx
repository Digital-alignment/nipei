"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { prazoRapidoAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";

/** New due date in two taps: the calendar icon opens the options (keeps the list compact). */
export default function PrazoRapido({ id, opcoes, outraData, rotulo }: { id: string; opcoes: { label: string; data: string }[]; outraData: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const salvar = (prazo: string) => {
    if (!prazo) return;
    if (offline()) { enfileirar({ tipo: "prazo", id, valor: prazo }); setAberto(false); return; }
    const f = new FormData();
    f.set("id", id);
    f.set("prazo", prazo);
    start(async () => { await prazoRapidoAction(f); setAberto(false); });
  };
  const chip = "rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 disabled:opacity-50";
  return (
    <>
      <button type="button" onClick={() => setAberto((a) => !a)} aria-label={rotulo} title={rotulo} aria-expanded={aberto}
        className={`p-1 -m-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 ${aberto ? "text-neutral-800 dark:text-neutral-200" : ""}`}>
        <CalendarClock size={16} />
      </button>
      {aberto && (
        <div className={`basis-full flex flex-wrap items-center gap-1.5 mt-1.5 ${pending ? "opacity-50" : ""}`}>
          {opcoes.map((o) => <button key={o.label} type="button" disabled={pending} onClick={() => salvar(o.data)} className={chip}>{o.label}</button>)}
          <label className={`${chip} cursor-pointer relative`}>
            {outraData}
            <input type="date" disabled={pending} onChange={(e) => salvar(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={outraData} />
          </label>
        </div>
      )}
    </>
  );
}
