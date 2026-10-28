import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Upload from "@/components/v2/Upload";
import IAPanel from "@/components/v2/IAPanel";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Botao, { BotaoIcone } from "@/components/ds/Botao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import Icone, { type NomeIcone } from "@/components/ds/Icone";
import Avatar from "@/components/ds/Avatar";
import Campo from "@/components/ds/Campo";
import { AbasComPainel } from "@/components/ds/Abas";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EstadoVazio } from "@/components/ds/Estados";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import LinhaDoTempo, { deAtividade } from "@/components/ds/padroes/LinhaDoTempo";
import { ANEXO_TIPOS, can, currentUser, getEquipes, getObjetivos, getPessoas, getProjetos, getTarefaDetalhe, today, type Anexo, type Status } from "@/lib/v2/data";
import { parseAtividade } from "@/lib/tarefaNote";
import { chaveTrecho, getFontes } from "@/lib/v2/conhecimento";
import { emAndamento } from "@/lib/v2/trabalhos";
import { fmtDate, getT } from "@/lib/v2/i18n";
import {
  aplicarIAAction, checklistAction, comentarAction, tarefaConhecimentoAction, descricaoAction, fazerPorMimAction, linkAction, proporIAAction, removeAnexoAction, setStatusAction, uploadAction,
} from "../../actions";

const isImg = (a: Anexo) => /\.(jpe?g|png|webp|gif)$/i.test(a.path);
const host = (u: string) => { try { return new URL(u).hostname; } catch { return u; } };
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
/** URL of a file of this task (served by ./arquivo/[nome]/route.ts). */
const arquivoUrl = (id: string, a: Anexo) => `/tarefas/${id}/arquivo/${encodeURIComponent(a.path.split("/").pop() ?? "")}`;
// dentro do painel (superfície 2) os itens e campos ficam um tom abaixo, como poços
const POCO = "rounded-[16px] bg-s1";
const btnTonal = "anel-foco inline-flex h-11 items-center gap-2 rounded-pilula bg-s3 px-4 font-texto text-sm font-semibold text-t1 hover:bg-s4";

function Md({ children }: { children: string }) {
  return (
    <div className="corpo text-t1 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>{children}</ReactMarkdown>
    </div>
  );
}

function Bloco({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <h2 className="flex items-center gap-2"><span className="titulo-cartao">{titulo}</span>{extra}</h2>
      {children}
    </section>
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
  const chave = chaveEquipe(eq?.id);
  const projeto = getProjetos().find((p) => p.id === tarefa.projeto);
  const objetivo = getObjetivos().find((o) => o.id === tarefa.objetivo);
  const pessoa = (pid: string) => pessoas.find((p) => p.id === pid);
  const nome = (pid: string) => pessoa(pid)?.name ?? pid;
  const foto = (pid: string) => { const p = pessoa(pid); return p?.foto ? `/pessoas/${p.id}/foto?v=${encodeURIComponent(p.fotoEm || p.dadosConfirmadosEm)}` : undefined; };
  const hoje = today();
  const late = !!tarefa.prazo && tarefa.prazo < hoje && tarefa.status !== "done";

  // Back to where the task was opened from, else its team.
  const ref = (await headers()).get("referer");
  const refPath = ref ? new URL(ref).pathname + new URL(ref).search : "";
  const back = refPath && !refPath.startsWith(`/tarefas/${id}`) ? refPath : eq ? `/equipes/${eq.id}` : "/hoje";

  const atividade = doc.atividade.map((l) => ({ raw: l, p: parseAtividade(l) }));
  const comentarios = atividade.filter((x) => x.p?.comentario != null);
  // C7: description / a comment → Conhecimento (one source per text; already sent = link to it)
  const fontesDaTarefa = getFontes().filter((f) => f.tarefa === id && f.status !== "erro");
  const paraConhecimento = (parte: string, texto: string) => {
    if (texto.trim().length < 20) return null;
    const ja = fontesDaTarefa.find((f) => f.chave === chaveTrecho(parte === "descricao" ? "d" : "c", texto));
    return ja
      ? <Link href={`/conhecimento/${ja.id}`} className="anel-foco alvo-toque meta inline-flex items-center gap-1 justify-self-start rounded-interno text-t2 hover:text-t1 hover:underline"><Icone nome="sucesso" tamanho={14} />{t.jaNoConhecimento}</Link>
      : <form action={tarefaConhecimentoAction} className="justify-self-start"><input type="hidden" name="id" value={id} /><input type="hidden" name="parte" value={parte} />
          <BotaoEnviar enviando="…" icone="enviar" variante="fantasma" tamanho="P">{t.enviarAoConhecimento}</BotaoEnviar></form>;
  };
  const registros = atividade.filter((x) => x.p?.comentario == null);
  const visiveis = q.tudo ? registros : registros.slice(0, 30);
  const feitos = doc.checklist.filter((c) => c.feito).length;
  const STATUS: [Status, string, NomeIcone][] = [["todo", t.aFazer, "prazo"], ["doing", t.fazendo, "enviar"], ["done", t.feito, "confirmar"]];
  const estado = tarefa.status === "done" ? "feita" : late ? "atrasada" : tarefa.status === "doing" ? "andamento" : "pendente";
  const pessoaPorNome = (n: string) => pessoas.find((p) => p.name.split(" (")[0] === n.replace(/\s*\(via .*\)$/, "").trim());

  const detalhes = (
    <div className="grid gap-7">
      {can.usarIA(me, tarefa) && (
        <IAPanel id={id} propor={proporIAAction} aplicar={aplicarIAAction} labels={{
          titulo: t.iaTitulo, detalhar: t.iaDetalhar, proximo: t.iaProximo, atualizar: t.iaAtualizar, pensando: t.iaPensando,
          aplicar: t.confirmarLbl, descartar: t.cancelar, novaDescricao: t.iaNovaDescricao, adicionarChecklist: t.iaAdicionar,
          concluirChecklist: t.iaConcluir, proximoPasso: t.iaProximoPasso, mudarStatus: t.iaStatus, mudarPrazo: t.iaPrazo,
          fontes: t.iaFontes, nada: t.iaNada, aviso: t.iaAviso, proposta: t.propostaLbl, ajustar: t.ajustarLbl, status: { todo: t.aFazer, doing: t.fazendo, done: t.feito },
        }} />
      )}

      {/* T3: Hermes does the work in the background */}
      {can.usarIA(me, tarefa) && (() => {
        const jobs = emAndamento(id);
        return jobs.length ? (
          <p className={`${POCO} meta flex items-center gap-2 p-3 text-t2`} aria-live="polite">
            <span aria-hidden="true" className="arco-girando size-4" />{t.hermesTrabalhando} · {t.pedidoPor} {jobs[0].pedidoPorNome} · {new Date(jobs[0].criado).toLocaleTimeString(lang === "en" ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })}
          </p>
        ) : (
          <details className={`${POCO} group p-3`}>
            <summary className="anel-foco flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-interno font-texto text-[15px] font-semibold">
              <Icone nome="gerar-outra" tamanho={18} className="text-ac-text" />{t.fazerPorMim}
              <Icone nome="abrir" tamanho={18} className="ml-auto text-t3 transition-transform group-open:rotate-180" />
            </summary>
            <form action={fazerPorMimAction} className="mt-3 grid gap-2">
              <input type="hidden" name="id" value={id} />
              <Campo tipo="area" name="instrucao" rotulo={t.fazerPorMim} rows={3} maxLength={1000} placeholder={t.fazerInstrucao} ajuda={t.fazerAviso} />
              <div><BotaoEnviar enviando="…" className={btnTonal}><Icone nome="enviar" tamanho={18} />{t.fazerPorMim}</BotaoEnviar></div>
            </form>
          </details>
        );
      })()}

      <Bloco titulo={t.descricaoTitulo}>
        {doc.descricao ? <Md>{doc.descricao}</Md> : <p className="corpo text-t3">{t.semDescricao}</p>}
        {doc.descricao && paraConhecimento("descricao", doc.descricao)}
        {pode && (
          <details className="group" open={!doc.descricao}>
            <summary className="anel-foco meta inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-pilula text-t2 hover:text-t1"><Icone nome="editar" tamanho={16} />{t.editarDescricao}</summary>
            <form action={descricaoAction} className="mt-2 grid gap-2">
              <input type="hidden" name="id" value={id} />
              <Campo tipo="area" name="descricao" rotulo={t.descricaoTitulo} defaultValue={doc.descricao} rows={6} className="bg-s1!" />
              <div><BotaoEnviar enviando="…" className={btnTonal}><Icone nome="confirmar" tamanho={18} />{t.salvar}</BotaoEnviar></div>
            </form>
          </details>
        )}
      </Bloco>

      <Bloco titulo={t.checklist} extra={doc.checklist.length > 0 && <span className="meta tabular-nums text-t2">{feitos}/{doc.checklist.length}</span>}>
        {doc.checklist.length > 0 && <BarraProgresso valor={feitos} segmentos={doc.checklist.length} rotuloAcessivel={t.checklist} />}
        <ul className={`${POCO} overflow-hidden`}>
          {doc.checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2 border-t border-s2 py-1 pl-1 pr-2 first:border-t-0">
              {pode ? (
                <form action={checklistAction}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="toggle" /><input type="hidden" name="idx" value={i} />
                  <button aria-label={c.texto} aria-pressed={c.feito} className="anel-foco grid size-11 place-items-center rounded-pilula">
                    <span className={`grid size-[22px] place-items-center rounded-[7px] ${c.feito ? "bg-ac text-ac-ink" : "shadow-[inset_0_0_0_2px_var(--s4)]"}`}>{c.feito && <Icone nome="confirmar" tamanho={14} />}</span>
                  </button>
                </form>
              ) : <span className="grid size-11 place-items-center"><span className={`grid size-[22px] place-items-center rounded-[7px] ${c.feito ? "bg-ac text-ac-ink" : "shadow-[inset_0_0_0_2px_var(--s4)]"}`}>{c.feito && <Icone nome="confirmar" tamanho={14} />}</span></span>}
              <span className={`corpo flex-1 ${c.feito ? "text-t3 line-through" : "text-t1"}`}>{c.texto}</span>
              {pode && (
                <form action={checklistAction}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="remove" /><input type="hidden" name="idx" value={i} />
                  <BotaoIcone type="submit" icone="fechar" aria-label={`${t.remover}: ${c.texto}`} tamanho={40} variante="fantasma" className="text-t3" />
                </form>
              )}
            </li>
          ))}
          {pode && (
            <li className="border-t border-s2 p-2 first:border-t-0">
              <form action={checklistAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="add" />
                <input name="texto" required maxLength={300} placeholder={t.novoItem2} aria-label={t.novoItem2}
                  className="h-11 min-w-0 flex-1 rounded-pilula bg-transparent px-3 font-texto text-[15px] text-t1 outline-none placeholder:text-t3 focus:shadow-foco" />
                <BotaoIcone type="submit" icone="mais" aria-label={t.novoItem2} tamanho={44} />
              </form>
            </li>
          )}
        </ul>
      </Bloco>

      <Bloco titulo={t.anexos} extra={anexos.length > 0 && <span className="rounded-pilula bg-s3 px-2 text-xs tabular-nums text-t2">{anexos.length}</span>}>
        {anexos.length === 0 && <p className="corpo text-t3">{t.semAnexos}</p>}
        {anexos.length > 0 && (
          <ul className="grid gap-2">
            {anexos.map((a) => {
              const href = a.tipo === "link" ? a.url : arquivoUrl(id, a);
              return (
                <li key={a.id} className={`${POCO} flex items-center gap-3 p-2`}>
                  {a.tipo === "arquivo" && isImg(a)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={href} alt="" className="size-12 shrink-0 rounded-interno object-cover" loading="lazy" />
                    : <span className="grid size-12 shrink-0 place-items-center rounded-interno bg-s2 text-t2"><Icone nome={a.tipo === "link" ? "abrir-fora" : isImg(a) ? "imagem" : "tarefa"} tamanho={20} /></span>}
                  <a href={href} target="_blank" rel="noreferrer" className="anel-foco min-w-0 flex-1 rounded-interno">
                    <p className="truncate font-texto text-[15px] text-t1 hover:underline">{a.titulo}</p>
                    <p className="meta truncate text-t3">{[a.tipo === "link" ? host(a.url) : a.tamanho ? kb(a.tamanho) : "", a.por && nome(a.por).split(" (")[0], a.em && fmtDate(a.em, lang)].filter(Boolean).join(" · ")}</p>
                  </a>
                  {pode && (
                    <form action={removeAnexoAction}>
                      <input type="hidden" name="id" value={id} /><input type="hidden" name="anexo" value={a.id} />
                      <BotaoIcone type="submit" icone="fechar" aria-label={`${t.remover}: ${a.titulo}`} tamanho={40} variante="fantasma" className="text-t3" />
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {pode && (
          <div className="grid gap-3">
            <Upload id={id} action={uploadAction} accept={Object.keys(ANEXO_TIPOS).map((e) => `.${e}`).join(",")}
              labels={{ arquivo: t.arquivo, foto: t.foto, enviando: t.enviando, maximo: t.maximo }} />
            <form action={linkAction} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
              <input type="hidden" name="id" value={id} />
              <Campo name="url" inputMode="url" required rotulo="Link" placeholder="https://…" className="bg-s1!" />
              <Campo name="titulo" maxLength={150} rotulo={t.tituloLink} className="bg-s1!" />
              <BotaoEnviar enviando="…" className={`${btnTonal} sm:mt-1.5`}><Icone nome="mais" tamanho={18} />{t.adicionarLink}</BotaoEnviar>
            </form>
            <p className="meta text-t3">{t.maximo}</p>
          </div>
        )}
      </Bloco>

      {doc.origem && <Bloco titulo={t.origem}><div className="text-t2"><Md>{doc.origem}</Md></div></Bloco>}
    </div>
  );

  const conversa = (
    <div className="grid gap-4">
      <form action={comentarAction} className="grid gap-2">
        <input type="hidden" name="id" value={id} />
        <Campo tipo="area" name="texto" rotulo={t.comentar} required rows={2} maxLength={1000} placeholder={t.escreverComentario} className="bg-s1!" />
        <div><BotaoEnviar enviando="…" className={btnTonal}><Icone nome="mensagem" tamanho={18} />{t.comentar}</BotaoEnviar></div>
      </form>
      {comentarios.length === 0 ? <EstadoVazio compacto selo="olho" titulo={t.semComentarios} /> : (
        <ul className="grid gap-2">
          {comentarios.map(({ p }, i) => {
            const autor = pessoaPorNome(p!.quem);
            return (
              <li key={i} className={`${POCO} flex gap-3 p-3`}>
                <Avatar nome={p!.quem} foto={autor ? foto(autor.id) : undefined} tamanho={32} />
                <div className="grid min-w-0 gap-0.5">
                  <p className="meta text-t3"><span className="font-semibold text-t1">{p!.quem}</span> · {p!.quando}</p>
                  <p className="corpo whitespace-pre-line text-t1">{p!.comentario}</p>
                  {paraConhecimento(`c:${i}`, p!.comentario ?? "")}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const historico = (
    <div className="grid gap-2">
      <LinhaDoTempo itens={visiveis.map(({ raw, p }) => p ? deAtividade(p, (d) => (d === hoje ? t.hoje : fmtDate(d, lang))) : { dia: "", tipo: "outro" as const, quem: "", texto: raw.replace(/^-\s*/, "") })} />
      {!q.tudo && registros.length > visiveis.length && <div><Botao href={`/tarefas/${id}?tudo=1`} variante="fantasma" tamanho="P" icone="abrir">{t.verMais} ({registros.length})</Botao></div>}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 -ml-3"><Botao href={back} variante="fantasma" tamanho="P" icone="voltar">{t.voltarLbl}</Botao></div>

      <CabecalhoPagina
        rotulo={eq ? <span style={chave ? { color: EQUIPES_DS[chave].cor } : undefined}>{eq.nome}</span> : t.semEquipe}
        selo={chave ? EQUIPES_DS[chave].selo : undefined}
        titulo={tarefa.title}
        subtitulo={<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <BadgeEstado estado={estado} />
          {tarefa.prazo && <span className={`inline-flex items-center gap-1.5 ${late ? "font-medium text-err" : ""}`}><Icone nome="prazo" tamanho={16} />{fmtDate(tarefa.prazo, lang)}</span>}
          {tarefa.recorrencia && <span className="inline-flex items-center gap-1.5"><Icone nome="gerar-outra" tamanho={16} />{t[tarefa.recorrencia as "semanal" | "quinzenal" | "mensal"] ?? tarefa.recorrencia}</span>}
        </span>}
        acoes={pode && <BotaoIcone icone="editar" aria-label={t.editar} href={`/tarefas/${id}/editar`} />}
        filtros={<>
          {projeto && <Chip href={`/projetos/${projeto.id}`} icone="tarefa">{projeto.nome}</Chip>}
          {objetivo && <Chip href={`/objetivos?ano=${objetivo.ano}#${objetivo.id}`} icone="sucesso">{objetivo.titulo}</Chip>}
          {!eq && <Chip href="/equipes/sem-equipe" icone="pessoas">{t.semEquipe}</Chip>}
        </>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {pode && (
          <div role="group" aria-label={t.statusLbl} className="inline-flex gap-0.5 rounded-pilula bg-s2 p-1">
            {STATUS.map(([s, label, icone]) => (
              <form key={s} action={setStatusAction}>
                <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} />
                <button aria-pressed={tarefa.status === s}
                  className={`anel-foco inline-flex min-h-11 items-center gap-2 rounded-pilula px-4 font-texto text-sm font-medium transition-colors duration-150 ${tarefa.status === s ? "bg-s3 text-t1 ring-1 ring-inset ring-s4" : "text-t2 hover:bg-s3/50 hover:text-t1"}`}>
                  <Icone nome={icone} tamanho={18} className={tarefa.status === s ? "text-ac-text" : undefined} />{label}
                </button>
              </form>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {tarefa.responsaveis.map((r) => (
            <Link key={r} href={`/pessoas/${r}`} className="anel-foco inline-flex min-h-11 items-center gap-2 rounded-pilula pr-2 font-texto text-[15px] text-t1 hover:underline">
              <Avatar nome={nome(r)} foto={foto(r)} equipe={pessoa(r)?.equipes[0]} tamanho={32} />{nome(r).split(" (")[0]}
            </Link>
          ))}
          {!tarefa.responsaveis.length && tarefa.responsible && <span className="corpo text-t2">{tarefa.responsible}</span>}
        </div>
      </div>

      <AbasComPainel id="tarefa" pasta rotulo={tarefa.title} inicial={q.tudo ? "atividade" : undefined} abas={[
        { id: "detalhes", rotulo: t.detalhesLbl, icone: "tarefa", conteudo: detalhes },
        { id: "comentarios", rotulo: t.comentariosLbl, icone: "mensagem", contagem: comentarios.length, conteudo: conversa },
        { id: "atividade", rotulo: t.atividade, icone: "prazo", contagem: registros.length, conteudo: historico },
      ]} />
    </div>
  );
}
