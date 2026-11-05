import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import ProjetoForm from "@/components/v2/ProjetoForm";
import { currentUser, getEquipes, getPessoas } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Novo projeto (DS 10.21): gestão.
export default async function NovoProjeto() {
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href="/projetos" variante="fantasma" tamanho="P" icone="voltar">{t.projetos}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.projetos} titulo={t.pj.novo} />
      <ProjetoForm equipes={getEquipes()} pessoas={getPessoas()} t={t} gestao={me.gestao} />
    </div>
  );
}
