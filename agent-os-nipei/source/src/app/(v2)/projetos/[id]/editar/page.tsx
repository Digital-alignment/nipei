import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import ProjetoForm from "@/components/v2/ProjetoForm";
import { currentUser, getEquipes, getPessoas, getProjetos, podeVerProjeto } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Editar projeto (DS 10.21): gestão, coordenação de uma equipe do projeto ou o líder.
export default async function EditarProjeto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const p = getProjetos().find((x) => x.id === id);
  if (!p || !podeVerProjeto(me, p) || !(me.gestao || p.equipes.some((e) => me.coordena.includes(e)) || (!!me.pessoa && p.lider === me.pessoa.id))) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={`/projetos/${id}`} variante="fantasma" tamanho="P" icone="voltar">{p.nome}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.projetos} titulo={t.pj.editar} />
      <ProjetoForm p={p} equipes={getEquipes()} pessoas={getPessoas()} t={t} gestao={me.gestao} />
    </div>
  );
}
