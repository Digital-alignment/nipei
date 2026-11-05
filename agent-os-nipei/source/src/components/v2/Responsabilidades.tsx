import Link from "next/link";
import Campo from "@/components/ds/Campo";
import Cartao from "@/components/ds/Cartao";
import Chip, { BadgeEstado } from "@/components/ds/Chip";
import BotaoEnviar from "@/components/v2/BotaoEnviar";
import SemanaPresenca from "@/components/v2/SemanaPresenca";
import { camposPessoaAction } from "@/app/(v2)/actions";
import type { Pessoa, Tarefa } from "@/lib/v2/data";
import { BADGE_RITMO, ritmo } from "@/lib/v2/objetivos";
import type { Responsabilidades as R } from "@/lib/v2/pessoasFicha";
import type { Dict } from "@/lib/v2/i18n";

// Ficha → Resumo (DS 10.23): role, "referente de" and what the person is responsible for, linking to each place.
export default function Responsabilidades({ p, r, tarefas, hoje, semana, hojeIdx, editar, t }: {
  p: Pessoa; r: R; tarefas: Tarefa[]; hoje: string; semana: string[] | undefined; hojeIdx: number; editar: boolean; t: Dict;
}) {
  const tp = t.ps;
  const vazio = !r.coordena.length && !r.lidera.length && !r.objetivos.length && !r.procedimentos.length;
  const Linha = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
    <div><p className="rotulo-maiusculo text-t3">{rotulo}</p><div className="corpo flex flex-wrap gap-x-3 gap-y-1 text-t1">{children}</div></div>
  );
  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="rotulo-maiusculo text-t3">{tp.responsabilidades}</p>
          <p className="titulo-cartao">{p.funcao || <span className="text-t3">{tp.semPapel}</span>}</p>
        </div>
      </div>
      {p.referenteDe.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="meta text-t2">{tp.referente}:</span>{p.referenteDe.map((x) => <Chip key={x} tipo="metadado">{x}</Chip>)}</div>}
      {r.coordena.length > 0 && <Linha rotulo={tp.coordena}>{r.coordena.map((e) => <Link key={e.id} href={`/equipes/${e.id}`} className="hover:underline">{e.nome}</Link>)}</Linha>}
      {r.lidera.length > 0 && <Linha rotulo={tp.lidera}>{r.lidera.map((x) => <Link key={x.id} href={`/projetos/${x.id}`} className="hover:underline">{x.nome}</Link>)}</Linha>}
      {r.objetivos.length > 0 && (
        <Linha rotulo={tp.responsavelPor}>
          <ul className="grid w-full gap-1.5">
            {r.objetivos.map((o) => { const rt = ritmo(o, tarefas, hoje); return (
              <li key={o.id} className="flex flex-wrap items-center gap-2"><Link href={`/objetivos/${o.id}`} className="min-w-0 flex-1 hover:underline">{o.titulo}</Link><BadgeEstado estado={BADGE_RITMO[rt]}>{t.ob.ritmos[rt]}</BadgeEstado></li>
            ); })}
          </ul>
        </Linha>
      )}
      {r.procedimentos.length > 0 && <Linha rotulo={tp.procedimentos}>{r.procedimentos.map((x) => <Link key={x.id} href={`/equipes/${x.equipe}?aba=procedimentos`} className="hover:underline">{x.titulo}</Link>)}</Linha>}
      {vazio && <p className="meta text-t3">{tp.semResponsabilidades}</p>}
      {semana && semana.some(Boolean) && <div><p className="rotulo-maiusculo mb-1 text-t3">{tp.estaSemana}</p><SemanaPresenca pessoa={p.id} dias={semana} hojeIdx={hojeIdx} t={t} editar={false} /></div>}
      {editar && (
        <details className="group">
          <summary className="anel-foco meta inline-flex min-h-11 cursor-pointer list-none items-center rounded-pilula px-3 text-t2 hover:bg-s2">{tp.editar}: {tp.papel} · {tp.referente}</summary>
          <form action={camposPessoaAction} className="mt-2 grid gap-2">
            <input type="hidden" name="pessoa" value={p.id} />
            <Campo name="funcao" rotulo={tp.papel} defaultValue={p.funcao} maxLength={80} placeholder={tp.papelPh} />
            <Campo name="referente" rotulo={tp.referente} ajuda={tp.referenteAjuda} defaultValue={p.referenteDe.join(", ")} />
            <div><BotaoEnviar enviando="…" icone="confirmar" variante="primario" tamanho="M">{tp.salvar}</BotaoEnviar></div>
          </form>
        </details>
      )}
    </Cartao>
  );
}
