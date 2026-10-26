"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Segmentado from "./Segmentado";

/**
 * Escuro / Claro só dentro de um trecho da página (data-tema no próprio elemento; ver globals.css).
 * Não muda a preferência da pessoa — para isso existe <Tema>. Usado na página /design.
 */
export default function TemaLocal({ children, rotulo = "Tema desta página" }: { children: ReactNode; rotulo?: string }) {
  const [tema, setTema] = useState<"escuro" | "claro">("escuro");

  return (
    <div data-tema={tema} className="bg-bg text-t1 font-texto">
      <div className="sticky top-14 z-10 flex justify-end bg-bg py-3">
        <Segmentado rotulo={rotulo} valor={tema} onChange={setTema}
          opcoes={[{ valor: "escuro", rotulo: "Escuro", icone: "tema-escuro" }, { valor: "claro", rotulo: "Claro", icone: "tema-claro" }]} />
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
