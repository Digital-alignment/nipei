import Link from "next/link";
import Icone from "@/components/ds/Icone";
import { notFound } from "next/navigation";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import Md from "@/components/v2/Md";
import { currentUser } from "@/lib/v2/data";
import { diaLocal } from "@/lib/v2/conhecimento";
import { getColetivo, getDiagnostico, participa, participantes } from "@/lib/v2/diagnostico";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { aceitarCodigoAction, codigoAction } from "../../../actions";


// D4: code of agreements — gestão drafts (AI) and publishes versions; each participant accepts the published one.
export default async function Codigo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const d = getDiagnostico(id);
  if (!d || !(me.gestao || participa(d, me.pessoa))) notFound();
  const c = getColetivo(d.id).codigo;
  const meu = me.pessoa ? c.aceites[me.pessoa.id] : undefined;
  const pendente = !!me.pessoa && participa(d, me.pessoa) && c.versao > 0 && (meu?.versao ?? 0) < c.versao;
  const hidden = <input type="hidden" name="diagnostico" value={d.id} />;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/diagnosticos/${d.id}`} className="inline-flex items-center gap-1 text-sm text-t2 mb-3"><Icone nome="voltar"  tamanho={16} />{d.titulo}</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t.codigoAcordos}</h1>
      <p className="text-sm text-t2 mt-1 mb-4">
        {c.versao ? `${t.versao} ${c.versao} · ${c.status === "publicado" ? `${t.publicado} ${fmtDate(diaLocal(c.publicadoEm), lang)}` : t.emRevisao}` : t.naoGerado}
      </p>

      {pendente && (
        <form action={aceitarCodigoAction} className="mb-6 rounded-interno border bg-info-bg p-3">
          {hidden}
          <BotaoEnviar enviando={t.salvando} icone="confirmar" variante="primario" tamanho="P">{t.aceitarCodigo} ({t.versao} {c.versao})</BotaoEnviar>
        </form>
      )}
      {meu && !pendente && <p className="inline-flex items-center gap-1 text-sm text-ok mb-6"><Icone nome="sucesso"  tamanho={16} />{t.aceitoEm} {fmtDate(diaLocal(meu.em), lang)} ({t.versao} {meu.versao})</p>}

      {me.gestao && (
        <div className="grid gap-3 mb-8">
          <form action={codigoAction}>{hidden}
            <BotaoEnviar name="acao" value="ia" enviando={t.processando} icone="gerar-outra" variante="tonal" className="inline-flex items-center gap-1.5">{c.texto ? t.atualizarIA : t.gerarIA}</BotaoEnviar>
            <p className="text-xs text-t2 mt-2">{t.codigoAviso}</p>
          </form>
          {c.texto && (
            <form action={codigoAction} className="grid gap-2">{hidden}
              <textarea name="texto" defaultValue={c.texto} rows={18} className="w-full rounded-[16px] bg-s2 px-4 py-2.5 font-texto text-[15px] text-t1 outline-none placeholder:text-t3 focus:shadow-foco" />
              <div className="flex flex-wrap gap-2">
                <BotaoEnviar name="acao" value="salvar" enviando={t.salvando} icone="confirmar" variante="tonal">{t.salvarRascunho}</BotaoEnviar>
                <BotaoEnviar name="acao" value="publicar" enviando={t.salvando} icone="enviar" variante="primario" tamanho="P">{t.publicarVersao}</BotaoEnviar>
              </div>
            </form>
          )}
          {c.versao > 0 && (
            <div>
              <p className="rotulo-maiusculo text-t3 mb-1">{t.aceites}</p>
              <ul className="text-sm grid gap-0.5">
                {participantes(d).map((p) => {
                  const a = c.aceites[p.id];
                  return <li key={p.id}>{p.name}: {a?.versao === c.versao ? `${t.aceitoEm} ${fmtDate(diaLocal(a.em), lang)}` : t.pendenteAceite}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {c.texto ? <Md>{c.texto}</Md> : null}
    </div>
  );
}
