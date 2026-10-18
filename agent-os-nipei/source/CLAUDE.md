# Nipëi OS — source directory

Para a documentação completa, especificações de arquitetura, comandos de build e regras de isolamento/deploy, consulte o arquivo mestre:
- [CLAUDE.md principal](../../CLAUDE.md)
- [.agents/PROJECT_STATE.md](../../.agents/PROJECT_STATE.md)
- [.agents/UPDATES.md](../../.agents/UPDATES.md)

### Comandos Rápidos neste Diretório:
- `npm run dev` — Servidor de desenvolvimento Next.js
- `npx tsc --noEmit` — Validação estrita de tipos TypeScript
- `npm run build` — Build de produção com Turbopack

### Vault & Dados
- Vault principal: `C:\Users\ondig\Code\Nipei\nipei-vault`
- Endpoints de Kanban: `/api/agent-kanban`, `/api/agent-kanban/attachments`, `/api/agent-kanban/deliverables`, `/api/agent-kanban/dispatch`
- Endpoint de Venu: `/api/venu/kanban-action`
