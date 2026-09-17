/**
 * Nipëi OS — Pre-built Archify Specs for Ecosystem, Squads, RAG Pipeline & Lifecycles
 */

export interface PrebuiltDiagram {
  id: string;
  name: string;
  category: string;
  type: "architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle";
  description: string;
  spec: any;
}

export const PREBUILT_DIAGRAMS: PrebuiltDiagram[] = [
  {
    id: "nipei-ecosystem-architecture",
    name: "Arquitectura General Ecosistema Nipëi",
    category: "Ecosistema & Infraestructura",
    type: "architecture",
    description: "Componentes, VPS Hostinger, Supabase, Next.js y límites de red del Ecosistema Nipëi.",
    spec: {
      schema_version: 1,
      diagram_type: "architecture",
      meta: {
        title: "Nipëi OS — Ecosistema & Infraestructura Core",
        output: "nipei-ecosystem.html",
        visual_preset: "blueprint",
        quality_profile: "showcase",
        views: [
          { id: "users-edge", label: "Entradas Públicas & Reverse Proxy", focus: ["users", "cdn", "lb", "nipei_app"], note: "Tráfico web de usuarios y proxy Nginx en Hostinger VPS." },
          { id: "core-ai", label: "Motor Core & Agentes IA", focus: ["nipei_app", "hermes", "agents", "vault"], note: "Consola Next.js 15, Agentes Hermes/Planner y Vault Obsidian." },
        ],
      },
      components: [
        { id: "users", type: "external", label: "Usuarios", sublabel: "Browser / Mobile", pos: [40, 300], size: [120, 60] },
        { id: "auth", type: "security", label: "Auth Provider", sublabel: "OAuth 2.0 / JWT", pos: [40, 110], size: [130, 64], tag: "security" },
        { id: "cdn", type: "cloud", label: "Hostinger Edge", sublabel: "CDN + Nginx SSL", pos: [250, 300], size: [130, 60] },
        { id: "lb", type: "cloud", label: "Reverse Proxy", sublabel: "HTTPS :443 -> :3333", pos: [460, 300], size: [130, 60] },
        { id: "nipei_app", type: "backend", label: "Nipëi OS App", sublabel: "Next.js 15 :3333", pos: [670, 300], size: [130, 60] },
        { id: "hermes", type: "backend", label: "Hermes 2.0 RAG", sublabel: "Motor RAG & Embeddings", pos: [670, 150], size: [140, 60] },
        { id: "db", type: "database", label: "Supabase DB", sublabel: "PostgreSQL + Vectors", pos: [880, 300], size: [130, 60] },
        { id: "vault", type: "database", label: "nipei-vault", sublabel: "Obsidian Notes (.md)", pos: [250, 440], size: [130, 60], tag: "knowledge" },
        { id: "agents", type: "backend", label: "Agentes Locales", sublabel: "@planner @builder", pos: [670, 440], size: [130, 60] },
        { id: "whatsapp", type: "external", label: "WhatsApp Bot", sublabel: "Integración n8n", pos: [880, 440], size: [130, 60] },
      ],
      boundaries: [
        { kind: "region", label: "VPS Hostinger / Production Cloud", wraps: ["cdn", "lb", "nipei_app", "hermes", "db", "vault", "agents", "whatsapp"] },
        { kind: "security-group", label: "Nipëi Core Application Network", wraps: ["lb", "nipei_app", "hermes"] },
      ],
      connections: [
        { id: "users-cdn", from: "users", to: "cdn", label: "HTTPS", variant: "emphasis" },
        { id: "auth-verify", from: "auth", to: "nipei_app", label: "verify JWT", variant: "security", fromSide: "right", toSide: "top", via: [[620, 142], [620, 246], [735, 246]] },
        { id: "cdn-lb", from: "cdn", to: "lb" },
        { id: "cdn-vault", from: "cdn", to: "vault", label: "notes sync", variant: "dashed", fromSide: "bottom", toSide: "top", labelDy: 58 },
        { id: "lb-app", from: "lb", to: "nipei_app" },
        { id: "app-hermes", from: "nipei_app", to: "hermes", label: "RAG query", fromSide: "top", toSide: "bottom" },
        { id: "app-db", from: "nipei_app", to: "db", label: "Postgres" },
        { id: "app-agents", from: "nipei_app", to: "agents", label: "dispatch", variant: "dashed", fromSide: "bottom", toSide: "top", labelDy: 58 },
        { id: "agents-wa", from: "agents", to: "whatsapp" },
      ],
      cards: [
        { dot: "cyan", title: "Capa Edge & Entrada", items: ["Hostinger Edge Nginx intercepta todo el tráfico HTTPS", "Autenticación segura con tokens JWT"] },
        { dot: "emerald", title: "Capa de Aplicación Nipëi", items: ["Consola Next.js 15 en puerto 3333", "Motor Hermes 2.0 RAG integrado", "Agentes autónomos @planner y @builder"] },
        { dot: "rose", title: "Conocimiento & Estado", items: ["Obsidian Vault (`nipei-vault`) como fuente de verdad", "Supabase PostgreSQL para vectores y persistencia"] },
      ],
    },
  },
  {
    id: "squads-operations-workflow",
    name: "Workflow Operacional de los 7 Squads",
    category: "Squads & Procesos",
    type: "workflow",
    description: "Flujo de trabajo paso a paso entre los 7 Squads del Santuario Yawanawá y Nipëi OS.",
    spec: {
      schema_version: 1,
      diagram_type: "workflow",
      meta: {
        title: "Flujo Operaciones Integrado — Squads I a VII",
        output: "squads-workflow.html",
        visual_preset: "signal-flow",
        quality_profile: "showcase",
      },
      lanes: [
        { id: "lane1", label: "Estrategia & Visión" },
        { id: "lane2", label: "Producción & Vivencias" },
        { id: "lane3", label: "Ventas & Finanzas" },
        { id: "lane4", label: "Tech & Gobernanza" },
      ],
      nodes: [
        { id: "squad1", label: "Squad I", sublabel: "CEO & OKR", lane: "lane1", col: 0, type: "external" },
        { id: "squad2", label: "Squad II", sublabel: "Mutum Producción", lane: "lane2", col: 2, type: "backend" },
        { id: "squad3", label: "Squad III", sublabel: "Samakey Retiros", lane: "lane2", col: 4, type: "frontend" },
        { id: "squad4", label: "Squad IV", sublabel: "Ventas & Ads", lane: "lane3", col: 2, type: "cloud" },
        { id: "squad5", label: "Squad V", sublabel: "Finanzas DRE", lane: "lane3", col: 4, type: "database" },
        { id: "squad6", label: "Squad VI", sublabel: "Tech & Hermes", lane: "lane4", col: 2, type: "backend" },
        { id: "squad7", label: "Squad VII", sublabel: "Gobernanza", lane: "lane4", col: 4, type: "security" },
        { id: "done", label: "Impacto", sublabel: "Vault Consolidation", lane: "lane1", col: 5, type: "external" },
      ],
      edges: [
        { from: "squad1", to: "squad2", label: "Metas" },
        { from: "squad2", to: "squad3", label: "Stock" },
        { from: "squad1", to: "squad4", label: "Plan" },
        { from: "squad4", to: "squad5", label: "Ingresos" },
        { from: "squad1", to: "squad6", label: "Métricas" },
        { from: "squad6", to: "squad7", label: "Audit" },
        { from: "squad7", to: "done", label: "Aprobado" },
      ],
    },
  },
  {
    id: "hermes-rag-sequence",
    name: "Secuencia de Consulta RAG Hermes 2.0",
    category: "Agentes & IA",
    type: "sequence",
    description: "Traza de secuencia desde la consulta del usuario hasta la respuesta verificada con citas del Vault.",
    spec: {
      schema_version: 1,
      diagram_type: "sequence",
      meta: {
        title: "Secuencia RAG Hermes 2.0 — Cero Alucinación",
        output: "hermes-rag-sequence.html",
        visual_preset: "classic",
        quality_profile: "showcase",
      },
      participants: [
        { id: "user", label: "Usuario", type: "external" },
        { id: "ui", label: "Consola UI", type: "frontend" },
        { id: "hermes", label: "Hermes 2.0", type: "backend" },
        { id: "rag_vector", label: "Vector DB", type: "database" },
        { id: "vault", label: "nipei-vault", type: "database" },
      ],
      messages: [
        { from: "user", to: "ui", label: "1. Consulta de tema", y: 160 },
        { from: "ui", to: "hermes", label: "2. POST /api/memory/query", y: 210 },
        { from: "hermes", to: "rag_vector", label: "3. Vector similarity search", y: 260 },
        { from: "rag_vector", to: "hermes", label: "4. Top-K Chunks + Scores", y: 310 },
        { from: "hermes", to: "vault", label: "5. Verifica fuente original .md", y: 360 },
        { from: "vault", to: "hermes", label: "6. Texto fuente verificado", y: 410 },
        { from: "hermes", to: "ui", label: "7. Respuesta con Citas", y: 460 },
        { from: "ui", to: "user", label: "8. Render con referencias", y: 510 },
      ],
    },
  },
  {
    id: "ini-rau-dataflow",
    name: "Flujo de Datos & Linaje Inî Rau",
    category: "Empresas & Productos",
    type: "dataflow",
    description: "Linaje de datos desde la extracción botánica en Aldeia Mutum hasta la venta y certificación.",
    spec: {
      schema_version: 1,
      diagram_type: "dataflow",
      meta: {
        title: "Linaje de Datos & Trazabilidad — Inî Rau",
        output: "ini-rau-dataflow.html",
        visual_preset: "blueprint",
        quality_profile: "showcase",
      },
      stages: [
        { label: "Origen Botánico" },
        { label: "Producción & Cert" },
        { label: "Base de Conocimiento" },
        { label: "Consumidores & UI" },
      ],
      nodes: [
        { id: "extracao", label: "Extracción", sublabel: "Aldeia Mutum", type: "external", stage: 0, row: 0 },
        { id: "lote_prod", label: "Registro Lote", sublabel: "Squad II", type: "backend", stage: 1, row: 0 },
        { id: "cert_origem", label: "Certificación", sublabel: "Gobernanza", type: "security", stage: 1, row: 1 },
        { id: "vault_catalog", label: "Vault Catalog", sublabel: "Ini Rau.md", type: "database", stage: 2, row: 0 },
        { id: "ecommerce", label: "inirau.com", sublabel: "Checkout", type: "cloud", stage: 3, row: 0 },
        { id: "dashboard", label: "Dashboard", sublabel: "Consola Nipëi", type: "frontend", stage: 3, row: 1 },
      ],
      flows: [
        { from: "extracao", to: "lote_prod", label: "Materia Prima" },
        { from: "lote_prod", to: "cert_origem", label: "Valida", labelDy: 58 },
        { from: "cert_origem", to: "vault_catalog", label: "Sync Vault" },
        { from: "vault_catalog", to: "ecommerce", label: "Publicación" },
        { from: "vault_catalog", to: "dashboard", label: "Métricas" },
      ],
    },
  },
  {
    id: "company-lifecycle",
    name: "Ciclo de Vida de Empresas en Nipëi OS",
    category: "Empresas & Gobernanza",
    type: "lifecycle",
    description: "Transiciones de estado de empresas desde Onboarding -> Activa -> Focus Mode -> Archivada.",
    spec: {
      schema_version: 1,
      diagram_type: "lifecycle",
      meta: {
        title: "Ciclo de Vida de Empresas — Nipëi OS",
        output: "company-lifecycle.html",
        visual_preset: "classic",
        quality_profile: "showcase",
      },
      lanes: [
        { id: "main", label: "Fases Activas" },
        { id: "terminal", label: "Resultado" },
      ],
      states: [
        { id: "onboarding", label: "Onboarding", type: "start", lane: "main", col: 0 },
        { id: "active", label: "Empresa Activa", type: "active", lane: "main", col: 1 },
        { id: "focused", label: "Focus Mode", type: "active", lane: "main", col: 2 },
        { id: "archived", label: "Archivada", type: "neutral", lane: "terminal", col: 2 },
      ],
      transitions: [
        { from: "onboarding", to: "active" },
        { from: "active", to: "focused" },
        { from: "focused", to: "archived" },
      ],
    },
  },
];
