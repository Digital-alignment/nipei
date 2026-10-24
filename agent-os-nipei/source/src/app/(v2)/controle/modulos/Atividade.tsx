import Link from "next/link";
import { getPessoas } from "@/lib/v2/data";
import { atividade, type Canal } from "@/lib/v2/eventos";
import type { ModuloProps } from "./index";

const CANAIS: Record<Canal, string> = { plataforma: "plataforma", assistente: "assistente", whatsapp: "WhatsApp", mcp: "app de IA", sistema: "sistema" };
const COR: Record<Canal, string> = { plataforma: "bg-neutral-400", assistente: "bg-violet-500", whatsapp: "bg-green-600", mcp: "bg-sky-500", sistema: "bg-neutral-300" };
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });
const diaBahia = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Bahia" }).slice(0, 10);
const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";

/** What each person did: tasks, people organisation, assistant, WhatsApp, AI apps, logins. Filters: ?pessoa ?dias ?canal */
export default function Atividade({ q }: ModuloProps) {
  const dias = [7, 30, 90].includes(Number(q.dias)) ? Number(q.dias) : 30;
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const todos = atividade(dias);
  const acoes = todos.filter((e) => e.tipo !== "entrou");
  const ultimos14 = Array.from({ length: 14 }, (_, i) => diaBahia(new Date(Date.now() - (13 - i) * 86_400_000).toISOString()));

  const porPessoa = [...new Set(todos.map((e) => e.pessoa))].map((id) => {
    const meus = acoes.filter((e) => e.pessoa === id);
    const n = (f: (t: string) => boolean) => meus.filter((e) => f(e.tipo)).length;
    const porDia = ultimos14.map((d) => meus.filter((e) => diaBahia(e.em) === d).length);
    return {
      id, total: meus.length, logins: todos.filter((e) => e.pessoa === id && e.tipo === "entrou").length,
      tarefas: n((t) => /tarefa|status|atribuiu|prazo|comentou/.test(t)), pessoasOrg: n((t) => t === "organizou pessoas"),
      assistente: meus.filter((e) => e.canal === "assistente").length, whatsapp: meus.filter((e) => e.canal === "whatsapp").length, mcp: meus.filter((e) => e.canal === "mcp").length,
      ultima: meus[0]?.em ?? "", porDia,
    };
  }).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...porPessoa.flatMap((p) => p.porDia));

  const lista = todos.filter((e) => (!q.pessoa || e.pessoa === q.pessoa) && (!q.canal || e.canal === q.canal)).slice(0, 150);
  const link = (mud: Record<string, string | undefined>) => { const s = new URLSearchParams(Object.entries({ m: "atividade", dias: String(dias), pessoa: q.pessoa, canal: q.canal, ...mud }).filter(([, v]) => v) as [string, string][]); return `/controle?${s}`; };
  const chip = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {[7, 30, 90].map((d) => <Link key={d} href={link({ dias: String(d) })} className={chip(d === dias)}>{d} dias</Link>)}
        <span className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
        <Link href={link({ canal: undefined })} className={chip(!q.canal)}>todos os canais</Link>
        {(Object.keys(CANAIS) as Canal[]).filter((c) => c !== "sistema").map((c) => <Link key={c} href={link({ canal: c })} className={chip(q.canal === c)}>{CANAIS[c]}</Link>)}
        {q.pessoa && <Link href={link({ pessoa: undefined })} className={chip(true)}>{nome(q.pessoa)} ✕</Link>}
      </div>

      <div className={`${CARTAO} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 text-left"><tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="px-3 py-2">Pessoa</th><th className="px-3 py-2">Ações</th><th className="px-3 py-2">Tarefas</th><th className="px-3 py-2">Pessoas</th>
            <th className="px-3 py-2">Assistente</th><th className="px-3 py-2">WhatsApp</th><th className="px-3 py-2">Apps IA</th><th className="px-3 py-2">Logins</th>
            <th className="px-3 py-2">Últimos 14 dias</th><th className="px-3 py-2">Última ação</th>
          </tr></thead>
          <tbody className="tabular-nums">
            {porPessoa.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <td className="px-3 py-2"><Link href={link({ pessoa: p.id })} className="font-medium hover:underline">{nome(p.id)}</Link></td>
                <td className="px-3 py-2 font-semibold">{p.total}</td><td className="px-3 py-2">{p.tarefas}</td><td className="px-3 py-2">{p.pessoasOrg}</td>
                <td className="px-3 py-2">{p.assistente}</td><td className="px-3 py-2">{p.whatsapp}</td><td className="px-3 py-2">{p.mcp}</td><td className="px-3 py-2">{p.logins}</td>
                <td className="px-3 py-2"><span className="flex items-end gap-px h-6" title="ações por dia">{p.porDia.map((v, i) => <span key={i} className={`w-1.5 rounded-sm ${v ? "bg-green-500" : "bg-neutral-200 dark:bg-neutral-800"}`} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />)}</span></td>
                <td className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">{p.ultima ? quando(p.ultima) : "—"}</td>
              </tr>
            ))}
            {!porPessoa.length && <tr><td colSpan={10} className="px-3 py-3 text-neutral-500">Nada no período.</td></tr>}
          </tbody>
        </table>
      </div>

      <ul className={`${CARTAO} divide-y divide-neutral-100 dark:divide-neutral-800 text-sm`}>
        {lista.map((e, i) => (
          <li key={i} className="px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="tabular-nums text-xs text-neutral-500 w-28 shrink-0">{quando(e.em)}</span>
            <span className="font-medium w-28 truncate shrink-0">{nome(e.pessoa)}</span>
            <span className="inline-flex items-center gap-1 text-xs w-36 shrink-0"><span className={`w-2 h-2 rounded-full ${COR[e.canal]}`} />{e.tipo}</span>
            <span className="text-neutral-600 dark:text-neutral-300 min-w-0 flex-1 truncate" title={e.detalhe}>{e.detalhe}</span>
          </li>
        ))}
        {!lista.length && <li className="px-3 py-3 text-neutral-500">Nada no período.</li>}
      </ul>
      <p className="text-xs text-neutral-500">Tarefas e organização de pessoas vêm do histórico das notas (desde o início); assistente, WhatsApp, apps de IA, exportações e conexões são registrados desde a v2.53. Nunca guardamos o conteúdo das mensagens.</p>
    </div>
  );
}
