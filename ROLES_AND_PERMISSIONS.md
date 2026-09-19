# Nipei (Medicinas da Floresta) - Roles, Permissions & Flow

This document outlines the user roles, their capabilities, and the system flow for the Nipei application. The system uses **Supabase Authentication** and **Row Level Security (RLS)** to strictly enforce these permissions at the database level.

## 1. User Roles

The system is expanded to include specific squad access and developer roles.


### 👑 **Superadmin (formerly Admin)**

The superuser of the system.

- **Capabilities:** Full CRUD on ALL content. Can manage users, visibility, and system settings.
- **Scope:** Global.

### 🦦 **Otter (Developer)**

A special developer role with equivalent permissions to Superadmin.

- **Capabilities:** Full CRUD on ALL content. Debugging and maintenance access.
- **Scope:** Global.

### 🛡️ **Guardião**

Trusted community member responsible for logging journeys and managing specific squad activities.

- **Capabilities:** Access to Guardiao Dashboard, can submit journey forms.
- **Scope:** Assigned Squads.

### 🦜 **Mutum Manager (Squad2 - formerly Inventory Manager)**

Focused on logistics and stock availability.

- **Capabilities:** View all products. Update `stock_quantity`.
- **Restrictions:** Cannot delete products or change content/visibility.

### 👥 **Squads (Squad3 - Squad9)**

Specific groups with access restricted to their designated content.

- **Roles:** `squad3`, `squad4`, `squad5`, `squad6`, `squad7`, `squad8`, `squad9`.
- **Capabilities:**
  - View **Public** content.
  - View/Edit content specifically tagged for their squad (e.g., `squad_access` includes 'squad3').
- **Restrictions:** Cannot see content belonging exclusively to other squads or admin-only data.

### 🌍 **Public (Unauthenticated)**

Visitors to the website.

- **Capabilities:** Browse products where `is_visible = true` AND `squad_access` is generic/public.

## 3. Strict AI Agent Domain & Boundary Isolation Rule

**MANDATO PERMANENTE PARA TODOS LOS AGENTES DE IA (Hermes, Antigravity, Subagentes y Motores RAG):**
1. **Límite de Dominio Exclusivo**: Todos los agentes de IA de Nipëi OS operan **únicamente** dentro de:
   - `C:\Users\ondig\Code\Nipei\nipei-control` (Control Center UI & Backend)
   - `C:\Users\ondig\Code\Nipei\nipei-vault` (Vault de Sistema & Base de Conocimiento)
2. **Prohibición de Acceso a Clientes Externos**: Queda **estrictamente prohibido** leer, indexar, buscar o ejecutar comandos en carpetas o repositorios de empresas clientes externas (ej. `C:\Users\ondig\Code\DA\<repo>`).
3. **Claves SSH & Aislamiento por Cliente**: Cada cliente utiliza exclusivamente su propia clave SSH dedicada (`~/.ssh/<slug>_vps`). Está prohibido usar `nipei_vps` o cruzar contextos fuera de Nipëi OS.

---

## 4. Database Implementation


### User Roles Enum

The `user_role` database enum will be updated to include:

- `superadmin`
- `otter`
- `mutum_manager`
- `guardiao`
- `squad3`, `squad4`, ... `squad9`
- `public` (concept, not DB role)

### Content Access (RLS)

Tables (like `products`, `blogs`) will typically have a `squads` column (Array of Enums or Text) to define visibility.

**Logic:**

- **Superadmin/Otter**: Bypasses all checks.
- **Mutum Manager**: See all (Read-Only on details, Edit on Stock).
- **Squad User**: `is_visible = true` OR `auth.role` is in `row.squads`.
