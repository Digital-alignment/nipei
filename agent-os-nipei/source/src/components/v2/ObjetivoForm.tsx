import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import { objetivoAction } from "@/app/(v2)/actions";
import type { Equipe, Objetivo, Pessoa, Projeto } from "@/lib/v2/data";
import type { Dict } from "@/lib/v2/i18n";

// New / edit objective (DS 10.22). "Como medimos" switches between a number target and milestones with plain CSS (:has), no JS.
export default function ObjetivoForm({ o, projetos, equipes, pessoas, t, projetoInicial }: { o?: Objetivo; projetos: Projeto[]; equipes: Equipe[]; pessoas: Pessoa[]; t: Dict; projetoInicial?: string }) {
  const to = t.ob;
  const numero = !!o?.meta;
  return (
    <form action={objetivoAction} className="[&:has(#tipo-numero:checked)_.so-marcos]:hidden [&:has(#tipo-marcos:checked)_.so-numero]:hidden">
      {o && <input type="hidden" name="id" value={o.id} />}
      <Cartao className="gap-3">
        <Campo tipo="titulo" name="titulo" rotulo={to.titulo} required minLength={3} maxLength={160} defaultValue={o?.titulo} />
        <Campo tipo="area" name="descricao" rotulo={to.descricao} maxLength={2000} defaultValue={o?.descricao} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo tipo="selecao" name="projeto" rotulo={to.projeto} defaultValue={o?.projeto ?? projetoInicial ?? ""}>
            <option value="">{to.semProjeto}</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Campo>
          <Campo tipo="selecao" name="responsavel" rotulo={to.responsavel} defaultValue={o?.responsavel ?? ""}>
            <option value="">{to.semResponsavel}</option>
            {pessoas.filter((x) => !x.contato && !x.externo && x.equipes.length).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Campo>
          <Campo tipo="selecao" name="equipe" rotulo={to.equipe} required defaultValue={o?.equipe ?? "equipe_1"}>
            {equipes.filter((e) => !e.contatos).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo tipo="data" name="inicio" rotulo={to.inicio} defaultValue={o?.inicio} />
            <Campo tipo="data" name="prazo" rotulo={to.prazo} defaultValue={o?.prazo} />
          </div>
        </div>
        <fieldset>
          <legend className="rotulo-campo mb-2 text-t2">{to.comoMedimos}</legend>
          <div className="inline-flex rounded-pilula bg-s2 p-1">
            {([["marcos", to.marcosLbl], ["numero", to.numero]] as const).map(([v, r]) => (
              <label key={v} className="anel-foco inline-flex h-10 cursor-pointer items-center rounded-pilula px-4 font-texto text-sm font-medium text-t2 has-[:checked]:bg-s3 has-[:checked]:text-t1">
                <input type="radio" id={`tipo-${v}`} name="tipo" value={v} defaultChecked={v === "numero" ? numero : !numero} className="sr-only" />{r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="so-numero grid gap-3 sm:grid-cols-3">
          <Campo name="inicial" type="number" step="any" rotulo={to.inicial} defaultValue={o?.meta ? String(o.meta.inicial) : "0"} />
          <Campo name="alvo" type="number" step="any" rotulo={to.alvo} defaultValue={o?.meta ? String(o.meta.alvo) : ""} />
          <Campo name="unidade" rotulo={to.unidade} maxLength={30} defaultValue={o?.meta?.unidade} />
        </div>
        <div className="so-marcos">
          <Campo tipo="area" name="marcos" rotulo={to.marcosLbl} ajuda={to.marcosAjuda} rows={5} defaultValue={o?.marcos.map((m) => m.texto).join("\n")} />
        </div>
        <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario">{to.salvar}</BotaoEnviar></div>
      </Cartao>
    </form>
  );
}
