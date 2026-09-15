---
name: da-vault-schema
description: Contrato de escritura del vault de Digital Alignment (Obsidian, Desktop\DA\digitalalignment) — qué campo va en el frontmatter YAML de la nota de una marca, con qué forma y qué enums, para que Command Center lo lea. Incluye los sub-tipos (roadmap, proyectos, historial, servicios), los errores frecuentes y el validador `npm run vault:check`.
when_to_use: Al terminar una sesión de trabajo en CUALQUIER repo de Digital Alignment (muvb, oca-yary, event-master, Rifa-basica, hotelos, crva, command-center...) cuyo cambio afecte el estado del negocio — feature en producción, pendiente resuelto, proyecto nuevo, decisión tomada, servicio dado de alta. También al crear una nota de marca nueva, o antes de editar a mano cualquier .md de Clientes\ o Productos\.
---

# Contrato del vault — Digital Alignment

El vault de Obsidian (`C:\Users\ondig\Desktop\DA\digitalalignment\`) es la **fuente de
verdad del estado de negocio** de todas las marcas. Command Center (el dashboard en
`Code\DA\command-center`) no lo importa ni lo copia: lo **lee del disco en cada request**
(`getAllBrands()` + `force-dynamic`, sin caché). Guardás la nota → refrescás la página → está.

Por eso no existe ningún paso de "sincronizar". Lo único que puede fallar es escribir con
una forma que el parser no entiende — y el parser **degrada en silencio**: una nota mal
armada no tira ningún error, simplemente no aparece. Este archivo es el contrato para que
eso no pase.

## La regla de oro: frontmatter, no body

Una nota de marca tiene dos partes y **solo la primera llega a las tabs del dashboard**:

```markdown
---
id: oca-yary          ← frontmatter YAML: esto es lo que lee Command Center
nombre: Oca Yary
roadmap: [...]
---
<!-- agente: claude-code -->

# Oca Yary 🌿         ← body markdown: solo se ve en la tab "Notas"
Texto libre...
```

**El error más caro y más frecuente**: escribir el avance como prosa en el body
("## Historial\n- 2026-08-10: shippeamos X"). Se guarda, no rompe nada, y las tabs
Roadmap/Proyectos/Historial siguen mostrando lo de antes. El body es para contexto
cualitativo que no tiene sentido estructurar (decisiones, matices, contactos) — **no** para
pendientes, proyectos ni bitácora.

Editá el `.md` con Edit/Write como cualquier archivo de texto. No hay API ni comando.
Lo único no negociable es que el YAML quede válido.

## Dónde va cada nota

| Carpeta | Qué va | Ejemplos |
|---|---|---|
| `Clientes\<Empresa>.md` | Empresa **cliente externa** | MUV Gráfica, Oca Yary, Nipeihu, Inî Rau, Mystical Yoga Farm |
| `Productos\<Producto>.md` | **Producto propio** de DA | Event Master, Rifa Básica, HotelOS |

Notas con nombre `_*.md` (`_Ecosistema.md`, `_Infraestructura.md`) y reportes sueltos son
notas de soporte: el dashboard las ignora a propósito, no les pongas frontmatter de marca.

Al **crear** una nota nueva, primera línea del body: `<!-- agente: claude-code -->` (o
`antigravity`, etc.). Invisible en Obsidian, sirve para saber después quién la generó.

## Campos de la marca (frontmatter raíz)

Obligatorios — **sin estos dos la nota entera se descarta**:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string | slug estable, minúsculas con guiones. Es la URL: `/brands/<id>` |
| `nombre` | string | nombre visible |

El resto es opcional:

| Campo | Tipo | Nota |
|---|---|---|
| `tipo` | enum | `cliente_externo` \| `producto_propio` \| `agencia_madre`. Default `cliente_externo` |
| `estado` | enum | `activo` \| `transicion` \| `pausado` \| `archivado` |
| `emoji` | string | ícono de la marca |
| `categoria` | string | frase descriptiva **libre** |
| `rubro` | enum | taxonomía **cerrada**, distinta de `categoria` — ver abajo |
| `dominio`, `hosting` | string | |
| `repo_github`, `repo_local` | string | `repo_local` habilita el sync de historial desde el git log |
| `stack`, `canales_adquisicion`, `vacios_detectados` | string[] | |
| `relaciones` | string[] | **ids de otras marcas** del vault. Un id inexistente es un link roto |
| `servicios_vps` | string[] | **ids** de la lista `servicios:` de `Clientes\_Infraestructura.md` (infra VPS compartida) |
| `notebook_id` | string | NotebookLM |
| `reporte_md` | string | path a `About\Reporte_X.md`. Hoy el dashboard no lo lee |
| `ultima_sync` | `YYYY-MM-DD` | Command Center lo pisa solo al escribir; editando a mano, actualizalo |
| `proyectos`, `roadmap`, `historial`, `servicios` | listas | ver sub-tipos abajo |

**Esquema evolutivo**: cualquier clave que no esté en esta lista se preserva en `Brand.extra`
en vez de descartarse. Agregar un campo nuevo a mano nunca rompe el parser — pero tampoco lo
muestra en ninguna tab hasta que alguien lo cablee en el código.

## Sub-tipos

### `roadmap` — los pendientes (tab Roadmap, kanban)

```yaml
roadmap:
  - id: agente-whatsapp-clientes      # requerido, slug único DENTRO de la marca
    texto: Implementar el agente por WhatsApp para clientes
    prioridad: alta                   # urgente | alta | media | baja
    tags: [whatsapp, producto]
    orden: 3                          # posición dentro de su columna
    hecho: false                      # flag CANÓNICO de completado
    proyecto_id: web-app-eventos      # opcional, debe existir en proyectos[]
    estado: en_curso                  # opcional: en_curso | bloqueada | esperando_cliente
    fecha_limite: 2026-08-20          # YYYY-MM-DD
    responsable: Rafa                 # texto libre (persona o agente)
    bloqueado_por: [otro-item-id]     # o "otra-marca:item-id" para cross-marca
```

**Invariante que rompe todo el mundo**: `hecho` manda. Si la tarea está terminada →
`hecho: true` y **borrá** `estado` (o poné `hecha`). Un `hecho: true` junto a
`estado: en_curso` es dato contradictorio. `estado` solo matiza a las **no** hechas.

Al marcar algo como hecho, sumá `fecha_completado: YYYY-MM-DD`. Al crear, `fecha_creacion`.

### `proyectos` — las líneas de trabajo (tab Proyectos)

```yaml
proyectos:
  - id: web-app-eventos               # si falta, se genera como slug de `nombre`
    nombre: Web app de eventos
    estado: en_desarrollo             # texto libre
    objetivo: Reemplazar la venta por WhatsApp con plataforma propia
    tecnologias: [React 19, Supabase]
    presupuesto_aprox: null
```

El `id` de acá es lo que apunta `roadmap[].proyecto_id`. Si no ponés `id`, el efectivo es
el slug del nombre — y **cambiar el nombre rompe el vínculo**. Poné `id` explícito.

### `historial` — la bitácora (tab Historial)

```yaml
historial:
  - fecha: 2026-08-10                 # YYYY-MM-DD, obligatorio con ese formato
    texto: Shippeada la ficha de saúde con revisión del equipo
    tags: [feature]
```

Atajo: si la marca tiene `repo_local`, la tab Historial tiene un botón
**"⟳ Proponer desde repo"** que lee el git log de los últimos 30 días y propone entradas
por día para que elijas cuáles aplicar. Es idempotente. Usalo en vez de escribir a mano.

### `servicios` — accesos externos propios de la marca (tab Servicios/Accesos)

```yaml
servicios:
  - id: wp-admin
    tipo: wordpress                   # wordpress | hosting | email | elearning | otro
    nombre: WordPress admin
    url: https://...
    usuario: admin
    credencial_ref: muv-wp            # SOLO la referencia
    estado: configurado               # configurado | pendiente
```

**Nunca escribas una contraseña, token o API key en el vault.** El secreto vive cifrado en
`~/.command-center/credenciales.json`; el frontmatter solo guarda `credencial_ref`.

No confundir con `servicios_vps`, que es infraestructura **compartida** entre marcas.

## Enums cerrados

| Campo | Valores |
|---|---|
| `tipo` | `cliente_externo` `producto_propio` `agencia_madre` |
| `estado` (marca) | `activo` `transicion` `pausado` `archivado` |
| `rubro` | `ecommerce` `turismo_retiros` `comunidad_cultura` `producto_saas` `agencia` |
| `prioridad` | `urgente` `alta` `media` `baja` |
| `estado` (tarea) | `pendiente` `en_curso` `bloqueada` `esperando_cliente` `hecha` |
| `tipo` (servicio) | `wordpress` `hosting` `email` `elearning` `otro` |
| `estado` (servicio) | `configurado` `pendiente` |

Un valor fuera del enum no siempre rompe: `rubro` degrada a mostrar el string crudo (pero
deja de filtrar por chip). Los demás sí ensucian la UI. Para **agregar** un valor nuevo al
enum hay que tocar código — ver `brand-dashboard-master` en `command-center/.claude/skills/`.

## Regla de cierre — corré el validador

Después de escribir en el vault, desde `C:\Users\ondig\Code\DA\command-center`:

```bash
npm run vault:check
```

Corre el parser real contra el vault real y reporta lo que el dashboard no va a poder
mostrar. `ERROR` = se muestra mal o no se muestra (arreglalo). `WARN` = se ve, degradado.
Sale con código 1 solo si hay errores.

Lo que detecta, que es exactamente la lista de errores frecuentes:

- Nota con frontmatter pero sin `id`/`nombre` → **el dashboard la descarta entera**
- `id` de marca duplicado → conflicto de sync de Google Drive (`Oca Yary (1).md`); el
  dashboard usa una sola y la otra queda invisible
- Pendiente sin `id`, o con `id` repetido dentro de la marca
- Valor fuera de enum (`prioridad`, `estado`, `rubro`, `tipo` de servicio)
- `hecho: true` junto a un `estado` intermedio
- `proyecto_id` que no resuelve a ningún proyecto de la marca
- `relaciones` / `bloqueado_por` / `servicios_vps` apuntando a ids que no existen
- Fechas que no son `YYYY-MM-DD`

## Qué NO hacer

- **No inventes datos de negocio.** Si no sabés si un evento se publicó o cuánto se cobró,
  dejalo en `vacios_detectados`, no lo completes a ojo.
- **No metas secretos** en el vault (ver `servicios` arriba).
- **No pongas código ni repos** en `Desktop\DA\` — está sincronizado por Google Drive. El
  código va en `C:\Users\ondig\Code\DA\<repo>\`.
- **No borres el body** al actualizar frontmatter, ni al revés.

## Alternativa sin escribir YAML

Si preferís dictarlo: Command Center tiene un **Consultor IA** (tab por marca y
`/ecosystem` a nivel portafolio) con tools de escritura sobre el vault
(`crear_pendiente`, `actualizar_campo`, `marcar_pendiente_hecho`), todas con confirmación
explícita antes de escribir. Escriben con el esquema correcto por construcción.
