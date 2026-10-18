# Registro de Atualizações — Nipëi OS Control Hub

Este documento registra o histórico de implementações, refatorações e entregas executadas pelos agentes de engenharia no repositório `nipei-control`.

---

## [2026-10-18] — Desdobramento e Homologação da Fase 5.3 + Deploy Online
- **Deploy em Produção:**
  - Sincronização do VPS (`85.31.61.100`) para o commit `af46e16`.
  - Reconstrução completa do container `nipei-os` via Docker Compose com Next.js Turbopack.
  - Verificação de rotas online em `https://os.nipeihu.app` (`/kanban`, `/venu`, `/api/vitals`, `/api/venu/kanban-action`).
- **Preparação de Conexão Multi-Agente:**
  - Criação de `CLAUDE.md` mestre na raiz do repositório.
  - Atualização de `.agents/PROJECT_STATE.md` e `.agents/UPDATES.md`.
  - Registro de sincronização na nota viva comercial `C:\Users\ondig\Desktop\DA\digitalalignment\Productos\Nipei OS.md`.

---

## [2026-10-16] — Fase 5: Integração Completa Venu ↔ Kanban
- **Sub-Fase 5.1 (Grounding Contínuo de Tarefas):**
  - Implementação de `kanbanGrounding.ts` com indexação das 308 tarefas do Vault.
  - Injeção contextual no WebRTC Realtime Voice (`ApolloRealtime.tsx`), no prompt de texto rápido (`hermesApollo.ts`) e no briefing executivo diário/semanal (`apolloBriefing.ts`).
- **Sub-Fase 5.2 (Mutações de Tarefas via Voz e Texto):**
  - Criação do endpoint `/api/venu/kanban-action` com ações `create`, `update`, `assign`.
  - Registro das ferramentas `kanban_create_task`, `kanban_update_task` e `kanban_assign_agent` na sessão OpenAI Realtime.
  - Tratamento nativo no HUD com feedback em tempo real e confirmação por voz.
- **Sub-Fase 5.3 (Entregáveis Executivos & Despacho Omnicanal):**
  - Desacoplamento e exportação de `executeGenerateDeliverable` em `/api/agent-kanban/deliverables`.
  - Desacoplamento e exportação de `executeDispatchCommunication` em `/api/agent-kanban/dispatch`.
  - Adição das ações `deliverable` e `dispatch` ao `/api/venu/kanban-action`.
  - Registro das tools `kanban_generate_deliverable` e `kanban_dispatch_message` na sessão Realtime e tratamento no `AUTO_PERSONA`.
  - Commit: `af46e16`.

---

## [2026-10-16] — Fase 4: Hub de Despacho Omnicanal (WhatsApp, E-mail & n8n)
- Implementação de `TaskDispatchHub.tsx` integrado ao modal da tarefa com badges numéricos.
- Rota `/api/agent-kanban/dispatch` com suporte a:
  - WhatsApp através da Evolution API v1/v2 com checagem de status de instância.
  - E-mail corporativo com formatação executiva.
  - Webhooks estruturados para automações no n8n.
- Modo Simulação (Auditoria) transparente para testes sem disparos externos indesejados.
- Commit: `0d9b29f`.

---

## [2026-10-16] — Fase 3: Orquestrador de Entregáveis Executivos
- Criação de `TaskDeliverablesHub.tsx` com visualizador Markdown, suporte a slides em carrossel e download de arquivos.
- Rota `/api/agent-kanban/deliverables` gerando 5 formatos com grounding RAG do Nipëi Vault.
- Persistência canônica na subpasta `deliverables/` do workspace da tarefa.
- Commit: `61f4383`.

---

## [2026-10-16] — Fases 1 e 2: Reestruturação do Kanban & Gestão de Anexos
- Reformulação de layout do Kanban: densidade visual aprimorada, visualização em 2 colunas para detalhes da tarefa, scroll horizontal suave e drag-and-drop.
- Criação de `TaskAttachmentsManager.tsx` e `/api/agent-kanban/attachments` para upload e extração de texto em `Task_Workspace/YYYY/SQ-XX/TASK_ID/inputs/`.
