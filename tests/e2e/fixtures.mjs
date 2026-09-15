/**
 * Test Fixture and Isolation Manager for Nipëi OS E2E Tests
 * Creates safe, isolated sandbox directories for vaults and runtime state.
 * Guarantees zero pollution or mutation to user's real Obsidian vault.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const SAMPLE_NIPEHU_MD = `---
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
  - nombre: E-Learning nipeihu.app
    estado: activo
    objetivo: Cursos de fitoterapia y cantos, multi-idioma
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
  - id: kanban-modal-detalhes-comentarios
    texto: Modal de Detalhes e Edição de Tarefas com Checklist, Comentários e Logs de IA no Kanban
    prioridad: alta
    tags: [dev, ui]
    orden: 2
    hecho: true
    fecha_completado: '2026-09-04'
  - id: biografias-guardianes
    texto: Completar biografías de los Guardianes (sitio + campañas de recaudación)
    prioridad: alta
    tags: [contenido]
    orden: 3
    hecho: false
  - id: audios-sagrados-nipeihu-app
    texto: Integrar audios sagrados MP3 con letras y traducción fonética en nipeihu.app
    prioridad: alta
    tags: [contenido, producto]
    orden: 4
    hecho: false
  - id: etiquetas-ini-rau
    texto: Sistemática de etiquetas e instruções de Inî Rau (frascos ámbar)
    prioridad: alta
    tags: [desenho]
    orden: 5
    hecho: false
  - id: consolidar-dns-correos
    texto: Consolidar DNS y correos corporativos (contato@inirau.org, contato@nipeihu.org)
    prioridad: media
    tags: [infraestructura]
    orden: 6
    hecho: false
  - id: doc-bioeconomia-mutum
    texto: Documento estratégico de bioeconomía para Aldea Mutum (mapeo de alianzas)
    prioridad: media
    tags: [estrategia]
    orden: 7
    hecho: false
  - id: whisper-api-cantos
    texto: Whisper API experimental para pronunciación/traducción de cantos
    prioridad: baja
    tags: [ia]
    orden: 8
    hecho: false
historial:
  - fecha: '2026-09-04'
    texto: Implementado Modo Tela Cheia Imersiva no Agentic Kanban do Nipëi OS
    tags: [feature, ui, dev]
reporte_md: About/Reporte_nipeihu.md
ultima_sync: '2026-09-04'
---
<!-- agente: antigravity -->

# Nipeihu 🪶
- **Tipo**: Proyecto comunitario — Santuario espiritual Yawanawá + bio-laboratorio (Serra Grande, Bahía)
- **Estado**: 🟢 Activo
- **Liderazgo**: Cacica Mariazinha Nãiwēni, pajé Hushahu Yawanawá, Jordão Pekûti
- **Dominio**: nipeihu.org · Hosting: Hostinger (DA)
- **Stack**: React, TypeScript, Vite, Tailwind, Supabase, Node.js, Vercel, Whisper API
`;

export const SAMPLE_DIGITAL_ALIGNMENT_MD = `---
id: digital-alignment
nombre: Digital Alignment
tipo: agencia_madre
emoji: 🏛️
estado: activo
categoria: Agencia madre y orquestadora del ecosistema
rubro: agencia
dominio: digitalalignment.com
hosting: Hostinger / Vercel
stack:
  - React
  - TypeScript
  - Vercel
  - Node.js
  - Express
  - Supabase
  - Gemini API
  - Tailwind
proyectos:
  - nombre: Consola de Administración Inteligente
    estado: activo
    objetivo: Sincronizar los 15 proyectos de la cartera
  - nombre: Mentoría de Alineación Digital
    estado: activo
    objetivo: Integración Calendly / embudo
  - nombre: Nodo IA Local Ollama (da-4)
    estado: planificado
    objetivo: Contenerizar Ollama en VPS Hostinger
  - nombre: Framework Offline-First (da-5)
    estado: planificado
    objetivo: Protocolo IndexedDB/RxDB para territorio
  - nombre: Whitepaper Tecnología Somática (da-6)
    estado: planificado
    objetivo: Redacción + embudo LinkedIn
  - nombre: Widget Co-Financiamiento (da-7)
    estado: planificado
    objetivo: Diseño del widget de impacto
roadmap:
  - id: contenido-redes-marcas
    texto: Crear contenido integrado de redes para las marcas (Oca Yary, MUV, Nipei)
    prioridad: media
    tags: [contenido, redes]
    orden: 1
    hecho: false
  - id: consolidar-correos-dominios
    texto: Consolidar ecosistema de correos y dominios bajo Hostinger DA
    prioridad: media
    tags: [infraestructura]
    orden: 2
    hecho: false
  - id: repo-dotfiles-config-agentes
    texto: Crear el repo Digital-alignment/dotfiles con symlinks para config de agentes
    prioridad: media
    tags: [infraestructura, agentes]
    orden: 3
    hecho: false
    fecha_creacion: '2026-08-10'
historial:
  - fecha: '2026-08-10'
    texto: Command Center gana validador del vault y contrato de escritura para agentes
    tags: [infraestructura, agentes]
reporte_md: About/Reporte_digital_alignment.md
ultima_sync: '2026-08-10'
notebook_id: 5ffd7044-bdde-410e-b096-b65fd0c3838c
---
<!-- agente: antigravity -->

# Digital Alignment 🏛️
- **Tipo**: Empresa principal — Agencia madre y orquestadora del ecosistema
- **Estado**: 🟢 Activo
- **Dominio**: digitalalignment.com · Hosting: Hostinger / Vercel
`;

export const SAMPLE_COMPANY_INTAKE_PAYLOAD = {
  company: {
    id: "botica-mutum",
    nombre: "Botica Ancestral Mutum",
    tipo: "cliente_externo",
    estado: "activo",
    emoji: "🌿",
    categoria: "Bio-laboratorio de medicinas de floresta y aceites esenciales Yawanawá",
    rubro: "ecommerce",
    dominio: "boticamutum.org",
    hosting: "Hostinger (DA)",
    stack: ["React", "TypeScript", "Tailwind", "Supabase", "Node.js"],
    relaciones: ["nipeihu", "ini-rau"],
  },
  squads: [
    {
      id: "squad_sagrado_colheita",
      name: "Núcleo Sagrado de Colheita",
      nucleus: "sagrado",
      responsibilities: ["Colheita ritual de Sananga", "Preparo de Rapé tradicional"],
      lead: "Pajé Hushahu Yawanawá",
    },
    {
      id: "squad_comercial_distribuicao",
      name: "Núcleo Comercial e Distribuição",
      nucleus: "comercial",
      responsibilities: ["Envase em frascos âmbar", "Logística e rastreabilidade"],
      lead: "Gestor Comercial Inî Rau",
    },
  ],
  roles: [
    {
      title: "Guardião da Sabedoria Ancestral",
      person: "Pajé Hushahu Yawanawá",
      classification: "paje",
      hasEthicalVeto: true,
    },
    {
      title: "Coordenador de Operações",
      person: "Jordão Pekûti",
      classification: "human_lead",
      hasEthicalVeto: false,
    },
    {
      title: "Agente de Rastreabilidade e Lotes",
      person: "OpenClaw Worker",
      classification: "agent",
      assignedAgent: "openclaw",
    },
  ],
  services: [
    {
      id: "botica-wp",
      tipo: "wordpress",
      nombre: "Loja Virtual Botica",
      url: "https://boticamutum.org/wp-admin",
      usuario: "admin-botica",
      credencial_ref: "botica-wp-token",
      estado: "configurado",
    },
    {
      id: "botica-mail",
      tipo: "email",
      nombre: "E-mail Corporativo",
      url: "https://mail.hostinger.com",
      usuario: "contato@boticamutum.org",
      credencial_ref: "botica-mail-pass",
      estado: "configurado",
    },
  ],
  financials: {
    costCenters: ["Colheita Aldeia Mutum", "Logística e Fretes", "Embalagens Sustentáveis"],
    repasseFormula: "100% do lucro líquido revertido para Associação Comunitária Aldeia Mutum",
  },
  instructions: {
    systemPrompt: "Opere com respeito absoluto aos princípios éticos do Povo Yawanawá.",
    rules: [
      "Nunca comercializar lotes sem certificado de aprovação do Núcleo Sagrado.",
      "Nunca expor credenciais em texto claro.",
    ],
  },
};

/**
 * Creates an isolated temporary vault on disk.
 * @returns {Promise<{ vaultDir: string, cleanup: () => Promise<void> }>}
 */
export async function createTempVault() {
  const tmpBase = os.tmpdir();
  const rand = Math.random().toString(36).substring(2, 9);
  const vaultDir = path.join(tmpBase, `nipei-test-vault-${rand}`);

  await fs.promises.mkdir(path.join(vaultDir, "Clientes"), { recursive: true });
  await fs.promises.mkdir(path.join(vaultDir, "Productos"), { recursive: true });
  await fs.promises.mkdir(path.join(vaultDir, "About"), { recursive: true });

  // Write default test client notes
  await fs.promises.writeFile(path.join(vaultDir, "Clientes", "Nipeihu.md"), SAMPLE_NIPEHU_MD, "utf8");
  await fs.promises.writeFile(
    path.join(vaultDir, "Clientes", "Digital Alignment.md"),
    SAMPLE_DIGITAL_ALIGNMENT_MD,
    "utf8"
  );
  await fs.promises.writeFile(
    path.join(vaultDir, "Clientes", "_Ecosistema.md"),
    "# Reserved Ecosistema support note\n",
    "utf8"
  );
  await fs.promises.writeFile(
    path.join(vaultDir, "Clientes", "_Infraestructura.md"),
    "# Reserved VPS infrastructure catalog\n",
    "utf8"
  );

  // Write sample product note
  const sampleProductMd = `---
id: event-master
nombre: Event Master
tipo: producto_propio
estado: activo
categoria: Plataforma de venta de entradas y gestión de retiros
rubro: producto_saas
proyectos:
  - nombre: Checkout Integrado
    estado: activo
roadmap:
  - id: webhook-stripe
    texto: Configurar webhooks de Stripe
    prioridad: alta
    hecho: true
    fecha_completado: '2026-08-01'
---
<!-- agente: antigravity -->

# Event Master 🎟️
`;
  await fs.promises.writeFile(path.join(vaultDir, "Productos", "Event Master.md"), sampleProductMd, "utf8");

  const cleanup = async () => {
    try {
      await fs.promises.rm(vaultDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  };

  return { vaultDir, cleanup };
}

/**
 * Creates an isolated temporary state directory for ~/.nipei-os/ state files.
 * @returns {Promise<{ stateDir: string, cleanup: () => Promise<void> }>}
 */
export async function createTempStateDir() {
  const tmpBase = os.tmpdir();
  const rand = Math.random().toString(36).substring(2, 9);
  const stateDir = path.join(tmpBase, `nipei-test-state-${rand}`);

  await fs.promises.mkdir(stateDir, { recursive: true });

  const cleanup = async () => {
    try {
      await fs.promises.rm(stateDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  };

  return { stateDir, cleanup };
}
