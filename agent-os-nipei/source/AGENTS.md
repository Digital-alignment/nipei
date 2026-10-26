<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design system (obrigatório)

Fonte da verdade: `docs/design-system/DESIGN-SYSTEM.md` (histórico em `DECISOES.md`, ícones em `ICONES.md`; SVGs em `design-assets/icones/`).

- Toda UI nova da v2 usa os tokens e componentes descritos em `docs/design-system/DESIGN-SYSTEM.md`.
- Proibido: cores literais (hex ou classes de cor do Tailwind como `bg-neutral-900`, `text-green-600`), `dark:`, `lucide-react`, emojis na interface, fontes monospace, `text-[10px]`/`text-[11px]`, `confirm()`/`alert()`.
- Ícones só via `<Icone>` / `<Selo>`. Componentes visuais só de `src/components/ds/`.
- **Verificação automática:** `npm run verificar:ds` (`scripts/verificar-ds.mjs` + `scripts/ds-contraste.mjs`) roda sozinho antes de todo `npm run build` (`prebuild`), inclusive no deploy (Dockerfile). Falha com `arquivo:linha` se aparecer lucide, `dark:`, cor do Tailwind, hex literal, `text-[10px]/[11px]`, `confirm()/alert()`, emoji ou monospace em `src/app/(v2)`, `src/app/login`, `src/components/v2` e `src/components/ds`, ou se um par de contraste dos tokens de `globals.css` cair abaixo de 4,5:1. Exceção pontual e justificada: `ds-permitido: <motivo>` na linha ou na linha anterior.
- Antes de criar um componente visual novo, ele precisa existir no `DESIGN-SYSTEM.md` (decide-se primeiro no documento, depois no código).
- Telas antigas ainda usam o estilo anterior até serem migradas; ao mexer numa delas, não acrescente mais estilo antigo.
- **Tema (decisão 2026-10-26, cumprida):** durante a migração o padrão foi "Sistema"; com todas as telas da v2 migradas, `TEMA_PADRAO` (`src/components/ds/temaScript.ts`) voltou a "escuro", o padrão do design system, e o seletor de tema está em Configurações (menu lateral / avatar no celular).
