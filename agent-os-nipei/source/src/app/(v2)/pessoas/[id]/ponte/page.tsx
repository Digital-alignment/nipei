import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { ponteAction } from "../../../actions";
import { PONTE_TIPOS, can, currentUser, getPessoas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Editar os dados de contato de alguém da equipe Pontes (DESIGN-SYSTEM.md 10.12). Gestão ou coordenação de Pontes.
export default async function EditarPonte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const pessoas = getPessoas();
  const p = pessoas.find((x) => x.id === id);
  if (!p || !p.contato || !can.gerirPessoa(me, p)) notFound();
  const b = p.ponte, tp = t.ponte;
  const nossos = pessoas.filter((x) => !x.contato && !x.externo && x.equipes.length);
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={`/pessoas/${id}`} variante="fantasma" tamanho="P" icone="voltar">{p.name}</Botao></div>
      <CabecalhoPagina selo="pontes" rotulo={tp.contatos} titulo={tp.editar} />
      <form action={ponteAction}>
        <input type="hidden" name="pessoa" value={p.id} />
        <Cartao className="gap-3">
          <Campo tipo="selecao" name="tipo" rotulo={tp.tipo} defaultValue={b.tipo}>
            <option value="">—</option>
            {PONTE_TIPOS.map((x) => <option key={x} value={x}>{tp.tipos[x]}</option>)}
          </Campo>
          <Campo name="empresa" rotulo={tp.empresa} defaultValue={b.empresa} maxLength={120} />
          <Campo name="oferece" rotulo={tp.oferece} ajuda={tp.ofereceAjuda} defaultValue={b.oferece.join(", ")} maxLength={400} />
          <Campo tipo="area" name="como_conhecemos" rotulo={tp.comoConhecemos} defaultValue={b.comoConhecemos} maxLength={300} />
          <Campo tipo="selecao" name="vinculo" rotulo={tp.vinculo} defaultValue={b.vinculo}>
            <option value="">{tp.semVinculo}</option>
            {nossos.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Campo>
          <Campo tipo="area" name="proximo_passo" rotulo={tp.proximoPasso} defaultValue={b.proximoPasso} maxLength={300} />
          <Campo name="reconectar_dias" type="number" inputMode="numeric" min={7} max={730} rotulo={tp.reconectarCada} defaultValue={String(b.reconectarDias)} />
          <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{tp.salvar}</BotaoEnviar></div>
        </Cartao>
      </form>
    </div>
  );
}
