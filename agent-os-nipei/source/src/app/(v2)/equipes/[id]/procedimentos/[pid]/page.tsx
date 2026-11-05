import { notFound } from "next/navigation";
import Botao from "@/components/ds/Botao";
import CabecalhoPagina from "@/components/ds/CabecalhoPagina";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import { EQUIPES_DS, chaveEquipe } from "@/components/ds/equipes";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { procedimentoAction } from "../../../../actions";
import { can, currentUser, getEquipes, responsaveisPara } from "@/lib/v2/data";
import { GATILHOS, getProcedimentos } from "@/lib/v2/rotinas";
import { getT } from "@/lib/v2/i18n";

// Novo / editar procedimento da equipe (DS 10.17). Coordenação ou gestão.
export default async function EditarProcedimento({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const { t } = await getT();
  const me = (await currentUser())!;
  const e = getEquipes().find((x) => x.id === id);
  if (!e || e.contatos || !can.gerirEquipe(me, id)) notFound();
  const p = pid === "novo" ? undefined : getProcedimentos().find((x) => x.id === pid && x.equipe === id);
  if (pid !== "novo" && !p) notFound();
  const k = chaveEquipe(e.id), tr = t.rot;
  return (
    <div className="mx-auto max-w-xl">
      <div className="-ml-3 mb-2"><Botao href={`/equipes/${id}?aba=procedimentos`} variante="fantasma" tamanho="P" icone="voltar">{e.nome}</Botao></div>
      <CabecalhoPagina selo={k ? EQUIPES_DS[k].selo : "broto"} rotulo={`${e.nome} · ${tr.procedimentos}`} titulo={p ? tr.editarProc : tr.novoProc} subtitulo={tr.semProcAjuda} />
      <form action={procedimentoAction}>
        <input type="hidden" name="equipe" value={e.id} />
        {p && <input type="hidden" name="id" value={p.id} />}
        <Cartao className="gap-3">
          <Campo tipo="titulo" name="titulo" rotulo={tr.titulo} required minLength={3} maxLength={120} defaultValue={p?.titulo} />
          <Campo tipo="selecao" name="gatilho" rotulo={tr.quando} defaultValue={p?.gatilho ?? "manual"}>
            {GATILHOS.map((g) => <option key={g} value={g}>{tr.gatilhos[g]}</option>)}
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo tipo="selecao" name="dia" rotulo={`${tr.diaSemana} (${tr.gatilhos.semanal.toLowerCase()})`} defaultValue={String(p?.dia ?? 1)}>
              {tr.dias.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </Campo>
            <Campo name="antes_dias" type="number" inputMode="numeric" min={-60} max={60} rotulo={tr.diasAntes} defaultValue={String(p?.antesDias ?? 1)} />
          </div>
          <Campo name="evento_contem" rotulo={tr.palavraEvento} defaultValue={p?.eventoContem} maxLength={40} />
          <Campo tipo="selecao" name="responsavel" rotulo={tr.responsavel} defaultValue={p?.responsavel ?? ""}>
            <option value="">{tr.semResp}</option>
            {responsaveisPara(id).map((g) => (
              <optgroup key={g.grupo} label={t.gruposResp[g.grupo]}>{g.pessoas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>
            ))}
          </Campo>
          <Campo tipo="area" name="passos" rotulo={tr.passos} ajuda={tr.passosAjuda} required rows={6} defaultValue={p?.passos.join("\n")} />
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar enviando="…" icone="confirmar" variante="primario">{tr.salvar}</BotaoEnviar>
            {p && <BotaoEnviar enviando="…" icone="lixeira" variante="fantasma" name="arquivar" value="1">{tr.arquivar}</BotaoEnviar>}
          </div>
        </Cartao>
      </form>
    </div>
  );
}
