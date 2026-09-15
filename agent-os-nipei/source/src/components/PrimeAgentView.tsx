"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Loader2, ExternalLink, RefreshCw, CornerDownLeft, History as HistoryIcon, ArrowLeft, ShieldCheck, Terminal as TermIcon } from "lucide-react";

// Prime Agent — the self-improving RLM harness from Prime Intellect (MIT).
// Three tabs:
//   Terminal  — prime-agent streamed live, showing the REAL Python it runs in its
//               one persistent workspace (every tool is code, not a schema)
//   Workspace — the builds gallery (live previews of what it made)
//   Sessions  — every prime-agent session on this Mac, readable end to end
//
// Autonomous mode + quality gates are wired into the composer: flip Autonomous on,
// add gate commands, and the agent is not allowed to call the job done until every
// gate exits 0.

const PA = "#8b5cf6";      // Prime violet
const SCAN = "#0ea5e9";    // Prime scan blue
const OK = "#34E5B0";
const TERM_LSK = "nipei-os/prime/terminal/v1";

type Tab = "terminal" | "workspace" | "sessions";
interface Line {
  kind: "user" | "text" | "think" | "tool" | "tool_result" | "result" | "system" | "error" | "stderr" | "info" | "gate";
  text?: string; name?: string; code?: string; ok?: boolean;
  ms?: number; model?: string; provider?: string; subtype?: string; session?: string;
}
interface Build { project: string; mtime: number; fileCount: number; html: string[]; files: { rel: string; bytes: number }[] }
interface SessionMeta { id: string; model: string | null; provider: string | null; cwd: string | null; messages: number; firstPrompt: string | null; mtime: number }
interface Transcript { meta: SessionMeta; messages: { role: string; text: string }[] }

const EXAMPLES = [
  "a glowing 3-column pricing page that animates in",
  "an animated bar chart of 5 made-up sales months",
  "a neon starfield I can steer with the mouse",
];

const GATE_PRESETS = [
  { label: "index.html exists", cmd: "test -f index.html" },
  { label: "page is not empty", cmd: "test $(wc -c < index.html) -gt 800" },
  { label: "has a <canvas>", cmd: "grep -q '<canvas' index.html" },
];

function ago(ms: number): string {
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function PrimeAgentView() {
  const [tab, setTab] = useState<Tab>("terminal");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [building, setBuilding] = useState(false);
  const [project, setProject] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [autonomous, setAutonomous] = useState(true);
  const [gates, setGates] = useState<string[]>([GATE_PRESETS[0].cmd, GATE_PRESETS[1].cmd]);
  const ctrlRef = useRef<AbortController | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  const [builds, setBuilds] = useState<Build[]>([]);
  const loadBuilds = useCallback(async () => {
    try { const r = await fetch("/api/prime/workspace", { cache: "no-store" }); const j = await r.json(); setBuilds(j.builds ?? []); setInstalled(!!j.installed); } catch { /* offline */ }
  }, []);

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const loadSessions = useCallback(async () => {
    try { const r = await fetch("/api/prime/sessions", { cache: "no-store" }); const j = await r.json(); setSessions(j.sessions ?? []); } catch { /* offline */ }
  }, []);
  async function openSession(id: string) {
    try { const r = await fetch(`/api/prime/sessions?id=${encodeURIComponent(id)}`, { cache: "no-store" }); const j = await r.json(); if (!j.error) setTranscript(j); } catch { /* offline */ }
  }

  useEffect(() => {
    try { const raw = localStorage.getItem(TERM_LSK); if (raw) setLines(JSON.parse(raw).slice(-400)); } catch { /* fresh */ }
    hydrated.current = true;
    loadBuilds(); loadSessions();
  }, [loadBuilds, loadSessions]);
  useEffect(() => { if (hydrated.current) try { localStorage.setItem(TERM_LSK, JSON.stringify(lines.slice(-400))); } catch { /* quota */ } }, [lines]);
  useEffect(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, [lines, building]);

  const build = useCallback(async (text?: string) => {
    const p = (text ?? input).trim();
    if (!p || building) return;
    setInput("");
    setLines((l) => [...l, { kind: "user", text: p }]);
    if (autonomous) setLines((l) => [...l, { kind: "gate", text: gates.length ? `autonomous · ${gates.length} gate${gates.length === 1 ? "" : "s"} must pass before it can stop` : "autonomous · bounded turns" }]);
    setBuilding(true); setProject(null);
    const ctrl = new AbortController(); ctrlRef.current = ctrl;
    try {
      const r = await fetch("/api/prime/build", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p, autonomous, gates: autonomous ? gates : [] }), signal: ctrl.signal,
      });
      const reader = r.body?.getReader(); const dec = new TextDecoder(); let buf = "";
      while (reader) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const ln = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!ln.trim()) continue;
          let e: Line & { type?: string; project?: string };
          try { e = JSON.parse(ln); } catch { continue; }
          const type = (e as { type?: string }).type;
          if (type === "start") setProject(e.project ?? null);
          else if (type === "system") setLines((l) => [...l, { kind: "system", model: e.model, provider: e.provider, session: e.session }]);
          else if (type === "think") setLines((l) => [...l, { kind: "think", text: e.text }]);
          else if (type === "text") setLines((l) => [...l, { kind: "text", text: e.text }]);
          else if (type === "tool") setLines((l) => [...l, { kind: "tool", name: e.name, code: e.code }]);
          else if (type === "tool_result") setLines((l) => [...l, { kind: "tool_result", text: e.text, ok: e.ok, ms: e.ms }]);
          else if (type === "result") setLines((l) => [...l, { kind: "result", subtype: e.subtype, ms: e.ms }]);
          else if (type === "info") setLines((l) => [...l, { kind: "info", text: e.text }]);
          else if (type === "stderr") setLines((l) => [...l, { kind: "stderr", text: e.text }]);
          else if (type === "error") setLines((l) => [...l, { kind: "error", text: e.text }]);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setLines((l) => [...l, { kind: "error", text: String(err).slice(0, 160) }]);
    }
    setBuilding(false); loadBuilds(); loadSessions();
  }, [input, building, autonomous, gates, loadBuilds, loadSessions]);

  function stop() { ctrlRef.current?.abort(); setBuilding(false); setLines((l) => [...l, { kind: "info", text: "⎿ Interrupted." }]); }
  const previewUrl = (proj: string, file: string) => `/api/prime/preview/${proj}/${file.split("/").map(encodeURIComponent).join("/")}`;
  const toggleGate = (cmd: string) => setGates((g) => g.includes(cmd) ? g.filter((x) => x !== cmd) : [...g, cmd]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* header */}
      <div className="flex items-center gap-3 mb-3 shrink-0 flex-wrap">
        <div className="w-8 h-8 rounded-lg grid place-items-center font-bold text-[#150c22]" style={{ background: `linear-gradient(135deg,${PA},${SCAN})` }}>◈</div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[var(--cream)] leading-none flex items-center gap-2">
            Prime Agent
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${PA}1e`, color: PA, border: `1px solid ${PA}40` }}>
              {installed == null ? <Loader2 size={9} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: installed ? OK : "#e8728a" }} />}
              {installed == null ? "checking" : installed ? "installed · daemon ready" : "not installed"}
            </span>
          </div>
          <div className="text-[10.5px] text-[var(--cream-mute)] mt-1">Self-improving RLM harness · one persistent Python workspace · subagents, goals, refine · bounded autonomous mode with quality gates</div>
        </div>
        <div className="ml-auto flex gap-1.5">
          {([{ k: "terminal", label: "Terminal", n: 0 }, { k: "workspace", label: "Workspace", n: builds.length }, { k: "sessions", label: "Sessions", n: sessions.length }] as const).map((t) => (
            <button key={t.k} onClick={() => { setTab(t.k as Tab); if (t.k === "workspace") loadBuilds(); if (t.k === "sessions") { setTranscript(null); loadSessions(); } }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition"
              style={{ borderColor: tab === t.k ? PA : "var(--line-soft)", background: tab === t.k ? `${PA}1e` : "transparent", color: tab === t.k ? PA : "var(--cream-dim)" }}>
              {t.k === "sessions" && <HistoryIcon size={11} />}{t.k === "terminal" && <TermIcon size={11} />}{t.label}{t.n ? ` · ${t.n}` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ── TERMINAL ── */}
      {tab === "terminal" && (
        <div className="flex flex-col min-h-0 flex-1 rounded-xl overflow-hidden border" style={{ borderColor: "var(--line-soft)", background: "#0c0916" }}>
          <div className="flex items-center gap-2 px-3.5 py-2 border-b shrink-0" style={{ borderColor: "#221a35", background: "#120d1e" }}>
            <span className="flex gap-1.5"><i className="w-3 h-3 rounded-full inline-block" style={{ background: "#ff5f57" }} /><i className="w-3 h-3 rounded-full inline-block" style={{ background: "#febc2e" }} /><i className="w-3 h-3 rounded-full inline-block" style={{ background: "#28c840" }} /></span>
            <span className="text-[11px] text-[var(--cream-mute)] mono ml-1">prime-agent — ~/.nipei-os/prime-agent/builds</span>
            {lines.length > 0 && <button onClick={() => { setLines([]); try { localStorage.removeItem(TERM_LSK); } catch { /* ignore */ } }} className="ml-auto mono text-[10px] text-[var(--cream-mute)] hover:text-[var(--cream)]">clear</button>}
          </div>

          <div ref={termRef} onClick={() => inputRef.current?.focus()} className="flex-1 min-h-0 overflow-y-auto scroll px-4 py-3 mono text-[12.5px] leading-[1.7] cursor-text" style={{ color: "#c9c0e0" }}>
            <div className="rounded-lg border px-4 py-3 mb-3" style={{ borderColor: "#2c2244", background: "#150f24" }}>
              <div style={{ color: PA }}>◈ Prime Agent — a self-improving harness for long jobs</div>
              <div className="mt-2" style={{ color: "#8a7fae" }}>  every tool is <span style={{ color: SCAN }}>Python it writes</span> into one workspace that stays alive all session</div>
              <div style={{ color: "#8a7fae" }}>  subagents are function calls · goals persist · <span style={{ color: OK }}>gates</span> must pass before it may stop</div>
              <div style={{ color: "#8a7fae" }}>  every build lands in <span style={{ color: PA }}>Workspace</span>, every run is saved in <span style={{ color: PA }}>Sessions</span></div>
            </div>
            {lines.length === 0 && (
              <div className="mb-2" style={{ color: "#8a7fae" }}>
                <div style={{ color: "var(--cream)" }}>Tips</div>
                <div>1. Say what you want built and press <span style={{ color: PA }}>Enter</span> — watch the Python it runs, live.</div>
                <div>2. Leave <span style={{ color: OK }}>Autonomous</span> on: it keeps working until every gate below passes.</div>
                <div>3. A gate is just a check — <span style={{ color: SCAN }}>test -f index.html</span> means the file has to actually exist.</div>
              </div>
            )}
            {lines.map((s, i) => {
              if (s.kind === "user") return <div key={i} className="mt-2"><span style={{ color: PA }}>❯ </span><span style={{ color: "var(--cream)" }}>{s.text}</span></div>;
              if (s.kind === "gate") return <div key={i} className="inline-flex items-center gap-1.5" style={{ color: OK }}><ShieldCheck size={11} /> {s.text}</div>;
              if (s.kind === "system") return <div key={i} style={{ color: "#6a5f8c" }}>⎿ {s.provider ?? ""} · {s.model} · session {String(s.session ?? "").slice(0, 8)}</div>;
              if (s.kind === "think") return <div key={i} className="whitespace-pre-wrap truncate" style={{ color: "#6a5f8c", fontStyle: "italic" }}>  {s.text}</div>;
              if (s.kind === "text") return <div key={i} className="whitespace-pre-wrap" style={{ color: "#d8d0ee" }}><span style={{ color: PA }}>● </span>{s.text}</div>;
              if (s.kind === "tool") return (
                <div key={i} className="my-1.5 rounded-lg border overflow-hidden" style={{ borderColor: "#2c2244", background: "#100b1c" }}>
                  <div className="px-3 py-1 text-[10.5px] flex items-center gap-1.5" style={{ background: "#171029", color: SCAN }}>▸ {s.name ?? "ipython"} — code it wrote and ran</div>
                  <pre className="px-3 py-2 text-[11.5px] whitespace-pre-wrap" style={{ color: "#9ee6c9", margin: 0 }}>{(s.code ?? "").slice(0, 1400)}</pre>
                </div>
              );
              if (s.kind === "tool_result") return <div key={i} className="whitespace-pre-wrap" style={{ color: s.ok === false ? "#e8728a" : "#6a5f8c" }}>  ⎿ {String(s.text ?? "").slice(0, 400) || "(no output)"}{s.ms ? ` · ${s.ms}ms` : ""}</div>;
              if (s.kind === "result") return <div key={i} className="mt-1" style={{ color: s.subtype === "success" ? OK : "#e8728a" }}>⎿ {s.subtype === "success" ? "Done — gates passed" : s.subtype} · {Math.round((s.ms ?? 0) / 1000)}s</div>;
              if (s.kind === "info") return <div key={i} style={{ color: "#6a5f8c" }}>{s.text}</div>;
              if (s.kind === "stderr") return <div key={i} className="truncate" style={{ color: "#6a5f8c", opacity: .7 }}>{s.text}</div>;
              if (s.kind === "error") return <div key={i} style={{ color: "#e8728a" }}>⎿ {s.text}</div>;
              return null;
            })}
            {building && <div className="inline-flex items-center gap-2 mt-1" style={{ color: PA }}><Loader2 size={12} className="animate-spin" /> <span style={{ color: "#8a7fae" }}>Prime Agent working…</span></div>}
            {project && !building && builds.find((b) => b.project === project)?.html?.[0] && (
              <div className="mt-1"><a href={previewUrl(project, builds.find((b) => b.project === project)!.html[0])} target="_blank" rel="noopener" style={{ color: OK }}>  ⎿ open {builds.find((b) => b.project === project)!.html[0]} ↗</a></div>
            )}
          </div>

          {/* autonomous + gates bar */}
          <div className="border-t px-3.5 py-2 shrink-0 flex items-center gap-2 flex-wrap" style={{ borderColor: "#221a35", background: "#120d1e" }}>
            <button onClick={() => setAutonomous((a) => !a)} className="inline-flex items-center gap-1.5 mono text-[10.5px] px-2 py-1 rounded-full border transition"
              style={{ borderColor: autonomous ? `${OK}66` : "var(--line-soft)", color: autonomous ? OK : "var(--cream-mute)", background: autonomous ? `${OK}12` : "transparent" }}>
              <ShieldCheck size={11} /> Autonomous {autonomous ? "on" : "off"}
            </button>
            <span className="mono text-[10px]" style={{ color: "#6a5f8c" }}>gates:</span>
            {GATE_PRESETS.map((g) => (
              <button key={g.cmd} onClick={() => toggleGate(g.cmd)} disabled={!autonomous}
                className="mono text-[10px] px-2 py-0.5 rounded-full border transition disabled:opacity-30"
                style={{ borderColor: gates.includes(g.cmd) ? `${SCAN}66` : "var(--line-soft)", color: gates.includes(g.cmd) ? SCAN : "var(--cream-mute)" }}>
                {gates.includes(g.cmd) ? "✓ " : ""}{g.label}
              </button>
            ))}
          </div>

          <div className="border-t px-3.5 py-2.5 shrink-0 flex items-center gap-2" style={{ borderColor: "#221a35", background: "#120d1e" }}>
            <span className="mono text-[13px]" style={{ color: building ? "#6a5f8c" : PA }}>❯</span>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} disabled={building}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); build(); } }}
              placeholder={building ? "working… (esc to stop)" : "tell Prime Agent what to build…"}
              className="flex-1 bg-transparent mono text-[13px] focus:outline-none disabled:opacity-60" style={{ color: "var(--cream)" }} />
            {building
              ? <button onClick={stop} className="mono text-[11px] px-2 py-1 rounded border" style={{ borderColor: "#e8728a55", color: "#e8728a" }}>esc</button>
              : <button onClick={() => build()} disabled={!input.trim() || installed === false} className="inline-flex items-center gap-1 mono text-[11px] px-2 py-1 rounded border disabled:opacity-30" style={{ borderColor: `${PA}55`, color: PA }}><CornerDownLeft size={11} /> run</button>}
          </div>
          <div className="px-3.5 pb-2.5 shrink-0 flex items-center gap-2 flex-wrap" style={{ background: "#120d1e" }}>
            <span className="mono text-[10px]" style={{ color: "#6a5f8c" }}>? try:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => build(ex)} disabled={building} className="mono text-[10px] px-2 py-0.5 rounded-full border disabled:opacity-40 transition" style={{ borderColor: "var(--line-soft)", color: "var(--cream-dim)" }}>{ex}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── WORKSPACE ── */}
      {tab === "workspace" && (
        <div className="panel p-0 flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--line-soft)] shrink-0">
            <Layers size={14} style={{ color: PA }} />
            <span className="text-[12.5px] text-[var(--cream)] font-medium">Prime Agent builds</span>
            <span className="text-[10.5px] text-[var(--cream-mute)]">{builds.length} project{builds.length === 1 ? "" : "s"} · saved on your Mac</span>
            <button onClick={loadBuilds} className="ml-auto p-1.5 rounded-lg border border-[var(--line-soft)] text-[var(--cream-mute)] hover:text-[var(--cream)]"><RefreshCw size={12} /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scroll p-3">
            {builds.length === 0 ? (
              <div className="h-full grid place-items-center text-center"><div className="text-[11.5px] text-[var(--cream-mute)] max-w-[320px]">No builds yet. Give it a job in the Terminal — every project lands here with a live preview.</div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {builds.map((b) => (
                  <div key={b.project} className="rounded-xl border border-[var(--line-soft)] overflow-hidden bg-[var(--bg-card)] hover:border-[#8b5cf655] transition">
                    {b.html[0]
                      ? <iframe src={previewUrl(b.project, b.html[0])} title={b.project} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups" className="w-full bg-black border-0" style={{ aspectRatio: "16/10" }} />
                      : <div className="w-full grid place-items-center text-[var(--cream-mute)] text-[11px] bg-[#0f0a1a]" style={{ aspectRatio: "16/10" }}>{b.fileCount} file{b.fileCount === 1 ? "" : "s"} · no html</div>}
                    <div className="p-2.5">
                      <div className="text-[12px] font-medium text-[var(--cream)] truncate mono">{b.project}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9.5px] text-[var(--cream-mute)]">{b.fileCount} file{b.fileCount === 1 ? "" : "s"} · {ago(b.mtime)}</span>
                        {b.html[0] && <a href={previewUrl(b.project, b.html[0])} target="_blank" rel="noopener" className="ml-auto text-[9.5px] inline-flex items-center gap-1" style={{ color: PA }}><ExternalLink size={9} /> open</a>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SESSIONS ── */}
      {tab === "sessions" && (
        <div className="panel p-0 flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--line-soft)] shrink-0">
            {transcript
              ? <button onClick={() => setTranscript(null)} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: PA }}><ArrowLeft size={12} /> all sessions</button>
              : <><HistoryIcon size={14} style={{ color: PA }} /><span className="text-[12.5px] text-[var(--cream)] font-medium">Sessions</span></>}
            <span className="text-[10.5px] text-[var(--cream-mute)]">
              {transcript ? `${transcript.meta.model ?? ""} · ${transcript.messages.length} messages` : `${sessions.length} session${sessions.length === 1 ? "" : "s"} · every prime-agent run on this Mac`}
            </span>
            {!transcript && <button onClick={loadSessions} className="ml-auto p-1.5 rounded-lg border border-[var(--line-soft)] text-[var(--cream-mute)] hover:text-[var(--cream)]"><RefreshCw size={12} /></button>}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scroll p-3">
            {!transcript ? (
              sessions.length === 0
                ? <div className="h-full grid place-items-center text-[11.5px] text-[var(--cream-mute)]">No sessions yet — run something in the Terminal.</div>
                : <div className="space-y-1.5">
                    {sessions.map((s) => (
                      <button key={s.id} onClick={() => openSession(s.id)}
                        className="w-full text-left rounded-lg border p-3 transition hover:bg-[rgba(255,255,255,0.02)]"
                        style={{ borderColor: "var(--line-soft)" }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: PA }} />
                          <span className="text-[12.5px] mono font-medium" style={{ color: "var(--cream)" }}>{s.id.slice(0, 8)}</span>
                          {s.firstPrompt && <span className="text-[11px] truncate max-w-[46ch]" style={{ color: "var(--cream-dim)" }}>{s.firstPrompt}</span>}
                          <span className="text-[10px] mono ml-auto shrink-0" style={{ color: "var(--cream-mute)" }}>
                            {s.messages} msg{s.messages === 1 ? "" : "s"} · {s.model ?? "?"} · {ago(s.mtime)}
                          </span>
                        </div>
                        {s.cwd && <div className="text-[10px] mono mt-1 truncate" style={{ color: "var(--cream-mute)" }}>{s.cwd.replace(/^\/Users\/[^/]+/, "~")}</div>}
                      </button>
                    ))}
                  </div>
            ) : (
              <div className="space-y-2 max-w-[860px]">
                {transcript.messages.map((m, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ borderColor: "var(--line-soft)", background: m.role === "user" ? `${PA}0a` : "transparent" }}>
                    <div className="text-[9.5px] uppercase tracking-widest mb-1" style={{ color: m.role === "user" ? PA : m.role === "toolResult" ? SCAN : OK }}>{m.role}</div>
                    <div className="text-[12px] whitespace-pre-wrap leading-relaxed" style={{ color: "var(--cream-soft)" }}>{m.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
