/**
 * Reads a vault task note back from disk and checks it against the task-note contract
 * the kanban relies on (frontmatter id/title/status, parseable agents line).
 */

import fs from "node:fs";
import { abs } from "./fixtures.mjs";

export const KANBAN_COLUMNS = ["triage", "todo", "in_progress", "agent_executing", "review", "done", "archived"];

/** Returns { raw, fm, body, agents } for a vault-relative note path. Mirrors parseAgentsFrontmatter. */
export function readNote(vaultPath) {
  const raw = fs.readFileSync(abs(vaultPath), "utf-8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = {};
  for (const line of (m?.[1] || "").split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
  }
  const agents = fm.agents
    ? fm.agents.replace(/[\[\]"']/g, "").split(",").map((a) => a.trim()).filter(Boolean)
    : null;
  return { raw, fm, body: m?.[2] ?? raw, agents };
}

/** Returns a list of contract violations (empty = valid). */
export function validateTaskNote(vaultPath) {
  const errors = [];
  let note;
  try {
    note = readNote(vaultPath);
  } catch (e) {
    return [`cannot read ${vaultPath}: ${e.message}`];
  }
  if (!/^---\r?\n/.test(note.raw)) errors.push("missing frontmatter");
  for (const key of ["id", "title", "status"]) if (!note.fm[key]) errors.push(`missing frontmatter key: ${key}`);
  if ("agents" in note.fm && !/^\[.*\]$/.test(note.fm.agents)) errors.push(`agents is not an inline list: ${note.fm.agents}`);
  if ((note.raw.match(/^agents:/gm) || []).length > 1) errors.push("duplicate agents: line");
  return errors;
}
