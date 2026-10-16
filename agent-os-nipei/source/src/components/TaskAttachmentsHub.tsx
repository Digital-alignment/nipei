"use client";

import { useState, useEffect, useRef } from "react";
import {
  Paperclip,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Download,
  Trash2,
  Plus,
  Copy,
  Check,
  Eye,
  X,
  File,
  Sparkles,
  BookOpen
} from "lucide-react";
import type { GlobalTask, TaskAttachment, AttachmentType } from "@/lib/nipeiStore";

interface TaskAttachmentsHubProps {
  task: GlobalTask;
  onUpdateTask: (updated: GlobalTask) => void;
}

export default function TaskAttachmentsHub({ task, onUpdateTask }: TaskAttachmentsHubProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<"all" | "files" | "links">("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Link Form State
  const [showAddLinkForm, setShowAddLinkForm] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>("");
  const [linkTitle, setLinkTitle] = useState<string>("");
  const [linkNotes, setLinkNotes] = useState<string>("");
  const [linkKind, setLinkKind] = useState<"link" | "vault_note">("link");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load workspace data from API on task load
  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          taskId: task.id,
          squadId: task.squad || "",
          taskTitle: task.title || "",
        });
        const res = await fetch(`/api/agent-kanban/attachments?${query.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.attachments)) {
          setAttachments(data.attachments);
          setWorkspacePath(data.workspacePath || "");
          if (JSON.stringify(task.attachments) !== JSON.stringify(data.attachments)) {
            onUpdateTask({ ...task, attachments: data.attachments });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar anexos do workspace:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, [task.id]);

  // Handle File Upload (Drag & Drop or File Picker)
  async function handleFilesUpload(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const newAttachments: TaskAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("taskId", task.id);
        formData.append("squadId", task.squad || "");
        formData.append("taskTitle", task.title || "");
        formData.append("uploadedBy", "@usuario");
        if (task.vaultPath) formData.append("vaultPath", task.vaultPath);

        const res = await fetch("/api/agent-kanban/attachments", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.attachment) {
          newAttachments.push(data.attachment);
        }
      }

      const merged = [...newAttachments, ...attachments];
      setAttachments(merged);
      onUpdateTask({ ...task, attachments: merged });
    } catch (err) {
      console.error("Erro ao enviar arquivo:", err);
      alert("Falha no upload do arquivo. Verifique o console.");
    } finally {
      setUploading(false);
    }
  }

  // Handle Add Link / Vault Note
  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    try {
      const res = await fetch("/api/agent-kanban/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          squadId: task.squad,
          taskTitle: task.title,
          name: linkTitle.trim() || linkUrl.trim(),
          targetUrlOrNote: linkUrl.trim(),
          type: linkKind,
          uploadedBy: "@usuario",
          notes: linkNotes.trim() || undefined,
          vaultPath: task.vaultPath,
        }),
      });
      const data = await res.json();
      if (data.success && data.attachment) {
        const updated = [data.attachment, ...attachments];
        setAttachments(updated);
        onUpdateTask({ ...task, attachments: updated });
        setLinkUrl("");
        setLinkTitle("");
        setLinkNotes("");
        setShowAddLinkForm(false);
      }
    } catch (err) {
      console.error("Erro ao registrar link:", err);
    }
  }

  function handleCopy(text: string, id: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderAttachmentIcon(type: AttachmentType) {
    switch (type) {
      case "image":
        return <ImageIcon size={18} className="text-emerald-400 shrink-0" />;
      case "spreadsheet":
        return <FileSpreadsheet size={18} className="text-teal-400 shrink-0" />;
      case "document":
        return <FileText size={18} className="text-sky-400 shrink-0" />;
      case "vault_note":
        return <BookOpen size={18} className="text-purple-400 shrink-0" />;
      case "link":
      default:
        return <Link2 size={18} className="text-amber-400 shrink-0" />;
    }
  }

  const filteredAttachments = attachments.filter((att) => {
    if (filterType === "files") return att.type === "image" || att.type === "document" || att.type === "spreadsheet";
    if (filterType === "links") return att.type === "link" || att.type === "vault_note";
    return true;
  });

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#1e381e] bg-[#070e08]/90">
        <div className="flex items-center gap-2.5">
          <Paperclip size={16} className="text-[#22c55e]" />
          <div>
            <div className="text-white font-bold text-xs flex items-center gap-2">
              <span>Anexos, Insumos & Links da Tarefa</span>
              <span className="text-[10px] text-[#22c55e] bg-[#142414] px-2 py-0.5 rounded-md border border-[#1e381e]">
                {attachments.length} {attachments.length === 1 ? "item" : "itens"}
              </span>
            </div>
            {workspacePath && (
              <div className="text-[10px] text-zinc-400 font-sans truncate max-w-sm sm:max-w-md">
                Pasta no Vault: <span className="text-emerald-400 font-mono">{workspacePath}/inputs/</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#4ade80] text-[#050805] font-bold text-xs transition shadow-sm disabled:opacity-50"
          >
            <UploadCloud size={14} />
            <span>{uploading ? "Enviando..." : "Anexar Arquivo"}</span>
          </button>

          <button
            onClick={() => setShowAddLinkForm(!showAddLinkForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f1f11] hover:bg-[#18331b] border border-[#22c55e]/40 text-[#4ade80] hover:text-white font-semibold text-xs transition shadow-sm"
          >
            <Link2 size={13} />
            <span>{showAddLinkForm ? "Fechar Formulário" : "Adicionar Link / Nota"}</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
      />

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          isDragOver
            ? "border-[#22c55e] bg-[#0c240c] shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.01]"
            : "border-[#1e381e] bg-[#050a06]/80 hover:border-[#22c55e]/70 hover:bg-[#081208]"
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#102010] border border-[#1e381e] flex items-center justify-center text-[#22c55e] shadow-inner">
          <UploadCloud size={20} className={uploading ? "animate-bounce" : ""} />
        </div>
        <div className="space-y-0.5">
          <p className="text-white font-bold text-xs">
            {uploading ? "Enviando arquivo para o Nipëi Vault..." : "Arraste e solte arquivos aqui, ou clique para navegar"}
          </p>
          <p className="text-[10px] text-zinc-400 font-sans">
            Suporta imagens (PNG, JPG, WebP), documentos (PDF, DOCX, TXT, MD) e planilhas (CSV, XLSX).
          </p>
        </div>
      </div>

      {/* 3. Add Link / Vault Reference Form Modal/Drawer */}
      {showAddLinkForm && (
        <form
          onSubmit={handleAddLink}
          className="p-4 rounded-xl border border-emerald-900/60 bg-[#061008] space-y-3 animate-fadeIn shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-bold flex items-center gap-1.5 text-xs">
              <Link2 size={14} className="text-[#22c55e]" /> Registrar Link Externo ou Referência do Vault
            </span>
            <div className="flex items-center gap-1 bg-[#050805] p-0.5 rounded-lg border border-[#1e381e]">
              <button
                type="button"
                onClick={() => setLinkKind("link")}
                className={`px-2.5 py-0.5 rounded text-[10px] transition ${
                  linkKind === "link" ? "bg-[#142414] text-[#4ade80] font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                🌐 Link Web
              </button>
              <button
                type="button"
                onClick={() => setLinkKind("vault_note")}
                className={`px-2.5 py-0.5 rounded text-[10px] transition ${
                  linkKind === "vault_note" ? "bg-[#142414] text-[#4ade80] font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                🏛️ Nota Obsidian
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-semibold">
                {linkKind === "link" ? "URL do Link (https://...)" : "Caminho da Nota no Vault"}
              </label>
              <input
                type="text"
                required
                placeholder={
                  linkKind === "link"
                    ? "https://www.figma.com/file/... ou Google Drive"
                    : "Squads/squad_4_vendas_mkt.md"
                }
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-semibold">Título de Identificação</label>
              <input
                type="text"
                placeholder="Ex: Briefing de Design ou Estatuto Social"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="w-full p-2 rounded-lg bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-zinc-400 font-semibold">Anotações / Contexto (Opcional)</label>
            <input
              type="text"
              placeholder="Instruções para os agentes IA ou notas sobre este anexo..."
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddLinkForm(false)}
              className="px-3 py-1.5 rounded-lg bg-[#081208] border border-[#1e381e] text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#22c55e] text-[#050805] font-bold hover:bg-[#4ade80] transition"
            >
              Vincular Anexo
            </button>
          </div>
        </form>
      )}

      {/* 4. Filter Tabs & Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#142414] pb-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded text-[11px] transition ${
                filterType === "all" ? "bg-[#142414] text-[#4ade80] font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Todos ({attachments.length})
            </button>
            <button
              onClick={() => setFilterType("files")}
              className={`px-2.5 py-1 rounded text-[11px] transition ${
                filterType === "files" ? "bg-[#142414] text-[#4ade80] font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Arquivos & Imagens ({attachments.filter((a) => a.type !== "link" && a.type !== "vault_note").length})
            </button>
            <button
              onClick={() => setFilterType("links")}
              className={`px-2.5 py-1 rounded text-[11px] transition ${
                filterType === "links" ? "bg-[#142414] text-[#4ade80] font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Links & Vault ({attachments.filter((a) => a.type === "link" || a.type === "vault_note").length})
            </button>
          </div>

          <span className="text-[10px] text-zinc-500 font-sans">
            Armazenamento sincronizado no Vault
          </span>
        </div>

        {/* Empty State */}
        {filteredAttachments.length === 0 ? (
          <div className="p-8 border border-dashed border-[#1e381e] rounded-xl text-center space-y-2 text-zinc-500">
            <Paperclip size={24} className="mx-auto text-zinc-600 opacity-60" />
            <p className="text-xs">Nenhum anexo registrado nesta categoria ainda.</p>
            <p className="text-[10px] font-sans text-zinc-600">
              Arraste imagens ou documentos acima para anexar como insumo para a execução desta tarefa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredAttachments.map((att) => {
              const isImage = att.type === "image";
              const isVault = att.type === "vault_note";
              const isWebLink = att.type === "link";

              return (
                <div
                  key={att.id}
                  className="p-3 rounded-xl border border-[#1e381e] bg-[#070e08] hover:border-[#22c55e]/60 transition flex flex-col justify-between space-y-2 group shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Thumbnail or Icon */}
                    {isImage ? (
                      <div
                        onClick={() => setPreviewImage(att.url)}
                        className="w-12 h-12 rounded-lg bg-[#050805] border border-[#1e381e] overflow-hidden shrink-0 cursor-pointer relative group/img hover:border-[#22c55e]"
                      >
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                          <Eye size={12} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0a140b] border border-[#1e381e] flex items-center justify-center shrink-0">
                        {renderAttachmentIcon(att.type)}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate" title={att.name}>
                          {att.name}
                        </span>
                        {isVault && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[9px] font-bold shrink-0">
                            Vault
                          </span>
                        )}
                        {isWebLink && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9px] font-bold shrink-0">
                            Web
                          </span>
                        )}
                      </div>

                      {att.notes && (
                        <p className="text-[10px] text-zinc-300 truncate font-sans">{att.notes}</p>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-sans flex-wrap">
                        {att.sizeBytes && <span>{formatFileSize(att.sizeBytes)}</span>}
                        {att.uploadedAt && <span>• {att.uploadedAt}</span>}
                        {att.uploadedBy && <span className="text-emerald-400 font-mono">• {att.uploadedBy}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-[#142414] flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 truncate max-w-[150px] font-mono text-[9px]">
                      {att.vaultRelativePath ? att.vaultRelativePath.split("/").pop() : "Link Externo"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Copy Link Button */}
                      <button
                        onClick={() => handleCopy(att.url, att.id)}
                        title="Copiar link do anexo"
                        className="p-1 rounded bg-[#0a140b] hover:bg-[#142414] border border-[#1e381e] text-zinc-400 hover:text-white transition flex items-center gap-1"
                      >
                        {copiedId === att.id ? (
                          <Check size={11} className="text-[#22c55e]" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>

                      {/* Open or Download Button */}
                      {isWebLink ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-[#102010] hover:bg-[#183018] border border-[#22c55e]/40 text-[#4ade80] hover:text-white font-bold flex items-center gap-1 transition"
                        >
                          <ExternalLink size={10} /> Abrir
                        </a>
                      ) : (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.name}
                          className="px-2 py-0.5 rounded bg-[#102010] hover:bg-[#183018] border border-[#22c55e]/40 text-[#4ade80] hover:text-white font-bold flex items-center gap-1 transition"
                        >
                          <Download size={10} /> Baixar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Visualização do Anexo"
              className="max-w-full max-h-[82vh] rounded-xl object-contain border border-[#1e381e] shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
