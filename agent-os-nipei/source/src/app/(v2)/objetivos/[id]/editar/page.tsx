import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import ObjetivoForm from "@/components/v2/ObjetivoForm";
import { currentUser, getEquipes, getObjetivos, getPessoas, projetosVisiveis } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Editar objetivo (DS 10.22): gestão, coordenação da equipe dona ou o responsável.
export default async function EditarObjetivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const o = getObjetivos().find((x) => x.id === id);
  if (!o || !(me.gestao || me.coordena.includes(o.equipe) || (!!me.pessoa && o.responsavel === me.pessoa.id))) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={`/objetivos/${id}`} variante="fantasma" tamanho="P" icone="voltar">{o.titulo}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.objetivos} titulo={t.ob.editar} />
      <ObjetivoForm o={o} projetos={projetosVisiveis(me)} equipes={getEquipes()} pessoas={getPessoas()} t={t} />
    </div>
  );
}
