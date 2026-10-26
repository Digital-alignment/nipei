import LinhaFonte from "./LinhaFonte";
import type { Ctx } from "./index";

/** Sources with facts this person may review, most pending first. */
export default function Revisar({ ctx }: { ctx: Ctx }) {
  const lista = [...ctx.paraMim].sort((a, b) => ctx.porFonte(b.id).pendentes.length - ctx.porFonte(a.id).pendentes.length);
  return <ul className="overflow-hidden rounded-cartao bg-s1">{lista.map((f) => <LinhaFonte key={f.id} f={f} ctx={ctx} />)}</ul>;
}
