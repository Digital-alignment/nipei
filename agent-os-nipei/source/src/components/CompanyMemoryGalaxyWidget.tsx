"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Network, RefreshCw, FileText } from "lucide-react";
import RichNoteViewerModal from "./RichNoteViewerModal";

const MemoryGalaxy = dynamic(() => import("./MemoryGalaxy"), { ssr: false });
const VaultGraph3D = dynamic(() => import("./VaultGraph3D"), { ssr: false });

interface CompanyMemoryGalaxyWidgetProps {
  companySlug: string;
  companyName: string;
  height?: string;
}

export default function CompanyMemoryGalaxyWidget({
  companySlug,
  companyName,
  height = "520px",
}: CompanyMemoryGalaxyWidgetProps) {
  const [galaxyMode, setGalaxyMode] = useState(true);
  const [activeNotePath, setActiveNotePath] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenNote = async (relPath: string) => {
    // If it's the synthetic company hub node, do nothing or notify
    if (relPath.startsWith("CompanyHub-")) return;
    try {
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error("Could not load note content");
      const data = await res.json();
      setActiveNotePath(relPath);
      setActiveNoteContent(data.content ?? "");
    } catch (err) {
      console.error("Error opening note from graph:", err);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-md shadow-2xl text-slate-100 flex flex-col gap-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-5 h-5 fill-purple-400/20" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
              Memory Galaxy 3D — {companyName}
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 font-mono">
                Grafo Vivo 3D
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Visualización estelar interactiva 3D de notas y conexiones del Vault para esta empresa
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGalaxyMode((g) => !g)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
          >
            {galaxyMode ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Galaxy Starfield ✦</span>
              </>
            ) : (
              <>
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clean Network 3D</span>
              </>
            )}
          </button>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Recalcular simulación 3D"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orbital Legend Bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-[11px] font-mono text-slate-300">
        <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Leyenda de Órbitas 3D:</span>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
          ☀️ Sol Central (Core)
        </span>
        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
          🔵 Órbita 1: Infraestuctura & VPS
        </span>
        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-medium">
          🟡 Órbita 2: Roadmap & Sprints
        </span>
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
          🟢 Órbita 3: Minutas
        </span>
        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
          🟣 Órbita 4: Conocimiento Ingestado
        </span>
      </div>

      {/* 3D Canvas Box */}
      <div
        className="w-full rounded-xl border border-slate-800 overflow-hidden relative bg-black shadow-inner"
        style={{ height }}
      >

        {galaxyMode ? (
          <MemoryGalaxy key={refreshKey} companySlug={companySlug} onOpenNote={handleOpenNote} />
        ) : (
          <VaultGraph3D key={refreshKey} companySlug={companySlug} onOpenNote={handleOpenNote} />
        )}
      </div>

      {/* Rich Note Viewer Modal */}
      {activeNotePath && activeNoteContent !== null && (
        <RichNoteViewerModal
          path={activeNotePath}
          initialContent={activeNoteContent}
          onClose={() => {
            setActiveNotePath(null);
            setActiveNoteContent(null);
          }}
        />
      )}
    </div>
  );
}
