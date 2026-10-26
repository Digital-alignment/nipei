import Chip from "@/components/ds/Chip";
import Botao from "@/components/ds/Botao";
import Icone from "@/components/ds/Icone";
import { EstadoVazio } from "@/components/ds/Estados";
import { errosRecentes } from "@/lib/v2/erros";
import type { ModuloProps } from "./index";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

/** Server errors, grouped by message (same error many times = one line). Filter: ?dias */
export default function Erros({ q }: ModuloProps) {
  const dias = [1, 7, 30].includes(Number(q.dias)) ? Number(q.dias) : 7;
  const es = errosRecentes(dias);
  const grupos = [...es.reduce((g, e) => {
    const k = e.msg.replace(/\d+/g, "#").slice(0, 160);
    const x = g.get(k) ?? { e, n: 0, onde: new Set<string>() };
    x.n++; x.onde.add(e.onde); g.set(k, x);
    return g;
  }, new Map<string, { e: (typeof es)[number]; n: number; onde: Set<string> }>()).values()];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {[1, 7, 30].map((d) => <Chip key={d} href={`/controle?m=erros&dias=${d}`} ativo={d === dias} icone="calendario">{d === 1 ? "24 horas" : `${d} dias`}</Chip>)}
        <span className="meta text-t2">{es.length} erro{es.length === 1 ? "" : "s"}, {grupos.length} diferente{grupos.length === 1 ? "" : "s"}</span>
        <span className="ml-auto"><Botao href={`/controle/exportar?r=erros&dias=${dias}`} variante="tonal" tamanho="P" icone="baixar">CSV</Botao></span>
      </div>
      {!grupos.length && <EstadoVazio destaque selo="sol" titulo="Nenhum erro do servidor no período." texto="Falhas inesperadas em páginas, botões, rotas e IA aparecem aqui." />}
      <ul className="grid gap-2">
        {grupos.map(({ e, n, onde }, i) => (
          <li key={i} className="grid gap-1.5 rounded-cartao bg-s1 p-4">
            <p className="flex items-start gap-2 font-texto text-[15px] font-semibold text-err"><Icone nome="erro" tamanho={18} className="mt-0.5 shrink-0" /><span className="break-words">{e.msg}</span></p>
            <p className="meta pl-[26px] text-t2"><b className="text-t1">{n}×</b> · último {quando(e.em)} · {[...onde].slice(0, 3).join(" · ")}{onde.size > 3 ? ` +${onde.size - 3}` : ""}</p>
            {e.pilha && (
              <details className="group pl-[26px]">
                <summary className="anel-foco meta inline-flex cursor-pointer list-none items-center gap-1 rounded-interno text-t2 hover:text-t1"><Icone nome="abrir" tamanho={14} className="transition-transform group-open:rotate-180" />Onde no código</summary>
                <p className="meta mt-1 break-all text-t2">{e.pilha.split(" | ").map((l, j) => <span key={j} className="block">{l}</span>)}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
      <p className="meta text-t2">Entram aqui os erros que ninguém veria: falhas inesperadas em páginas, botões e rotas, e a IA fora do ar. Avisos normais para a pessoa (“campo obrigatório”) não entram.</p>
    </div>
  );
}
