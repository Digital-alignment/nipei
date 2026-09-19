import path from "node:path";
import { readNote, writeNote } from "./vault";
import { getAllIndexedDocuments, VaultIndexedDocument } from "./vaultIndex";
import { hermesHome } from "./config";

export interface LinkerOptions {
  companySlug?: string;
  notePath?: string;
  scanAll?: boolean;
  model?: string;
}

export interface LinkerResult {
  success: boolean;
  scannedNotesCount: number;
  updatedNotesCount: number;
  totalLinksCreated: number;
  modifiedNotes: Array<{
    path: string;
    linksAdded: string[];
  }>;
  error?: string;
}

// Regex matching existing wikilinks, code blocks, and yaml frontmatter
const CODE_BLOCK_RE = /```[\s\S]*?```|`[^`]+`/g;
const EXISTING_WIKILINK_RE = /\[\[([^\[\]\n|#]+)(?:#[^\[\]\n|]+)?(?:\|[^\[\]\n]+)?\]\]/g;

// ── Key Helper: Read OpenRouter Key from active Hermes profile ──
function openRouterKey(): string | null {
  try {
    const active = (
      process.env.HERMES_PROFILE ||
      require("node:fs").readFileSync(path.join(hermesHome(), "active_profile"), "utf8").trim() ||
      "main"
    );
    const envFile = path.join(hermesHome(), "profiles", active, ".env");
    if (!require("node:fs").existsSync(envFile)) return process.env.OPENROUTER_API_KEY || null;
    const lines = require("node:fs").readFileSync(envFile, "utf8").split("\n");
    const found = lines.find((l: string) => l.startsWith("OPENROUTER_API_KEY="));
    if (found) return found.slice(19).replace(/^["']|["']$/g, "").trim();
  } catch { /* ignore */ }
  return process.env.OPENROUTER_API_KEY || null;
}

/**
 * Automatically scans notes and injects semantic [[Wikilinks]] connecting related topics.
 */
export async function autoConnectVaultWikilinks(
  options: LinkerOptions = {}
): Promise<LinkerResult> {
  try {
    const docs = await getAllIndexedDocuments();
    const normCompany = options.companySlug?.trim().toLowerCase();

    // Build map of linkable titles & aliases -> canonical title
    const titleMap = new Map<string, string>();

    docs.forEach((d) => {
      const cleanTitle = d.title.trim();
      if (cleanTitle && cleanTitle.length > 3) {
        titleMap.set(cleanTitle.toLowerCase(), cleanTitle);
      }

      // Add alias for company master notes
      if (cleanTitle.startsWith("00_")) titleMap.set("ficha maestra", cleanTitle);
      if (cleanTitle.startsWith("01_")) titleMap.set("infraestructura", cleanTitle);
      if (cleanTitle.startsWith("02_")) titleMap.set("roadmap", cleanTitle);
      if (cleanTitle.startsWith("03_")) titleMap.set("minutas", cleanTitle);
    });

    // Determine target documents to process
    let targetDocs = docs;
    if (options.notePath) {
      targetDocs = docs.filter((d) => d.relPath === options.notePath);
    } else if (normCompany) {
      targetDocs = docs.filter(
        (d) =>
          d.relPath.toLowerCase().includes(`clientes/${normCompany}`) ||
          d.relPath.toLowerCase().includes(`productos/${normCompany}`) ||
          d.companySlug?.toLowerCase() === normCompany
      );
    }

    const modifiedNotes: Array<{ path: string; linksAdded: string[] }> = [];
    let totalLinksCreated = 0;

    for (const doc of targetDocs) {
      const noteData = await readNote(doc.relPath);
      if (!noteData || !noteData.content) continue;

      let content = noteData.content;
      const linksAddedInDoc: string[] = [];

      // Split Frontmatter from Body
      let frontmatterStr = "";
      let bodyStr = content;

      if (content.startsWith("---")) {
        const parts = content.split("---");
        if (parts.length >= 3) {
          frontmatterStr = `---${parts[1]}---`;
          bodyStr = parts.slice(2).join("---");
        }
      }

      // Extract existing wikilinks in this doc to prevent duplication
      const existingLinks = new Set<string>();
      const matches = bodyStr.matchAll(EXISTING_WIKILINK_RE);
      for (const m of matches) {
        existingLinks.add(m[1].trim().toLowerCase());
      }
      existingLinks.add(doc.title.toLowerCase()); // Don't self-link

      // Scan body text for unlinked titles
      let newBody = bodyStr;

      titleMap.forEach((canonicalTitle, phraseLower) => {
        if (existingLinks.has(phraseLower)) return;

        // Ensure title is not inside code block or already linked
        const regex = new RegExp(`\\b(${phraseLower.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})\\b`, "gi");

        if (regex.test(newBody) && !existingLinks.has(phraseLower)) {
          // Replace first unlinked occurrence with [[Wikilink]]
          let replaced = false;
          newBody = newBody.replace(regex, (match) => {
            if (!replaced) {
              replaced = true;
              linksAddedInDoc.push(canonicalTitle);
              existingLinks.add(phraseLower);
              return `[[${canonicalTitle}]]`;
            }
            return match;
          });
        }
      });

      // If links were added, save updated note back to vault
      if (linksAddedInDoc.length > 0) {
        const fullNewContent = frontmatterStr ? `${frontmatterStr}\n${newBody}` : newBody;
        const res = await writeNote(doc.relPath, fullNewContent);
        if (res.success) {
          totalLinksCreated += linksAddedInDoc.length;
          modifiedNotes.push({
            path: doc.relPath,
            linksAdded: linksAddedInDoc,
          });
        }
      }
    }

    return {
      success: true,
      scannedNotesCount: targetDocs.length,
      updatedNotesCount: modifiedNotes.length,
      totalLinksCreated,
      modifiedNotes,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      scannedNotesCount: 0,
      updatedNotesCount: 0,
      totalLinksCreated: 0,
      modifiedNotes: [],
      error,
    };
  }
}
