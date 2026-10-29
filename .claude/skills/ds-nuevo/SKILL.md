---
name: ds-nuevo
description: Construir UI en Nipëi OS v2 respetando el design system. Usar SIEMPRE que se cree o modifique una pantalla, componente, botón, tarjeta, formulario, ícono o cualquier elemento visual en src/app/(v2), src/app/login, src/components/v2 o src/components/ds. No aplica a cambiar el propio design system (eso es ds-cambiar) ni a auditarlo (ds-auditar).
---

# Crear UI con el design system de Nipëi OS

La fuente única es `agent-os-nipei/source/docs/design-system/DESIGN-SYSTEM.md`. Esta skill no repite sus reglas: dice qué leer y en qué orden. Si algo de aquí contradice el documento, gana el documento.

Rutas (desde `agent-os-nipei/source/`):
- Documento: `docs/design-system/DESIGN-SYSTEM.md` (historial `DECISOES.md`, íconos `ICONES.md`, cambios `CHANGELOG.md`)
- Tokens: `src/app/globals.css` (bloques `.v2`, `[data-tema="claro"]`, "Sistema" y `@theme inline`)
- Componentes: `src/components/ds/` y `src/components/ds/padroes/`
- SVG de íconos: `design-assets/icones/` → `npm run icones` regenera `icones.generated.ts` / `simbolos.generated.ts`
- La carpeta `design/` de la raíz del repo es una copia vieja fuera de git: no usarla como referencia.

## Procedimiento

1. **Leer antes de escribir**: §2 (reglas globales) siempre, y la sección del elemento que vas a hacer: §9 (componente base), §10 (patrón: cabecera, lista, agenda, quadro, tabla, línea de tiempo, navegación, Pinu), §6 (formas de firma, cada una con un solo uso), §7 (íconos y selos), §4 (estilo tipográfico).
2. **Buscar lo que ya existe** en `components/ds/` y `padroes/` (Grep por el nombre del §9/§10) y usarlo. Mirar cómo lo usa otra pantalla parecida.
3. **Si falta algo** (componente, variante, ícono, token, tamaño), **parar**: no inventar una clase local, una constante de estilo (`const BOTAO = "…"`), un valor arbitrario (`rounded-[16px]`, `text-[13px]`, `shadow-[…]`) ni un `<button>` a mano que imite un `Botao`. Decírselo al usuario y pasar a la skill `ds-cambiar` (primero se decide en el documento, después en el código). Ícono que no existe: usar un provisorio con `TODO(ícones)` y anotarlo en `ICONES.md`, como hacen las pantallas actuales.
4. **Construir** solo con tokens (clases de `@theme`: `bg-s1`, `text-t2`, `rounded-cartao`, `font-display`…) y componentes del DS. Textos de interfaz en pt-BR.
5. **Lista de control** (no la verifica ninguna máquina):
   - un solo acento rellenado de contenido por pantalla; folha solo en LA acción principal;
   - todo botón con ícono; botón solo-ícono con `aria-label` + tooltip;
   - "Remover" nunca rojo fuera del `Dialogo`; nada de `confirm()` → `useConfirmar`;
   - brillo solo en lo que es del Pinu (y el hover/foco de campos);
   - hachurado = pendiente, sólido = hecho;
   - equipe con selo + nombre, estado con ícono + texto;
   - celular: área de toque ≥ 44 px (`alvo-toque` si el dibujo es menor), texto ≥ 12 px;
   - oscuro **y** claro; celular **y** computador; estados hover/foco/desactivado/cargando/vacío;
   - `prefers-reduced-motion` si hay animación.
6. **Verificar**: `npm run verificar:ds` en `agent-os-nipei/source` (debe dar ok; arreglar cada `archivo:línea`). `ds-permitido: <motivo>` solo con un motivo real y diciéndoselo al usuario. Después `npx tsc --noEmit`.
7. **Ver en local**: `npm run entrar:local -- ashuan_web 3456` (preview "nipei-os", puerto 3456) y revisar a 390 y 1440 px, en oscuro y claro.

No hacer commit ni push sin que el usuario lo pida: un push a `main` que toque `agent-os-nipei/source/**` despliega a producción.
