"use client";

import { useEffect, useState } from "react";

// Tema da v2 (DESIGN-SYSTEM.md seções 1, 11 e 13.1): Escuro (padrão) · Claro · Sistema.
// A escolha fica no cookie nipei_tema (mesmo padrão de nipei_menu / nipei_lang) e vira o
// atributo data-tema do <html>: "escuro" | "claro" | sem atributo (= Sistema, segue o aparelho).
// O script SCRIPT_TEMA (./temaScript.ts) roda no <head> (app/layout.tsx) antes da hidratação, para não piscar.

import { TEMA_COOKIE, TEMA_PADRAO as PADRAO, type ValorTema } from "./temaScript";

function aplicar(v: ValorTema) {
  if (v === "sistema") document.documentElement.removeAttribute("data-tema");
  else document.documentElement.setAttribute("data-tema", v);
  document.cookie = `${TEMA_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function lido(): ValorTema {
  const m = document.cookie.match(new RegExp(`(?:^|; )${TEMA_COOKIE}=(escuro|claro|sistema)`));
  return (m?.[1] as ValorTema) ?? PADRAO;
}

const OPCOES: { v: ValorTema; rotulo: string }[] = [
  { v: "escuro", rotulo: "Escuro" },
  { v: "claro", rotulo: "Claro" },
  { v: "sistema", rotulo: "Sistema" },
];

/**
 * Seletor segmentado (seção 9.4): pílula s2; ativo = s3 + contorno de 1 px.
 * Ícones tema-escuro / tema-claro / tema-sistema entram com <Icone> (Prompt 3); por ora, texto.
 */
export default function Tema({ rotulo = "Tema" }: { rotulo?: string }) {
  const [atual, setAtual] = useState<ValorTema>(PADRAO);
  useEffect(() => setAtual(lido()), []);
  const escolher = (v: ValorTema) => { setAtual(v); aplicar(v); };
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex gap-1 rounded-pilula bg-s2 p-1 font-texto">
      {OPCOES.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={atual === o.v} onClick={() => escolher(o.v)}
          className={`anel-foco min-h-11 rounded-pilula px-4 text-sm font-medium transition-colors duration-150 ${atual === o.v ? "bg-s3 text-t1 ring-1 ring-inset ring-s4" : "text-t2 hover:text-t1"}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
