import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { listNotes, VAULT_ROOT, isRawUpload } from "./vault";
import { getAllIndexedDocuments } from "./vaultIndex";

// Build a knowledge-graph from the vault: nodes = notes, links = [[wikilinks]].
// Folder of the note → color group. Out-degree+in-degree → size.

export interface GraphNode {
  id: string;        // relative path (unique key)
  title: string;     // basename (display label)
  group: string;     // top-level folder
  degree: number;    // links in + out
  mtime: number;
}
export interface GraphLink { source: string; target: string; }
export interface VaultGraph { nodes: GraphNode[]; links: GraphLink[]; }

const WIKILINK_RE = /\[\[([^\[\]\n|#]+)(?:#[^\[\]\n|]+)?(?:\|[^\[\]\n]+)?\]\]/g;

// Notion exports append a 32-hex page id to filenames; "Projeto: X (url)" values carry a trailing link.
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+[0-9a-f]{32}$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function frontmatter(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const splitList = (v: string) => v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);

// Values in a note that name another note: frontmatter (tasks/projects) + Notion export properties in the body.
function referencedNames(content: string): string[] {
  const fm = frontmatter(content);
  const out: string[] = [];
  for (const k of ["project", "squad", "squad_id"]) if (fm[k]) out.push(fm[k]);
  if (fm.responsible) out.push(...splitList(fm.responsible));
  for (const m of content.matchAll(/^Projeto:\s*(.+)$/gm)) out.push(m[1]);
  for (const m of content.matchAll(/^Respons[aá]vel:\s*(.+)$/gm)) out.push(...splitList(m[1]));
  return out;
}

interface BaseGraph {
  meta: Map<string, { rel: string; title: string; group: string; mtime: number }>;
  links: GraphLink[];
  degree: Map<string, number>;
}

// Every request used to re-read the whole vault; rebuild only when a note is added/removed/edited.
let cache: { key: string; base: BaseGraph } | null = null;

async function buildBaseGraph(): Promise<BaseGraph> {
  const files = await listNotes();
  const meta: BaseGraph["meta"] = new Map();
  await Promise.all(
    files.map(async (abs) => {
      const rel = path.relative(VAULT_ROOT, abs).replace(/\\/g, "/");
      if (isRawUpload(rel)) return;
      const head = rel.split("/")[0] || "root";
      let mtime = 0;
      try {
        mtime = (await stat(abs)).mtimeMs;
      } catch {}
      meta.set(rel, { rel, title: path.basename(abs, ".md"), group: rel.includes("/") ? head : "root", mtime });
    })
  );

  const cacheKey = `${meta.size}:${Math.max(0, ...Array.from(meta.values(), (m) => m.mtime))}`;
  if (cache?.key === cacheKey) return cache.base;

  const contents = new Map<string, string>();
  await Promise.all(
    Array.from(meta.keys()).map(async (rel) => {
      try {
        contents.set(rel, await readFile(path.join(VAULT_ROOT, rel), "utf8"));
      } catch {}
    })
  );

  // Index by title (lowercased) → relative path
  const byTitle = new Map<string, string>();
  for (const m of meta.values()) if (!byTitle.has(m.title.toLowerCase())) byTitle.set(m.title.toLowerCase(), m.rel);

  // Looser index for frontmatter references: canonical filenames, then id/title/name.
  const byKey = new Map<string, string>();
  const addKey = (k: string, rel: string) => {
    const s = slug(k);
    if (s && !byKey.has(s)) byKey.set(s, rel);
  };
  for (const m of meta.values()) addKey(m.title, m.rel);
  for (const [rel, c] of contents) {
    const fm = frontmatter(c);
    for (const k of ["id", "title", "name"]) if (fm[k]) addKey(fm[k], rel);
  }
  // squad_id "Squad_01_CEO" / squad "squad_1_ceo" → Squads/squad_1_*.md
  const squadByNum = new Map<string, string>();
  for (const rel of meta.keys()) {
    const m = rel.match(/^Squads\/squad_(\d+)_[^/]+\.md$/);
    if (m) squadByNum.set(m[1], rel);
  }
  const resolveName = (v: string): string | undefined => {
    v = v.replace(/\[\[|\]\]/g, "").replace(/\s*\([^()]*\)\s*$/, "").trim();
    const sq = v.match(/^squad[_ ]0*(\d+)/i);
    if (sq) return squadByNum.get(sq[1]);
    return byKey.get(slug(v));
  };

  const linkSet = new Set<string>();
  const links: GraphLink[] = [];
  const degree = new Map<string, number>();
  const addLink = (source: string, target: string) => {
    if (source === target || linkSet.has(source + "→" + target) || linkSet.has(target + "→" + source)) return;
    linkSet.add(source + "→" + target);
    links.push({ source, target });
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  };

  for (const [rel, content] of contents) {
    for (const m of content.matchAll(WIKILINK_RE)) {
      const targetRel = byTitle.get(m[1].trim().toLowerCase());
      if (targetRel) addLink(rel, targetRel);
    }
    // Structural links: only to notes that exist, never synthetic nodes.
    for (const name of referencedNames(content)) {
      const targetRel = resolveName(name);
      if (targetRel) addLink(rel, targetRel);
    }
    // Relative markdown links, e.g. Notion "Projeto: X (X%20abc….md)".
    for (const m of content.matchAll(/\(([^()\s][^()\n]*?\.md)\)/g)) {
      let p: string;
      try {
        p = decodeURIComponent(m[1]);
      } catch {
        continue;
      }
      const targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(rel), p));
      if (meta.has(targetRel)) addLink(rel, targetRel);
    }
  }

  const base = { meta, links, degree };
  cache = { key: cacheKey, base };
  return base;
}

export async function buildVaultGraph(companySlug?: string): Promise<VaultGraph> {
  if (!VAULT_ROOT) return { nodes: [], links: [] };

  const normSlug = companySlug?.trim().toLowerCase();
  const { meta, links, degree } = await buildBaseGraph();

  // If no company filter or "all", return full global graph
  if (!normSlug || normSlug === "all") {
    const nodes: GraphNode[] = Array.from(meta.values()).map((m) => ({
      id: m.rel,
      title: m.title,
      group: m.group,
      degree: degree.get(m.rel) ?? 0,
      mtime: m.mtime,
    }));
    return { nodes, links };
  }

  // Company Specific Graph Construction
  const companyTitle = normSlug.replace(/[-_]/g, " ").toUpperCase();
  const hubId = `CompanyHub-${normSlug}`;

  // Filter relevant documents for this company
  const matchedRels = new Set<string>();
  const docs = await getAllIndexedDocuments();

  docs.forEach((doc) => {
    const lowerRel = doc.relPath.toLowerCase();
    const lowerTitle = doc.title.toLowerCase();
    const docCompany = doc.companySlug?.toLowerCase();

    if (
      lowerRel.includes(normSlug) ||
      lowerTitle.includes(normSlug) ||
      docCompany === normSlug ||
      (doc.companyName && doc.companyName.toLowerCase().includes(normSlug))
    ) {
      matchedRels.add(doc.relPath);
    }
  });

  // Also include direct neighbours of matched notes (one hop from the seeds only — squad/member hubs
  // would otherwise cascade the whole vault in as the set grows mid-iteration)
  const seeds = new Set(matchedRels);
  links.forEach((l) => {
    if (seeds.has(l.source)) matchedRels.add(l.target);
    if (seeds.has(l.target)) matchedRels.add(l.source);
  });

  // Construct filtered links
  const companyLinks: GraphLink[] = links.filter(
    (l) => matchedRels.has(l.source) && matchedRels.has(l.target)
  );

  // Group helper function for orbital graph hierarchy
  function determineNodeGroup(relPath: string, title: string, headGroup: string): string {
    const lower = (relPath + " " + title).toLowerCase();
    if (lower.includes("ficha_maestra") || lower.includes("ficha maestra")) {
      return "00 Ficha Maestra";
    }
    if (lower.includes("infraestructura") || lower.includes("vps") || lower.includes("servidor")) {
      return "01 Infraestructura VPS";
    }
    if (lower.includes("roadmap") || lower.includes("sprint") || lower.includes("tareas") || lower.includes("backlog")) {
      return "02 Roadmap Sprints";
    }
    if (lower.includes("minuta") || lower.includes("reunion") || lower.includes("acuerdos")) {
      return "03 Minutas Reuniones";
    }
    if (headGroup && headGroup !== "root") {
      return headGroup;
    }
    return "04 Conocimiento Ingestado";
  }

  // Connect Central Hub Node to all matched company nodes
  const companyNodes: GraphNode[] = [
    {
      id: hubId,
      title: `🏢 ${companyTitle}`,
      group: "00 Company Core",
      degree: matchedRels.size + 10,
      mtime: Date.now(),
    },
  ];

  matchedRels.forEach((rel) => {
    const m = meta.get(rel);
    if (m) {
      const orbitalGroup = determineNodeGroup(m.rel, m.title, m.group);
      companyNodes.push({
        id: m.rel,
        title: m.title,
        group: orbitalGroup,
        degree: (degree.get(m.rel) ?? 0) + 1,
        mtime: m.mtime,
      });

      // Synthetic link from central hub to note
      companyLinks.push({
        source: hubId,
        target: m.rel,
      });
    }
  });

  return { nodes: companyNodes, links: companyLinks };
}

