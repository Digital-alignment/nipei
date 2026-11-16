import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import PedidoForm from "@/components/v2/PedidoForm";
import { getEquipes, today } from "@/lib/v2/data";
import { getT } from "@/lib/v2/i18n";

// Pedir algo a uma equipe (DS 10.14): vira uma tarefa da equipe sem responsável; a coordenação escolhe quem faz.
export default async function NovoPedido({ searchParams }: { searchParams: Promise<{ equipe?: string }> }) {
  const q = await searchParams;
  const { t } = await getT();
  const equipes = getEquipes().filter((e) => !e.contatos);
  const daEquipe = equipes.find((e) => e.id === q.equipe);
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={daEquipe ? `/equipes/${daEquipe.id}` : "/pedidos"} variante="fantasma" tamanho="P" icone="voltar">{daEquipe?.nome ?? t.eq.pedidos}</Botao></div>
      <CabecalhoPagina selo="mao" rotulo={t.eq.pedidos} titulo={daEquipe ? `${t.eq.pedirAlgo} · ${daEquipe.nome}` : t.eq.pedirA} subtitulo={t.eq.pedidosAjuda} />
      <PedidoForm equipes={equipes.map((e) => ({ id: e.id, nome: e.nome }))} equipeFixa={daEquipe?.id} hoje={today()}
        l={{ paraEquipe: t.eq.paraEquipe, oQuePrecisa: t.eq.oQuePrecisa, detalhes: t.eq.detalhes, ateQuando: t.eq.ateQuando, enviarPedido: t.eq.enviarPedido }} />
    </div>
  );
}
