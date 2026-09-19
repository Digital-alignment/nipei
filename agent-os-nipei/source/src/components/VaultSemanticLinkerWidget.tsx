"use client";

import React, { useState } from "react";
import { Link2, Sparkles, RefreshCw, CheckCircle2, FileText, Share2 } from "lucide-react";
import { LinkerResult } from "@/lib/vaultSemanticLinker";

interface Props {
  companySlug?: string;
  companyName?: string;
  onLinksUpdated?: () => void;
}

export function VaultSemanticLinkerWidget({ companySlug, companyName, onLinksUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunLinker = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/vault/linker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companySlug }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo auto-conectar las notas.");
      }

      setResult(data);
      if (onLinksUpdated) onLinksUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-[#080d1a] p-5 shadow-xl space-y-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/60 p-2.5 text-blue-400">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Auto-Conector Semántico de Wikilinks <code className="text-xs text-blue-400 font-mono">[[Wikilinks]]</code>
            </h3>
            <p className="text-xs text-slate-400">
              Analiza notas e inserta enlaces bidireccionales automáticos para nutrir la galaxia 3D.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunLinker}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-mono font-bold text-white transition disabled:opacity-50 shadow-lg shadow-blue-950/50"
        >
          {loading ? (
            <RefreshCw size={14} className="animate-spin text-white" />
          ) : (
            <Sparkles size={14} className="text-blue-200" />
          )}
          {loading ? "Conectando Wikilinks..." : "⚡ Auto-Conectar Wikilinks"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-blue-400" /> ¡Enlaces creados con éxito!
              </span>
              <span className="text-xs font-mono text-slate-400">
                {result.totalLinksCreated} enlaces en {result.updatedNotesCount} notas
              </span>
            </div>
          </div>

          {result.modifiedNotes.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Notas actualizadas:</span>
              {result.modifiedNotes.map((m) => (
                <div key={m.path} className="rounded-lg border border-blue-500/20 bg-[#060a14] p-2.5 text-xs flex items-center justify-between">
                  <span className="font-mono text-slate-200 truncate">{m.path}</span>
                  <div className="flex items-center gap-1">
                    {m.linksAdded.map((link) => (
                      <span key={link} className="rounded bg-blue-900/60 border border-blue-500/40 px-1.5 py-0.5 text-[10px] font-mono text-blue-300">
                        [[{link}]]
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
