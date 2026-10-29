---
name: ds-cambiar
description: Cambiar el design system de Nipëi OS de forma coherente — un color o token, un componente o variante nueva, una regla, una forma, un ícono, la tipografía. Usar cuando el usuario decida cambiar algo del diseño, o cuando al construir UI falte algo que el DS no tiene. Reescribe documento, decisiones, tokens, componentes, verificador y las pantallas afectadas, en ese orden.
---

# Cambiar el design system de Nipëi OS

Primero se decide en el documento, después en el código (`DESIGN-SYSTEM.md` §13.3). Rutas desde `agent-os-nipei/source/`. La carpeta `design/` de la raíz es una copia vieja fuera de git: no editarla.

## 0. Entender y confirmar

- Leer la sección afectada de `docs/design-system/DESIGN-SYSTEM.md` y buscar en `DECISOES.md` por qué es como es (no deshacer una decisión sin decírselo al usuario).
- Medir el alcance: Grep del token / componente / clase en `src/` (v2 y v1) y en `globals.css`.
- Si el cambio choca con una regla global (§2) o con el contraste, o es ambiguo, presentar opciones al usuario antes de escribir. Para colores nuevos, calcular el contraste antes (misma fórmula que `scripts/ds-contraste.mjs`).

## 1. Orden de escritura (todo en el mismo cambio)

1. **`docs/design-system/DECISOES.md`**: entrada nueva con fecha (AAAA-MM-DD), qué cambia, por qué y quién decidió.
2. **`docs/design-system/DESIGN-SYSTEM.md`**: actualizar la sección afectada **y** todo lo que la repite: tabla de color (§3) + bloque de tokens (§13.1), tablas de contraste (§3.5), tabla de reemplazos (§13.2), verificación (§13.4), pendientes (§14). Subir la versión del encabezado si el cambio es de regla o de token.
3. **`src/app/globals.css`**: el token en los **tres** bloques (`.v2` oscuro, `[data-tema="claro"]`, y el bloque "Sistema" `:root:not([data-tema]) .v2`, que debe repetir el claro) y, si es token nuevo, su mapeo en `@theme inline`.
4. **Componentes** en `src/components/ds/` (o `padroes/`): una variante nueva o un componente nuevo con sus estados (§9) en ambos temas. Ícono nuevo: SVG en `design-assets/icones/…` con el formato del §7.2 → `npm run icones`; actualizar `ICONES.md` y quitar los `TODO(ícones)` que cubre.
5. **Verificador**, si cambia una regla: `scripts/verificar-ds.mjs` (regla detectable nueva en `REGRAS`) y/o `scripts/ds-contraste.mjs` (par nuevo en `PARES`). Documentarlo en §13.4.
6. **Pantallas**: actualizar todos los usos encontrados en el paso 0. Si se reemplaza un componente o una clase, no dejar el viejo vivo; si se retira, borrarlo.
7. **`docs/design-system/CHANGELOG.md`**: entrada con fecha: telas, componentes, verificación y números si aplica.
8. Si cambia algo que `CLAUDE.md` (raíz o `agent-os-nipei/source/`) describe del DS, actualizarlo también.

## 2. Verificar

- `npm run verificar:ds` y `npx tsc --noEmit` en `agent-os-nipei/source`.
- Ver en local (`npm run entrar:local -- ashuan_web 3456`) las pantallas afectadas a 390 y 1440 px, oscuro y claro.
- Resumen al usuario: qué cambió en cada capa y qué pantallas tocó.

No hacer commit ni push sin que el usuario lo pida: un push a `main` que toque `agent-os-nipei/source/**` despliega a producción.
