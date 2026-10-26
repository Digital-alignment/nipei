"use client";

import { useState } from "react";
import Botao from "@/components/ds/Botao";
import Segmentado from "@/components/ds/Segmentado";
import { Etapas } from "@/components/ds/Bloco";
import Campo, { SugestaoPinu } from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";

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

const SUGESTOES = ["Reunião mensal dos Guardiões", "Preparar a dieta de janeiro", "Revisar fatos do Conhecimento"];

export function DemoCampo() {
  const [titulo, setTitulo] = useState("");
  const [i, setI] = useState(0);
  const [nome, setNome] = useState("ab");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-3">
        <Campo tipo="titulo" rotulo="Título da tarefa" placeholder="Escreva um título" value={titulo} onChange={(e) => setTitulo(e.target.value)}
          sugestao={<SugestaoPinu texto={SUGESTOES[i]} onUsar={() => setTitulo(SUGESTOES[i])} onOutra={() => setI((n) => (n + 1) % SUGESTOES.length)} />} />
        <Campo tipo="area" rotulo="Descrição" ajuda="Aparece para todos da equipe." defaultValue="Preparar a pauta, confirmar o local e avisar a equipe pelo WhatsApp." />
        <Campo rotulo="Nome curto" value={nome} onChange={(e) => setNome(e.target.value)}
          erro={nome.trim().length < 3 ? "Escreva pelo menos 3 letras." : undefined} ajuda="Como a pessoa é chamada na equipe." />
      </div>
      <div className="grid content-start gap-3">
        <Campo tipo="busca" pinu rotulo="Pergunte ao Pinu ou busque…" />
        <Campo tipo="busca" rotulo="Buscar tarefas" acaoDireita={<BotaoIcone icone="filtrar" aria-label="Filtrar" tamanho={44} variante="fantasma" />} />
        <Campo tipo="selecao" rotulo="Equipe" defaultValue="guardioes">
          <option value="escritorio">Escritório / Gestão Geral</option><option value="producao">Produção Yawanawa</option>
          <option value="guardioes">Guardiões</option><option value="manutencao">Manutenção e Logística</option>
        </Campo>
        <Campo tipo="data" rotulo="Prazo" defaultValue="2026-10-30" />
        <Campo rotulo="Responsável" iconeEsquerda="pessoa" placeholder="Nome da pessoa" />
        <Campo rotulo="Desativado" defaultValue="Só leitura" disabled />
      </div>
    </div>
  );
}
