"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Icone, { type NomeIcone } from "./Icone";

// Abas (DESIGN-SYSTEM.md seção 9.11): barra em pílula s1, itens com ícone + texto; ativa = pílula s3,
// ícone em acento e ponto de acento embaixo; contagem em pílula. `pasta` = a ativa se funde ao painel
// logo abaixo (cantos invertidos) — para fichas (Tarefa: Detalhes / Comentários / Atividade).
// Teclado: ← → trocam de aba, Home/End vão à primeira/última (padrão WAI-ARIA, ativação automática).

export type ItemAba = { id: string; rotulo: string; icone?: NomeIcone; contagem?: number; alerta?: boolean };

export default function Abas({ itens, ativa, onChange, pasta, rotulo = "Abas", idBase }: {
  itens: ItemAba[]; ativa: string; onChange: (id: string) => void; pasta?: boolean; rotulo?: string; idBase?: string;
}) {
  const gerado = useId();
  const base = idBase ?? `abas${gerado}`;
  const lista = useRef<HTMLDivElement>(null);
  const teclas = (e: KeyboardEvent) => {
    const i = itens.findIndex((x) => x.id === ativa);
    const alvo = e.key === "ArrowRight" ? (i + 1) % itens.length : e.key === "ArrowLeft" ? (i - 1 + itens.length) % itens.length : e.key === "Home" ? 0 : e.key === "End" ? itens.length - 1 : -1;
    if (alvo < 0) return;
    e.preventDefault();
    onChange(itens[alvo].id);
    lista.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[alvo]?.focus();
  };
  return (
    <div ref={lista} role="tablist" aria-label={rotulo} onKeyDown={teclas}
      className={pasta ? "flex gap-1 overflow-x-auto px-5" : "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-pilula bg-s1 p-1"}>
      {itens.map((a) => {
        const on = a.id === ativa;
        const forma = pasta
          ? `rounded-t-[18px] px-4 pb-3.5 pt-3 ${on ? "bg-s2 text-t1" : "text-t3 hover:text-t2"}`
          : `rounded-pilula px-4 ${on ? "bg-s3 text-t1" : "text-t3 hover:bg-s2 hover:text-t2"}`;
        return (
          <button key={a.id} type="button" role="tab" id={`${base}-aba-${a.id}`} aria-selected={on} aria-controls={`${base}-painel-${a.id}`} tabIndex={on ? 0 : -1}
            onClick={() => onChange(a.id)}
            className={`anel-foco relative inline-flex min-h-11 shrink-0 items-center gap-2 font-texto text-[15px] font-medium transition-colors duration-150 ${forma}`}>
            {a.icone && <Icone nome={a.icone} tamanho={18} className={on ? "text-ac-text" : undefined} />}
            {a.rotulo}
            {a.contagem != null && a.contagem > 0 && (
              <span className={`rounded-pilula px-1.5 text-xs tabular-nums ${a.alerta ? "bg-err-bg text-err" : on ? "bg-s2 text-t2" : "bg-s2 text-t3"}`}>{a.contagem}</span>
            )}
            {on && <span aria-hidden="true" className={`absolute left-1/2 size-1 -translate-x-1/2 rounded-pilula bg-ac ${pasta ? "bottom-1.5" : "bottom-1"}`} />}
            {/* pasta: cantos invertidos ligando a aba ao painel */}
            {on && pasta && (
              <>
                <span aria-hidden="true" className="absolute bottom-0 -left-[18px] size-[18px]" style={{ background: "radial-gradient(circle at 0 0, transparent 17.5px, var(--s2) 18px)" }} />
                <span aria-hidden="true" className="absolute bottom-0 -right-[18px] size-[18px]" style={{ background: "radial-gradient(circle at 100% 0, transparent 17.5px, var(--s2) 18px)" }} />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

export type AbaComConteudo = ItemAba & { conteudo: ReactNode };

/**
 * Abas + painéis, lembrando a última aba aberta neste aparelho (`localStorage nipei:aba:<id>`).
 * `inicial` vence a memória (ex.: um link filtrado que precisa abrir numa aba certa).
 */
export function AbasComPainel({ id, abas, inicial, pasta, rotulo }: { id: string; abas: AbaComConteudo[]; inicial?: string; pasta?: boolean; rotulo?: string }) {
  const chave = `nipei:aba:${id}`;
  const [atual, setAtual] = useState(inicial ?? abas[0]?.id ?? "");
  useEffect(() => {
    if (inicial) return;
    try { const v = localStorage.getItem(chave); if (v && abas.some((a) => a.id === v)) setAtual(v); } catch { /* modo privado */ }
  }, [chave, abas, inicial]);
  const escolher = (a: string) => { setAtual(a); try { localStorage.setItem(chave, a); } catch { /* modo privado */ } };
  const aba = abas.find((a) => a.id === atual) ?? abas[0];
  const base = `abas-${id}`;
  return (
    <div className="mb-6 grid">
      <Abas itens={abas} ativa={aba?.id ?? ""} onChange={escolher} pasta={pasta} rotulo={rotulo} idBase={base} />
      <div role="tabpanel" id={`${base}-painel-${aba?.id}`} aria-labelledby={`${base}-aba-${aba?.id}`} tabIndex={0}
        className={`outline-none ${pasta ? "rounded-cartao bg-s2 p-4" : "pt-3"}`}>
        {aba?.conteudo}
      </div>
    </div>
  );
}
