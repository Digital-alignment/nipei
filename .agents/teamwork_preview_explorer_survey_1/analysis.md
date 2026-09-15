# Frontend & Navigation Architectural Analysis — Nipëi OS

**Explorer Survey 1**: Frontend & Navigation Architect  
**Target Codebase**: `c:\Users\ondig\Code\DA\nipei control\agent-os-nipei\source`  
**Reference Request**: `.agents/ORIGINAL_REQUEST.md`  
**Vault Source of Truth**: `C:\Users\ondig\Desktop\DA\digitalalignment` & `C:\Users\ondig\.claude\skills\da-vault-schema\SKILL.md`  
**Date**: September 2026  

---

## 1. Executive Summary & Mission Context

This analysis provides the complete architectural blueprint for integrating:
1. **R1: Agent To-Do & Kanban Dashboard (`/agents-todo`)**: An interactive task board with 4 workflow columns (`Backlog`, `In Progress`, `Review`, `Done`), agent CLI assignment (`Claude Code`, `OpenClaw`, `Hermes`, `Custom`), priority badges, live execution log inspection, multi-criteria filtering/sorting, and dual-layer persistence.
2. **R2: Company Information Intake & Vault Synchronization Engine (`/company-intake`)**: An interactive structured wizard/form allowing operators to manage company profiles, client accounts, team/agent roles, and operational procedures, persisting data in strict compliance with the `da-vault-schema` contract into `C:\Users\ondig\Desktop\DA\digitalalignment`.
3. **R3: Automated Vault Parsing & Pre-population**: An automated server-side parser reading existing Obsidian markdown notes (such as `Clientes/Nipeihu.md` and `Clientes/Digital Alignment.md`) to pre-populate Nipëi OS state on load.

---

## 2. Framework & TypeScript Architecture

### 2.1 Core Framework & Runtime
- **Next.js Version**: `16.2.6` (App Router architecture).
- **React Version**: `19.2.4` and `react-dom: 19.2.4`.
- **Node Runtime**: Configured for Node.js server execution (`export const runtime = "nodejs";`, `export const dynamic = "force-dynamic";`).
- **Configuration (`next.config.ts`)**:
  ```ts
  import type { NextConfig } from "next";
  import path from "path";

  const nextConfig: NextConfig = {
    turbopack: {
      root: path.resolve(__dirname),
    },
  };
  export default nextConfig;
  ```
- **Execution Engine**: Turbopack-enabled bundler with incremental compilation.

### 2.2 TypeScript Configuration (`tsconfig.json`)
- **TypeScript Version**: `^5.0.0`.
- **Target**: `ES2017`.
- **Module & Resolution**: `"module": "esnext"`, `"moduleResolution": "bundler"`.
- **Strict Mode**: `"strict": true`, `"skipLibCheck": true`.
- **Path Aliases**:
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- **Included Paths**: App Router types (`.next/types/**/*.ts`), source `.ts` and `.tsx` files.

### 2.3 Application Directory Layout & Routing
```
agent-os-nipei/source/
├── src/
│   ├── app/                      # Next.js App Router root
│   │   ├── layout.tsx            # Global RootLayout (Geist fonts, Shell wrapper)
│   │   ├── globals.css           # Tailwind v4 theme + Matrix Solid Design System
│   │   ├── page.tsx              # Root dashboard ("/") -> <Overview />
│   │   ├── api/                  # 60+ API route handlers (JSON API)
│   │   │   ├── todos/            # Existing simple daily todo API
│   │   │   ├── agent-kanban/     # Local agent planner/builder API
│   │   │   ├── memory/           # Vault note reading / searching
│   │   │   └── ...
│   │   ├── agent-kanban/         # Multi-Squad Kanban route
│   │   ├── kanban/               # Hermes Kanban route
│   │   ├── organograma/          # Dual-Nucleus organogram route
│   │   ├── flow/                 # Supply chain & inventory route
│   │   ├── people/               # CRM 360 & health anamnesis route
│   │   ├── brain/                # Governance & DRE real-time route
│   │   └── ... (50+ routes)
│   ├── components/               # Reusable React client & server components
│   │   ├── Shell.tsx             # Main chrome layout wrapper
│   │   ├── Sidebar.tsx           # Primary collapsible navigation sidebar + MobileNav
│   │   ├── TopBar.tsx            # Route header, breadcrumb titles, CommandPalette
│   │   ├── CommandPalette.tsx    # cmdk-based agent action trigger
│   │   ├── AgentAvatar.tsx       # Real agent brand avatar icons
│   │   ├── SquadKanbanView.tsx   # Complex multi-squad task board
│   │   ├── TodoPanel.tsx         # Daily todo interactive list
│   │   └── ...
│   └── lib/                      # Core business logic, storage & config
│       ├── config.ts             # Global path resolution & environment configuration
│       ├── vault.ts              # Obsidian vault reading & full-text search
│       ├── vaultWriter.ts        # Obsidian vault atomic markdown writer
│       ├── kanban.ts             # Hermes kanban types and column constants
│       └── nipeiStore.ts         # In-memory store, Squads metadata, GlobalTask types
```

---

## 3. Navigation Panel & View Registration Architecture

Views in Nipëi OS are registered across three complementary navigation structures:

### 3.1 Primary Sidebar (`src/components/Sidebar.tsx`)
The sidebar controls desktop navigation (`w-[244px]` expanded, `w-[68px]` collapsed) and mobile navigation (`MobileNav` docked at screen bottom).

1. **Navigation Item Schema**:
   ```ts
   interface NavItem {
     href: string;
     label: string;
     icon: ReactNode;
     accent: string;
     dim: string;
   }
   ```
2. **Section Categorization Engine**:
   Items are grouped dynamically into 4 visual sections via `sectionOf(href)`:
   - **`Workspace`**: High-level platform operations (`/`, `/organograma`, `/flow`, `/people`, `/brain`).
   - **`Agent Orchestration`**: Cross-agent workflows (`/paperclip`, `/room`, `/pipeline`, `/agent-kanban`).
   - **`Agents`**: Dedicated CLI channels (`/claude`, `/openclaw`, `/hermes`, `/antigravity`, `/codex`, etc.).
   - **`Self`**: Tools and personal pipelines (`/loop`, `/seo`, `/opendesign`, `/kanban`, `/notebook`, `/memory`).
3. **Local Storage Customization**:
   User ordering and hidden state are stored in `localStorage`:
   - `agentos.sidebar.order`: User drag-and-drop order array.
   - `agentos.sidebar.hidden`: Array of hidden route paths.
   - `agentos.sidebar.collapsed`: Boolean collapse toggle.

### 3.2 Dynamic Header (`src/components/TopBar.tsx`)
Whenever a route activates, `TopBar` displays the chapter metadata from `TITLES: Record<string, PageMeta>`:
```ts
interface PageMeta {
  numeral: string;  // e.g. "VIII·b." or "I·e." (Caveat font)
  label: string;    // e.g. "Agent · To-Do" (Manrope uppercase tracking)
  title: string;    // e.g. "Agent Task Management & Kanban"
  sub: string;      // Detailed context description
}
```

### 3.3 Command Palette (`src/components/CommandPalette.tsx`)
Triggered globally via `⌘K` or `Ctrl+K`. Built on `cmdk` (v1.1.1) and `framer-motion` (v12.38.0), providing instant execution and diagnostics across agent CLIs (`claude`, `openclaw`, `hermes`).

---

## 4. Styling System & UI Component Hierarchy

### 4.1 Tailwind CSS v4 Architecture
The project runs Tailwind CSS v4 using the modern PostCSS plugin (`@tailwindcss/postcss`).
- Main stylesheet: `src/app/globals.css`.
- Core directive: `@import "tailwindcss";` followed by `@theme inline`.

### 4.2 The "Solid Dark & Dark Green Matrix" Design System
Nipëi OS strictly enforces a **Solid Dark & Dark Green Matrix** visual theme.
**Golden Rule**: *Strictly Solid Colors, No Gradients.*

Key CSS variables defined in `:root`:
```css
/* Backgrounds */
--bg-deep:    #050805; /* Deepest matrix canvas */
--bg-mid:     #0a110a; /* Sidebar, header bars */
--bg-card:    #0f190f; /* Standard surface card */
--bg-elev:    #162416; /* Hover / elevated surfaces */

/* Foregrounds & Creams */
--cream:      #e2f7e2; /* Primary high-contrast text */
--cream-soft: #a7f3d0; /* Subtitles and secondary labels */
--cream-dim:  #4ade80; /* Dim labels, section badges */
--cream-mute: #166534; /* Muted borders and inactive icons */

/* Accents */
--gold:       #22c55e; /* Primary system green / highlight */
--emerald:    #22c55e; /* Success / Done state */
--rust:       #f59e0b; /* In Progress / Warning */
--plum:       #ef4444; /* Urgent / Blocked */

/* Borders */
--line:       #1e381e; /* Standard card and panel border */
--line-soft:  #142414; /* Subtle divider border */
--line-deep:  #0a140a; /* Recessed border */

/* Agent Brand Identifiers */
--claude:     #f59e0b; /* Amber/Orange */
--openclaw:   #ef4444; /* Rose/Red */
--hermes:     #4ade80; /* Light Blue / Green */
--antigravity:#7c3aed; /* Deep Purple */
```

### 4.3 Typography
1. **Display Headings**: `Bricolage Grotesque` (loaded via Google Fonts).
2. **Body & Interface**: `Manrope` (clean, highly legible sans-serif).
3. **Numerals & Monospace**: `JetBrains Mono` (code, timestamps, metrics, IDs).
4. **Script Numerals / Accents**: `Caveat` (used for Roman numeral chapters in `.eyebrow`).

### 4.4 Component Primitives
- `.surface-card`: Solid `#0f190f` background, `#142414` border, `#162416` hover.
- `.action-card`: Interactive card with transition, hover elevation, active border `#22c55e`.
- `.status-pill`: Rounded pill with dot prefix for status display.
- `.eyebrow`: Flex container displaying numeral, divider line, and uppercase label.
- Iconography: `lucide-react` (v1.16.0).
- Component Library Note: There is **no external dependency** on `@shadcn/ui` or `@radix-ui/*`. All components are custom crafted using native HTML5 elements styled with Tailwind utility classes and CSS variables.

---

## 5. Route Integration Blueprints

### 5.1 Route R1: `/agents-todo` (Interactive Task Board)

#### File Structure
```
src/
├── app/
│   ├── agents-todo/
│   │   └── page.tsx                     # Server component route entry
│   └── api/
│       └── agents-todo/
│           └── route.ts                 # Full CRUD & atomic mutation API
└── components/
    └── agents-todo/
        ├── AgentsTodoView.tsx           # Master view container with full screen toggle
        ├── TaskKanbanBoard.tsx          # 4-column drag-or-click interactive board
        ├── TaskCard.tsx                 # Individual task card with agent badge & priority
        ├── TaskModal.tsx                # Task create / edit modal
        ├── TaskLogDrawer.tsx            # Expandable execution log viewer
        └── TaskFilterBar.tsx            # Agent filter, priority filter, search input
```

#### Registration Checklist
1. **Sidebar (`src/components/Sidebar.tsx`)**:
   - Add to `NAV`:
     ```ts
     { href: "/agents-todo", label: "Agent To-Do", icon: <CheckSquare size={16} />, accent: "#22c55e", dim: "rgba(34,197,94,0.2)" }
     ```
   - Add `/agents-todo` to `ORCHESTRATION_ROUTES`.
2. **TopBar (`src/components/TopBar.tsx`)**:
   - Add to `TITLES`:
     ```ts
     "/agents-todo": {
       numeral: "VIII·b.",
       label: "Agent · Task Board",
       title: "Agent To-Do & Mission Kanban",
       sub: "Interactive task orchestrator with CLI agent assignment, priority tracking, and live audit logs."
     }
     ```
3. **Command Palette (`src/components/CommandPalette.tsx`)**:
   - Register quick action: `"Open Agent To-Do Board"` (`href: "/agents-todo"`).

---

### 5.2 Route R2: `/company-intake` (Company Information Intake & Vault Sync)

#### File Structure
```
src/
├── app/
│   ├── company-intake/
│   │   └── page.tsx                     # Server component route entry
│   └── api/
│       ├── company-intake/
│       │   └── route.ts                 # Form submission & vault sync endpoint
│       └── vault/
│           └── parse/
│               └── route.ts             # Pre-population note reader (Nipeihu.md, etc.)
└── components/
    └── company-intake/
        ├── CompanyIntakeWizard.tsx      # Multi-step / tabbed intake manager
        ├── SectionProfile.tsx           # Company Profile (Name, ID, Rubro, Domain)
        ├── SectionClients.tsx           # Active Clients & Ecosistema Accounts
        ├── SectionRoles.tsx             # Departments, Human Leads, Agent Roles
        ├── SectionProcedures.tsx        # Operational Rules, Financial Targets, Prompts
        └── VaultSyncStatus.tsx          # Live Obsidian write-status & diff verification
```

#### Registration Checklist
1. **Sidebar (`src/components/Sidebar.tsx`)**:
   - Add to `NAV`:
     ```ts
     { href: "/company-intake", label: "Company Intake", icon: <Building2 size={16} />, accent: "#4ade80", dim: "rgba(74,222,128,0.2)" }
     ```
   - Section mapped to `"Workspace"` in `sectionOf(href)`.
2. **TopBar (`src/components/TopBar.tsx`)**:
   - Add to `TITLES`:
     ```ts
     "/company-intake": {
       numeral: "I·e.",
       label: "Governança · Intake",
       title: "Company Information Intake & Vault Sync",
       sub: "Structured intake for company profiles, client accounts, team roles, and Obsidian vault state."
     }
     ```

---

## 6. Detailed Requirements for the Interactive Task Board

### 6.1 Column Architecture (4 Columns)
Per Requirement R1:
| Column ID | Display Label | Solid Color | Border Color | Background Color | Description |
|-----------|---------------|-------------|--------------|------------------|-------------|
| `backlog` | **Backlog** | `#94a3b8` | `#1e293b` | `#080d08` | Queued tasks, feature requests, pending intake items |
| `in_progress` | **In Progress** | `#fbbf24` | `#4a3c10` | `#1f1908` | Active development, agent running, or human execution |
| `review` | **Review** | `#38bdf8` | `#16385c` | `#081524` | Code review, ethical audit, quality gate verification |
| `done` | **Done** | `#22c55e` | `#1e381e` | `#091e09` | Shipped, verified, committed to vault / repository |

### 6.2 Agent Assignment Dropdown
Tasks must support assignment to any of the four designated agent CLI categories:
1. **Claude Code** (`claude`):
   - Identifier: `"claude"`
   - Display Label: `Claude Code`
   - Brand Color: `#f59e0b` (`--claude`)
   - Visual: `<AgentAvatar agent="claude" size={18} />`
2. **OpenClaw** (`openclaw`):
   - Identifier: `"openclaw"`
   - Display Label: `OpenClaw`
   - Brand Color: `#ef4444` (`--openclaw`)
   - Visual: `<AgentAvatar agent="openclaw" size={18} />`
3. **Hermes** (`hermes`):
   - Identifier: `"hermes"`
   - Display Label: `Hermes`
   - Brand Color: `#4ade80` (`--hermes`)
   - Visual: `<AgentAvatar agent="hermes" size={18} />`
4. **Custom** (`custom`):
   - Identifier: `"custom"`
   - Display Label: `Custom Agent` (allows typing a custom binary name, e.g. `antigravity`, `codex`, `kimi`, `glm`, or custom shell script)
   - Brand Color: `#a855f7`
   - Visual: Generic robot/terminal glyph with custom label badge.

### 6.3 Priority System & Badges
| Priority ID | Label | Accent Color | Solid Pill Style |
|-------------|-------|--------------|------------------|
| `urgent` | URGENTE | `#ef4444` | `bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444]` |
| `high` | ALTA | `#f59e0b` | `bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b]` |
| `medium` | MÉDIA | `#38bdf8` | `bg-[#38bdf8]/20 border border-[#38bdf8] text-[#38bdf8]` |
| `low` | BAIXA | `#4ade80` | `bg-[#4ade80]/20 border border-[#4ade80] text-[#4ade80]` |

### 6.4 Execution Log Viewer (Audit Trail)
- **Data Model**: `executionLogs?: string[]` on each task.
- **UI Interface**: Slide-over drawer or modal tab.
- **Features**:
  - Timestamped entries: `[YYYY-MM-DD HH:mm:ss] [AGENT:claude] Output message...`
  - High-contrast monospace font (`font-mono text-[12px]`).
  - Terminal-like solid dark background (`#050805`, border `#1e381e`).
  - One-click **Copy All Logs** button.
  - Clear / Append log action.

### 6.5 Filtering, Searching & Sorting Controls
- **Agent Filter**: Tabs or pill-select for `[All Agents, Claude Code, OpenClaw, Hermes, Custom]`.
- **Priority Filter**: Multi-select or dropdown `[All Priorities, Urgent, High, Medium, Low]`.
- **Search Input**: Live instant search matching `title`, `description`, `tags`, or `id`.
- **Sort Options**:
  - `Priority (Highest first)`
  - `Due Date (Earliest first)`
  - `Last Modified (Newest first)`
  - `Alphabetical (A - Z)`

### 6.6 State Management & Dual Persistence Engine
1. **Client State**:
   - `useState` + optimistic updates: immediate card movement between columns without UI freeze.
   - `localStorage` caching (`nipei-os/agents-todo/cache`) for instant paint before API response.
2. **Server Storage**:
   - Dedicated JSON store at `~/.nipei-os/agents-todo.json`.
   - Atomic file write pattern (`.tmp` write followed by atomic `rename` and `.prev` single-level backup, matching `src/app/api/todos/route.ts`).
   - Concurrency serialization via Promise chain to avoid race conditions.
3. **Vault Sync Bridge**:
   - Synchronizes completed or high-priority tasks with the Obsidian vault's `Goals.md` or client note frontmatter `roadmap[]`.

---

## 7. Company Information Intake & Vault Synchronization Engine

### 7.1 Compliance with `da-vault-schema` Contract
The Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`) is the authoritative source of truth for business and brand status.

**Crucial Vault Invariants**:
1. **Frontmatter Only**: The Command Center dashboard and downstream tools parse **only YAML frontmatter**. Prosaic text in the body is ignored by parsers.
2. **Mandatory Keys**: `id` (stable slug) and `nombre` (display name).
3. **Enums**:
   - `tipo`: `cliente_externo` | `producto_propio` | `agencia_madre`.
   - `estado`: `activo` | `transicion` | `pausado` | `archivado`.
   - `rubro`: Closed taxonomy (e.g. `comunidad_cultura`, `agencia`, `grafica`, etc.).
4. **Sub-Objects**:
   - `proyectos`: `[{ id, nombre, estado, objetivo, tecnologias }]`
   - `roadmap`: `[{ id, texto, prioridad, tags, orden, hecho, fecha_completado }]`
   - `servicios`: `[{ id, tipo, nombre, url, usuario }]`
   - `relaciones`: Array of valid brand IDs.
5. **Agent Identification**:
   - First line of the body must always be: `<!-- agente: antigravity -->`.

### 7.2 Intake Wizard Sections
The intake UI (`src/components/company-intake/CompanyIntakeWizard.tsx`) organizes company setup into 4 structured sections:
1. **Section 1: Company Profile**
   - Brand ID (`id` slug), Display Name (`nombre`), Type (`tipo`), Emoji, Category statement, Domain, Hosting.
2. **Section 2: Client Accounts & Relations**
   - External clients (`Clientes/*.md`), internal products (`Productos/*.md`), linked relationships (`relaciones`).
3. **Section 3: Team & Agent Roles**
   - Department breakdown (e.g. Duplo Núcleo: Núcleo Sagrado vs. Núcleo Comercial).
   - Human leadership assignments (Pajés, CEO, Directors).
   - AI Agent assignments (`@claude`, `@openclaw`, `@hermes`, `@antigravity`, etc.).
4. **Section 4: Operational Procedures & Financial Metrics**
   - Cost centers, financial target metrics (DRE), active services, and agent execution guidelines.

### 7.3 Automated Vault Parsing (`/api/vault/parse`)
Using the installed `js-yaml` library (`^4.1.1`):
1. Reads `C:\Users\ondig\Desktop\DA\digitalalignment\Clientes\Nipeihu.md`.
2. Reads `C:\Users\ondig\Desktop\DA\digitalalignment\Clientes\Digital Alignment.md`.
3. Extracts frontmatter YAML fields.
4. Pre-fills the wizard and Nipëi OS configuration automatically on startup.
5. Emits structured JSON payload ready for direct consumption by the frontend.

---

## 8. Implementation Guidelines & Next Steps

1. **Keep Zero Extra Dependencies**: Use the currently installed dependencies (`lucide-react`, `framer-motion`, `js-yaml`, Tailwind v4).
2. **Follow Component Patterns**: Implement modular components in `src/components/agents-todo/` and `src/components/company-intake/`.
3. **Clean Build Verification**: Ensure all new types are strictly typed without `any` casts so that `npm run build` passes with zero errors.
