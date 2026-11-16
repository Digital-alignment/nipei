import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import SobreEquipeForm from "@/components/v2/SobreEquipeForm";
import { SOBRE_SECOES, can, currentUser, getEquipes } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Editar o "Sobre a equipe" (DS 10.13): coordenação da equipe ou gestão.
export default async function EditarSobre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const e = getEquipes().find((x) => x.id === id);
  if (!e || e.contatos || !can.gerirEquipe(me, id)) notFound();
  const k = chaveEquipe(e.id);
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={`/equipes/${id}?aba=sobre`} variante="fantasma" tamanho="P" icone="voltar">{e.nome}</Botao></div>
      <CabecalhoPagina selo={k ? EQUIPES_DS[k].selo : "broto"} rotulo={e.nome} titulo={t.eq.sobre} subtitulo={t.eq.sobreVazioGerir} />
      <SobreEquipeForm equipe={e.id} inicial={Object.fromEntries(SOBRE_SECOES.map(([c]) => [c, e.sobre[c]]))}
        secoes={SOBRE_SECOES.map(([c]) => ({ id: c, rotulo: t.eq.secoes[c], ajuda: t.eq.ajudas[c] }))}
        l={{ salvar: t.eq.salvarSobre, rascunho: t.rascunhoPinu, aviso: t.rascunhoPinuAviso, pensando: t.rascunhoPinuPensando }} />
    </div>
  );
}
