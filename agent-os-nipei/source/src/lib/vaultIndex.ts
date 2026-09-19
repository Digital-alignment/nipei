import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { listNotes, safeJoin, NoteHit, VAULT_ROOT } from "./vault";
import { isWithinNipeiDomain } from "./nipeiDomainGuard";

export interface VaultIndexedDocument {
  absPath: string;
  relPath: string;
  title: string;
  mtime: number;
  sha256: string;
  companySlug?: string;
  companyName?: string;
  agent?: string;
  author?: string;
  category?: string;
  headers: string[];
  snippet: string;
  lowerContent: string;
  frontmatter: Record<string, string>;
}

// In-Memory Index Map: relPath -> VaultIndexedDocument
const INDEX_MAP = new Map<string, VaultIndexedDocument>();
let LAST_INDEX_TIME = 0;
let IS_BUILDING_INDEX = false;
const INDEX_TTL_MS = 10_000; // 10s stat-check TTL for warm cache

/**
 * Extracts YAML frontmatter and clean body from Markdown content
 */
function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  if (!raw.startsWith("---")) return { frontmatter: {}, body: raw };
  const parts = raw.split("---");
  if (parts.length < 3) return { frontmatter: {}, body: raw };

  const yamlStr = parts[1];
  const body = parts.slice(2).join("---").trim();
  const frontmatter: Record<string, string> = {};

  yamlStr.split("\n").forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      frontmatter[key] = val;
    }
  });

  return { frontmatter, body };
}

/**
 * Extracts Markdown headers (#, ##, ###)
 */
function extractHeaders(content: string): string[] {
  return content
    .split(/\r?\n/)
    .filter((l) => /^#{1,6}\s+/.test(l.trim()))
    .map((l) => l.replace(/^#{1,6}\s+/, "").trim());
}

/**
 * Generates preview snippet around index
 */
function previewAround(content: string, idx: number, span = 120): string {
  const start = Math.max(0, idx - span);
  const end = Math.min(content.length, idx + span);
  let p = content.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) p = "…" + p;
  if (end < content.length) p = p + "…";
  return p;
}

/**
 * Indexes or updates a single note document into the memory index
 */
export async function indexSingleDocument(absFile: string): Promise<VaultIndexedDocument | null> {
  try {
    if (!isWithinNipeiDomain(absFile)) {
      return null;
    }
    const st = await stat(absFile);
    const relPath = path.relative(VAULT_ROOT, absFile).replace(/\\/g, "/");

    // Check if cached version is still fresh
    const existing = INDEX_MAP.get(relPath);
    if (existing && existing.mtime === st.mtimeMs) {
      return existing;
    }

    const content = await readFile(absFile, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    const title = path.basename(absFile, ".md");
    const headers = extractHeaders(content);
    const sha256 = crypto.createHash("sha256").update(content).digest("hex");

    // Extract agent attribution signature or author
    let agent = "vault";
    const agentMatch = content.match(/<!--\s*agente:\s*([a-zA-Z0-9_-]+)\s*-->/i);
    if (agentMatch) {
      agent = agentMatch[1].toLowerCase();
    } else if (frontmatter.author) {
      const auth = frontmatter.author.toLowerCase();
      if (auth.includes("antigravity")) agent = "antigravity";
      else if (auth.includes("hermes")) agent = "hermes";
      else if (auth.includes("auditor")) agent = "auditor-ingesta";
      else agent = auth;
    }

    const doc: VaultIndexedDocument = {
      absPath: absFile,
      relPath,
      title,
      mtime: st.mtimeMs,
      sha256,
      companySlug: frontmatter.company || undefined,
      companyName: frontmatter.company_name || undefined,
      category: frontmatter.category || undefined,
      author: frontmatter.author || undefined,
      agent,
      headers,
      snippet: previewAround(body, 0),
      lowerContent: content.toLowerCase(),
      frontmatter,
    };

    INDEX_MAP.set(relPath, doc);
    return doc;
  } catch (e) {
    return null;
  }
}

/**
 * Ensures the Vault Memory Index is warm and updated
 */
export async function ensureVaultIndex(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - LAST_INDEX_TIME < INDEX_TTL_MS && INDEX_MAP.size > 0) {
    return INDEX_MAP.size;
  }

  if (IS_BUILDING_INDEX) return INDEX_MAP.size;
  IS_BUILDING_INDEX = true;

  try {
    const files = await listNotes();
    const currentRelPaths = new Set<string>();

    await Promise.all(
      files.map(async (absFile) => {
        if (!isWithinNipeiDomain(absFile)) return;
        const relPath = path.relative(VAULT_ROOT, absFile).replace(/\\/g, "/");
        currentRelPaths.add(relPath);
        await indexSingleDocument(absFile);
      })
    );

    // Evict deleted files
    for (const relPath of INDEX_MAP.keys()) {
      if (!currentRelPaths.has(relPath)) {
        INDEX_MAP.delete(relPath);
      }
    }

    LAST_INDEX_TIME = Date.now();
    return INDEX_MAP.size;
  } finally {
    IS_BUILDING_INDEX = false;
  }
}

/**
 * Immediately updates a note in memory after a write operation (0ms latency update)
 */
export function updateInMemoryIndex(relPath: string, content: string, mtime: number) {
  const absFile = safeJoin(relPath);
  if (!absFile) return;

  const normalizedRel = relPath.replace(/\\/g, "/");
  const { frontmatter, body } = parseFrontmatter(content);
  const title = path.basename(relPath, ".md");
  const headers = extractHeaders(content);
  const sha256 = crypto.createHash("sha256").update(content).digest("hex");

  let agent = "vault";
  const agentMatch = content.match(/<!--\s*agente:\s*([a-zA-Z0-9_-]+)\s*-->/i);
  if (agentMatch) {
    agent = agentMatch[1].toLowerCase();
  } else if (frontmatter.author) {
    const auth = frontmatter.author.toLowerCase();
    if (auth.includes("antigravity")) agent = "antigravity";
    else if (auth.includes("hermes")) agent = "hermes";
    else if (auth.includes("auditor")) agent = "auditor-ingesta";
    else agent = auth;
  }

  const doc: VaultIndexedDocument = {
    absPath: absFile,
    relPath: normalizedRel,
    title,
    mtime,
    sha256,
    companySlug: frontmatter.company || undefined,
    companyName: frontmatter.company_name || undefined,
    category: frontmatter.category || undefined,
    author: frontmatter.author || undefined,
    agent,
    headers,
    snippet: previewAround(body, 0),
    lowerContent: content.toLowerCase(),
    frontmatter,
  };

  INDEX_MAP.set(normalizedRel, doc);
}

/**
 * Fast Multi-Term Hybrid Search powered by in-memory index (< 2ms response time)
 */
export async function searchNotesIndexed(q: string, limit = 40): Promise<NoteHit[]> {
  const rawQ = q.trim();
  if (!rawQ) return [];
  const fullNeedle = rawQ.toLowerCase();

  await ensureVaultIndex();

  const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "en", "un", "una", "unos", "unas", "y", "o", "que", "con", "por", "para", "su", "sus", "a"]);
  const terms = fullNeedle
    .split(/\s+/)
    .map((t) => t.replace(/[^\w\u00C0-\u024F-]/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  const effectiveTerms = terms.length > 0 ? terms : fullNeedle.split(/\s+/).filter(Boolean);
  const hits: NoteHit[] = [];

  for (const doc of INDEX_MAP.values()) {
    const lowerContent = doc.lowerContent;
    const lowerTitle = doc.title.toLowerCase();

    let score = 0;
    let matchIdx = -1;

    // 1. Exact full phrase match (+25)
    const exactContentIdx = lowerContent.indexOf(fullNeedle);
    if (exactContentIdx !== -1) {
      score += 25;
      matchIdx = exactContentIdx;
    }

    // 2. Title matches (+15 exact title hit, +8 per term match)
    if (lowerTitle.includes(fullNeedle)) {
      score += 15;
    }
    for (const term of effectiveTerms) {
      if (lowerTitle.includes(term)) {
        score += 8;
      }
    }

    // 3. Header matches (# Header) (+6 per term match)
    const headerStr = doc.headers.join(" ").toLowerCase();
    for (const term of effectiveTerms) {
      if (headerStr.includes(term)) {
        score += 6;
      }
    }

    // 4. Content term frequency density (+3 per term occurrence up to 5x)
    let termsFoundCount = 0;
    let firstTermIdx = -1;
    for (const term of effectiveTerms) {
      let count = 0;
      let pos = lowerContent.indexOf(term);
      if (pos !== -1) {
        termsFoundCount++;
        if (firstTermIdx === -1 || pos < firstTermIdx) {
          firstTermIdx = pos;
        }
        while (pos !== -1 && count < 5) {
          count++;
          score += 3;
          pos = lowerContent.indexOf(term, pos + term.length);
        }
      }
    }

    // 5. Bonus if ALL query terms were found in document (+10)
    if (termsFoundCount > 0 && termsFoundCount === effectiveTerms.length) {
      score += 10;
    }

    if (score <= 0) continue;

    const snippetIdx = matchIdx !== -1 ? matchIdx : firstTermIdx !== -1 ? firstTermIdx : 0;

    hits.push({
      path: doc.relPath,
      title: doc.title,
      preview: previewAround(doc.lowerContent, snippetIdx),
      score,
      mtime: doc.mtime,
    });
  }

  hits.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  return hits.slice(0, limit);
}

/**
 * Fast Company Notes Lookup powered by in-memory index (< 2ms response time)
 */
export async function getCompanyNotesIndexed(
  companySlug: string,
  companyName: string,
  limit = 50
): Promise<NoteHit[]> {
  const normSlug = (companySlug || "").trim().toLowerCase();
  const normName = (companyName || "").trim().toLowerCase();
  if (!normSlug && !normName) return [];

  await ensureVaultIndex();

  const hits: NoteHit[] = [];

  for (const doc of INDEX_MAP.values()) {
    const lowerRel = doc.relPath.toLowerCase();
    const lowerTitle = doc.title.toLowerCase();
    const lowerContent = doc.lowerContent;

    let score = 0;
    let matchIdx = -1;

    // 1. Path matches company slug or name (+30)
    if ((normSlug && lowerRel.includes(normSlug)) || (normName && lowerRel.includes(normName))) {
      score += 30;
    }

    // 2. YAML Frontmatter metadata match (+25)
    if (
      (normSlug && (doc.companySlug?.toLowerCase() === normSlug || lowerContent.includes(`company: "${normSlug}"`))) ||
      (normName && (doc.companyName?.toLowerCase() === normName || lowerContent.includes(`company_name: "${normName}"`)))
    ) {
      score += 25;
    }

    // 3. Title match (+20)
    if ((normSlug && lowerTitle.includes(normSlug)) || (normName && lowerTitle.includes(normName))) {
      score += 20;
    }

    // 4. Content body mentions (+10 per occurrence up to 3x)
    const targetTerms = [normName, normSlug].filter(Boolean);
    for (const term of targetTerms) {
      if (!term || term.length < 3) continue;
      let pos = lowerContent.indexOf(term);
      let count = 0;
      if (pos !== -1 && matchIdx === -1) matchIdx = pos;
      while (pos !== -1 && count < 3) {
        score += 10;
        count++;
        pos = lowerContent.indexOf(term, pos + term.length);
      }
    }

    if (score <= 0) continue;

    hits.push({
      path: doc.relPath,
      title: doc.title,
      preview: previewAround(doc.lowerContent, matchIdx !== -1 ? matchIdx : 0),
      score,
      mtime: doc.mtime,
    });
  }

  hits.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  return hits.slice(0, limit);
}

/**
 * Fast Recent Notes Lookup powered by in-memory index (< 1ms response time)
 */
export async function recentNotesIndexed(limit = 12): Promise<{ path: string; title: string; mtime: number }[]> {
  await ensureVaultIndex();
  const docs = Array.from(INDEX_MAP.values());
  docs.sort((a, b) => b.mtime - a.mtime);
  return docs.slice(0, limit).map((d) => ({
    path: d.relPath,
    title: d.title,
    mtime: d.mtime,
  }));
}

/**
 * Returns overall Vault Index statistics
 */
export async function getVaultIndexStats() {
  await ensureVaultIndex();
  const docs = Array.from(INDEX_MAP.values());
  const companyCounts: Record<string, number> = {};
  const agentCounts: Record<string, number> = {};

  docs.forEach((d) => {
    if (d.companySlug) {
      companyCounts[d.companySlug] = (companyCounts[d.companySlug] || 0) + 1;
    }
    if (d.agent) {
      agentCounts[d.agent] = (agentCounts[d.agent] || 0) + 1;
    }
  });

  return {
    totalIndexedNotes: INDEX_MAP.size,
    lastIndexTime: LAST_INDEX_TIME,
    companyCounts,
    agentCounts,
    vaultRoot: VAULT_ROOT,
  };
}

/**
 * Returns all documents currently held in the warm in-memory index
 */
export async function getAllIndexedDocuments(): Promise<VaultIndexedDocument[]> {
  await ensureVaultIndex();
  return Array.from(INDEX_MAP.values());
}

