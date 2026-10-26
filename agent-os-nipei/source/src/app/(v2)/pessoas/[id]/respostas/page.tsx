import Link from "next/link";
import { BarraProgresso } from "@/components/ds/Progresso";
import ChipDS from "@/components/ds/Chip";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";

import BotaoEnviar from "@/components/v2/BotaoEnviar";
import RespostaCampo from "@/components/v2/RespostaCampo";
import { currentUser, getPessoas } from "@/lib/v2/data";
import { PALAVRAS_MINIMAS, SECOES_IA, diagnosticosAbertos, getDiagnostico, getRespostas, participa, podeVer, progresso, secoesIndividuais } from "@/lib/v2/diagnostico";
import { getT } from "@/lib/v2/i18n";
import { rascunhoIAAction, salvarRespostasAction } from "../../../actions";


// "Minhas respostas": a person's answers to the individual part of an assessment (private: the person and gestão).
export default async function Respostas({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string; secao?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const p = getPessoas().find((x) => x.id === id);
  if (!p || !podeVer(me, id)) notFound();
  const d = q.d ? getDiagnostico(q.d) : diagnosticosAbertos(p)[0] ?? null;
  if (!d || !participa(d, p)) notFound();
  const proprio = me.pessoa?.id === id;
  const secoes = secoesIndividuais(d);
  const sec = secoes.find((x) => x.id === q.secao) ?? secoes[0];
  const r = getRespostas(d.id, id);
  const pr = progresso(d, id);
  const en = lang === "en";
  const url = (secao: string) => `/pessoas/${id}/respostas?d=${d.id}&secao=${secao}`;
  const proxima = secoes[secoes.indexOf(sec) + 1];

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/pessoas/${id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{p.name}</Link>
      <p className="text-xs uppercase tracking-wide text-t2">{t.diagnostico} · {en ? d.modelo.titulo_en : d.modelo.titulo}</p>
      <h1 className="text-2xl font-semibold tracking-tight mt-1">{proprio ? t.minhasRespostas : p.name}</h1>
      <p className="text-sm text-t2 mt-1 mb-3">{d.titulo} · {t.privadoDiag}</p>
      <div className="mb-4"><BarraProgresso valor={pr.respondidas} max={pr.total} rotulo={`${pr.total ? Math.round((pr.respondidas / pr.total) * 100) : 0}% · ${pr.respondidas}/${pr.total}`} /></div>

      <div className="flex flex-wrap gap-2 mb-5">
        {secoes.map((x) => {
          const feitas = x.perguntas.filter((qq) => r[qq.id]?.status === "respondida").length;
          return <ChipDS ativo={x.id === sec.id} key={x.id} href={url(x.id)}>{en ? x.titulo_en : x.titulo} · {feitas}/{x.perguntas.length}</ChipDS>;
        })}
      </div>

      <h2 className="text-lg font-semibold">{en ? sec.titulo_en : sec.titulo}</h2>
      <p className="text-sm text-t2 mt-1 mb-4">{sec.intro}</p>

      {proprio && SECOES_IA.includes(sec.id) && (
        <form action={rascunhoIAAction} className="mb-5 rounded-interno p-3">
          <input type="hidden" name="diagnostico" value={d.id} /><input type="hidden" name="secao" value={sec.id} />
          <BotaoEnviar enviando={t.processando} icone="gerar-outra" variante="tonal" className="inline-flex items-center gap-1.5">{t.rascunhoIA}</BotaoEnviar>
          <p className="text-xs text-t2 mt-2">{t.rascunhoIAAviso}</p>
        </form>
      )}
      {!proprio && <p className="text-xs text-t2 mb-4">{t.soLeitura}</p>}

      <form action={salvarRespostasAction} className="grid gap-6">
        <input type="hidden" name="diagnostico" value={d.id} />
        {sec.perguntas.map((qq, i) => {
          const resp = r[qq.id];
          const status = resp?.status === "respondida" ? t.statusRespondida : resp?.ia ? t.statusRascunhoIA : resp?.texto ? t.statusRascunho : "";
          return (
            <div key={qq.id} className="grid gap-2">
              <p className="text-sm font-medium">{i + 1}. {en ? qq.texto_en : qq.texto}
                {status && <span className={`ml-2 text-xs font-normal ${resp?.status === "respondida" ? "text-ok" : "text-warn"}`}>{status}</span>}
              </p>
              <details open={!resp?.texto} className="text-xs text-t2">
                <summary className="cursor-pointer">{t.guiaResposta}</summary>
                <ul className="list-disc pl-5 mt-1 grid gap-0.5">{qq.guia.map((g, j) => <li key={j}>{g}</li>)}</ul>
              </details>
              {proprio
                ? <RespostaCampo key={`${qq.id}:${resp?.em ?? ""}`} name={`r:${qq.id}`} inicial={resp?.texto ?? ""} minimo={PALAVRAS_MINIMAS} labels={{ palavras: t.palavras, curta: t.respostaCurta }} />
                : <p className="text-sm whitespace-pre-wrap rounded-interno bg-s2 px-3 py-2">{resp?.texto || t.vazio}</p>}
            </div>
          );
        })}
        {proprio && (
          <div className="flex flex-wrap gap-2 sticky bottom-16 md:bottom-4 bg-bg/95 py-2">
            <BotaoEnviar name="acao" value="rascunho" enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvarRascunho}</BotaoEnviar>
            <BotaoEnviar name="acao" value="responder" enviando={t.salvando} icone="confirmar" variante="primario">{t.salvarResponder}</BotaoEnviar>
            {proxima && <Link href={url(proxima.id)} className="self-center text-sm underline text-t2">{en ? proxima.titulo_en : proxima.titulo} →</Link>}
          </div>
        )}
      </form>
    </div>
  );
}
