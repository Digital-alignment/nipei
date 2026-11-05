import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { pedirAction } from "../../actions";
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
      <form action={pedirAction}>
        <Cartao className="gap-3">
          {daEquipe ? <input type="hidden" name="equipe" value={daEquipe.id} /> : (
            <Campo tipo="selecao" name="equipe" rotulo={t.eq.paraEquipe} required defaultValue="">
              <option value="" disabled>—</option>
              {equipes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Campo>
          )}
          <Campo tipo="titulo" name="titulo" rotulo={t.eq.oQuePrecisa} required minLength={3} maxLength={200} />
          <Campo tipo="area" name="descricao" rotulo={t.eq.detalhes} maxLength={3000} />
          <Campo tipo="data" name="prazo" rotulo={t.eq.ateQuando} min={today()} />
          <div><BotaoEnviar enviando="…" icone="enviar" variante="primario">{t.eq.enviarPedido}</BotaoEnviar></div>
        </Cartao>
      </form>
    </div>
  );
}
