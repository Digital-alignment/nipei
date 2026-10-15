---
name: nipei-design-system-auditor
description: Audit and enforce the official Nipëi OS Design System rules across all UI components and pages (Alata, Google Sans, Space Mono fonts, dark levels #2B2C30, #0a0f16, #070705, Personal #706c61, Empresa #B49B43, clean 3D spheres, compact Bento Grid layouts).
---

# Nipëi OS Design System Auditor Skill

Use this skill when creating, editing, or auditing any user interface components, pages, or layouts in Nipëi OS (`nipei-control` / `agent-os-nipei`).

---

## 1. Core Color Palette & Dark Level Hierarchy

| Level / Token | Color Hex | Purpose |
| :--- | :--- | :--- |
| **Main Body (Nivel 0)** | `#2B2C30` | Main application viewport background |
| **Bento Cards (Nivel 1)** | `#0a0f16` | Standard Bento Grid modular card panels |
| **Hero Cards (Nivel 2)** | `#070705` | Active activity present hero panels |
| **Personal Primary** | `#706c61` | Personal scope accent primary |
| **Personal Glow** | `#8D897C` | Personal glass aura and borders (`rgba(141,137,124,0.4)`) |
| **Empresa Primary** | `#B49B43` | Empresa corporate scope accent primary |
| **Empresa Glow** | `#c2ac5b` | Empresa glass aura and borders (`rgba(194,172,91,0.4)`) |

---

## 2. Typography Contract (Mandatory Font Rules)

1. **`Alata` (`font-alata` / `.alata-regular`)**:
   - **MANDATORY FOR**: Timestamps (`08:30 - 11:30`), completion percentages (`80% CONCLUÍDO`), KPI counters, and numeric progress metrics.
2. **`Google Sans` (`font-google-sans`)**:
   - **MANDATORY FOR**: Section headings, card titles, body descriptions, and button labels.
3. **`Space Mono` (`font-space-mono` / `.space-mono-regular` / `.space-mono-bold`)**:
   - **MANDATORY FOR**: Badges, AI agent tags (`@vaultkeeper`), methodology tags (`⚡ Ivy Lee`), technical codes, and checksums.

---

## 3. Structural & Component Rules

- **Pure 3D Spheres (`OrbItem`)**:
  - The 3D Holographic Sphere MUST remain 100% clean and pure.
  - **PROHIBITED**: Icons (`Sparkles`) or percentage text (`65%`) inside or on top of the glass sphere.
  - Percentage progress MUST be rendered externally via `NipeiProgressBar` or external status badges.
- **Bento Grid Layout**:
  - Main pages must use 2-column or 3-column Bento Grids with compact vertical padding (`py-4` / `py-5`).
  - Cards must support collapsible toggle buttons (`isCollapsed` state with `ChevronUp` / `ChevronDown`).
- **Primitives Component Imports**:
  - Import badges from `@/components/ui/NipeiBadge`.
  - Import cards from `@/components/ui/BentoCard`.
  - Import progress bars from `@/components/ui/NipeiProgressBar`.
  - Import tokens from `@/lib/brandTokens`.
