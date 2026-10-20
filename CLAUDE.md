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
