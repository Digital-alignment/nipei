"use client";

import { useState, useTransition } from "react";
import { setStatusAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";

/** The circle that marks a task done (or reopens it); without signal the change is queued and shown at once. */
export default function StatusBotao({ id, status }: { id: string; status: "todo" | "doing" | "done" }) {
  const [local, setLocal] = useState(status);
  const [pending, start] = useTransition();
  const proximo = local === "done" ? "todo" : "done";
  const clicar = () => {
    if (offline()) { enfileirar({ tipo: "status", id, valor: proximo }); setLocal(proximo); return; }
    const f = new FormData();
    f.set("id", id);
    f.set("status", proximo);
    setLocal(proximo);
    start(() => setStatusAction(f));
  };
  return (
    <button type="button" onClick={clicar} disabled={pending} aria-label={local === "done" ? "Reabrir" : "Concluir"}
      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] ${local === "done" ? "bg-neutral-800 border-neutral-800 text-white dark:bg-neutral-200 dark:border-neutral-200 dark:text-neutral-900" : "border-neutral-400 hover:border-neutral-700"}`}>
      {local === "done" ? "✓" : local === "doing" ? "•" : ""}
    </button>
  );
}
