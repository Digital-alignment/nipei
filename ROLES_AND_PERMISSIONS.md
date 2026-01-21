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

### 🦜 **Mutum Manager (formerly Inventory Manager)**

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

---

## 2. Database Implementation

### User Roles Enum

The `user_role` database enum will be updated to include:

- `superadmin`
- `otter`
- `mutum_manager`
- `squad3`, `squad4`, ... `squad9`
- `public` (concept, not DB role)

### Content Access (RLS)

Tables (like `products`, `blogs`) will typically have a `squads` column (Array of Enums or Text) to define visibility.

**Logic:**

- **Superadmin/Otter**: Bypasses all checks.
- **Mutum Manager**: See all (Read-Only on details, Edit on Stock).
- **Squad User**: `is_visible = true` OR `auth.role` is in `row.squads`.
