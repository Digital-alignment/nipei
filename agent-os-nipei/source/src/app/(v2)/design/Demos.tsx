"use client";

import { useState } from "react";
import Botao from "@/components/ds/Botao";
import Segmentado from "@/components/ds/Segmentado";
import { Etapas } from "@/components/ds/Bloco";

// Exemplos interativos da página /design (precisam de estado no navegador).

export function DemoSegmentado() {
  const [vista, setVista] = useState<"lista" | "grade">("lista");
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "ano">("semana");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Segmentado rotulo="Vista" soIcone valor={vista} onChange={setVista}
        opcoes={[{ valor: "lista", rotulo: "Lista", icone: "tarefa" }, { valor: "grade", rotulo: "Grade", icone: "imagem" }]} />
      <Segmentado rotulo="Período" valor={periodo} onChange={setPeriodo}
        opcoes={[{ valor: "semana", rotulo: "Semana", icone: "calendario" }, { valor: "mes", rotulo: "Mês", icone: "calendario" }, { valor: "ano", rotulo: "Ano", icone: "prazo" }]} />
      <span className="meta text-t2">vista: {vista} · período: {periodo}</span>
    </div>
  );
}

export function DemoCarregando() {
  const [salvando, setSalvando] = useState(false);
  return (
    <Botao icone="confirmar" carregando={salvando} onClick={() => { setSalvando(true); setTimeout(() => setSalvando(false), 2000); }}>Salvar (clique)</Botao>
  );
}

export function DemoEtapas() {
  const passos = [{ rotulo: "Dados", detalhe: "nome e contato" }, { rotulo: "Equipe", detalhe: "onde vai atuar" }, { rotulo: "Foto" }, { rotulo: "Confirmar", detalhe: "revisar e enviar" }];
  const [atual, setAtual] = useState(1);
  return (
    <div className="grid gap-3">
      <Etapas passos={passos} atual={atual} />
      <div className="flex flex-wrap gap-2">
        <Botao icone="voltar" variante="tonal" tamanho="M" desativado={atual === 0} onClick={() => setAtual((n) => Math.max(0, n - 1))}>Voltar</Botao>
        <Botao icone="avancar" variante="tonal" tamanho="M" desativado={atual === passos.length} onClick={() => setAtual((n) => Math.min(passos.length, n + 1))}>Avançar</Botao>
      </div>
    </div>
  );
}
