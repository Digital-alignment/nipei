"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  Search,
  FileText,
  Building2,
  Filter,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ListTodo,
} from "lucide-react";
import RichNoteViewerModal from "./RichNoteViewerModal";

export interface VaultTodoItem {
  id: string;
  relPath: string;
  noteTitle: string;
  companySlug?: string;
  companyName?: string;
  squadId?: string;
  text: string;
  line: number;
  completed: boolean;
  mtime: number;
}

export interface VaultTodoStats {
  total: number;
  pending: number;
  completed: number;
}

interface VaultTodoExtractorWidgetProps {
  companySlug?: string;
  companyName?: string;
  squadId?: string;
  title?: string;
  compact?: boolean;
}

export default function VaultTodoExtractorWidget({
  companySlug,
  companyName,
  squadId,
  title = "Tareas Pendientes del Vault",
  compact = false,
}: VaultTodoExtractorWidgetProps) {
  const [todos, setTodos] = useState<VaultTodoItem[]>([]);
  const [stats, setStats] = useState<VaultTodoStats>({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("pending");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Note Viewer Modal state
  const [activeNotePath, setActiveNotePath] = useState<string | null>(null);
  const [activeNoteContent, setActiveNoteContent] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);

  const fetchTodos = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (companySlug) params.set("company", companySlug);
      if (squadId) params.set("squad", squadId);
      params.set("status", statusFilter);

      const res = await fetch(`/api/vault/todos?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch todos");

      const data = await res.json();
      setTodos(data.todos ?? []);
      setStats(data.stats ?? { total: 0, pending: 0, completed: 0 });
    } catch (err) {
      console.error("Error loading vault todos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companySlug, squadId, statusFilter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleToggleTodo = async (item: VaultTodoItem) => {
    if (togglingIds.has(item.id)) return;

    const newCompleted = !item.completed;
    
    // Optimistic UI Update
    setTogglingIds((prev) => new Set(prev).add(item.id));
    setTodos((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, completed: newCompleted } : t))
    );
    setStats((prev) => ({
      ...prev,
      pending: newCompleted ? Math.max(0, prev.pending - 1) : prev.pending + 1,
      completed: newCompleted ? prev.completed + 1 : Math.max(0, prev.completed - 1),
    }));

    try {
      const res = await fetch("/api/vault/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relPath: item.relPath,
          line: item.line,
          completed: newCompleted,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle task state on disk");
      }
    } catch (err) {
      console.error("Error toggling todo:", err);
      // Rollback on error
      setTodos((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, completed: item.completed } : t))
      );
      fetchTodos();
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleOpenNote = async (relPath: string) => {
    try {
      setLoadingNote(true);
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error("Could not load note content");
      const data = await res.json();
      setActiveNotePath(relPath);
      setActiveNoteContent(data.content ?? "");
    } catch (err) {
      console.error("Error opening note:", err);
    } finally {
      setLoadingNote(false);
    }
  };

  // Filter local search
  const filteredTodos = todos.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.text.toLowerCase().includes(q) ||
      item.noteTitle.toLowerCase().includes(q) ||
      item.relPath.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl text-slate-100 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
              {title}
              {companyName && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {companyName}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Extracción automática de tareas en tiempo real desde notas del Vault
            </p>
          </div>
        </div>

        {/* Counter Pills & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/80 rounded-lg p-1 text-xs border border-slate-700/60">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "pending"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pendientes ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "completed"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Completadas ({stats.completed})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todas ({stats.total})
            </button>
          </div>

          <button
            onClick={fetchTodos}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Refrescar tareas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar tareas por palabra clave o título de nota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* Todo List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Escaneando checkboxes del Vault...</span>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl p-6">
          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No hay tareas que mostrar</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? "No se encontraron coincidencias para tu búsqueda."
              : statusFilter === "pending"
              ? "¡Excelente! No hay tareas pendientes en este contexto."
              : "No se encontraron tareas registradas."}
          </p>
        </div>
      ) : (
        <div className={`space-y-2 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin`}>
          <AnimatePresence initial={false}>
            {filteredTodos.map((item) => {
              const isToggling = togglingIds.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group border rounded-xl p-3 flex items-start justify-between gap-3 transition-all ${
                    item.completed
                      ? "bg-slate-950/40 border-slate-800/60 text-slate-400"
                      : "bg-slate-800/40 border-slate-700/60 text-slate-200 hover:border-slate-600"
                  }`}
                >
                  {/* Checkbox & Task Text */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleTodo(item)}
                      disabled={isToggling}
                      className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-amber-400" />
                      )}
                    </button>

                    <div className="flex flex-col gap-1 min-w-0">
                      <span
                        className={`text-xs leading-relaxed font-normal break-words ${
                          item.completed ? "line-through text-slate-500" : "text-slate-100"
                        }`}
                      >
                        {item.text}
                      </span>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <button
                          onClick={() => handleOpenNote(item.relPath)}
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                          title="Abrir nota en visor"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{item.noteTitle}</span>
                          <span className="text-[10px] text-slate-500 font-mono">:#{item.line}</span>
                        </button>

                        {item.companySlug && (
                          <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">
                            <Building2 className="w-2.5 h-2.5 text-amber-400" />
                            {item.companyName || item.companySlug}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(item.mtime).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleOpenNote(item.relPath)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Ver nota completa"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Rich Note Viewer Modal */}
      {activeNotePath && activeNoteContent !== null && (
        <RichNoteViewerModal
          path={activeNotePath}
          initialContent={activeNoteContent}
          onClose={() => {
            setActiveNotePath(null);
            setActiveNoteContent(null);
          }}
          onSaveSuccess={() => {
            fetchTodos();
          }}
        />
      )}
    </div>
  );
}
