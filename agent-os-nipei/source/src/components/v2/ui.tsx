import Link from "next/link";
import type { ReactNode } from "react";
import StatusBotao from "@/components/v2/StatusBotao";
import { can, type Equipe, type Me, type Pessoa, type Tarefa } from "@/lib/v2/data";
import { fmtDate, type Lang } from "@/lib/v2/i18n";
import ChipDS from "@/components/ds/Chip";
import AvatarDS, { TAMANHOS_AVATAR, iniciais } from "@/components/ds/Avatar";
import { chaveEquipe } from "@/components/ds/equipes";
import LinhaTarefa from "@/components/ds/padroes/LinhaTarefa";
import Cartao from "@/components/ds/Cartao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EstadoVazio } from "@/components/ds/Estados";

/** Compatibilidade: o título antigo agora é o <CabecalhoPagina> do design system. */
export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return <CabecalhoPagina titulo={children} subtitulo={sub} />;
}

/** Seção de página (título `titulo-secao` + contagem em pílula). */
export function Section({ title, count, children }: { title: ReactNode; count?: number; children: ReactNode }) {
  return (
    <section className="mb-8 grid gap-3">
      <h2 className="flex items-center gap-2">
        <span className="titulo-secao text-t1">{title}</span>
        {count != null && <span className="rounded-pilula bg-s2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-t2">{count}</span>}
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

/** One task as the design system's <LinhaTarefa>; the circle (StatusBotao) marks it done and works offline. */
export type RowProps = { equipes: Equipe[]; pessoas: Pessoa[]; lang: Lang; hoje: string; me: Me };

export function TaskRow({ t, equipes, pessoas, lang, hoje, me, extra, selos, arrastavel, selecionar }: { t: Tarefa; extra?: (t: Tarefa) => ReactNode; selos?: string[]; arrastavel?: boolean; selecionar?: string } & RowProps) {
  const en = lang === "en";
  const eq = equipes.find((e) => e.id === t.equipe);
  const pessoa = (id: string) => {
    const p = pessoas.find((x) => x.id === id);
    return { nome: p?.name ?? id, foto: p?.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined };
  };
  // on my own tasks only the OTHER people matter; elsewhere, who owns it
  const minha = !!me.pessoa && t.responsaveis.includes(me.pessoa.id);
  const ids = minha ? t.responsaveis.filter((id) => id !== me.pessoa?.id) : t.responsaveis;
  const feita = t.status === "done";
  const vencido = !!t.prazo && t.prazo < hoje && !feita;
  const editar = can.editTarefa(me, t);
  const metadados = [
    // "em andamento" já aparece no estado da linha
    ...(selos ?? []).filter((x) => !(t.status === "doing" && /andamento|progress/i.test(x))).map((x) => ({ texto: x })),
    ...(t.checklist.total > 0 ? [{ icone: "tarefa" as const, texto: `${t.checklist.feitos}/${t.checklist.total}`, rotulo: "checklist" }] : []),
    ...(t.anexos > 0 ? [{ icone: "baixar" as const, texto: t.anexos, rotulo: en ? "attachments" : "anexos" }] : []),
    ...(t.recorrencia ? [{ icone: "gerar-outra" as const, texto: t.recorrencia }] : []),
  ];
  return (
    <LinhaTarefa href={`/tarefas/${t.id}`} titulo={t.title} equipe={eq?.id} nomeEquipe={chaveEquipe(eq?.id) ? undefined : eq?.nome}
      prazo={feita && t.concluidoEm ? { texto: `${en ? "Done" : "Concluída em"} ${fmtDate(t.concluidoEm.slice(0, 10), lang)}` } : t.prazo ? { texto: fmtDate(t.prazo, lang), vencido } : undefined}
      prioridade={t.priority === "urgente" || t.priority === "alta" ? { nivel: t.priority, rotulo: t.priority === "urgente" ? (en ? "Urgent" : "Urgente") : (en ? "High" : "Alta") } : undefined}
      metadados={metadados} pessoas={ids.map(pessoa)} feita={feita}
      estado={feita ? "feita" : vencido ? "atrasada" : t.status === "doing" ? "andamento" : undefined}
      concluir={editar ? <StatusBotao id={t.id} status={t.status} />
        // read-only: not yours and not your team's to coordinate (dashed = can't change here)
        : <span aria-hidden="true" className="-mx-2 grid size-11 shrink-0 place-items-center"><span className="size-[26px] rounded-pilula border-2 border-dashed border-s4" /></span>}
      antes={selecionar && <input type="checkbox" name="ids" value={t.id} form={selecionar} aria-label={t.title} className="lote-caixa size-4 shrink-0 accent-ac" />}
      extra={extra?.(t)}
      acoes={[{ icone: "avancar", rotulo: en ? "Open" : "Abrir", href: `/tarefas/${t.id}` }, ...(editar ? [{ icone: "editar" as const, rotulo: en ? "Edit" : "Editar", href: `/tarefas/${t.id}/editar` }] : [])]}
      draggable={arrastavel || undefined} data-tarefa={arrastavel ? t.id : undefined} />
  );
}

export function TaskList({ tarefas, selos, ...rest }: { tarefas: Tarefa[]; extra?: (t: Tarefa) => ReactNode; selos?: Record<string, string[]> } & RowProps) {
  return <ul className="overflow-hidden rounded-cartao bg-s1">{tarefas.map((t) => <TaskRow key={t.id} t={t} selos={selos?.[t.id]} {...rest} />)}</ul>;
}

export const initials = iniciais;

/** Compatibilidade: o Avatar antigo (name / size / src) agora é o <Avatar> do design system; o tamanho vai para o mais próximo de 24·32·40·56·80. */
export function Avatar({ name, size = 32, src, equipe }: { name: string; size?: number; src?: string; equipe?: string }) {
  const tamanho = TAMANHOS_AVATAR.reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a));
  return <AvatarDS nome={name} foto={src} tamanho={tamanho} equipe={equipe} />;
}

/** Sort: overdue first, then by due date, undated last. */
export const byPrazo = (a: Tarefa, b: Tarefa) => (a.prazo || "9999").localeCompare(b.prazo || "9999");
