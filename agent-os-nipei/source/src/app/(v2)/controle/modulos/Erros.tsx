import Link from "next/link";
import { Download } from "lucide-react";
import { errosRecentes } from "@/lib/v2/erros";
import type { ModuloProps } from "./index";

const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** Server errors, grouped by message (same error many times = one line). Filter: ?dias */
export default function Erros({ q }: ModuloProps) {
  const dias = [1, 7, 30].includes(Number(q.dias)) ? Number(q.dias) : 7;
  const es = errosRecentes(dias);
  const grupos = [...es.reduce((g, e) => {
    const k = e.msg.replace(/\d+/g, "#").slice(0, 160);
    const x = g.get(k) ?? { e, n: 0, onde: new Set<string>() };
    x.n++; x.onde.add(e.onde); g.set(k, x);
    return g;
  }, new Map<string, { e: (typeof es)[number]; n: number; onde: Set<string> }>()).values()];
  const chip = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 7, 30].map((d) => <Link key={d} href={`/controle?m=erros&dias=${d}`} className={chip(d === dias)}>{d === 1 ? "24 horas" : `${d} dias`}</Link>)}
        <span className="text-xs text-neutral-500 ml-1">{es.length} erro{es.length === 1 ? "" : "s"}, {grupos.length} diferente{grupos.length === 1 ? "" : "s"}</span>
        <a href={`/controle/exportar?r=erros&dias=${dias}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs"><Download size={13} />CSV</a>
      </div>
      {!grupos.length && <p className={`${CARTAO} p-4 text-sm text-green-700 dark:text-green-400`}>Nenhum erro do servidor no período. 🎉</p>}
      <ul className="grid gap-2">
        {grupos.map(({ e, n, onde }, i) => (
          <li key={i} className={`${CARTAO} p-3 grid gap-1`}>
            <p className="text-sm font-medium text-red-700 dark:text-red-400 break-words">{e.msg}</p>
            <p className="text-xs text-neutral-500">{n}× · último {quando(e.em)} · {[...onde].slice(0, 3).join(" · ")}{onde.size > 3 ? ` +${onde.size - 3}` : ""}</p>
            {e.pilha && <details className="text-xs text-neutral-500"><summary className="cursor-pointer">Onde no código</summary><p className="mt-1 font-mono break-all">{e.pilha.split(" | ").map((l, j) => <span key={j} className="block">{l}</span>)}</p></details>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">Entram aqui os erros que ninguém veria: falhas inesperadas em páginas, botões e rotas, e a IA fora do ar. Avisos normais para a pessoa (“campo obrigatório”) não entram.</p>
    </div>
  );
}
