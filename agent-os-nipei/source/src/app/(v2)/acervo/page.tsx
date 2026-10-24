import Link from "next/link";
import { Brain, CheckCircle2, ExternalLink, FileText, Folder, GraduationCap, Image as ImageIcon, Music, Palette, Pencil, Plus, Video, type LucideIcon } from "lucide-react";
import { Empty, Title } from "@/components/v2/ui";
import AcervoForm, { FiltroAuto, type AcervoFormLabels } from "@/components/v2/AcervoForm";
import CopiarBotao from "@/components/v2/CopiarBotao";
import ConfirmarBotao from "@/components/v2/ConfirmarBotao";
import Recolhivel, { BotaoSecao } from "@/components/v2/Recolhivel";
import { ACERVO_TIPOS, currentUser, getAcervo, getPessoas, getProjetos, podeEditarAcervo, type AcervoItem } from "@/lib/v2/data";
import { tipoLink } from "@/lib/v2/acervoLinks";
import { getFatos, getFontes } from "@/lib/v2/conhecimento";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { arquivarAcervoAction, createAcervoAction, ensinarAcervoAction, updateAcervoAction } from "../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const sel = "rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm min-w-0";
const ICONE: Record<string, LucideIcon> = { fotos: ImageIcon, videos: Video, audios: Music, cursos: GraduationCap, documentos: FileText, marca: Palette, outros: Folder };
const COR: Record<string, string> = {
  fotos: "text-sky-600 bg-sky-50 dark:bg-sky-950/50", videos: "text-red-600 bg-red-50 dark:bg-red-950/50", audios: "text-violet-600 bg-violet-50 dark:bg-violet-950/50",
  cursos: "text-amber-600 bg-amber-50 dark:bg-amber-950/50", documentos: "text-blue-600 bg-blue-50 dark:bg-blue-950/50", marca: "text-pink-600 bg-pink-50 dark:bg-pink-950/50", outros: "text-neutral-500 bg-neutral-100 dark:bg-neutral-800",
};
const ORDENS = ["ano", "recentes", "az"] as const;

// Acervo: index of Google Drive links (files stay in Drive). Search + type chips with counts + project/year/
// sort selects; with no filter the list is grouped by type. Add/edit with link detection (lib/v2/acervoLinks.ts);
// "remove" hides the item (arquivado) without touching Drive. Add: gestão or coordination; edit/remove:
// gestão or whoever added it (podeEditarAcervo).
export default async function Acervo({ searchParams }: { searchParams: Promise<{ tipo?: string; projeto?: string; ano?: string; ordem?: string; q?: string; ok?: string; erro?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const projetos = getProjetos(), pessoas = getPessoas(), todos = getAcervo();
  const podeAdicionar = me.gestao || me.coordena.length > 0;
  const ordem = (ORDENS as readonly string[]).includes(q.ordem ?? "") ? q.ordem! : "ano";
  const busca = (q.q ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const casa = (i: AcervoItem) => !busca || busca.split(/\s+/).every((w) => `${i.titulo} ${i.descricao} ${i.url}`.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").includes(w));
  // counts per type ignore the type filter, so the chips show what each one would give
  const semTipo = todos.filter((i) => (!q.projeto || i.projeto === q.projeto) && (!q.ano || i.ano === q.ano) && casa(i));
  const itens = semTipo.filter((i) => !q.tipo || i.tipo === q.tipo)
    .sort(ordem === "az" ? (a, b) => a.titulo.localeCompare(b.titulo, "pt") : ordem === "recentes" ? (a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm) : () => 0);
  const filtrando = !!(q.tipo || q.projeto || q.ano || busca || ordem !== "ano");
  const anos = [...new Set(todos.map((i) => i.ano).filter(Boolean))].sort().reverse();
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.name.split(" (")[0] ?? (id === "claude-code" ? "migração" : id);
  const link = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ tipo: q.tipo, projeto: q.projeto, ano: q.ano, ordem: q.ordem, q: q.q, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/acervo${s ? `?${s}` : ""}`;
  };
  const tiposOpc = ACERVO_TIPOS.map((tp) => ({ id: tp, nome: t.tipos[tp] }));
  // Acervo ↔ Conhecimento: the newest source taught from each item, with its facts
  const fontes = getFontes(), fatos = getFatos();
  const naIA = (id: string) => {
    const f = fontes.filter((x) => x.acervo === id).sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))[0];
    if (!f) return null;
    const meus = fatos.filter((x) => x.fonte === f.id);
    return { f, conf: meus.filter((x) => x.status === "confirmado").length, prop: meus.filter((x) => x.status === "proposto").length };
  };
  const labels: AcervoFormLabels = { link: t.link, titulo: t.titulo, tipo: t.tipo, projeto: t.projeto, ano: t.ano, descricao: t.descricao, nenhum: t.nenhum, salvar: t.salvar, enviando: t.salvando, detectado: t.linkDetectado };
  const chip = (on: boolean) => `shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs border ${on ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"}`;

  const Cartao = ({ i }: { i: AcervoItem }) => {
    const Icone = ICONE[i.tipo] ?? Folder, tl = tipoLink(i.url), ia = naIA(i.id), pasta = tl?.rotulo === "Pasta do Drive";
    return (
      <li id={i.id} className="scroll-mt-20 target:ring-2 target:ring-neutral-400 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 grid gap-2">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${COR[i.tipo] ?? COR.outros}`}><Icone size={18} /></span>
          <div className="min-w-0 flex-1">
            <a href={i.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline break-words">{i.titulo}</a>
            <p className="text-xs text-neutral-500 mt-0.5">{[t.tipos[i.tipo] ?? i.tipo, tl?.rotulo, i.ano, i.projeto && (projetos.find((p) => p.id === i.projeto)?.nome ?? i.projeto)].filter(Boolean).join(" · ")}</p>
            {i.descricao && <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{i.descricao}</p>}
          </div>
          <a href={i.url} target="_blank" rel="noreferrer" aria-label={t.abrir} title={t.abrir} className="shrink-0 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"><ExternalLink size={16} /></a>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
          {ia ? (
            <Link href={`/conhecimento/${ia.f.id}`} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${ia.f.status === "erro" ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"}`}>
              <Brain size={12} />{t.naIA}: {ia.f.status === "processando" ? t.lendoIA : ia.f.status === "erro" ? t.erroIA : [ia.conf && `${ia.conf} ${t.fatosConfirmadosMin}`, ia.prop && `${ia.prop} ${t.fatosParaRevisar}`].filter(Boolean).join(" · ") || t.semFatos}
            </Link>
          ) : !pasta && (
            <form action={ensinarAcervoAction}><input type="hidden" name="id" value={i.id} /><BotaoEnviar enviando="…" className="inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200"><Brain size={12} />{t.ensinarIA}</BotaoEnviar></form>
          )}
          {i.adicionadoPor && <span>{t.adicionadoPorLbl} {nome(i.adicionadoPor)}{i.adicionadoEm && ` · ${fmtDate(i.adicionadoEm.slice(0, 10), lang)}`}</span>}
          <CopiarBotao texto={i.url} label={t.copiarLinkCurto} copiado={t.copiado} className="ml-auto inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200" />
          {podeEditarAcervo(me, i) && (
            <details className="group/ed w-full [&:not([open])]:w-auto">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200"><Pencil size={12} />{t.editar}</summary>
              <div className="mt-3 grid gap-3 text-neutral-800 dark:text-neutral-200">
                <AcervoForm action={updateAcervoAction} id={i.id} tipos={tiposOpc} projetos={projetos} labels={labels} inicial={i} />
                <form action={arquivarAcervoAction}><input type="hidden" name="id" value={i.id} /><ConfirmarBotao pergunta={t.removerAcervoPergunta} className="text-xs text-red-600 dark:text-red-400 underline">{t.removerDoAcervo}</ConfirmarBotao></form>
              </div>
            </details>
          )}
        </div>
      </li>
    );
  };
  const Lista = ({ lista }: { lista: AcervoItem[] }) => <ul className="grid gap-2 md:grid-cols-2">{lista.map((i) => <Cartao key={i.id} i={i} />)}</ul>;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <Title sub={t.acervoIntro}>{t.acervo}</Title>
        {podeAdicionar && <BotaoSecao id="novo" className="shrink-0 mt-1 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-2 text-sm font-medium"><Plus size={16} />{t.adicionar}</BotaoSecao>}
      </div>
      {q.ok && !q.erro && <p className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm"><CheckCircle2 size={16} className="text-green-600 shrink-0" />{q.ok}</p>}

      {podeAdicionar && (
        <Recolhivel id="novo" titulo={t.novoItem} aberto={todos.length === 0}>
          <AcervoForm action={createAcervoAction} tipos={tiposOpc} projetos={projetos} labels={{ ...labels, salvar: t.adicionar }} />
        </Recolhivel>
      )}

      <FiltroAuto className="grid gap-2 mb-3">
        {q.tipo && <input type="hidden" name="tipo" value={q.tipo} />}
        <input name="q" type="search" defaultValue={q.q} placeholder={t.buscar} className={field} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <select name="projeto" defaultValue={q.projeto ?? ""} aria-label={t.projeto} className={sel}><option value="">{t.todosProjetos}</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <select name="ano" defaultValue={q.ano ?? ""} aria-label={t.ano} className={sel}><option value="">{t.todosAnos}</option>{anos.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          <select name="ordem" defaultValue={ordem} aria-label={t.ordenar} className={`${sel} col-span-2 md:col-span-1`}>
            <option value="ano">{t.ordemAno}</option><option value="recentes">{t.ordemRecentes}</option><option value="az">{t.ordemAz}</option>
          </select>
        </div>
      </FiltroAuto>

      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 mb-3">
        <a href={link({ tipo: undefined })} className={chip(!q.tipo)}>{t.todas} <span className="opacity-60 tabular-nums">{semTipo.length}</span></a>
        {ACERVO_TIPOS.map((tp) => {
          const n = semTipo.filter((i) => i.tipo === tp).length;
          return (n > 0 || q.tipo === tp) && <a key={tp} href={link({ tipo: tp })} className={chip(q.tipo === tp)}>{t.tipos[tp]} <span className="opacity-60 tabular-nums">{n}</span></a>;
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
        <span className="tabular-nums">{itens.length} {t.itensN}</span>
        {filtrando && <a href="/acervo" className="underline">{t.limpar}</a>}
      </div>

      {todos.length === 0 ? <Empty>{t.acervoVazio}</Empty> : itens.length === 0 ? <Empty>{t.semItens}</Empty> : filtrando ? <Lista lista={itens} /> : (
        <div className="grid gap-5">
          {ACERVO_TIPOS.filter((tp) => itens.some((i) => i.tipo === tp)).map((tp) => (
            <section key={tp}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{t.tipos[tp]} <span className="font-normal">({itens.filter((i) => i.tipo === tp).length})</span></h2>
              <Lista lista={itens.filter((i) => i.tipo === tp)} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
