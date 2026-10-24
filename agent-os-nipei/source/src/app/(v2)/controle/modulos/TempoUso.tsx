import Link from "next/link";
import { getPessoas } from "@/lib/v2/data";
import { SECOES, usoPeriodo } from "@/lib/v2/uso";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";
const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
const diaBahia = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "America/Bahia" }).slice(0, 10);

/** Minutes of use per person and section (pages open and in use). Filters: ?dias ?pessoa */
export default function TempoUso({ q }: ModuloProps) {
  const dias = [7, 30, 90].includes(Number(q.dias)) ? Number(q.dias) : 30;
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const regs = usoPeriodo(dias).filter((r) => !q.pessoa || r.pessoa === q.pessoa);
  const ultimos14 = Array.from({ length: 14 }, (_, i) => diaBahia(new Date(Date.now() - (13 - i) * 86_400_000)));

  const porPessoa = [...new Set(regs.map((r) => r.pessoa))].map((id) => {
    const meus = regs.filter((r) => r.pessoa === id);
    const total = meus.reduce((s, r) => s + r.min, 0), diasAtivos = new Set(meus.map((r) => r.dia)).size;
    const secoes = Object.entries(meus.reduce<Record<string, number>>((a, r) => ({ ...a, [r.secao]: (a[r.secao] ?? 0) + r.min }), {})).sort((a, b) => b[1] - a[1]);
    return { id, total, diasAtivos, media: diasAtivos ? Math.round(total / diasAtivos) : 0, secoes, porDia: ultimos14.map((d) => meus.filter((r) => r.dia === d).reduce((s, r) => s + r.min, 0)) };
  }).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...porPessoa.flatMap((p) => p.porDia));
  const porSecao = Object.entries(regs.reduce<Record<string, number>>((a, r) => ({ ...a, [r.secao]: (a[r.secao] ?? 0) + r.min }), {})).sort((a, b) => b[1] - a[1]);
  const totalSec = Math.max(1, porSecao.reduce((s, [, m]) => s + m, 0));
  const link = (mud: Record<string, string | undefined>) => `/controle?${new URLSearchParams(Object.entries({ m: "uso", dias: String(dias), pessoa: q.pessoa, ...mud }).filter(([, v]) => v) as [string, string][])}`;
  const chip = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {[7, 30, 90].map((d) => <Link key={d} href={link({ dias: String(d) })} className={chip(d === dias)}>{d} dias</Link>)}
        {q.pessoa && <Link href={link({ pessoa: undefined })} className={chip(true)}>{nome(q.pessoa)} ✕</Link>}
      </div>

      <div className={`${CARTAO} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 text-left"><tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="px-3 py-2">Pessoa</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Dias ativos</th><th className="px-3 py-2">Média/dia</th><th className="px-3 py-2">Últimos 14 dias</th><th className="px-3 py-2">Onde mais</th>
          </tr></thead>
          <tbody className="tabular-nums">
            {porPessoa.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <td className="px-3 py-2"><Link href={link({ pessoa: p.id })} className="font-medium hover:underline">{nome(p.id)}</Link></td>
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{horas(p.total)}</td><td className="px-3 py-2">{p.diasAtivos}</td><td className="px-3 py-2 whitespace-nowrap">{horas(p.media)}</td>
                <td className="px-3 py-2"><span className="flex items-end gap-px h-6" title="minutos por dia">{p.porDia.map((v, i) => <span key={i} title={`${ultimos14[i]}: ${v} min`} className={`w-1.5 rounded-sm ${v ? "bg-sky-500" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />)}</span></td>
                <td className="px-3 py-2 text-xs text-neutral-500">{p.secoes.slice(0, 3).map(([s, m]) => `${SECOES[s] ?? s} ${horas(m)}`).join(" · ")}</td>
              </tr>
            ))}
            {!porPessoa.length && <tr><td colSpan={6} className="px-3 py-3 text-neutral-500">Ainda sem medição no período (começou na v2.54).</td></tr>}
          </tbody>
        </table>
      </div>

      {porSecao.length > 0 && (
        <div className={`${CARTAO} p-4 grid gap-2`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Por seção{q.pessoa ? ` · ${nome(q.pessoa)}` : ""}</p>
          {porSecao.map(([s, m]) => (
            <div key={s} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 text-sm">
              <span>{SECOES[s] ?? s}</span>
              <span className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"><span className="block h-full bg-sky-500" style={{ width: `${(m / totalSec) * 100}%` }} /></span>
              <span className="text-xs text-neutral-500 tabular-nums text-right">{horas(m)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-500">Conta 1 minuto por minuto com a página aberta, visível e com algum movimento nos últimos 2 minutos. Várias abas não contam em dobro. WhatsApp e apps de IA aparecem em Atividade.</p>
    </div>
  );
}
