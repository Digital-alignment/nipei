import Link from "next/link";
import { getAcessos, getPessoas } from "@/lib/v2/data";
import { todosAcessos } from "@/lib/v2/seguranca";
import { getConexoes } from "@/lib/v2/conexoes";
import { concessoesDe } from "@/lib/v2/oauthMcp";
import type { ModuloProps } from "./index";

const METODO: Record<string, string> = { senha: "senha", google: "Google", link: "link WhatsApp" };
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });
const CARTAO = "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";

/** Who logged in, when and how; plus each person's last use and connections. Filters: ?pessoa= &metodo= */
export default function Acessos({ q }: ModuloProps) {
  const pessoas = getPessoas(), nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? id;
  const todos = todosAcessos(), usos = getAcessos();
  const desde30 = Date.now() - 30 * 86_400_000;
  // everyone who logged in or used the platform at least once
  const ids = [...new Set([...todos.map((a) => a.pessoa), ...Object.keys(usos)])];
  const linhas = ids.map((id) => {
    const meus = todos.filter((a) => a.pessoa === id), c = getConexoes(id);
    return { id, ultimo: meus[0], logins30: meus.filter((a) => Date.parse(a.em) > desde30).length, uso: usos[id] ?? "", google: !!c.google, apps: concessoesDe(id).map((g) => g.nomeCliente) };
  }).sort((a, b) => (b.uso || "").localeCompare(a.uso || "") || (b.ultimo?.em ?? "").localeCompare(a.ultimo?.em ?? ""));
  const lista = todos.filter((a) => (!q.pessoa || a.pessoa === q.pessoa) && (!q.metodo || a.metodo === q.metodo)).slice(0, 100);
  const filtro = (k: string, v?: string) => { const s = new URLSearchParams({ m: "acessos", ...(q.pessoa ? { pessoa: q.pessoa } : {}), ...(q.metodo ? { metodo: q.metodo } : {}) }); if (v) s.set(k, v); else s.delete(k); return `/controle?${s}`; };
  const chip = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`;

  return (
    <div className="grid gap-5">
      <div className={`${CARTAO} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 text-left"><tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="px-3 py-2">Pessoa</th><th className="px-3 py-2">Último uso</th><th className="px-3 py-2">Último login</th><th className="px-3 py-2">Logins 30d</th><th className="px-3 py-2">Conexões</th>
          </tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <td className="px-3 py-2"><Link href={filtro("pessoa", l.id)} className="hover:underline font-medium">{nome(l.id)}</Link></td>
                <td className="px-3 py-2 tabular-nums">{l.uso ? l.uso.split("-").reverse().join("/") : "—"}</td>
                <td className="px-3 py-2">{l.ultimo ? `${quando(l.ultimo.em)} · ${METODO[l.ultimo.metodo] ?? l.ultimo.metodo}` : <span className="text-neutral-400">antes do registro</span>}</td>
                <td className="px-3 py-2 tabular-nums">{l.logins30}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{[l.google && "Google", ...l.apps].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-1">Logins</span>
          <Link href={filtro("metodo")} className={chip(!q.metodo)}>todos</Link>
          {Object.entries(METODO).map(([k, v]) => <Link key={k} href={filtro("metodo", k)} className={chip(q.metodo === k)}>{v}</Link>)}
          {q.pessoa && <Link href={filtro("pessoa")} className={chip(true)}>{nome(q.pessoa)} ✕</Link>}
        </div>
        <ul className={`${CARTAO} divide-y divide-neutral-100 dark:divide-neutral-800 text-sm`}>
          {lista.map((a, i) => (
            <li key={i} className="px-3 py-2 flex flex-wrap gap-x-3"><span className="tabular-nums text-neutral-500 w-32">{quando(a.em)}</span><span className="font-medium w-40 truncate">{nome(a.pessoa)}</span><span>{METODO[a.metodo] ?? a.metodo}</span><span className="text-neutral-500">{a.disp}</span></li>
          ))}
          {!lista.length && <li className="px-3 py-3 text-neutral-500">Nenhum login registrado (o registro começou na v2.51).</li>}
        </ul>
      </div>
    </div>
  );
}
