"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Kanban, Plus, Filter, Play, CheckCircle2, AlertCircle, Clock, Users,
  Sparkles, Layers, ShieldCheck, ChevronRight, ChevronLeft, X, Bot, Zap, ArrowRight,
  Search, Tag, Maximize2, Minimize2, MessageSquare, CheckSquare, Edit3, Eye,
  Send, Terminal, FileText, UserCheck, Calendar, AlertTriangle, Trash2, PlusCircle, Check, Folder,
  Building2, User, RotateCcw, Archive, ArchiveRestore, CheckCheck, ListFilter,
  LayoutGrid, Columns3, Rows3, GripVertical, Copy, ExternalLink, ArrowUpRight, Activity, ChevronDown
} from "lucide-react";
import ExecutiveControlsMenu from "./ExecutiveControlsMenu";
import KanbanListView from "./KanbanListView";
import KanbanCalendarView from "./KanbanCalendarView";
import { useCompany } from "@/context/CompanyContext";
import {
  INITIAL_TASKS, INITIAL_SQUADS, INITIAL_MEMBERS, SQUADS, type GlobalTask, type SquadId, type KanbanColumnId,
  type TaskComment, type TaskChecklistItem, type SquadMeta, type MemberProfile
} from "@/lib/nipeiStore";

export interface ColumnDef {
  id: KanbanColumnId;
  label: string;
  badge: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: any;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "triage",
    label: "Triagem & Ideias",
    badge: "Entrada",
    description: "Novas ideias, notas do Vault e demandas brutas",
    color: "#a3e635",
    bg: "rgba(10, 20, 10, 0.7)",
    border: "#1e381e",
    icon: Sparkles,
  },
  {
    id: "todo",
    label: "A Fazer",
    badge: "Backlog",
    description: "Tarefas priorizadas prontas para início",
    color: "#38bdf8",
    bg: "rgba(8, 21, 36, 0.7)",
    border: "#16385c",
    icon: Clock,
  },
  {
    id: "in_progress",
    label: "Em Andamento",
    badge: "Equipe",
    description: "Execução ativa por integrantes da equipe",
    color: "#fbbf24",
    bg: "rgba(31, 25, 8, 0.7)",
    border: "#4a3c10",
    icon: Zap,
  },
  {
    id: "agent_executing",
    label: "Execução por IA",
    badge: "Autônomo",
    description: "Agentes autônomos processando tarefas (Hermes, Claude, etc.)",
    color: "#22c55e",
    bg: "rgba(9, 30, 9, 0.7)",
    border: "#166534",
    icon: Bot,
  },
  {
    id: "review",
    label: "Revisão & Veto Ético",
    badge: "Validação",
    description: "Auditoria de qualidade e validação de conformidade ética",
    color: "#c084fc",
    bg: "rgba(28, 13, 41, 0.7)",
    border: "#4c1d70",
    icon: ShieldCheck,
  },
  {
    id: "done",
    label: "Concluído",
    badge: "Sucesso",
    description: "Tarefas finalizadas com sucesso no ciclo atual",
    color: "#4ade80",
    bg: "rgba(5, 18, 5, 0.7)",
    border: "#142414",
    icon: CheckCircle2,
  },
  {
    id: "archived",
    label: "Arquivado",
    badge: "Histórico",
    description: "Arquivo permanente para manter o fluxo diário limpo e ágil",
    color: "#71717a",
    bg: "rgba(18, 18, 20, 0.7)",
    border: "#27272a",
    icon: Archive,
  },
];

const AVAILABLE_AGENTS = [
  { id: "antigravity", name: "Antigravity", role: "Orquestrador Master", accent: "#22c55e" },
  { id: "hermes", name: "Hermes (Local)", role: "Nous Research Agent", accent: "#4ade80" },
  { id: "claude", name: "Claude Code", role: "Full-Stack Dev", accent: "#f59e0b" },
  { id: "openclaw", name: "OpenClaw", role: "Gateway local", accent: "#ef4444" },
  { id: "glm", name: "GLM Coder", role: "Flagship 1M Context", accent: "#a855f7" },
];

export default function SquadKanbanView() {
  const { companies } = useCompany();
  const [tasks, setTasks] = useState<GlobalTask[]>(INITIAL_TASKS);
  const [squads, setSquads] = useState<SquadMeta[]>(INITIAL_SQUADS);
  const [members, setMembers] = useState<MemberProfile[]>(INITIAL_MEMBERS);

  // Filters State
  const [selectedSquad, setSelectedSquad] = useState<string>("all");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Column View Options
  const [showArchivedColumn, setShowArchivedColumn] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<KanbanColumnId>("todo");

  // Visual Density State (Compact vs. Expanded)
  const [cardDensity, setCardDensity] = useState<"compact" | "expanded">("compact");

  // View Mode State (Board vs. List vs. Calendar)
  const [viewMode, setViewMode] = useState<"board" | "list" | "calendar">("board");

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<KanbanColumnId | null>(null);

  // Horizontal Scroll Track and Column References
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mouse pan / drag-to-scroll state
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Initialize Card Density and View Mode from LocalStorage
  useEffect(() => {
    try {
      const savedDensity = localStorage.getItem("nipei_kanban_card_density");
      if (savedDensity === "compact" || savedDensity === "expanded") {
        setCardDensity(savedDensity);
      }
      const savedViewMode = localStorage.getItem("nipei_kanban_view_mode");
      if (savedViewMode === "board" || savedViewMode === "list" || savedViewMode === "calendar") {
        setViewMode(savedViewMode);
      }
    } catch {}
  }, []);

  const handleSetViewMode = (mode: "board" | "list" | "calendar") => {
    setViewMode(mode);
    try {
      localStorage.setItem("nipei_kanban_view_mode", mode);
    } catch {}
  };

  const handleToggleDensity = () => {
    const next = cardDensity === "compact" ? "expanded" : "compact";
    setCardDensity(next);
    try {
      localStorage.setItem("nipei_kanban_card_density", next);
    } catch {}
  };

  // Computed columns and task counts
  const visibleColumns = useMemo(() => {
    return showArchivedColumn ? COLUMNS : COLUMNS.filter((c) => c.id !== "archived");
  }, [showArchivedColumn]);

  const archivedTasksCount = useMemo(
    () => tasks.filter((t) => (t.columnStatus || (t as any).column) === "archived").length,
    [tasks]
  );

  const doneTasksCount = useMemo(
    () => tasks.filter((t) => (t.columnStatus || (t as any).column) === "done").length,
    [tasks]
  );

  // Load dynamic squads and members from localStorage and keep synced
  useEffect(() => {
    function loadSquadsAndMembers() {
      try {
        const savedSquads = localStorage.getItem("nipei_squads_store");
        if (savedSquads) {
          const parsed = JSON.parse(savedSquads);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSquads(parsed);
          }
        }
      } catch (e) {
        console.error("Error loading saved squads in Kanban:", e);
      }

      try {
        const savedMembers = localStorage.getItem("nipei_members_store");
        if (savedMembers) {
          const parsed = JSON.parse(savedMembers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMembers(parsed);
          }
        }
      } catch (e) {
        console.error("Error loading saved members in Kanban:", e);
      }
    }

    loadSquadsAndMembers();

    const handleSquadsUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setSquads(e.detail);
      } else {
        loadSquadsAndMembers();
      }
    };

    const handleMembersUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setMembers(e.detail);
      } else {
        loadSquadsAndMembers();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "nipei_squads_store" || e.key === "nipei_members_store") {
        loadSquadsAndMembers();
      }
    };

    const handleWindowFocus = () => {
      loadSquadsAndMembers();
    };

    window.addEventListener("nipei_squads_updated", handleSquadsUpdated);
    window.addEventListener("nipei_members_updated", handleMembersUpdated);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("nipei_squads_updated", handleSquadsUpdated);
      window.removeEventListener("nipei_members_updated", handleMembersUpdated);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Fetch classified 57 Vault Vacuum Tasks from /api/agent-kanban
  useEffect(() => {
    async function loadVaultKanbanTasks() {
      try {
        const res = await fetch("/api/agent-kanban");
        const json = await res.json();
        if (json.success && Array.isArray(json.tasks) && json.tasks.length > 0) {
          setTasks(json.tasks);
        }
      } catch (err) {
        console.error("Error loading vault kanban tasks:", err);
      }
    }
    loadVaultKanbanTasks();
  }, []);

  // Distinct list of member / assignee names
  const allAssignees = useMemo(() => {
    const namesSet = new Set<string>();
    members.forEach((m) => {
      if (m.name?.trim()) namesSet.add(m.name.trim());
    });
    tasks.forEach((t) => {
      if (t.assignee?.trim()) namesSet.add(t.assignee.trim());
    });
    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [members, tasks]);

  // Detail & Edit Panel State
  const [detailTask, setDetailTask] = useState<GlobalTask | null>(null);
  const [detailTab, setDetailTab] = useState<"edit" | "checklist" | "comments" | "logs">("edit");
  const [descViewMode, setDescViewMode] = useState<"preview" | "edit">("preview");
  const [copiedId, setCopiedId] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentAuthor, setNewCommentAuthor] = useState("Ana Castro (CEO)");
  const [newCommentIsAgent, setNewCommentIsAgent] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  const handleCopyId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (typeof window !== "undefined" && window.confirm("Tem certeza que deseja remover esta tarefa do quadro?")) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDetailTask(null);
    }
  };

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

  // Multi-dimensional Filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Squad match
      const matchesSquad =
        selectedSquad === "all" ||
        t.squad === selectedSquad ||
        (t.squad && t.squad.toLowerCase() === selectedSquad.toLowerCase());

      // 2. Company match
      let matchesCompany = true;
      if (selectedCompanyFilter !== "all") {
        const comp = companies.find((c) => c.id === selectedCompanyFilter);
        const compName = (comp?.name || selectedCompanyFilter).toLowerCase();
        const compId = selectedCompanyFilter.toLowerCase();

        const taskCompId = ((t as any).companyId || "").toLowerCase();
        const taskProject = (t.project || "").toLowerCase();
        const taskTitle = (t.title || "").toLowerCase();
        const taskDesc = (t.description || "").toLowerCase();
        const taskVault = (t.vaultPath || "").toLowerCase();

        matchesCompany =
          taskCompId === compId ||
          taskProject.includes(compName) ||
          taskProject.includes(compId) ||
          taskTitle.includes(compName) ||
          taskDesc.includes(compName) ||
          taskVault.includes(compName) ||
          taskVault.includes(compId);
      }

      // 3. Member / Assignee match
      let matchesMember = true;
      if (selectedMemberFilter !== "all") {
        const memTarget = selectedMemberFilter.toLowerCase();
        const taskAssignee = (t.assignee || "").toLowerCase();
        matchesMember =
          taskAssignee === memTarget ||
          taskAssignee.includes(memTarget) ||
          memTarget.includes(taskAssignee);
      }

      // 4. Agent match
      const matchesAgent =
        selectedAgentFilter === "all" ||
        (t.assignedAgents && t.assignedAgents.includes(selectedAgentFilter));

      // 5. Search match
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.project && t.project.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q);

      return matchesSquad && matchesCompany && matchesMember && matchesAgent && matchesSearch;
    });
  }, [tasks, selectedSquad, selectedCompanyFilter, selectedMemberFilter, selectedAgentFilter, searchTerm, companies]);

  const isAnyFilterActive =
    selectedSquad !== "all" ||
    selectedCompanyFilter !== "all" ||
    selectedMemberFilter !== "all" ||
    selectedAgentFilter !== "all" ||
    searchTerm.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedSquad("all");
    setSelectedCompanyFilter("all");
    setSelectedMemberFilter("all");
    setSelectedAgentFilter("all");
    setSearchTerm("");
  };

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
          assignedAgents: selectedAgents,
          column: newTaskColumn,
          project: newProject,
        })
      });
      const json = await res.json();
      if (json.success && json.task) {
        setTasks((prev) => [{ ...json.task, columnStatus: newTaskColumn }, ...prev]);
      } else {
        const fallbackTask: GlobalTask = {
          id: `TSK-${Date.now().toString().slice(-4)}`,
          title: newTitle,
          project: newProject,
          assignee: newAssignee,
          squad: newSquad,
          priority: newPriority,
          status: newTaskColumn === "done" || newTaskColumn === "archived" ? "concluido" : newTaskColumn === "in_progress" || newTaskColumn === "agent_executing" ? "em_progresso" : "pendente",
          columnStatus: newTaskColumn,
          dueDate: newDueDate,
          description: newDescription,
          assignedAgents: selectedAgents,
          executionLogs: [`Criado na coluna ${newTaskColumn} e atribuído aos agentes: ${selectedAgents.join(", ")}`],
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
            status: targetCol === "done" || targetCol === "archived" ? "concluido" : targetCol === "in_progress" || targetCol === "agent_executing" ? "em_progresso" : "pendente",
          };
          if (detailTask && detailTask.id === taskId) {
            setDetailTask(updated);
          }
          if (t.vaultPath) {
            fetch("/api/agent-kanban", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vaultPath: t.vaultPath, status: targetCol, column: targetCol })
            }).catch(console.error);
          }
          return updated;
        }
        return t;
      })
    );
  }

  function handleArchiveAllDone() {
    setTasks((prev) =>
      prev.map((t) => {
        if ((t.columnStatus || (t as any).column) === "done") {
          const updated: GlobalTask = {
            ...t,
            columnStatus: "archived",
            status: "concluido",
          };
          if (t.vaultPath) {
            fetch("/api/agent-kanban", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vaultPath: t.vaultPath, status: "archived", column: "archived" })
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

  // Quick interactive toggle for checklist directly from card (expanded mode)
  function handleQuickToggleChecklist(taskId: string, itemId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedChecklist = (t.checklist || []).map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          const updated = { ...t, checklist: updatedChecklist };
          if (detailTask && detailTask.id === taskId) {
            setDetailTask(updated);
          }
          return updated;
        }
        return t;
      })
    );
  }

  // Due Date calculation with alert levels (Overdue, Due Today, Due Soon)
  function getDueDateAlert(dueDateStr?: string, columnStatus?: string) {
    if (!dueDateStr) return null;
    if (columnStatus === "done" || columnStatus === "archived") {
      return {
        label: dueDateStr,
        badgeText: "Concluída",
        variant: "done" as const,
        isOverdue: false,
        isDueToday: false,
      };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = dueDateStr.split("-");
      if (parts.length < 3) return { label: dueDateStr, badgeText: dueDateStr, variant: "normal" as const };
      const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      due.setHours(0, 0, 0, 0);

      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const overdueDays = Math.abs(diffDays);
        return {
          label: dueDateStr,
          badgeText: overdueDays === 1 ? "Atrasada (1d)" : `Atrasada (${overdueDays}d)`,
          variant: "overdue" as const,
          isOverdue: true,
          isDueToday: false,
        };
      } else if (diffDays === 0) {
        return {
          label: dueDateStr,
          badgeText: "Vence hoje!",
          variant: "due_today" as const,
          isOverdue: false,
          isDueToday: true,
        };
      } else if (diffDays <= 2) {
        return {
          label: dueDateStr,
          badgeText: diffDays === 1 ? "Vence amanhã" : `Vence em ${diffDays}d`,
          variant: "due_soon" as const,
          isOverdue: false,
          isDueToday: false,
        };
      } else {
        return {
          label: dueDateStr,
          badgeText: `${diffDays}d restantes`,
          variant: "normal" as const,
          isOverdue: false,
          isDueToday: false,
        };
      }
    } catch {
      return { label: dueDateStr, badgeText: dueDateStr, variant: "normal" as const };
    }
  }

  // Smooth Horizontal Scroll Navigation
  function handleScrollTrack(direction: "left" | "right") {
    if (!scrollTrackRef.current) return;
    const offset = direction === "left" ? -340 : 340;
    scrollTrackRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }

  function handleJumpToColumn(colId: string) {
    const colNode = columnRefs.current[colId];
    if (colNode) {
      colNode.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  // Wheel-to-Horizontal translation when cursor is over empty track space or edges
  function handleTrackWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!scrollTrackRef.current) return;
    const target = e.target as HTMLElement;
    const cardList = target.closest(".kanban-card-list") as HTMLElement | null;

    if (cardList) {
      const isAtTop = cardList.scrollTop <= 0 && e.deltaY < 0;
      const isAtBottom = cardList.scrollTop + cardList.clientHeight >= cardList.scrollHeight - 2 && e.deltaY > 0;
      if (!isAtTop && !isAtBottom) {
        // Allow vertical scrolling inside the card list
        return;
      }
    }

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollTrackRef.current.scrollLeft += e.deltaY * 0.9;
    }
  }

  // Mouse Grab to Scroll on empty track background
  function handleMouseDownTrack(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (
      target.closest(".kanban-column-card") ||
      target.closest("button") ||
      target.closest("select") ||
      target.closest("input") ||
      target.closest(".kanban-card-list")
    ) {
      return;
    }
    if (!scrollTrackRef.current) return;
    setIsDraggingTrack(true);
    setStartX(e.pageX - scrollTrackRef.current.offsetLeft);
    setScrollLeftPos(scrollTrackRef.current.scrollLeft);
  }

  function handleMouseMoveTrack(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDraggingTrack || !scrollTrackRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollTrackRef.current.offsetLeft;
    const walk = (x - startX) * 1.4;
    scrollTrackRef.current.scrollLeft = scrollLeftPos - walk;
  }

  function handleMouseUpTrack() {
    setIsDraggingTrack(false);
  }

  // HTML5 Drag & Drop handlers
  function handleDragStartCard(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  }

  function handleDragEndCard() {
    setDraggedTaskId(null);
    setDragOverColId(null);
  }

  function handleColumnDragOver(e: React.DragEvent, colId: KanbanColumnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  }

  function handleColumnDragLeave(e: React.DragEvent, colId: KanbanColumnId) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  }

  function handleColumnDrop(e: React.DragEvent, targetCol: KanbanColumnId) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      handleMoveColumn(taskId, targetCol);
    }
    setDraggedTaskId(null);
    setDragOverColId(null);
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
      <div className="flex items-center justify-between gap-4 p-4 md:p-5 rounded-xl border border-[#1e381e] bg-[#0a120b] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
          Kanban
        </h1>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          {/* View Mode Switcher (Quadro / Lista / Calendário) */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#050805] border border-[#1e381e]">
            <button
              onClick={() => handleSetViewMode("board")}
              title="Visualização em Quadro Kanban"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono font-bold transition ${
                viewMode === "board"
                  ? "bg-[#22c55e] text-[#050805] shadow-sm"
                  : "text-[#a7f3d0] hover:text-white hover:bg-[#142414]"
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Quadro</span>
            </button>

            <button
              onClick={() => handleSetViewMode("list")}
              title="Visualização em Lista / Tabela Densa"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono font-bold transition ${
                viewMode === "list"
                  ? "bg-[#22c55e] text-[#050805] shadow-sm"
                  : "text-[#a7f3d0] hover:text-white hover:bg-[#142414]"
              }`}
            >
              <ListFilter size={14} />
              <span className="hidden sm:inline">Lista</span>
            </button>

            <button
              onClick={() => handleSetViewMode("calendar")}
              title="Visualização em Calendário Mensal por Prazo"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-mono font-bold transition ${
                viewMode === "calendar"
                  ? "bg-[#22c55e] text-[#050805] shadow-sm"
                  : "text-[#a7f3d0] hover:text-white hover:bg-[#142414]"
              }`}
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">Calendário</span>
            </button>
          </div>

          {/* Visual Density Toggle (Only for Board mode) */}
          {viewMode === "board" && (
            <button
              onClick={handleToggleDensity}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#142414] border border-[#1e381e] text-xs font-mono font-bold text-[#a7f3d0] hover:text-white hover:bg-[#1e381e] transition shadow-sm shrink-0"
              title={
                cardDensity === "compact"
                  ? "Modo atual: Compacto. Clique para alternar para modo Expandido (com subtarefas interativas no cartão)."
                  : "Modo atual: Expandido. Clique para alternar para modo Compacto."
              }
            >
              {cardDensity === "compact" ? (
                <>
                  <Rows3 size={15} className="text-[#22c55e]" />
                  <span className="hidden sm:inline">Densidade:</span>
                  <span>Compacto</span>
                </>
              ) : (
                <>
                  <Columns3 size={15} className="text-[#22c55e]" />
                  <span className="hidden sm:inline">Densidade:</span>
                  <span>Expandido</span>
                </>
              )}
            </button>
          )}

          {/* Archive Toggle Button */}
          <button
            onClick={() => setShowArchivedColumn(!showArchivedColumn)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-mono font-bold transition shadow-sm border shrink-0 ${
              showArchivedColumn
                ? "bg-[#27272a] text-white border-zinc-500 shadow-sm"
                : "bg-[#142414] border-[#1e381e] text-[#a7f3d0] hover:text-white hover:bg-[#1e381e]"
            }`}
            title="Alternar exibição da coluna de tarefas arquivadas"
          >
            <Archive size={15} className={showArchivedColumn ? "text-emerald-400" : "text-[#22c55e]"} />
            <span>{showArchivedColumn ? "Ocultar Arquivo" : `Ver Arquivo (${archivedTasksCount})`}</span>
          </button>

          <button
            onClick={() => {
              setNewTaskColumn("todo");
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition shadow-lg shrink-0"
          >
            <Plus size={16} /> Nova Tarefa / Projeto
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#142414] border border-[#22c55e]/40 text-xs font-bold text-[#22c55e] hover:bg-[#1e381e] hover:text-white transition shadow-sm shrink-0"
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

          <ExecutiveControlsMenu />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 rounded-xl border border-[#1e381e] bg-[#0c160c]/90 backdrop-blur-md space-y-2.5 shrink-0 shadow-lg shadow-black/40">
        {/* Row 1: Search & Multi-dimensional Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 text-[#4ade80]" size={13} />
            <input
              type="text"
              placeholder="Buscar por título, ID ou projeto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#050805] border border-[#1e381e] text-xs text-white placeholder-[#166534] focus:outline-none focus:border-[#22c55e] transition"
            />
          </div>

          {/* Middle: Dimension Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Empresa Filter */}
            <div className="flex items-center gap-1.5 bg-[#050805] border border-[#1e381e] rounded-lg px-2.5 py-1 text-xs">
              <Building2 size={13} className="text-[#a7f3d0] shrink-0" />
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#0c160c] text-white">Todas as Empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0c160c] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Integrante Filter */}
            <div className="flex items-center gap-1.5 bg-[#050805] border border-[#1e381e] rounded-lg px-2.5 py-1 text-xs">
              <User size={13} className="text-[#a7f3d0] shrink-0" />
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer pr-1 max-w-[140px] truncate"
              >
                <option value="all" className="bg-[#0c160c] text-white">Todos os Integrantes</option>
                {allAssignees.map((name) => (
                  <option key={name} value={name} className="bg-[#0c160c] text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Agente IA Filter */}
            <div className="flex items-center gap-1.5 bg-[#050805] border border-[#1e381e] rounded-lg px-2.5 py-1 text-xs">
              <Bot size={13} className="text-[#22c55e] shrink-0" />
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-[#0c160c] text-white">Todos os Agentes</option>
                {AVAILABLE_AGENTS.map((ag) => (
                  <option key={ag.id} value={ag.id} className="bg-[#0c160c] text-white">
                    @{ag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Counter & Reset */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-mono text-[#a7f3d0] bg-[#142414] px-2.5 py-1 rounded-md border border-[#1e381e]">
              <span className="text-[#22c55e] font-bold">{filteredTasks.length}</span> / {tasks.length}
            </span>

            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                title="Limpar todos os filtros"
                className="text-xs text-emerald-400/80 hover:text-emerald-200 bg-[#050805] hover:bg-[#142414] border border-[#1e381e] px-2 py-1 rounded-md transition flex items-center gap-1"
              >
                <RotateCcw size={11} /> Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Dynamic Squads Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 border-t border-[#142414] scrollbar-thin">
          <span className="text-[11px] font-mono text-[#a7f3d0] font-bold flex items-center gap-1 shrink-0 mr-1">
            <Layers size={12} className="text-[#22c55e]" /> Squad:
          </span>

          <button
            onClick={() => setSelectedSquad("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition shrink-0 ${
              selectedSquad === "all"
                ? "bg-[#22c55e] text-[#050805] font-bold shadow-sm shadow-[#22c55e]/20"
                : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414] border border-[#1e381e]"
            }`}
          >
            Todos os Squads
          </button>

          {squads
            .filter((s) => s.id !== "super_user")
            .map((s) => {
              const isActive = selectedSquad === s.id;
              const displayName = s.name.split("—")[0].trim();
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSquad(s.id)}
                  title={s.name}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#22c55e] text-[#050805] font-bold shadow-sm shadow-[#22c55e]/20"
                      : "bg-[#050805] text-[#a7f3d0] hover:bg-[#142414] border border-[#1e381e]"
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? "#050805" : (s.colorHex || "#22c55e") }}
                  />
                  <span>{displayName}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* QUICK COLUMN NAVIGATION & SCROLL CONTROLS STRIP (Only visible in Board mode) */}
      {viewMode === "board" && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[#1e381e] bg-[#070d07]/90 backdrop-blur-md shrink-0 shadow-md">
        {/* Left: Scroll arrows & Label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleScrollTrack("left")}
            title="Rolar colunas para a esquerda (◀)"
            className="w-7 h-7 rounded-lg bg-[#050805] hover:bg-[#142414] border border-[#1e381e] hover:border-[#22c55e] text-[#a7f3d0] hover:text-white flex items-center justify-center transition shadow-sm active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => handleScrollTrack("right")}
            title="Rolar colunas para a direita (▶)"
            className="w-7 h-7 rounded-lg bg-[#050805] hover:bg-[#142414] border border-[#1e381e] hover:border-[#22c55e] text-[#a7f3d0] hover:text-white flex items-center justify-center transition shadow-sm active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#a7f3d0]/70 pl-1 font-bold">
            Ir para Coluna:
          </span>
        </div>

        {/* Center: Jump to Column Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin">
          {visibleColumns.map((col) => {
            const colCount = filteredTasks.filter((t) => (t.columnStatus || (t as any).column) === col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => handleJumpToColumn(col.id)}
                title={`Rolar diretamente para a coluna ${col.label}`}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition shrink-0 flex items-center gap-1.5 bg-[#050805] hover:bg-[#142414] border border-[#1e381e] hover:border-[#22c55e]/60 text-white shadow-sm group active:scale-95"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: col.color }}
                />
                <span className="truncate max-w-[120px]">{col.label}</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", color: col.color }}
                >
                  {colCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Drag indication hint */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-[#22c55e]/80 shrink-0">
          <GripVertical size={13} className="text-[#22c55e]" />
          <span>Arraste os cartões entre as colunas</span>
        </div>
      </div>
      )}

      {/* 1. KANBAN BOARD COLUMNS TRACK (Quadro) */}
      {viewMode === "board" && (
      <div
        ref={scrollTrackRef}
        onWheel={handleTrackWheel}
        onMouseDown={handleMouseDownTrack}
        onMouseMove={handleMouseMoveTrack}
        onMouseUp={handleMouseUpTrack}
        onMouseLeave={handleMouseUpTrack}
        className={`flex items-start gap-4 overflow-x-auto pb-4 pt-1 px-0.5 scrollbar-thin select-none ${
          isDraggingTrack ? "cursor-grabbing" : "cursor-default"
        } ${
          isFullScreen ? "flex-1 min-h-0 h-full" : "h-[calc(100vh-270px)] min-h-[540px] max-h-[840px]"
        }`}
        style={{ scrollSnapType: "x proximity" }}
      >
        {visibleColumns.map((col) => {
          const colTasks = filteredTasks.filter((t) => (t.columnStatus || (t as any).column) === col.id);
          const ColIcon = col.icon;
          const isColumnDragTarget = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              ref={(el) => {
                columnRefs.current[col.id] = el;
              }}
              onDragOver={(e) => handleColumnDragOver(e, col.id)}
              onDragLeave={(e) => handleColumnDragLeave(e, col.id)}
              onDrop={(e) => handleColumnDrop(e, col.id)}
              className={`w-[300px] sm:w-[320px] md:w-[335px] shrink-0 rounded-2xl border flex flex-col transition-all duration-200 shadow-xl backdrop-blur-md h-full min-h-0 ${
                isColumnDragTarget
                  ? "ring-2 ring-[#22c55e] border-[#22c55e] bg-[#0c240c] scale-[1.01]"
                  : ""
              }`}
              style={{
                scrollSnapAlign: "start",
                backgroundColor: isColumnDragTarget ? "rgba(12, 36, 12, 0.9)" : col.bg,
                borderColor: isColumnDragTarget ? "#22c55e" : col.border,
                boxShadow: isColumnDragTarget
                  ? "0 0 25px rgba(34, 197, 94, 0.3)"
                  : "0 8px 30px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)"
              }}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#142414] bg-[#070d07]/60 rounded-t-2xl space-y-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{
                        backgroundColor: col.color,
                        boxShadow: `0 0 10px ${col.color}`
                      }}
                    />
                    <ColIcon size={14} style={{ color: col.color }} className="shrink-0" />
                    <h3 className="text-xs font-bold text-white tracking-wide truncate">
                      {col.label}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border"
                      style={{
                        color: col.color,
                        backgroundColor: "rgba(5, 8, 5, 0.8)",
                        borderColor: col.border
                      }}
                    >
                      {colTasks.length}
                    </span>

                    {/* Quick Add in this column */}
                    {col.id !== "archived" && (
                      <button
                        onClick={() => {
                          setNewTaskColumn(col.id);
                          setCreateModalOpen(true);
                        }}
                        title={`Nova tarefa em ${col.label}`}
                        className="w-6 h-6 rounded-md bg-[#050805] hover:bg-[#142414] border border-[#1e381e] hover:border-[#22c55e] text-[#a7f3d0] hover:text-white flex items-center justify-center transition shadow-sm"
                      >
                        <Plus size={13} />
                      </button>
                    )}

                    {/* Done Column Archive Action */}
                    {col.id === "done" && colTasks.length > 0 && (
                      <button
                        onClick={handleArchiveAllDone}
                        title="Arquivar todas as tarefas concluídas"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-[#a7f3d0] hover:text-white bg-[#050805] hover:bg-[#142414] border border-[#1e381e] transition"
                      >
                        <Archive size={11} className="text-[#22c55e]" />
                        <span>Arquivar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle / Description */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#a7f3d0]/60">
                  <span className="truncate pr-1">{col.description}</span>
                  <span
                    className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0"
                    style={{ color: col.color, backgroundColor: "rgba(0,0,0,0.4)" }}
                  >
                    {col.badge}
                  </span>
                </div>
              </div>

              {/* Cards Container with smooth vertical scroll & overscroll-contain */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-2.5 scrollbar-thin kanban-card-list overscroll-contain">
                {colTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-[#1e381e]/60 rounded-xl flex flex-col items-center justify-center text-center p-3 text-xs font-mono text-[#166534]">
                    <span>Nenhuma tarefa nesta coluna</span>
                    {col.id !== "archived" && (
                      <button
                        onClick={() => {
                          setNewTaskColumn(col.id);
                          setCreateModalOpen(true);
                        }}
                        className="mt-1 text-[11px] text-[#4ade80] hover:underline"
                      >
                        + Criar tarefa
                      </button>
                    )}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isExecuting = executingTaskId === task.id;
                    const isTaskBeingDragged = draggedTaskId === task.id;
                    const squadMeta = squads.find((s) => s.id === task.squad) || SQUADS.find((s) => s.id === task.squad);

                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                    const commentsCount = task.comments?.length || 0;

                    const dueAlert = getDueDateAlert(task.dueDate, task.columnStatus);
                    const isAgentActiveColumn = (task.columnStatus || (task as any).column) === "agent_executing" || isExecuting;

                    return (
                      <motion.div
                        layout
                        key={task.id}
                        draggable={true}
                        onDragStart={(e: any) => handleDragStartCard(e, task.id)}
                        onDragEnd={handleDragEndCard}
                        onClick={() => setDetailTask(task)}
                        className={`rounded-xl border transition-all relative cursor-grab active:cursor-grabbing group shadow-sm select-none ${
                          cardDensity === "compact" ? "p-3 space-y-2" : "p-3.5 space-y-2.5"
                        } ${
                          isTaskBeingDragged
                            ? "opacity-35 scale-95 border-dashed border-[#22c55e] bg-[#0c1c0c]"
                            : isExecuting
                            ? "border-[#22c55e] bg-[#0c1c0c] animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.25)]"
                            : task.columnStatus === "archived"
                            ? "border-zinc-800 bg-[#0d0d10] opacity-80 hover:opacity-100 hover:border-zinc-600"
                            : "border-[#1e381e] bg-[#080d08] hover:border-[#22c55e] hover:bg-[#0d160d] hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        }`}
                      >
                        {/* 1. Header: Project Tag, Due Date Badge & Priority Badge */}
                        <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-[#101c10] border border-[#1e381e] text-[#a7f3d0] font-bold truncate max-w-[130px] flex items-center gap-1">
                            <Folder size={10} className="text-[#22c55e] shrink-0" />
                            <span className="truncate">{task.project || "Geral"}</span>
                          </span>

                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            {/* Due Date Badge with Alert Highlighting */}
                            {dueAlert && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                                  dueAlert.variant === "overdue"
                                    ? "bg-rose-950/80 text-rose-300 border border-rose-500/70 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                    : dueAlert.variant === "due_today"
                                    ? "bg-amber-950/90 text-amber-300 border border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse"
                                    : dueAlert.variant === "due_soon"
                                    ? "bg-amber-950/40 text-amber-300 border border-amber-600/50"
                                    : dueAlert.variant === "done"
                                    ? "bg-[#102010] text-[#4ade80] border border-[#1e381e]"
                                    : "bg-[#0a140a] text-[#a7f3d0] border border-[#1e381e]"
                                }`}
                                title={`Prazo limite: ${task.dueDate}`}
                              >
                                {dueAlert.variant === "overdue" ? (
                                  <AlertTriangle size={10} className="text-rose-400 shrink-0" />
                                ) : dueAlert.variant === "due_today" || dueAlert.variant === "due_soon" ? (
                                  <Clock size={10} className="text-amber-400 shrink-0" />
                                ) : (
                                  <Calendar size={10} className="text-[#22c55e] shrink-0" />
                                )}
                                <span>{dueAlert.badgeText}</span>
                              </span>
                            )}

                            {/* Priority Badge */}
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono uppercase font-bold text-[9px] tracking-wider shrink-0 ${
                                task.priority === "urgente"
                                  ? "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]/40"
                                  : task.priority === "alta"
                                  ? "bg-[#291e08] text-[#f59e0b] border border-[#f59e0b]/40"
                                  : task.priority === "media"
                                  ? "bg-[#091e2e] text-[#38bdf8] border border-[#38bdf8]/40"
                                  : "bg-[#142414] text-[#4ade80] border border-[#1e381e]"
                              }`}
                            >
                              {task.priority === "urgente" ? "Urgente" : task.priority === "alta" ? "Alta" : task.priority === "media" ? "Média" : "Baixa"}
                            </span>
                          </div>
                        </div>

                        {/* 2. Task Title & Description Snippet */}
                        <div className="space-y-0.5">
                          <h4
                            className={`font-bold text-white leading-snug group-hover:text-[#4ade80] transition ${
                              cardDensity === "compact" ? "text-xs line-clamp-1" : "text-xs line-clamp-2"
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p
                              className={`text-[11px] text-[#a7f3d0]/80 leading-relaxed font-mono ${
                                cardDensity === "compact" ? "line-clamp-1" : "line-clamp-2"
                              }`}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* 3. Interactive Subtasks Checklist in Expanded Mode */}
                        {cardDensity === "expanded" && checklistTotal > 0 && (
                          <div
                            className="space-y-1.5 p-2 rounded-lg bg-[#050805]/90 border border-[#142414]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#a7f3d0]">
                              <span className="font-bold flex items-center gap-1">
                                <CheckSquare size={11} className="text-[#22c55e]" /> Subtarefas ({checklistDone}/{checklistTotal})
                              </span>
                              <span className="text-[9px] text-[#22c55e] font-bold">
                                {Math.round((checklistDone / checklistTotal) * 100)}%
                              </span>
                            </div>

                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                              {task.checklist?.map((chk) => (
                                <label
                                  key={chk.id}
                                  className="flex items-center gap-2 cursor-pointer p-0.5 rounded hover:bg-[#101c10] transition group/chk"
                                >
                                  <input
                                    type="checkbox"
                                    checked={chk.completed}
                                    onChange={(e) => handleQuickToggleChecklist(task.id, chk.id, e as any)}
                                    className="w-3.5 h-3.5 rounded border-[#1e381e] accent-[#22c55e] bg-[#0c140c] cursor-pointer"
                                  />
                                  <span
                                    className={`text-[10px] font-mono leading-tight truncate ${
                                      chk.completed ? "line-through text-[#166534]" : "text-white"
                                    }`}
                                  >
                                    {chk.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Squad & Checklist/Comment Badges Row */}
                        <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#142414] gap-2">
                          <div className="text-[#22c55e] font-bold flex items-center gap-1 truncate text-[10px]">
                            <ShieldCheck size={11} className="shrink-0 text-[#22c55e]" />
                            <span className="truncate">{squadMeta?.name.split("—")[0].trim() || task.squad}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Checklist pill in compact mode */}
                            {cardDensity === "compact" && checklistTotal > 0 && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 ${
                                  checklistDone === checklistTotal
                                    ? "bg-[#142414] text-[#4ade80] border border-[#22c55e]"
                                    : "bg-[#0f190f] text-[#a7f3d0] border border-[#1e381e]"
                                }`}
                                title={`${checklistDone}/${checklistTotal} subtarefas concluídas`}
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

                        {/* 5. Assigned AI Agents Badges with Activity Radar Pulse */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[9px] text-[#166534] font-mono font-bold uppercase tracking-wider mr-0.5">Agentes:</span>
                          {task.assignedAgents.map((ag) => (
                            <span
                              key={ag}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold flex items-center transition-all ${
                                isAgentActiveColumn
                                  ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse"
                                  : "bg-[#102010] text-[#4ade80] border border-[#22c55e]/30"
                              }`}
                            >
                              {isAgentActiveColumn && (
                                <span className="relative flex h-2 w-2 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              )}
                              @{ag}
                              {isAgentActiveColumn && <span className="ml-0.5 text-[8px] text-emerald-400">●</span>}
                            </span>
                          ))}
                        </div>

                        {/* 6. Clean Action Buttons Footer */}
                        <div
                          className="pt-1.5 border-t border-[#142414] space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Row 1: Primary Dispatch AI Button or Status */}
                          {task.columnStatus === "archived" ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 py-1 px-2 rounded-md bg-[#18181b] border border-zinc-700 text-center text-xs font-mono text-zinc-400 font-bold flex items-center justify-center gap-1.5 truncate">
                                <Archive size={12} className="text-zinc-500 shrink-0" /> Arquivada
                              </div>
                              <button
                                onClick={() => handleMoveColumn(task.id, "done")}
                                title="Restaurar tarefa para Concluído"
                                className="px-2.5 py-1 rounded-md bg-[#050805] hover:bg-[#142414] border border-[#1e381e] text-[#a7f3d0] hover:text-white text-[10px] font-mono flex items-center gap-1 transition shrink-0"
                              >
                                <ArchiveRestore size={12} className="text-[#22c55e]" /> Restaurar
                              </button>
                            </div>
                          ) : task.columnStatus === "done" ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 py-1 px-2 rounded-md bg-[#142414] border border-[#22c55e]/40 text-center text-xs font-mono text-[#4ade80] font-bold flex items-center justify-center gap-1.5 truncate">
                                <CheckCircle2 size={13} className="text-[#22c55e] shrink-0" /> Concluída
                              </div>
                              <button
                                onClick={() => handleMoveColumn(task.id, "archived")}
                                title="Arquivar esta tarefa"
                                className="px-2.5 py-1 rounded-md bg-[#050805] hover:bg-[#18181b] border border-[#1e381e] hover:border-zinc-700 text-zinc-400 hover:text-white text-[10px] font-mono flex items-center gap-1 transition shrink-0"
                              >
                                <Archive size={12} /> Arquivar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDispatchAgent(task.id)}
                              disabled={isExecuting}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] active:scale-[0.98] transition shadow-md disabled:opacity-50"
                            >
                              <Zap size={13} /> {isExecuting ? "Agente IA Executando..." : "Acionar Agente IA"}
                            </button>
                          )}

                          {/* Row 2: Ver Detalhes + Select Column Dropdown */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              onClick={() => setDetailTask(task)}
                              className="w-full py-1 px-2 rounded bg-[#0f190f] border border-[#1e381e] text-[10px] font-mono text-[#4ade80] hover:bg-[#1e381e] hover:text-white transition flex items-center justify-center gap-1 font-semibold"
                            >
                              <Eye size={11} /> Ver Detalhes
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
                  })
                )}

                {/* Drop Target Indicator when dragging over this column */}
                {isColumnDragTarget && (
                  <div className="p-3 rounded-xl border-2 border-dashed border-[#22c55e] bg-[#22c55e]/10 text-center text-xs font-mono text-[#4ade80] flex items-center justify-center gap-1.5 animate-pulse">
                    <Plus size={14} /> Solte para mover para {col.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* 2. KANBAN LIST VIEW (Lista / Tabela) */}
      {viewMode === "list" && (
        <KanbanListView
          tasks={filteredTasks}
          columns={visibleColumns}
          squads={squads}
          members={members}
          onOpenTask={(t) => setDetailTask(t)}
          onMoveColumn={handleMoveColumn}
          onDispatchAgent={handleDispatchAgent}
          onCreateTaskInColumn={(colId) => {
            setNewTaskColumn(colId);
            setCreateModalOpen(true);
          }}
          getDueDateAlert={getDueDateAlert}
        />
      )}

      {/* 3. KANBAN CALENDAR VIEW (Calendário) */}
      {viewMode === "calendar" && (
        <KanbanCalendarView
          tasks={filteredTasks}
          columns={visibleColumns}
          squads={squads}
          onOpenTask={(t) => setDetailTask(t)}
          onMoveColumn={handleMoveColumn}
          onCreateTaskOnDate={(dateStr) => {
            setNewDueDate(dateStr);
            setNewTaskColumn("todo");
            setCreateModalOpen(true);
          }}
          getDueDateAlert={getDueDateAlert}
        />
      )}

      {/* TASK DETAIL & EDIT MODAL / DRAWER (Ultra-Modern 2-Column Executive Studio) */}
      <AnimatePresence>
        {detailTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-2 sm:p-4 md:p-6"
            onClick={() => setDetailTask(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-5xl max-h-[92vh] rounded-2xl border border-emerald-900/50 bg-[#070d08]/95 backdrop-blur-2xl flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_35px_rgba(34,197,94,0.08)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Gradient Border */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent shrink-0" />

              {/* 1. Header Bar: Breadcrumbs, Status, AI Action, Close */}
              <div className="px-5 py-3.5 border-b border-[#142414] bg-[#091209]/90 flex items-center justify-between gap-3 shrink-0">
                {/* Left: Breadcrumbs & Badges */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {/* Task ID chip with copy button */}
                  <button
                    onClick={() => handleCopyId(detailTask.id)}
                    title="Clique para copiar o ID da tarefa"
                    className="px-2.5 py-1 rounded-md bg-[#102010] border border-emerald-600/40 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 hover:border-emerald-400 hover:text-white transition group"
                  >
                    <Tag size={12} className="text-emerald-500" />
                    <span>{detailTask.id}</span>
                    {copiedId ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} className="opacity-50 group-hover:opacity-100 transition" />
                    )}
                  </button>

                  <span className="text-zinc-600 font-mono text-xs">/</span>

                  {/* Project / Company Tag */}
                  <span className="px-2.5 py-1 rounded-md bg-[#050805] border border-[#1e381e] text-zinc-300 font-mono text-xs flex items-center gap-1.5 truncate max-w-[190px]">
                    <Folder size={12} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{detailTask.project || "Geral"}</span>
                  </span>

                  {/* Column Status Badge */}
                  {(() => {
                    const col = COLUMNS.find((c) => c.id === detailTask.columnStatus);
                    return (
                      <span
                        className="px-2.5 py-1 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 border"
                        style={{
                          color: col?.color || "#22c55e",
                          backgroundColor: col?.bg || "rgba(10,20,10,0.7)",
                          borderColor: col?.border || "#1e381e"
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: col?.color || "#22c55e" }}
                        />
                        <span>{col?.label || "Status"}</span>
                      </span>
                    );
                  })()}

                  {/* Priority Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold uppercase tracking-wider border ${
                      detailTask.priority === "urgente"
                        ? "bg-rose-950/70 text-rose-300 border-rose-600/60"
                        : detailTask.priority === "alta"
                        ? "bg-amber-950/70 text-amber-300 border-amber-600/60"
                        : detailTask.priority === "media"
                        ? "bg-sky-950/70 text-sky-300 border-sky-600/60"
                        : "bg-emerald-950/70 text-emerald-300 border-emerald-600/60"
                    }`}
                  >
                    {detailTask.priority}
                  </span>
                </div>

                {/* Right: Actions & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  {detailTask.columnStatus !== "done" && detailTask.columnStatus !== "archived" && (
                    <button
                      onClick={() => handleDispatchAgent(detailTask.id)}
                      disabled={executingTaskId === detailTask.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Zap size={14} className={executingTaskId === detailTask.id ? "animate-spin" : ""} />
                      <span>{executingTaskId === detailTask.id ? "Agente IA Ativo..." : "Acionar IA"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setDetailTask(null)}
                    title="Fechar modal (ESC)"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition border border-transparent hover:border-[#1e381e]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 2. Notion-Style Title Input Area */}
              <div className="px-6 pt-5 pb-3 shrink-0 border-b border-[#142414] bg-[#080f08]/60">
                <input
                  type="text"
                  value={
                    detailTask.title?.includes("Miss o valores")
                      ? detailTask.title.replace("Miss o valores e princ pios", "Missão, Valores e Princípios")
                      : detailTask.title
                  }
                  onChange={(e) => syncTaskUpdate({ ...detailTask, title: e.target.value })}
                  className="w-full text-lg sm:text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-[#1e381e] focus:border-[#22c55e] focus:bg-[#050805]/50 outline-none rounded-lg px-2 py-1 transition font-sans leading-tight tracking-tight placeholder-zinc-600"
                  placeholder="Título da tarefa..."
                />
              </div>

              {/* 3. Main 2-Column Body (Scrollable on mobile, 2-column on desktop) */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden [scrollbar-width:thin]">
                {/* 3A. Left Side: Tabs & Rich Content (~65%) */}
                <div className="flex-1 min-w-0 flex flex-col shrink-0 md:shrink md:overflow-hidden">
                  {/* Fluid Sub-Tabs */}
                  <div className="flex items-center gap-1 border-b border-[#142414] bg-[#050a06] px-6 pt-2 shrink-0 overflow-x-hidden">
                    <button
                      onClick={() => setDetailTab("edit")}
                      className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        detailTab === "edit"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#0c1c0c]"
                          : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <FileText size={13} /> Visão Geral & Contexto
                    </button>

                    <button
                      onClick={() => setDetailTab("checklist")}
                      className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        detailTab === "checklist"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#0c1c0c]"
                          : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <CheckSquare size={13} /> Subtarefas ({detailTask.checklist?.filter((c) => c.completed).length || 0}/
                      {detailTask.checklist?.length || 0})
                    </button>

                    <button
                      onClick={() => setDetailTab("comments")}
                      className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        detailTab === "comments"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#0c1c0c]"
                          : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <MessageSquare size={13} /> Discussão ({detailTask.comments?.length || 0})
                    </button>

                    <button
                      onClick={() => setDetailTab("logs")}
                      className={`px-3.5 py-2 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        detailTab === "logs"
                          ? "border-[#22c55e] text-[#22c55e] bg-[#0c1c0c]"
                          : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Terminal size={13} /> Histórico IA ({detailTask.executionLogs?.length || 0})
                    </button>
                  </div>

                  {/* Tab Panels Container */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-thumb]:bg-emerald-950/80 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-700/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {/* TAB 1: OVERVIEW & MARKDOWN DESCRIPTION */}
                    {detailTab === "edit" && (
                      <div className="space-y-4">
                        {/* Description Toolbar: Mode Toggle (Preview vs Edit) */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#142414]">
                          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                            <FileText size={13} /> Descrição & Notas de Contexto do Vault
                          </span>

                          <div className="flex items-center gap-1 bg-[#050805] border border-[#1e381e] p-0.5 rounded-lg text-[11px] font-mono">
                            <button
                              onClick={() => setDescViewMode("preview")}
                              className={`px-2.5 py-0.5 rounded flex items-center gap-1 transition ${
                                descViewMode === "preview"
                                  ? "bg-[#142414] text-white font-bold"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Eye size={11} /> Formatado
                            </button>
                            <button
                              onClick={() => setDescViewMode("edit")}
                              className={`px-2.5 py-0.5 rounded flex items-center gap-1 transition ${
                                descViewMode === "edit"
                                  ? "bg-[#142414] text-white font-bold"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              <Edit3 size={11} /> Editar
                            </button>
                          </div>
                        </div>

                        {/* Description Content */}
                        {descViewMode === "preview" ? (
                          detailTask.description?.trim() ? (
                            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans space-y-2.5 p-4 rounded-xl bg-[#050805]/80 border border-[#142414] min-h-[200px]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {detailTask.description}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="p-8 border border-dashed border-[#1e381e] rounded-xl text-center text-xs font-mono text-zinc-500 space-y-2">
                              <p>Nenhuma descrição detalhada para esta tarefa ainda.</p>
                              <button
                                onClick={() => setDescViewMode("edit")}
                                className="text-emerald-400 hover:underline text-xs"
                              >
                                + Adicionar descrição ou notas de contexto
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="space-y-1.5">
                            <textarea
                              rows={10}
                              value={detailTask.description || ""}
                              onChange={(e) => syncTaskUpdate({ ...detailTask, description: e.target.value })}
                              className="w-full p-3.5 rounded-xl bg-[#050805] border border-[#1e381e] text-white font-mono text-xs leading-relaxed focus:border-[#22c55e] focus:outline-none resize-y min-h-[200px]"
                              placeholder="Escreva a descrição em Markdown (suporta títulos, listas, links de vault, etc.)..."
                            />
                            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500 px-1">
                              <span>Suporta Markdown GitHub Flavored (títulos, listas, negrito)</span>
                              <button
                                onClick={() => setDescViewMode("preview")}
                                className="text-emerald-400 hover:underline font-bold"
                              >
                                Concluir Edição & Visualizar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Vault Path Reference if exists */}
                        {detailTask.vaultPath && (
                          <div className="p-3 rounded-lg bg-[#050805] border border-[#142414] text-[11px] font-mono text-zinc-400 flex items-center justify-between gap-2">
                            <span className="truncate">
                              <span className="text-emerald-500 font-bold">Origem no Vault:</span> {detailTask.vaultPath}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#102010] text-[#4ade80] text-[10px] shrink-0 font-bold">
                              Obsidian MD
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: SUBTASKS / CHECKLIST */}
                    {detailTab === "checklist" && (
                      <div className="space-y-5 text-xs font-mono">
                        {/* Progress Bar */}
                        {detailTask.checklist && detailTask.checklist.length > 0 ? (
                          <div className="space-y-2 p-3.5 rounded-xl border border-[#1e381e] bg-[#0a140b]">
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
                          <div className="p-6 border border-dashed border-[#1e381e] rounded-xl text-center text-zinc-500 italic">
                            Nenhuma subtarefa criada ainda. Adicione itens abaixo para organizar a execução.
                          </div>
                        )}

                        {/* Add Checklist Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Adicionar nova subtarefa (ex: Revisar nota fiscal)..."
                            value={newChecklistTitle}
                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()}
                            className="flex-1 p-2.5 rounded-lg bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                          />
                          <button
                            onClick={handleAddChecklistItem}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#22c55e] font-bold text-[#050805] hover:bg-[#4ade80] transition shrink-0"
                          >
                            <Plus size={15} /> Adicionar
                          </button>
                        </div>

                        {/* Checklist Items List */}
                        <div className="space-y-2">
                          {detailTask.checklist?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-[#1e381e] bg-[#050805] hover:border-[#22c55e]/60 transition group"
                            >
                              <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => handleToggleChecklistItem(item.id)}
                                  className="w-4 h-4 rounded border-[#1e381e] accent-[#22c55e] bg-[#0f190f] cursor-pointer"
                                />
                                <span
                                  className={`text-xs truncate ${
                                    item.completed ? "line-through text-zinc-500 font-normal" : "text-white font-medium"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              </label>

                              <button
                                onClick={() => handleDeleteChecklistItem(item.id)}
                                className="text-zinc-500 hover:text-rose-400 p-1 transition opacity-60 group-hover:opacity-100"
                                title="Remover subtarefa"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: DISCUSSION & COMMENTS */}
                    {detailTab === "comments" && (
                      <div className="space-y-5 text-xs font-mono">
                        {/* Add Comment Box */}
                        <div className="p-4 rounded-xl border border-[#1e381e] bg-[#0a140b] space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white font-bold flex items-center gap-1.5">
                              <MessageSquare size={14} className="text-[#22c55e]" /> Adicionar Comentário ou Registro
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-400">Tipo:</span>
                              <button
                                onClick={() => setNewCommentIsAgent(false)}
                                className={`px-2 py-0.5 rounded text-[10px] transition ${
                                  !newCommentIsAgent
                                    ? "bg-[#142414] text-[#4ade80] border border-[#22c55e] font-bold"
                                    : "bg-[#050805] text-zinc-400"
                                }`}
                              >
                                👤 Humano
                              </button>
                              <button
                                onClick={() => setNewCommentIsAgent(true)}
                                className={`px-2 py-0.5 rounded text-[10px] transition ${
                                  newCommentIsAgent
                                    ? "bg-[#22c55e] text-[#050805] font-bold"
                                    : "bg-[#050805] text-zinc-400"
                                }`}
                              >
                                🤖 Agente IA
                              </button>
                            </div>
                          </div>

                          {!newCommentIsAgent && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-400">Autor:</span>
                              <input
                                type="text"
                                value={newCommentAuthor}
                                onChange={(e) => setNewCommentAuthor(e.target.value)}
                                className="p-1.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:outline-none flex-1 max-w-xs"
                              />
                            </div>
                          )}

                          <textarea
                            rows={3}
                            placeholder="Escreva um comentário, parecer técnico ou instrução..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none resize-none"
                          />

                          <div className="flex justify-end">
                            <button
                              onClick={handleAddComment}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22c55e] text-[#050805] font-bold hover:bg-[#4ade80] transition"
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
                                className={`p-3.5 rounded-xl border space-y-1.5 ${
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
                                    <span className="text-zinc-400 font-mono">({comment.role})</span>
                                  </div>
                                  <span className="text-zinc-500 text-[10px]">{comment.createdAt}</span>
                                </div>
                                <p className="text-xs text-zinc-200 leading-relaxed pl-1 pt-1 font-sans">{comment.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 border border-dashed border-[#1e381e] rounded-xl text-center text-zinc-500 italic">
                              Nenhum comentário nesta tarefa ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 4: LOGS TERMINAL */}
                    {detailTab === "logs" && (
                      <div className="space-y-4 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#a7f3d0] font-bold flex items-center gap-1.5">
                            <Terminal size={14} className="text-[#22c55e]" /> Histórico de Resolução por Agentes IA
                          </span>
                          <span className="text-[10px] text-[#22c55e] uppercase tracking-widest font-bold">
                            Total Passos: {detailTask.executionLogs?.length || 0}
                          </span>
                        </div>

                        <div className="p-4 rounded-xl border border-emerald-900/60 bg-[#040804] space-y-2 max-h-[360px] overflow-y-auto text-xs text-[#4ade80] scrollbar-thin">
                          {detailTask.executionLogs && detailTask.executionLogs.length > 0 ? (
                            detailTask.executionLogs.map((log, idx) => (
                              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-[#166534] font-bold select-none">[{idx + 1}]</span>
                                <span className="text-zinc-200">{log}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-zinc-600 italic">Nenhum log autônomo registrado para esta tarefa ainda.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3B. Right Side: Metadata & Quick Actions Sidebar (~35%) */}
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#142414] bg-[#050905]/80 p-5 space-y-5 overflow-y-auto shrink-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black/20 [&::-webkit-scrollbar-thumb]:bg-emerald-950/80 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-700/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {/* Section Title */}
                  <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={13} className="text-[#22c55e]" /> Propriedades da Tarefa
                  </div>

                  {/* 1. Column / Status Selector */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Coluna / Estágio</label>
                    <select
                      value={detailTask.columnStatus}
                      onChange={(e) => handleMoveColumn(detailTask.id, e.target.value as KanbanColumnId)}
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none cursor-pointer"
                    >
                      {COLUMNS.map((col) => (
                        <option key={col.id} value={col.id} className="bg-[#091209] text-white">
                          {col.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Priority Selector */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Prioridade</label>
                    <select
                      value={detailTask.priority}
                      onChange={(e) => syncTaskUpdate({ ...detailTask, priority: e.target.value as any })}
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none cursor-pointer"
                    >
                      <option value="urgente" className="bg-[#091209] text-rose-400 font-bold">🔴 Urgente</option>
                      <option value="alta" className="bg-[#091209] text-amber-400 font-bold">🟡 Alta</option>
                      <option value="media" className="bg-[#091209] text-sky-400">🔵 Média</option>
                      <option value="baixa" className="bg-[#091209] text-emerald-400">🟢 Baixa</option>
                    </select>
                  </div>

                  {/* 3. Squad Selector */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Squad Responsável</label>
                    <select
                      value={detailTask.squad}
                      onChange={(e) => syncTaskUpdate({ ...detailTask, squad: e.target.value as SquadId })}
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none cursor-pointer truncate"
                    >
                      {squads.filter((s) => s.id !== "super_user").map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#091209] text-white">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Company / Project Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Empresa / Projeto</label>
                    <input
                      type="text"
                      value={detailTask.project || ""}
                      onChange={(e) => syncTaskUpdate({ ...detailTask, project: e.target.value })}
                      placeholder="Ex: Auditoria do Vault Nipëi"
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                    />
                  </div>

                  {/* 5. Assignee Member Input with Suggestions */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Responsável / Integrante</label>
                    <input
                      type="text"
                      list="assignees-datalist"
                      value={detailTask.assignee || ""}
                      onChange={(e) => syncTaskUpdate({ ...detailTask, assignee: e.target.value })}
                      placeholder="Nome do integrante..."
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                    />
                    <datalist id="assignees-datalist">
                      {allAssignees.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>

                  {/* 6. Due Date with Smart Alert Badge */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold">Prazo / Data Limite</label>
                    <input
                      type="date"
                      value={detailTask.dueDate || ""}
                      onChange={(e) => syncTaskUpdate({ ...detailTask, dueDate: e.target.value })}
                      className="w-full p-2 rounded-lg bg-[#081208] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                    />

                    {/* Calculated Due Date Alert */}
                    {(() => {
                      const alert = getDueDateAlert(detailTask.dueDate, detailTask.columnStatus);
                      if (!alert) return null;
                      return (
                        <div
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 border ${
                            alert.variant === "overdue"
                              ? "bg-rose-950/80 text-rose-300 border-rose-600/70 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                              : alert.variant === "due_today"
                              ? "bg-amber-950/90 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse"
                              : alert.variant === "due_soon"
                              ? "bg-amber-950/40 text-amber-300 border-amber-600/50"
                              : alert.variant === "done"
                              ? "bg-[#102010] text-[#4ade80] border border-[#1e381e]"
                              : "bg-[#0a140a] text-zinc-300 border border-[#1e381e]"
                          }`}
                        >
                          {alert.variant === "overdue" ? (
                            <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                          ) : alert.variant === "due_today" || alert.variant === "due_soon" ? (
                            <Clock size={12} className="text-amber-400 shrink-0" />
                          ) : (
                            <Calendar size={12} className="text-emerald-400 shrink-0" />
                          )}
                          <span>{alert.badgeText}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 7. Assigned AI Agents Chips */}
                  <div className="space-y-1.5 pt-2 border-t border-[#142414]">
                    <label className="block text-[11px] font-mono text-zinc-400 font-semibold flex items-center justify-between">
                      <span>Agentes IA Atribuídos</span>
                      <span className="text-[10px] text-emerald-400">Clique para alternar</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_AGENTS.map((ag) => {
                        const active = detailTask.assignedAgents?.includes(ag.id);
                        return (
                          <button
                            key={ag.id}
                            type="button"
                            onClick={() => toggleDetailAgent(ag.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1.5 border ${
                              active
                                ? "bg-[#142814] border-[#22c55e] text-white font-bold shadow-sm shadow-emerald-950"
                                : "bg-[#050805] border-[#1e381e] text-zinc-400 hover:text-white hover:border-[#1e381e]/80"
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: active ? "#22c55e" : "#52525b" }}
                            />
                            <span>@{ag.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 8. Quick Lifecycle Actions */}
                  <div className="pt-3 border-t border-[#142414] space-y-2">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">
                      Ações Rápidas
                    </div>

                    {detailTask.columnStatus !== "done" && detailTask.columnStatus !== "archived" ? (
                      <button
                        onClick={() => handleMoveColumn(detailTask.id, "done")}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#0e1f0e] border border-[#22c55e]/50 text-xs font-mono font-bold text-[#4ade80] hover:bg-[#142814] transition"
                      >
                        <CheckCircle2 size={13} className="text-[#22c55e]" /> Marcar como Concluída
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMoveColumn(detailTask.id, "todo")}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#050805] border border-[#1e381e] text-xs font-mono font-bold text-zinc-300 hover:bg-[#142414] transition"
                      >
                        <RotateCcw size={13} className="text-[#22c55e]" /> Reabrir Tarefa
                      </button>
                    )}

                    {detailTask.columnStatus !== "archived" ? (
                      <button
                        onClick={() => handleMoveColumn(detailTask.id, "archived")}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#050805] border border-[#1e381e] text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
                      >
                        <Archive size={13} /> Arquivar no Histórico
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMoveColumn(detailTask.id, "done")}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#050805] border border-[#1e381e] text-xs font-mono text-zinc-300 hover:text-white hover:bg-[#142414] transition"
                      >
                        <ArchiveRestore size={13} className="text-[#22c55e]" /> Restaurar do Arquivo
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(detailTask.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs font-mono text-rose-400 hover:bg-rose-950/40 transition"
                    >
                      <Trash2 size={13} /> Excluir Tarefa do Quadro
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Footer Bar */}
              <div className="px-6 py-2.5 border-t border-[#142414] bg-[#050905] flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
                <span className="flex items-center gap-1">
                  <span>Dica:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[#091209] border border-[#1e381e] text-zinc-300 text-[10px]">ESC</kbd>
                  <span>para fechar</span>
                </span>

                <button
                  onClick={() => setDetailTask(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#102010] border border-[#1e381e] hover:border-[#22c55e] text-zinc-300 hover:text-white transition font-bold"
                >
                  Concluir & Fechar
                </button>
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
                      {squads.filter((s) => s.id !== "super_user").map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Coluna Inicial</label>
                    <select
                      value={newTaskColumn}
                      onChange={(e) => setNewTaskColumn(e.target.value as KanbanColumnId)}
                      className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white focus:border-[#22c55e] focus:outline-none"
                    >
                      {COLUMNS.filter((c) => c.id !== "archived").map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

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
                    <label className="block text-[#a7f3d0] mb-1 font-bold">Prazo de Entrega</label>
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
