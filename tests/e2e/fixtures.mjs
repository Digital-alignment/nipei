/**
 * Temp task notes in the canonical vault, and their cleanup.
 * Every artifact the suite creates carries the `zz_e2e` marker; cleanup only ever deletes
 * files/folders whose name contains it, so real tasks are never touched.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const VAULT_ROOT = process.env.VAULT_PATH || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";
export const TAREFAS_REL = "Productivity/Tarefas";
export const MARKER = "zz_e2e";

const TAREFAS_DIR = path.join(VAULT_ROOT, TAREFAS_REL);
const WORKSPACE_DIR = path.join(VAULT_ROOT, "Task_Workspace");

export const abs = (vaultPath) => path.join(VAULT_ROOT, vaultPath);
export const uid = () => `${MARKER}_${crypto.randomBytes(4).toString("hex")}`;

/** Writes a task note straight into Productivity/Tarefas. Returns { id, title, vaultPath }. */
export function writeTempNote({ id = uid(), title, status = "A fazer", agents, squad, extraFrontmatter = "", body = "Nota de teste E2E." } = {}) {
  title = title || `${id} tarefa de teste`;
  const lines = [
    "---",
    `id: "${id}"`,
    `title: "${title}"`,
    `type: "tarefa"`,
    `status: "${status}"`,
    `priority: "Média"`,
    squad ? `squad: "${squad}"` : null,
    agents ? `agents: [${agents.map((a) => JSON.stringify(a)).join(", ")}]` : null,
    extraFrontmatter || null,
    "---",
    "",
    `# Tarefa: ${title}`,
    "",
    body,
    "",
  ].filter((l) => l !== null);
  const vaultPath = `${TAREFAS_REL}/${id}.md`;
  fs.writeFileSync(abs(vaultPath), lines.join("\n"), "utf-8");
  return { id, title, vaultPath };
}

/** Deletes every zz_e2e task note and every zz_e2e Task_Workspace folder. */
export function cleanupAll() {
  const removed = [];
  if (fs.existsSync(TAREFAS_DIR)) {
    for (const f of fs.readdirSync(TAREFAS_DIR)) {
      if (f.includes(MARKER)) {
        fs.rmSync(path.join(TAREFAS_DIR, f), { force: true });
        removed.push(`${TAREFAS_REL}/${f}`);
      }
    }
  }
  // Workspace layout: Task_Workspace/<year>/<squad>/<taskFolder>
  if (fs.existsSync(WORKSPACE_DIR)) {
    for (const year of fs.readdirSync(WORKSPACE_DIR)) {
      const yearDir = path.join(WORKSPACE_DIR, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;
      for (const squad of fs.readdirSync(yearDir)) {
        const squadDir = path.join(yearDir, squad);
        if (!fs.statSync(squadDir).isDirectory()) continue;
        for (const t of fs.readdirSync(squadDir)) {
          if (t.includes(MARKER)) {
            fs.rmSync(path.join(squadDir, t), { recursive: true, force: true });
            removed.push(`Task_Workspace/${year}/${squad}/${t}`);
          }
        }
        // Drop squad folders the suite itself created and left empty
        if (squad.includes(MARKER) && fs.readdirSync(squadDir).length === 0) fs.rmdirSync(squadDir);
      }
    }
  }
  return removed;
}

/** name -> "size:mtime" of every real (non-zz_e2e) task note, to prove the suite left them alone. */
export function snapshotRealTasks() {
  const snap = {};
  for (const f of fs.readdirSync(TAREFAS_DIR)) {
    if (f.includes(MARKER)) continue;
    const st = fs.statSync(path.join(TAREFAS_DIR, f));
    snap[f] = `${st.size}:${st.mtimeMs}`;
  }
  return snap;
}
