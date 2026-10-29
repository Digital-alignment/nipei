"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icone from "./Icone";

// Seção recolhível (DESIGN-SYSTEM.md seção 9.12): título de seção + contagem + ▼ (`abrir`, gira 180° aberta).
// Lembra aberta/fechada no aparelho (`localStorage nipei:secao:<id>`), abre sozinha com #id na URL ou por
// um atalho (<AtalhosSecao>, <BotaoSecao>). `forcar` abre agora, ignorando a memória (ex.: uma busca).
// `emCartao`: dentro de um <Cartao>, sem divisor; `resumo` fica visível mesmo fechada (ex.: a barra de progresso).

const EVENTO = "nipei:secao";

export default function SecaoRecolhivel({ id, titulo, contagem, alerta, aberto = true, forcar, emCartao, resumo, children }: {
  id: string; titulo: ReactNode; contagem?: number | string; alerta?: boolean; aberto?: boolean; forcar?: boolean;
  emCartao?: boolean; resumo?: ReactNode; children: ReactNode;
}) {
  const chave = `nipei:secao:${id}`;
  const [open, setOpen] = useState(forcar || aberto);
  useEffect(() => {
    if (!forcar) { try { const v = localStorage.getItem(chave); if (v !== null) setOpen(v === "1"); } catch { /* modo privado */ } }
    const pelaHash = () => { if (location.hash === `#${id}`) setOpen(true); };
    const pedido = (e: Event) => { if ((e as CustomEvent<string>).detail === id) setOpen(true); };
    pelaHash();
    window.addEventListener("hashchange", pelaHash);
    window.addEventListener(EVENTO, pedido);
    return () => { window.removeEventListener("hashchange", pelaHash); window.removeEventListener(EVENTO, pedido); };
  }, [chave, id, forcar]);

  return (
    <details id={id} open={open} className={`group scroll-mt-20 ${emCartao ? "" : "mb-2 border-b border-s3 last:border-b-0"}`}
      onToggle={(e) => { const o = e.currentTarget.open; setOpen(o); try { localStorage.setItem(chave, o ? "1" : "0"); } catch { /* modo privado */ } }}>
      <summary className="anel-foco grid cursor-pointer select-none list-none gap-3 rounded-interno [&::-webkit-details-marker]:hidden">
        <span className={`flex items-center gap-2.5 ${emCartao ? "min-h-11" : "min-h-14"}`}>
          <span className="titulo-secao">{titulo}</span>
          {contagem != null && <span className={`rounded-pilula px-2 text-xs font-medium tabular-nums ${alerta && contagem !== 0 ? "bg-warn-bg text-warn" : "bg-s2 text-t2"}`}>{contagem}</span>}
          <Icone nome="abrir" tamanho={18} className="ml-auto text-t2 transition-transform duration-200 group-open:rotate-180" />
        </span>
        {resumo}
      </summary>
      <div className={emCartao ? "grid gap-3 pt-3" : "pb-6 pt-1"}>{children}</div>
    </details>
  );
}

/** Abre uma seção recolhível e rola até ela. */
function irPara(id: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }));
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  history.replaceState(null, "", `#${id}`);
}

/** Um botão em qualquer lugar da página que abre uma seção (ex.: "+ Adicionar" → o formulário). */
export function BotaoSecao({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return <button type="button" onClick={() => irPara(id)} className={className}>{children}</button>;
}

/** Cartões-atalho com número no topo da página: abrem a seção e rolam até ela. */
export function AtalhosSecao({ itens }: { itens: { id: string; label: string; valor: number | string; alerta?: boolean }[] }) {
  return (
    <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map((i) => (
        <button key={i.id} type="button" onClick={() => irPara(i.id)}
          className={`anel-foco rounded-cartao px-3 py-2.5 text-left transition-colors duration-150 ${i.alerta ? "bg-warn-bg text-warn" : "bg-s1 text-t1 hover:bg-s2"}`}>
          <p className="font-display text-2xl font-light leading-tight tabular-nums">{i.valor}</p>
          <p className={`meta leading-tight ${i.alerta ? "" : "text-t2"}`}>{i.label}</p>
        </button>
      ))}
    </div>
  );
}
