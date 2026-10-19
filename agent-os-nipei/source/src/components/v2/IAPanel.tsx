"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import type { ModoIA, PropostaIA } from "@/lib/v2/ia";

type Labels = Record<
  "titulo" | "detalhar" | "proximo" | "atualizar" | "pensando" | "aplicar" | "descartar" | "novaDescricao" | "adicionarChecklist" |
  "concluirChecklist" | "proximoPasso" | "mudarStatus" | "mudarPrazo" | "fontes" | "nada" | "aviso",
  string
> & { status: Record<string, string> };

const box = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm w-full";

/**
 * Asks the AI for a suggestion (server action, nothing is written) and shows it as a form where
 * every change has its own checkbox; only "Aplicar" writes, through aplicarIAAction.
 */
export default function IAPanel({ id, propor, aplicar, labels }: {
  id: string;
  propor: (id: string, modo: ModoIA) => Promise<{ proposta?: PropostaIA; error?: string }>;
  aplicar: (f: FormData) => Promise<void>;
  labels: Labels;
}) {
  const [p, setP] = useState<PropostaIA | null>(null);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<ModoIA | null>(null);
  const [pending, start] = useTransition();

  const pedir = (m: ModoIA) => {
    setErro(""); setP(null); setModo(m);
    start(async () => {
      const r = await propor(id, m).catch(() => ({ error: "Falha ao falar com a IA" }) as { error: string; proposta?: undefined });
      if (r.error) setErro(r.error); else setP(r.proposta ?? null);
    });
  };

  const vazio = p && !p.descricao && !p.checklistAdicionar.length && !p.checklistConcluir.length && !p.proximoPasso && !p.status && !p.prazo;
  const btn = (m: ModoIA, label: string) => (
    <button type="button" disabled={pending} onClick={() => pedir(m)}
      className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${modo === m && (pending || p) ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
      {label}
    </button>
  );

  return (
    <section className="mb-7 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300 mb-2 inline-flex items-center gap-1"><Sparkles size={14} />{labels.titulo}</h2>
      <div className="flex flex-wrap gap-2">
        {btn("detalhar", labels.detalhar)}{btn("proximo", labels.proximo)}{btn("atualizar", labels.atualizar)}
      </div>
      {pending && <p className="text-xs text-neutral-500 mt-3 animate-pulse">{labels.pensando}</p>}
      {erro && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{erro}</p>}

      {p && !pending && (
        <form action={async (fd) => { await aplicar(fd); setP(null); setModo(null); }} className="grid gap-3 mt-3 text-sm">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="modo" value={p.modo} />
          <input type="hidden" name="modelo" value={p.modelo} />
          {p.resumo && <p className="whitespace-pre-line text-neutral-700 dark:text-neutral-300">{p.resumo}</p>}
          {vazio && <p className="text-xs text-neutral-500">{labels.nada}</p>}

          {p.descricao && (
            <div className="grid gap-1">
              <label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" name="usarDescricao" defaultChecked />{labels.novaDescricao}</label>
              <textarea name="descricao" defaultValue={p.descricao} rows={8} className={box} />
            </div>
          )}
          {p.checklistAdicionar.length > 0 && (
            <fieldset className="grid gap-1">
              <legend className="font-medium mb-1">{labels.adicionarChecklist}</legend>
              {p.checklistAdicionar.map((x) => <label key={x} className="inline-flex items-start gap-2"><input type="checkbox" name="adicionar" value={x} defaultChecked className="mt-1" />{x}</label>)}
            </fieldset>
          )}
          {p.checklistConcluir.length > 0 && (
            <fieldset className="grid gap-1">
              <legend className="font-medium mb-1">{labels.concluirChecklist}</legend>
              {p.checklistConcluir.map((x) => <label key={x} className="inline-flex items-start gap-2"><input type="checkbox" name="concluir" value={x} defaultChecked className="mt-1" />{x}</label>)}
            </fieldset>
          )}
          {p.proximoPasso && (
            <div className="grid gap-1">
              <label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" name="usarProximo" defaultChecked />{labels.proximoPasso}</label>
              <textarea name="proximo" defaultValue={p.proximoPasso} rows={3} className={box} />
            </div>
          )}
          {p.status && (
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="usarStatus" defaultChecked /><input type="hidden" name="status" value={p.status} />{labels.mudarStatus}: <b>{labels.status[p.status]}</b></label>
          )}
          {p.prazo && (
            <label className="inline-flex items-center gap-2"><input type="checkbox" name="usarPrazo" defaultChecked /><input type="hidden" name="prazo" value={p.prazo} />{labels.mudarPrazo}: <b>{p.prazo}</b></label>
          )}
          {p.fontes.length > 0 && <p className="text-[11px] text-neutral-500">{labels.fontes}: {p.fontes.join(" · ")}</p>}
          <p className="text-[11px] text-neutral-500">{labels.aviso} · {p.modelo}</p>
          <div className="flex gap-2">
            {!vazio && <button className="rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs font-medium">{labels.aplicar}</button>}
            <button type="button" onClick={() => { setP(null); setModo(null); }} className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs">{labels.descartar}</button>
          </div>
        </form>
      )}
    </section>
  );
}
