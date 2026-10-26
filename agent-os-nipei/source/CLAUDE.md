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
- Endpoints de Kanban: `/api/agent-kanban`, `/api/agent-kanban/attachments`, `/api/agent-kanban/deliverables`, `/api/agent-kanban/dispatch`, `/api/agent-kanban/execute`
- Endpoint de Venu: `/api/venu/kanban-action`

## Design system (obrigatório)

Fonte da verdade: `docs/design-system/DESIGN-SYSTEM.md` (histórico em `DECISOES.md`, ícones em `ICONES.md`; SVGs em `design-assets/icones/`).

- Toda UI nova da v2 usa os tokens e componentes descritos em `docs/design-system/DESIGN-SYSTEM.md`.
- Proibido: cores literais (hex ou classes de cor do Tailwind como `bg-neutral-900`, `text-green-600`), `dark:`, `lucide-react`, emojis na interface, fontes monospace, `text-[10px]`/`text-[11px]`, `confirm()`/`alert()`.
- Ícones só via `<Icone>` / `<Selo>`. Componentes visuais só de `src/components/ds/`.
- Antes de criar um componente visual novo, ele precisa existir no `DESIGN-SYSTEM.md` (decide-se primeiro no documento, depois no código).
- Telas antigas ainda usam o estilo anterior até serem migradas; ao mexer numa delas, não acrescente mais estilo antigo.
