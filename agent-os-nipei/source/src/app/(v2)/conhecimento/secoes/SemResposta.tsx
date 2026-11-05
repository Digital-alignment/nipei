import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { chavePergunta, semResposta } from "@/lib/v2/conhecimento";
import { fmtDate } from "@/lib/v2/i18n";
import { getPerguntas } from "@/lib/v2/perguntas";
import { criarPerguntaAction } from "../../actions";
import type { Ctx } from "./index";

/** What the AI couldn't answer (gestão): questions people asked an AI that the confirmed base didn't cover, minus the ones already asked to the community. */
export const listaSemResposta = () => {
  const ja = new Set(getPerguntas().filter((p) => p.status !== "arquivada").map((p) => chavePergunta(p.texto)));
  return semResposta().filter((x) => !ja.has(chavePergunta(x.pergunta))).slice(0, 20);
};

export default function SemResposta({ ctx }: { ctx: Ctx }) {
  const { t, lang } = ctx;
  return (
    <div className="grid gap-3">
      <p className="corpo text-t2">{t.iaNaoSoubeAjuda}</p>
      <ul className="overflow-hidden rounded-cartao bg-s1">
        {listaSemResposta().map((x) => (
          <li key={x.pergunta} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-s2 px-4 py-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <p className="corpo text-t1">{x.pergunta}</p>
              <p className="meta text-t3">{x.vezes}× · {fmtDate(x.ultima.slice(0, 10), lang)} · {x.origens.join(", ")}</p>
            </div>
            <form action={criarPerguntaAction}>
              <input type="hidden" name="texto" value={x.pergunta} />
              <BotaoEnviar enviando="…" icone="mensagem" variante="tonal" tamanho="P">{t.virarPergunta}</BotaoEnviar>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
