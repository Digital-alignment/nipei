"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { prazoRapidoAction } from "@/app/(v2)/actions";

/**
 * Drag a task (li[data-tarefa]) onto a day (element with data-dia) to move its due date.
 * One set of document listeners instead of a client wrapper per row (rows stay server-rendered).
 * Mouse/desktop only: touch has the calendar icon.
 */
export default function ArrastarAgenda({ dica }: { dica: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let alvo: HTMLElement | null = null;
    const marcar = (el: HTMLElement | null) => {
      alvo?.classList.remove("ring-2", "ring-sky-500");
      alvo = el;
      alvo?.classList.add("ring-2", "ring-sky-500");
    };
    const inicio = (e: DragEvent) => {
      const li = (e.target as HTMLElement).closest?.("[data-tarefa]") as HTMLElement | null;
      if (!li || !e.dataTransfer) return;
      e.dataTransfer.setData("text/nipei-tarefa", li.dataset.tarefa!);
      e.dataTransfer.effectAllowed = "move";
    };
    const sobre = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("text/nipei-tarefa")) return;
      const dia = (e.target as HTMLElement).closest?.("[data-dia]") as HTMLElement | null;
      if (!dia) return marcar(null);
      e.preventDefault();
      marcar(dia);
    };
    const soltar = async (e: DragEvent) => {
      const id = e.dataTransfer?.getData("text/nipei-tarefa");
      const dia = (e.target as HTMLElement).closest?.("[data-dia]") as HTMLElement | null;
      marcar(null);
      if (!id || !dia?.dataset.dia) return;
      e.preventDefault();
      const f = new FormData();
      f.set("id", id);
      f.set("prazo", dia.dataset.dia);
      setMsg("…");
      await prazoRapidoAction(f);
      setMsg("");
      router.refresh();
    };
    const fim = () => marcar(null);
    document.addEventListener("dragstart", inicio);
    document.addEventListener("dragover", sobre);
    document.addEventListener("drop", soltar);
    document.addEventListener("dragend", fim);
    return () => {
      document.removeEventListener("dragstart", inicio);
      document.removeEventListener("dragover", sobre);
      document.removeEventListener("drop", soltar);
      document.removeEventListener("dragend", fim);
    };
  }, [router]);
  return <p className="hidden md:block text-[11px] text-neutral-400 mb-2">{msg || dica}</p>;
}
