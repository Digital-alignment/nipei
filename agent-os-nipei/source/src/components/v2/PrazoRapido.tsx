"use client";

import { useRef, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { prazoRapidoAction } from "@/app/(v2)/actions";

/** One-tap new due date for a task (Hoje: overdue and undated groups). */
export default function PrazoRapido({ id, opcoes, outraData }: { id: string; opcoes: { label: string; data: string }[]; outraData: string }) {
  const [pending, start] = useTransition();
  const data = useRef<HTMLInputElement>(null);
  const salvar = (prazo: string) => {
    if (!prazo) return;
    const f = new FormData();
    f.set("id", id);
    f.set("prazo", prazo);
    start(() => prazoRapidoAction(f));
  };
  const chip = "rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300 hover:border-neutral-500 disabled:opacity-50";
  return (
    <div className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${pending ? "opacity-50" : ""}`}>
      {opcoes.map((o) => <button key={o.label} type="button" disabled={pending} onClick={() => salvar(o.data)} className={chip}>{o.label}</button>)}
      <label className={`${chip} inline-flex items-center gap-1 cursor-pointer relative`} title={outraData}>
        <CalendarDays size={11} />{outraData}
        <input ref={data} type="date" disabled={pending} onChange={(e) => salvar(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={outraData} />
      </label>
    </div>
  );
}
