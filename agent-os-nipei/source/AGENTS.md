<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design system (obrigatório)

Fonte da verdade: `docs/design-system/DESIGN-SYSTEM.md` (histórico em `DECISOES.md`, ícones em `ICONES.md`; SVGs em `design-assets/icones/`).

- Toda UI nova da v2 usa os tokens e componentes descritos em `docs/design-system/DESIGN-SYSTEM.md`.
- Proibido: cores literais (hex ou classes de cor do Tailwind como `bg-neutral-900`, `text-green-600`), `dark:`, `lucide-react`, emojis na interface, fontes monospace, `text-[10px]`/`text-[11px]`, `confirm()`/`alert()`.
- Ícones só via `<Icone>` / `<Selo>`. Componentes visuais só de `src/components/ds/`.
- Antes de criar um componente visual novo, ele precisa existir no `DESIGN-SYSTEM.md` (decide-se primeiro no documento, depois no código).
- Telas antigas ainda usam o estilo anterior até serem migradas; ao mexer numa delas, não acrescente mais estilo antigo.
