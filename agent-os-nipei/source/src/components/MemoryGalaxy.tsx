"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Loader2, Search, X, ExternalLink, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Memory Galaxy — the cinematic view of the Obsidian vault.
// Same force-settled 3D layout + perspective projection as VaultGraph3D, but the
// render is a glowing star map: notes = stars, links = constellations, and notes
// edited in the last 7 days burn brighter/whiter/bigger. Pure canvas 2D.
// Layout is computed once for ALL notes; legend toggles / search / focus only
// change visibility and emphasis, never the positions.

interface RawNode { id: string; title: string; group: string; degree: number; mtime: number; }
interface GNode extends RawNode {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  rec: number; phase: number; deg: number; isHub: boolean; rgb: [number, number, number];
}
interface RawLink { source: string; target: string; }
interface GLink { source: GNode; target: GNode; }

const PALETTE: [number, number, number][] = [
  [34, 211, 238], [167, 139, 250], [52, 211, 153], [251, 191, 36], [244, 114, 182], [96, 165, 250],
  [249, 115, 22], [163, 230, 53], [251, 113, 133], [45, 212, 191], [216, 180, 254], [226, 232, 240],
];
const OTHER_RGB: [number, number, number] = [148, 163, 184];
const RECENT_DAYS = 7;

const rgbCss = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const starRadius = (n: GNode, ds: number) => Math.min((2.2 + Math.sqrt(n.deg) * 1.3) * ds, 9) * (1 + n.rec * 0.9);

interface Props { onOpenNote: (relPath: string) => void; companySlug?: string; }

export default function MemoryGalaxy({ onOpenNote, companySlug }: Props) {
  const [raw, setRaw] = useState<{ nodes: RawNode[]; links: RawLink[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ n: GNode; x: number; y: number } | null>(null);
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [showHub, setShowHub] = useState(false);
  const [showIsolated, setShowIsolated] = useState(true);
  const [query, setQuery] = useState("");
  const [legendOpen, setLegendOpen] = useState(true);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [note, setNote] = useState<{ id: string; content: string | null; loading: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);

  const camRef = useRef({ yaw: 0.4, pitch: -0.42, distance: 1500, targetDistance: 1500, autoRotate: true, cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 0, ox: 0 });
  const dragRef = useRef<{ kind: "rotate" | "node" | null; node?: GNode; sx: number; sy: number; origYaw: number; origPitch: number; movedPx: number }>({ kind: null, sx: 0, sy: 0, origYaw: 0, origPitch: 0, movedPx: 0 });
  const hoverRef = useRef<GNode | null>(null);
  // Render-loop inputs mirrored into refs so the canvas effect doesn't restart on every UI change
  const viewRef = useRef({ hiddenGroups, showHub, showIsolated, selected: null as GNode | null, matches: null as Set<string> | null });
  const selectRef = useRef<(n: GNode | null) => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    const url = companySlug ? `/api/memory/graph?company=${encodeURIComponent(companySlug)}` : "/api/memory/graph";
    fetch(url)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((j) => { if (!cancelled) setRaw(j); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [companySlug]);

  // Seeded starfield (screen-space background stars) — built once.
  const starfield = useMemo(() => {
    const rand = mulberry32(99);
    return Array.from({ length: 320 }, () => ({ x: rand(), y: rand(), r: rand() * 1.3 + 0.2, a: rand() * 0.5 + 0.1, tw: rand() * Math.PI * 2 }));
  }, []);

  const sim = useMemo(() => {
    if (!raw) return null;
    const rand = mulberry32(1234567);
    const now = Date.now();

    // Super-hubs (e.g. 00_Master_Vault_Index linking half the vault) flatten the whole
    // structure into one starburst — detect them and keep them out of the layout forces.
    const hubCut = Math.max(40, raw.links.length * 0.15);
    const hubSet = new Set(raw.nodes.filter((n) => n.degree >= hubCut).map((n) => n.id));

    // Colors by real folder, most populated first
    const groupCount = new Map<string, number>();
    for (const n of raw.nodes) groupCount.set(n.group, (groupCount.get(n.group) || 0) + 1);
    const groups = [...groupCount.entries()].sort((a, b) => b[1] - a[1]).map(([name, count], i) => ({ name, count, rgb: PALETTE[i] ?? OTHER_RGB }));
    const rgbByGroup = new Map(groups.map((g) => [g.name, g.rgb]));

    // Degree without super-hub links: what's left is the note's own structure
    const deg = new Map<string, number>();
    for (const l of raw.links) {
      if (hubSet.has(l.source) || hubSet.has(l.target)) continue;
      deg.set(l.source, (deg.get(l.source) || 0) + 1); deg.set(l.target, (deg.get(l.target) || 0) + 1);
    }

    const nodes: GNode[] = raw.nodes.map((n) => {
      let x = 0, y = 0, z = 0, s = 2;
      while (s >= 1 || s === 0) { x = rand() * 2 - 1; y = rand() * 2 - 1; z = rand() * 2 - 1; s = x * x + y * y + z * z; }
      const r = 350 * Math.cbrt(rand());
      const scale = r / Math.sqrt(s);
      // Honest recency: only notes edited in the last RECENT_DAYS glow; older ones stay neutral
      const ageDays = (now - n.mtime) / 864e5;
      const rec = ageDays <= RECENT_DAYS ? Math.pow(1 - Math.max(0, ageDays) / RECENT_DAYS, 1.2) : 0;
      const isHub = hubSet.has(n.id);
      return {
        ...n, x: isHub ? 0 : x * scale, y: isHub ? 0 : y * scale, z: isHub ? 0 : z * scale, vx: 0, vy: 0, vz: 0,
        rec, phase: rand() * Math.PI * 2, deg: isHub ? n.degree : deg.get(n.id) || 0, isHub, rgb: rgbByGroup.get(n.group) ?? OTHER_RGB,
      };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: GLink[] = raw.links.map((l) => ({ source: byId.get(l.source)!, target: byId.get(l.target)! })).filter((l) => l.source && l.target);
    const layoutLinks = links.filter((l) => !l.source.isHub && !l.target.isHub);
    const neighbors = new Map<string, Set<GNode>>();
    for (const l of links) {
      if (!neighbors.has(l.source.id)) neighbors.set(l.source.id, new Set());
      if (!neighbors.has(l.target.id)) neighbors.set(l.target.id, new Set());
      neighbors.get(l.source.id)!.add(l.target); neighbors.get(l.target.id)!.add(l.source);
    }

    // Pre-settle layout (force sim) so it's static from frame 1.
    // ponytail: O(n²) repulsion, ~1s for 1k notes; Barnes-Hut or a Web Worker if the vault passes ~3k
    const layoutNodes = nodes.filter((n) => !n.isHub);
    const K_REPEL = 1500, REPEL_RANGE = 300, K_LINK = 0.014, L_LINK = 95, DAMP = 0.85, BOUND_R = 470, K_BOUND = 0.014;
    let alpha = 1;
    for (let t = 0; t < 500; t++) {
      for (let i = 0; i < layoutNodes.length; i++) {
        const a = layoutNodes[i];
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const b = layoutNodes[j];
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > REPEL_RANGE * REPEL_RANGE || d2 < 0.01) continue;
          const d = Math.sqrt(d2), f = (K_REPEL / d2) * alpha;
          const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
          a.vx -= fx; a.vy -= fy; a.vz -= fz; b.vx += fx; b.vy += fy; b.vz += fz;
        }
      }
      for (const l of layoutLinks) {
        const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, dz = l.target.z - l.source.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01, f = K_LINK * (d - L_LINK) * alpha;
        const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
        l.source.vx += fx; l.source.vy += fy; l.source.vz += fz; l.target.vx -= fx; l.target.vy -= fy; l.target.vz -= fz;
      }
      for (const n of layoutNodes) {
        const r = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        if (r > BOUND_R) { const f = K_BOUND * (r - BOUND_R); n.vx -= (n.x / r) * f; n.vy -= (n.y / r) * f; n.vz -= (n.z / r) * f; }
      }
      for (const n of layoutNodes) { n.vx *= DAMP; n.vy *= DAMP; n.vz *= DAMP; n.x += n.vx; n.y += n.vy; n.z += n.vz; }
      if (t > 50) alpha *= 0.99;
    }
    // Shape into a flattened spiral disc — galaxy character + breaks up the central blob.
    for (const n of nodes) {
      n.y *= 0.42;
      const R = Math.sqrt(n.x * n.x + n.z * n.z);
      const a = R * 0.0035;
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = n.x * ca - n.z * sa, nz = n.x * sa + n.z * ca;
      n.x = nx; n.z = nz;
      n.vx = 0; n.vy = 0; n.vz = 0;
    }
    const labelIds = new Set([...nodes].filter((n) => !n.isHub).sort((a, b) => b.deg - a.deg).slice(0, 12).map((n) => n.id));
    // Dust plane — 3 soft motes per star, scattered along the disc. Invisible up close,
    // fades in as you zoom out so the far view reads as glowing spiral arms, not sparse dots.
    const dust: { x: number; y: number; z: number; c: [number, number, number]; a: number; owner: GNode }[] = [];
    for (const n of nodes) {
      if (n.isHub) continue;
      for (let k = 0; k < 3; k++) {
        const g1 = (rand() + rand() + rand() - 1.5) * 40, g2 = (rand() + rand() + rand() - 1.5) * 14, g3 = (rand() + rand() + rand() - 1.5) * 40;
        dust.push({ x: n.x + g1, y: n.y + g2, z: n.z + g3, c: n.rgb, a: 0.05 + rand() * 0.09, owner: n });
      }
    }
    const hubs = nodes.filter((n) => n.isHub);
    const isolatedCount = nodes.filter((n) => !n.isHub && n.deg === 0).length;
    const recentCount = nodes.filter((n) => n.rec > 0).length;
    return { nodes, links, labelIds, dust, neighbors, groups, hubs, isolatedCount, recentCount };
  }, [raw]);

  // Search matches (accent-insensitive, title + path)
  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!sim || q.length < 2) return null;
    return sim.nodes.filter((n) => norm(n.title).includes(q) || norm(n.id).includes(q));
  }, [sim, query]);

  useEffect(() => {
    viewRef.current = { hiddenGroups, showHub, showIsolated, selected, matches: matches ? new Set(matches.map((n) => n.id)) : null };
  }, [hiddenGroups, showHub, showIsolated, selected, matches]);

  // Focus a star: fly the camera to it, highlight its constellation, open the side panel
  const select = (n: GNode | null) => {
    const cam = camRef.current;
    setSelected(n);
    if (!n) { cam.tx = 0; cam.ty = 0; cam.tz = 0; setNote(null); return; }
    cam.tx = n.x; cam.ty = n.y; cam.tz = n.z;
    cam.targetDistance = Math.min(cam.targetDistance, 650);
    setLegendOpen(false);
    setNote({ id: n.id, content: null, loading: true });
    fetch(`/api/memory/note?path=${encodeURIComponent(n.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setNote((cur) => (cur && cur.id === n.id ? { id: n.id, content: j?.content ?? null, loading: false } : cur)))
      .catch(() => setNote((cur) => (cur && cur.id === n.id ? { id: n.id, content: null, loading: false } : cur)));
  };
  selectRef.current = select;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") selectRef.current(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sim || !canvasRef.current || !wrapRef.current) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(200, r.width); h = Math.max(200, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrap);

    const project = (px: number, py: number, pz: number) => {
      const cam = camRef.current;
      const x = px - cam.cx, y = py - cam.cy, z = pz - cam.cz;
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const vz = cam.distance - z2;
      if (vz < 1) return null;
      const fov = 620;
      return { sx: w / 2 + cam.ox + (x1 * fov) / vz, sy: h / 2 - (y1 * fov) / vz, depthScale: fov / vz, vz };
    };

    const isVisible = (n: GNode) => {
      const v = viewRef.current;
      if (n.isHub) return v.showHub;
      if (v.hiddenGroups.has(n.group)) return false;
      if (n.deg === 0 && !v.showIsolated && v.selected?.id !== n.id && !v.matches?.has(n.id)) return false;
      return true;
    };

    let time = 0;
    const render = () => {
      time += 0.016;
      const v = viewRef.current;
      const sel = v.selected;
      const focusSet = sel ? new Set([sel.id, ...[...(sim.neighbors.get(sel.id) ?? [])].map((n) => n.id)]) : null;
      // emphasis: 1 = normal, low = dimmed by focus/search
      const emph = (n: GNode) => (focusSet ? (focusSet.has(n.id) ? 1 : 0.1) : v.matches ? (v.matches.has(n.id) ? 1 : 0.12) : 1);

      // deep-space background
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const grad = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h));
      grad.addColorStop(0, "#1b1130"); grad.addColorStop(0.45, "#120a20"); grad.addColorStop(1, "#05030a");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      // nebula blobs (additive)
      ctx.globalCompositeOperation = "lighter";
      const neb = (cx: number, cy: number, rr: number, col: string) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, col); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
      };
      const drift = Math.sin(time * 0.05) * w * 0.02;
      neb(w * 0.22 + drift, h * 0.30, Math.max(w, h) * 0.40, "rgba(124,58,237,0.12)");
      neb(w * 0.80 - drift, h * 0.62, Math.max(w, h) * 0.36, "rgba(34,211,238,0.08)");
      neb(w * 0.55, h * 0.85, Math.max(w, h) * 0.34, "rgba(212,165,116,0.07)");
      neb(w * 0.68 + drift, h * 0.18, Math.max(w, h) * 0.26, "rgba(251,113,133,0.05)");
      neb(w * 0.10, h * 0.75 - drift, Math.max(w, h) * 0.24, "rgba(52,211,153,0.045)");
      // starfield (twinkle)
      for (const s of starfield) {
        const tw = 0.55 + 0.45 * Math.sin(time * 1.5 + s.tw);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // far-zoom factor: 0 up close → 1 fully zoomed out. Drives the cinematic LOD.
      const far = Math.max(0, Math.min(1, (camRef.current.distance - 700) / 1600));
      const dimAll = focusSet || v.matches ? 0.25 : 1;

      // dust plane — spiral-arm glow that only exists at a distance
      if (far > 0.05) {
        for (const d of sim.dust) {
          if (!isVisible(d.owner)) continue;
          const p = project(d.x, d.y, d.z);
          if (!p) continue;
          const r = Math.max(0.6, 2.2 * p.depthScale * (1 + far));
          ctx.fillStyle = `rgba(${d.c[0]},${d.c[1]},${d.c[2]},${d.a * far * dimAll})`;
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // constellation links — gently curved arcs; focused constellation drawn bright
      const linkFade = 1 - far * 0.5;
      for (const l of sim.links) {
        if (!isVisible(l.source) || !isVisible(l.target)) continue;
        const a = project(l.source.x, l.source.y, l.source.z), b = project(l.target.x, l.target.y, l.target.z);
        if (!a || !b) continue;
        const focused = sel && (l.source.id === sel.id || l.target.id === sel.id);
        const rec = Math.max(l.source.rec, l.target.rec);
        const alpha = focused ? 0.75 : (0.06 + rec * 0.2) * linkFade * Math.min(emph(l.source), emph(l.target));
        if (alpha < 0.01) continue;
        const mx = (a.sx + b.sx) / 2, my = (a.sy + b.sy) / 2;
        const dx = b.sx - a.sx, dy = b.sy - a.sy, len = Math.hypot(dx, dy) || 1;
        const bow = Math.min(18, len * 0.10);
        ctx.lineWidth = focused ? 1.4 : 0.8;
        ctx.strokeStyle = focused ? `rgba(${sel.rgb[0]},${sel.rgb[1]},${sel.rgb[2]},${alpha})` : `rgba(158,178,238,${alpha})`;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy);
        ctx.quadraticCurveTo(mx - (dy / len) * bow, my + (dx / len) * bow, b.sx, b.sy);
        ctx.stroke();
      }

      // galactic core glow — tracks the projected galaxy size instead of a fixed screen blob
      const coreP = project(0, 0, 0);
      if (coreP) {
        const cr2 = Math.min(Math.min(w, h) * 0.45, 520 * coreP.depthScale + Math.min(w, h) * 0.06);
        const coreA = (0.10 + far * 0.10) * dimAll;
        const cg2 = ctx.createRadialGradient(coreP.sx, coreP.sy, 0, coreP.sx, coreP.sy, cr2);
        cg2.addColorStop(0, `rgba(232,215,255,${coreA})`); cg2.addColorStop(0.35, `rgba(170,125,245,${coreA * 0.55})`); cg2.addColorStop(1, "transparent");
        ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(coreP.sx, coreP.sy, cr2, 0, Math.PI * 2); ctx.fill();
      }

      // stars (nodes) — depth sorted, additive glow, recency = brighter/whiter/bigger
      type P = { n: GNode; sx: number; sy: number; ds: number; vz: number; e: number };
      const proj: P[] = [];
      for (const n of sim.nodes) {
        if (!isVisible(n)) continue;
        const p = project(n.x, n.y, n.z);
        if (p) proj.push({ n, sx: p.sx, sy: p.sy, ds: p.depthScale, vz: p.vz, e: emph(n) });
      }
      proj.sort((a, b) => b.vz - a.vz);
      for (const p of proj) {
        const n = p.n;
        const twinkle = (0.8 + 0.2 * Math.sin(time * 2 + n.phase)) * p.e;
        const r = n.isHub ? Math.min(14, 6 * p.ds + 4) : starRadius(n, p.ds);
        if (r < 0.4) continue;
        const [cr, cg, cb] = n.rgb;
        // recent stars shift toward white-hot
        const wr = Math.round(cr + (255 - cr) * n.rec), wg = Math.round(cg + (255 - cg) * n.rec), wb = Math.round(cb + (255 - cb) * n.rec);
        const haloR = r * (2.4 + n.rec * 3.2) * (1 + far * 1.6);
        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, haloR);
        halo.addColorStop(0, `rgba(${wr},${wg},${wb},${(0.07 + far * 0.09 + n.rec * 0.4) * twinkle})`);
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.sx, p.sy, haloR, 0, Math.PI * 2); ctx.fill();
        // bright core — only recent stars burn white-hot; the bulk stays soft
        ctx.fillStyle = `rgba(${wr},${wg},${wb},${(0.4 + n.rec * 0.5) * twinkle})`;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(0.32 + n.rec * 0.6) * twinkle})`;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 0.4, 0, Math.PI * 2); ctx.fill();
        // diffraction spikes on the hottest recent stars once you pull back — telescope-photo feel
        if (far > 0.25 && n.rec > 0.7 && p.e === 1) {
          const L = r * (5 + far * 5), sa = (0.10 + 0.16 * far) * twinkle * n.rec;
          const spike = (dx: number, dy: number) => {
            const g = ctx.createLinearGradient(p.sx - dx * L, p.sy - dy * L, p.sx + dx * L, p.sy + dy * L);
            g.addColorStop(0, "transparent"); g.addColorStop(0.5, `rgba(255,255,255,${sa})`); g.addColorStop(1, "transparent");
            ctx.strokeStyle = g; ctx.lineWidth = Math.max(0.6, r * 0.22);
            ctx.beginPath(); ctx.moveTo(p.sx - dx * L, p.sy - dy * L); ctx.lineTo(p.sx + dx * L, p.sy + dy * L); ctx.stroke();
          };
          spike(1, 0); spike(0, 1);
        }
      }

      // labels — focused constellation, else search hits, else top hubs; with overlap avoidance
      ctx.globalCompositeOperation = "source-over";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const placed: { x: number; y: number }[] = [];
      const wantLabel = (n: GNode) => (focusSet ? focusSet.has(n.id) : v.matches ? v.matches.has(n.id) : sim.labelIds.has(n.id) || n.isHub);
      const labelCandidates = proj.filter((p) => wantLabel(p.n)).sort((a, b) => (a.n.id === sel?.id ? -1 : b.n.id === sel?.id ? 1 : a.vz - b.vz)).slice(0, 30);
      for (const p of labelCandidates) {
        const isSel = p.n.id === sel?.id;
        const fs = isSel ? 13 : Math.min(12, Math.max(10, 12 * p.ds));
        if (!isSel && placed.some((q) => Math.abs(q.x - p.sx) < 90 && Math.abs(q.y - p.sy) < 18)) continue;
        const r = p.n.isHub ? 10 : starRadius(p.n, p.ds);
        ctx.font = `${isSel ? "600 " : ""}${fs}px var(--font-geist-sans, system-ui)`;
        const tw = ctx.measureText(p.n.title).width;
        const lx = p.sx, ly = p.sy + r + 5;
        ctx.fillStyle = "rgba(10,6,18,0.7)";
        ctx.strokeStyle = isSel ? rgbCss(p.n.rgb) : "rgba(212,165,116,0.28)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(lx - tw / 2 - 8, ly - 2, tw + 16, fs + 8, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(238,240,252,0.95)";
        ctx.fillText(p.n.title, lx, ly + 2);
        placed.push({ x: p.sx, y: p.sy });
      }

      // hover + selection rings
      const ring = (n: GNode | null, col: string) => {
        if (!n || !isVisible(n)) return;
        const p = project(n.x, n.y, n.z);
        if (!p) return;
        const r = n.isHub ? 10 : starRadius(n, p.depthScale);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.sx, p.sy, r + 5, 0, Math.PI * 2); ctx.stroke();
      };
      ring(hoverRef.current, "rgba(255,255,255,0.9)");
      if (sel) ring(sel, rgbCss(sel.rgb));

      // cinematic vignette — deepens with distance so the far view feels composed, not empty
      const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, "transparent"); vig.addColorStop(1, `rgba(2,1,6,${0.28 + far * 0.22})`);
      ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const loop = () => {
      const cam = camRef.current;
      cam.distance += (cam.targetDistance - cam.distance) * 0.18;
      // keep the focused star centered in the area left of the note panel
      const panelW = viewRef.current.selected ? Math.min(380, w * 0.85) : 0;
      cam.ox += (-panelW / 2 - cam.ox) * 0.08;
      cam.cx += (cam.tx - cam.cx) * 0.08; cam.cy += (cam.ty - cam.cy) * 0.08; cam.cz += (cam.tz - cam.cz) * 0.08;
      if (cam.autoRotate && dragRef.current.kind === null) { cam.yaw += 0.0009; cam.pitch = -0.18 + Math.sin(Date.now() * 0.00006) * 0.06; }
      render();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    const pick = (sx: number, sy: number): GNode | null => {
      let best: GNode | null = null, bestD2 = Infinity;
      for (const n of sim.nodes) {
        if (!isVisible(n)) continue;
        const p = project(n.x, n.y, n.z); if (!p) continue;
        const r = n.isHub ? 10 : starRadius(n, p.depthScale);
        const dx = p.sx - sx, dy = p.sy - sy, d2 = dx * dx + dy * dy, hit = (r + 6) * (r + 6);
        if (d2 <= hit && d2 < bestD2) { bestD2 = d2; best = n; }
      }
      return best;
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const node = pick(sx, sy);
      dragRef.current = { kind: node ? "node" : "rotate", node: node ?? undefined, sx, sy, origYaw: camRef.current.yaw, origPitch: camRef.current.pitch, movedPx: 0 };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top, d = dragRef.current;
      if (d.kind) {
        // dragging (from empty space or a star) orbits the camera
        const dx = sx - d.sx, dy = sy - d.sy; d.movedPx = Math.max(d.movedPx, Math.abs(dx) + Math.abs(dy));
        if (d.movedPx >= 4) {
          camRef.current.autoRotate = false;
          camRef.current.yaw = d.origYaw + dx * 0.005;
          camRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, d.origPitch + dy * 0.005));
        }
      } else {
        const n = pick(sx, sy);
        if (hoverRef.current !== n) { hoverRef.current = n; setHover(n ? { n, x: sx, y: sy } : null); }
        canvas.style.cursor = n ? "pointer" : "grab";
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const d = dragRef.current, wasClick = d.movedPx < 4;
      dragRef.current = { kind: null, sx: 0, sy: 0, origYaw: 0, origPitch: 0, movedPx: 0 };
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      if (!wasClick) return;
      if (d.kind === "node" && d.node) selectRef.current(d.node);
      else if (d.kind === "rotate") selectRef.current(null);
    };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); camRef.current.targetDistance = Math.max(150, Math.min(2600, camRef.current.targetDistance * Math.pow(1.0015, e.deltaY))); };
    const onDouble = () => { camRef.current.autoRotate = !camRef.current.autoRotate; };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDouble);
    canvas.style.cursor = "grab";
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDouble);
    };
  }, [sim, starfield]);

  const toggleGroup = (g: string) => setHiddenGroups((prev) => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  });

  if (error) return <div className="absolute inset-0 grid place-items-center text-center p-6"><div className="text-sm text-[var(--fg-dim)]">Falha ao carregar a galáxia: <code>{error}</code></div></div>;
  if (!raw || !sim) return <div className="absolute inset-0 grid place-items-center text-center p-6"><div><Loader2 size={20} className="mx-auto mb-2 animate-spin text-[var(--fg-dim)]" /><div className="text-[12px] text-[var(--fg-dim)]">Mapeando a galáxia de memória…</div></div></div>;

  const selNeighbors = selected ? [...(sim.neighbors.get(selected.id) ?? [])].sort((a, b) => b.deg - a.deg) : [];
  const noteBody = note?.content?.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/<!--[\s\S]*?-->/g, "") ?? "";

  return (
    <div className="absolute inset-0" ref={wrapRef}>
      <style>{GALAXY_MD_CSS}</style>
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Header + hints */}
      <div className={`absolute top-3 left-3 pointer-events-none z-10 ${selected ? "hidden" : ""}`}>
        <div className="text-[10px] uppercase tracking-widest text-[var(--fg-dimmer)] flex items-center gap-1.5"><Sparkles size={11} /> Memory Galaxy</div>
        <div className="text-[11px] text-[var(--fg-dim)] mt-0.5"><span className="text-[var(--fg)] metric">{sim.nodes.length}</span> notas · <span className="text-[var(--fg)] metric">{sim.links.length}</span> links</div>
        <div className="hidden md:block text-[10px] text-[var(--fg-dimmer)] mt-2">arraste para orbitar · scroll para zoom · clique numa estrela para focar · Esc sai do foco</div>
      </div>

      {/* Search */}
      <div
        className="absolute z-20 left-3 right-3 top-[52px] md:left-auto md:top-3 md:w-[280px] md:right-[var(--search-right)] transition-all"
        style={{ "--search-right": selected ? "392px" : "12px" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(8,5,16,0.82)] border border-[rgba(255,255,255,0.12)] focus-within:border-[rgba(167,139,250,0.6)]">
          <Search size={13} className="text-[var(--fg-dim)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches?.[0]) select(matches[0]);
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Buscar nota…"
            aria-label="Buscar nota na galáxia"
            className="flex-1 min-w-0 bg-transparent text-[12px] text-[var(--fg)] placeholder:text-[var(--fg-dimmer)] outline-none"
          />
          {query && <button onClick={() => setQuery("")} aria-label="Limpar busca" className="text-[var(--fg-dim)] hover:text-[var(--fg)]"><X size={13} /></button>}
        </div>
        {matches && (
          <div className="mt-1 rounded-lg bg-[rgba(8,5,16,0.9)] border border-[rgba(255,255,255,0.1)] overflow-hidden">
            <div className="px-3 py-1 text-[10px] text-[var(--fg-dimmer)]">{matches.length} resultado{matches.length === 1 ? "" : "s"}{matches.length > 0 && " · Enter abre o primeiro"}</div>
            {matches.slice(0, 8).map((n) => (
              <button key={n.id} onClick={() => select(n)} className="w-full text-left px-3 py-1.5 hover:bg-[rgba(255,255,255,0.06)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rgbCss(n.rgb) }} />
                <span className="text-[12px] text-[var(--fg)] truncate">{n.title}</span>
                <span className="ml-auto text-[10px] text-[var(--fg-dimmer)] shrink-0">{n.group}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend + toggles */}
      <div className="absolute bottom-3 left-3 z-10 w-[230px] max-w-[calc(100%-24px)] max-h-[55%] overflow-auto rounded-lg bg-[rgba(8,5,16,0.78)] border border-[rgba(255,255,255,0.1)] p-2 text-[11px]">
        <button onClick={() => setLegendOpen((o) => !o)} aria-expanded={legendOpen} className="w-full flex items-center justify-between text-[9px] uppercase tracking-widest text-[var(--fg-dimmer)] hover:text-[var(--fg)] px-1">
          <span>Legenda{legendOpen ? " · clique para ocultar" : ""}</span><span>{legendOpen ? "▾" : "▸"}</span>
        </button>
        {legendOpen && <div className="mt-1">
        {sim.groups.map((g) => {
          const off = hiddenGroups.has(g.name);
          return (
            <button key={g.name} onClick={() => toggleGroup(g.name)} aria-pressed={!off} className={`w-full flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[rgba(255,255,255,0.06)] ${off ? "opacity-40" : ""}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rgbCss(g.rgb) }} />
              <span className="truncate text-[var(--fg)]">{g.name}</span>
              <span className="ml-auto metric text-[var(--fg-dimmer)]">{g.count}</span>
            </button>
          );
        })}
        <div className="border-t border-[rgba(255,255,255,0.08)] mt-1.5 pt-1.5 space-y-0.5">
          {sim.hubs.length > 0 && (
            <button onClick={() => setShowHub((s) => !s)} aria-pressed={showHub} className="w-full flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[rgba(255,255,255,0.06)]" title={sim.hubs.map((h) => h.title).join(", ")}>
              {showHub ? <Eye size={11} className="text-[var(--fg)]" /> : <EyeOff size={11} className="text-[var(--fg-dimmer)]" />}
              <span className="truncate text-[var(--fg)]">Índice mestre</span>
              <span className="ml-auto metric text-[var(--fg-dimmer)]">{sim.hubs.reduce((s, h) => s + h.degree, 0)} links</span>
            </button>
          )}
          <button onClick={() => setShowIsolated((s) => !s)} aria-pressed={showIsolated} className="w-full flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[rgba(255,255,255,0.06)]">
            {showIsolated ? <Eye size={11} className="text-[var(--fg)]" /> : <EyeOff size={11} className="text-[var(--fg-dimmer)]" />}
            <span className="truncate text-[var(--fg)]">Notas sem conexões</span>
            <span className="ml-auto metric text-[var(--fg-dimmer)]">{sim.isolatedCount}</span>
          </button>
          <div className="flex items-center gap-2 px-1 py-0.5 text-[var(--fg-dim)]">
            <span className="w-2 h-2 rounded-full shrink-0 bg-white shadow-[0_0_6px_white]" />
            <span className="truncate">Editadas nos últimos {RECENT_DAYS} dias</span>
            <span className="ml-auto metric text-[var(--fg-dimmer)]">{sim.recentCount}</span>
          </div>
        </div>
        </div>}
      </div>

      {/* Hover tooltip (near the cursor) */}
      {hover && hover.n.id !== selected?.id && (
        <div className="absolute pointer-events-none z-10 px-2.5 py-1 rounded-md bg-[rgba(0,0,0,0.78)] border border-[rgba(255,255,255,0.12)] max-w-[280px]" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="text-[12px] text-[var(--fg)] truncate">{hover.n.title}</div>
          <div className="text-[10px] text-[var(--fg-dimmer)] truncate">{hover.n.group} · {hover.n.deg} conexões</div>
        </div>
      )}

      {/* Note side panel */}
      {selected && (
        <div role="complementary" aria-label="Nota selecionada" className="absolute top-0 right-0 bottom-0 z-30 w-[380px] max-w-[85%] flex flex-col bg-[rgba(8,5,16,0.92)] border-l border-[rgba(255,255,255,0.12)] backdrop-blur-sm">
          <div className="px-4 pt-3 pb-2 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: rgbCss(selected.rgb), boxShadow: `0 0 8px ${rgbCss(selected.rgb)}` }} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-[var(--fg)] leading-snug break-words">{selected.title}</div>
                <div className="text-[10px] text-[var(--fg-dimmer)] truncate mt-0.5" title={selected.id}>{selected.id}</div>
              </div>
              <button onClick={() => select(null)} aria-label="Fechar painel" className="text-[var(--fg-dim)] hover:text-[var(--fg)] shrink-0"><X size={15} /></button>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--fg-dim)]">
              <span>{selected.group}</span>
              <span>{selNeighbors.length} conexões</span>
              <span>editada {formatAge(selected.mtime)}</span>
              {!selected.id.startsWith("CompanyHub-") && (
                <button onClick={() => onOpenNote(selected.id)} className="ml-auto flex items-center gap-1 text-[var(--fg)] hover:underline"><ExternalLink size={11} /> Abrir no visor</button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
            {note?.loading ? (
              <div className="flex items-center gap-2 text-[12px] text-[var(--fg-dim)]"><Loader2 size={13} className="animate-spin" /> Carregando nota…</div>
            ) : noteBody.trim() ? (
              <div className="galaxy-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{noteBody.slice(0, 20000)}</ReactMarkdown></div>
            ) : (
              <div className="text-[12px] text-[var(--fg-dimmer)]">Nota sem conteúdo.</div>
            )}
          </div>
          {selNeighbors.length > 0 && (
            <div className="max-h-[35%] overflow-auto border-t border-[rgba(255,255,255,0.08)] px-2 py-2">
              <div className="text-[9px] uppercase tracking-widest text-[var(--fg-dimmer)] px-2 mb-1">Conexões</div>
              {selNeighbors.slice(0, 60).map((n) => (
                <button key={n.id} onClick={() => select(n)} className="w-full text-left px-2 py-1 rounded hover:bg-[rgba(255,255,255,0.06)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: rgbCss(n.rgb) }} />
                  <span className="text-[12px] text-[var(--fg)] truncate">{n.title}</span>
                  <span className="ml-auto text-[10px] text-[var(--fg-dimmer)] shrink-0">{n.group}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatAge(mtime: number): string {
  const days = Math.floor((Date.now() - mtime) / 864e5);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months < 12 ? `há ${months} ${months === 1 ? "mês" : "meses"}` : `há ${Math.floor(months / 12)} ano(s)`;
}

const GALAXY_MD_CSS = `
.galaxy-md { font-size: 12.5px; line-height: 1.6; color: var(--fg); word-break: break-word; }
.galaxy-md h1, .galaxy-md h2, .galaxy-md h3 { font-weight: 600; margin: 0.9em 0 0.4em; line-height: 1.3; }
.galaxy-md h1 { font-size: 15px; } .galaxy-md h2 { font-size: 14px; } .galaxy-md h3 { font-size: 13px; }
.galaxy-md p, .galaxy-md ul, .galaxy-md ol, .galaxy-md blockquote, .galaxy-md pre, .galaxy-md table { margin: 0 0 0.7em; }
.galaxy-md ul { list-style: disc; padding-left: 1.2em; } .galaxy-md ol { list-style: decimal; padding-left: 1.2em; }
.galaxy-md a { color: rgb(167,139,250); text-decoration: underline; }
.galaxy-md code { font-family: 'Space Mono', monospace; font-size: 11px; background: rgba(255,255,255,0.07); padding: 0 4px; border-radius: 4px; }
.galaxy-md pre { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; overflow: auto; }
.galaxy-md pre code { background: none; padding: 0; }
.galaxy-md blockquote { border-left: 2px solid rgba(167,139,250,0.5); padding-left: 10px; color: var(--fg-dim); }
.galaxy-md table { border-collapse: collapse; font-size: 11.5px; display: block; overflow-x: auto; }
.galaxy-md th, .galaxy-md td { border: 1px solid rgba(255,255,255,0.12); padding: 3px 6px; }
.galaxy-md hr { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 1em 0; }
`;

function mulberry32(seed: number): () => number {
  return function () { let t = (seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
