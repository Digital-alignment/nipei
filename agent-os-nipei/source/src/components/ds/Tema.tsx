"use client";

import { useEffect, useState } from "react";
import Segmentado, { type OpcaoSegmentado } from "./Segmentado";

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

const OPCOES: OpcaoSegmentado<ValorTema>[] = [
  { valor: "escuro", rotulo: "Escuro", icone: "tema-escuro" },
  { valor: "claro", rotulo: "Claro", icone: "tema-claro" },
  { valor: "sistema", rotulo: "Sistema", icone: "tema-sistema" },
];

/** Seletor de tema da pessoa (seletor segmentado, seção 9.4). */
export default function Tema({ rotulo = "Tema" }: { rotulo?: string }) {
  const [atual, setAtual] = useState<ValorTema>(PADRAO);
  useEffect(() => setAtual(lido()), []);
  return <Segmentado rotulo={rotulo} opcoes={OPCOES} valor={atual} onChange={(v) => { setAtual(v); aplicar(v); }} />;
}
