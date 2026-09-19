import { getCompanyNotesIndexed, getAllIndexedDocuments, VaultIndexedDocument } from "./vaultIndex";
import { readNote } from "./vault";
import { extractVaultTodos, VaultTodoItem } from "./vaultTodoExtractor";

export interface CompanyDigestResult {
  companySlug: string;
  companyName: string;
  category?: string;
  vaultPath?: string;
  summary: string;
  keyGoals: string[];
  keyContacts: { name: string; role: string }[];
  infrastructure: {
    vpsKeyRule?: string;
    detectedTech: string[];
    websites: string[];
  };
  tasksHealth: {
    total: number;
    pending: number;
    completed: number;
    pendingItems: { text: string; noteTitle: string; line: number; relPath: string }[];
  };
  linkedNotes: { relPath: string; title: string; mtime: number }[];
  aiDirectivePrompt: string;
  fullMarkdownDigest: string;
  generatedAt: number;
}

const TECH_KEYWORDS = [
  "Next.js",
  "React",
  "Node.js",
  "TypeScript",
  "PostgreSQL",
  "MySQL",
  "Supabase",
  "Nginx",
  "Docker",
  "Hostinger",
  "n8n",
  "Evolution API",
  "WhatsApp",
  "Tailwind",
  "Cloudflare",
  "Redis",
  "Python",
];

/**
 * Synthesizes a 360-degree Auto-Digest briefing for a given company or entire system.
 * Leverages warm in-memory index (< 5ms execution time).
 */
export async function synthesizeCompanyContext(companySlug?: string): Promise<CompanyDigestResult> {
  const normSlug = (companySlug || "").trim().toLowerCase();
  const allDocs = await getAllIndexedDocuments();
  const now = Date.now();

  // If no company slug or "all", synthesize System-Wide Agency Digest
  if (!normSlug || normSlug === "all") {
    const { todos, stats } = await extractVaultTodos({ status: "all" });

    const companyDocs = allDocs.filter(
      (d) => d.relPath.startsWith("Clientes/") || d.relPath.startsWith("Productos/")
    );

    const companiesFound = Array.from(new Set(companyDocs.map((d) => d.title)));
    const pendingTodos = todos.filter((t) => !t.completed).slice(0, 8);

    const aiDirectivePrompt = `
<DIGITAL_ALIGNMENT_CONTEXT>
# Nipëi OS & Digital Alignment — Contexto de Negocio Vivo
- **Total Empresas / Productos**: ${companiesFound.length} (${companiesFound.join(", ")})
- **Total Notas en Vault**: ${allDocs.length}
- **Salud de Tareas**: ${stats.pending} pendientes / ${stats.completed} completadas
- **Regla Global SSH**: Cada cliente usa exclusivamente su clave SSH dedicada (ej. ~/.ssh/<slug>_vps). NUNCA usar nipei_vps fuera de Nipëi OS.
</DIGITAL_ALIGNMENT_CONTEXT>
`.trim();

    const fullMarkdownDigest = `
# ⚡ Auto-Digest General — Digital Alignment & Nipëi OS
- **Fecha de Generación**: ${new Date(now).toLocaleString()}
- **Notas Totales Indexadas**: ${allDocs.length}
- **Empresas & Productos Registrados (${companiesFound.length})**: ${companiesFound.join(", ")}

## 📊 Estado de Ejecución
- 🔴 **Tareas Pendientes**: ${stats.pending}
- 🟢 **Tareas Completadas**: ${stats.completed}
- 📈 **Ratio de Cumplimiento**: ${stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 100}%

## 📌 Top Tareas Pendientes del Sistema
${pendingTodos.map((t) => `- [ ] **[${t.noteTitle}]**: ${t.text} (\`${t.relPath}:L${t.line}\`)`).join("\n")}
`.trim();

    return {
      companySlug: "all",
      companyName: "Digital Alignment (Global)",
      category: "Sistema & Agencia",
      summary: `Vista consolidada de ${companiesFound.length} empresas/productos y ${allDocs.length} documentos en el Vault.`,
      keyGoals: ["Mantenimiento y desarrollo de clientes DA", "Evolución de productos propios Nipëi OS"],
      keyContacts: [{ name: "CEO / Operaciones", role: "Digital Alignment" }],
      infrastructure: {
        vpsKeyRule: "ssh ~/.ssh/<slug>_vps",
        detectedTech: ["Next.js", "PostgreSQL", "n8n", "Hostinger", "Supabase"],
        websites: ["https://nipei.os"],
      },
      tasksHealth: {
        total: stats.total,
        pending: stats.pending,
        completed: stats.completed,
        pendingItems: pendingTodos.map((t) => ({
          text: t.text,
          noteTitle: t.noteTitle,
          line: t.line,
          relPath: t.relPath,
        })),
      },
      linkedNotes: allDocs.slice(0, 15).map((d) => ({
        relPath: d.relPath,
        title: d.title,
        mtime: d.mtime,
      })),
      aiDirectivePrompt,
      fullMarkdownDigest,
      generatedAt: now,
    };
  }

  // 1. Gather all documents related to this specific company
  const companyHits = await getCompanyNotesIndexed(normSlug, normSlug, 100);
  const matchedDocs: VaultIndexedDocument[] = [];
  const linkedNotes: { relPath: string; title: string; mtime: number }[] = [];

  for (const hit of companyHits) {
    const doc = allDocs.find((d) => d.relPath === hit.path);
    if (doc) {
      matchedDocs.push(doc);
      linkedNotes.push({ relPath: doc.relPath, title: doc.title, mtime: doc.mtime });
    }
  }

  // 2. Locate Primary Master Note
  let primaryDoc = matchedDocs.find(
    (d) =>
      d.relPath.toLowerCase() === `clientes/${normSlug}.md` ||
      d.relPath.toLowerCase() === `productos/${normSlug}.md` ||
      d.title.toLowerCase() === normSlug ||
      d.title.toLowerCase().replace(/\s+/g, "-") === normSlug
  );

  if (!primaryDoc && matchedDocs.length > 0) {
    primaryDoc = matchedDocs[0];
  }

  // Read full content of primary doc
  const primaryNoteContent = primaryDoc ? (await readNote(primaryDoc.relPath))?.content ?? "" : "";

  // 3. Extract Frontmatter metadata & Details
  const companyName = primaryDoc?.frontmatter.company_name || primaryDoc?.title || normSlug.toUpperCase();
  const category = primaryDoc?.frontmatter.category || primaryDoc?.frontmatter.template || "Empresa Cliente";
  const rawSummary = primaryDoc?.snippet || `Ficha contextual 360° de la empresa ${companyName}.`;

  // Extract Key Contacts
  const keyContacts: { name: string; role: string }[] = [];
  const contactLines = primaryNoteContent.split(/\r?\n/).filter((l) => /contact|persona|responsable|ceo|lead/i.test(l));
  contactLines.forEach((line) => {
    if (line.includes(":") && keyContacts.length < 4) {
      const parts = line.replace(/^[-*#]+\s*/, "").split(":");
      keyContacts.push({ name: parts[0].trim(), role: parts.slice(1).join(":").trim() });
    }
  });

  // Extract Infrastructure & Tech Stack
  const detectedTech: string[] = [];
  const combinedContent = matchedDocs.map((d) => d.lowerContent).join("\n");

  TECH_KEYWORDS.forEach((tech) => {
    if (combinedContent.includes(tech.toLowerCase())) {
      detectedTech.push(tech);
    }
  });

  // SSH Key Rule
  const cleanSlug = normSlug.replace(/[^a-z0-9]/g, "");
  const vpsKeyRule = `~/.ssh/${cleanSlug}_vps`;

  // Extract Websites
  const websites: string[] = [];
  const urlMatches = combinedContent.match(/https?:\/\/[^\s)\\]+/g);
  if (urlMatches) {
    urlMatches.forEach((url) => {
      const cleanUrl = url.replace(/[,;.]*$/, "");
      if (!websites.includes(cleanUrl) && websites.length < 4) {
        websites.push(cleanUrl);
      }
    });
  }

  // 4. Extract Task Health
  const { todos, stats } = await extractVaultTodos({ companySlug: normSlug });
  const pendingItems = todos
    .filter((t) => !t.completed)
    .slice(0, 10)
    .map((t) => ({
      text: t.text,
      noteTitle: t.noteTitle,
      line: t.line,
      relPath: t.relPath,
    }));

  // 5. Generate AI Directive Prompt Context String
  const aiDirectivePrompt = `
<COMPANY_CONTEXT slug="${normSlug}">
# Contexto Vivo de Empresa: ${companyName} (${category})
- **Nota Principal**: ${primaryDoc?.relPath || `Clientes/${companyName}.md`}
- **Aislamiento SSH Dedicado**: Usar exclusivamente \`${vpsKeyRule}\` (Queda estrictamente prohibido usar nipei_vps).
- **Stack Técnico Detectado**: ${detectedTech.length > 0 ? detectedTech.join(", ") : "Digital Alignment Web Stack"}
- **Salud de Tareas**: ${stats.pending} pendientes / ${stats.completed} completadas
- **Próximas Tareas Prioritarias**:
${pendingItems.length > 0 ? pendingItems.map((t) => `  - [ ] ${t.text} (${t.noteTitle}:L${t.line})`).join("\n") : "  - Sin tareas pendientes pendientes."}
- **Documentos de Conocimiento Vinculados (${linkedNotes.length})**:
${linkedNotes.slice(0, 5).map((n) => `  - 📄 ${n.relPath}`).join("\n")}
</COMPANY_CONTEXT>
`.trim();

  // 6. Generate Full Executive Markdown Digest
  const fullMarkdownDigest = `
# ⚡ Briefing Ejecutivo AI 360° — ${companyName}
- **Empresa / Slug**: \`${normSlug}\` | **Categoría**: ${category}
- **Nota Viva Principal**: [${primaryDoc?.title || companyName}](file:///${primaryDoc?.relPath})
- **Fecha de Síntesis**: ${new Date(now).toLocaleString()}

---

### 🌐 Infraestructura & Seguridad
- 🔑 **Clave SSH Dedicada**: \`${vpsKeyRule}\` *(Regla de Aislamiento de Seguridad)*
- 🛠️ **Stack Tecnológico**: ${detectedTech.length > 0 ? detectedTech.join(", ") : "Next.js / Node.js / PostgreSQL"}
- 🔗 **Sitios Web / Enlaces**: ${websites.length > 0 ? websites.join(", ") : "Sin dominios vinculados en notas"}

---

### 📊 Salud de Sprints & Tareas Pendientes
- 🔴 **Pendientes**: ${stats.pending} | 🟢 **Completadas**: ${stats.completed} | 📦 **Total**: ${stats.total}

#### Tareas Pendientes Prioritarias:
${
  pendingItems.length > 0
    ? pendingItems.map((t) => `- [ ] **${t.text}** — *${t.noteTitle} (L${t.line})*`).join("\n")
    : "- 🟢 *No hay tareas pendientes en el backlog de esta empresa.*"
}

---

### 📄 Notas de Conocimiento Vinculadas (${linkedNotes.length})
${linkedNotes.map((n) => `- 📄 **${n.title}** (\`${n.relPath}\`)`).join("\n")}
`.trim();

  return {
    companySlug: normSlug,
    companyName,
    category,
    vaultPath: primaryDoc?.relPath || `Clientes/${companyName}.md`,
    summary: rawSummary,
    keyGoals: ["Alinear infraestructura y desarrollo según especificaciones del Vault"],
    keyContacts,
    infrastructure: {
      vpsKeyRule,
      detectedTech,
      websites,
    },
    tasksHealth: {
      total: stats.total,
      pending: stats.pending,
      completed: stats.completed,
      pendingItems,
    },
    linkedNotes,
    aiDirectivePrompt,
    fullMarkdownDigest,
    generatedAt: now,
  };
}
