# Analysis: Company Intake & Vault Synchronization Engine

**Author**: Explorer Survey 3 (Vault Synchronization & Parser Specialist)  
**Date**: 2026-09-04  
**Workspace**: `c:\Users\ondig\Code\DA\nipei control`  
**Target Repository**: `agent-os-nipei/source`  
**Vault Reference**: `C:\Users\ondig\Desktop\DA\digitalalignment`  
**Vault Contract**: `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`  

---

## 1. Executive Summary

This report delivers the architectural investigation, schema analysis, and technical design for the **Company Intake & Vault Synchronization Engine** for Nipëi OS. 

The primary business objective is to bridge Nipëi OS (`agent-os-nipei/source`) with the Digital Alignment Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`) — the single source of truth for all brand and company operational states. The engine will:
1. Provide an interactive Company Information Intake system (managing Departments, Roles, Services, Active Clients, Financial Metrics, and Agent Instructions).
2. Auto-parse existing vault client notes (specifically `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md`) to pre-populate Nipëi OS upon startup without file corruption.
3. Establish bidirectional synchronization between the Nipëi OS Agent To-Do / Kanban board and the Obsidian vault's frontmatter `roadmap: [...]` items, strictly adhering to the `da-vault-schema` contract and Command Center compatibility.

---

## 2. Obsidian Vault Structure & `da-vault-schema` Contract

### 2.1 File System & Folder Hierarchy
Inspection of `C:\Users\ondig\Desktop\DA\digitalalignment` revealed the following organization:
```
C:\Users\ondig\Desktop\DA\digitalalignment\
├── Clientes\                           # External client companies
│   ├── Nipeihu.md                     # Live note for Nipeihu (id: nipeihu)
│   ├── Digital Alignment.md           # Live note for mother agency (id: digital-alignment)
│   ├── Ini Rau.md                     # Live note for Inî Rau (id: ini-rau)
│   ├── MUV Grafica.md                 # Live note for MUV Gráfica (id: muv-grafica)
│   ├── Oca Yary.md                    # Live note for Oca Yary (id: oca-yary)
│   ├── Mystical Yoga Farm.md          # Live note for Mystical Yoga Farm
│   ├── Solta o verbo.md               # Live note for Solta o verbo
│   ├── Global Sisterhood.md           # Live note for Global Sisterhood
│   ├── _Ecosistema.md                 # Reserved support note (ignored by brand parser)
│   ├── _Infraestructura.md            # Reserved shared VPS infrastructure catalog
│   └── [Various documentation .md]   # Secondary text notes (ignored if no id/nombre)
├── Productos\                          # Internal DA products (pre-external client)
│   ├── Dalerning.md                   # E-learning platform
│   ├── Event Master.md                # Event ticketing/management platform
│   ├── HotelOS.md                     # Hospitality OS
│   └── Rifa Basica.md                 # Raffle/lottery platform
├── About\                              # Historical dated client audit reports
└── Agentic OS\                         # Historical agent memories & journals
```

### 2.2 Canonical Live Note Anatomy: `Clientes/Nipeihu.md`
Examination of lines 1–143 of `Clientes/Nipeihu.md` established the real-world structure:
```yaml
---
id: nipeihu
nombre: Nipeihu
tipo: cliente_externo
emoji: 🪶
estado: activo
categoria: Proyecto comunitario — Santuario espiritual Yawanawá + bio-laboratorio (Serra Grande, Bahía)
rubro: comunidad_cultura
dominio: nipeihu.org
hosting: Hostinger (DA)
stack:
  - React
  - TypeScript
  - Vite
  - Tailwind
  - Supabase
  - Node.js
  - Vercel
  - Whisper API
relaciones:
  - ini-rau
  - oca-yary
proyectos:
  - nombre: Nipëi OS (Plataforma Duplo Núcleo)
    estado: activo
    objetivo: Sistema operativo centralizado relacional para Nipëi (Flow, People 360, Brain DRE)
  - nombre: Portal nipeihu.org
    estado: activo
    objetivo: Portal ceremonial + dietas Samakey
roadmap:
  - id: nipei-os-duplo-nucleo
    texto: Arquitectura de Duplo Núcleo e Módulos Nipëi Flow, People 360º e Brain DRE no Nipëi OS
    prioridad: alta
    tags: [dev, sistema]
    orden: 0
    hecho: true
    fecha_completado: '2026-08-11'
  - id: kanban-modo-tela-cheia
    texto: Modo Full Page / Tela Cheia Imersiva no Multi-Squad Kanban sem distrações
    prioridad: alta
    tags: [dev, ui]
    orden: 1
    hecho: true
    fecha_completado: '2026-09-04'
  - id: biografias-guardianes
    texto: Completar biografías de los Guardianes (sitio + campañas de recaudación)
    prioridad: alta
    tags: [contenido]
    orden: 3
    hecho: false
historial:
  - fecha: 2026-09-04
    texto: Implementado Modo Tela Cheia Imersiva, Panel de Detalhes...
    tags: [feature, ui, dev]
reporte_md: About/Reporte_nipeihu.md
ultima_sync: '2026-09-04'
---
<!-- agente: antigravity -->

# Nipeihu 🪶
- **Tipo**: Proyecto comunitario — Santuario espiritual Yawanawá + bio-laboratorio (Serra Grande, Bahía)
- **Estado**: 🟢 Activo
...
```

### 2.3 Strict Schema Invariants (`da-vault-schema`)
1. **Mandatory Root Keys**:
   - `id`: Lowercase hyphenated slug (e.g. `nipeihu`). Without this, the note is discarded silently by Command Center.
   - `nombre`: Human-readable display string (e.g. `Nipeihu`).
2. **Closed Enumerations**:
   - `tipo`: `"cliente_externo"` | `"producto_propio"` | `"agencia_madre"`
   - `estado` (brand): `"activo"` | `"transicion"` | `"pausado"` | `"archivado"`
   - `rubro`: `"ecommerce"` | `"turismo_retiros"` | `"comunidad_cultura"` | `"producto_saas"` | `"agencia"`
   - `prioridad`: `"urgente"` | `"alta"` | `"media"` | `"baja"`
   - `estado` (task): `"pendiente"` | `"en_curso"` | `"bloqueada"` | `"esperando_cliente"` | `"hecha"`
   - `tipo` (service): `"wordpress"` | `"hosting"` | `"email"` | `"elearning"` | `"otro"`
   - `estado` (service): `"configurado"` | `"pendiente"`
3. **The Task Invariant**:
   - `hecho: true` is the canonical completion flag.
   - **Crucial Rule**: If `hecho: true`, the `estado` property must either be omitted or set strictly to `"hecha"`. A task with `hecho: true` and an intermediate state like `estado: en_curso` breaks the schema invariant and fails `npm run vault:check`.
4. **Body Markdown Preservation**:
   - Everything below the closing `---` frontmatter delimiter is human/qualitative context.
   - Automated frontmatter sync **MUST NEVER** overwrite, truncate, or wipe the body.
5. **Agent Watermark Convention**:
   - Whenever an Antigravity agent creates or writes a note, `<!-- agente: antigravity -->` must appear as the very first line of the markdown body (immediately after `---`).
6. **Zero Secrets in Vault**:
   - Passwords, API tokens, and secret keys must **never** be written to the YAML frontmatter. Only a reference string (`credencial_ref`) pointing to encrypted external storage is permitted.
7. **Evolutionary Schema (`extra`)**:
   - Any operational fields specific to Nipëi OS that are not part of the standard Command Center root keys are stored and preserved in the YAML without breaking Command Center.

---

## 3. Current State of `agent-os-nipei/source`

### 3.1 Dependencies & Runtime Environment
- **Framework**: Next.js 16.2.6 (React 19.2.4) with Node.js runtime for API routes.
- **YAML Parser**: `js-yaml` (`^4.1.1`) and `@types/js-yaml` are **already installed** in `package.json`.
- **Styling & UI**: Tailwind CSS v4, Lucide React icons, Framer Motion.

### 3.2 Existing File Access & API Patterns
1. **`src/lib/config.ts`**:
   - Central path resolver using environment variables and `~/.nipei-os/config.json`.
   - **Gap Detected**: `defaultVault()` in `config.ts` only searches `Documents/Obsidian Vault`, `Obsidian`, etc. It does not look for `C:\Users\ondig\Desktop\DA\digitalalignment` by default unless `AGENTIC_OS_VAULT` is set.
   - **Fix Required**: Update default path resolution to check `path.join(os.homedir(), "Desktop", "DA", "digitalalignment")`.
2. **`src/lib/vault.ts`**:
   - Currently implements only raw text searching (`searchNotes`, `readNote`, `listNotes`).
   - Lacks frontmatter parsing, YAML serialization, or structured brand entity awareness.
3. **`src/lib/vaultWriter.ts`**:
   - Appends text notes to `Nipei OS/Memories/`, `Nipei OS/Journal/`, and `Nipei OS/Goals.md`.
   - Does not interact with `Clientes/` or `Productos/` brand notes.
4. **`src/app/api/todos/route.ts`**:
   - Persists daily JSON files to `~/.nipei-os/todos/YYYY-MM-DD.json`.
   - Uses an atomic write pattern (`file + .tmp`, followed by `fs.rename`, plus `.prev` backup) and serialized promise execution to prevent race conditions.
5. **`src/app/api/agent-kanban/state/route.ts`**:
   - Reads/writes board cards to `~/.nipei-os/agent-kanban/board.json`.
6. **`src/components/SquadKanbanView.tsx` & `OrganogramaView.tsx`**:
   - Currently initialized with static mock arrays (`INITIAL_TASKS`, `SQUADS`, `ORGANIGRAM_DATA`) from `src/lib/nipeiStore.ts`.
   - No dynamic loading from the Obsidian vault yet exists.

---

## 4. Company Intake & Vault Synchronization Engine Design

```
+-----------------------------------------------------------------------------------+
|                                  NIPËI OS UI                                      |
|                                                                                   |
|  +------------------------------+       +--------------------------------------+  |
|  |     Company Intake View      |       |      Agent To-Do / Kanban View       |  |
|  |  - Profile & Identity        |       |  - Triage / Backlog                  |  |
|  |  - 7 Squads & Duplo Núcleo   |       |  - In Progress                       |  |
|  |  - Roles & Pajé / Agent Veto |       |  - AI Agent Executing                |  |
|  |  - Services & VPS Access     |       |  - Review & Veto Gate                |  |
|  |  - DRE Financial Policies    |       |  - Done (hecho: true)                |  |
|  |  - Agent Guardrails          |       |                                      |  |
|  +--------------+---------------+       +-------------------+------------------+  |
+-----------------|-------------------------------------------|---------------------+
                  |                                           |
                  | GET / POST                                | GET / POST
                  v                                           v
+-----------------------------------------------------------------------------------+
|                              BACKEND API ROUTES                                   |
|                                                                                   |
|     /api/vault/company                      /api/agents-todo (or /agent-kanban)    |
|   (Profile, Squads, Roles,                 (Task creation, status movement,       |
|    Services, DRE, Instructions)             execution logs, comments)             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        VAULT SYNCHRONIZATION ENGINE                               |
|                         (src/lib/vaultEngine.ts)                                  |
|                                                                                   |
|  1. Safe Vault Path Discovery (Auto-detects Desktop/DA/digitalalignment)          |
|  2. Strict da-vault-schema Validator (Enums, Task Invariants, Required Fields)    |
|  3. Safe Frontmatter Splitter & YAML Formatter (js-yaml)                          |
|  4. Body Markdown Preservation & Watermark Injector (<!-- agente: antigravity -->)|
|  5. Atomic Persistence (tmp -> rename + .bak safety copy)                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      OBSIDIAN VAULT (SOURCE OF TRUTH)                             |
|                                                                                   |
|   C:\Users\ondig\Desktop\DA\digitalalignment\                                     |
|   ├── Clientes\Nipeihu.md            (id: nipeihu, roadmap, proyectos, services)  |
|   ├── Clientes\Digital Alignment.md  (id: digital-alignment, mother agency state) |
|   ├── Clientes\Ini Rau.md            (id: ini-rau, botica e-commerce)             |
|   └── Clientes\_Infraestructura.md   (VPS shared infra services)                  |
+-----------------------------------------------------------------------------------+
```

### 4.1 UI Specification: Interactive Company Intake System

The Company Intake system should be implemented as an interactive wizard / multi-tab management interface (`/company-intake` or integrated into `/organograma` and settings) comprising 6 structured sections:

#### Section 1: Company Profile & Identity
- **Company Slug (`id`)**: Lowercase alphanumeric string with hyphens (e.g. `nipeihu`).
- **Company Name (`nombre`)**: Official name (e.g. `Nipeihu`).
- **Entity Type (`tipo`)**: Dropdown matching enum: `cliente_externo` | `producto_propio` | `agencia_madre`.
- **Status (`estado`)**: Dropdown matching enum: `activo` | `transicion` | `pausado` | `archivado`.
- **Emoji (`emoji`)**: Visual brand symbol (e.g. `🪶`).
- **Category (`categoria`)**: Descriptive mission statement.
- **Industry / Rubro (`rubro`)**: Closed enum dropdown: `comunidad_cultura`, `ecommerce`, `turismo_retiros`, `producto_saas`, `agencia`.
- **Digital Footprint**: `dominio` (e.g. `nipeihu.org`), `hosting` (e.g. `Hostinger (DA)`).
- **Repositories**: `repo_github`, `repo_local`.
- **Technology Stack (`stack`)**: Interactive tag input (e.g. `React`, `TypeScript`, `Vite`, `Tailwind`, `Supabase`, `Node.js`, `Vercel`, `Whisper API`).
- **Ecosystem Relations (`relaciones`)**: Multi-select linking to other vault IDs (`ini-rau`, `oca-yary`, `muv-grafica`).

#### Section 2: Departments & Squads (Organizational Structure)
- **Duplo Núcleo Governance Architecture**:
  - **Núcleo Sagrado**: Cultural preservation, ritual harvesting, ethical origin validation, Pajé veto.
  - **Núcleo Comercial**: E-commerce, logistics, retreats, marketing, finance, infrastructure.
- **Squad Configurations (Squads I through VII)**:
  - Squad ID, Name, Description, and Icon.
  - Primary Nucleus assignment (`sagrado` vs `comercial`).
  - Key Responsibilities (list of operational domains).
  - Target KPIs & OKRs (e.g. `Alinhamento Ético: 100%`, `Retorno ROI: 3.4x`).

#### Section 3: Roles & Team Members
- **Team Roster**:
  - Name, Title, and Squad assignment.
  - Member Classification:
    - `paje`: Spiritual and ancestral leaders (e.g. Pajé Hushahu Yawanawá, Cacica Mariazinha).
    - `human_lead`: Operational and executive leaders (e.g. Ana Castro, Jordão Pekûti).
    - `agent`: Dedicated AI agents.
- **Authority & Governance Gates**:
  - `Ethical Veto Gate`: Ability to block commercial release of harvested medicines (`VETADO_NUCLEO_SAGRADO`).
  - `Ethical Origin Certification`: Authority to sign commercial release certificates (`APROVADO_COMERCIAL`).

#### Section 4: Services & Infrastructure Accesses
- **Brand-Specific Services (`servicios`)**:
  - `id`: Unique slug.
  - `tipo`: Closed enum: `wordpress` | `hosting` | `email` | `elearning` | `otro`.
  - `nombre`, `url`, `usuario`.
  - `credencial_ref`: Secure token reference (strictly forbidding raw passwords in frontmatter).
  - `estado`: `configurado` | `pendiente`.
- **Shared VPS Infrastructure (`servicios_vps`)**:
  - Checkboxes referencing shared services defined in `_Infraestructura.md`:
    - `n8n-panter` (Central workflow orchestrator)
    - `evolution-muv` (WhatsApp Evolution API gateway)
    - `rembg-panter` (Background removal microservice)
    - `openclaw` (VPS automated agent)

#### Section 5: Financial Metrics & Commercial Policies (DRE)
- **Cost Center Allocation**:
  - Pre-configured centers: `Inî Rau E-Commerce`, `Dietas Samakey`, `Instituto Mutum`, `Infraestrutura Serra Grande`.
- **Sacred Fund Repasse Formula**:
  - Explicit rule stipulating direct revenue transfer percentages (e.g. 100% net surplus from botica products transferred to Aldeia Mutum Village Association).
- **Project Budget Approximations (`presupuesto_aprox`)**:
  - Associated with specific lines of work in `proyectos: [...]`.

#### Section 6: Agent Instructions & System Guardrails
- **Assigned Agent Matrix**:
  - Definition of agent roles and binary configurations:
    - **Antigravity CLI** (`agy`): Master orchestrator, Ethical Veto Gate inspector, DRE balance validator.
    - **Hermes CLI** (`hermes`): Memory continuity, cross-session synthesis, SQLite kanban bridge.
    - **Claude Code CLI** (`claude`): Full-stack developer, UI refactoring, contract compliance.
    - **OpenClaw CLI** (`openclaw`): Local gateway, field audio OCR, inventory batch tracker.
- **Operational Guardrails**:
  - "Never bypass ethical veto certification."
  - "Never persist plaintext credentials into markdown files."
  - "Always verify `da-vault-schema` before committing changes to Obsidian."

---

### 4.2 Data Models & TypeScript Interfaces

To ensure strict compliance with `da-vault-schema` while supporting all Nipëi OS operational features, the engine will use the following TypeScript definitions:

```typescript
// src/lib/vaultSchema.ts

export type BrandTipo = "cliente_externo" | "producto_propio" | "agencia_madre";
export type BrandEstado = "activo" | "transicion" | "pausado" | "archivado";
export type BrandRubro = "ecommerce" | "turismo_retiros" | "comunidad_cultura" | "producto_saas" | "agencia";
export type Prioridad = "urgente" | "alta" | "media" | "baja";
export type TareaEstado = "pendiente" | "en_curso" | "bloqueada" | "esperando_cliente" | "hecha";
export type ServicioTipo = "wordpress" | "hosting" | "email" | "elearning" | "otro";
export type ServicioEstado = "configurado" | "pendiente";

export interface VaultRoadmapItem {
  id: string;                         // Required unique slug
  texto: string;                      // Task title / description
  prioridad?: Prioridad;
  tags?: string[];
  orden?: number;
  hecho?: boolean;                    // Canonical completion flag
  proyecto_id?: string;
  estado?: TareaEstado;               // Must be omitted or "hecha" if hecho: true!
  fecha_limite?: string;              // YYYY-MM-DD
  responsable?: string;
  bloqueado_por?: string[];
  fecha_creacion?: string;            // YYYY-MM-DD
  fecha_completado?: string;          // YYYY-MM-DD
}

export interface VaultProyecto {
  id?: string;
  nombre: string;
  estado?: string;
  objetivo?: string;
  tecnologias?: string[];
  presupuesto_aprox?: number | null;
}

export interface VaultServicioItem {
  id: string;
  tipo: ServicioTipo;
  nombre: string;
  url?: string;
  usuario?: string;
  credencial_ref?: string;            // Reference key ONLY, never raw password
  estado?: ServicioEstado;
}

export interface VaultHistorialItem {
  fecha: string;                      // YYYY-MM-DD
  texto: string;
  tags?: string[];
}

export interface VaultBrandData {
  id: string;                         // Mandatory slug
  nombre: string;                     // Mandatory name
  tipo: BrandTipo;
  emoji?: string;
  estado?: BrandEstado;
  categoria?: string;
  rubro?: BrandRubro;
  dominio?: string;
  hosting?: string;
  repo_github?: string;
  repo_local?: string;
  stack?: string[];
  canales_adquisicion?: string[];
  vacios_detectados?: string[];
  relaciones?: string[];
  servicios_vps?: string[];
  notebook_id?: string;
  reporte_md?: string;
  ultima_sync?: string;               // YYYY-MM-DD
  proyectos?: VaultProyecto[];
  roadmap?: VaultRoadmapItem[];
  servicios?: VaultServicioItem[];
  historial?: VaultHistorialItem[];
  extra?: Record<string, unknown>;    // Evolutionary extension
}

export interface ParsedBrandNote {
  data: VaultBrandData;
  body: string;
  sourcePath: string;
  folder: "Clientes" | "Productos";
}
```

---

### 4.3 Vault Synchronization Engine Architecture (`vaultEngine.ts`)

The synchronization engine operates directly on the local file system using the following design principles:

#### 1. Path Resolution
```typescript
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export function resolveVaultRoot(): string {
  const candidates = [
    process.env.AGENTIC_OS_VAULT,
    path.join(os.homedir(), "Desktop", "DA", "digitalalignment"),
    "C:\\Users\\ondig\\Desktop\\DA\\digitalalignment",
    path.join(os.homedir(), "Documents", "Obsidian Vault"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Obsidian vault directory not found.");
}
```

#### 2. Clean Frontmatter Splitting & YAML Extraction
```typescript
import * as yaml from "js-yaml";

export function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } | null {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return null;
  
  const yamlBlock = raw.slice(raw.indexOf("\n", 0) + 1, end);
  const body = raw.slice(end + 4).replace(/^\r?\n+/, "");
  
  let data: unknown;
  try {
    data = yaml.load(yamlBlock);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  return { data: data as Record<string, unknown>, body };
}
```

#### 3. Atomic Write with Watermarking & Body Preservation
```typescript
export async function writeBrandNote(
  brandId: string,
  updatedFrontmatter: Partial<VaultBrandData>,
  optionalNewBody?: string
): Promise<void> {
  const vaultRoot = resolveVaultRoot();
  // Locate existing note in Clientes or Productos
  let folder: "Clientes" | "Productos" = "Clientes";
  let notePath = path.join(vaultRoot, "Clientes", `${brandId}.md`);
  
  if (!fs.existsSync(notePath)) {
    const altPath = path.join(vaultRoot, "Clientes", "Nipeihu.md");
    if (brandId === "nipeihu" && fs.existsSync(altPath)) {
      notePath = altPath;
    } else {
      // Check Productos
      const prodPath = path.join(vaultRoot, "Productos", `${brandId}.md`);
      if (fs.existsSync(prodPath)) {
        notePath = prodPath;
        folder = "Productos";
      }
    }
  }

  const raw = await fs.promises.readFile(notePath, "utf8");
  const split = splitFrontmatter(raw);
  if (!split) throw new Error(`Invalid frontmatter in note: ${notePath}`);

  // Enforce schema compliance on roadmap items
  const roadmap = (updatedFrontmatter.roadmap ?? (split.data.roadmap as VaultRoadmapItem[]) ?? []).map((item) => {
    if (item.hecho) {
      // Invariant: delete intermediate status or set to "hecha"
      const { estado, ...rest } = item;
      return { ...rest, hecho: true, estado: "hecha" as const };
    }
    return item;
  });

  const mergedData: Record<string, unknown> = {
    ...split.data,
    ...updatedFrontmatter,
    roadmap,
    ultima_sync: new Date().toISOString().slice(0, 10),
  };

  const yamlBlock = yaml.dump(mergedData, { lineWidth: 100, noRefs: true, quotingType: '"' });
  
  // Ensure watermark exists in the body
  let finalBody = optionalNewBody !== undefined ? optionalNewBody : split.body;
  if (!finalBody.includes("<!-- agente: antigravity -->") && !finalBody.includes("<!-- agente: claude-code -->")) {
    finalBody = `<!-- agente: antigravity -->\n\n${finalBody}`;
  }

  const outputContent = `---\n${yamlBlock}---\n\n${finalBody}`;

  // Atomic file write: .tmp -> rename, with .bak backup
  const tmpPath = `${notePath}.tmp`;
  const bakPath = `${notePath}.bak`;
  await fs.promises.writeFile(tmpPath, outputContent, "utf8");
  await fs.promises.copyFile(notePath, bakPath).catch(() => {});
  await fs.promises.rename(tmpPath, notePath);
}
```

---

### 4.4 Automated Vault Parsing & Pre-Population on Startup

When Nipëi OS starts up (or when the user accesses the board or company management):
1. **Source Discovery**: The engine automatically inspects `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md`.
2. **Entity Extraction**:
   - `nombre`, `categoria`, `rubro`, `emoji`, `stack`, `relaciones` are loaded into the Nipëi OS global store.
   - `proyectos: [...]` are mapped to the active project list.
   - `roadmap: [...]` items are mapped to the Nipëi OS Kanban board:
     - `hecho: true` -> mapped to column `done`.
     - `hecho: false` and `estado: "en_curso"` -> mapped to column `in_progress`.
     - `hecho: false` and `estado: "bloqueada"` or `"esperando_cliente"` -> mapped to column `review`.
     - `hecho: false` and assigned to an agent -> mapped to column `agent_executing`.
     - `hecho: false` and no intermediate status -> mapped to column `todo` or `triage`.
     - `tags` are mapped to corresponding squad affiliations (e.g. `[dev]` -> `squad_1_ceo`, `[botica]` -> `squad_2_mutum`, `[infraestructura]` -> `squad_6_infra`).
3. **Local Cache Persistence**:
   - The aggregated parsed data is written to `~/.nipei-os/company-cache.json` for rapid subsequent boots and offline reliability.

---

## 5. Architectural Verification & Zero-Corruption Guarantees

| Potential Risk | Mitigation Mechanism | Verification Step |
|---|---|---|
| **Accidental body markdown wipe** | Frontmatter is split cleanly from the body via `splitFrontmatter`. Only the YAML block between the first two `---` delimiters is reconstructed; the body is appended untouched. | Unit test verifying identical body string before and after sync. |
| **Command Center parsing failure** | Strict enforcement of `id` and `nombre`, closed enums, and valid `YYYY-MM-DD` dates. | Run `npm run vault:check` in `command-center`; must return 0 errors. |
| **Task state contradiction** | Sanitizer automatically cleanses intermediate `estado` whenever `hecho === true`. | Automated invariant check during serialization. |
| **Concurrent write race condition** | Promise serialization chain (`serialize()`) + atomic write via `${file}.tmp` and rename. | Concurrent simulated requests verify zero file locking errors or torn writes. |
| **Credential leak** | Sanitizer strips raw secret fields and validates that only `credencial_ref` is present. | Regex audit for secret patterns before disk write. |

---

## 6. Recommended Next Steps for Implementation

1. **Implement `src/lib/vaultSyncEngine.ts`**: Core module containing schema validation, file reading, atomic writing, and markdown body preservation.
2. **Implement API Routes**:
   - `src/app/api/vault/company/route.ts`: Endpoints for fetching parsed brand notes and updating company operational state.
   - `src/app/api/agents-todo/route.ts`: Endpoints for Kanban task status updates synced directly with `roadmap: [...]`.
3. **Implement UI Views**:
   - `src/app/company-intake/page.tsx`: Interactive multi-section wizard for complete company intake.
   - Update `src/components/Sidebar.tsx` to include navigation links for **Company Intake** and **Agent To-Do**.
   - Connect `SquadKanbanView` to fetch and persist tasks dynamically via the vault sync engine.
