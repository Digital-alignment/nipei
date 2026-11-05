import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { projetoAction } from "@/app/(v2)/actions";
import { PROJETO_ESTADOS, PROJETO_SOBRE, type Equipe, type Pessoa, type Projeto } from "@/lib/v2/data";
import type { Dict } from "@/lib/v2/i18n";

// New / edit project (DS 10.21): name, description, teams (checkable chips), lead, status, dates and the "Sobre".
export default function ProjetoForm({ p, equipes, pessoas, t }: { p?: Projeto; equipes: Equipe[]; pessoas: Pessoa[]; t: Dict }) {
  const tp = t.pj;
  return (
    <form action={projetoAction}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Cartao className="gap-3">
        <Campo tipo="titulo" name="nome" rotulo={tp.nome} required minLength={3} maxLength={80} defaultValue={p?.nome} />
        <Campo tipo="area" name="descricao" rotulo={tp.descricao} maxLength={2000} defaultValue={p?.descricao} />
        <fieldset>
          <legend className="rotulo-campo mb-2 text-t2">{tp.equipes}</legend>
          <div className="flex flex-wrap gap-2">
            {equipes.filter((e) => !e.contatos).map((e) => (
              <label key={e.id} className="anel-foco inline-flex h-11 cursor-pointer items-center gap-2 rounded-pilula bg-s2 px-3.5 font-texto text-sm text-t1 has-[:checked]:bg-s3 has-[:checked]:ring-1 has-[:checked]:ring-inset has-[:checked]:ring-s4">
                <input type="checkbox" name="equipes" value={e.id} defaultChecked={p?.equipes.includes(e.id)} className="size-4 accent-ac" />{e.nome}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo tipo="selecao" name="lider" rotulo={tp.lider} defaultValue={p?.lider ?? ""}>
            <option value="">{tp.semLider}</option>
            {pessoas.filter((x) => !x.contato && !x.externo && x.equipes.length).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Campo>
          <Campo tipo="selecao" name="status" rotulo={tp.estado} defaultValue={p?.status ?? "ativo"}>
            {PROJETO_ESTADOS.map((s) => <option key={s} value={s}>{tp.estados[s]}</option>)}
          </Campo>
          <Campo tipo="data" name="inicio" rotulo={tp.inicio} defaultValue={p?.inicio} />
          <Campo tipo="data" name="fim" rotulo={tp.fim} defaultValue={p?.fim} />
        </div>
        <p className="rotulo-maiusculo mt-2 text-t3">{tp.sobre}</p>
        {PROJETO_SOBRE.map(([k]) => <Campo key={k} tipo="area" name={k} rotulo={tp.secoes[k]} ajuda={tp.ajudas[k]} maxLength={1500} defaultValue={p?.sobre[k]} />)}
        <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{tp.salvar}</BotaoEnviar></div>
      </Cartao>
    </form>
  );
}
