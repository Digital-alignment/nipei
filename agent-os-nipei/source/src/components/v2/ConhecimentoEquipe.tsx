import Botao from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import OQueSabemos from "@/components/v2/OQueSabemos";
import { criarPerguntaAction } from "@/app/(v2)/actions";
import { chavePergunta, semRespostaPorTemas, type Fato } from "@/lib/v2/conhecimento";
import { getPerguntas } from "@/lib/v2/perguntas";
import type { Equipe } from "@/lib/v2/data";
import type { Dict } from "@/lib/v2/i18n";

/** Gaps first (to review, what the AI didn't know in the team's topics), then what is known (DS 10.19). */
export function lacunasEquipe(e: Equipe) {
  const ja = new Set(getPerguntas().filter((p) => p.status !== "arquivada").map((p) => chavePergunta(p.texto)));
  return semRespostaPorTemas(e.temas).filter((x) => !ja.has(chavePergunta(x.pergunta))).slice(0, 5);
}

export default function ConhecimentoEquipe({ e, revisar, sabemos, lacunas, t }: { e: Equipe; revisar: number; sabemos: Fato[]; lacunas: ReturnType<typeof lacunasEquipe>; t: Dict }) {
  return (
    <div className="mt-3 grid gap-3">
      {revisar > 0 && (
        <Cartao>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="numero-display text-t1">{revisar}</p>
              <p className="meta text-t2">{t.ec.paraRevisar}</p>
            </div>
            <Botao href={`/conhecimento/revisar?equipe=${e.id}`} icone="avancar" tamanho="M">{t.ec.revisarUm}</Botao>
          </div>
        </Cartao>
      )}
      {lacunas.length > 0 && (
        <section>
          <p className="rotulo-maiusculo mb-2 text-t3">{t.iaNaoSoube}</p>
          <ul className="overflow-hidden rounded-cartao bg-s1">
            {lacunas.map((x) => (
              <li key={x.pergunta} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-s2 px-4 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="corpo text-t1">{x.pergunta}</p>
                  <p className="meta text-t3">{x.vezes} {x.vezes === 1 ? t.ec.vez : t.ec.vezes}</p>
                </div>
                <form action={criarPerguntaAction}>
                  <input type="hidden" name="texto" value={x.pergunta} /><input type="hidden" name="equipe" value={e.id} />
                  <BotaoEnviar enviando="…" icone="mensagem" variante="tonal" tamanho="P">{t.virarPergunta}</BotaoEnviar>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <p className="rotulo-maiusculo mb-2 text-t3">{t.oQueSabemos}</p>
        <OQueSabemos fatos={sabemos} t={t} base={`/conhecimento?equipe=${e.id}#base`} />
      </section>
    </div>
  );
}
