import Link from "next/link";
import type { ReactNode } from "react";
import StatusBotao from "@/components/v2/StatusBotao";
import { can, type Equipe, type Me, type Pessoa, type Tarefa } from "@/lib/v2/data";
import { fmtDate, type Lang } from "@/lib/v2/i18n";

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="text-sm text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
        {title}{count != null && <span className="ml-1 font-normal">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

export function Card({ children, href, cor }: { children: ReactNode; href?: string; cor?: string }) {
  const cls = "block rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900";
  const style = cor ? { borderLeft: `4px solid ${cor}` } : undefined;
  return href ? <Link href={href} className={`${cls} hover:border-neutral-400 dark:hover:border-neutral-600`} style={style}>{children}</Link>
    : <div className={cls} style={style}>{children}</div>;
}

export function Chip({ children, cor, href, on }: { children: ReactNode; cor?: string; href?: string; on?: boolean }) {
  const cls = `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"}`;
  const dot = cor && <span className="w-2 h-2 rounded-full" style={{ background: cor }} />;
  return href ? <Link href={href} className={cls}>{dot}{children}</Link> : <span className={cls}>{dot}{children}</span>;
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div className="h-full bg-neutral-800 dark:bg-neutral-200" style={{ width: `${pct}%` }} />
      </div>
      {pct}% · {done}/{total}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-500 py-3">{children}</p>;
}

/** One task: a tap on the circle marks it done (or reopens it). Plain form → works without JS. */
export type RowProps = { equipes: Equipe[]; pessoas: Pessoa[]; lang: Lang; hoje: string; me: Me };

export function TaskRow({ t, equipes, pessoas, lang, hoje, me, extra, selos, arrastavel }: { t: Tarefa; extra?: (t: Tarefa) => ReactNode; selos?: string[]; arrastavel?: boolean } & RowProps) {
  const eq = equipes.find((e) => e.id === t.equipe);
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" ")[0] ?? id;
  const minha = !!me.pessoa && t.responsaveis.includes(me.pessoa.id);
  const outros = t.responsaveis.filter((id) => id !== me.pessoa?.id);
  // on my own tasks only the OTHER people matter ("+2"); elsewhere, who owns it
  const who = minha ? (outros.length ? `+${outros.length}` : "") : t.responsaveis.map(nome).join(", ") || t.responsible;
  const late = t.prazo && t.prazo < hoje && t.status !== "done";
  const marca = t.priority === "urgente" ? "text-red-600 dark:text-red-400" : t.priority === "alta" ? "text-amber-600 dark:text-amber-400" : "";
  return (
    <li title={eq?.nome} draggable={arrastavel || undefined} data-tarefa={arrastavel ? t.id : undefined} className="flex flex-wrap items-start gap-x-3 py-2 pl-2.5 border-l-2 border-b border-b-neutral-100 dark:border-b-neutral-800 last:border-b-0"
      style={{ borderLeftColor: eq?.cor ?? "transparent" }}>
      {can.editTarefa(me, t) ? (
        <StatusBotao id={t.id} status={t.status} />
      ) : (
        // Read-only: not yours and not your team's to coordinate.
        <span aria-hidden className="mt-0.5 w-5 h-5 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/tarefas/${t.id}`} className={`block text-sm leading-snug hover:underline ${t.status === "done" ? "line-through text-neutral-400" : ""}`}>
          {marca && <span className={`${marca} font-semibold mr-1`} aria-label={t.priority}>{t.priority === "urgente" ? "!!" : "!"}</span>}{t.title}
        </Link>
        <p className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-x-2">
          {t.prazo && <span className={late ? "text-red-600 dark:text-red-400 font-medium" : ""}>{fmtDate(t.prazo, lang)}</span>}
          {who && <span title={minha ? outros.map(nome).join(", ") : undefined}>{who}</span>}
          {selos?.map((s) => <span key={s} className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 text-[10px] text-neutral-600 dark:text-neutral-300">{s}</span>)}
          {t.checklist.total > 0 && <span>☑ {t.checklist.feitos}/{t.checklist.total}</span>}
          {t.anexos > 0 && <span>📎 {t.anexos}</span>}
          {t.recorrencia && <span title={t.recorrencia}>🔁</span>}
        </p>
      </div>
      {extra?.(t)}
    </li>
  );
}

export function TaskList({ tarefas, selos, ...rest }: { tarefas: Tarefa[]; extra?: (t: Tarefa) => ReactNode; selos?: Record<string, string[]> } & RowProps) {
  return <ul>{tarefas.map((t) => <TaskRow key={t.id} t={t} selos={selos?.[t.id]} {...rest} />)}</ul>;
}

export function initials(name: string) {
  return name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function Avatar({ name, size = 32, src }: { name: string; size?: number; src?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials(name)}</span>
  );
}

/** Sort: overdue first, then by due date, undated last. */
export const byPrazo = (a: Tarefa, b: Tarefa) => (a.prazo || "9999").localeCompare(b.prazo || "9999");
