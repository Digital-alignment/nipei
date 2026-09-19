"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";

export interface CompanyExecutiveReport {
  companySlug: string;
  companyName: string;
  category: string;
  generatedAt: number;
  markdownReport: string;
  htmlReport: string;
}

interface CompanyReportExporterModalProps {
  companySlug: string;
  companyName: string;
  onClose: () => void;
}

export default function CompanyReportExporterModal({
  companySlug,
  companyName,
  onClose,
}: CompanyReportExporterModalProps) {
  const [report, setReport] = useState<CompanyExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"markdown" | "html">("markdown");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/vault/report?company=${encodeURIComponent(companySlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => console.error("Error generating report:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  const handlePrintPDF = () => {
    if (!report?.htmlReport) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(report.htmlReport);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleDownloadMarkdown = () => {
    if (!report?.markdownReport) return;
    const blob = new Blob([report.markdownReport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reporte_Ejecutivo_${companySlug}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    if (!report?.markdownReport) return;
    navigator.clipboard.writeText(report.markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Reporte Ejecutivo para Cliente — {companyName}
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  1-Click Export
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Certificado por Digital Alignment Agency y sincronizado con el Vault
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab & Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("markdown")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "markdown"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              📄 Vista Previa Markdown
            </button>
            <button
              onClick={() => setActiveTab("html")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === "html"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              🖨️ Plantilla Imprimible (PDF)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              disabled={loading || !report}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1.5"
              title="Abrir ventana de impresión y guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>🖨️ Guardar PDF</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              disabled={loading || !report}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              title="Descargar archivo .md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .md</span>
            </button>

            <button
              onClick={handleCopyText}
              disabled={loading || !report}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Copiar contenido"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs text-slate-400 font-mono">Generando Reporte Ejecutivo 360°...</span>
            </div>
          ) : !report ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No se pudo generar el reporte para la empresa especificada.
            </div>
          ) : activeTab === "markdown" ? (
            <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
              {report.markdownReport}
            </pre>
          ) : (
            <div className="w-full h-full rounded-xl overflow-hidden border border-slate-800 bg-white">
              <iframe
                srcDoc={report.htmlReport}
                className="w-full h-[520px] border-none"
                title="Printable Report Preview"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
