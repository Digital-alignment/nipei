"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ShieldCheck, AlertTriangle, Clock, RefreshCw, Sparkles, CheckCircle2, FileText, ChevronRight } from "lucide-react";
import { VaultAuditReport, VaultAuditItem } from "@/lib/vaultConflictAuditor";

interface Props {
  companySlug?: string;
  companyName?: string;
}

export function VaultConflictAuditWidget({ companySlug, companyName }: Props) {
  const [report, setReport] = useState<VaultAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "contradiction" | "stale_note">("all");

  const fetchAuditReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = companySlug
        ? `/api/vault/audit?companySlug=${encodeURIComponent(companySlug)}`
        : "/api/vault/audit";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReport(data);
      } else {
        setError(data.error || "No se pudo realizar la auditoría del Vault.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [companySlug]);

  useEffect(() => {
    fetchAuditReport();
  }, [fetchAuditReport]);

  const filteredItems = (report?.items || []).filter((item) => {
    if (activeTab === "contradiction") return item.type === "contradiction";
    if (activeTab === "stale_note") return item.type === "stale_note" || item.type === "expired_date";
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500/40 bg-emerald-950/30";
    if (score >= 65) return "text-amber-400 border-amber-500/40 bg-amber-950/30";
    return "text-red-400 border-red-500/40 bg-red-950/30";
  };

  return (
    <div className="rounded-2xl border border-[#182818] bg-[#0c140c] p-6 shadow-xl space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#182818] pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-2.5 text-emerald-400">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Auditor de Frescura e Integridad del Vault
              {companyName && (
                <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {companyName}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Detecta notas obsoletas, decisiones caducadas y contradicciones entre Squads.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditReport}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-mono font-bold text-purple-300 hover:bg-purple-500/20 transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-purple-400" : "text-purple-400"} />
          {loading ? "Auditando..." : "🧹 Escanear Frescura en Vivo"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
          ⚠️ Error al ejecutar auditoría: {error}
        </div>
      )}

      {report && (
        <>
          {/* Health Score Gauge & KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Score Card */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${getScoreColor(report.healthScore)}`}>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Score de Integridad
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black">{report.healthScore}%</span>
                <span className="text-xs font-mono text-slate-400">Salud del Vault</span>
              </div>
            </div>

            {/* Scanned Notes */}
            <div className="rounded-xl border border-[#182818] bg-[#050805] p-4 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Notas Analizadas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{report.scannedNotesCount}</span>
                <span className="text-xs text-slate-400">documentos</span>
              </div>
            </div>

            {/* Contradictions */}
            <div className="rounded-xl border border-[#182818] bg-[#050805] p-4 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400/90 font-semibold flex items-center gap-1">
                <AlertTriangle size={13} /> Contradicciones
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-400">{report.criticalCount}</span>
                <span className="text-xs text-slate-400">críticas</span>
              </div>
            </div>

            {/* Stale Notes */}
            <div className="rounded-xl border border-[#182818] bg-[#050805] p-4 flex flex-col justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400/90 font-semibold flex items-center gap-1">
                <Clock size={13} /> Notas Obsoletas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-300">{report.staleNotesCount}</span>
                <span className="text-xs text-slate-400">&gt; 60 días</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-[#182818] pb-2">
            {[
              { id: "all", label: `Todos los Hallazgos (${report.items.length})` },
              { id: "contradiction", label: `⚠️ Contradicciones (${report.criticalCount})` },
              { id: "stale_note", label: `🕒 Obsoletas (${report.staleNotesCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition ${
                  activeTab === tab.id
                    ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                    : "text-slate-400 hover:bg-[#142614]/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Findings List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="rounded-xl border border-[#182818] bg-[#050805] p-8 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <p className="text-sm font-semibold text-white">¡ Vault Limpio y Actualizado !</p>
                <p className="text-xs text-slate-400">No se encontraron problemas en la categoría seleccionada.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 space-y-2 transition ${
                    item.severity === "critical"
                      ? "border-red-500/30 bg-red-950/10"
                      : item.severity === "warning"
                      ? "border-amber-500/30 bg-amber-950/10"
                      : "border-[#182818] bg-[#050805]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${
                            item.severity === "critical"
                              ? "bg-red-950 border-red-500/50 text-red-400"
                              : "bg-amber-950 border-amber-500/50 text-amber-300"
                          }`}
                        >
                          {item.type.replace("_", " ")}
                        </span>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-300">{item.description}</p>
                    </div>
                  </div>

                  {/* Affected Paths */}
                  {item.affectedPaths.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-mono text-slate-500">Notas involucradas:</span>
                      {item.affectedPaths.map((p) => (
                        <span
                          key={p}
                          className="rounded bg-[#0f1d0f] px-2 py-0.5 text-[11px] font-mono text-emerald-400 border border-emerald-500/20"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggestion */}
                  <div className="mt-2 rounded-lg bg-[#0c140c] p-2.5 border border-[#182818] text-xs text-slate-300 flex items-center gap-2">
                    <Sparkles size={13} className="text-purple-400 shrink-0" />
                    <span><strong>Recomendación:</strong> {item.suggestion}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Note */}
          {report.reportNotePath && (
            <div className="flex items-center justify-between border-t border-[#182818] pt-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-400" /> Reporte conservado en: <code className="text-emerald-300">{report.reportNotePath}</code>
              </span>
              <span className="text-slate-500">Escaneado: {new Date(report.auditDate).toLocaleTimeString("es-ES")}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
