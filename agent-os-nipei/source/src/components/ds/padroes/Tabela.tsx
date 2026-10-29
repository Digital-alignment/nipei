"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import Icone from "../Icone";

// Tabela (DESIGN-SYSTEM.md seção 10.8): cabeçalho em `rotulo-maiusculo`; a coluna ordenada fica clara com ▼ em
// acento; linhas de 56 px sem zebra, divisor fino, hover muda o tom; números à direita (tabulares); estado em
// badge; ⋯ no fim. No celular cada linha vira um cartão (a 1ª coluna é o título; as outras, pares rótulo/valor).

export type ColunaTabela = {
  id: string; rotulo: string;
  /** Alinha à direita com números tabulares. */
  numero?: boolean;
  /** Ordena pelo valor em `linha.valores[id]` (ou pelo texto da célula, se for texto). */
  ordenavel?: boolean;
  /** Some no cartão do celular (ex.: colunas redundantes). */
  soComputador?: boolean;
  className?: string;
};
export type LinhaTabela = {
  id: string;
  celulas: Record<string, ReactNode>;
  valores?: Record<string, string | number>;
  /** A linha toda leva a esta página (a 1ª célula vira o link). */
  href?: string;
  /** Ações no fim da linha (ex.: <MenuAcoes>, um botão). */
  acoes?: ReactNode;
  apagada?: boolean;
};

export default function Tabela({ colunas, linhas, rotulo, ordemInicial, vazio }: {
  colunas: ColunaTabela[]; linhas: LinhaTabela[]; rotulo: string;
  ordemInicial?: { id: string; desc?: boolean }; vazio?: ReactNode;
}) {
  const [ordem, setOrdem] = useState(ordemInicial ?? null);
  const ordenadas = useMemo(() => {
    if (!ordem) return linhas;
    const v = (l: LinhaTabela) => l.valores?.[ordem.id] ?? (typeof l.celulas[ordem.id] === "string" || typeof l.celulas[ordem.id] === "number" ? l.celulas[ordem.id] as string | number : "");
    return [...linhas].sort((a, b) => {
      const x = v(a), y = v(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt", { numeric: true });
      return ordem.desc ? -c : c;
    });
  }, [linhas, ordem]);
  if (!linhas.length) return <>{vazio ?? null}</>;
  const temAcoes = linhas.some((l) => l.acoes);
  const primeira = colunas[0];
  const titulo = (l: LinhaTabela) => l.href
    ? <Link href={l.href} className="anel-foco rounded-interno font-medium text-t1 hover:underline">{l.celulas[primeira.id]}</Link>
    : l.celulas[primeira.id];

  return (
    <>
      <div className="hidden overflow-x-auto rounded-cartao bg-s1 md:block">
        <table className="w-full border-collapse font-texto text-[15px]" aria-label={rotulo}>
          <thead>
            <tr>
              {colunas.map((c) => {
                const on = ordem?.id === c.id;
                return (
                  <th key={c.id} scope="col" aria-sort={on ? (ordem!.desc ? "descending" : "ascending") : undefined}
                    className={`h-12 px-4 text-left font-normal ${c.numero ? "text-right" : ""} ${c.className ?? ""}`}>
                    {c.ordenavel ? (
                      <button type="button" onClick={() => setOrdem(on ? { id: c.id, desc: !ordem!.desc } : { id: c.id, desc: !!c.numero })}
                        className={`anel-foco rotulo-maiusculo inline-flex items-center gap-1 rounded-interno ${on ? "text-t1" : "text-t3 hover:text-t2"}`}>
                        {c.rotulo}<Icone nome="abrir" tamanho={14} className={`${on ? "text-ac-text" : "opacity-40"} ${on && !ordem!.desc ? "rotate-180" : ""}`} />
                      </button>
                    ) : <span className="rotulo-maiusculo text-t3">{c.rotulo}</span>}
                  </th>
                );
              })}
              {temAcoes && <th className="w-14"><span className="sr-only">⋯</span></th>}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l.id} className={`h-14 border-t border-s2 transition-colors hover:bg-s2 ${l.apagada ? "opacity-50" : ""}`}>
                {colunas.map((c, i) => (
                  <td key={c.id} className={`px-4 py-2 ${c.numero ? "text-right tabular-nums" : ""} ${i === 0 ? "text-t1" : "text-t2"} ${c.className ?? ""}`}>
                    {i === 0 ? titulo(l) : l.celulas[c.id]}
                  </td>
                ))}
                {temAcoes && <td className="pr-2 text-right">{l.acoes}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* celular: cada linha vira um cartão */}
      <ul className="grid gap-2 md:hidden" aria-label={rotulo}>
        {ordenadas.map((l) => (
          <li key={l.id} className={`grid gap-2 rounded-cartao bg-s1 p-3.5 ${l.apagada ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 font-texto text-[15px] text-t1">{titulo(l)}</div>
              {l.acoes}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {colunas.slice(1).filter((c) => !c.soComputador && l.celulas[c.id] != null && l.celulas[c.id] !== "").map((c) => (
                <div key={c.id} className="min-w-0">
                  <dt className="rotulo-maiusculo text-t3">{c.rotulo}</dt>
                  <dd className={`corpo text-t1 ${c.numero ? "tabular-nums" : ""}`}>{l.celulas[c.id]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Minigráfico: linha fina com ponto final (vermelho quando o último valor cai em relação ao anterior). */
export function Sparkline({ pontos, largura = 88, altura = 28, rotulo }: { pontos: number[]; largura?: number; altura?: number; rotulo?: string }) {
  if (pontos.length < 2) return <span className="meta text-t3">—</span>;
  const max = Math.max(...pontos), min = Math.min(...pontos), faixa = max - min || 1;
  const xy = pontos.map((v, i) => [3 + (i / (pontos.length - 1)) * (largura - 6), altura - 3 - ((v - min) / faixa) * (altura - 6)] as const);
  const caiu = pontos.at(-1)! < pontos.at(-2)!;
  const [fx, fy] = xy.at(-1)!;
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={rotulo ?? pontos.join(", ")} className="inline-block align-middle">
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={fx} cy={fy} r="3" fill={caiu ? "var(--err)" : "var(--ac)"} />
    </svg>
  );
}
