import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Empty, Section, Title } from "@/components/v2/ui";
import { CATEGORIAS, currentUser, getEquipes, getLancamentos, getPessoas, getProjetos, today } from "@/lib/v2/data";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { anularLancamentoAction, createLancamentoAction } from "../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

function Bar({ label, value, max, cls }: { label: string; value: number; max: number; cls: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs">
      <span className="truncate text-neutral-600 dark:text-neutral-400">{label}</span>
      <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"><div className={`h-full ${cls}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
      <span className="tabular-nums">{brl(value)}</span>
    </div>
  );
}

export default async function Financas({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = (await currentUser())!;
  if (!me.gestao) redirect("/hoje");
  const q = await searchParams;
  const { t, lang } = await getT();
  const hoje = today();
  const mes = /^\d{4}-\d{2}$/.test(q.m ?? "") ? q.m! : hoje.slice(0, 7);
  const todos = getLancamentos();
  const validos = todos.filter((l) => !l.anulado);
  const soma = (ls: typeof validos, tipo: "entrada" | "despesa") => ls.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);
  const doMes = validos.filter((l) => l.data.startsWith(mes));
  const entradas = soma(doMes, "entrada"), despesas = soma(doMes, "despesa");
  const ate = validos.filter((l) => l.data.slice(0, 7) <= mes);
  const saldoTotal = soma(ate, "entrada") - soma(ate, "despesa");

  const projetos = getProjetos(), equipes = getEquipes(), pessoas = getPessoas();
  const porCategoria = Object.entries(doMes.filter((l) => l.tipo === "despesa").reduce<Record<string, number>>((a, l) => ({ ...a, [l.categoria]: (a[l.categoria] ?? 0) + l.valor }), {}))
    .sort((a, b) => b[1] - a[1]);
  const porProjeto = [...new Set(doMes.map((l) => l.projeto))].map((p) => ({
    nome: projetos.find((x) => x.id === p)?.nome ?? t.geral,
    e: soma(doMes.filter((l) => l.projeto === p), "entrada"), d: soma(doMes.filter((l) => l.projeto === p), "despesa"),
  }));
  const meses = Array.from({ length: 6 }, (_, i) => addMonths(mes, i - 5)).map((m) => {
    const ls = validos.filter((l) => l.data.startsWith(m));
    return { m, e: soma(ls, "entrada"), d: soma(ls, "despesa") };
  });
  const maxMes = Math.max(1, ...meses.flatMap((x) => [x.e, x.d]));
  const lista = todos.filter((l) => l.data.startsWith(mes));
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" ")[0] ?? id;

  return (
    <>
      <Title>{t.financas}</Title>
      <div className="flex items-center justify-between mb-4">
        <Link href={`/financas?m=${addMonths(mes, -1)}`} aria-label="‹" className="p-2"><ChevronLeft size={20} /></Link>
        <p className="font-semibold first-letter:uppercase">{fmtDate(mes, lang)}</p>
        <Link href={`/financas?m=${addMonths(mes, 1)}`} aria-label="›" className="p-2"><ChevronRight size={20} /></Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <Card><p className="text-xs text-neutral-500">{t.entradas}</p><p className="text-lg font-semibold text-green-700 dark:text-green-400 tabular-nums">{brl(entradas)}</p></Card>
        <Card><p className="text-xs text-neutral-500">{t.despesas}</p><p className="text-lg font-semibold text-red-700 dark:text-red-400 tabular-nums">{brl(despesas)}</p></Card>
        <Card><p className="text-xs text-neutral-500">{t.saldoMes}</p><p className="text-lg font-semibold tabular-nums">{brl(entradas - despesas)}</p></Card>
        <Card><p className="text-xs text-neutral-500">{t.saldoTotal}</p><p className="text-lg font-semibold tabular-nums">{brl(saldoTotal)}</p></Card>
      </div>

      <details className="mb-7 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">+ {t.novoLancamento}</summary>
        <form action={createLancamentoAction} className="grid gap-3 px-4 pb-4">
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-1.5"><input type="radio" name="tipo" value="despesa" defaultChecked />{t.despesa}</label>
            <label className="inline-flex items-center gap-1.5"><input type="radio" name="tipo" value="entrada" />{t.entrada}</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">{t.data}<input type="date" name="data" defaultValue={hoje} required className={field} /></label>
            <label className="grid gap-1 text-sm">{t.valor}<input name="valor" inputMode="decimal" placeholder="0,00" required className={field} /></label>
          </div>
          <label className="grid gap-1 text-sm">{t.categoria}
            <select name="categoria" className={field}>
              <optgroup label={t.despesas}>{CATEGORIAS.despesa.map((c) => <option key={c}>{c}</option>)}</optgroup>
              <optgroup label={t.entradas}>{CATEGORIAS.entrada.map((c) => <option key={c}>{c}</option>)}</optgroup>
            </select>
          </label>
          <label className="grid gap-1 text-sm">{t.descricao}<input name="descricao" maxLength={200} className={field} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">{t.projeto}
              <select name="projeto" className={field}><option value="">{t.geral}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            </label>
            <label className="grid gap-1 text-sm">{t.equipe}
              <select name="equipe" className={field}><option value="">{t.nenhum}</option>{equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select>
            </label>
          </div>
          <button className="justify-self-start rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-2 text-sm font-medium">{t.salvar}</button>
        </form>
      </details>

      {porCategoria.length > 0 && (
        <Section title={t.porCategoria}>
          <div className="grid gap-2">{porCategoria.map(([c, v]) => <Bar key={c} label={c} value={v} max={porCategoria[0][1]} cls="bg-red-500/70" />)}</div>
        </Section>
      )}

      {porProjeto.length > 0 && (
        <Section title={t.porProjeto}>
          <ul className="text-sm">
            {porProjeto.map((p) => (
              <li key={p.nome} className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span>{p.nome}</span>
                <span className="tabular-nums text-xs"><span className="text-green-700 dark:text-green-400">+{brl(p.e)}</span> · <span className="text-red-700 dark:text-red-400">−{brl(p.d)}</span></span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t.ultimosMeses}>
        <div className="grid grid-cols-6 gap-2 items-end h-32">
          {meses.map((x) => (
            <Link key={x.m} href={`/financas?m=${x.m}`} className="flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-0.5 h-full">
                <div className="w-3 rounded-t bg-green-500/70" style={{ height: `${(x.e / maxMes) * 100}%` }} title={brl(x.e)} />
                <div className="w-3 rounded-t bg-red-500/70" style={{ height: `${(x.d / maxMes) * 100}%` }} title={brl(x.d)} />
              </div>
              <span className={`text-[10px] ${x.m === mes ? "font-bold" : "text-neutral-500"}`}>{fmtDate(x.m, lang).slice(0, 3)}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t.lancamentos} count={lista.length}>
        {lista.length === 0 ? <Empty>{t.semLancamentos}</Empty> : (
          <ul>
            {lista.map((l) => (
              <li key={l.id} className={`flex items-center gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${l.anulado ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${l.anulado ? "line-through" : ""}`}>{l.descricao || l.categoria}</p>
                  <p className="text-xs text-neutral-500">{fmtDate(l.data, lang)} · {l.categoria}{l.projeto ? ` · ${projetos.find((p) => p.id === l.projeto)?.nome ?? l.projeto}` : ""} · {nome(l.registradoPor)}{l.anulado ? ` · ${t.anulado}` : ""}</p>
                </div>
                <span className={`text-sm tabular-nums font-medium ${l.tipo === "entrada" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>{l.tipo === "entrada" ? "+" : "−"}{brl(l.valor)}</span>
                {!l.anulado && (
                  <form action={anularLancamentoAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="text-[11px] text-neutral-500 underline">{t.anular}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
