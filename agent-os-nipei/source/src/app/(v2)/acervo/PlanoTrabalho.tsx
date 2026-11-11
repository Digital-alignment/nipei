import Link from "next/link";
import Botao from "@/components/ds/Botao";
import Cartao from "@/components/ds/Cartao";
import { BadgeEstado, type EstadoBadge } from "@/components/ds/Chip";
import { AnelProgresso, BarraProgresso } from "@/components/ds/Progresso";
import { GrupoAvatares } from "@/components/ds/Avatar";
import Recolhivel from "@/components/ds/SecaoRecolhivel";
import { EstadoVazio } from "@/components/ds/Estados";
import { planoTrabalho, type EstadoPlano } from "@/lib/v2/planoTrabalho";

// Acervo → "Agenda work plan" (DS 10.24, gestão only; the page checks it). Lynn's homework as a checklist:
// overall ring, one collapsible section per part of her document, a line per question with who is missing,
// then the deliverables. Never shows the answers themselves.
const BADGE: Record<EstadoPlano, EstadoBadge> = { feito: "feita", rascunho: "andamento", falta: "pendente" };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function PlanoTrabalho({ en }: { en: boolean }) {
  const p = planoTrabalho();
  if (!p) return <EstadoVazio compacto titulo={<>Nenhum diagnóstico da Lynn aberto</>} texto="Crie um em Diagnósticos com o modelo team-development." />;
  const txt = { feito: en ? "Done" : "Feita", rascunho: en ? "In progress" : "Em andamento", falta: en ? "Pending" : "Pendente" };

  return (
    <div className="grid gap-4">
      <Cartao>
        <div className="flex flex-wrap items-center gap-4">
          <AnelProgresso valor={p.feitas} max={p.total} tamanho={72} rotulo={`${pct(p.feitas, p.total)}%`} />
          <div className="min-w-0 flex-1">
            <p className="titulo-cartao">{p.d.modelo.titulo_en && en ? p.d.modelo.titulo_en : p.d.titulo}</p>
            <p className="corpo text-t2">{p.feitas} de {p.total} respostas e entregas · {p.rascunhos} em rascunho</p>
            <div className="mt-2 flex items-center gap-2">
              <GrupoAvatares pessoas={p.pessoas.map((x) => ({ nome: x.name }))} max={6} tamanho={24} />
              <span className="meta text-t3">{p.pessoas.map((x) => x.name.split(" (")[0]).join(", ")}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Botao href="/acervo/plano/exportar?formato=csv" icone="baixar" variante="tonal" tamanho="M">Exportar CSV</Botao>
          <Botao href="/acervo/plano/exportar?formato=md" icone="baixar" variante="fantasma" tamanho="M">Exportar (EN)</Botao>
          <Botao href={`/diagnosticos/${p.d.id}`} icone="avancar" variante="fantasma" tamanho="M">Abrir diagnóstico</Botao>
        </div>
      </Cartao>

      {p.secoes.map((s) => (
        <Recolhivel key={s.id} id={`plano-${s.id}`} emCartao aberto={false} contagem={`${s.feitas}/${s.total}`}
          titulo={<>{s.numero}. {en ? s.titulo_en : s.titulo}</>}
          resumo={<BarraProgresso valor={s.feitas} max={s.total} rotulo={`${pct(s.feitas, s.total)}% · ${s.escopo === "coletivo" ? "coletiva" : "individual"}`} />}>
          <ul className="grid gap-3">
            {s.perguntas.map((q) => (
              <li key={q.id} className="grid gap-1.5 border-t border-s3 pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-start gap-2">
                  <BadgeEstado estado={BADGE[q.estado]}>{txt[q.estado]}</BadgeEstado>
                  <p className="corpo min-w-0 flex-1 text-t1">{en ? q.texto_en || q.texto : q.texto}</p>
                </div>
                <p className="meta text-t3">
                  {q.escopo === "individual"
                    ? <>{q.feitas}/{q.total}{q.rascunhos ? ` · ${q.rascunhos} rascunho${q.rascunhos > 1 ? "s" : ""}` : ""}{q.faltam.length ? ` · faltam: ${q.faltam.join(", ")}` : ""}</>
                    : <>{q.responsavel ? `Responsável: ${q.responsavel}` : "Sem responsável"}{q.falta ? ` · falta: ${q.falta}` : ""}</>}
                </p>
              </li>
            ))}
          </ul>
        </Recolhivel>
      ))}

      <Cartao>
        <p className="titulo-cartao mb-3">Entregas</p>
        <ul className="grid gap-2">
          {p.entregaveis.map((e) => (
            <li key={e.id}>
              <Link href={e.href} className="anel-foco flex flex-wrap items-center gap-2 rounded-interno py-1.5 hover:bg-s2">
                <BadgeEstado estado={e.feito ? "feita" : "pendente"}>{e.feito ? txt.feito : txt.falta}</BadgeEstado>
                <span className="corpo min-w-0 flex-1 text-t1">{en ? e.rotulo_en : e.rotulo}</span>
                {e.detalhe && <span className="meta text-t3">{e.detalhe}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
