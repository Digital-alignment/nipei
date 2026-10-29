"use client";

import { CAMPO_COMPACTO } from "@/components/ds/Campo";
import { useEffect, useState } from "react";
import Icone from "@/components/ds/Icone";
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
    <button type="button" onClick={toggle} className={`shrink-0 whitespace-nowrap anel-foco inline-flex h-9 items-center gap-1.5 rounded-pilula px-3.5 font-texto text-sm font-medium ${on ? "bg-s3 text-t1 shadow-[inset_0_0_0_1px_var(--s4)]" : "bg-s2 text-t2 hover:bg-s3"}`}>
      {on ? <Icone nome="fechar"  tamanho={12} /> : <Icone nome="confirmar" tamanho={16} />}{on ? cancelar : label}
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
  return (
    <form id={formId} action={async (f) => { await loteAction(f); marcar(false); }}
      className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 z-40 my-3 rounded-cartao bg-s2 p-3 shadow-[0_0_0_1px_var(--s3)] flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium tabular-nums">{n} {labels.selecionadas}</span>
      <button type="button" onClick={() => marcar(true)} className="text-xs underline text-t2">{labels.todas}</button>
      <button type="button" onClick={() => marcar(false)} className="text-xs underline text-t2">{labels.limpar}</button>
      <span className="basis-full sm:basis-auto sm:ml-auto" />
      <select name="acao" value={acao} onChange={(e) => setAcao(e.target.value)} aria-label={labels.acao} className={CAMPO_COMPACTO}>
        <option value="atribuir">{labels.atribuir}</option>
        <option value="prazo">{labels.prazo}</option>
        <option value="prioridade">{labels.prioridade}</option>
        <option value="concluir">{labels.concluir}</option>
        {equipes.length > 1 && <option value="equipe">{labels.mover}</option>}
      </select>
      {acao === "atribuir" && <select name="pessoa" required className={CAMPO_COMPACTO} aria-label={labels.atribuir}>{pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>}
      {acao === "prazo" && <input type="date" name="prazo" required className={CAMPO_COMPACTO} aria-label={labels.prazo} />}
      {acao === "prioridade" && <select name="prioridade" className={CAMPO_COMPACTO} aria-label={labels.prioridade}>{Object.entries(labels.prioridades).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      {acao === "equipe" && <select name="equipe" className={CAMPO_COMPACTO} aria-label={labels.mover}>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>}
      <BotaoEnviar enviando="…" icone="confirmar" variante="primario" tamanho="P">{labels.aplicar}</BotaoEnviar>
    </form>
  );
}
