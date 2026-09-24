"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {
  TrendingUp,
  FileText,
  FileSpreadsheet,
  FolderTree,
  Plus,
  Save,
  RefreshCw,
  ExternalLink,
  Edit3,
  Eye,
  CheckCircle2,
  Folder,
  ChevronRight,
  Database,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProductivityFile {
  name: string;
  relativePath: string;
  fullPath: string;
  extension: "md" | "csv" | string;
  sizeBytes: number;
  modifiedAt: string;
  category: string;
}

export default function ProductivityPage() {
  const [files, setFiles] = useState<ProductivityFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
  const [activeFile, setActiveFile] = useState<ProductivityFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");

  // New File modal state
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFileCategory, setNewFileCategory] = useState<string>("Metodologias");
  const [newFileType, setNewFileType] = useState<"md" | "csv">("md");

  const loadFileList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/productivity/files");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        if (!activeFile && data.files.length > 0) {
          selectFile(data.files[0]);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const selectFile = async (file: ProductivityFile) => {
    setActiveFile(file);
    setIsEditing(false);
    setSaveMessage("");
    try {
      const res = await fetch(`/api/productivity/files?file=${encodeURIComponent(file.relativePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
      }
    } catch {
      setFileContent("");
    }
  };

  const saveFileContent = async () => {
    if (!activeFile) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/productivity/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relativePath: activeFile.relativePath,
          content: fileContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("✅ Sincronizado correctamente con el Vault");
        setIsEditing(false);
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error al guardar en el Vault");
      }
    } catch {
      setSaveMessage("❌ Error al conectar con el Vault");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    let filename = newFileName.trim();
    if (!filename.endsWith(`.${newFileType}`)) {
      filename += `.${newFileType}`;
    }

    const relativePath = `${newFileCategory}/${filename}`;
    const initialBody =
      newFileType === "md"
        ? `---\ntitle: "${filename.replace(".md", "")}"\ncategoria: "Productivity"\n---\n<!-- agente: antigravity -->\n\n# ${filename.replace(".md", "")}\n\nEscriba aquí el contenido de la metodología...\n`
        : `id,nombre,categoria,metrica,status\n01,Ejemplo,Productividad,100,Ativo\n`;

    try {
      const res = await fetch("/api/productivity/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relativePath,
          content: initialBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewModal(false);
        setNewFileName("");
        await loadFileList();
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadFileList();
  }, []);

  const categories = ["TODOS", "Metodologias", "Datasets", "Templates"];

  const filteredFiles = files.filter((f) => {
    if (selectedCategory === "TODOS") return true;
    return f.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Simple CSV parser for HTML table rendering
  const renderCsvTable = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length === 0 || !lines[0]) return null;

    const headers = lines[0].split(",");
    const rows = lines.slice(1).map((l) => l.split(","));

    return (
      <div className="overflow-x-auto rounded-xl border border-[#1b361d] bg-[#071208]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0f2411] border-b border-[#1b361d] text-emerald-400 font-mono">
              {headers.map((h, i) => (
                <th key={i} className="p-3 font-bold uppercase tracking-wider">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#152b17]">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#0e2110] transition">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="p-3 text-slate-200 font-mono">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050c06] text-white">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#162e18] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Nipëi Vault Sync
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  • nipei-vault/Productivity
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                <TrendingUp className="text-emerald-400" size={28} />
                <span>Productivity & Metodologias Hub</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Gestión de documentos Markdown (.md) y tablas CSV de productividad sincronizadas con el Vault.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadFileList}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0d1e0f] hover:bg-[#152e18] text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                title="Refrescar lista de archivos del Vault"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refrescar Vault</span>
              </button>

              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition"
              >
                <Plus size={15} />
                <span>Nuevo Doc / CSV</span>
              </button>
            </div>
          </div>

          {/* Main Grid: File Explorer Sidebar & Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Category Tabs & File Tree (4 Cols) */}
            <div className="lg:col-span-4 bg-[#09140a] border border-[#1b361d] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#172e18]">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderTree size={15} className="text-emerald-400" />
                  Jerarquía del Vault
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  {filteredFiles.length} Archivos
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-[#0d1f0f] text-slate-400 hover:text-emerald-300 border border-[#1b361d]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* File List */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredFiles.map((file) => {
                  const isActive = activeFile?.relativePath === file.relativePath;
                  return (
                    <div
                      key={file.relativePath}
                      onClick={() => selectFile(file)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 group ${
                        isActive
                          ? "bg-emerald-950/60 border-emerald-500/50 text-white shadow-md"
                          : "bg-[#0c180d] border-[#182f1a] text-slate-300 hover:border-emerald-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.extension === "csv" ? (
                          <FileSpreadsheet size={18} className="text-cyan-400 shrink-0" />
                        ) : (
                          <FileText size={18} className="text-emerald-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate group-hover:text-emerald-300 transition">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {file.relativePath}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition ${
                          isActive ? "text-emerald-400" : "text-slate-600 group-hover:text-emerald-400"
                        }`}
                      />
                    </div>
                  );
                })}

                {filteredFiles.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs italic">
                    No hay archivos registrados en esta categoría.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Active File Reader & Editor (8 Cols) */}
            <div className="lg:col-span-8 bg-[#09140a] border border-[#1b361d] rounded-2xl p-5 space-y-4">
              {activeFile ? (
                <>
                  {/* File Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#172e18]">
                    <div className="flex items-center gap-3">
                      {activeFile.extension === "csv" ? (
                        <FileSpreadsheet size={22} className="text-cyan-400" />
                      ) : (
                        <FileText size={22} className="text-emerald-400" />
                      )}
                      <div>
                        <h2 className="text-base font-bold text-white tracking-tight">
                          {activeFile.name}
                        </h2>
                        <span className="text-[11px] font-mono text-slate-400">
                          {activeFile.relativePath} • {(activeFile.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                      {saveMessage && (
                        <span className="text-xs font-mono font-bold animate-pulse">
                          {saveMessage}
                        </span>
                      )}

                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                          isEditing
                            ? "bg-amber-950 text-amber-300 border-amber-600/40"
                            : "bg-[#0f2411] text-emerald-400 border-emerald-500/30 hover:bg-[#163318]"
                        }`}
                      >
                        {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                        <span>{isEditing ? "Vista Lectura" : "Editar"}</span>
                      </button>

                      {isEditing && (
                        <button
                          onClick={saveFileContent}
                          disabled={saving}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                        >
                          <Save size={14} />
                          <span>{saving ? "Guardando..." : "Guardar en Vault"}</span>
                        </button>
                      )}

                      <a
                        href={`file:///C:/Users/ondig/Code/Nipei/nipei-vault/Productivity/${activeFile.relativePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-[#0f2411] text-slate-400 hover:text-emerald-300 border border-[#1b361d]"
                        title="Abrir nota original en Obsidian"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Body Content / Editor */}
                  <div className="mt-2 min-h-[400px]">
                    {isEditing ? (
                      <textarea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        className="w-full h-[480px] bg-[#050c06] border border-[#1c391d] rounded-xl p-4 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
                        placeholder="Contenido Markdown o CSV..."
                      />
                    ) : activeFile.extension === "csv" ? (
                      renderCsvTable(fileContent)
                    ) : (
                      <div className="prose prose-invert max-w-none text-xs leading-relaxed p-4 bg-[#061007] rounded-xl border border-[#162e18] font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {fileContent}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs italic">
                  Selecciona un archivo Markdown (.md) o CSV (.csv) de la lista para consultar o editar.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* New File Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#09140a] border border-[#1b361d] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Plus size={18} className="text-emerald-400" />
              <span>Crear Nuevo Documento en Vault</span>
            </h3>

            <form onSubmit={handleCreateFile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre del Archivo:</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="ej: Metodo_5S_Produtividade"
                  className="w-full bg-[#050c06] border border-[#1b361d] text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Carpeta Jerárquica:</label>
                  <select
                    value={newFileCategory}
                    onChange={(e) => setNewFileCategory(e.target.value)}
                    className="w-full bg-[#050c06] border border-[#1b361d] text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Metodologias">Metodologias</option>
                    <option value="Datasets">Datasets (CSV)</option>
                    <option value="Templates">Templates</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo de Archivo:</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as "md" | "csv")}
                    className="w-full bg-[#050c06] border border-[#1b361d] text-white text-xs rounded-lg p-2.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="md">Markdown (.md)</option>
                    <option value="csv">Tabla CSV (.csv)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#172e18]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                >
                  Crear en Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
