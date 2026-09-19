export interface CompanyTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  defaultTitle: (companyName: string) => string;
  defaultCategory: string;
  generateMarkdown: (companySlug: string, companyName: string) => string;
}

export const COMPANY_TEMPLATES: CompanyTemplate[] = [
  {
    id: "ficha_maestra",
    title: "Ficha Maestra & Accesos",
    subtitle: "Contexto, contactos y visión general",
    description: "Plantilla para registrar la información estratégica general, visión de negocio, contactos clave y enlaces.",
    iconName: "FileText",
    defaultTitle: (name: string) => `${name} — Ficha Maestra & Contexto`,
    defaultCategory: "Master_Sources/Empresas",
    generateMarkdown: (slug: string, name: string) => `---
title: "${name} — Ficha Maestra & Contexto"
company: "${slug}"
company_name: "${name}"
category: "Master_Sources/Empresas"
template: "ficha_maestra"
created_at: "${new Date().toISOString()}"
author: "Antigravity OS"
---
<!-- agente: antigravity -->

# ${name} — Ficha Maestra & Contexto Estratégico

## 📌 Información General & Descripción
Visión general del cliente/proyecto **${name}**, modelo de negocio y contexto operativo.

## 👥 Personas Clave & Contactos
- **Líder Principal**: Nombre (Cargo) — \`contacto@email.com\`
- **Gestor Técnico**: Nombre (Cargo) — \`contacto@email.com\`

## 🌐 Sitios Web & Enlaces Oficiales
- **Sitio Web Principal**: \`https://...\`
- **Repositorio GitHub**: \`https://github.com/Digital-alignment/...\`

## 🎯 Objetivos Estratégicos
- [ ] Definir entregables clave de la primera fase.
- [ ] Establecer SLAs de respuesta y soporte técnico.
`,
  },
  {
    id: "infraestructura_vps",
    title: "Infraestructura & VPS",
    subtitle: "Servidores, IPs, SSH y dominios",
    description: "Plantilla técnica para registrar servidores, claves SSH dedicadas (siguiendo reglas de aislamiento), dominios e integraciones.",
    iconName: "Zap",
    defaultTitle: (name: string) => `${name} — Infraestructura, Servidores & VPS`,
    defaultCategory: "Master_Sources/Empresas",
    generateMarkdown: (slug: string, name: string) => `---
title: "${name} — Infraestructura, Servidores & VPS"
company: "${slug}"
company_name: "${name}"
category: "Master_Sources/Empresas"
template: "infraestructura_vps"
created_at: "${new Date().toISOString()}"
author: "Antigravity OS"
---
<!-- agente: antigravity -->

# ${name} — Infraestructura, Servidores & VPS

> ⚠️ **Regla de Aislamiento de Claves SSH**: Este proyecto utiliza exclusivamente su propia clave SSH dedicada (ej. \`${slug}_vps\`). Queda prohibido usar claves de otros proyectos.

## 🖥️ Servidores & VPS (Hostinger / Cloudflare)
- **Host / IP**: \`123.45.67.89\`
- **SSH User**: \`root\` / \`deploy\`
- **Clave SSH Asignada**: \`~/.ssh/${slug}_vps\`
- **OS / Distro**: Ubuntu 24.04 LTS

## 🌐 Dominios & DNS (Cloudflare)
- **Dominio Principal**: \`https://...\`
- **DNS Provider**: Cloudflare DNS

## ⚙️ Servicios & Integraciones (Docker / Node / DB)
- **Servicios Activos**: Node.js App, NGINX Reverse Proxy, PostgreSQL / Supabase
- **Puertos Internos**: \`3000\`, \`8080\`
`,
  },
  {
    id: "roadmap_sprints",
    title: "Roadmap & Sprints",
    subtitle: "Objetivos, tareas y pendientes",
    description: "Plantilla para seguimiento de sprints, tareas pendientes y backlog con formato de trazabilidad.",
    iconName: "Target",
    defaultTitle: (name: string) => `${name} — Roadmap, Tareas & Sprints Activos`,
    defaultCategory: "Master_Sources/Empresas",
    generateMarkdown: (slug: string, name: string) => `---
title: "${name} — Roadmap, Tareas & Sprints Activos"
company: "${slug}"
company_name: "${name}"
category: "Master_Sources/Empresas"
template: "roadmap_sprints"
created_at: "${new Date().toISOString()}"
author: "Antigravity OS"
---
<!-- agente: antigravity -->

# ${name} — Roadmap, Tareas & Sprints Activos

## 🎯 Objetivos del Sprint Activo
- [ ] Implementar arquitectura base del proyecto.
- [ ] Configurar CI/CD pipeline de despliegue.

## 📋 Tareas Pendientes (Backlog)
- [ ] Tarea 1: Configurar variables de entorno y secrets.
- [ ] Tarea 2: Realizar auditoría de rendimiento y seguridad.

## ✅ Tareas Completadas
- [x] Inicializar Ficha 360° en Nipëi OS.
`,
  },
  {
    id: "minuta_reunion",
    title: "Minuta de Reunión & Acuerdos",
    subtitle: "Sesiones, decisiones y acuerdos",
    description: "Plantilla para registrar minutas de reuniones con clientes, decisiones técnicas y acuerdos tomados.",
    iconName: "Mic",
    defaultTitle: (name: string) => `${name} — Minuta de Reunión (${new Date().toLocaleDateString("es-ES")})`,
    defaultCategory: "Ingested_Knowledge/Empresas",
    generateMarkdown: (slug: string, name: string) => `---
title: "${name} — Minuta de Reunión (${new Date().toLocaleDateString("es-ES")})"
company: "${slug}"
company_name: "${name}"
category: "Ingested_Knowledge/Empresas"
template: "minuta_reunion"
created_at: "${new Date().toISOString()}"
author: "Antigravity OS"
---
<!-- agente: antigravity -->

# ${name} — Minuta de Reunión & Acuerdos

## 📅 Detalles de la Sesión
- **Fecha**: ${new Date().toLocaleDateString("es-ES")}
- **Participantes**: Equipo Digital Alignment & Representantes de **${name}**

## 📌 Temas Tratados
1. Revisión de avances de la semana.
2. Definición de prioridades del próximo entregable.

## 🤝 Acuerdos Principales
- **Acuerdo 1**: Se aprueba la propuesta de arquitectura.
- **Acuerdo 2**: Próxima sesión programada para la siguiente semana.

## 📋 Tareas Asignadas
- [ ] **Antigravity**: Documentar decisiones en Nipëi Vault.
- [ ] **Equipo**: Enviar propuesta revisada a cliente.
`,
  },
];
