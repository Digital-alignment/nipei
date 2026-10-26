"use client";

import { useState } from "react";
import Botao from "@/components/ds/Botao";
import Segmentado from "@/components/ds/Segmentado";
import { Etapas } from "@/components/ds/Bloco";
import Campo, { SugestaoPinu } from "@/components/ds/Campo";
import { BotaoIcone } from "@/components/ds/Botao";
import Chip from "@/components/ds/Chip";
import Abas, { AbasComPainel } from "@/components/ds/Abas";
import SecaoRecolhivel from "@/components/ds/SecaoRecolhivel";
import { ControleDeslizante, Interruptor, LinhaConfiguracao, ListaConfiguracoes } from "@/components/ds/Controles";
import Aviso from "@/components/ds/Aviso";
import { useToast } from "@/components/ds/Toast";
import { useConfirmar } from "@/components/ds/Dialogo";

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

export function DemoChips() {
  const [filtro, setFiltro] = useState("abertas");
  const [eqs, setEqs] = useState<string[]>(["guardioes"]);
  const alterna = (e: string) => setEqs((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]));
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {[["abertas", "Abertas", 24, "tarefa"], ["atrasadas", "Atrasadas", 3, "atencao"], ["minhas", "Comigo", 7, "pessoa"], ["semdono", "Sem responsável", 5, "pessoas"]].map(([v, r, n, i]) => (
          <Chip key={v as string} icone={i as "tarefa"} contagem={n as number} ativo={filtro === v} onClick={() => setFiltro(v as string)}>{r}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["escritorio", "producao", "guardioes", "manutencao"] as const).map((e) => (
          <Chip key={e} tipo="equipe" equipe={e} ativo={eqs.includes(e)} onClick={() => alterna(e)}>
            {{ escritorio: "Escritório", producao: "Produção Yawanawa", guardioes: "Guardiões", manutencao: "Manutenção" }[e]}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function DemoAvisos() {
  const toast = useToast();
  const confirmar = useConfirmar();
  const [fechado, setFechado] = useState(false);
  const [resposta, setResposta] = useState("");
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Aviso estado="info" titulo="Enviando as fotos…" mensagem="12 de 18 enviadas. Pode continuar usando o app." progresso={68} />
        <Aviso estado="sucesso" titulo="Tarefa concluída" mensagem="A equipe foi avisada pelo WhatsApp." acoes={<Botao icone="tarefa" variante="tonal" tamanho="M">Ver tarefa</Botao>} />
        <Aviso estado="atencao" titulo="Prazo amanhã" mensagem="3 tarefas dos Guardiões vencem amanhã." />
        {!fechado
          ? <Aviso estado="erro" titulo="Não foi possível salvar" mensagem="Sem conexão. Tente de novo quando o sinal voltar." onFechar={() => setFechado(true)}
              acoes={<Botao icone="gerar-outra" variante="tonal" tamanho="M">Tentar de novo</Botao>} />
          : <Botao icone="gerar-outra" variante="fantasma" tamanho="M" onClick={() => setFechado(false)}>Mostrar o aviso de erro de novo</Botao>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao icone="sucesso" variante="tonal" tamanho="M" onClick={() => toast.sucesso("Salvo")}>Toast: sucesso</Botao>
        <Botao icone="informacao" variante="tonal" tamanho="M" onClick={() => toast.info("Sem conexão. Vamos enviar quando voltar.")}>Toast: info</Botao>
        <Botao icone="tarefa" variante="tonal" tamanho="M" onClick={() => toast.sucesso("Tarefa criada", { acao: { rotulo: "Abrir", href: "#aviso" } })}>Toast com ação</Botao>
        <Botao icone="lixeira" variante="tonal" tamanho="M"
          onClick={async () => setResposta((await confirmar({ titulo: "Remover Kenewma dos Guardiões?", mensagem: "Ela continua nas outras equipes. Dá para adicionar de novo depois.", confirmarRotulo: "Remover", perigoso: true })) ? "removeu" : "cancelou")}>
          Diálogo: remover
        </Botao>
        <Botao icone="confirmar" variante="tonal" tamanho="M"
          onClick={async () => setResposta((await confirmar({ titulo: "Sair dos outros aparelhos?", mensagem: "Quem estiver conectado em outro celular ou computador vai precisar entrar de novo.", confirmarRotulo: "Sair dos outros" })) ? "confirmou" : "cancelou")}>
          Diálogo: confirmar
        </Botao>
        {resposta && <span className="meta self-center text-t2">resposta: {resposta}</span>}
      </div>
    </div>
  );
}

export function DemoAbas() {
  const [a, setA] = useState("hoje");
  return (
    <div className="grid gap-5">
      <Abas rotulo="Vista" ativa={a} onChange={setA} itens={[{ id: "hoje", rotulo: "Hoje", icone: "inicio", contagem: 4 }, { id: "semana", rotulo: "Semana", icone: "calendario" }, { id: "atrasadas", rotulo: "Atrasadas", icone: "atencao", contagem: 3, alerta: true }]} />
      <AbasComPainel id="design-pasta" pasta rotulo="Ficha da tarefa" abas={[
        { id: "detalhes", rotulo: "Detalhes", icone: "tarefa", conteudo: <p className="corpo text-t2">A aba ativa se funde ao painel (cantos invertidos). Use ← → para trocar.</p> },
        { id: "comentarios", rotulo: "Comentários", icone: "mensagem", contagem: 2, conteudo: <p className="corpo text-t2">2 comentários.</p> },
        { id: "atividade", rotulo: "Atividade", icone: "prazo", conteudo: <p className="corpo text-t2">Linha do tempo da tarefa.</p> },
      ]} />
    </div>
  );
}

export function DemoRecolhivel() {
  return (
    <div>
      <SecaoRecolhivel id="design-sec-1" titulo="Atrasadas" contagem={3} alerta><p className="corpo text-t2">Lembra se ficou aberta ou fechada neste aparelho.</p></SecaoRecolhivel>
      <SecaoRecolhivel id="design-sec-2" titulo="Próximos 7 dias" contagem={12} aberto={false}><p className="corpo text-t2">Fechada na primeira vez.</p></SecaoRecolhivel>
    </div>
  );
}

export function DemoControles() {
  const [whats, setWhats] = useState(true);
  const [resumo, setResumo] = useState(false);
  const [volume, setVolume] = useState(54);
  const [lembrete, setLembrete] = useState(2);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid content-start gap-3">
        <ControleDeslizante rotulo="Volume do Pinu" valor={volume} onChange={setVolume} formatar={(v) => `${v}%`} />
        <ControleDeslizante rotulo="Lembrete" opcoes={["Na hora", "15 min antes", "1 h antes", "1 dia antes", "1 semana antes"]} valor={lembrete} onChange={setLembrete} />
        <div className="flex flex-wrap items-center gap-4">
          <Interruptor rotulo="Exemplo ligado" padrao />
          <Interruptor rotulo="Exemplo desligado" />
          <Interruptor rotulo="Exemplo desativado" desativado />
        </div>
      </div>
      <ListaConfiguracoes titulo="Avisos">
        <LinhaConfiguracao rotulo="Avisos por WhatsApp" descricao="Tarefas novas e o resumo das 7h" interruptor={{ ligado: whats, onChange: setWhats }} />
        <LinhaConfiguracao rotulo="Resumo diário do Pinu" interruptor={{ ligado: resumo, onChange: setResumo }} />
        <LinhaConfiguracao rotulo="Idioma" valor="Português" onClick={() => {}} />
        <LinhaConfiguracao rotulo="Versão" valor="2.59" />
      </ListaConfiguracoes>
    </div>
  );
}
