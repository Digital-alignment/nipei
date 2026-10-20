# Nipëi OS — nipei-control (Mission Control Hub)

> Guia e especificações canônicas para agentes autônomos de código (Claude Code, Antigravity, Hermes).

---

## 1. Visão Geral do Projeto

**Nipëi OS Control Hub** (`nipei-control`) é a interface central de governança, orquestração e produtividade do ecossistema Nipëi.
- **Framework:** Next.js 16 (App Router + Turbopack)
- **React:** 19 (Hooks, Suspense, Server Actions e Componentes Híbridos)
- **Estilo:** TailwindCSS + Nipëi OS Design System (Dark Glassmorphic, Neon Jade `#22c55e`, Cyan `#22d3ee`, Obsidian `#050805`)
- **Tipografia Tri-Contrato:** Alata (Headings), Outfit / Google Sans (UI body), Space Mono (Métricas, IDs, Terminais)
- **Repositório GitHub:** `Digital-alignment/nipei` (branch `main`)
- **Produção Online:** `https://os.nipeihu.app` (VPS `85.31.61.100`, Docker container `nipei-os` via Traefik)

---

## 2. Estrutura de Diretórios Canônica

```text
c:\Users\ondig\Code\Nipei\nipei-control\
├── agent-os-nipei/
│   └── source/                  <-- CÓDIGO FONTE NEXT.JS PRINCIPAL
│       ├── src/
│       │   ├── app/             <-- App Router Pages & API Routes
│       │   │   ├── api/
│       │   │   │   ├── agent-kanban/     <-- API Kanban, Attachments, Deliverables, Dispatch, Execute
│       │   │   │   ├── venu/kanban-action <-- API Bridge Venu ↔ Kanban
│       │   │   │   ├── hermes/realtime/  <-- OpenAI Realtime WebRTC S2S Session
│       │   │   │   └── vault/            <-- APIs de leitura/escrita do Nipëi Vault
│       │   │   ├── kanban/      <-- Interface Multidisciplinar do Kanban (/kanban)
│       │   │   ├── venu/        <-- Interface HUD Venu / Apollo (/venu)
│       │   │   └── mi-portal/   <-- Portal de Produtividade & Orbes (/mi-portal)
│       │   ├── components/      <-- Componentes React (SquadKanbanView, ApolloRealtime, etc.)
│       │   └── lib/             <-- Utilitários (kanbanGrounding, taskWorkspace, hermesApollo, config)
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml           <-- Configuração Docker para deploy no VPS
├── .agents/                     <-- Estado do projeto para agentes (PROJECT_STATE.md, UPDATES.md)
└── CLAUDE.md                    <-- Este arquivo de referência
```

### Vault Canônico
- **Caminho Local:** `C:\Users\ondig\Code\Nipei\nipei-vault`
- **Sync (desde 2026-10-18):** local e VPS (`/opt/nipei-vault`, montado no container como `/vault`) sincronizam via GitHub `Digital-alignment/nipei-vault` (privado).
  - VPS: cron a cada 5 min → `/opt/nipei-vault-sync/sync.sh` (commit das edições da app + pull --rebase + push, deploy key `/root/.ssh/nipei_vault_deploy`, host alias `github-nipei-vault`). Snapshot diário 03:30 → `/opt/backups/nipei-vault/` (14 dias). Log: `/var/log/nipei-vault-sync.log`.
  - Local: tarefa agendada do Windows "Nipei Vault Sync" a cada 10 min → `scripts/vault-sync.ps1`. Log: `%LOCALAPPDATA%\nipei-vault-sync.log`.
  - Conflito: nada é sobrescrito; o rebase é abortado, o commit fica local e o log registra `CONFLICT` até resolução manual. Nunca use `git reset --hard`/`push --force` no vault sem olhar o que será descartado.
- **Tarefas Operacionais:** `Productivity/Tarefas/` e `Productivity/Todo_Audit_Lists/` (308 tarefas ativas)
- **Workspaces de Tarefas:** `Task_Workspace/YYYY/SQ-XX/TASK_ID/`
  - `inputs/`: Anexos, dados e insumos
  - `deliverables/`: Relatórios gerados em Markdown, DOCX, Slides
  - `_workspace_meta.json`: Metadados canônicos e histórico de despachos/comunicações

---

## 3. Estado Atual das Fases Implementadas (Fases 1 a 5)

1. **Fase 1: Kanban Multidisciplinar & Modal 2 Colunas**
   - Suporte aos 7 Squads principais + biofarmácia + conhecimento.
   - Filtros dinâmicos, métricas em tempo real e drag-and-drop.
2. **Fase 2: Gestão de Insumos & Anexos (`TaskAttachmentsManager.tsx`)**
   - Rota `/api/agent-kanban/attachments` com upload, extração de texto e persistência em `Task_Workspace/`.
3. **Fase 3: Orquestrador de Entregáveis Executivos (`TaskDeliverablesHub.tsx`)**
   - Rota `/api/agent-kanban/deliverables` desacoplada com `executeGenerateDeliverable`.
   - Formatos suportados: `executive_report`, `technical_brief`, `operational_checklist`, `slide_deck`, `csv_data`.
   - Grounding com RAG do Vault (`queryVaultGrounding`).
4. **Fase 4: Despacho Omnicanal (`TaskDispatchHub.tsx`)**
   - Rota `/api/agent-kanban/dispatch` com `executeDispatchCommunication`.
   - Canais: WhatsApp (Evolution API `https://evolution.digital-alignment.com`), E-mail Executivo (Gmail CLI), Webhooks n8n.
   - Modo de simulação/auditoria transparente.
5. **Fase 5: Integração Venu ↔ Kanban Multidirecional**
   - **5.1 Grounding Contínuo (`kanbanGrounding.ts`):** Venu lê todas as 308 tarefas e seus squads em tempo real.
   - **5.2 Tool Calling de Mutações (`/api/venu/kanban-action`):** Venu cria tarefas (`create`), move colunas/prioridades (`update`) e atribui agentes/humanos (`assign`) via voz ou texto.
   - **5.3 Entregáveis & Despacho por Voz/Texto:** Venu gera documentos (`deliverable`) e despacha mensagens (`dispatch`) diretamente pelo HUD.
6. **Fase 6: Execução Real de Agentes CLI (armazenamento único de tarefas)**
   - **Um só Kanban, um só armazenamento:** as notas de tarefa do vault (`Productivity/Tarefas/*.md`). Não crie outro store de tarefas (o antigo `~/.nipei-os/agent-tasks.json` / `/api/agent-tasks` foi removido; `/agents-todo` não existe).
   - Atribuição de agentes: linha `agents: ["claude", "hermes"]` no frontmatter da nota (UI, `PATCH /api/agent-kanban`, Venu `assign`).
   - Rota `/api/agent-kanban/execute` roda o primeiro agente CLI atribuído (claude/openclaw/hermes/custom): status `IA em Execução` → `Revisão` ou `Bloqueado`; logs em `executionLogs` do `_workspace_meta.json`.
   - O `kanban.db` do Hermes (`lib/kanbanDb.ts`) é só leitura — fila interna do Hermes, não um quadro editável.

---

## 3.1 Notas de tarefa: escritor único (T0, 2026-10-19)

- **Toda** escrita em `Productivity/Tarefas/*.md` passa por `src/lib/tarefaNote.ts` (`createTarefaNote` / `writeTarefa`). Não escreva notas de tarefa com `fs.writeFileSync` direto: v2, kanban v1, `/api/venu/kanban-action`, execute, Hermes 2.0 e workspace já usam o módulo.
- Formato: frontmatter (fonte única dos dados) + `# título`, `## Descrição`, `## Checklist`, `## Atividade` (mais recente primeiro: `- AAAA-MM-DD HH:MM · quem · o que mudou`), `## Origem`. Seções que alguém criar no Obsidian são preservadas.
- Cada escrita registra a atividade e chama `requestSync`, que toca `/vault/.sync-request` (gitignored); no VPS a unidade systemd `nipei-vault-sync.path` sincroniza com o GitHub em ~5 s (`scripts/vault-sync-on-write/`). O cron de 5 min continua como reserva. Local: tarefa agendada a cada 2 min.
- Migração das notas antigas: `node scripts/migrar-tarefas.ts <vaultRoot> [--dry]` (a partir de `nipei-control/`, idempotente, verifica que nenhum dado muda).

## 3.2 IA nas tarefas (T2/T3)

- **T2** `src/lib/v2/ia.ts`: proposta via OpenRouter (`NIPEI_IA_MODEL`, padrão `anthropic/claude-haiku-5.5`); só Equipe 1; nada é gravado sem "Aplicar" (`aplicarSugestao`).
- **T3** "Fazer por mim": `src/lib/v2/trabalhos.ts` enfileira em `<vault>/.jobs/` (gitignored); o worker do host (`scripts/hermes-worker/`, units systemd `nipei-hermes-worker.{path,service,timer}`, log `/var/log/nipei-hermes-worker.log`) roda o Hermes do contêiner `hermes-agent-upmh` **só com `-t web`** e devolve em `POST /api/tarefas/entregavel` (token). Nunca libere terminal/arquivos para o Hermes nesse fluxo: o texto vem dos usuários. Busca web: `ddgs` (DuckDuckGo) instalado em `/opt/data/lazy-packages` do contêiner (`web.search_backend: ddgs`); o worker passa `PYTHONPATH=/opt/data/lazy-packages` porque a busca roda num processo filho. Só busca (sem extração de páginas).

## 3.3 Avisos por WhatsApp

- O escritor único (`lib/tarefaNote.ts`) enfileira em `<vault>/.jobs/avisos/` quando entram responsáveis novos ou um comentário tem `@nome`; repetições automáticas não avisam.
- Envio no host: `scripts/avisos/avisos.py` → `/opt/nipei-avisos/`; units `nipei-avisos-fila.{path,service}` (fila, na hora) e `nipei-avisos-diario.{timer,service}` (07:00 America/Bahia, tarefas de hoje e atrasadas). Log `/var/log/nipei-avisos.log`.
- Quem recebe: membro de equipe com `avisos: true` (Equipes/), com `whatsapp` na ficha e sem `avisos_whatsapp: false`; a partir de `FIM_TRANSICAO` (2026-11-03) também `whatsapp_verificado: true`. Testar sem enviar: `python3 avisos.py fila --teste` / `python3 avisos.py diario --teste <pessoa_id>`.

## 3.4 Meu perfil (v2.11)

- `/pessoas/[id]/editar` (a pessoa ou gestão) e o link público `/cadastro?token=` usam o mesmo `components/v2/PerfilForm.tsx` (2 passos: preencher → "Confira seus dados" + consentimento LGPD). Ações em `app/perfil-actions.ts`, lógica em `lib/v2/perfil.ts`, números em `lib/v2/whatsapp.ts` (`normalizarFone`, `enviarWhatsApp`).
- WhatsApp verificado por código de 6 dígitos (token assinado só com o hash; 10 min, 5 tentativas, 1/min e 8/dia por pessoa). Grava `whatsapp_verificado(_em)`, `dados_confirmados_em`, `lgpd_consentimento_em`. Hoje mostra aviso se faltar confirmar (ou >1 ano) ou verificar.
- Privados (nascimento, nacionalidade, e-mail, contato de emergência): só a pessoa e gestão veem. Foto em `Miembros/_fotos/<id>.<ext>` (rota `/pessoas/[id]/foto`, exige login).
- Testar sem enviar WhatsApp real: `.env.development.local` com `EVOLUTION_API_URL` apontando para um mock local.

## 3.5 Conhecimento (K1, v2.12)

- `/conhecimento`: qualquer membro envia arquivo (PDF, foto, txt/md/csv até 10 MB), link ou texto colado. `lib/v2/conhecimento.ts` grava `Conhecimento/Fontes/<id>.md` (+ original em `Fontes/arquivos/`) e, em segundo plano, a IA (`chamarIA` em `lib/v2/ia.ts`) gera resumo e até 40 fatos em `Conhecimento/Fatos/<id>.md`.
- Fatos têm `status`: proposto → confirmado | descartado (| substituido, K2). Nunca apague fatos corrigidos: o auditor (K2) usa o histórico para detectar conteúdo já corrigido. Revisa: gestão, ou a coordenação da `equipe` do fato (`podeRevisar`).
- Links: só http(s) públicos (redirects checados um a um, IPs internos bloqueados).
- **K2 auditor (v2.13)** `lib/v2/auditor.ts`: depois de cada fonte, os fatos novos são comparados (candidatos por palavras + equipe/projeto/pessoa, sem IA; depois a IA julga) com os confirmados e os já corrigidos → `Conhecimento/Alertas/<id>.md` (`contradicao`, `ja_corrigido`, `duplicado`, `desatualizado` = prazo confirmado vencido). Bandeja `/conhecimento/alertas`: substituir / eliminar / editar / manter (`resolverAlerta`). Auditoria semanal preguiçosa (`Conhecimento/.auditoria`, disparada ao abrir /conhecimento) + "Auditar agora" (gestão). Descarte por duplicado grava `descartado_motivo: duplicado` e não conta como correção.
- **K3 busca única (v2.14)** `buscarConhecimento()` em `lib/v2/conhecimento.ts`: só fatos `confirmado`, por palavras + equipe/projeto/objetivo/pessoa. Usada pela IA de tarefas e pelo Hermes "Fazer por mim" (`contexto()` em `ia.ts`, seção "Base de conhecimento confirmada", que prevalece sobre notas antigas), por todo chamador de `queryVaultGrounding` (`lib/hermesRAG.ts`: webhook do Hermes, memory/ask, consult, deliverables) e pelo Venu (`lib/hermesApollo.ts`). `Conhecimento/` fica fora de `listNotes` (`SKIP_DIRS`) para nenhum fato não confirmado vazar.
- **K4 propostas (v2.15)** `lib/v2/propostas.ts`: ao confirmar fatos (revisão ou alerta substituir/editar), a IA propõe `mudar_prazo`, `nova_tarefa`, `comentar_tarefa` ou `nota_projeto` em `Conhecimento/Propostas/`. Nada se aplica sozinho: na bandeja `/conhecimento/alertas` quem pode editar a tarefa (ou gestão, para projetos) ajusta e aplica pelos escritores normais (`updateTarefa`, `createTarefa`, `comentar`, `anotarProjeto` → "## Atualizações" do projeto).


## 3.6 Diagnósticos (D0/D1, v2.16)

- Modelo de questionário no vault: `Diagnosticos/_modelos/<id>.md` (YAML com `secoes[]`: `escopo` individual|coletivo, `destino` perfil|evento|diagnostico, `perguntas[]` com `texto`, `texto_en`, `guia`). O primeiro é `team-development` (documento da Lynn, 60 perguntas).
- Aplicação a um projeto: `Diagnosticos/<id>/diagnostico.md` (`modelo`, `projeto`, `equipes`). Para Inirau ou outro projeto, basta criar outro com o mesmo modelo.
- `lib/v2/diagnostico.ts`: parte individual respondida em `/pessoas/[id]/respostas` (só a própria pessoa edita; a pessoa e a gestão veem) → `Diagnosticos/<id>/individuais/<pessoa>.md` (YAML + markdown legível). Guia por pergunta, aviso abaixo de 40 palavras, rascunho da IA (`rascunhoIA`, só seções `papel` e `retiro`, nunca sobrescreve). Seções `destino: perfil` aparecem na ficha ("Meu papel e compromisso"); aviso em Hoje; progresso para a gestão em `/diagnosticos/[id]`.
- **D2 parte coletiva (v2.17)**: `Diagnosticos/<id>/coletivo.md` (responsável por seção, respostas com `fontes`, `falta`, `tarefa`). Gestão define o responsável em `/diagnosticos/[id]`; gestão e o responsável editam em `/diagnosticos/[id]/coletivo` (todos os participantes leem). `rascunhoColetivoIA` (base confirmada + notas + tarefas do projeto + lançamentos em finanças) nunca sobrescreve respostas escritas. `criarTarefasLacunas` cria uma tarefa por lacuna sem WhatsApp (`semAviso`) — o responsável vê a seção em Hoje. `enviarAoConhecimento` manda as respostas marcadas como fonte (fatos passam pela revisão normal).
- **D3 listas (v2.18)** em `coletivo.md`: `itens` (melhorias do espaço com prioridade, custo, requisitos, responsável → tarefas na Equipe 4/1 com `priority`), `calendario` (contagem regressiva padrão a partir da data do retiro → tarefas com prazo na Agenda + check-in semanal recorrente), `periodo` (resumo dos lançamentos de Finanças do período; a IA de finanças usa o mesmo filtro) e `reunioes` (#1 e #2: evento na Agenda + pauta da IA com os temas da Lynn). Todas as tarefas em lote são criadas com `semAviso`.
- **D4 consolidação (v2.19)**: `gerarConsolidado` (retiro e matriz de responsabilidades, IA a partir das respostas individuais; tensões anônimas), código de acordos (`rascunhoCodigo` → editar → `publicarCodigo` cria versão; cada participante aceita em `/diagnosticos/[id]/codigo`, estado na ficha e aviso em Hoje até aceitar) e documento final (`montarDocumento` compila tudo em `Diagnosticos/<id>/documento-pt.md`, sem as respostas privadas; `traduzirDocumento` → `documento-en.md`; página imprimível `/diagnosticos/[id]/documento`). Textos longos da IA usam `chamarIATexto` (markdown puro, não JSON). Ações lentas usam `tentar()`: se falharem, voltam à mesma página com `?erro=` (mostrado por `ErroAviso` no layout) em vez de cair em Hoje.
- **D5 (v2.20)**: `/diagnosticos` (gestão) lista os diagnósticos e cria um novo a partir de qualquer modelo para qualquer projeto (`criarDiagnostico`; abrir/encerrar com `encerrarDiagnostico`). `/projetos/[id]/visao` (`lib/v2/visao.ts`): números ao vivo (pessoas, tarefas abertas/atrasadas/sem dono, fatos confirmados, finanças, melhorias, código), objetivos, melhorias, próximas ações de marketing, eventos, links do diagnóstico e uma síntese da IA guardada em `Projetos/_visao/<projeto>.md` (gestão gera/atualiza; imprimível).


## 3.7 Hoje (v2.22–2.24)

- Compacta: "Bom dia" da IA (`lib/v2/hoje.ts` `gerarBomDia`, 1 vez por dia por pessoa, cache em `<vault>/.jobs/bomdia/`, fora do git), agenda do dia (eventos têm `hora` opcional), pendências como pílulas, abas Agora/Próximas/Sem data/Novidades (`components/v2/Abas.tsx`, lembra a última), mudar prazo atrás do ícone (`PrazoRapido`).
- `/pulso` (gestão): abertas/atrasadas/sem responsável por equipe; atribuir e mudar prazo na própria lista.
- **Assistente global (v2.38, só Equipe 1/gestão)**: `lib/v2/assistente.ts` + `components/v2/AssistenteGlobal.tsx`, em todas as páginas: botão no canto inferior direito (desktop), item central da barra do celular, campo de Hoje (`CampoAssistente`) ou o evento `nipei:assistente`. Painel flutuante no desktop, folha inferior no celular. Sabe quem fala (nome, função, equipes, coordenação) e a página atual (`contextoPagina`: tarefa, projeto, equipe, pessoa, evento…), com sugestões por página.
  - Leitura: minhas tarefas, buscar tarefas (sem responsável, atrasadas, projeto), ver tarefa, agenda, conhecimento (confirmado + notas antigas), fatos pendentes, pessoas com carga, projetos, equipe, objetivos, pulso, missão da semana, resumo de finanças.
  - Propostas (cartões, até 8 por vez, "Confirmar todas"): criar tarefa (com projeto/prioridade/descrição), status, prazo, prioridade, comentar, atribuir, criar evento, nota de projeto, revisar fato, enviar WhatsApp (passa pelos limites do Notificar).
  - Conversa salva por pessoa em `<vault>/.jobs/assistente/<pessoa>.json` (fora do git, últimas 40). Os cartões são decididos por índice e o servidor executa a proposta GUARDADA (o navegador nunca manda a ação). Não dê ao assistente escrita direta.
- Ordem inteligente (`lib/v2/ordem.ts`, com autoteste `node --experimental-strip-types src/lib/v2/ordem.ts`): pontua prioridade, atraso (até 30 dias), hoje, em andamento, novidade de outra pessoa (3 dias), checklist ≥70% e rebaixa tarefas paradas (atrasadas >60 dias sem mexer há 30) e recorrentes; os motivos aparecem como selos na linha. Próximas: por data; Sem data: pontuação e depois a mais recente. Mini semana (7 dias, `?dia=` filtra). Linhas: cor da equipe na borda esquerda, "+N" para outros responsáveis nas minhas tarefas, "!"/"!!" para alta/urgente.
- Agenda (v2.26): vistas Semana (padrão, segunda→domingo, ‹ ›), Lista por dia (30 dias; depois meses recolhidos) e Mês (semana começa na segunda); filtro Minhas (padrão) / Minha equipe / Todas (+ equipe); bloco de atrasadas no topo; "Eventos sem dia definido" para eventos só com mês/ano; eventos com hora e cor da equipe; linhas com ordem inteligente e ícone de prazo.
- Agenda (v2.27): grade do mês com número de tarefas por dia, dia cheio (≥5, `SOBRECARGA`) em âmbar e barras contínuas para eventos de vários dias; "+ tarefa / + evento" em cada dia (`/tarefas/nova?prazo=`, `/eventos/novo?inicio=`); arrastar tarefa para outro dia (`components/v2/ArrastarAgenda.tsx`: ouvintes no documento, linhas com `data-tarefa`, dias com `data-dia`; só mouse); Google Calendar em um toque (`render?cid=webcal://…`) + copiar; vista/quem lembrados no aparelho (`LembrarVista`).
- Offline: `public/sw.js` (páginas network-first com cópia, estáticos cache-first, /login apaga a cópia) registrado por `components/v2/Offline.tsx` só em produção; status e prazo sem sinal entram na fila do aparelho (`lib/v2/filaOffline.ts`) e são reenviados pelas server actions ao voltar a conexão.

## 3.8 Pessoas (v2.28)

- Lista em cartões (função, equipes, abertas/atrasadas; gestão ordena por carga, atrasadas ou Participação). Ficha em abas: Resumo, Tarefas (ordem inteligente + "Atribuir tarefa" → `/tarefas/nova?responsavel=`), Perfil (contato, privado, papel do diagnóstico) e 🔒 Gestão (links, avisos, equipes).
- Registro novo: `concluido_em` na tarefa quando vira concluída (escritor único, `lib/tarefaNote.ts`; reabrir limpa) e último uso por pessoa em `<vault>/.jobs/acessos.json` (`registrarAcesso` no layout v2, 1 vez por dia).
- **Participação** (só gestão; `lib/v2/participacao.ts`, autoteste `node --experimental-strip-types src/lib/v2/participacao.ts`): média de Entrega (90 dias), Em dia (atrasadas), Ritmo (concluídas em 30 dias) e Uso (último uso, ações nos logs, perfil, WhatsApp, diagnóstico). Ritmo e tendência ficam vazios até 30/60 dias após `INICIO_REGISTRO` (2026-10-20); com menos de 2 partes mostra "dados insuficientes". Mede entrega e uso, não qualidade.
- Estudo da IA (gestão; `gerarEstudo` em `lib/v2/pessoasInfo.ts`): pontos fortes, carga, riscos, como apoiar e até 5 tarefas sem responsável que combinam (botão "Atribuir a"), guardado em `<vault>/.jobs/estudos/` (fora do git).
- **Notificar (v2.29)** (gestão ou coordenação da pessoa, `can.gerirPessoa`): sino na ficha abre o painel (`components/v2/Notificar.tsx`): mensagem livre, resumo de tarefas, alerta, link de cadastro, link de acesso. Livre/alerta: rascunho da IA a partir do pedido, no idioma da pessoa; sempre editável, prévia com assinatura `— Nome · Nipëi`, confirmação antes de enviar pelo Evolution. Na aba Gestão os links também saem pelo número do Nipëi (wa.me continua como alternativa) e aparece o histórico. Lógica em `lib/v2/notificar.ts`; registro em `<vault>/.jobs/mensagens/<pessoa>.jsonl` (fora do git). Limites: 3/hora por pessoa, 30/dia por remetente, 1500 caracteres. Respostas não são tratadas. Testar só com `EVOLUTION_API_URL` apontando para um mock local.

## 3.9 Equipes (v2.30)

- Lista: cartões com barra da cor, avatares, coordenação, números (abertas, atrasadas, sem responsável, feitas 30d), barra "% em dia"; "Minhas equipes" primeiro; gestão vê cadeado (sem acesso) e sino (avisos).
- Equipe (`/equipes/[id]`): números no topo (sem responsável leva ao filtro) e abas (`Abas` aceita `inicial`, que vence a memória): Tarefas (filtros Todas/Minhas/Sem responsável/pessoa `?pessoa=` e área `?area=`; Agora/Próximas/Sem data com ordem inteligente; quem gere a equipe atribui as sem responsável na linha; concluídas 30d), Pessoas (carga por pessoa nesta equipe, expande as tarefas dela; quem tem tarefa da equipe sem ser membro aparece "fora da equipe"), Objetivos e 🔒 Configuração (acesso, avisos).
- **Ações em lote (v2.31)**: quem gere a equipe marca tarefas (checkbox com `form="lote-equipe"`, as linhas mantêm seus próprios forms) e a barra fixa `components/v2/LoteBarra.tsx` aplica atribuir / prazo / prioridade / concluir / mover de equipe (`loteAction`, permissão checada por tarefa, escreve por `mudarTarefa` em `lib/v2/data.ts`).
- **Equilibrar carga** (aba Pessoas, quem gere a equipe): `lib/v2/carga.ts` (sem IA, autoteste `node --experimental-strip-types src/lib/v2/carga.ts`) marca sobrecarga/folga e sugere mover tarefas (só de quem está sozinho na tarefa, não iniciadas, nunca urgentes; atrasadas primeiro; mesma área quando dá) e dar dono às sem responsável. Cada sugestão é um botão (`reatribuirAction`).
- **Reunião da equipe** `/equipes/[id]/reuniao` (`lib/v2/reuniaoEquipe.ts`): pauta ao vivo desde a última ata (pendentes da última, feitas, atrasadas, próximos 7 dias, sem responsável), copiar para WhatsApp, marcar na Agenda (evento "Reunião <equipe>") e ata em `Reunioes/<equipe>/<data>.md`; cada linha de encaminhamento vira tarefa da equipe (`@Nome` = responsável, `até 25/10` = prazo).
- Avisos: `avisos.py fila` espera 5 s e junta as atribuições por pessoa e autor numa só mensagem (lote, reunião).

## 3.10 Projetos e navegação (v2.32)

- Menu (v2.33): 4 seções (Hoje, Agenda, Equipes, Projetos). Pessoas é subitem de Equipes (botão no topo de `/equipes` e "Pessoas" em cada equipe → `/pessoas?equipe=`, que volta para a equipe; a aba da equipe se chama Membros). Objetivos saiu do menu: continua em `/objetivos` (nenhum link mudou), aparece como subitem recuado de Projetos no menu lateral (`SUB` em `components/v2/Nav.tsx`) e como botão no topo de `/projetos`; em `/objetivos` a seção Projetos fica ativa.
- `/projetos`: cartões com equipes, abertas/atrasadas, objetivos, % concluído e última atualização.
- `/projetos/[id]`: números (abertas, atrasadas, sem responsável → filtro, % concluído), botões (Nova tarefa, Visão holística, Objetivos, Diagnóstico p/ gestão) e abas: Tarefas (filtros sem responsável/pessoa/equipe, ordem inteligente, ações em lote), Objetivos (progresso, + tarefa), Pessoas (quem tem tarefa aberta no projeto → filtra) e Atualizações (linha do tempo; gestão/coordenação publica com `anotarProjetoAction`).
- Seleção em lote escondida por padrão: chip "Selecionar" (`LoteToggle`) liga `html[data-lote]` e mostra as caixas `.lote-caixa` (CSS em `globals.css`). Linhas de chips/abas rolam sem barra visível (`.v2 .overflow-x-auto`).
- Se uma mudança em `globals.css` não aparecer no `npm run dev`, apague `.next` (cache persistente do Turbopack).
- **Menu lateral (v2.34, desktop)**: painel flutuante recolhível (`components/v2/Nav.tsx`). Aberto: ícone + nome, subitens numa linha em árvore. Fechado: só ícones; passar o mouse mostra o nome, ou um menu flutuante com os subitens. A escolha fica no cookie `nipei_menu` (lido no layout, sem salto ao carregar). A barra do celular não mudou.
- Conteúdo: coluna central `max-w-6xl mx-auto` no layout; páginas estreitas (formulários, leitura) usam `max-w-* mx-auto`; listas de cartões ganham 3 colunas em `xl`.
- **Barra do celular (v2.35)**: 64 px + área segura do iPhone, pílula no item ativo (mesmo estilo do menu lateral), `touch-manipulation`, sem realce azul do toque. O item tocado acende na hora (estado otimista em `Nav.tsx`) e `app/(v2)/loading.tsx` mostra um esqueleto enquanto o servidor monta a página (sem ele, as páginas `force-dynamic` ficavam congeladas até chegar tudo). Botão "+" de Hoje, barra de lote e o padding do `main` usam `calc(... + env(safe-area-inset-bottom))`.
- **Cabeçalho (v2.36)**: à esquerda o ícone do app (`/icons/icon-192.png`, 36 px); à direita Conhecimento, Acervo, Finanças (gestão), Meu perfil (avatar) e Sair por último; botões de 36 px, altura 56 px. O seletor de idioma saiu do cabeçalho: está na aba Perfil da própria ficha ("Idioma da plataforma", `toggleLangAction`); só quem não tem ficha o vê no cabeçalho.
- **Missão da semana (v2.37)**: painel recolhível em Hoje para membros da equipe da missão e gestão. A missão atual é a constante `MISSAO` em `lib/v2/missao.ts` (equipe, datas, valores de partida; autoteste `node --experimental-strip-types src/lib/v2/missao.ts`); as 8 metas são calculadas ao vivo em `lib/v2/missaoDados.ts` (perfis, fatos propostos, fontes novas sem a migração, tarefas sem responsável/equipe, atrasadas, carga ≤ 20, objetivos com dono, diagnóstico). Some 3 dias depois do fim. Para a próxima missão, troque a constante.
- **Primeiros passos**: checklist pessoal em Hoje (dados, WhatsApp, foto, diagnóstico, revisar um fato, enviar uma fonte), marcado sozinho pelo que a pessoa fez; some quando tudo estiver feito e, enquanto aparece, esconde as pílulas de perfil e diagnóstico.
- **Gestão ao vivo (v2.37.1)**: ser gestão = estar *agora* numa equipe com `gestao: true` (Equipe 1), verificado a cada requisição em `currentUser()` e no `proxy.ts` (`gestaoAgora`). Quem sai da Equipe 1 perde na hora Finanças, Pulso, Participação, v1 e /api, mesmo com sessão completa ainda válida, e fica com as páginas da equipe que tem acesso (se nenhuma tiver acesso, volta ao login). Só um login sem ficha (só em NIPEI_OS_USERS) mantém gestão pela sessão.
- O CSS antigo (v1) força `nav`/`main` com `position: relative; z-index: 2` sem camada; por isso há overrides `.v2 nav.fixed` / `.v2 nav.sticky` em `globals.css`.
---

## 4. Comandos Essenciais

### Desenvolvimento Local
```bash
# Executar servidor local de desenvolvimento (dentro de agent-os-nipei/source)
cd c:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source
npm run dev
# Inicia em http://127.0.0.1:3000 (ou 3333 se especificado -p 3333)
```

### Checagem de Tipos e Build
```bash
cd c:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source

# Checagem TypeScript
npx tsc --noEmit

# Build de Produção Next.js (Turbopack)
npm run build
```

### Git & Deploy em Produção (VPS)
```bash
# No diretório raiz do repositório:
cd c:\Users\ondig\Code\Nipei\nipei-control

# 1. Commit e push para o repositório
git add .
git commit -m "feat(scope): mensagem descritiva"
git push origin main

# 2. Deploy remoto no VPS via SSH (chave dedicada nipei_vps)
ssh -i C:\Users\ondig\.ssh\nipei_vps -o BatchMode=yes root@85.31.61.100 "cd /opt/nipei-control && git pull origin main && docker compose build app && docker compose up -d app"

# 3. Verificação de status do container
ssh -i C:\Users\ondig\.ssh\nipei_vps -o BatchMode=yes root@85.31.61.100 "docker ps --filter name=nipei-os --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

---

## 5. Regras Críticas de Isolamento & Segurança

1. **Aislamiento de Chaves SSH:**
   - Este repositório usa **exclusivamente** a chave `C:\Users\ondig\.ssh\nipei_vps`.
   - NUNCA use chaves de clientes externos (`soltaoverbo_vps`, `muv_vps`) aqui, e NUNCA use `nipei_vps` em outros repositórios.
2. **Separação de Código e Vault:**
   - O código-fonte vive estritamente em `C:\Users\ondig\Code\Nipei\nipei-control`.
   - O código **nunca** deve ser clonado ou movido para `Desktop\DA\` (pasta sincronizada pelo Google Drive).
3. **Registro no Vault Comercial (Dualidade Canônica Nipëi OS vs Nipeihu):**
   - **`Productos\Nipei OS.md`** é a **nota viva do PRODUTO DE SOFTWARE** (`tipo: producto_propio`, `rubro: producto_saas`). Mapeia este repositório (`repo_local: C:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source`), o stack tecnológico e o roadmap da plataforma.
   - **`Clientes\Nipeihu.md`** é a **nota viva da EMPRESA CLIENTE / COMUNIDADE** (`tipo: cliente_externo`). Mapeia o Santuário Yawanawá em Serra Grande, dietas Samakey, portal e parcerias institucionais, tendo o Nipëi OS como um dos projetos centrais de seu ecossistema.
   - Ambas as notas devem ser mantidas sincronizadas em grandes marcos de engenharia (como Fases 1 a 5 do Kanban/Venu), sempre validando com `npm run vault:check` a partir de `Code\DA\command-center`.
4. **Idioma da UI:**
   - Português (pt-BR) para textos de interface, logs executivos e títulos do Kanban.
