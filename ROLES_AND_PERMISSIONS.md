# Nipei (Medicinas da Floresta) - Roles, Permissions & Flow

This document outlines the user roles, their capabilities, and the system flow for the Nipei application. The system uses **Supabase Authentication** and **Row Level Security (RLS)** to strictly enforce these permissions at the database level.

## 1. User Roles

The system is designed with four levels of access to accommodate different operational needs, from public visibility to full administrative control.

### 👑 **Admin (Administrador)**

The superuser of the system.

- **Capabilities:**
  - **Full Control:** Can Create, Read, Update, and Delete (CRUD) ALL products.
  - **User Management:** (Future) Can manage other users and assign roles.
  - **Visibility Control:** Can toggle product visibility (Public/Hidden).
  - **Content Management:** Upload images, audio, and edit rich text descriptions.
- **Restrictions:** None.

### 📦 **Inventory Manager (Gerente de Estoque - "Mutum")**

Focused on logistics and stock availability.

- **Capabilities:**
  - **View All:** Can see ALL products, including hidden ones (to check inventory of unreleased items).
  - **Update Stock:** Can update the `stock_quantity` field.
- **Restrictions:**
  - Cannot delete products.
  - Cannot change product descriptions, images, or history (Content integrity).
  - Cannot change product visibility.

### 👁️ **Sales Viewer / User (Usuário Comum)**

Registered users who might be tracking orders or viewing specific internal data, or simple registered public users.

- **Capabilities:**
  - **View Catalog:** Can view products.
  - **(Future) Orders:** Can view their own order history.
- **Restrictions:**
  - **Read-Only:** Cannot modify ANY product data.
  - **Visibility:** By default, can only see products marked as `is_visible` (unless specific permissions are granted).

### 🌍 **Public (Unauthenticated)**

Visitors to the website.

- **Capabilities:**
  - **Browse:** Can view products where `is_visible = true`.
- **Restrictions:**
  - Cannot access the Admin Panel (`/admin`).
  - Cannot see products marked as hidden (`is_visible = false`).
  - Cannot modify any data.

---

## 2. Application Flow

### A. Registration & Login

1. **Access:** Navigate to `/admin` or click the user icon. If not logged in, you receive the Login screen.
2. **Sign Up (Cadastro):**
    - Click "Criar conta".
    - Enter Name, Email, Password.
    - **Select Role:** Choose the appropriate role from the dropdown (Admin, Gerente de Estoque, Usuário).
    - *Note: In a production environment, role selection should be protected or approved by an admin. Currently, it is open for ease of setup.*
3. **Automatic Profile:** Upon registration, a database trigger automatically checks the selected role and creates a user profile with those permissions.
4. **Login:** Enter credentials to access the system.

### B. Accessing Data (The "Flow")

The application connects to Supabase, which acts as a secure gatekeeper.

1. **Likely Scenario - "Mutum" (Inventory Manager):**
    - **Goal:** Update stock for "Santo Daime".
    - **Action:** Logs in -> Goes to Admin Panel.
    - **View:** Sees all products.
    - **Edit:** Opens "Santo Daime". Fields like "Description" might be read-only (UI enforcement), but the "Stock" field is editable.
    - **Save:** Database permits the update because his role is `inventory_manager`.

2. **Likely Scenario - Content Editor (Admin):**
    - **Goal:** Fix a typo in the "History" section.
    - **Action:** Logs in -> Admin Panel -> Edits Product.
    - **Save:** Database permits the update.

3. **Likely Scenario - Visitor:**
    - **Goal:** Browse products.
    - **Action:** Opens Home page.
    - **Result:** Supabase only returns rows where `is_visible` is `true`. Hidden products never reach the frontend.

## 3. Database Security (RLS) policies

Security is enforced directly on the data tables (`products` and `profiles`). Even if a malicious user tries to bypass the UI, the database will reject the request.

- **`products` Table:**
  - `SELECT`: Public sees `is_visible` only. Authenticated users (Admin/Manager) see all.
  - `INSERT/DELETE`: Only `admin` role.
  - `UPDATE`: `admin` (all fields) OR `inventory_manager` (updates allowed, logic can restrict to specific columns if needed).

---

## Future Scalability

This structure is ready for:

- **Sales Dashboard:** A new role `sales_manager` that can only see orders.
- **Audit Logs:** Tracking who changed stock levels (was it Mutum or Admin?).
- **My Orders:** Public users seeing their purchase history.
