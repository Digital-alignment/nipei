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
