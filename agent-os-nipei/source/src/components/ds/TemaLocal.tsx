"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icone from "./Icone";

/**
 * Escuro / Claro só dentro de um trecho da página (data-tema no próprio elemento; ver globals.css).
 * Não muda a preferência da pessoa — para isso existe <Tema>. Usado na página /design.
 */
export default function TemaLocal({ children, rotulo = "Tema desta página" }: { children: ReactNode; rotulo?: string }) {
  const [tema, setTema] = useState<"escuro" | "claro">("escuro");
  const opcoes = [{ v: "escuro", nome: "Escuro", icone: "tema-escuro" }, { v: "claro", nome: "Claro", icone: "tema-claro" }] as const;
  return (
    <div data-tema={tema} className="bg-bg text-t1 font-texto">
      <div className="sticky top-14 z-10 flex justify-end bg-bg py-3">
        <div role="radiogroup" aria-label={rotulo} className="inline-flex gap-1 rounded-pilula bg-s2 p-1">
          {opcoes.map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={tema === o.v} onClick={() => setTema(o.v)}
              className={`anel-foco inline-flex min-h-11 items-center gap-2 rounded-pilula px-4 text-sm font-medium transition-colors duration-150 ${tema === o.v ? "bg-s3 text-t1 ring-1 ring-inset ring-s4" : "text-t2 hover:text-t1"}`}>
              <Icone nome={o.icone} tamanho={18} className={tema === o.v ? "text-ac-text" : undefined} />{o.nome}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

/** O valor atual de um token (ex.: "#141414"), lido do CSS no próprio lugar — nada de hex copiado no código. */
export function ValorToken({ token }: { token: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [valor, setValor] = useState("");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ler = () => setValor(getComputedStyle(el).getPropertyValue(`--${token}`).trim().toUpperCase());
    ler();
    // o trecho pode trocar de tema (TemaLocal): relê quando algum data-tema acima muda
    const obs = new MutationObserver(ler);
    for (let p: HTMLElement | null = el; p; p = p.parentElement) if (p.hasAttribute("data-tema")) obs.observe(p, { attributes: true, attributeFilter: ["data-tema"] });
    return () => obs.disconnect();
  }, [token]);
  return <span ref={ref} className="tabular-nums">{valor || "…"}</span>;
}
