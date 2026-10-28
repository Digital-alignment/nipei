import Link from "next/link";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Cartao from "@/components/ds/Cartao";
import Botao from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Campo from "@/components/ds/Campo";
import Aviso from "@/components/ds/Aviso";
import Icone from "@/components/ds/Icone";
import { BarraProgresso } from "@/components/ds/Progresso";
import { EstadoVazio } from "@/components/ds/Estados";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import EquipeFato from "@/components/v2/EquipeFato";
import { currentUser, getEquipes, getObjetivos, getPessoas, getProjetos } from "@/lib/v2/data";
import { getFatos, getFontes, podeRevisar, trechoOriginal } from "@/lib/v2/conhecimento";
import { getAlertas } from "@/lib/v2/auditor";
import { esvaziarFilaPropostas } from "@/lib/v2/propostas";
import { fmtDate, getT } from "@/lib/v2/i18n";
import { revisarFatoAction } from "../../actions";

// Review one fact at a time (cards): the fact, editable, next to the passage of the original it came from;
// confirm / discard / skip. After confirming or discarding the page re-renders and the next one shows.
// ?pular= skipped ids (this visit only) · ?filtro=sem-equipe (gestão) = only facts without a team, to set it.
export default async function RevisarUmPorUm({ searchParams }: { searchParams: Promise<{ pular?: string; filtro?: string }> }) {
  const q = await searchParams;
  const { t, lang } = await getT();
  const me = (await currentUser())!;
  const semEquipe = me.gestao && q.filtro === "sem-equipe";
  const pulados = new Set((q.pular ?? "").split(",").filter(Boolean));
  const todos = getFatos().filter((f) => f.status === "proposto" && podeRevisar(me, f) && (!semEquipe || !f.equipe))
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const fila = todos.filter((f) => !pulados.has(f.id));
  const f = fila[0];
  const url = (p: { pular?: string[]; filtro?: string }) => {
    const s = new URLSearchParams();
    if (p.filtro) s.set("filtro", p.filtro);
    if (p.pular?.length) s.set("pular", p.pular.join(","));
    return `/conhecimento/revisar${s.size ? `?${s}` : ""}`;
  };
  const filtro = semEquipe ? "sem-equipe" : undefined;
  const nSemEquipe = me.gestao ? getFatos().filter((x) => x.status === "proposto" && !x.equipe).length : 0;

  const cabecalho = (
    <>
      <div className="-ml-3 mb-2"><Botao href="/conhecimento" variante="fantasma" tamanho="P" icone="voltar">{t.conhecimento}</Botao></div>
      <CabecalhoPagina selo="espiral" titulo={t.revisarUmPorUm}
        filtros={me.gestao ? <>
          <Chip href={url({})} ativo={!semEquipe}>{t.todosPendentes}</Chip>
          <Chip href={url({ filtro: "sem-equipe" })} ativo={semEquipe} contagem={nSemEquipe}>{t.soSemEquipe}</Chip>
        </> : undefined} />
    </>
  );

  if (!f) {
    void esvaziarFilaPropostas(true); // end of the review session: proposals for everything confirmed, in one call
    return (
      <div className="mx-auto max-w-2xl">
        {cabecalho}
        <EstadoVazio selo="espiral" titulo={t.nadaParaRevisar} texto={t.nadaParaRevisarMsg}
          acao={pulados.size ? <Botao href={url({ filtro })} icone="gerar-outra" variante="tonal" tamanho="M">{`${t.recomecarPulados} (${pulados.size})`}</Botao> : undefined} />
      </div>
    );
  }

  const fonte = getFontes().find((x) => x.id === f.fonte);
  const trecho = fonte?.texto ? trechoOriginal(fonte.texto, f.texto) : "";
  const alerta = getAlertas().find((a) => a.status === "aberta" && a.fato === f.id);
  const equipes = getEquipes(), projetos = getProjetos(), objetivos = getObjetivos(), pessoas = getPessoas();
  const ligados = [
    ...f.projetos.map((p) => projetos.find((y) => y.id === p)?.nome), ...f.objetivos.map((o) => objetivos.find((y) => y.id === o)?.titulo),
    ...f.pessoas.map((p) => pessoas.find((y) => y.id === p)?.name.split(" (")[0]), f.dataReferencia && fmtDate(f.dataReferencia, lang),
  ].filter(Boolean).join(" · ");
  const feitos = todos.length - fila.length; // skipped so far, out of this visit's queue
  const n = feitos + 1;

  return (
    <div className="mx-auto max-w-2xl">
      {cabecalho}
      <div className="mb-4 grid gap-1.5">
        <span className="meta text-t2">{t.fatoNDeM.replace("{n}", String(n)).replace("{m}", String(todos.length))}{pulados.size > 0 && ` · ${pulados.size} ${t.pulados}`}</span>
        <BarraProgresso valor={feitos} max={todos.length} rotuloAcessivel={t.fatosParaRevisar} />
      </div>

      <Cartao className="grid gap-4">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rotulo-maiusculo text-t3">{t.tiposFato[f.tipo as keyof typeof t.tiposFato] ?? f.tipo}</span>
          {ligados && <span className="meta text-t2">{ligados}</span>}
        </p>
        {alerta && (
          <Aviso estado="atencao" titulo={`${t.comAlertaAberto}: ${t.tiposAlerta[alerta.tipo]}`} mensagem={alerta.explicacao}
            acoes={<Botao href="/conhecimento/alertas" icone="atencao" variante="tonal" tamanho="P" iconeDireita="avancar">{t.abrir}</Botao>} />
        )}
        <form action={revisarFatoAction} className="grid gap-3">
          <input type="hidden" name="id" value={f.id} />
          <Campo tipo="area" name="texto" rotulo={t.tiposFato.fato} defaultValue={f.texto} rows={4} maxLength={600} />
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar name="acao" value="confirmar" enviando="…" icone="confirmar" variante="primario">{t.confirmar}</BotaoEnviar>
            <BotaoEnviar name="acao" value="descartar" enviando="…" icone="fechar" variante="tonal">{t.descartar}</BotaoEnviar>
            <Botao href={url({ filtro, pular: [...pulados, f.id] })} icone="avancar" variante="fantasma" tamanho="M">{t.pular}</Botao>
          </div>
        </form>

        {(trecho || fonte) && (
          <div className="grid gap-1.5 border-t border-s2 pt-4">
            <span className="rotulo-maiusculo text-t3">{t.trechoOriginal}</span>
            {trecho && <p className="corpo whitespace-pre-wrap rounded-interno bg-s2 p-3 text-t2">{trecho}</p>}
            {fonte && (
              <Link href={`/conhecimento/${fonte.id}`} className="anel-foco alvo-toque meta inline-flex items-center gap-1.5 self-start rounded-interno text-t2 hover:text-t1 hover:underline">
                <Icone nome="abrir-fora" tamanho={14} />{t.deFonte}: {fonte.titulo || fonte.url}
              </Link>
            )}
          </div>
        )}

        {me.gestao && (
          <div className="grid gap-1.5 border-t border-s2 pt-4">
            <span className="rotulo-maiusculo text-t3">{t.equipeDoFato}</span>
            <EquipeFato id={f.id} atual={f.equipe} equipes={equipes.map((e) => ({ id: e.id, nome: e.nome }))} rotuloSem={t.semEquipeFato} />
            <p className="meta text-t3">{t.equipeDoFatoAjuda}</p>
          </div>
        )}
      </Cartao>
    </div>
  );
}
