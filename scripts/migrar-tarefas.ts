// One-off: rewrite every task note in the v2 format (T0). Idempotent.
//   node scripts/migrar-tarefas.ts <vaultRoot> [--dry]   (run from nipei-control/)
// Checks, per note, that no frontmatter value changed and that the v1 kanban parser still
// reads the same id/title/status/priority/project/responsible/prazo; aborts on any mismatch.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { TAREFAS_DIR, migrarTarefa } from "../agent-os-nipei/source/src/lib/tarefaNote.ts";

// js-yaml lives in the app's node_modules, not next to this script.
const yaml = createRequire(new URL("../agent-os-nipei/source/package.json", import.meta.url))("js-yaml");

const [vaultRoot, flag] = process.argv.slice(2);
if (!vaultRoot) throw new Error("usage: node scripts/migrar-tarefas.ts <vaultRoot> [--dry]");
const dry = flag === "--dry";
const dir = path.join(vaultRoot, TAREFAS_DIR);

const fmOf = (t: string) => (yaml.load(t.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1], { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>) || {};
// Same regexes as lib/kanbanGrounding.ts getLiveKanbanTasks (first match anywhere in the file).
const V1 = ["id", "title", "status", "priority", "project", "responsible", "prazo"];
const v1 = (t: string) => Object.fromEntries(V1.map((k) => [k, t.match(new RegExp(`${k}:\\s*"?([^"\\n\\r]+)"?`))?.[1]?.trim() ?? ""]));

let changed = 0;
const problems: string[] = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md")).sort()) {
  const p = path.join(dir, f);
  const before = fs.readFileSync(p, "utf-8");
  const after = migrarTarefa(before);
  if (after === before) continue;
  const a = fmOf(before), b = fmOf(after);
  for (const [k, v] of Object.entries(a)) if (JSON.stringify(v) !== JSON.stringify(b[k])) problems.push(`${f}: frontmatter ${k} changed`);
  const va = v1(before), vb = v1(after);
  for (const k of V1) if (va[k] && va[k] !== vb[k]) problems.push(`${f}: v1 ${k} "${va[k]}" → "${vb[k]}"`);
  if (migrarTarefa(after) !== after) problems.push(`${f}: not idempotent`);
  changed++;
  if (!dry) fs.writeFileSync(p, after, "utf-8");
}
console.log(`${dry ? "[dry] " : ""}${changed} notes ${dry ? "would change" : "migrated"}; ${problems.length} problems`);
for (const x of problems.slice(0, 40)) console.log("  " + x);
if (problems.length) process.exit(1);
