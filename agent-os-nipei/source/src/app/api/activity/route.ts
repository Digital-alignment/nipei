import { NextResponse } from "next/server";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";
import { listNotes, safeJoin, VAULT_ROOT } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_DIRS = [
  { agent: "openclaw", dir: config.openclawLogs },
  { agent: "hermes", dir: config.hermesLogs },
];

export interface ActivityEntry {
  ts: number;
  agent: string;
  text: string;
  level?: "info" | "warn" | "err";
  path?: string;
  title?: string;
}

async function tailFile(file: string, agent: string, max = 20): Promise<ActivityEntry[]> {
  try {
    const data = await readFile(file, "utf8");
    const lines = data.split(/\r?\n/).filter(Boolean).slice(-max);
    const st = await stat(file);
    const baseTs = st.mtimeMs;
    return lines.map((line, i) => ({
      ts: baseTs - (lines.length - i) * 200,
      agent,
      text: line.length > 300 ? line.slice(0, 300) + "…" : line,
      level: /error|fail/i.test(line) ? "err" : /warn/i.test(line) ? "warn" : "info",
    }));
  } catch {
    return [];
  }
}

async function getVaultActivityEntries(max = 40): Promise<ActivityEntry[]> {
  if (!VAULT_ROOT) return [];
  try {
    const files = await listNotes();
    const fileStats = await Promise.all(
      files.map(async (f) => {
        try {
          const s = await stat(f);
          return { file: f, mtime: s.mtimeMs };
        } catch {
          return { file: f, mtime: 0 };
        }
      })
    );

    fileStats.sort((a, b) => b.mtime - a.mtime);
    const recentFiles = fileStats.slice(0, max);

    const entries: ActivityEntry[] = [];
    for (const { file, mtime } of recentFiles) {
      if (!mtime) continue;
      try {
        const content = await readFile(file, "utf8");
        const relPath = path.relative(VAULT_ROOT, file).replace(/\\/g, "/");
        const title = path.basename(file, ".md");

        // Parse agent signature or author
        let agentName = "vault";
        const agentMatch = content.match(/<!--\s*agente:\s*([a-zA-Z0-9_-]+)\s*-->/i);
        const authorMatch = content.match(/author:\s*"?([^"\n]+)"?/i);

        if (agentMatch) {
          agentName = agentMatch[1].toLowerCase();
        } else if (authorMatch) {
          const author = authorMatch[1].toLowerCase();
          if (author.includes("antigravity")) agentName = "antigravity";
          else if (author.includes("hermes")) agentName = "hermes";
          else if (author.includes("auditor")) agentName = "auditor-ingesta";
          else agentName = author;
        }

        const agentLabel =
          agentName === "antigravity"
            ? "Antigravity"
            : agentName === "hermes"
            ? "Hermes 2.0"
            : agentName === "auditor-ingesta"
            ? "Auditor Ingesta"
            : agentName;

        entries.push({
          ts: mtime,
          agent: agentName,
          title,
          path: relPath,
          text: `📝 [${agentLabel}] Escribió en '${title}' (${relPath})`,
          level: "info",
        });
      } catch {
        /* skip read error */
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export async function GET() {
  const out: ActivityEntry[] = [];

  // Fetch Vault live file activities
  const vaultEntries = await getVaultActivityEntries(40);
  out.push(...vaultEntries);

  // Fetch traditional agent log files
  for (const { agent, dir } of LOG_DIRS) {
    try {
      const items = await readdir(dir);
      const files = items.filter((f) => /\.log$/.test(f)).slice(0, 3);
      for (const f of files) {
        out.push(...(await tailFile(path.join(dir, f), agent, 15)));
      }
    } catch {
      /* ignore */
    }
  }

  out.sort((a, b) => b.ts - a.ts);
  return NextResponse.json({ entries: out.slice(0, 80) });
}
