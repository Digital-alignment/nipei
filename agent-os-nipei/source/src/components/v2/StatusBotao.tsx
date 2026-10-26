"use client";

import { useState, useTransition } from "react";
import { setStatusAction } from "@/app/(v2)/actions";
import { enfileirar, offline } from "@/lib/v2/filaOffline";
import Icone from "@/components/ds/Icone";

/**
 * The circle that marks a task done (or reopens it); without signal the change is queued and shown at once.
 * Design system (seção 10.3): anel de 26 px; feita = círculo em acento com ✓; área de toque de 44 px.
 */
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
      className="anel-foco group/ck -mx-2 grid size-11 shrink-0 place-items-center rounded-pilula disabled:opacity-60">
      <span className={`grid size-[26px] place-items-center rounded-pilula transition-[background-color,box-shadow] duration-150 ${local === "done"
        ? "bg-ac text-ac-ink"
        : "shadow-[inset_0_0_0_2px_var(--s4)] group-hover/ck:shadow-[inset_0_0_0_2px_var(--ac)]"}`}>
        {local === "done" ? <Icone nome="confirmar" tamanho={15} /> : local === "doing" ? <span className="size-2 rounded-pilula bg-t2" /> : null}
      </span>
    </button>
  );
}
