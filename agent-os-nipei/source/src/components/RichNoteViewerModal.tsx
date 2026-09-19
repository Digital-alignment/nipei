"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Edit3, Eye, Save, X, CheckCircle2, AlertCircle, Clock, ShieldCheck, Tag } from "lucide-react";

interface RichNoteViewerModalProps {
  path: string;
  initialContent: string;
  onClose: () => void;
  onSaveSuccess?: (path: string, newContent: string) => void;
}

export default function RichNoteViewerModal({
  path,
  initialContent,
  onClose,
  onSaveSuccess,
}: RichNoteViewerModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Parse YAML Frontmatter if present
  const parseFrontmatter = (raw: string) => {
    if (!raw.startsWith("---")) return { yamlObj: null, body: raw };
    const parts = raw.split("---");
    if (parts.length < 3) return { yamlObj: null, body: raw };
    
    const yamlStr = parts[1];
    const bodyStr = parts.slice(2).join("---").trim();
    
    const yamlObj: Record<string, string> = {};
    yamlStr.split("\n").forEach((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        yamlObj[key] = val;
      }
    });

    return { yamlObj, body: bodyStr };
  };

  const { yamlObj, body } = parseFrontmatter(content);

  async function handleSave() {
    setSaving(true);
    setStatusMsg(null);

    // Ensure agent attribution comment exists if creating/editing
    let contentToSave = content;
    if (!contentToSave.includes("<!-- agente:")) {
      if (contentToSave.startsWith("---")) {
        const parts = contentToSave.split("---");
        if (parts.length >= 3) {
          parts[2] = `\n<!-- agente: antigravity -->\n` + parts[2];
          contentToSave = parts.join("---");
        }
      } else {
        contentToSave = `<!-- agente: antigravity -->\n` + contentToSave;
      }
    }

    try {
      const res = await fetch("/api/memory/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: contentToSave }),
      });

      const data = await res.json();
      if (data.success) {
        setContent(contentToSave);
        setStatusMsg({ type: "success", text: "Nota guardada exitosamente en Nipëi Vault" });
        setIsEditing(false);
        if (onSaveSuccess) onSaveSuccess(path, contentToSave);
      } else {
        setStatusMsg({ type: "error", text: data.error || "Error al guardar la nota" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg({ type: "error", text: `Error de red: ${msg}` });
    } finally {
      setSaving(false);
    }
  }

  // Render Rich Markdown elements cleanly
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // HTML comments
      if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) {
        return (
          <div key={idx} className="text-[10px] font-mono text-[#668866] bg-[#0c140c] px-2 py-0.5 rounded my-1 border border-[#182818] inline-block">
            🏷️ {trimmed.replace(/<!--|-->/g, "").trim()}
          </div>
        );
      }

      // Headers
      if (line.startsWith("# ")) {
        return <h1 key={idx} className="text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-[#182818]">{line.slice(2)}</h1>;
      }
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-bold text-[#22c55e] mt-4 mb-2 flex items-center gap-2"><span>#</span> {line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-semibold text-emerald-300 mt-3 mb-1">{line.slice(4)}</h3>;
      }

      // Horizontal rule
      if (trimmed === "---") {
        return <hr key={idx} className="my-3 border-[#182818]" />;
      }

      // Checkboxes [x] / [ ]
      if (trimmed.startsWith("- [x]") || trimmed.startsWith("* [x]")) {
        return (
          <div key={idx} className="flex items-center gap-2 my-1 text-xs text-emerald-300 bg-[#0c1a0c] px-2 py-1 rounded border border-[#1e381e]">
            <CheckCircle2 size={14} className="text-[#22c55e] shrink-0" />
            <span className="line-through opacity-80">{line.replace(/^[-*]\s*\[x\]\s*/i, "")}</span>
          </div>
        );
      }
      if (trimmed.startsWith("- [ ]") || trimmed.startsWith("* [ ]")) {
        return (
          <div key={idx} className="flex items-center gap-2 my-1 text-xs text-[#a0c0a0]">
            <div className="w-3.5 h-3.5 rounded border border-[#22c55e]/50 shrink-0" />
            <span>{line.replace(/^[-*]\s*\[\s*\]\s*/i, "")}</span>
          </div>
        );
      }

      // Bullet lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 text-xs text-[#c0d8c0] pl-2">
            <span className="text-[#22c55e] shrink-0 mt-0.5">•</span>
            <span>{line.replace(/^[-*]\s*/, "")}</span>
          </div>
        );
      }

      // Blockquotes
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="my-2 p-2 bg-[#0c1a0c] border-l-2 border-[#22c55e] text-xs text-emerald-200 italic rounded-r">
            {line.slice(2)}
          </blockquote>
        );
      }

      // Empty lines
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Paragraph
      return (
        <p key={idx} className="text-xs text-[#d0e4d0] leading-relaxed my-1">
          {line}
        </p>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="panel border border-[#182818] bg-[#050805] p-0 overflow-hidden flex flex-col rounded-2xl shadow-2xl"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-[#182818] bg-[#080d08] gap-3">
        <div className="flex items-center gap-2 truncate">
          <FileText size={16} className="text-[#22c55e] shrink-0" />
          <span className="text-xs font-mono font-semibold text-white truncate max-w-[320px]" title={path}>
            {path}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#182818] text-[#88a888] hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3.5 py-1 rounded-lg text-xs font-bold bg-[#22c55e] hover:bg-[#16a34a] text-black flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <Save size={13} />
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#142614] border border-[#22c55e]/40 text-[#22c55e] hover:bg-[#1f381f] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={13} /> Editar Nota
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#182818] text-[#88a888] hover:text-white rounded-lg transition"
                title="Cerrar vista de nota"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`px-4 py-2 text-xs flex items-center gap-2 border-b ${
            statusMsg.type === "success"
              ? "bg-[#0c240c] text-[#22c55e] border-[#22c55e]/40"
              : "bg-[#240c0c] text-red-400 border-red-500/40"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 max-h-[500px] overflow-y-auto font-sans scroll">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[360px] p-4 bg-[#080d08] border border-[#22c55e]/30 rounded-xl text-xs font-mono text-[#d0e4d0] outline-none focus:border-[#22c55e] transition leading-relaxed resize-y"
          />
        ) : (
          <div className="space-y-2">
            {/* Frontmatter Metadata Header Pill Card */}
            {yamlObj && Object.keys(yamlObj).length > 0 && (
              <div className="mb-4 p-3 bg-[#0c140c] border border-[#182818] rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#668866] tracking-wider font-mono">
                  <ShieldCheck size={12} className="text-[#22c55e]" /> YAML Frontmatter Metadata
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(yamlObj).map(([k, v]) => (
                    <div key={k} className="px-2.5 py-1 bg-[#142614] border border-[#22c55e]/30 rounded-lg text-[11px]">
                      <span className="text-[#668866] font-mono">{k}: </span>
                      <span className="font-bold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Body */}
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(body)}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
