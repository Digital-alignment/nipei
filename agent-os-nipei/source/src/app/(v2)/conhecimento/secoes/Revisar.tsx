import Botao from "@/components/ds/Botao";
import LinhaFonte from "./LinhaFonte";
import type { Ctx } from "./index";

/** Sources with facts this person may review, most pending first; "review one by one" opens the cards. */
export default function Revisar({ ctx }: { ctx: Ctx }) {
  const lista = [...ctx.paraMim].sort((a, b) => ctx.porFonte(b.id).pendentes.length - ctx.porFonte(a.id).pendentes.length);
  const semEquipe = ctx.me.gestao ? ctx.fatos.filter((f) => f.status === "proposto" && !f.equipe).length : 0;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Botao href="/conhecimento/revisar" icone="confirmar" tamanho="M" folha>{ctx.t.revisarUmPorUm}</Botao>
        {semEquipe > 0 && <Botao href="/conhecimento/revisar?filtro=sem-equipe" icone="pessoas" variante="tonal" tamanho="M">{`${ctx.t.soSemEquipe} (${semEquipe})`}</Botao>}
      </div>
      <ul className="overflow-hidden rounded-cartao bg-s1">{lista.map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>
    </div>
  );
}
