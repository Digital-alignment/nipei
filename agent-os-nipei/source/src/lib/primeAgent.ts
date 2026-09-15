// Prime Agent integration — github.com/PrimeIntellect-ai/prime-agent (MIT, Aug 2026).
//
// A self-improving RLM harness: the model gets ONE persistent IPython kernel and
// every tool, skill and subagent is Python code it writes into that kernel. So the
// terminal here shows the REAL code the agent runs, not an opaque tool schema.
//
// Installed via `curl -fsSL https://app.primeintellect.ai/prime-agent/install.sh | sh`
// (npm global). E2E receipt 2026-08-11: `prime-agent --mode json -p "write hello.txt…"`
// → provider openai / gpt-5.4 → the file appeared on disk with the right contents.
//
// State lives in ~/.prime/agent/ (sessions/*.jsonl, daemon-workers, kernel-venv).
// Builds the OS drives land in ~/.nipei-os/prime-agent/builds/<project>/.

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const CANDIDATE_BINS = [
  path.join(os.homedir(), ".hermes/node/bin/prime-agent"),
  path.join(os.homedir(), ".local/bin/prime-agent"),
  "/opt/homebrew/bin/prime-agent",
  "/usr/local/bin/prime-agent",
];

export const PRIME_BUILDS = path.join(os.homedir(), ".nipei-os", "prime-agent", "builds");
export const PRIME_SESSIONS = path.join(os.homedir(), ".prime", "agent", "sessions");

export function primeBin(): string | null {
  for (const b of CANDIDATE_BINS) if (existsSync(b)) return b;
  return null;
}
export function primeInstalled(): boolean { return primeBin() !== null; }

export const PRIME_PATH = [
  path.join(os.homedir(), ".hermes/node/bin"),
  path.join(os.homedir(), ".local/bin"),
  "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin",
  process.env.PATH || "",
].filter(Boolean).join(":");

// ── sessions (the daemon keeps every session; this is the History tab) ──────
export interface PrimeSessionMeta {
  id: string; model: string | null; provider: string | null; cwd: string | null;
  messages: number; firstPrompt: string | null; mtime: number; bytes: number;
}
export interface PrimeMessage { role: string; text: string }

function blockText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const out: string[] = [];
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    if (o.type === "text" && typeof o.text === "string") out.push(o.text);
    else if (o.type === "toolCall") {
      const args = (o.arguments ?? {}) as Record<string, unknown>;
      const code = typeof args.code === "string" ? args.code : JSON.stringify(args);
      out.push(`[${String(o.name ?? "tool")}]\n${code}`);
    }
  }
  return out.join("\n").trim();
}

export async function listPrimeSessions(limit = 40): Promise<PrimeSessionMeta[]> {
  if (!existsSync(PRIME_SESSIONS)) return [];
  let names: string[] = [];
  try { names = (await readdir(PRIME_SESSIONS)).filter((n) => n.endsWith(".jsonl")); } catch { return []; }
  const metas: PrimeSessionMeta[] = [];
  for (const n of names) {
    const full = path.join(PRIME_SESSIONS, n);
    try {
      const st = await stat(full);
      if (st.size > 40_000_000) continue;
      const raw = await readFile(full, "utf8");
      const lines = raw.split("\n").filter((l) => l.startsWith("{"));
      let model: string | null = null, provider: string | null = null, cwd: string | null = null;
      let firstPrompt: string | null = null, msgs = 0;
      for (const l of lines) {
        let d: Record<string, unknown>;
        try { d = JSON.parse(l); } catch { continue; }
        if (d.type === "session") cwd = (d.cwd as string) ?? cwd;
        else if (d.type === "model_change") { model = (d.modelId as string) ?? model; provider = (d.provider as string) ?? provider; }
        else if (d.type === "message") {
          const m = d.message as Record<string, unknown> | undefined;
          if (!m) continue;
          if (m.role === "user" || m.role === "assistant") msgs++;
          if (!firstPrompt && m.role === "user") firstPrompt = blockText(m.content).slice(0, 140) || null;
        }
      }
      metas.push({ id: n.replace(/\.jsonl$/, ""), model, provider, cwd, messages: msgs, firstPrompt, mtime: st.mtimeMs, bytes: st.size });
    } catch { /* skip unreadable */ }
  }
  metas.sort((a, b) => b.mtime - a.mtime);
  return metas.slice(0, limit);
}

export async function readPrimeTranscript(id: string): Promise<{ meta: PrimeSessionMeta; messages: PrimeMessage[] } | null> {
  if (!/^[A-Za-z0-9_.-]+$/.test(id)) return null;
  const full = path.join(PRIME_SESSIONS, `${id}.jsonl`);
  if (!full.startsWith(PRIME_SESSIONS + path.sep) || !existsSync(full)) return null;
  try {
    const st = await stat(full);
    const raw = await readFile(full, "utf8");
    const messages: PrimeMessage[] = [];
    let model: string | null = null, provider: string | null = null, cwd: string | null = null, firstPrompt: string | null = null;
    for (const l of raw.split("\n")) {
      if (!l.startsWith("{")) continue;
      let d: Record<string, unknown>;
      try { d = JSON.parse(l); } catch { continue; }
      if (d.type === "session") cwd = (d.cwd as string) ?? cwd;
      else if (d.type === "model_change") { model = (d.modelId as string) ?? model; provider = (d.provider as string) ?? provider; }
      else if (d.type === "message") {
        const m = d.message as Record<string, unknown> | undefined;
        if (!m) continue;
        const role = String(m.role ?? "");
        if (role !== "user" && role !== "assistant" && role !== "toolResult") continue;
        const text = blockText(m.content).slice(0, 12_000);
        if (!text) continue;
        if (!firstPrompt && role === "user") firstPrompt = text.slice(0, 140);
        messages.push({ role, text });
      }
    }
    return {
      meta: { id, model, provider, cwd, messages: messages.length, firstPrompt, mtime: st.mtimeMs, bytes: st.size },
      messages: messages.slice(-200),
    };
  } catch { return null; }
}

// ── builds workspace (visual-first — showcase files only) ──────────────────
const SHOWCASE = new Set([".html", ".htm", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mp3", ".wav", ".pdf", ".txt", ".md", ".csv", ".json"]);
export interface PrimeBuild { project: string; mtime: number; fileCount: number; html: string[]; files: { rel: string; bytes: number }[] }

export async function listPrimeBuilds(): Promise<PrimeBuild[]> {
  if (!existsSync(PRIME_BUILDS)) return [];
  const out: PrimeBuild[] = [];
  let dirs: string[] = [];
  try { dirs = await readdir(PRIME_BUILDS); } catch { return []; }
  for (const d of dirs) {
    if (d.startsWith(".")) continue;
    const root = path.join(PRIME_BUILDS, d);
    try {
      const st = await stat(root);
      if (!st.isDirectory()) continue;
      const files: { rel: string; bytes: number }[] = [];
      const html: string[] = [];
      async function walk(dir: string, depth: number) {
        if (depth > 4 || files.length > 80) return;
        for (const n of await readdir(dir)) {
          if (n.startsWith(".") || n === "node_modules") continue;
          const full = path.join(dir, n);
          const s = await stat(full);
          if (s.isDirectory()) { await walk(full, depth + 1); continue; }
          if (!SHOWCASE.has(path.extname(n).toLowerCase())) continue;
          const rel = path.relative(root, full);
          files.push({ rel, bytes: s.size });
          if (/\.html?$/i.test(n)) html.push(rel);
        }
      }
      await walk(root, 0);
      html.sort((a, b) => (/(^|\/)index\.html$/i.test(a) ? -1 : 0) - (/(^|\/)index\.html$/i.test(b) ? -1 : 0));
      out.push({ project: d, mtime: st.mtimeMs, fileCount: files.length, html, files });
    } catch { /* skip */ }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}
