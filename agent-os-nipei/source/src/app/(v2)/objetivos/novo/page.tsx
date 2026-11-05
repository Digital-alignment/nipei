import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import ObjetivoForm from "@/components/v2/ObjetivoForm";
import { currentUser, getEquipes, getPessoas, projetosVisiveis } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Novo objetivo (DS 10.22): gestão. ?projeto= preselects the project.
export default async function NovoObjetivo({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const me = (await currentUser())!;
  if (!me.gestao) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href="/objetivos" variante="fantasma" tamanho="P" icone="voltar">{t.objetivos}</Botao></div>
      <CabecalhoPagina selo="broto" rotulo={t.objetivos} titulo={t.ob.novo} subtitulo={t.ob.vazioAjuda} />
      <ObjetivoForm projetos={projetosVisiveis(me)} equipes={getEquipes()} pessoas={getPessoas()} t={t} projetoInicial={q.projeto} />
    </div>
  );
}
