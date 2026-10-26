# Nipëi OS — nipei-control (Mission Control Hub)

> Guia e especificações canônicas para agentes autônomos de código (Claude Code, Antigravity, Hermes).

---

## 0. Próxima sessão — onde paramos (2026-10-24, v2.50.0; decisão da fase 7 em 31/10)

**Em produção e verificado com a conta real do Ashuan:** plano "Nipëi pessoal e conectado", fases 1–6 (detalhes em 3.8): aba Conexões, Google (Drive com cópia diária, Calendar, Gmail), MCP (`/mcp`, Claude e Gemini do Ashuan conectados), WhatsApp "Encaminhar para o Nipëi" e chave de IA própria. Código, GitHub e VPS no mesmo commit; vault sincronizado.

**Começar por aqui:**
1. **Fase 7 (NotebookLM) — decisão em 31/10/2026** (tarefa "Decidir: NotebookLM…" do Ashuan no Nipëi). Decidido em 24/10: NÃO fazer o "Estúdio" no Nipëi; o Gemini (assinatura AI Pro) já tem Notebooks sincronizados com o NotebookLM e lê o Nipëi pelo MCP — fluxo manual: pedir ao Gemini o conteúdo do projeto → "Adicionar ao notebook" → áudio/slides no NotebookLM. NotebookLM não tem API para contas pessoais; não usar `notebooklm-py`. Se o Ashuan pedir, as opções são: (a) ferramenta MCP `dossie_projeto` (visão, objetivos, tarefas abertas, fatos confirmados, atas e, só gestão, finanças, numa chamada; base em `coletarVisao` de `lib/v2/visao.ts`); (b) dossiê vivo: um Google Doc por projeto na pasta Nipëi regenerado junto com o backup diário (fonte do Drive que o NotebookLM sincroniza).
2. **Pendências do Ashuan / Equipe 1** (não são código): a chave Gemini do Ashuan está salva mas **pausada** (Conexões → "Usar minha chave"); reconectar o Nipëi no Claude para ele ver as ferramentas de Gmail; Jordão, Paulo Roberto e Rodrigo ainda não conectaram Google nem IA.
3. **Ainda não testado com conta real** (só local): enviar e-mail pelo assistente; exportar Docs/Slides/Sheets.
4. Opcional: verificação do app OAuth no Google (`nipei-512411`) para tirar o aviso "não verificado"; Gmail é escopo restrito (avaliação de segurança paga).

**Cuidados que já morderam:** o assistente tende a "corrigir" respostas antigas (regras e marcadores em `paraModelo`); dizia "propus" sem chamar a ferramenta (trava em `conversar`); backups simultâneos duplicavam arquivos no Drive (trava por pessoa em `backup.ts`); APIs do Google precisam estar ativas no projeto (a do Gmail faltou). Testes locais: vault copiado para o scratchpad + `.env.development.local` (VAULT_PATH, mocks do Evolution e do Google); apagar o `.env.development.local` antes do deploy.

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
- **Página `/conhecimento` (v2.57)**: no topo, atalhos com números (fatos para revisar, fontes, fatos confirmados; `AtalhosSecao`) que abrem e rolam até a seção, e a barra "Base revisada" (revisados/total). Abaixo, seções recolhíveis (`components/v2/Recolhivel.tsx`: `<details>` nativo, lembra aberta/fechada por aparelho em `localStorage nipei:secao:<id>`, abre sozinha com `#id` na URL ou por um atalho). Cada seção é um componente em `app/(v2)/conhecimento/secoes/` registrado em `SECOES` (`secoes/index.ts`), que recebe os dados uma vez em `ctx` (`fontes`, `fatos`, `porFonte`, `paraMim`, `confirmados`…). Hoje: Enviar (aberta), Para revisar (só quem pode revisar; mais pendentes primeiro), Fontes (fechada; 15 + "ver todas"), Base confirmada (fechada; busca `?q` e filtro `?equipe` a abrem sozinha; 60 itens + aviso). Cada fonte mostra a barra revisados/total. **Para crescer** (mapa visual/3D das conexões, editar fatos, linha do tempo…): criar o componente em `secoes/` e uma linha em `SECOES`; `atalho` põe um cartão no topo.
- **Acervo `/acervo` (v2.58)**: índice de links do Google Drive (os arquivos ficam no Drive) em `<vault>/Acervo/*.md` (`getAcervo`/`createAcervo`/`updateAcervo`/`arquivarAcervo` em `lib/v2/data.ts`). Página: botão "+ Adicionar" abre o formulário (seção `Recolhivel` id `novo`); busca (palavras, sem acento) + selects projeto/ano/ordem que se aplicam sozinhos (`FiltroAuto`) + chips de tipo com contagem; sem filtro a lista vem agrupada por tipo. Cartão: ícone/cor do tipo, tipo de link detectado pela URL (`lib/v2/acervoLinks.ts` `tipoLink`: pasta/arquivo do Drive, Doc/Planilha/Apresentação Google, YouTube…), quem adicionou e quando, copiar link, editar. Formulário (`components/v2/AcervoForm.tsx`): link primeiro, mostra o tipo detectado e sugere o tipo; ano padrão = ano atual. Link repetido (mesmo id do Drive, mesmo com outro `?usp=`) é recusado (`chaveLink`). Adicionar: gestão ou coordenação; editar/tirar: gestão ou quem adicionou (`podeEditarAcervo`). "Tirar do acervo" só marca `arquivado: true` (a nota fica no vault, o Drive não é tocado). O assistente/MCP tem a ferramenta `acervo` (busca por palavras/tipo e devolve os links).
- **Ponte Acervo ↔ Conhecimento (v2.59)**: Conhecimento = o que a comunidade sabe (fatos confirmados que a IA usa); Acervo = onde estão os arquivos (links do Drive). Os subtítulos das duas páginas dizem isso. No Acervo, "Ensinar à IA" (`ensinarAcervoAction`) cria uma fonte de link com `acervo: <id do item>` (uma por item; se já existe, abre a fonte; pastas do Drive não, a IA lê arquivos). `lerLink` (`lib/v2/conhecimento.ts`) troca links do Google pelo export legível (Docs → txt, Planilhas → csv, Apresentações → txt, arquivo do Drive → download direto) e lê imagens; arquivo privado (401/403/login) ou formato ilegível → erro claro na fonte ("não está público… ou envie o arquivo"). Vínculos: cartão do Acervo mostra "Na IA: N confirmados · M para revisar" (ou lendo/erro) → fonte; fonte mostra "Arquivo no acervo" → `/acervo#<id>` (cartão destacado); lista de fontes marca "do acervo"; base confirmada tem ícone de pasta → item do acervo.
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

- Compacta (o "Bom dia" da IA foi removido em 2026-10-24): agenda do dia (eventos têm `hora` opcional), pendências como pílulas, abas Agora/Próximas/Sem data/Novidades (`components/v2/Abas.tsx`, lembra a última), mudar prazo atrás do ícone (`PrazoRapido`).
- **Hoje no design system (branch `design-system-v1`)**: saudação `.saudacao` em dois tons (nome + data), pendências e eventos como `Chip`, Missão da semana = o único `Cartao` destaque (regra 5), Primeiros passos/Organizar equipes em `Cartao`, faixa da semana em pílulas (10.5), abas com grupos Atrasadas/Hoje (Agora) e Amanhã/Esta semana/Depois (Próximas) via `GrupoTarefas`, `CampoAssistente` = Campo busca do Pinu + chips do Pinu, "+" flutuante = `MenuAcoes gatilho="criar"` (tarefa, evento, Conhecimento, Acervo). Linhas de tarefa em todo lugar: `components/ds/padroes/LinhaTarefa.tsx` (o `TaskRow` de `ui.tsx` adapta a `Tarefa`; o círculo continua sendo o `StatusBotao`, que funciona sem sinal). `PrazoRapido` e `EscolherEquipes` também migrados.
- **Pinu (assistente) no design system (branch `design-system-v1`)**: `AssistenteGlobal` = tela cheia no celular, painel lateral (460 px) no computador, fundo com gradiente verde vindo do topo, selo "Pinu" (mini-anel; vira orbe nos estados ouvindo/pensando/falando). Início (conversa vazia): saudação em dois tons, bento com "Falar com o Pinu" em folha (abre o microfone) + 2 sugestões da página, Recentes (últimas 4 perguntas deste aparelho, `localStorage nipei:pinu:recentes`), campo grande. Conversa: pessoa em balão tonal à direita, Pinu em balão verde à esquerda; ações da resposta (gerar outra = reenvia a última pergunta, editar = põe a pergunta no campo, ⋯ ouvir/copiar); chips de continuação; pensando = orbe + frase + skeleton. Cartão de proposta (um por resposta, com todos os cartões dela): Confirmar (todas) / Ajustar (escreve "Ajuste em …:" no campo) / Cancelar (todas), ✕ por item; mesma lógica de `decidirCartaoAction`. Voz igual a antes. Não há "+"/imagem no campo: o assistente não recebe arquivos ainda. `NovaTarefaForm` tem o slot de `SugestaoPinu` com TODO (falta endpoint).
- **Agenda no design system (branch `design-system-v1`)**: `CabecalhoPagina` (contagens no subtítulo, "Novo evento" em folha), abas Dia / Semana / Mês (`?vista=dia|semana|mes`; `?vista=lista` = próximos 30 dias, link no fim da Semana), chips Minhas / Minha equipe / Todas + as 4 equipes (`?equipe=` implica "todas"). **Dia**: faixa da semana em pílulas (cada uma aceita tarefa arrastada), "Dia inteiro" (eventos sem hora + tarefas em pílula com ponto da equipe) e grade de horas (64 px/h, 7h–21h ou mais) com eventos em bloco tingido (`color-mix` da cor da equipe com s1, duração padrão 1 h; Google até `fim`), faixas lado a lado quando se sobrepõem e linha do agora âmbar (hora da Bahia). Semana/Lista: dia a dia com `.numero-display` (hoje em acento). Mês: pontos por equipe, hoje em acento, lista do dia ao lado a partir de 1024 px. "+" flutuante cria no dia na tela. `ArrastarAgenda`, `CopiarBotao` migrados. Faltam ícones `semana`, `mes` e `copiar` (TODO no código, anotados em ICONES.md).
- **Tarefas no design system (branch `design-system-v1`)**: `/tarefas` (novo; item "Tarefas" no menu) = `CabecalhoPagina` (contagens, busca `?q`, "Nova tarefa" em folha), abas Lista / Quadro / Agenda (`AbasLinks`/`SegmentadoLinks` em `components/v2/VistaLinks.tsx`: abas e segmentado que trocam de URL), filtros `?quem=minhas|equipe|todas` e `?equipe=`; Lista agrupada por prazo (`GrupoTarefas` + `TaskRow`) ou `?vista=grade` (cartões com recorte, o primeiro em destaque). **Quadro** (`?vista=quadro`, `components/v2/QuadroTarefas.tsx`): colunas A fazer / Fazendo / Feito (feitas dos últimos 30 dias), 30 cartões por coluna + "Mostrar mais", arrastar entre colunas ou ⋯ → "Mover para" (teclado/toque) chama `setStatusAction` (sem sinal entra na fila do aparelho); "+"/"Adicionar tarefa" abre `/tarefas/nova?status=` e `createTarefaAction` já cria no estado da coluna. Ficha da tarefa: abas pasta Detalhes / Comentários / Atividade; `IAPanel` virou o cartão de proposta do Pinu (Confirmar / Ajustar / Cancelar). `NovaTarefaForm` e `Upload` migrados. Faltam ícones de quadro e grade (provisórios `filtrar`/`imagem`, anotado em ICONES.md).
- `/pulso` (gestão): abertas/atrasadas/sem responsável por equipe; atribuir e mudar prazo na própria lista.
- **Assistente global (v2.38, só Equipe 1/gestão)**: `lib/v2/assistente.ts` + `components/v2/AssistenteGlobal.tsx`, em todas as páginas: botão no canto inferior direito (desktop), item central da barra do celular, campo de Hoje (`CampoAssistente`) ou o evento `nipei:assistente`. Painel flutuante no desktop, folha inferior no celular. Sabe quem fala (nome, função, equipes, coordenação) e a página atual (`contextoPagina`: tarefa, projeto, equipe, pessoa, evento…), com sugestões por página.
  - Leitura: minhas tarefas, buscar tarefas (sem responsável, atrasadas, projeto), ver tarefa, agenda, conhecimento (confirmado + notas antigas), fatos pendentes, pessoas com carga, projetos, equipe, objetivos, pulso, missão da semana, resumo de finanças.
  - Propostas (cartões, até 8 por vez, "Confirmar todas"): criar tarefa (com projeto/prioridade/descrição), status, prazo, prioridade, comentar, atribuir, criar evento, nota de projeto, revisar fato, enviar WhatsApp (passa pelos limites do Notificar).
  - Conversa salva por pessoa em `<vault>/.jobs/assistente/<pessoa>.json` (fora do git, últimas 40). Os cartões são decididos por índice e o servidor executa a proposta GUARDADA (o navegador nunca manda a ação). Não dê ao assistente escrita direta.
  - **Memória por pessoa (v2.39)**: `<vault>/.jobs/assistente/memoria/<pessoa>.json` (fora do git, máx. 30 itens, categorias preferencia/responsabilidade/rotina/contexto). Só entra o que a pessoa aprova num cartão (`lembrar` / `esquecer`); o assistente propõe sozinho quando nota algo estável (máx. 1 por resposta, uma ideia por item) e recusa dados sensíveis. Vai no prompt como "O que você sabe sobre…". A pessoa vê e apaga tudo no painel (ícone de cérebro), só ela vê.
  - **Voz (v2.40)**: botão de alto-falante no painel liga "Responder em voz" (lembrado no aparelho, `localStorage nipei:voz`); cada resposta tem "Ouvir". `POST /api/assistente/voz` (só gestão, 150/dia por pessoa em memória) chama o Gemini TTS (`NIPEI_VOZ_MODEL`, padrão `gemini-3.8-flash-lite-tts`; voz `NIPEI_VOZ`, padrão `Kore`; usa `GEMINI_API_KEY`) e devolve WAV. O texto lido é limpo de markdown e cortado em ~600 caracteres; se houver cartões, avisa quantos. Se o serviço falhar, usa a voz do próprio aparelho (`speechSynthesis`). Modo conversa: pergunta feita pelo microfone + voz ligada → depois de falar, volta a ouvir. No celular, o áudio é "desbloqueado" no primeiro toque (microfone, enviar ou botão de voz).
- Ordem inteligente (`lib/v2/ordem.ts`, com autoteste `node --experimental-strip-types src/lib/v2/ordem.ts`): pontua prioridade, atraso (até 30 dias), hoje, em andamento, novidade de outra pessoa (3 dias), checklist ≥70% e rebaixa tarefas paradas (atrasadas >60 dias sem mexer há 30) e recorrentes; os motivos aparecem como selos na linha. Próximas: por data; Sem data: pontuação e depois a mais recente. Mini semana (7 dias, `?dia=` filtra). Linhas: cor da equipe na borda esquerda, "+N" para outros responsáveis nas minhas tarefas, "!"/"!!" para alta/urgente.
- Agenda (v2.26): vistas Semana (padrão, segunda→domingo, ‹ ›), Lista por dia (30 dias; depois meses recolhidos) e Mês (semana começa na segunda); filtro Minhas (padrão) / Minha equipe / Todas (+ equipe); bloco de atrasadas no topo; "Eventos sem dia definido" para eventos só com mês/ano; eventos com hora e cor da equipe; linhas com ordem inteligente e ícone de prazo.
- Agenda (v2.27): grade do mês com número de tarefas por dia, dia cheio (≥5, `SOBRECARGA`) em âmbar e barras contínuas para eventos de vários dias; "+ tarefa / + evento" em cada dia (`/tarefas/nova?prazo=`, `/eventos/novo?inicio=`); arrastar tarefa para outro dia (`components/v2/ArrastarAgenda.tsx`: ouvintes no documento, linhas com `data-tarefa`, dias com `data-dia`; só mouse); Google Calendar em um toque (`render?cid=webcal://…`) + copiar; vista/quem lembrados no aparelho (`LembrarVista`).
- **Agenda (v2.46)**: cabeçalho com propósito e botões "+ tarefa"/"+ evento"; cartões de resumo clicáveis (Atrasadas, Hoje = tarefas + eventos, Próximos 7 dias, Eventos 30 dias, Sem prazo); controles segmentados (vista / de quem) com uma linha dizendo o que está sendo mostrado; atrasadas com "Mover as N para: Hoje/Amanhã/Próxima semana" (`loteAction`, só as que a pessoa pode editar); semana com faixa de 7 dias (carga, eventos, dia cheio; toque leva ao dia) e dias vazios numa linha; dias passados só mostram eventos (as tarefas estão em Atrasadas); bloco "Sem prazo" (até 8, com mudar prazo) e eventos sem dia recolhidos no fim. O assistente sabe o que a Agenda mostra (`contextoPagina`: vista, filtro e contagens de atrasadas/hoje/7 dias/sem prazo) e sugere "Como está minha semana?", "Reprograme minhas atrasadas", "Dê prazo às minhas tarefas sem data".
- Offline: `public/sw.js` (páginas network-first com cópia, estáticos cache-first, /login apaga a cópia) registrado por `components/v2/Offline.tsx` só em produção; status e prazo sem sinal entram na fila do aparelho (`lib/v2/filaOffline.ts`) e são reenviados pelas server actions ao voltar a conexão.

## 3.8 Pessoas (v2.28)

- Lista em cartões (função, equipes, abertas/atrasadas; gestão ordena por carga, atrasadas ou Participação). Ficha em abas: Resumo, Tarefas (ordem inteligente + "Atribuir tarefa" → `/tarefas/nova?responsavel=`), Perfil (contato, privado, papel do diagnóstico) e 🔒 Gestão (links, avisos, equipes).
- Registro novo: `concluido_em` na tarefa quando vira concluída (escritor único, `lib/tarefaNote.ts`; reabrir limpa) e último uso por pessoa em `<vault>/.jobs/acessos.json` (`registrarAcesso` no layout v2, 1 vez por dia).
- **Participação** (só gestão; `lib/v2/participacao.ts`, autoteste `node --experimental-strip-types src/lib/v2/participacao.ts`): média de Entrega (90 dias), Em dia (atrasadas), Ritmo (concluídas em 30 dias) e Uso (último uso, ações nos logs, perfil, WhatsApp, diagnóstico). Ritmo e tendência ficam vazios até 30/60 dias após `INICIO_REGISTRO` (2026-10-20); com menos de 2 partes mostra "dados insuficientes". Mede entrega e uso, não qualidade.
- Estudo da IA (gestão; `gerarEstudo` em `lib/v2/pessoasInfo.ts`): pontos fortes, carga, riscos, como apoiar e até 5 tarefas sem responsável que combinam (botão "Atribuir a"), guardado em `<vault>/.jobs/estudos/` (fora do git).
- **Fotos (v2.41)**: `salvarFoto` (async, `lib/v2/perfil.ts`) olha os bytes, não o tipo do navegador: HEIC/HEIF do iPhone é convertido com `heic-convert` (o `sharp` só lê AVIF), depois `sharp` gira, recorta 512 px e salva JPEG sem EXIF (some o GPS). Grava `foto_em`, usado como `?v=` nas fotos (cache).
- **Equipes da pessoa (v2.41, aba Gestão da ficha)**: lista as equipes com papel; gestão pode "Tornar coordenação"/"Tirar coordenação" (`setCoordenacao`, atualiza `coordena` da pessoa e `coordenadores` da equipe) e "Remover" com confirmação (`removeFromEquipe`). Proteções em `removerDaEquipeAction`: ninguém tira a si mesmo da gestão e a equipe de gestão nunca fica vazia. Ativar/Adicionar não tem equipe pré-escolhida e a equipe de gestão aparece como "(gestão completa)"; só a gestão pode pôr alguém nela.
- **Lista de pessoas (v2.41)**: cartão mostra função (ou "Função não definida"), perfil x/4 (WhatsApp, função, dados confirmados, foto), ícone de telefone (verde verificado, âmbar não verificado, cinza sem), Participação só para quem tem acesso (senão "sem acesso"). Gestão filtra por situação (`?situacao=` incompleto | sem_whats | nao_verificado | sem_acesso) e, com "Selecionar", envia o link de cadastro a várias pessoas de uma vez (`cadastroLoteAction`, máx. 30, limites do Notificar; quem não tem WhatsApp é pulado).
- **Acesso suspenso e contatos externos (v2.42)**: `acesso_suspenso: true` na ficha = a pessoa continua nas equipes e pode receber tarefas, mas não entra (currentUser → null, `gestaoAgora` → false, `/entrar` recusa) e não recebe avisos (`setSuspenso` também grava `avisos_whatsapp`; `avisos.py` pula suspensos). Gestão suspende/reativa na aba Gestão da ficha (nunca a si mesma); cadeado na ficha e "suspenso" no cartão. `tipo_contato: externo` = grupo ou pessoa de fora: sai da organização das equipes e das listas de responsáveis.
- **Responsáveis (v2.42)**: `responsaveisPara(equipe)` em `lib/v2/data.ts` lista todos menos externos — desta equipe, outras equipes, ainda sem equipe — sem olhar acesso à plataforma. Usado em Pulso, equipe (linha e lote), projeto (lote), nova/editar tarefa.
- **Organizar equipes (v2.42)**: `/pessoas/organizar` (gestão; `lib/v2/organizacao.ts`): progresso (pessoas numa equipe / todas menos externos), ainda sem equipe (escolher equipe ou marcar contato externo), cada equipe (membros, coordenação ou aviso, adicionar pessoa), membros sem função (salvar função) e contatos externos (desfazer). Cartão "Organizar equipes" em Hoje para a gestão enquanto houver pendências (3 pessoas sem equipe com adicionar direto). Botão no topo de `/pessoas`.
- **Fidelidade da memória de pessoas/equipes (v2.43)**:
  - Coordenação não exige ser membro ("coordenação geral", ex.: Jordão coordena as 4 equipes); a ficha mostra também essas equipes e `/pessoas/organizar` adiciona coordenação a qualquer pessoa. "Desta equipe" (`responsaveisPara`) inclui a coordenação.
  - Histórico na própria ficha (`## Atividade`, mais recente primeiro, `registrarPessoa`): entrar/sair de equipe, coordenação, suspensão, contato externo e função, com quem e quando; aparece na aba Gestão ("Histórico").
  - O escritor antigo (`lib/vaultMemberSync.ts`, Organograma v1 e bulk-sync) não sobrescreve mais `name`, `native_name`, `whatsapp` e `email` quando a ficha já tem valor.
  - A busca da IA (`lib/hermesRAG.ts`) lê as fichas de `Miembros/` só pelos campos atuais (`resumoPessoa`: equipes, coordenação, função, área, suspensão, histórico) — nunca os `squad_assignments`/`company_assignments` antigos. O assistente responde quem é de qual equipe só pelas ferramentas `pessoas`/`equipe`.
  - Contato externo só para quem não está em nenhuma equipe.
  - Auditoria: `scripts/auditar-equipes.js` (ficha ↔ equipe, coordenação, externos).
  - Sync do vault: `scripts/vault-sync-on-write/sync.sh` (instalado em `/opt/nipei-vault-sync/sync.sh`) e `scripts/vault-sync.ps1` usam `--autostash` e só registram CONFLICT quando a mesma nota mudou dos dois lados; falha de rede vira RETRY.
- **Notas internas e várias equipes (v2.44)**:
  - "Escolher equipe" (`components/v2/EscolherEquipes.tsx`) usa chips de marcar: várias equipes de uma vez (`addToEquipeAction` lê `form.getAll("equipe")`). Usado em `/pessoas/organizar`, cartão de Hoje, aba Gestão da ficha e inativos de `/pessoas`.
  - Nota interna (só gestão = Equipe 1 agora): ação rápida "Nota interna" nas linhas de Escolher equipe e cartão "Notas internas" na aba Gestão da ficha (`components/v2/NotasInternas.tsx`): adicionar, editar, comentar (`notaInternaAction`, modo nova|editar|comentar). Grava em `Gestao_Interna/Notas_pessoas/<pessoa>.md` (`lib/v2/notasInternas.ts`), fora de `Miembros/`; `Gestao_Interna` está em `SKIP_DIRS` e o `hermesRAG` só lê sua lista de pastas — nenhuma IA além do assistente da gestão vê as notas. O assistente lê pela ferramenta `notas_internas` e não pode copiá-las para mensagens, tarefas ou memória.
  - Assistente: cada resposta guarda `consultas` (ferramentas lidas) e o histórico reenviado diz `[consultou: …]`, para o modelo não duvidar de respostas anteriores já verificadas; marcadores ecoados são limpos da resposta.
- **Nova tarefa (v2.45)** `/tarefas/nova` (botão + de Hoje) usa `components/v2/NovaTarefaForm.tsx`: título grande, descrição, equipe + área (só se a equipe tiver `areas`), prioridade em chips, prazo com atalhos (Hoje/Amanhã/Sexta/Próxima semana), repetir, projeto → objetivos filtrados pelo projeto, responsáveis agrupados pela equipe escolhida (desta equipe / outras / sem equipe) com busca e "+ Eu", checklist (um passo por linha) e "Criar e adicionar outra" (volta com equipe/projeto/objetivo e um aviso com link da criada). Tudo grava pelo escritor único (`createTarefa` aceita `area` e `checklist`). O assistente também pode propor `checklist` em `criar_tarefa`.
- **Conexões e Google (v2.47, fases 1–2 do plano "Nipëi pessoal")**:
  - Regra: o vault é a única fonte de verdade; o Google é espelho (backup de mão única) e lugar de ação (eventos só com cartão/formulário). Conteúdo externo nunca vira memória ou tarefa sem aprovação.
  - Aba "Conexões" só na PRÓPRIA ficha (`components/v2/Conexoes.tsx`): conectar/desconectar Google, última cópia, "Fazer cópia agora", abrir a pasta. Rotas `/google/conectar` e `/google/callback` (fora de /api, liberadas em `proxy.ts`); o `state` é o id da pessoa assinado e precisa bater com quem está logado.
  - Credenciais por pessoa cifradas (AES-256-GCM) em `<vault>/.jobs/conexoes/<pessoa>.json` (`lib/v2/conexoes.ts`, chave `NIPEI_CONEXOES_KEY` no `.env` do VPS; se perder a chave, todos reconectam). Escopos mínimos (`lib/v2/google.ts`): `drive.file` (só arquivos que o Nipëi cria) e `calendar.events`; sem Gmail.
  - Backup diário (`lib/v2/backup.ts`, disparado pelo layout no máx. 1×/hora): pasta "Nipëi" no Drive da pessoa com LEIA-ME, Perfil, Tarefas, Memória do assistente e Conversa, sobrescritos no lugar (ids guardados). Notas internas da gestão nunca entram.
  - Agenda mostra os eventos do Google Calendar da pessoa (tracejado, "Seu Google Calendar", na ordem da hora). Assistente: `google_agenda` (ler) e `evento_google` (propõe, com convidados; cria só ao confirmar).
  - Exportar: visão do projeto → Docs/Slides, ata de reunião → Docs, finanças (gestão) → Sheets (`exportarGoogleAction`; markdown→Doc e CSV→Sheet pela conversão do Drive; Slides pela API).
  - Motor de IA único: `lib/v2/motorIA.ts` (ia.ts e assistente usam; recebe `pessoaId` para a chave própria da fase 5). Mudanças feitas pelo assistente registram "Nome (via assistente)".
  - Teste local sem Google: `NIPEI_GOOGLE_MOCK=http://127.0.0.1:3998` + `GOOGLE_CLIENT_ID/SECRET=mock` e um mock que responde `/<host>/<caminho>`.
  - Configuração: projeto Google Cloud `nipei-512411` com Drive, Calendar, Docs, Sheets, Slides **e Gmail** APIs (sem a Gmail API ativa, o Gmail responde 403); tela de consentimento External **publicada** (em "Testing" o acesso expira a cada 7 dias); cliente OAuth Web com redirect `https://os.nipeihu.app/google/callback`; `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` no `.env` do VPS.
- **MCP do Nipëi (v2.48, fase 3)**: `https://os.nipeihu.app/mcp` para usar o Nipëi de dentro do Claude, ChatGPT ou Gemini da própria pessoa (a IA é paga pela assinatura dela).
  - Servidor OAuth 2.1 próprio (`lib/v2/oauthMcp.ts`): descoberta em `/.well-known/oauth-protected-resource` e `/.well-known/oauth-authorization-server`, registro dinâmico `/oauth/register`, consentimento `/oauth/authorize` (exige o login normal do Nipëi; página fora do Shell v1), `/oauth/token` com PKCE S256, código de uso único (5 min), acesso de 1 h ligado a uma concessão e refresh rotativo guardado só como hash. Arquivos em `<vault>/.jobs/oauth/`.
  - `/mcp` (Streamable HTTP sem sessão, respostas JSON): `meDaPessoa` monta o mesmo usuário de um login (suspenso ou sem acesso = 401). Ferramentas = as do assistente (`ferramentasMCP`/`chamarMCP` em `lib/v2/assistente.ts`) + `minha_memoria`; as de gestão (pulso, notas internas, finanças) só para a gestão. Escritas executam na hora (o app pede confirmação a cada chamada), máx. 40/hora por pessoa, e ficam registradas como "Nome (via Claude)".
  - `proxy.ts` libera `/mcp`, `/oauth/*` e `/.well-known/*` (cada um se protege); aba Conexões lista os apps conectados com "Desconectar" (corta na hora).
- **WhatsApp "Encaminhar para o Nipëi" (v2.49, fase 6)**: a pessoa escreve, encaminha uma conversa ou manda áudio para o número do Nipëi (instância Evolution `nipei-santuario`).
  - Webhook do Evolution → `POST /api/whatsapp/webhook?token=<NIPEI_WHATSAPP_WEBHOOK_SECRET>` (rota pública que confere o token; responde na hora e processa em segundo plano). Evento `MESSAGES_UPSERT`, `webhookBase64: true` (o áudio já chega em base64). Antes apontava para `n8n.nipeihu.app`, que não existe (as mensagens se perdiam).
  - `lib/v2/whatsappEntrada.ts`: identifica a pessoa pelo WhatsApp da ficha (aceita o número BR com ou sem o 9), só quem pode usar o assistente (Equipe 1 hoje); número desconhecido, grupos, mensagens próprias e repetidas são ignorados em silêncio. Áudio → texto com Gemini (`NIPEI_TRANSCRICAO_MODEL`, padrão `gemini-flash-lite-latest`).
  - Mesmo assistente, mesma conversa e memória do painel (página `/whatsapp` no `contextoPagina`). As propostas voltam numeradas; a pessoa responde "sim", os números ("1 3") ou "não" (ou confirma no app). Mudanças ficam "Nome (via WhatsApp)".
  - O assistente ganhou uma trava: se disser que propôs sem ter chamado a ferramenta, é cobrado uma vez para propor de verdade.
- **Gmail e chave de IA própria (v2.50, fases 4 e 5)**:
  - Gmail é opcional e separado: botão "Ativar Gmail" (Equipe 1) → `/google/conectar?gmail=1` pede também `gmail.readonly` + `gmail.compose` (escopos restritos; app publicado e não verificado = aviso do Google, até 100 pessoas). `lib/v2/google.ts`: `gmailBuscar`, `gmailLer` (texto até 6000 caracteres), `gmailEnviar` (novo ou resposta na mesma conversa, ou rascunho; sem quebras de linha nos cabeçalhos). Assistente: `gmail_buscar`, `gmail_ler` e `gmail_enviar` (cartão); e-mail é conteúdo externo — o assistente resume, nunca segue instruções de e-mail, nunca põe e-mail na memória. No MCP, ferramentas Gmail só para a gestão.
  - Chave própria (`lib/v2/motorIA.ts`): Gemini (grátis no AI Studio), Anthropic, OpenRouter ou OpenAI, todos no formato OpenAI com ferramentas. Salva cifrada em `conexoes.ia` só depois de um teste com ferramenta; o assistente (painel, WhatsApp) usa a chave da pessoa, conta o uso do dia e, se falhar, registra o erro legível e termina com a chave da plataforma. Pausar / remover na aba Conexões. A página nunca mostra a chave inteira (só os 4 últimos caracteres). Tarefas, Conhecimento e outros usos de IA continuam na chave da plataforma.
- **Login e segurança (v2.51)**:
  - `/login` não lista mais quem pode entrar. Três formas: **Google** (`/google/entrar` → mesmo `/google/callback`, distinguido pelo state "google-login"; só `openid email profile`; reconhece o e-mail da ficha ou a conta Google conectada em Conexões; `lib/v2/sessao.ts`), **link no WhatsApp** (`POST /api/auth/link-whatsapp`: link de 15 min só para WhatsApp verificado; resposta sempre igual; 3/h por pessoa e 10/h por IP — serve também de "esqueci minha senha") e **usuário/e-mail/WhatsApp + senha** (olho para mostrar; PT/EN).
  - Senhas (`lib/v2/seguranca.ts`): hash scrypt em `<vault>/.jobs/seguranca/<pessoa>.json`. O `NIPEI_OS_USERS` do `.env` só é lido para migrar: no primeiro login com a senha antiga ela vira hash e depois só o hash vale. 5 erros por pessoa (ou 20 por IP) bloqueiam 15 min (memória).
  - Tokens têm `iat`; cada pessoa tem um "corte" (trocar senha, "Sair de todos os outros aparelhos"): `sessaoCortada` em `currentUser` e no `proxy.ts` descarta sessões anteriores; o aparelho atual recebe um cookie novo. Aba **Segurança** na própria ficha: trocar/criar senha (mín. 10), sair dos outros aparelhos, últimos acessos (método e aparelho).
- **Painel de controle `/controle` (v2.52, fases 1–2)** — só para quem está em `NIPEI_ADMINS` (ids de pessoa no `.env` do VPS; hoje `ashuan_web`), nunca configurável pelo app/vault:
  - Proteção: o `proxy.ts` devolve 404 de verdade para qualquer outra sessão (`subEhAdmin`), a página também confere (`ehAdmin`), o ícone do cabeçalho só vai no HTML do admin, e abrir exige reconfirmar com senha ou Google (cookie `nipei_admin` de 30 min, `path=/controle`, `SameSite=Strict`, preso ao id da pessoa). Cada abertura, falha e ação vai para `<vault>/.jobs/admin/registro.jsonl`. `robots: noindex`.
  - Módulos em `app/(v2)/controle/modulos/` — para adicionar: criar o componente (recebe `q`) e uma linha em `modulos/index.ts`. Hoje: **Saúde** (`lib/v2/saude.ts`: aplicação, vault/disco/GitHub, sync, avisos, Hermes, OpenRouter com créditos, Gemini, chaves próprias, Evolution + webhook + última mensagem, Google e cópias, MCP, segredos e senhas ainda sem hash; cache de 1 min, "Verificar agora"), **Acessos** (último uso, último login e método, logins 30d, conexões; lista filtrável) e **Registro do painel**.
  - Scripts do servidor deixam o último resultado em `<vault>/.jobs/estado/` (`sync.json`, `avisos-fila.json`, `avisos-diario.json`, `hermes-worker.json`); o webhook do WhatsApp grava `whatsapp-entrada.json` (só a hora).
  - **Atividade (v2.53, fase 3)** `lib/v2/eventos.ts`: junta (1) o registro de eventos novo em `<vault>/.jobs/eventos/AAAA-MM.jsonl` (`registrarEvento`: uso do assistente, propostas confirmadas/canceladas, chamadas MCP por app e ferramenta, mensagens/áudios no WhatsApp, exportações, conexões, segurança — só o tipo de ação, nunca o conteúdo), (2) o `## Atividade` de todas as tarefas e fichas (histórico completo; autor → pessoa pelo nome, "(via X)"/"(IA)" → canal; atores de sistema ignorados; linhas com `\r` aceitas) e (3) os logins. Módulo **Atividade**: por pessoa (ações, tarefas, pessoas, assistente, WhatsApp, apps de IA, logins, barras dos últimos 14 dias) + linha do tempo filtrável por período, canal e pessoa.
  - **Tempo de uso (v2.54, fase 4)**: `components/v2/PulsoUso.tsx` (no layout v2, só para quem tem ficha) manda `POST /api/uso` a cada minuto se a página está visível e houve movimento nos últimos 2 min; `lib/v2/uso.ts` soma 1 min por pessoa e seção (primeiro segmento da URL) em `<vault>/.jobs/uso/AAAA-MM.json`, ignorando pulsos com menos de 50 s (abas duplicadas). `/api/uso` é público no proxy e confere a sessão sozinho (membros também contam). Módulo **Tempo de uso**: total, dias ativos, média, barras de 14 dias e onde mais usa; por seção.
  - **Ver como (v2.55, fase 5)**: o admin abre a plataforma como outra pessoa vê, 30 min, **somente leitura**. Cookie `nipei_vercomo` = token "ver-como" com `<admin>|<pessoa>`, só vale se a sessão real é desse admin e ele continua em `NIPEI_ADMINS` (`verComoAtivo` em `lib/v2/data.ts`). `currentUser()` devolve a pessoa-alvo com `vendoComo`; qualquer server action é barrada ali (volta com aviso "somente leitura"), exceto leituras marcadas `currentUser({ leitura: true })` (hoje nenhuma; o Bom dia foi removido); o `proxy.ts` devolve 403 para qualquer não-GET em rotas/APIs (públicas incluídas) enquanto o modo está ativo. No modo: faixa âmbar + botão flutuante "sair" (`/ver-como/sair`, GET), sem assistente (conversa privada), sem abas Conexões/Segurança, sem registrar acesso nem tempo de uso. Módulo **Ver como**: diagnóstico de cada pessoa (entra ou não e por quê, papel, equipes com/sem acesso, formas de entrar) + escolher a página inicial. Início e saída no Registro do painel.
  - **Alertas e Operação (v2.55)**: `lib/v2/alertas.ts` roda a Saúde a cada 10 min (preguiçoso, pelo layout) e manda WhatsApp aos admins só quando algo vira "erro" ou volta (estados em `.jobs/admin/estados.json`, histórico em `alertas.jsonl`, liga/desliga em `config.json`). Módulo **Operação**: ligar/desligar alertas, alerta de teste, cópia no Drive de todos, sincronizar o vault, limpar bloqueios de login, auditar equipes (mesmas regras de `scripts/auditar-equipes.js`).
  - **Erros, Custos de IA, Funções e Relatórios (v2.56, fase 6)**:
    - Erros: `src/instrumentation.ts` (`onRequestError`, nativo do Next) grava todo erro não tratado de página/ação/rota em `.jobs/erros/AAAA-MM.jsonl` (`lib/v2/erros.ts`); `registrarErro` também onde a IA cai (assistente e `lib/v2/ia.ts`). Módulo **Erros** agrupa por mensagem. Avisos de validação (`?erro=`) não entram.
    - Custos: `lib/v2/custosIA.ts` grava cada chamada em `.jobs/custos/AAAA-MM.jsonl` (pessoa, uso, provedor, modelo, tokens, `usd`). USD só vem do OpenRouter (pedido com `usage: { include: true }`, só na chave da plataforma); Gemini (voz, transcrição) e chaves próprias = só tokens. `lib/v2/ia.ts` descobre a pessoa por `currentUser({ leitura: true })` (jobs em segundo plano = ""). Módulo **Custos de IA**: por mês, pessoa, uso e modelo.
    - Funções: `lib/v2/funcoes.ts` (`FUNCOES`, `funcaoLigada(id, me)`; config em `.jobs/admin/funcoes.json`, só o painel escreve). Cada função mantém a regra normal; o painel desliga para todos ou liga/desliga por pessoa; `soGestao` nunca passa da Equipe 1. Hoje: assistente (layout + `assistenteDono`), voz, WhatsApp de entrada, Gmail (ferramentas do assistente), MCP (403 na rota). Função nova atrás de interruptor = uma linha em `FUNCOES` + `funcaoLigada`.
    - Relatórios: `app/(v2)/controle/exportar/route.ts` → CSV (`;` + BOM, abre no Excel pt-BR) de atividade, uso, acessos, custos (mês) e erros; mesma porta do painel (404 para não-admin, volta ao painel sem confirmação) e cada download vai ao Registro.
- Decisão 2026-10-22: avisos de WhatsApp só para Jordão, Paulo Roberto, Rodrigo e Ashuan (`avisos_whatsapp: false` em todas as outras fichas); Kush, Txiva e Lynn ficam na Equipe 1 com acesso suspenso.
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
- **Navegação no design system (branch `design-system-v1`)**: `components/v2/Nav.tsx` substitui o menu das v2.33–2.36. Computador: menu flutuante **recolhido por padrão** (cookie `nipei_menu=aberto` abre), um só nível com grupos Principal (Hoje, Agenda, Projetos, Objetivos) / Equipe (Equipes, Pessoas, Conhecimento, Acervo) / Gestão (Finanças, Painel só NIPEI_ADMINS); contagens do layout (Hoje = minhas com prazo ≤ hoje; Conhecimento = fatos a revisar) viram ponto vermelho quando recolhido; Configurações (popover nativo: perfil, idioma, sair) e o orbe do Pinu no pé. Celular: pílula com o orbe no centro (filtro SVG `#ponte-liquida`). Cabeçalho do layout: `BuscaPinu` ("Pergunte ao Pinu ou busque…" abre o assistente; microfone abre ouvindo), sino → `/hoje?aba=novidades` com contagem das últimas 24 h, avatar (perfil no computador, configurações no celular). O botão flutuante do assistente no computador saiu (o orbe do menu abre). `Title` de `ui.tsx` agora é `<CabecalhoPagina>` (`components/ds/CabecalhoPagina.tsx`). O seletor de tema fica fora do painel até o fim da migração.
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
