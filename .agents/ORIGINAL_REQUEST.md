# Original User Request

## Initial Request — 2026-09-04T23:38:41Z

<USER_REQUEST>
Build a dedicated Agent To-Do / Task Management view in Nipëi OS alongside an interactive Company Information Intake system that populates the Obsidian vault notes and Nipëi OS state to run company operations smoothly.

Working directory: C:\Users\ondig\Code\DA\nipei control
Integrity mode: development

## Requirements

### R1. Agent To-Do & Kanban Dashboard Page
Create a dedicated `/agents-todo` view/route in `agent-os-nipei/source` featuring an interactive task board (Kanban / To-Do list) displaying task statuses (Backlog, In Progress, Review, Done), assigned agent CLI binaries (Claude Code, OpenClaw, Hermes, Custom), priority, and logs.

### R2. Company Information Intake & Vault Synchronization Engine
Build a comprehensive UI form / wizard and API route to input, update, and manage all company operational information (Departments, Roles, Services, Active Clients, Financial Metrics, and Agent Instructions), persisting data directly to the Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`) and local Nipëi OS config.

### R3. Automated Vault Parsing & Pre-population
Integrate auto-parsing of existing vault notes (such as `Clientes/Nipeihu.md`, `Digital Alignment.md`) so Nipëi OS is pre-filled with live company data upon startup.

## Acceptance Criteria

### UI & Navigation
- [ ] Agent To-Do view is accessible from the main Nipëi OS navigation panel.
- [ ] Tasks can be created, edited, filtered by assigned agent, moved between status columns, and saved.
- [ ] Company Intake page features structured sections for Company Profile, Client Accounts, Team & Agent Roles, and Operational Procedures.

### Data Integrity & Persistence
- [ ] Submitting the Company Intake form updates or creates appropriate markdown files and frontmatter in the Obsidian vault (`C:\Users\ondig\Desktop\DA\digitalalignment`).
- [ ] Pre-existing client notes (e.g. `Clientes/Nipeihu.md`) are successfully parsed and rendered in the Nipëi OS company management view.
- [ ] Nipëi OS configuration correctly references newly added agents and operational rules.

### Verification Plan
- [ ] `npm run build` inside `agent-os-nipei/source` executes cleanly without TypeScript or lint errors.
- [ ] Test task creation and status changes persist correctly in local storage or vault notes.
- [ ] Verify parsing of vault notes extracts frontmatter properties accurately without corrupting existing files.
</USER_REQUEST>
