import path from "node:path";
import { readNote, writeNote } from "./vault";
import { getAllIndexedDocuments } from "./vaultIndex";
import { COMPANY_TEMPLATES } from "./companyTemplates";

export interface CompanyTaxonomyStatus {
  companySlug: string;
  companyName: string;
  folderPath: string;
  hasFichaMaestra: boolean;
  hasInfraestructura: boolean;
  hasRoadmap: boolean;
  hasMinutas: boolean;
  totalNotesInDirectory: number;
}

const WIKILINK_NAV_BLOCK = (companySlug: string, companyName: string) => `
> 🔗 **Navegación Vault (${companyName})**: [[00_Ficha_Maestra]] | [[01_Infraestructura_VPS]] | [[02_Roadmap_Sprints]] | [[03_Minutas_Reuniones]]
`.trim();

/**
 * Ensures the standardized folder structure and 4 core notes exist for a company in nipei-vault.
 */
export async function ensureCompanyTaxonomy(
  companySlug: string,
  companyName: string
): Promise<{ success: boolean; createdNotes: string[]; error?: string }> {
  const normSlug = companySlug.trim().toLowerCase();
  if (!normSlug) return { success: false, createdNotes: [], error: "Invalid company slug" };

  const createdNotes: string[] = [];
  const baseFolder = `Clientes/${normSlug}`;

  // Core note definitions
  const coreFiles = [
    {
      file: `${baseFolder}/00_Ficha_Maestra.md`,
      templateKey: "ficha_maestra",
      title: `${companyName} — Ficha Maestra & Accesos`,
    },
    {
      file: `${baseFolder}/01_Infraestructura_VPS.md`,
      templateKey: "infraestructura_vps",
      title: `${companyName} — Infraestructura & Servidor VPS`,
    },
    {
      file: `${baseFolder}/02_Roadmap_Sprints.md`,
      templateKey: "roadmap_sprints",
      title: `${companyName} — Roadmap & Backlog de Sprints`,
    },
    {
      file: `${baseFolder}/03_Minutas_Reuniones.md`,
      templateKey: "minuta_reunion",
      title: `${companyName} — Minuta de Reunión & Acuerdos`,
    },
  ];

  for (const item of coreFiles) {
    const existing = await readNote(item.file);
    if (!existing) {
      const template = COMPANY_TEMPLATES.find((t) => t.id === item.templateKey);
      const rawContent = template
        ? template.generateMarkdown(normSlug, companyName)
        : `# ${item.title}\n\n<!-- agente: antigravity -->\n\n${WIKILINK_NAV_BLOCK(normSlug, companyName)}\n`;


      const navBlock = WIKILINK_NAV_BLOCK(normSlug, companyName);
      let contentWithNav = rawContent;
      if (!contentWithNav.includes("🔗 **Navegación Vault")) {
        if (contentWithNav.startsWith("---")) {
          const parts = contentWithNav.split("---");
          if (parts.length >= 3) {
            contentWithNav = `---${parts[1]}---\n\n${navBlock}\n\n${parts.slice(2).join("---").trim()}`;
          } else {
            contentWithNav = `${navBlock}\n\n${contentWithNav}`;
          }
        } else {
          contentWithNav = `${navBlock}\n\n${contentWithNav}`;
        }
      }

      const res = await writeNote(item.file, contentWithNav);
      if (res.success) {
        createdNotes.push(item.file);
      }
    }
  }

  // Inject wikilinks across existing company notes to bind orbital graph
  await autoInjectCompanyWikilinks(normSlug, companyName);

  return { success: true, createdNotes };
}

/**
 * Injects missing navigational wikilinks [[00_Ficha_Maestra]] into all notes associated with a company.
 */
export async function autoInjectCompanyWikilinks(
  companySlug: string,
  companyName?: string
): Promise<{ updatedNotesCount: number }> {
  const normSlug = companySlug.trim().toLowerCase();
  const cName = companyName || normSlug.toUpperCase();
  const docs = await getAllIndexedDocuments();
  let updatedNotesCount = 0;

  const navBlock = WIKILINK_NAV_BLOCK(normSlug, cName);

  for (const doc of docs) {
    const isCompanyRelated =
      doc.relPath.toLowerCase().includes(`clientes/${normSlug}`) ||
      doc.relPath.toLowerCase().includes(`productos/${normSlug}`) ||
      doc.companySlug?.toLowerCase() === normSlug ||
      doc.title.toLowerCase().includes(normSlug);

    if (isCompanyRelated) {
      const note = await readNote(doc.relPath);
      if (note && note.content && !note.content.includes("🔗 **Navegación Vault")) {
        let newContent = note.content;
        if (newContent.startsWith("---")) {
          const parts = newContent.split("---");
          if (parts.length >= 3) {
            newContent = `---${parts[1]}---\n\n${navBlock}\n\n${parts.slice(2).join("---").trim()}`;
          } else {
            newContent = `${navBlock}\n\n${newContent}`;
          }
        } else {
          newContent = `${navBlock}\n\n${newContent}`;
        }

        const res = await writeNote(doc.relPath, newContent);
        if (res.success) {
          updatedNotesCount++;
        }
      }
    }
  }

  return { updatedNotesCount };
}
