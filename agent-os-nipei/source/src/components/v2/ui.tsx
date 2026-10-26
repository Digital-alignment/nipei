import Link from "next/link";
import type { ReactNode } from "react";
import StatusBotao from "@/components/v2/StatusBotao";
import { can, type Equipe, type Me, type Pessoa, type Tarefa } from "@/lib/v2/data";
import { fmtDate, type Lang } from "@/lib/v2/i18n";
import ChipDS from "@/components/ds/Chip";
import AvatarDS, { TAMANHOS_AVATAR, iniciais } from "@/components/ds/Avatar";
import { chaveEquipe } from "@/components/ds/equipes";
import Cartao from "@/components/ds/Cartao";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EstadoVazio } from "@/components/ds/Estados";

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

/** Compatibilidade: o Card antigo (href / cor) agora é o <Cartao> do design system; `cor` de equipe vira a barra lateral. */
export function Card({ children, href, cor }: { children: ReactNode; href?: string; cor?: string }) {
  return <Cartao variante={href ? "clicavel" : "padrao"} href={href} equipe={cor} className="block">{children}</Cartao>;
}

/** Compatibilidade: o Chip antigo (cor / on) agora é o <Chip> do design system (components/ds/Chip). */
export function Chip({ children, cor, href, on }: { children: ReactNode; cor?: string; href?: string; on?: boolean }) {
  const equipe = chaveEquipe(cor);
  return <ChipDS tipo={equipe ? "equipe" : "filtro"} equipe={equipe} ativo={on} href={href}>{children}</ChipDS>;
}

/** Compatibilidade: a barra antiga (done / total) agora é a <BarraProgresso> do design system. */
export function Progress({ done, total }: { done: number; total: number }) {
  return <BarraProgresso valor={done} max={total} rotulo={`${total ? Math.round((done / total) * 100) : 0}% · ${done}/${total}`} />;
}

/** Compatibilidade: o "nada aqui" antigo agora é o <EstadoVazio compacto> do design system. */
export function Empty({ children }: { children: ReactNode }) {
  return <EstadoVazio compacto titulo={children} />;
}

/** One task: a tap on the circle marks it done (or reopens it). Plain form → works without JS. */
export type RowProps = { equipes: Equipe[]; pessoas: Pessoa[]; lang: Lang; hoje: string; me: Me };

export function TaskRow({ t, equipes, pessoas, lang, hoje, me, extra, selos, arrastavel, selecionar }: { t: Tarefa; extra?: (t: Tarefa) => ReactNode; selos?: string[]; arrastavel?: boolean; selecionar?: string } & RowProps) {
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
      {selecionar && <input type="checkbox" name="ids" value={t.id} form={selecionar} aria-label={t.title} className="lote-caixa mt-1 w-4 h-4 shrink-0 accent-neutral-900 dark:accent-white" />}
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

export const initials = iniciais;

/** Compatibilidade: o Avatar antigo (name / size / src) agora é o <Avatar> do design system; o tamanho vai para o mais próximo de 24·32·40·56·80. */
export function Avatar({ name, size = 32, src, equipe }: { name: string; size?: number; src?: string; equipe?: string }) {
  const tamanho = TAMANHOS_AVATAR.reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a));
  return <AvatarDS nome={name} foto={src} tamanho={tamanho} equipe={equipe} />;
}

/** Sort: overdue first, then by due date, undated last. */
export const byPrazo = (a: Tarefa, b: Tarefa) => (a.prazo || "9999").localeCompare(b.prazo || "9999");
