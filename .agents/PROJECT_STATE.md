# Estado Atual do Projeto — Nipëi OS Control Hub

> **Atualização 2026-10-24 (v2.50.0):** este arquivo parou em 18/10. O estado atual e os próximos passos estão em `CLAUDE.md` → seção **"0. Próxima sessão"** (e o histórico das versões v2.x nas seções 3.7–3.10).

**Data de Atualização:** 18 de Outubro de 2026  
**Status do Sistema:** 🟢 Online & Estável  
**Produção:** `https://os.nipeihu.app` | **VPS:** `85.31.61.100` (`nipei-os`)  
**Repositório:** `Digital-alignment/nipei` (branch `main`)  
**Último Commit:** `af46e16`

---

## 1. Módulos & Arquitetura Ativa

### A. Quadro Kanban Multidisciplinar (`/kanban`)
- **Tarefas Indexadas:** 308 tarefas vivas distribuídas em `Productivity/Tarefas` e `Todo_Audit_Lists` no Nipëi Vault.
- **Squads Ativos:**
  - `squad_1_ceo`: Estratégia, Governança Geral e Liderança
  - `squad_2_mutum`: Produção Física, Frascos, Inventário e Logística
  - `squad_3_retiros`: Experiências, Retiros Samakey e Acolhimento
  - `squad_4_vendas_mkt`: Aquisição, Conteúdo, Comunidade e Campanhas
  - `squad_5_adm_legal`: Jurídico, Contratos, Compliance e Governança
  - `squad_6_infra`: Sistemas, Servidores, Redes e Ferramentas
  - `squad_7_instituto`: Projetos Sociais, Fundo Ancestral e Preservação
  - `squad_8_fundraising`: Captação e Relações com Doadores
  - `squad_9_internacional`: Expansão e Parcerias Globais
  - `squad_10_biofarmacia`: P&D de Fórmulas e Farmacopeia
  - `squad_vb_knowledge`: Base de Conhecimento Transversal
- **Componentes Centrais:**
  - `SquadKanbanView.tsx`: Quadro visual Kanban com colunas (A Fazer, Em Andamento, IA em Execução, Revisão/Veto, Concluído, Arquivado). Suporta filtros rápidos por Squad, prioridade e busca textual.
  - `KanbanListView.tsx`: Visão tabular/lista de alta densidade informativa com ordenação e paginação.
  - `TaskAttachmentsManager.tsx`: Tab de gestão de arquivos e insumos (`/api/agent-kanban/attachments`).
  - `TaskDeliverablesHub.tsx`: Tab de geração e visualização de relatórios/entregáveis (`/api/agent-kanban/deliverables`).
  - `TaskDispatchHub.tsx`: Tab de despacho omnicanal (`/api/agent-kanban/dispatch`).

### B. Venu HUD / Apollo (`/venu`)
- **Voz em Tempo Real (WebRTC S2S):** `ApolloRealtime.tsx` conectado ao OpenAI Realtime com VAD de 280ms.
- **Motor Rápido / Texto / Speech:** `hermesApollo.ts` com completions via MiniMax-M3 e Claude fallback.
- **Grounding Contínuo do Kanban:** `kanbanGrounding.ts` injeta o estado atualizado das tarefas, urgências e squads diretamente no contexto do prompt de Venu.
- **Tool Calling Operacional:**
  - `kanban_create_task`: Criação instantânea de tarefas na voz ou texto.
  - `kanban_update_task`: Movimentação de status e colunas.
  - `kanban_assign_agent`: Atribuição de squads, agentes ou responsáveis humanos.
  - `kanban_generate_deliverable`: Compilação de relatórios executivos no Vault.
  - `kanban_dispatch_message`: Disparo de notificações via WhatsApp, E-mail ou n8n.
- **Endpoint Central:** `POST /api/venu/kanban-action`

### C. Workspace Canônico de Tarefas (`lib/taskWorkspace.ts`)
- **Estrutura de Pastas no Vault:**
  ```text
  C:\Users\ondig\Code\Nipei\nipei-vault\Task_Workspace\
  └── 2026\
      └── SQ-01_CEO\ (ou outro squad)
          └── task_001_titulo_sanitizado\
              ├── inputs\           <-- Arquivos anexados
              ├── deliverables\     <-- Entregáveis gerados
              └── _workspace_meta.json <-- Metadados e log de auditoria
  ```

---

## 2. Configurações de Conexões Externas

- **WhatsApp (Evolution API):**
  - URL Padrão: `https://evolution.digital-alignment.com`
  - Instância Padrão: `nipei-santuario`
  - Alternativa: Modo Simulação auditado nativo para testes sem envio real.
- **E-mail Executivo:**
  - Gmail CLI integrado via `outreachBackends.ts`.
- **Webhooks de Automação:**
  - Compatível com payloads JSON estruturados do n8n.

---

## 3. Checklist de Saúde para Novos Agentes

- [x] TypeScript checado sem erros (`npx tsc --noEmit`).
- [x] Build de produção compilado com sucesso (`npm run build`).
- [x] Servidor online no VPS com status ativo (`os.nipeihu.app`).
- [x] Endpoint `/api/venu/kanban-action` testado com respostas 200/400 auditadas.
- [x] Grounding RAG ativo com base em `nipei-vault`.
