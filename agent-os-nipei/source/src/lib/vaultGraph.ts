import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { listNotes, VAULT_ROOT } from "./vault";
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

export async function buildVaultGraph(companySlug?: string): Promise<VaultGraph> {
  if (!VAULT_ROOT) return { nodes: [], links: [] };

  const normSlug = companySlug?.trim().toLowerCase();
  const files = await listNotes();

  // Index by title (lowercased) → relative path
  const byTitle = new Map<string, string>();
  const meta = new Map<string, { rel: string; title: string; group: string; mtime: number; content?: string }>();

  await Promise.all(
    files.map(async (abs) => {
      const rel = path.relative(VAULT_ROOT, abs).replace(/\\/g, "/");
      const title = path.basename(abs, ".md");
      const head = rel.split("/")[0] || "root";
      const group = rel.includes("/") ? head : "root";
      let mtime = 0;
      try {
        const st = await stat(abs);
        mtime = st.mtimeMs;
      } catch {}
      meta.set(rel, { rel, title, group, mtime });
      if (!byTitle.has(title.toLowerCase())) byTitle.set(title.toLowerCase(), rel);
    })
  );

  const linkSet = new Set<string>();
  const links: GraphLink[] = [];
  const degree = new Map<string, number>();

  await Promise.all(
    files.map(async (abs) => {
      const rel = path.relative(VAULT_ROOT, abs).replace(/\\/g, "/");
      let content = "";
      try {
        content = await readFile(abs, "utf8");
      } catch {
        return;
      }
      const item = meta.get(rel);
      if (item) item.content = content;

      const matches = content.matchAll(WIKILINK_RE);
      for (const m of matches) {
        const targetTitle = m[1].trim();
        if (!targetTitle) continue;
        const targetRel = byTitle.get(targetTitle.toLowerCase());
        if (!targetRel || targetRel === rel) continue;
        const key = rel + "→" + targetRel;
        if (linkSet.has(key)) continue;
        linkSet.add(key);
        links.push({ source: rel, target: targetRel });
        degree.set(rel, (degree.get(rel) ?? 0) + 1);
        degree.set(targetRel, (degree.get(targetRel) ?? 0) + 1);
      }
    })
  );

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

  // Also include notes connected via wikilinks to matched notes
  links.forEach((l) => {
    if (matchedRels.has(l.source)) matchedRels.add(l.target);
    if (matchedRels.has(l.target)) matchedRels.add(l.source);
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

