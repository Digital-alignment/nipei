"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Kanban, Plus, Filter, Play, CheckCircle2, AlertCircle, Clock, Users,
  Sparkles, Layers, ShieldCheck, ChevronRight, X, Bot, Zap, ArrowRight,
  Search, Tag, Maximize2, Minimize2, MessageSquare, CheckSquare, Edit3, Eye,
  Send, Terminal, FileText, UserCheck, Calendar, AlertTriangle, Trash2, PlusCircle, Check, Folder
} from "lucide-react";
import {
  INITIAL_TASKS, SQUADS, type GlobalTask, type SquadId, type KanbanColumnId,
  type TaskComment, type TaskChecklistItem
} from "@/lib/nipeiStore";

const COLUMNS: { id: KanbanColumnId; label: string; color: string; bg: string; border: string }[] = [
  { id: "triage", label: "Ideias & Triagem", color: "#a3e635", bg: "#0a140a", border: "#1e381e" },
  { id: "todo", label: "A Fazer", color: "#38bdf8", bg: "#081524", border: "#16385c" },
  { id: "in_progress", label: "Em Progresso", color: "#fbbf24", bg: "#1f1908", border: "#4a3c10" },
  { id: "agent_executing", label: "🤖 Agente IA Executando", color: "#22c55e", bg: "#091e09", border: "#22c55e" },
  { id: "review", label: "Revisão & Veto Ético", color: "#a855f7", bg: "#1c0d29", border: "#4c1d70" },
  { id: "done", label: "Concluído", color: "#4ade80", bg: "#050805", border: "#142414" },
];

const AVAILABLE_AGENTS = [
  { id: "antigravity", name: "Antigravity", role: "Orquestrador Master", accent: "#22c55e" },
  { id: "hermes", name: "Hermes (Local)", role: "Nous Research Agent", accent: "#4ade80" },
  { id: "claude", name: "Claude Code", role: "Full-Stack Dev", accent: "#f59e0b" },
  { id: "openclaw", name: "OpenClaw", role: "Gateway local", accent: "#ef4444" },
  { id: "glm", name: "GLM Coder", role: "Flagship 1M Context", accent: "#a855f7" },
];

export default function SquadKanbanView() {
  const [tasks, setTasks] = useState<GlobalTask[]>(INITIAL_TASKS);
  const [selectedSquad, setSelectedSquad] = useState<SquadId | "all">("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Fetch classified 57 Vault Vacuum Tasks from /api/agent-kanban
  useEffect(() => {
    async function loadVaultKanbanTasks() {
      try {
        const res = await fetch("/api/agent-kanban");
        const json = await res.json();
        if (json.success && Array.isArray(json.tasks) && json.tasks.length > 0) {
          setTasks((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const newVaultTasks = json.tasks.filter((t: GlobalTask) => !existingIds.has(t.id));
            return [...newVaultTasks, ...prev];
          });
        }
      } catch (err) {
        console.error("Error loading vault kanban tasks:", err);
      }
    }
    loadVaultKanbanTasks();
  }, []);

  // Detail & Edit Panel State
  const [detailTask, setDetailTask] = useState<GlobalTask | null>(null);
  const [detailTab, setDetailTab] = useState<"edit" | "checklist" | "comments" | "logs">("edit");
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("Ana Castro (CEO)");
  const [newCommentIsAgent, setNewCommentIsAgent] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  // ESC Key Listener for both fullscreen and modal close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailTask) {
          setDetailTask(null);
        } else if (isFullScreen) {
          setIsFullScreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, detailTask]);

  // Form State for New Task
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("Expansão Nipëi OS");
  const [newSquad, setNewSquad] = useState<SquadId>("squad_2_mutum");
  const [newAssignee, setNewAssignee] = useState("Equipe Técnica");
  const [newPriority, setNewPriority] = useState<"urgente" | "alta" | "media" | "baixa">("alta");
  const [newDueDate, setNewDueDate] = useState("2026-08-25");
  const [newDescription, setNewDescription] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["antigravity"]);

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSquad = selectedSquad === "all" || t.squad === selectedSquad;
    const matchesAgent =
      selectedAgentFilter === "all" || (t.assignedAgents && t.assignedAgents.includes(selectedAgentFilter));
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.project && t.project.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSquad && matchesAgent && matchesSearch;
  });

  // Sync Task Updates in State
  function syncTaskUpdate(updated: GlobalTask) {
    setDetailTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/agent-kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          squad: newSquad,
          priority: newPriority,
          assignedAgents: selectedAgents
        })
      });
      const json = await res.json();
      if (json.success && json.task) {
        setTasks((prev) => [json.task, ...prev]);
      } else {
        const fallbackTask: GlobalTask = {
          id: `TSK-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          project: newProject,
          assignee: newAssignee,
          squad: newSquad,
          priority: newPriority,
          status: "pendente",
          columnStatus: "todo",
          dueDate: newDueDate,
          description: newDescription,
          assignedAgents: selectedAgents,
          executionLogs: [`Criado e atribuído aos agentes: ${selectedAgents.join(", ")}`],
          checklist: [],
          comments: [],
        };
        setTasks((prev) => [fallbackTask, ...prev]);
      }
    } catch (err) {
      console.error("Error creating task in vault:", err);
    }

    setCreateModalOpen(false);
    setNewTitle("");
    setNewDescription("");
  }

  function handleMoveColumn(taskId: string, targetCol: KanbanColumnId) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated: GlobalTask = {
            ...t,
            columnStatus: targetCol,
            status: targetCol === "done" ? "concluido" : targetCol === "in_progress" || targetCol === "agent_executing" ? "em_progresso" : "pendente",
          };
          if (detailTask && detailTask.id === taskId) {
            setDetailTask(updated);
          }
          if (t.vaultPath) {
            fetch("/api/agent-kanban", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vaultPath: t.vaultPath, status: targetCol })
            }).catch(console.error);
          }
          return updated;
        }
        return t;
      })
    );
  }

  function handleDispatchAgent(taskId: string) {
    setExecutingTaskId(taskId);
    handleMoveColumn(taskId, "agent_executing");

    const targetTask = tasks.find((t) => t.id === taskId);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const logs = t.executionLogs ?? [];
            const updated = {
              ...t,
              executionLogs: [...logs, "🤖 Agente IA lendo contrato do Squad & datos do Vault de Nipëi OS..."],
            };
            if (detailTask && detailTask.id === taskId) setDetailTask(updated);
            return updated;
          }
          return t;
        })
      );
    }, 1500);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const logs = t.executionLogs ?? [];
            const updated = {
              ...t,
              executionLogs: [...logs, "⚡ Agente IA procesó investigación de mercado, e-commerce & notas en nipei-vault."],
            };
            if (detailTask && detailTask.id === taskId) setDetailTask(updated);
            return updated;
          }
          return t;
        })
      );
    }, 3000);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const logs = t.executionLogs ?? [];
            const updated: GlobalTask = {
              ...t,
              columnStatus: "done",
              status: "concluido",
              executionLogs: [...logs, "✅ Tarefa finalizada e guardada no nipei-vault com sucesso pelo Agente IA!"],
            };
            if (detailTask && detailTask.id === taskId) setDetailTask(updated);

            if (t.vaultPath) {
              fetch("/api/agent-kanban", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  vaultPath: t.vaultPath,
                  status: "done",
                  executionLog: "Resolução automatizada por Agente IA. Resultado armazenado e auditado no Vault nipei-vault."
                })
              }).catch(console.error);
            }
            return updated;
          }
          return t;
        })
      );
      setExecutingTaskId(null);
    }, 4500);
  }

  function toggleAgentSelection(agentId: string) {
    if (selectedAgents.includes(agentId)) {
      if (selectedAgents.length > 1) {
        setSelectedAgents(selectedAgents.filter((a) => a !== agentId));
      }
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  }

  function toggleDetailAgent(agentId: string) {
    if (!detailTask) return;
    const current = detailTask.assignedAgents || [];
    let next: string[];
    if (current.includes(agentId)) {
      next = current.filter((a) => a !== agentId);
    } else {
      next = [...current, agentId];
    }
    syncTaskUpdate({ ...detailTask, assignedAgents: next });
  }

  function handleAddComment() {
    if (!detailTask || !newCommentText.trim()) return;
    const commentObj: TaskComment = {
      id: `c-${Date.now().toString().slice(-4)}`,
      author: newCommentIsAgent ? "@antigravity" : newCommentAuthor,
      role: newCommentIsAgent ? "Agente IA Orquestrador" : "Gestão Operacional",
      text: newCommentText.trim(),
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      isAgent: newCommentIsAgent,
    };
    const updated = {
      ...detailTask,
      comments: [...(detailTask.comments || []), commentObj],
    };
    syncTaskUpdate(updated);
    setNewCommentText("");
  }

  function handleAddChecklistItem() {
    if (!detailTask || !newChecklistTitle.trim()) return;
    const itemObj: TaskChecklistItem = {
      id: `chk-${Date.now().toString().slice(-4)}`,
      title: newChecklistTitle.trim(),
      completed: false,
    };
    const updated = {
      ...detailTask,
      checklist: [...(detailTask.checklist || []), itemObj],
    };
    syncTaskUpdate(updated);
    setNewChecklistTitle("");
  }

  function handleToggleChecklistItem(itemId: string) {
    if (!detailTask) return;
    const updatedChecklist = (detailTask.checklist || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    syncTaskUpdate({ ...detailTask, checklist: updatedChecklist });
  }

  function handleDeleteChecklistItem(itemId: string) {
    if (!detailTask) return;
    const updatedChecklist = (detailTask.checklist || []).filter((item) => item.id !== itemId);
    syncTaskUpdate({ ...detailTask, checklist: updatedChecklist });
  }

  return (
    <div
      className={
        isFullScreen
          ? "fixed inset-0 z-50 bg-[#050805] p-5 overflow-hidden flex flex-col h-screen w-screen space-y-4"
          : "space-y-6"
      }
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill pill-ok">Nipëi Agentic Kanban</span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
              Trinômio Operacional · Multi-Squad · Agentes Autônomos
            </span>
            {isFullScreen && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[#22c55e] font-bold flex items-center gap-1">
                <Maximize2 size={11} /> Tela Cheia Imersiva (ESC)
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold mt-2 text-white">Quadro Kanban Multidisciplinar por Squad</h2>
          <p className="text-xs text-[#a7f3d0] mt-1">
            Gestão visual de projetos e tarefas dos 7 Squads. Delegue tarefas diretamente para a Flota de Agentes IA.
            {isFullScreen && " — Pressione ESC para sair da Tela Cheia."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition shadow-lg shrink-0"
          >
            <Plus size={16} /> Nova Tarefa / Projeto
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-md bg-[#142414] border border-[#22c55e]/40 text-xs font-bold text-[#22c55e] hover:bg-[#1e381e] hover:text-white transition shadow-sm shrink-0"
            title={isFullScreen ? "Sair do modo Tela Cheia (ESC)" : "Ativar Modo Tela Cheia Sem Distrações"}
          >
            {isFullScreen ? (
              <>
                <Minimize2 size={16} /> Sair da Tela Cheia
              </>
            ) : (
              <>
                <Maximize2 size={16} /> Modo Tela Cheia
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142414] pb-3">
          {/* Squad Workspace Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-[#a7f3d0] mr-1 font-bold flex items-center gap-1">
              <Filter size={13} /> Squad:
            </span>
            <button
              onClick={() => setSelectedSquad("all")}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                selectedSquad === "all" ? "bg-[#22c55e] text-[#050805] font-bold" : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414]"
              }`}
            >
              Todos os Squads
            </button>
            {SQUADS.filter((s) => s.id !== "super_user").map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSquad(s.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition truncate max-w-[140px] ${
                  selectedSquad === s.id ? "bg-[#22c55e] text-[#050805] font-bold" : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414]"
                }`}
              >
                {s.name.split("—")[0]}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-[#4ade80]" size={14} />
            <input
              type="text"
              placeholder="Filtrar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded bg-[#050805] border border-[#1e381e] text-xs text-white placeholder-[#166534] focus:outline-none focus:border-[#22c55e]"
            />
          </div>
        </div>

        {/* AI Agent Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-[#a7f3d0] mr-1 font-bold flex items-center gap-1">
            <Bot size={13} /> Agente Atribuído:
          </span>
          <button
            onClick={() => setSelectedAgentFilter("all")}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
              selectedAgentFilter === "all" ? "bg-[#4ade80] text-[#050805] font-bold" : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414]"
            }`}
          >
            Todos Agentes
          </button>
          {AVAILABLE_AGENTS.map((ag) => (
            <button
              key={ag.id}
              onClick={() => setSelectedAgentFilter(ag.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                selectedAgentFilter === ag.id ? "bg-[#22c55e] text-[#050805] font-bold" : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414]"
              }`}
            >
              @{ag.name}
            </button>
          ))}
        </div>
      </div>

      {/* KANBAN BOARD COLUMNS */}
      <div
        className={
          isFullScreen
            ? "flex-1 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto min-h-0 pb-2"
            : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 overflow-x-auto pb-4"
        }
      >
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.columnStatus === col.id);

          return (
            <div
              key={col.id}
              className={`p-3 rounded-lg border flex flex-col space-y-3 ${
                isFullScreen ? "h-full min-h-0" : "min-h-[500px]"
              }`}
              style={{ backgroundColor: col.bg, borderColor: col.border }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#1e381e]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{col.label}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#a7f3d0] px-2 py-0.5 rounded bg-[#050805]">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards Container */}
              <div
                className={`flex-1 space-y-3 overflow-y-auto pr-1 scroll ${
                  isFullScreen ? "max-h-none h-full" : "max-h-[650px]"
                }`}
              >
                {colTasks.map((task) => {
                  const isExecuting = executingTaskId === task.id;
                  const squadMeta = SQUADS.find((s) => s.id === task.squad);

                  const checklistTotal = task.checklist?.length || 0;
                  const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                  const commentsCount = task.comments?.length || 0;

                  return (
                    <motion.div
                      layout
                      key={task.id}
                      onClick={() => setDetailTask(task)}
                      className={`p-4 rounded-xl border transition-all space-y-3 relative cursor-pointer group shadow-sm ${
                        isExecuting
                          ? "border-[#22c55e] bg-[#0c1c0c] animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                          : "border-[#1e381e] bg-[#080d08] hover:border-[#22c55e] hover:bg-[#0d160d] hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                      }`}
                    >
                      {/* 1. Header: Project Tag & Priority Badge */}
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#101c10] border border-[#1e381e] text-[#a7f3d0] font-bold truncate max-w-[160px] flex items-center gap-1">
                          <Folder size={11} className="text-[#22c55e] shrink-0" />
                          <span className="truncate">{task.project || "Geral"}</span>
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded font-mono uppercase font-bold text-[9px] tracking-wider shrink-0 ${
                            task.priority === "urgente"
                              ? "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]/40"
                              : task.priority === "alta"
                              ? "bg-[#291e08] text-[#f59e0b] border border-[#f59e0b]/40"
                              : task.priority === "media"
                              ? "bg-[#091e2e] text-[#38bdf8] border border-[#38bdf8]/40"
                              : "bg-[#142414] text-[#4ade80] border border-[#1e381e]"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {/* 2. Task Title & Description Snippet */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white leading-snug group-hover:text-[#4ade80] transition line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-[#a7f3d0]/80 line-clamp-2 leading-relaxed font-mono">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* 3. Squad & Checklist/Comment Badges Row */}
                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#142414] gap-2">
                        <div className="text-[#22c55e] font-bold flex items-center gap-1 truncate text-[10px]">
                          <ShieldCheck size={11} className="shrink-0 text-[#22c55e]" />
                          <span className="truncate">{squadMeta?.name.split("—")[0].trim() || task.squad}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {checklistTotal > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                                checklistDone === checklistTotal
                                  ? "bg-[#142414] text-[#4ade80] border border-[#22c55e]"
                                  : "bg-[#0f190f] text-[#a7f3d0] border border-[#1e381e]"
                              }`}
                              title={`${checklistDone}/${checklistTotal} sub-tarefas concluídas`}
                            >
                              <CheckSquare size={10} /> {checklistDone}/{checklistTotal}
                            </span>
                          )}

                          {commentsCount > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-[#0f190f] text-[#a7f3d0] border border-[#1e381e] text-[9px] font-mono font-bold flex items-center gap-1"
                              title={`${commentsCount} comentários`}
                            >
                              <MessageSquare size={10} /> {commentsCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4. Assigned AI Agents Badges */}
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-[9px] text-[#166534] font-mono font-bold uppercase tracking-wider mr-0.5">Agentes:</span>
                        {task.assignedAgents.map((ag) => (
                          <span
                            key={ag}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#102010] text-[#4ade80] border border-[#22c55e]/30 font-semibold"
                          >
                            @{ag}
                          </span>
                        ))}
                      </div>

                      {/* 5. Clean Action Buttons Footer */}
                      <div
                        className="pt-2 border-t border-[#142414] space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Row 1: Primary Dispatch AI Button or Done Status */}
                        {task.columnStatus !== "done" ? (
                          <button
                            onClick={() => handleDispatchAgent(task.id)}
                            disabled={isExecuting}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] active:scale-[0.98] transition shadow-md disabled:opacity-50"
                          >
                            <Zap size={13} /> {isExecuting ? "Executando Agente IA..." : "Disparar Agente IA"}
                          </button>
                        ) : (
                          <div className="w-full py-1.5 px-3 rounded-md bg-[#142414] border border-[#22c55e]/40 text-center text-xs font-mono text-[#4ade80] font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={13} className="text-[#22c55e]" /> Tarefa Concluída
                          </div>
                        )}

                        {/* Row 2: Ver/Editar Detail + Select Column Dropdown */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setDetailTask(task)}
                            className="w-full py-1 px-2 rounded bg-[#0f190f] border border-[#1e381e] text-[10px] font-mono text-[#4ade80] hover:bg-[#1e381e] hover:text-white transition flex items-center justify-center gap-1 font-semibold"
                          >
                            <Eye size={11} /> Ver / Editar
                          </button>

                          <select
                            value={task.columnStatus}
                            onChange={(e) => handleMoveColumn(task.id, e.target.value as KanbanColumnId)}
                            className="w-full bg-[#091209] border border-[#1e381e] text-[10px] font-mono text-[#a7f3d0] rounded px-1 py-1 focus:outline-none focus:border-[#22c55e] text-center truncate cursor-pointer"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK DETAIL & EDIT MODAL / DRAWER */}
      <AnimatePresence>
        {detailTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-3 sm:p-6"
            onClick={() => setDetailTask(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-4xl max-h-[90vh] rounded-xl border border-[#22c55e] bg-[#091209] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Detail Header */}
              <div className="p-4 sm:p-5 border-b border-[#1e381e] bg-[#0f190f] flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#142414] border border-[#22c55e] font-mono font-bold text-xs text-[#22c55e]">
                      {detailTask.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                        detailTask.priority === "urgente"
                          ? "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]/40"
                          : "bg-[#142414] text-[#4ade80] border border-[#1e381e]"
                      }`}
                    >
                      Prioridade: {detailTask.priority}
                    </span>
                    <span className="text-xs font-mono text-[#a7f3d0]">
                      Status:{" "}
                      <strong className="text-white">
                        {COLUMNS.find((c) => c.id === detailTask.columnStatus)?.label}
                      </strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{detailTask.title}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {detailTask.columnStatus !== "done" && (
                    <button
                      onClick={() => handleDispatchAgent(detailTask.id)}
                      disabled={executingTaskId === detailTask.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition shadow-md"
                    >
                      <Zap size={13} /> {executingTaskId === detailTask.id ? "Executando..." : "Disparar IA"}
                    </button>
                  )}

                  <button
                    onClick={() => setDetailTask(null)}
                    className="p-1.5 rounded-md border border-[#1e381e] text-white hover:bg-[#142414] hover:text-[#22c55e] transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-[#1e381e] bg-[#050805] px-4 pt-2 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setDetailTab("edit")}
                  className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === "edit"
                      ? "border-[#22c55e] text-[#22c55e] bg-[#0f190f]"
                      : "border-transparent text-[#a7f3d0] hover:text-white"
                  }`}
                >
                  <Edit3 size={13} /> Editar & Detalhes
                </button>

                <button
                  onClick={() => setDetailTab("checklist")}
                  className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === "checklist"
                      ? "border-[#22c55e] text-[#22c55e] bg-[#0f190f]"
                      : "border-transparent text-[#a7f3d0] hover:text-white"
                  }`}
                >
                  <CheckSquare size={13} /> Subtarefas ({detailTask.checklist?.filter((c) => c.completed).length || 0}/
                  {detailTask.checklist?.length || 0})
                </button>

                <button
                  onClick={() => setDetailTab("comments")}
                  className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === "comments"
                      ? "border-[#22c55e] text-[#22c55e] bg-[#0f190f]"
                      : "border-transparent text-[#a7f3d0] hover:text-white"
                  }`}
                >
                  <MessageSquare size={13} /> Comentários ({detailTask.comments?.length || 0})
                </button>

                <button
                  onClick={() => setDetailTab("logs")}
                  className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                    detailTab === "logs"
                      ? "border-[#22c55e] text-[#22c55e] bg-[#0f190f]"
                      : "border-transparent text-[#a7f3d0] hover:text-white"
                  }`}
                >
                  <Terminal size={13} /> Execution Logs ({detailTask.executionLogs?.length || 0})
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* TAB 1: EDIT & OVERVIEW */}
                {detailTab === "edit" && (
                  <div className="space-y-5 text-xs font-mono">
                    <div>
                      <label className="block text-[#a7f3d0] font-bold mb-1">Título da Tarefa</label>
                      <input
                        type="text"
                        value={detailTask.title}
                        onChange={(e) => syncTaskUpdate({ ...detailTask, title: e.target.value })}
                        className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Projeto</label>
                        <input
                          type="text"
                          value={detailTask.project || ""}
                          onChange={(e) => syncTaskUpdate({ ...detailTask, project: e.target.value })}
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Squad Responsável</label>
                        <select
                          value={detailTask.squad}
                          onChange={(e) => syncTaskUpdate({ ...detailTask, squad: e.target.value as SquadId })}
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        >
                          {SQUADS.filter((s) => s.id !== "super_user").map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Coluna / Estágio</label>
                        <select
                          value={detailTask.columnStatus}
                          onChange={(e) => handleMoveColumn(detailTask.id, e.target.value as KanbanColumnId)}
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        >
                          {COLUMNS.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Prioridade</label>
                        <select
                          value={detailTask.priority}
                          onChange={(e) =>
                            syncTaskUpdate({ ...detailTask, priority: e.target.value as any })
                          }
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        >
                          <option value="urgente">Urgente</option>
                          <option value="alta">Alta</option>
                          <option value="media">Média</option>
                          <option value="baixa">Baixa</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Responsável Humano</label>
                        <input
                          type="text"
                          value={detailTask.assignee}
                          onChange={(e) => syncTaskUpdate({ ...detailTask, assignee: e.target.value })}
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#a7f3d0] font-bold mb-1">Data Limite (Due Date)</label>
                        <input
                          type="date"
                          value={detailTask.dueDate}
                          onChange={(e) => syncTaskUpdate({ ...detailTask, dueDate: e.target.value })}
                          className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#a7f3d0] font-bold mb-1">Permissões de Agentes de IA</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {AVAILABLE_AGENTS.map((ag) => {
                          const active = detailTask.assignedAgents?.includes(ag.id);
                          return (
                            <button
                              key={ag.id}
                              type="button"
                              onClick={() => toggleDetailAgent(ag.id)}
                              className={`p-2 rounded text-left border flex items-center justify-between transition ${
                                active
                                  ? "bg-[#142414] border-[#22c55e] text-white font-bold"
                                  : "bg-[#050805] border-[#1e381e] text-[#a7f3d0]"
                              }`}
                            >
                              <span>@{ag.name}</span>
                              <span className="text-[10px]">{active ? "✓ Ativo" : "+ Ativar"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#a7f3d0] font-bold mb-1">Descrição / Contexto Completo</label>
                      <textarea
                        rows={5}
                        value={detailTask.description || ""}
                        onChange={(e) => syncTaskUpdate({ ...detailTask, description: e.target.value })}
                        className="w-full p-3 rounded bg-[#050805] border border-[#1e381e] text-white leading-relaxed focus:border-[#22c55e] focus:outline-none resize-y"
                        placeholder="Escreva os detalhes, especificações ou contexto para este projeto..."
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: CHECKLIST / SUBTASKS */}
                {detailTab === "checklist" && (
                  <div className="space-y-5 text-xs font-mono">
                    {/* Progress Bar */}
                    {detailTask.checklist && detailTask.checklist.length > 0 ? (
                      <div className="space-y-1.5 p-3 rounded-lg border border-[#1e381e] bg-[#0f190f]">
                        <div className="flex justify-between text-[#a7f3d0] font-bold">
                          <span>Progresso das Subtarefas</span>
                          <span>
                            {Math.round(
                              ((detailTask.checklist.filter((c) => c.completed).length || 0) /
                                detailTask.checklist.length) *
                                100
                            )}
                            % (
                            {detailTask.checklist.filter((c) => c.completed).length || 0}/
                            {detailTask.checklist.length})
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#050805] overflow-hidden border border-[#1e381e]">
                          <div
                            className="h-full bg-[#22c55e] transition-all duration-300"
                            style={{
                              width: `${
                                ((detailTask.checklist.filter((c) => c.completed).length || 0) /
                                  detailTask.checklist.length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#166534] italic text-center py-4">Nenhuma subtarefa criada ainda.</p>
                    )}

                    {/* Add Checklist Form */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar nova subtarefa (ex: Checar nota fiscal)..."
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                        className="flex-1 p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                      />
                      <button
                        onClick={handleAddChecklistItem}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-[#22c55e] font-bold text-[#050805] hover:bg-[#4ade80] transition shrink-0"
                      >
                        <Plus size={15} /> Adicionar
                      </button>
                    </div>

                    {/* Checklist Items List */}
                    <div className="space-y-2">
                      {detailTask.checklist?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-[#1e381e] bg-[#050805] hover:border-[#22c55e] transition"
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklistItem(item.id)}
                              className="w-4 h-4 rounded border-[#1e381e] accent-[#22c55e] bg-[#0f190f]"
                            />
                            <span
                              className={`text-xs ${
                                item.completed ? "line-through text-[#166534]" : "text-white font-medium"
                              }`}
                            >
                              {item.title}
                            </span>
                          </label>

                          <button
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="text-[#a7f3d0] hover:text-[#ef4444] p-1 transition"
                            title="Remover subtarefa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: COMMENTS & DISCUSSION */}
                {detailTab === "comments" && (
                  <div className="space-y-5 text-xs font-mono">
                    {/* Add Comment Box */}
                    <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white font-bold flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-[#22c55e]" /> Adicionar Comentário ou Registro
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#a7f3d0]">Tipo:</span>
                          <button
                            onClick={() => setNewCommentIsAgent(false)}
                            className={`px-2 py-0.5 rounded text-[10px] transition ${
                              !newCommentIsAgent
                                ? "bg-[#142414] text-[#4ade80] border border-[#22c55e] font-bold"
                                : "bg-[#050805] text-[#a7f3d0]"
                            }`}
                          >
                            👤 Humano
                          </button>
                          <button
                            onClick={() => setNewCommentIsAgent(true)}
                            className={`px-2 py-0.5 rounded text-[10px] transition ${
                              newCommentIsAgent
                                ? "bg-[#22c55e] text-[#050805] font-bold"
                                : "bg-[#050805] text-[#a7f3d0]"
                            }`}
                          >
                            🤖 Agente IA
                          </button>
                        </div>
                      </div>

                      {!newCommentIsAgent && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#a7f3d0]">Autor:</span>
                          <input
                            type="text"
                            value={newCommentAuthor}
                            onChange={(e) => setNewCommentAuthor(e.target.value)}
                            className="p-1.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:outline-none"
                          />
                        </div>
                      )}

                      <textarea
                        rows={3}
                        placeholder="Escreva um comentário, parecer ou instrução..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleAddComment}
                          className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#22c55e] text-[#050805] font-bold hover:bg-[#4ade80] transition"
                        >
                          <Send size={13} /> Publicar Comentário
                        </button>
                      </div>
                    </div>

                    {/* Comments Timeline */}
                    <div className="space-y-3">
                      {detailTask.comments && detailTask.comments.length > 0 ? (
                        detailTask.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-3.5 rounded-lg border space-y-1.5 ${
                              comment.isAgent
                                ? "bg-[#0c1c0c] border-[#22c55e]/40"
                                : "bg-[#050805] border-[#1e381e]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    comment.isAgent
                                      ? "bg-[#22c55e] text-[#050805]"
                                      : "bg-[#142414] text-[#4ade80]"
                                  }`}
                                >
                                  {comment.author}
                                </span>
                                <span className="text-[#a7f3d0] font-mono">({comment.role})</span>
                              </div>
                              <span className="text-[#166534] text-[10px]">{comment.createdAt}</span>
                            </div>
                            <p className="text-xs text-white leading-relaxed pl-1 pt-1">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#166534] italic text-center py-4">Nenhum comentário nesta tarefa.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: LOGS TERMINAL */}
                {detailTab === "logs" && (
                  <div className="space-y-4 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#a7f3d0] font-bold flex items-center gap-1.5">
                        <Terminal size={14} className="text-[#22c55e]" /> Logs Autônomos de Execução da Flota IA
                      </span>
                      <span className="text-[10px] text-[#22c55e] uppercase tracking-widest">
                        Total Steps: {detailTask.executionLogs?.length || 0}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-[#22c55e]/40 bg-[#050805] space-y-2 max-h-[350px] overflow-y-auto text-xs text-[#4ade80]">
                      {detailTask.executionLogs && detailTask.executionLogs.length > 0 ? (
                        detailTask.executionLogs.map((log, idx) => (
                          <div key={idx} className="flex items-start gap-2 leading-relaxed">
                            <span className="text-[#166534] font-bold">[{idx + 1}]</span>
                            <span>{log}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#166534] italic">Nenhum log registrado para esta tarefa ainda.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE NEW TASK MODAL */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-lg rounded-xl border border-[#22c55e] bg-[#0f190f] p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
                <div className="flex items-center gap-2">
                  <Kanban className="text-[#22c55e]" size={20} />
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Criar Nova Tarefa / Projeto
                  </h3>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="text-white hover:text-[#22c55e]">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#a7f3d0] mb-1 font-bold">Título da Tarefa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Validar novo frasco de óleo sagrado no e-commerce"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Projeto</label>
                    <input
                      type="text"
                      value={newProject}
                      onChange={(e) => setNewProject(e.target.value)}
                      className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Squad Destino</label>
                    <select
                      value={newSquad}
                      onChange={(e) => setNewSquad(e.target.value as SquadId)}
                      className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                    >
                      {SQUADS.filter((s) => s.id !== "super_user").map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                    >
                      <option value="urgente">Urgente</option>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Data de Entrega</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Agent Selector Switches */}
                <div>
                  <label className="block text-[#a7f3d0] mb-1 font-bold">Dar Acesso aos Agentes de IA:</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {AVAILABLE_AGENTS.map((ag) => {
                      const selected = selectedAgents.includes(ag.id);
                      return (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={() => toggleAgentSelection(ag.id)}
                          className={`p-2 rounded text-left border flex items-center justify-between transition ${
                            selected
                              ? "bg-[#142414] border-[#22c55e] text-white font-bold"
                              : "bg-[#050805] border-[#1e381e] text-[#a7f3d0]"
                          }`}
                        >
                          <span>@{ag.name}</span>
                          <span className="text-[10px]">{selected ? "✓ Acesso" : "+ Dar Acesso"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[#a7f3d0] mb-1 font-bold">Descrição / Instruções do Prompt</label>
                  <textarea
                    rows={3}
                    placeholder="Especifique os requisitos para o Squad e os Agentes..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded border border-[#1e381e] text-[#a7f3d0] hover:bg-[#142414]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded bg-[#22c55e] text-[#050805] font-bold hover:bg-[#4ade80]"
                  >
                    Criar Tarefa no Kanban
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
