import { readFile, writeFile, readdir, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

export const VAULT_ROOT = config.vaultRoot ?? "";
export const ADDITIONAL_VAULT_ROOT = "";
export const OMI_PATH = VAULT_ROOT ? path.join(VAULT_ROOT, "Omi/Memories.md") : "";
export const VAULT_AVAILABLE = Boolean(VAULT_ROOT);

const SKIP_DIRS = new Set([".obsidian", ".trash", "node_modules", ".git"]);

import { isWithinNipeiDomain } from "./nipeiDomainGuard";

export function safeJoin(rel: string): string | null {
  const abs = path.resolve(VAULT_ROOT, rel);
  if (!abs.startsWith(VAULT_ROOT)) return null;
  if (!isWithinNipeiDomain(abs)) return null;
  return abs;
}


export async function listNotes(maxDepth = 6): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let items;
    try { items = await readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const it of items) {
      if (SKIP_DIRS.has(it.name)) continue;
      const full = path.join(dir, it.name);
      if (!isWithinNipeiDomain(full)) continue;
      if (it.isDirectory()) {
        await walk(full, depth + 1);
      } else if (it.isFile() && /\.md$/i.test(it.name)) {
        out.push(full);
      }
    }
  }
  if (VAULT_ROOT) await walk(VAULT_ROOT, 0);
  if (ADDITIONAL_VAULT_ROOT && ADDITIONAL_VAULT_ROOT !== VAULT_ROOT) {
    await walk(ADDITIONAL_VAULT_ROOT, 0);
  }
  return out;
}

export interface NoteHit {
  path: string;        // relative to vault root
  title: string;       // basename without .md
  preview: string;     // snippet around match
  score: number;
  mtime: number;
}

function previewAround(content: string, idx: number, span = 120): string {
  const start = Math.max(0, idx - span);
  const end = Math.min(content.length, idx + span);
  let p = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) p = "…" + p;
  if (end < content.length) p = p + "…";
  return p;
}

import { searchNotesIndexed, getCompanyNotesIndexed, recentNotesIndexed, updateInMemoryIndex } from "./vaultIndex";

export async function searchNotes(q: string, limit = 40): Promise<NoteHit[]> {
  return searchNotesIndexed(q, limit);
}

export async function recentNotes(limit = 12): Promise<{ path: string; title: string; mtime: number }[]> {
  return recentNotesIndexed(limit);
}

// Notes created/edited on a specific day (YYYY-MM-DD) — the real "what happened".
export async function notesModifiedOn(ymd: string, limit = 30): Promise<{ path: string; title: string; mtime: number }[]> {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return [];
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = start + 86400000;
  const files = await listNotes();
  const out: { path: string; title: string; mtime: number }[] = [];
  for (const f of files) {
    try {
      const s = await stat(f);
      if (s.mtimeMs >= start && s.mtimeMs < end) {
        out.push({ path: path.relative(VAULT_ROOT, f), title: path.basename(f, ".md"), mtime: s.mtimeMs });
      }
    } catch { /* skip */ }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, limit);
}

export async function readNote(rel: string): Promise<{ path: string; content: string; mtime: number } | null> {
  const abs = safeJoin(rel);
  if (!abs) return null;
  if (!/\.md$/i.test(abs)) return null;
  try {
    const [content, st] = await Promise.all([readFile(abs, "utf8"), stat(abs)]);
    return { path: rel, content, mtime: st.mtimeMs };
  } catch { return null; }
}

export async function writeNote(rel: string, content: string): Promise<{ success: boolean; mtime?: number; error?: string }> {
  const abs = safeJoin(rel);
  if (!abs) return { success: false, error: "Invalid path: outside vault root" };
  if (!/\.md$/i.test(abs)) return { success: false, error: "Only markdown (.md) files can be edited" };
  try {
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
    const st = await stat(abs);

    // Update in-memory index instantly (0ms delay)
    updateInMemoryIndex(rel, content, st.mtimeMs);

    return { success: true, mtime: st.mtimeMs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Searches and scans nipei-vault for all notes linked to a specific company by slug, name, or path.
 */
export async function getCompanyNotes(
  companySlug: string,
  companyName: string,
  limit = 50
): Promise<NoteHit[]> {
  return getCompanyNotesIndexed(companySlug, companyName, limit);
}

// Omi memories: parse bullet list from Memories.md
export async function searchOmi(q: string, limit = 40): Promise<string[]> {
  let content: string;
  try { content = await readFile(OMI_PATH, "utf8"); }
  catch { return []; }
  const needle = q.trim().toLowerCase();
  const lines = content.split(/\r?\n/).filter((l) => l.trim().startsWith("- "));
  const matches = needle
    ? lines.filter((l) => l.toLowerCase().includes(needle))
    : lines.slice(0, limit);
  return matches.slice(0, limit).map((l) => l.replace(/^- /, ""));
}

// The most RECENT Omi memories (Omi appends newest to the end of the file).
// Filters out app/build prompts that Omi captured off-screen while the user was
// testing the Agent Factory — those aren't real-life memories.
export async function recentOmi(limit = 40): Promise<string[]> {
  try {
    const content = await readFile(OMI_PATH, "utf8");
    const lines = content.split(/\r?\n/)
      .filter((l) => l.trim().startsWith("- "))
      .map((l) => l.replace(/^- /, "").trim())
      .filter((l) => l.length > 8 && !/^(a|an|create|build|make|design|plan|generate|develop|code|write me|a playable|an interactive)\b/i.test(l));
    return lines.slice(-limit).reverse();
  } catch { return []; }
}
