"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flag, FolderKanban, ListChecks, Lock, Repeat, Search, UsersRound, X } from "lucide-react";
import BotaoEnviar from "./BotaoEnviar";
import { createTarefaAction } from "@/app/(v2)/actions";

type Equipe = { id: string; nome: string; cor: string; areas: string[] };
type Pessoa = { id: string; nome: string; equipes: string[]; coordena: string[]; suspenso: boolean };
type L = Record<"titulo" | "tituloPh" | "descricao" | "descricaoPh" | "equipe" | "nenhum" | "area" | "prioridade" | "prazo" | "hoje" | "amanha" | "sexta" | "proximaSemana" | "semPrazo"
  | "repetir" | "naoRepete" | "semanal" | "quinzenal" | "mensal" | "repeteAviso" | "projeto" | "objetivo" | "responsaveis" | "buscarPessoa" | "eu" | "checklist" | "checklistPh"
  | "criar" | "criarOutra" | "cancelar" | "suspenso" | "nenhumaPessoa", string> & { prio: Record<string, string>; grupos: Record<"equipe" | "outras" | "sem", string> };

const campo = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const rot = "flex items-center gap-1.5 text-xs font-medium text-neutral-500";
const chip = "inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm cursor-pointer select-none has-[:checked]:bg-neutral-900 has-[:checked]:text-white has-[:checked]:border-neutral-900 dark:has-[:checked]:bg-white dark:has-[:checked]:text-neutral-900";
const PRIO_COR: Record<string, string> = { baixa: "bg-neutral-400", "média": "bg-sky-500", alta: "bg-amber-500", urgente: "bg-red-600" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mais = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const proxDia = (dow: number, minimo = 1) => { const d = mais(minimo); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); return d; };
const sn = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** "Nova tarefa": everything a task can carry in one screen; people grouped by the chosen team, with search. */
export default function NovaTarefaForm({ equipes, pessoas, projetos, objetivos, inicial, podeSemEquipe, meId, back, l }: {
  equipes: Equipe[]; pessoas: Pessoa[]; projetos: { id: string; nome: string }[]; objetivos: { id: string; titulo: string; ano: number; projeto: string }[];
  inicial: { equipe: string; projeto: string; objetivo: string; prazo: string; responsaveis: string[] }; podeSemEquipe: boolean; meId: string; back: string; l: L;
}) {
  const [equipe, setEquipe] = useState(inicial.equipe);
  const [projeto, setProjeto] = useState(inicial.projeto);
  const [prazo, setPrazo] = useState(inicial.prazo);
  const [sel, setSel] = useState(new Set(inicial.responsaveis));
  const [busca, setBusca] = useState("");
  const areas = equipes.find((e) => e.id === equipe)?.areas ?? [];
  const objs = objetivos.filter((o) => !projeto || !o.projeto || o.projeto === projeto);
  const grupos = useMemo(() => {
    const da = (p: Pessoa) => !!equipe && (p.equipes.includes(equipe) || p.coordena.includes(equipe));
    return (["equipe", "outras", "sem"] as const).map((g) => ({ g, ps: pessoas.filter((p) => (g === "equipe" ? da(p) : g === "outras" ? !da(p) && p.equipes.length > 0 : !p.equipes.length)) }));
  }, [equipe, pessoas]);
  const visivel = (p: Pessoa) => !busca || sn(p.nome).includes(sn(busca));
  const alternar = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const atalhos = [[l.hoje, iso(new Date())], [l.amanha, iso(mais(1))], [l.sexta, iso(proxDia(5, 0))], [l.proximaSemana, iso(proxDia(1))]];

  return (
    <form action={createTarefaAction} className="grid gap-5">
      <input type="hidden" name="back" value={back} />
      <div className="grid gap-2">
        <input name="title" required autoFocus maxLength={200} placeholder={l.tituloPh} aria-label={l.titulo}
          className="w-full bg-transparent border-0 border-b border-neutral-300 dark:border-neutral-700 px-0 py-2 text-xl font-medium focus:outline-none focus:border-neutral-900 dark:focus:border-white" />
        <textarea name="descricao" rows={2} maxLength={4000} placeholder={l.descricaoPh} aria-label={l.descricao} className={`${campo} resize-y`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1"><span className={rot}><UsersRound size={13} />{l.equipe}</span>
          <select name="equipe" value={equipe} onChange={(e) => setEquipe(e.target.value)} className={campo}>
            {podeSemEquipe && <option value="">{l.nenhum}</option>}
            {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </label>
        {areas.length > 0
          ? <label className="grid gap-1"><span className={rot}>{l.area}</span>
              <select name="area" defaultValue="" key={equipe} className={campo}><option value="">{l.nenhum}</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select>
            </label>
          : <div className="hidden sm:block" />}
      </div>

      <fieldset className="grid gap-1.5"><legend className={`${rot} mb-1.5`}><Flag size={13} />{l.prioridade}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(l.prio).map(([v, nome]) => (
            <label key={v} className={chip}><input type="radio" name="prioridade" value={v} defaultChecked={v === "média"} className="sr-only" /><span className={`w-2 h-2 rounded-full ${PRIO_COR[v]}`} />{nome}</label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><span className={rot}><CalendarDays size={13} />{l.prazo}</span>
          <input type="date" name="prazo" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
          <div className="flex flex-wrap gap-1.5">
            {atalhos.map(([nome, d]) => (
              <button key={nome} type="button" onClick={() => setPrazo(d)} className={`rounded-full border px-2.5 py-0.5 text-xs ${prazo === d ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"}`}>{nome}</button>
            ))}
            {prazo && <button type="button" onClick={() => setPrazo("")} className="rounded-full px-2 py-0.5 text-xs text-neutral-500 inline-flex items-center gap-0.5"><X size={11} />{l.semPrazo}</button>}
          </div>
        </div>
        <label className="grid gap-1 content-start"><span className={rot}><Repeat size={13} />{l.repetir}</span>
          <select name="recorrencia" defaultValue="" className={campo}>
            <option value="">{l.naoRepete}</option><option value="semanal">{l.semanal}</option><option value="quinzenal">{l.quinzenal}</option><option value="mensal">{l.mensal}</option>
          </select>
          <span className="text-[11px] text-neutral-500">{l.repeteAviso}</span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1"><span className={rot}><FolderKanban size={13} />{l.projeto}</span>
          <select name="projeto" value={projeto} onChange={(e) => setProjeto(e.target.value)} className={campo}>
            <option value="">{l.nenhum}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><span className={rot}>{l.objetivo}</span>
          <select name="objetivo" defaultValue={inicial.objetivo} key={projeto} className={campo}>
            <option value="">{l.nenhum}</option>{objs.map((o) => <option key={o.id} value={o.id}>{o.ano} · {o.titulo}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className={`${rot} mb-1.5 w-full`}>
          <UsersRound size={13} />{l.responsaveis}{sel.size > 0 && <span className="rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-1.5 text-[11px] tabular-nums">{sel.size}</span>}
        </legend>
        {sel.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pessoas.filter((p) => sel.has(p.id)).map((p) => (
              <button key={p.id} type="button" onClick={() => alternar(p.id)} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2.5 py-0.5 text-xs">{p.nome}<X size={11} /></button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={l.buscarPessoa} aria-label={l.buscarPessoa} className={`${campo} pl-8`} />
          </div>
          {meId && !sel.has(meId) && <button type="button" onClick={() => alternar(meId)} className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 text-sm shrink-0">+ {l.eu}</button>}
        </div>
        <div className="grid gap-3 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          {grupos.map(({ g, ps }) => {
            const vis = ps.filter(visivel);
            return (
              <div key={g} className={vis.length ? "grid gap-1.5" : "hidden"}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{l.grupos[g]} <span className="tabular-nums font-normal">({ps.length})</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map((p) => (
                    <label key={p.id} className={`${chip} ${visivel(p) ? "" : "hidden"}`} title={p.suspenso ? l.suspenso : undefined}>
                      <input type="checkbox" name="responsaveis" value={p.id} checked={sel.has(p.id)} onChange={() => alternar(p.id)} className="sr-only" />
                      {p.nome}{p.suspenso && <Lock size={11} className="opacity-60" />}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {!grupos.some(({ ps }) => ps.some(visivel)) && <p className="text-sm text-neutral-500">{l.nenhumaPessoa}</p>}
        </div>
      </fieldset>

      <details className="group">
        <summary className={`${rot} cursor-pointer list-none`}><ListChecks size={13} />{l.checklist}</summary>
        <textarea name="checklist" rows={4} maxLength={3000} placeholder={l.checklistPh} className={`${campo} mt-2`} />
      </details>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 z-10 -mx-1 px-1 py-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur flex flex-wrap gap-2 border-t border-neutral-200 dark:border-neutral-800">
        <BotaoEnviar enviando="…" className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{l.criar}</BotaoEnviar>
        <button name="outra" value="1" className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm">{l.criarOutra}</button>
        <Link href={back} className="rounded-lg px-4 py-2 text-sm text-neutral-500 ml-auto">{l.cancelar}</Link>
      </div>
    </form>
  );
}
