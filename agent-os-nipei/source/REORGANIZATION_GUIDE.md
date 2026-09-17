# Guía de Reorganización y Migración Arquitectónica — Nipëi OS

Este documento explica la estrategia de separación de carpetas, aislamiento de Hermes 2.0 y la guía de verificación para cuando se abra el proyecto en la nueva ubicación.

---

## 1. Resumen de lo Realizado

1. **Auditoría y Salud del Vault Comercial**:
   - Se corrigió el frontmatter en `digitalalignment` (`Productos/Rifa Basica.md`).
   - Se renombraron 4 notas de soporte en `Clientes/` con prefijo `_` (`_Conocimiento Faltante - MUV Gráfica.md`, etc.).
   - Verificación con `npm run vault:check`: **0 ERRORS · 0 WARNINGS** (`✔ Sin hallazgos`).

2. **Integración de Archify Engine**:
   - Integrado en la Ficha 360° (`/empresas/[slug]`), Squads Workflow (`/organograma`), Nipëi Memory (`/memory`) y Architecture Delta Studio (`/arquitectura`).

3. **Arquitectura Propuesta de 3 Capas (Aislamiento de Dominios)**:
   - **Capa 1: Repositorios de Clientes DA (`C:\Users\ondig\Code\DA\<repo>`)**
     - Exclusivo para código fuente de clientes (`muv-site`, `oca-yary`, `solta-o-verbo`, `event-master`, `rifa-basica`).
     - Claude Code u otros agentes que entren a `Code\DA\` **nunca** tropezarán con el código o notas de Nipëi OS.
   - **Capa 2: Nipëi OS Core Infrastructure (`C:\Users\ondig\Code\Nipei\`)**
     - `C:\Users\ondig\Code\Nipei\nipei-control` ➔ Aplicación Next.js (sin espacios en la ruta).
     - `C:\Users\ondig\Code\Nipei\nipei-vault` ➔ Vault del Sistema (Squads, RAG, Ingestion, Hermes Sessions).
   - **Capa 3: Business Vault / Obsidian (`C:\Users\ondig\Desktop\DA\digitalalignment`)**
     - Notas de clientes y productos comerciales consumidos por Command Center.

---

## 2. Dónde Leer y Confirmar la Configuración de Conexión

Al abrir Nipëi OS en la nueva ruta `C:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source`, confirma los siguientes puntos en el código:

1. **Ruta del Vault Central (`src/lib/config.ts`)**:
   - Función `defaultVault()`: Debe retornar `C:\Users\ondig\Code\Nipei\nipei-vault`.
2. **Vault Sync Engine (`src/lib/vaultSyncEngine.ts`)**:
   - `VAULT_ROOT`: Debe apuntar a `C:\Users\ondig\Code\Nipei\nipei-vault`.
3. **Hermes RAG Scope (`src/lib/hermesRAG.ts`)**:
   - Búsqueda primaria acotada exclusivamente a `C:\Users\ondig\Code\Nipei\nipei-vault` (`Master_Sources/`, `Ingested_Knowledge/`, `Squads/`).
4. **Dual Vault Resolver (`src/app/api/vault/file/route.ts`)**:
   - Mantiene lectura primaria en `C:\Users\ondig\Code\Nipei\nipei-vault` y lectura secundaria en `C:\Users\ondig\Desktop\DA\digitalalignment`.

---

## 3. Protocolo de Verificación y Salud (Health Check)

Para verificar que el proyecto esté corriendo al 100% y conectado al Vault correcto:

1. **Confirmar Existencia de Rutas**:
   - Comprobar que `C:\Users\ondig\Code\Nipei\nipei-vault` existe en el disco.
2. **Ejecutar Servidor Dev**:
   ```bash
   cd C:\Users\ondig\Code\Nipei\nipei-control\agent-os-nipei\source
   npx next dev -p 3333 -H 127.0.0.1
   ```
3. **Pruebas en Navegador (`http://127.0.0.1:3333`)**:
   - Navegar a `/memory`: Verificar respuesta de Hermes y renderizado de gráficos Archify.
   - Navegar a `/empresas`: Confirmar carga de fichas 360° desde el vault comercial.
   - Navegar a `/arquitectura`: Confirmar funcionamiento del Archify Delta Studio.
   - Navegar a `/organograma`: Confirmar tableros de Squads y Kanban.
