"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { cadastroLoteAction } from "@/app/(v2)/actions";
import BotaoEnviar from "./BotaoEnviar";

type Labels = { selecionadas: string; todas: string; limpar: string; enviar: string; resultado: string; aviso: string };

/**
 * Bulk registration links: the person cards carry `<input type="checkbox" name="ids" form={formId}>`
 * (shown with "Selecionar"); this bar sends each selected person their own link from the Nipëi
 * WhatsApp, within the Notificar limits. Shows only while something is selected.
 */
export default function CadastroLote({ formId, labels }: { formId: string; labels: Labels }) {
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState("");
  const caixas = () => [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"]`)];
  useEffect(() => {
    const contar = () => setN(caixas().filter((c) => c.checked).length);
    document.addEventListener("change", contar);
    contar();
    return () => document.removeEventListener("change", contar);
  });
  const marcar = (v: boolean) => { caixas().forEach((c) => { c.checked = v; }); setN(v ? caixas().length : 0); };
  if (!n && !msg) return null;
  return (
    <form id={formId} action={async (f) => {
      const r = await cadastroLoteAction(f);
      setMsg("error" in r && r.error ? r.error : labels.resultado.replace("{ok}", String(r.enviados ?? 0)).replace("{sem}", String(r.semWhats ?? 0)) + (r.parou ? ` ${r.parou}` : ""));
      marcar(false);
    }}
      className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 z-40 my-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-lg p-3 grid gap-2">
      {n > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium tabular-nums">{n} {labels.selecionadas}</span>
          <button type="button" onClick={() => marcar(true)} className="text-xs underline text-neutral-500">{labels.todas}</button>
          <button type="button" onClick={() => marcar(false)} className="text-xs underline text-neutral-500">{labels.limpar}</button>
          <span className="basis-full sm:basis-auto sm:ml-auto" />
          <BotaoEnviar enviando="…" className="inline-flex items-center gap-1.5 rounded-md bg-green-600 text-white px-3 py-1.5 text-sm font-medium"><Send size={14} />{labels.enviar}</BotaoEnviar>
        </div>
      )}
      {n > 0 && <p className="text-[11px] text-neutral-500">{labels.aviso}</p>}
      {msg && <p className="text-sm flex items-center justify-between gap-2"><span>{msg}</span><button type="button" onClick={() => setMsg("")} className="text-xs underline text-neutral-500">OK</button></p>}
    </form>
  );
}
