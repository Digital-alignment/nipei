import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Check, ExternalLink, FileText, Image as ImageIcon, Link2, Pencil, X } from "lucide-react";
import { Avatar, Chip, Section } from "@/components/v2/ui";
import Upload from "@/components/v2/Upload";
import IAPanel from "@/components/v2/IAPanel";
import { ANEXO_TIPOS, can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefaDetalhe, today, type Anexo, type Status } from "@/lib/v2/data";
import { parseAtividade } from "@/lib/tarefaNote";
import { emAndamento } from "@/lib/v2/trabalhos";
import { fmtDate, getT } from "@/lib/v2/i18n";
import {
  aplicarIAAction, checklistAction, comentarAction, descricaoAction, fazerPorMimAction, linkAction, proporIAAction, removeAnexoAction, setStatusAction, uploadAction,
} from "../../actions";

const field = "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";
const small = "rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm";
const btn = "rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-3 py-1.5 text-xs font-medium";
const isImg = (a: Anexo) => /\.(jpe?g|png|webp|gif)$/i.test(a.path);
const host = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
/** URL of a file of this task (served by ./arquivo/[nome]/route.ts). */
const arquivoUrl = (id: string, a: Anexo) => `/tarefas/${id}/arquivo/${encodeURIComponent(a.path.split("/").pop() ?? "")}`;

function Md({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>{children}</ReactMarkdown>
    </div>
  );
}

export default async function TarefaDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tudo?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const det = getTarefaDetalhe(id);
  if (!det) notFound();
  const { tarefa, doc, anexos } = det;
  const pode = can.editTarefa(me, tarefa) || can.assumir(me, tarefa);
  const equipes = getEquipes(), pessoas = getPessoas();
  const eq = equipes.find((e) => e.id === tarefa.equipe);
  const projeto = getProjetos().find((p) => p.id === tarefa.projeto);
  const objetivo = getObjetivos().find((o) => o.id === tarefa.objetivo);
  const nome = (pid: string) => pessoas.find((p) => p.id === pid)?.name ?? pid;
  const hoje = today();
  const late = tarefa.prazo && tarefa.prazo < hoje && tarefa.status !== "done";

  // Back to where the task was opened from, else its team.
  const ref = (await headers()).get("referer");
  const refPath = ref ? new URL(ref).pathname + new URL(ref).search : "";
  const back = refPath && !refPath.startsWith(`/tarefas/${id}`) ? refPath : eq ? `/equipes/${eq.id}` : "/hoje";

  const atividade = doc.atividade.map((l) => ({ raw: l, p: parseAtividade(l) }));
  const visiveis = q.tudo ? atividade : atividade.slice(0, 30);
  const feitos = doc.checklist.filter((c) => c.feito).length;
  const STATUS: [Status, string][] = [["todo", t.aFazer], ["doing", t.fazendo], ["done", t.feito]];

  return (
    <>
      <Link href={back} className="inline-flex items-center gap-1 text-sm text-neutral-500 mb-3"><ArrowLeft size={16} />{eq?.nome ?? t.hoje}</Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-xl font-semibold tracking-tight flex-1">{tarefa.title}</h1>
          {pode && <Link href={`/tarefas/${id}/editar`} aria-label={t.editar} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><Pencil size={18} /></Link>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {pode ? STATUS.map(([s, label]) => (
            <form key={s} action={setStatusAction}>
              <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} />
              <button className={`rounded-full px-2.5 py-0.5 text-xs border ${tarefa.status === s ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>{label}</button>
            </form>
          )) : <Chip on>{STATUS.find(([s]) => s === tarefa.status)?.[1]}</Chip>}
          {tarefa.prazo && <span className={`text-xs ml-1 ${late ? "text-red-600 dark:text-red-400 font-medium" : "text-neutral-500"}`}>📅 {fmtDate(tarefa.prazo, lang)}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {eq ? <Chip href={`/equipes/${eq.id}`} cor={eq.cor}>{eq.nome}</Chip> : <Chip href="/equipes/sem-equipe">{t.semEquipe}</Chip>}
          {projeto && <Chip href={`/projetos/${projeto.id}`}>{projeto.nome}</Chip>}
          {objetivo && <Chip href={`/objetivos?ano=${objetivo.ano}#${objetivo.id}`}>{objetivo.titulo}</Chip>}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {tarefa.responsaveis.map((r) => <Link key={r} href={`/pessoas/${r}`} className="inline-flex items-center gap-1.5 text-sm"><Avatar name={nome(r)} size={24} />{nome(r).split(" (")[0]}</Link>)}
          {!tarefa.responsaveis.length && tarefa.responsible && <span className="text-sm text-neutral-500">{tarefa.responsible}</span>}
        </div>
      </div>

      {can.usarIA(me, tarefa) && (
        <IAPanel id={id} propor={proporIAAction} aplicar={aplicarIAAction} labels={{
          titulo: t.iaTitulo, detalhar: t.iaDetalhar, proximo: t.iaProximo, atualizar: t.iaAtualizar, pensando: t.iaPensando,
          aplicar: t.iaAplicar, descartar: t.iaDescartar, novaDescricao: t.iaNovaDescricao, adicionarChecklist: t.iaAdicionar,
          concluirChecklist: t.iaConcluir, proximoPasso: t.iaProximoPasso, mudarStatus: t.iaStatus, mudarPrazo: t.iaPrazo,
          fontes: t.iaFontes, nada: t.iaNada, aviso: t.iaAviso, status: { todo: t.aFazer, doing: t.fazendo, done: t.feito },
        }} />
      )}

      {/* T3: Hermes does the work in the background */}
      {can.usarIA(me, tarefa) && (() => {
        const jobs = emAndamento(id);
        return jobs.length ? (
          <div className="mb-7 rounded-xl border border-violet-200 dark:border-violet-900 p-3 text-sm animate-pulse">
            ⏳ {t.hermesTrabalhando} · {t.pedidoPor} {jobs[0].pedidoPorNome} · {new Date(jobs[0].criado).toLocaleTimeString(lang === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })}
          </div>
        ) : (
          <details className="mb-7 rounded-xl border border-violet-200 dark:border-violet-900 p-3">
            <summary className="cursor-pointer text-sm font-medium">🤖 {t.fazerPorMim}</summary>
            <form action={fazerPorMimAction} className="grid gap-2 mt-2">
              <input type="hidden" name="id" value={id} />
              <textarea name="instrucao" rows={3} maxLength={1000} placeholder={t.fazerInstrucao} className={field} />
              <p className="text-[11px] text-neutral-500">{t.fazerAviso}</p>
              <button className={`justify-self-start ${btn}`}>{t.fazerPorMim}</button>
            </form>
          </details>
        );
      })()}

      {/* Descrição */}
      <Section title={t.descricaoTitulo}>
        {doc.descricao ? <Md>{doc.descricao}</Md> : <p className="text-sm text-neutral-500">{t.semDescricao}</p>}
        {pode && (
          <details className="mt-2" open={!doc.descricao}>
            <summary className="cursor-pointer text-xs text-neutral-500">{t.editarDescricao}</summary>
            <form action={descricaoAction} className="grid gap-2 mt-2">
              <input type="hidden" name="id" value={id} />
              <textarea name="descricao" defaultValue={doc.descricao} rows={6} className={field} />
              <button className={`justify-self-start ${btn}`}>{t.salvar}</button>
            </form>
          </details>
        )}
      </Section>

      {/* Checklist */}
      <Section title={t.checklist}>
        {doc.checklist.length > 0 && <p className="text-xs text-neutral-500 -mt-1 mb-2">{feitos}/{doc.checklist.length}</p>}
        <ul className="grid gap-1">
          {doc.checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {pode ? (
                <form action={checklistAction}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="toggle" /><input type="hidden" name="idx" value={i} />
                  <button aria-label={c.texto} className={`w-5 h-5 rounded border flex items-center justify-center ${c.feito ? "bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900" : "border-neutral-400"}`}>{c.feito && <Check size={14} />}</button>
                </form>
              ) : <span className={`w-5 h-5 rounded border flex items-center justify-center ${c.feito ? "bg-neutral-900 border-neutral-900 text-white" : "border-neutral-300"}`}>{c.feito && <Check size={14} />}</span>}
              <span className={`flex-1 ${c.feito ? "line-through text-neutral-400" : ""}`}>{c.texto}</span>
              {pode && (
                <form action={checklistAction}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="remove" /><input type="hidden" name="idx" value={i} />
                  <button aria-label={t.remover} className="p-1 text-neutral-400 hover:text-red-600"><X size={14} /></button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {pode && (
          <form action={checklistAction} className="flex gap-2 mt-2">
            <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="add" />
            <input name="texto" required maxLength={300} placeholder={t.novoItem2} className={`${small} flex-1`} />
            <button className={btn}>+</button>
          </form>
        )}
      </Section>

      {/* Anexos */}
      <Section title={t.anexos} count={anexos.length}>
        {anexos.length === 0 && <p className="text-sm text-neutral-500 mb-2">{t.semAnexos}</p>}
        <ul className="grid gap-2 mb-3">
          {anexos.map((a) => {
            const href = a.tipo === "link" ? a.url : arquivoUrl(id, a);
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2">
                {a.tipo === "arquivo" && isImg(a)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={href} alt="" className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />
                  : <span className="w-12 h-12 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-500">{a.tipo === "link" ? <Link2 size={18} /> : isImg(a) ? <ImageIcon size={18} /> : <FileText size={18} />}</span>}
                <a href={href} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="text-sm truncate hover:underline">{a.titulo}</p>
                  <p className="text-xs text-neutral-500 truncate">{[a.tipo === "link" ? host(a.url) : a.tamanho ? kb(a.tamanho) : "", a.por && nome(a.por).split(" (")[0], a.em && fmtDate(a.em, lang)].filter(Boolean).join(" · ")}</p>
                </a>
                <ExternalLink size={14} className="text-neutral-400 shrink-0" />
                {pode && (
                  <form action={removeAnexoAction}>
                    <input type="hidden" name="id" value={id} /><input type="hidden" name="anexo" value={a.id} />
                    <button aria-label={t.remover} className="p-1 text-neutral-400 hover:text-red-600"><X size={14} /></button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {pode && (
          <div className="grid gap-3">
            <Upload id={id} action={uploadAction} accept={Object.keys(ANEXO_TIPOS).map((e) => `.${e}`).join(",")}
              labels={{ arquivo: t.arquivo, foto: t.foto, enviando: t.enviando, maximo: t.maximo }} />
            <form action={linkAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={id} />
              <input name="url" type="url" required placeholder="https://…" className={`${small} flex-1 min-w-48`} />
              <input name="titulo" maxLength={150} placeholder={t.tituloLink} className={`${small} w-40`} />
              <button className={btn}>{t.adicionarLink}</button>
            </form>
            <p className="text-[11px] text-neutral-500">{t.maximo}</p>
          </div>
        )}
      </Section>

      {/* Atividade + comentários */}
      <Section title={t.atividade}>
        <form action={comentarAction} className="grid gap-2 mb-4">
          <input type="hidden" name="id" value={id} />
          <textarea name="texto" required rows={2} maxLength={1000} placeholder={t.escreverComentario} className={field} />
          <button className={`justify-self-start ${btn}`}>{t.comentar}</button>
        </form>
        <ul className="grid gap-2">
          {visiveis.map(({ raw, p }, i) => p?.comentario != null ? (
            <li key={i} className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
              <p className="text-xs text-neutral-500 mb-1"><span className="font-medium text-neutral-800 dark:text-neutral-200">{p.quem}</span> · {p.quando}</p>
              <p className="text-sm whitespace-pre-line">{p.comentario}</p>
            </li>
          ) : (
            <li key={i} className="text-xs text-neutral-500 pl-1">
              {p ? <><span className="text-neutral-700 dark:text-neutral-300">{p.quem}</span> · {p.texto} <span className="text-neutral-400">· {p.quando}</span></> : raw.replace(/^-\s*/, "")}
            </li>
          ))}
        </ul>
        {!q.tudo && atividade.length > visiveis.length && <Link href={`/tarefas/${id}?tudo=1`} className="text-xs underline text-neutral-500 mt-2 inline-block">{t.verMais} ({atividade.length})</Link>}
      </Section>

      {doc.origem && (
        <Section title={t.origem}>
          <div className="text-neutral-500"><Md>{doc.origem}</Md></div>
        </Section>
      )}
    </>
  );
}
