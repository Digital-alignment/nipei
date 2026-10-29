import Link from "next/link";
import Campo from "@/components/ds/Campo";
import ChipDS from "@/components/ds/Chip";
import { BarraProgresso } from "@/components/ds/Progresso";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import RespostaCampo from "@/components/v2/RespostaCampo";
import { currentUser, getPessoas, getTarefas } from "@/lib/v2/data";
import { PALAVRAS_MINIMAS, getColetivo, getDiagnostico, participa, podeEditarSecao, secoesColetivas } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";
import { enviarConhecimentoAction, rascunhoColetivoAction, salvarColetivoAction, tarefasLacunasAction } from "../../../actions";
import { Calendario, Financas, Itens } from "./listas";


// D2: the team answers the collective sections (owner per section, AI drafts with sources, gaps → tasks).
export default async function Coletivo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ secao?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !(me.gestao || participa(d, me.pessoa))) notFound();
  const secoes = secoesColetivas(d);
  const sec = secoes.find((x) => x.id === q.secao) ?? secoes[0];
  if (!sec) notFound();
  const c = getColetivo(d.id);
  const pode = podeEditarSecao(me, c, sec.id);
  const tarefas = getTarefas();
  const pessoas = getPessoas();
  const en = lang === "en";
  const feitas = (sid: string) => secoes.find((x) => x.id === sid)!.perguntas.filter((qq) => c.respostas[qq.id]?.status === "respondida").length;
  const lacunas = sec.perguntas.filter((qq) => c.respostas[qq.id]?.falta && c.respostas[qq.id]?.status !== "respondida" && !tarefas.some((x) => x.id === c.respostas[qq.id].tarefa && x.status !== "done")).length;
  const comEquipe = pessoas.filter((p) => p.equipes.length);
  const painel = { d, c, t, pode, pessoas: comEquipe, tarefas };
  const hidden = <><input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="secao" value={sec.id} /></>;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{d.titulo}</Link>
      <p className="text-xs uppercase tracking-wide text-t2">{t.diagnostico} · {t.parteColetiva}</p>
      <div className="flex flex-wrap gap-2 my-4">
        {secoes.map((x) => <ChipDS ativo={x.id === sec.id} key={x.id} href={`/diagnosticos/${d.id}/coletivo?secao=${x.id}`}>{en ? x.titulo_en : x.titulo} · {feitas(x.id)}/{x.perguntas.length}</ChipDS>)}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{en ? sec.titulo_en : sec.titulo}</h1>
      <p className="text-sm text-t2 mt-1">{sec.intro}</p>
      <p className="text-sm mt-2">{t.responsavel}: <b>{pessoas.find((p) => p.id === c.responsaveis[sec.id])?.name ?? t.semResponsavel}</b></p>
      <div className="my-3"><BarraProgresso valor={feitas(sec.id)} max={sec.perguntas.length} rotulo={`${sec.perguntas.length ? Math.round((feitas(sec.id) / sec.perguntas.length) * 100) : 0}% · ${feitas(sec.id)}/${sec.perguntas.length}`} /></div>
      {!pode && <p className="text-xs text-t2 mb-4">{t.soResponsavel}</p>}

      {pode && (
        <div className="flex flex-wrap gap-2 mb-6">
          <form action={rascunhoColetivoAction}>{hidden}
            <BotaoEnviar enviando={t.processando} icone="gerar-outra" variante="tonal" className="inline-flex items-center gap-1.5">{t.rascunhoIA}</BotaoEnviar>
          </form>
          {lacunas > 0 && <form action={tarefasLacunasAction}>{hidden}<BotaoEnviar enviando={t.salvando} icone="tarefa" variante="tonal">{t.criarTarefasFalta}({lacunas})</BotaoEnviar></form>}
          {feitas(sec.id) > 0 && (
            <form action={enviarConhecimentoAction}>{hidden}
              <BotaoEnviar enviando={t.salvando} icone="enviar" variante="tonal">{c.enviadas[sec.id] ? `${t.enviarConhecimento}` : t.enviarConhecimento}</BotaoEnviar>
            </form>
          )}
          <p className="text-xs text-t2 basis-full">{t.rascunhoColetivoAviso}</p>
          {c.enviadas[sec.id] && <Link href={`/conhecimento/${c.enviadas[sec.id]}`} className="text-xs underline text-t2 basis-full">{t.enviadoConhecimento} →</Link>}
        </div>
      )}

      {sec.id === "marketing" && <Calendario {...painel} />}
      {sec.id === "financas" && <Financas {...painel} />}

      <form action={salvarColetivoAction} className="grid gap-6">
        {hidden}
        {sec.perguntas.map((qq, i) => {
          const r = c.respostas[qq.id];
          const tarefa = r?.tarefa ? tarefas.find((x) => x.id === r.tarefa) : null;
          const status = r?.status === "respondida" ? t.statusRespondida : r?.ia ? t.statusRascunhoIA : r?.texto ? t.statusRascunho : "";
          return (
            <div key={qq.id} className="grid gap-2">
              <p className="text-sm font-medium">{i + 1}. {en ? qq.texto_en : qq.texto}
                {status && <span className={`ml-2 text-xs font-normal ${r?.status === "respondida" ? "text-ok" : "text-warn"}`}>{status}</span>}
              </p>
              <details open={!r?.texto} className="text-xs text-t2">
                <summary className="cursor-pointer">{t.guiaResposta}</summary>
                <ul className="list-disc pl-5 mt-1 grid gap-0.5">{qq.guia.map((g, j) => <li key={j}>{g}</li>)}</ul>
              </details>
              {pode
                ? <RespostaCampo key={`${qq.id}:${r?.em ?? ""}`} name={`r:${qq.id}`} inicial={r?.texto ?? ""} minimo={PALAVRAS_MINIMAS} labels={{ rotulo: t.suaResposta, palavras: t.palavras, curta: t.respostaCurta }} />
                : <p className="text-sm whitespace-pre-wrap rounded-interno bg-s2 px-3 py-2">{r?.texto || t.vazio}</p>}
              {r?.fontes.length ? <p className="text-xs text-t3">{t.fontesUsadas}: {r.fontes.join(" · ")}</p> : null}
              {(r?.falta || pode) && r?.status !== "respondida" && (
                pode
                  ? <Campo tipo="area" rotulo={t.oQueFalta} key={`f:${qq.id}:${r?.em ?? ""}`} name={`f:${qq.id}`} defaultValue={r?.falta ?? ""} rows={2} maxLength={600} />
                  : <p className="grid gap-1 text-sm"><span className="meta text-warn">{t.oQueFalta}</span>{r?.falta}</p>
              )}
              {tarefa && (
                <Link href={`/tarefas/${tarefa.id}`} className="text-xs underline text-t2">
                  {t.tarefaLacuna}: {tarefa.title.replace(/^Diagnóstico · [^:]+: /, "")} · {tarefa.status === "done" ? t.tarefaConcluida : tarefa.statusRaw || "A fazer"}
                </Link>
              )}
            </div>
          );
        })}
        {pode && (
          <div className="flex flex-wrap gap-2 sticky bottom-16 md:bottom-4 bg-bg/95 py-2">
            <BotaoEnviar name="acao" value="rascunho" enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvarRascunho}</BotaoEnviar>
            <BotaoEnviar name="acao" value="responder" enviando={t.salvando} icone="confirmar" variante="primario">{t.salvarResponder}</BotaoEnviar>
          </div>
        )}
      </form>

      {sec.id === "espaco" && (
        <div className="grid gap-4 mt-8">
          {sec.perguntas.map((qq) => (
            <div key={qq.id}>
              <p className="text-sm font-medium mb-2">{en ? qq.texto_en : qq.texto}</p>
              <Itens {...painel} q={qq} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
