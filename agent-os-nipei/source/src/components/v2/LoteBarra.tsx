"use client";

import { useEffect, useState } from "react";
import { CheckSquare, X } from "lucide-react";
import { loteAction } from "@/app/(v2)/actions";
import BotaoEnviar from "./BotaoEnviar";

type Labels = {
  selecionadas: string; todas: string; limpar: string; aplicar: string; acao: string;
  atribuir: string; prazo: string; concluir: string; prioridade: string; mover: string; prioridades: Record<string, string>;
};

/** "Selecionar" chip: shows the row checkboxes (hidden by default so the lists stay clean). */
export function LoteToggle({ formId, label, cancelar }: { formId: string; label: string; cancelar: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => { delete document.documentElement.dataset.lote; }, []);
  const toggle = () => {
    const v = !on;
    setOn(v);
    if (v) document.documentElement.dataset.lote = "1";
    else {
      delete document.documentElement.dataset.lote;
      document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"]`).forEach((c) => { c.checked = false; });
      document.dispatchEvent(new Event("change"));
    }
  };
  return (
    <button type="button" onClick={toggle} className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${on ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"}`}>
      {on ? <X size={12} /> : <CheckSquare size={12} />}{on ? cancelar : label}
    </button>
  );
}

/**
 * Bulk actions: the task rows carry `<input type="checkbox" name="ids" form={formId}>`, so the rows keep
 * their own forms (status, prazo) and this bar's form still receives every checked id. Shows only
 * while something is selected.
 */
export default function LoteBarra({ formId, pessoas, equipes, labels }: {
  formId: string; pessoas: { id: string; nome: string }[]; equipes: { id: string; nome: string }[]; labels: Labels;
}) {
  const [n, setN] = useState(0);
  const [acao, setAcao] = useState("atribuir");
  const caixas = () => [...document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"]`)];
  useEffect(() => {
    const contar = () => setN(caixas().filter((c) => c.checked).length);
    document.addEventListener("change", contar);
    contar();
    return () => document.removeEventListener("change", contar);
  });
  const marcar = (v: boolean) => { caixas().forEach((c) => { c.checked = v; }); setN(v ? caixas().length : 0); };
  if (!n) return null;
  const campo = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm";
  return (
    <form id={formId} action={async (f) => { await loteAction(f); marcar(false); }}
      className="sticky bottom-20 sm:bottom-4 z-40 my-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-lg p-3 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium tabular-nums">{n} {labels.selecionadas}</span>
      <button type="button" onClick={() => marcar(true)} className="text-xs underline text-neutral-500">{labels.todas}</button>
      <button type="button" onClick={() => marcar(false)} className="text-xs underline text-neutral-500">{labels.limpar}</button>
      <span className="basis-full sm:basis-auto sm:ml-auto" />
      <select name="acao" value={acao} onChange={(e) => setAcao(e.target.value)} aria-label={labels.acao} className={campo}>
        <option value="atribuir">{labels.atribuir}</option>
        <option value="prazo">{labels.prazo}</option>
        <option value="prioridade">{labels.prioridade}</option>
        <option value="concluir">{labels.concluir}</option>
        {equipes.length > 1 && <option value="equipe">{labels.mover}</option>}
      </select>
      {acao === "atribuir" && <select name="pessoa" required className={campo} aria-label={labels.atribuir}>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>}
      {acao === "prazo" && <input type="date" name="prazo" required className={campo} aria-label={labels.prazo} />}
      {acao === "prioridade" && <select name="prioridade" className={campo} aria-label={labels.prioridade}>{Object.entries(labels.prioridades).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      {acao === "equipe" && <select name="equipe" className={campo} aria-label={labels.mover}>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>}
      <BotaoEnviar enviando="…" className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-sm font-medium">{labels.aplicar}</BotaoEnviar>
    </form>
  );
}
