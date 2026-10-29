---
name: ds-auditar
description: Auditar el design system de Nipëi OS y las pantallas v2 — encontrar desvíos, estilos locales, componentes duplicados o faltantes, íconos provisionales, documento desactualizado y problemas de contraste. Usar cuando se pida auditar, revisar, mejorar o "ver cómo está" el design system o una pantalla. Solo informa; los arreglos van por ds-nuevo o ds-cambiar con aprobación.
---

# Auditar el design system de Nipëi OS

Fuente: `agent-os-nipei/source/docs/design-system/DESIGN-SYSTEM.md` (reglas §2, componentes §9, patrones §10, implementación §13, pendientes §14). Rutas y comandos desde `agent-os-nipei/source/`. Alcance v2: `src/app/(v2)`, `src/app/login`, `src/components/v2`, `src/components/ds`.

## Pasos

1. **Lo automático**: `npm run verificar:ds`. Si falla, eso va primero en el informe. Listar también los `ds-permitido` (Grep) y juzgar si el motivo sigue valiendo.
2. **Lo que el verificador no ve** (Grep en el alcance; cada hallazgo es candidato, confirmarlo leyendo el contexto):
   - valores arbitrarios: `rounded-\[`, `text-\[1[2-9]px\]`, `shadow-\[` (regla "plano"), `style=\{\{` — marcar los que equivalen a un token (`rounded-[16px]` = `rounded-cartao`);
   - constantes de estilo locales que imitan componentes: `const [A-Z_a-z]+ = "anel-foco|rounded-pilula|bg-s` (ej. `btnTonal`), y `<button` / `<input` con clases propias donde había `Botao` / `Campo`;
   - superposiciones propias (`fixed inset-0`) en vez de un componente del DS;
   - `TODO(ícones)` y provisorios;
   - hex sueltos dentro de `src/app/globals.css` fuera de los bloques de tokens (el archivo está exento de la regla de hex);
   - colores guardados en el vault usados como color de interfaz (ej. `cor` de equipe en vez de `eq-*`).
3. **Reglas manuales** (§2): muestrear las pantallas principales (Hoje, Tarefas, Agenda, Pinu, una ficha) buscando más de un acento de contenido, más de una folha, botones sin ícono, "Remover" rojo fuera del diálogo, brillo fuera del Pinu, áreas de toque < 44 px. Si hace falta ver, `npm run entrar:local -- ashuan_web 3456` y revisar a 390 / 1440 px en ambos temas.
4. **Duplicados y faltantes**: componentes de `components/v2` que repiten uno de `components/ds`; cosas que §9/§10 describen y no existen en código, o al revés (componente en `ds/` sin sección en el documento).
5. **Documento contra código**: `DESIGN-SYSTEM.md`, `ICONES.md` (estado de cada ícono contra `design-assets/icones/funcionais/`) y `CHANGELOG.md` contra lo que hay; tokens del §13.1 contra `globals.css`; enlaces internos rotos (la carpeta `design/` de la raíz es una copia vieja fuera de git).
6. **Contraste**: la salida de `node scripts/ds-contraste.mjs`; pares texto/fondo nuevos que usen las pantallas y no estén en su lista `PARES`.

## Informe

Tabla priorizada: **Bloquea** (rompe una regla del §2 o el contraste) · **Deuda** (estilo local, valor arbitrario, duplicado) · **Documento** (desactualizado o incoherente). Cada fila: `archivo:línea`, qué regla o sección, arreglo propuesto y con qué skill (`ds-nuevo` si es usar lo que existe; `ds-cambiar` si hace falta cambiar el DS). Si un patrón se repite y es detectable, proponer agregarlo como regla nueva a `scripts/verificar-ds.mjs` (vía `ds-cambiar`).

No cambiar código ni documentos durante la auditoría.
