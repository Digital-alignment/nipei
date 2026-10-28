import Link from "next/link";
import Campo from "@/components/ds/Campo";
import Icone from "@/components/ds/Icone";
import { EstadoVazio } from "@/components/ds/Estados";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { diaLocal } from "@/lib/v2/conhecimento";
import { fmtDate } from "@/lib/v2/i18n";
import { getPerguntas } from "@/lib/v2/perguntas";
import { arquivarPerguntaAction, responderPerguntaAction } from "../../actions";
import type { Ctx } from "./index";

/**
 * C8 — questions the base couldn't answer. Anyone answers (the answer becomes a source and goes through review);
 * the asker or gestão archives. Below, the last answered ones with a link to their answer.
 */
export default function Perguntas({ ctx }: { ctx: Ctx }) {
  const { t, lang, me, nome } = ctx;
  const todas = getPerguntas();
  const abertas = todas.filter((p) => p.status === "aberta");
  const respondidas = todas.filter((p) => p.status === "respondida").slice(0, 5);
  const eu = me.pessoa?.id ?? me.username;
  return (
    <div className="grid gap-3">
      {abertas.length ? (
        <ul className="grid gap-3">
          {abertas.map((p) => (
            <li key={p.id} className="grid gap-2 rounded-cartao bg-s1 p-4">
              <p className="corpo font-medium text-t1">{p.texto}</p>
              <p className="meta text-t3">{nome(p.por)} · {fmtDate(diaLocal(p.em), lang)}</p>
              <form action={responderPerguntaAction} className="grid gap-2">
                <input type="hidden" name="id" value={p.id} />
                <Campo tipo="area" name="resposta" rotulo={t.suaResposta} rows={2} maxLength={5000} required />
                <p className="meta text-t3">{t.respostaAjuda}</p>
                <div className="flex flex-wrap gap-2">
                  <BotaoEnviar enviando="…" icone="enviar" variante="tonal">{t.responderLbl}</BotaoEnviar>
                </div>
              </form>
              {(me.gestao || p.por === eu) && (
                <form action={arquivarPerguntaAction} className="justify-self-start">
                  <input type="hidden" name="id" value={p.id} />
                  <BotaoEnviar enviando="…" icone="fechar" variante="fantasma" tamanho="P">{t.arquivar}</BotaoEnviar>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : <EstadoVazio compacto selo="espiral" titulo={<>{t.semPerguntas}</>} />}
      {respondidas.length > 0 && (
        <div className="grid gap-1.5">
          <span className="rotulo-maiusculo text-t3">{t.respondidasRecentes}</span>
          <ul className="overflow-hidden rounded-cartao bg-s1">
            {respondidas.map((p) => (
              <li key={p.id} className="flex items-center gap-2 border-t border-s2 py-2.5 pl-4 pr-1.5 first:border-t-0">
                <Icone nome="sucesso" tamanho={16} className="shrink-0 text-ok" />
                <span className="corpo min-w-0 flex-1 text-t1">{p.texto}</span>
                {p.respostas.at(-1) && (
                  <Link href={`/conhecimento/${p.respostas.at(-1)}`} className="anel-foco alvo-toque meta shrink-0 rounded-interno px-2 text-t2 hover:text-t1 hover:underline">{t.verResposta}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
