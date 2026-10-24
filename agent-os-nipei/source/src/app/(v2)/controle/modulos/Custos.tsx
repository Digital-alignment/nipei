import Link from "next/link";
import { Download } from "lucide-react";
import { getPessoas } from "@/lib/v2/data";
import { custosDoMes, mesesComCusto, ORIGENS, type CustoIA } from "@/lib/v2/custosIA";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";
const usd = (v: number) => `US$ ${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
const tok = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));

type Soma = { n: number; tin: number; tout: number; usd: number; semPreco: number; pessoal: number };
function somar(cs: CustoIA[]): Soma {
  return cs.reduce<Soma>((s, c) => ({ n: s.n + 1, tin: s.tin + c.tin, tout: s.tout + c.tout, usd: s.usd + (c.pessoal ? 0 : c.usd ?? 0), semPreco: s.semPreco + (!c.pessoal && c.usd === null ? 1 : 0), pessoal: s.pessoal + (c.pessoal ? 1 : 0) }), { n: 0, tin: 0, tout: 0, usd: 0, semPreco: 0, pessoal: 0 });
}
function agrupar(cs: CustoIA[], chave: (c: CustoIA) => string) {
  const g = new Map<string, CustoIA[]>();
  for (const c of cs) g.set(chave(c), [...(g.get(chave(c)) ?? []), c]);
  return [...g.entries()].map(([k, v]) => ({ k, ...somar(v) })).sort((a, b) => b.usd - a.usd || b.n - a.n);
}

/** AI calls and cost per month, person, use and model. Filter: ?mes=AAAA-MM */
export default function Custos({ q }: ModuloProps) {
  const atual = new Date().toISOString().slice(0, 7);
  const meses = [...new Set([atual, ...mesesComCusto()])].sort().reverse();
  const mes = meses.includes(q.mes ?? "") ? q.mes! : atual;
  const cs = custosDoMes(mes), t = somar(cs);
  const ps = getPessoas(), nome = (id: string) => (id ? ps.find((p) => p.id === id || p.usuario === id)?.name.split(" (")[0] ?? id : "Tarefas automáticas");
  const chip = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`;
  const tabela = (titulo: string, linhas: ReturnType<typeof agrupar>, rotulo: (k: string) => string) => (
    <div className={`${CARTAO} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead className="text-xs text-neutral-500 text-left"><tr className="border-b border-neutral-100 dark:border-neutral-800">
          <th className="px-3 py-2">{titulo}</th><th className="px-3 py-2">Chamadas</th><th className="px-3 py-2">Tokens (entrada / saída)</th><th className="px-3 py-2">Custo da plataforma</th>
        </tr></thead>
        <tbody className="tabular-nums">
          {linhas.map((l) => (
            <tr key={l.k} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
              <td className="px-3 py-2 font-medium">{rotulo(l.k)}</td><td className="px-3 py-2">{l.n}{l.pessoal ? <span className="text-xs text-neutral-500"> ({l.pessoal} com chave própria)</span> : null}</td>
              <td className="px-3 py-2 whitespace-nowrap">{tok(l.tin)} / {tok(l.tout)}</td><td className="px-3 py-2 font-semibold whitespace-nowrap">{usd(l.usd)}{l.semPreco ? <span className="text-xs font-normal text-neutral-500"> + {l.semPreco} sem preço</span> : null}</td>
            </tr>
          ))}
          {!linhas.length && <tr><td colSpan={4} className="px-3 py-3 text-neutral-500">Nenhuma chamada de IA registrada neste mês (a medição começou na v2.56).</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {meses.slice(0, 12).map((m) => <Link key={m} href={`/controle?m=custos&mes=${m}`} className={chip(m === mes)}>{m}</Link>)}
        <a href={`/controle/exportar?r=custos&mes=${mes}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs"><Download size={13} />CSV do mês</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Custo da plataforma", usd(t.usd)], ["Chamadas", String(t.n)], ["Tokens de entrada", tok(t.tin)], ["Tokens de saída", tok(t.tout)]].map(([r, v]) => (
          <div key={r} className={`${CARTAO} p-3`}><p className="text-xs text-neutral-500">{r}</p><p className="text-xl font-semibold tabular-nums">{v}</p></div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">O custo em dólar vem do OpenRouter (a chave da plataforma). A voz e a transcrição usam o Gemini da plataforma, que informa só os tokens (“sem preço”). Quem usa a própria chave paga direto ao provedor — aparece nas chamadas, não no custo.</p>
      {tabela("Pessoa", agrupar(cs, (c) => c.pessoa), nome)}
      <div className="grid gap-5 md:grid-cols-2">
        {tabela("Uso", agrupar(cs, (c) => c.origem), (k) => ORIGENS[k] ?? k)}
        {tabela("Modelo", agrupar(cs, (c) => `${c.provedor === "plataforma" ? "OpenRouter" : c.provedor} · ${c.modelo}`), (k) => k)}
      </div>
    </div>
  );
}
