import { registroAdmin } from "@/lib/v2/admin";
import type { ModuloProps } from "./index";

/** The panel's own log: every opening (and how), failed confirmations and actions. */
export default function Registro(_: ModuloProps) {
  const r = registroAdmin(100);
  return (
    <ul className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
      {r.map((x, i) => (
        <li key={i} className={`px-3 py-2 flex flex-wrap gap-x-3 ${/FALHOU/.test(x.oque) ? "text-red-600 dark:text-red-400" : ""}`}>
          <span className="tabular-nums text-neutral-500 w-36">{new Date(x.em).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "medium" })}</span>
          <span>{x.oque}</span>
        </li>
      ))}
      {!r.length && <li className="px-3 py-3 text-neutral-500">Nada registrado ainda.</li>}
    </ul>
  );
}
