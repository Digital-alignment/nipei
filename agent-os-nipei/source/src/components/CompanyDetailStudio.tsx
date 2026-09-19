"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useCompany } from "@/context/CompanyContext";
import { Company } from "@/types/company";
import CompanyEditModal from "./CompanyEditModal";
import AgentKanban from "./AgentKanban";
import RichNoteViewerModal from "./RichNoteViewerModal";
import FastIngestModal from "./FastIngestModal";
import VaultTodoExtractorWidget from "./VaultTodoExtractorWidget";
import { VaultConflictAuditWidget } from "./VaultConflictAuditWidget";
import { VaultSemanticLinkerWidget } from "./VaultSemanticLinkerWidget";
import { InboxWebhookSimulatorWidget } from "./InboxWebhookSimulatorWidget";
import CompanyContextDigestWidget from "./CompanyContextDigestWidget";
import CompanyMemoryGalaxyWidget from "./CompanyMemoryGalaxyWidget";
import CompanyReportExporterModal from "./CompanyReportExporterModal";
import { MultimodalIngestionModal } from "./MultimodalIngestionModal";
import { COMPANY_TEMPLATES } from "@/lib/companyTemplates";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Building2,
  ArrowLeft,
  Target,
  Users,
  Bot,
  Globe,
  MapPin,
  Tag,
  CheckCircle2,
  Pencil,
  FileText,
  Layers,
  LayoutDashboard,
  Brain,
  Code2,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Clock,
  Sparkles,
  Workflow,
  Search,
  AlertTriangle,
  FolderPlus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

interface CompanyDetailStudioProps {
  slug: string;
}

interface CompanyNoteHit {
  path: string;
  title: string;
  preview: string;
  score: number;
  mtime: number;
}

type TabType = "overview" | "team" | "kanban" | "vault" | "galaxy" | "archify";

export default function CompanyDetailStudio({ slug }: CompanyDetailStudioProps) {
  const { companies, activeCompanyId, setActiveCompanyId, updateCompany } = useCompany();
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);


  // Vault live note state
  const [vaultContent, setVaultContent] = useState<string>("");
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  // Company Knowledge Hub State
  const [companyNotes, setCompanyNotes] = useState<CompanyNoteHit[]>([]);
  const [isLoadingCompanyNotes, setIsLoadingCompanyNotes] = useState(false);
  const [companyNotesSearch, setCompanyNotesSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<{ path: string; content: string } | null>(null);

  // Fast Ingest Modal State
  const [isFastIngestOpen, setIsFastIngestOpen] = useState(false);
  const [isMultimodalIngestOpen, setIsMultimodalIngestOpen] = useState(false);

  // Create Note Modal State
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("ficha_maestra");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Taxonomy State
  const [organizingTaxonomy, setOrganizingTaxonomy] = useState(false);

  const handleOrganizeTaxonomy = async () => {
    if (!company) return;
    try {
      setOrganizingTaxonomy(true);
      const res = await fetch("/api/vault/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companySlug: company.id, companyName: company.name }),
      });
      if (!res.ok) throw new Error("Failed to organize taxonomy");
      await loadCompanyNotes();
    } catch (err) {
      console.error("Error organizing taxonomy:", err);
    } finally {
      setOrganizingTaxonomy(false);
    }
  };

  // Scoped Hermes RAG Query State

  const [askQuestion, setAskQuestion] = useState("");
  const [askingHermes, setAskingHermes] = useState(false);
  const [hermesResponse, setHermesResponse] = useState<{
    query: string;
    answerText: string;
    isGrounded: boolean;
    groundingScore: number;
    citations: { path: string; filename: string; title: string; sha256: string; snippet: string }[];
  } | null>(null);

  // Sync company from context
  useEffect(() => {
    const found = companies.find((c) => c.id === slug);
    if (found) {
      setCompany(found);
    }
  }, [companies, slug]);

  const availableCategories = Array.from(
    new Set(companies.map((c) => c.category).filter(Boolean))
  );

  // Fetch Vault note live
  const loadVaultNote = useCallback(async () => {
    if (!company || !company.vaultPath) return;
    setIsVaultLoading(true);
    setVaultError(null);
    try {
      const res = await fetch(`/api/vault/file?path=${encodeURIComponent(company.vaultPath)}`);
      const data = await res.json();
      if (data.success && data.content) {
        setVaultContent(data.content);
      } else {
        setVaultError(data.error || "No se pudo cargar la nota del Vault.");
      }
    } catch (err: any) {
      setVaultError(err?.message || "Error al conectar con la API del Vault.");
    } finally {
      setIsVaultLoading(false);
    }
  }, [company]);

  const loadCompanyNotes = useCallback(async () => {
    if (!company) return;
    setIsLoadingCompanyNotes(true);
    try {
      const res = await fetch(`/api/companies/notes?slug=${encodeURIComponent(company.id)}&name=${encodeURIComponent(company.name)}`);
      const data = await res.json();
      if (data.success) {
        setCompanyNotes(data.notes || []);
      }
    } catch (err) {
      console.error("Error loading company notes:", err);
    } finally {
      setIsLoadingCompanyNotes(false);
    }
  }, [company]);

  const openNotePath = useCallback(async (relPath: string) => {
    try {
      const res = await fetch(`/api/memory/note?path=${encodeURIComponent(relPath)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedNote({ path: data.path, content: data.content });
    } catch (err) {
      console.error("Error reading note:", err);
    }
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    if (!company) return;
    setSelectedTemplateId(templateId);
    const tpl = COMPANY_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setCreateTitle(tpl.defaultTitle(company.name));
      setCreateContent(tpl.generateMarkdown(company.id, company.name));
    }
  }, [company]);

  const openCreateNoteModal = useCallback((templateId = "ficha_maestra") => {
    setIsCreateNoteModalOpen(true);
    handleSelectTemplate(templateId);
  }, [handleSelectTemplate]);

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !createTitle.trim() || !createContent.trim() || isCreatingNote) return;
    setIsCreatingNote(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/companies/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companySlug: company.id,
          companyName: company.name,
          title: createTitle,
          content: createContent,
          category: "Master_Sources/Empresas",
          squads: company.assignedSquads || [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateTitle("");
        setCreateContent("");
        setIsCreateNoteModalOpen(false);
        await loadCompanyNotes();
        if (data.path) {
          await openNotePath(data.path);
        }
      } else {
        setCreateError(data.error || "Error al crear la nota.");
      }
    } catch (err: any) {
      setCreateError(err?.message || "Error al conectar con la API.");
    } finally {
      setIsCreatingNote(false);
    }
  }

  async function handleAskHermes(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!askQuestion.trim() || askingHermes || !company) return;
    setAskingHermes(true);
    try {
      const res = await fetch("/api/memory/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `[Empresa: ${company.name}] ${askQuestion}`,
          squadId: company.assignedSquads?.[0] || "squad_1_ceo",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHermesResponse(data);
      }
    } catch (err) {
      console.error("Error querying Hermes RAG:", err);
    } finally {
      setAskingHermes(false);
    }
  }

  useEffect(() => {
    if (activeTab === "vault" && company) {
      loadVaultNote();
      loadCompanyNotes();
      if (company.vaultPath && !selectedNote) {
        openNotePath(company.vaultPath);
      }
    }
  }, [activeTab, company, loadVaultNote, loadCompanyNotes, openNotePath, selectedNote]);

  if (!company) {
    return (
      <div className="bg-[#0c140c] border border-[#182818] p-12 rounded-3xl text-center space-y-4 font-sans">
        <Building2 size={48} className="mx-auto text-slate-600 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Cargando Ficha de la Empresa...</h2>
        <p className="text-xs text-slate-400">ID / Slug: {slug}</p>
        <Link
          href="/empresas"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-xs font-mono text-[#22c55e]"
        >
          <ArrowLeft size={14} /> Volver al Hub de Empresas
        </Link>
      </div>
    );
  }

  const isFocused = activeCompanyId === company.id;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/empresas"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0c140c] border border-[#182818] hover:border-[#22c55e]/40 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition"
        >
          <ArrowLeft size={14} /> Volver al Hub de Empresas
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCompanyId(isFocused ? "all" : company.id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 border ${
              isFocused
                ? "bg-[#142614] text-[#22c55e] border-[#22c55e]"
                : "bg-[#050805] text-slate-300 border-[#182818] hover:bg-[#142614]"
            }`}
          >
            <Target size={14} />
            {isFocused ? "Empresa Enfocada" : "Focar nesta Empresa"}
          </button>

          <button
            onClick={handleOrganizeTaxonomy}
            disabled={organizingTaxonomy}
            className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            title="Estandarizar jerarquía de carpetas y vincular wikilinks para la galaxia 3D"
          >
            <Sparkles size={13} className={`text-purple-400 ${organizingTaxonomy ? "animate-spin" : ""}`} />
            {organizingTaxonomy ? "Organizando..." : "🧹 Organizar Jerarquía Vault"}
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition"
            title="Generar y exportar reporte ejecutivo para cliente en 1-Click (PDF o Markdown)"
          >
            <FileText size={13} className="text-cyan-400" /> 📥 Reporte Ejecutivo (PDF/MD)
          </button>

          <button
            onClick={() => setIsMultimodalIngestOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition"
            title="Ingestar audios, PDFs, videos e imágenes con visión e IA"
          >
            <Zap size={13} className="text-emerald-400" /> 📥 Ingesta Multimodal (IA)
          </button>


          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#050805] border border-[#182818] hover:border-white/40 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-1.5 transition"
          >
            <Pencil size={13} /> Editar Ficha
          </button>
        </div>
      </div>


      {/* Hero Header Card */}
      <div
        className="bg-[#0c140c] border rounded-3xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden"
        style={{ borderColor: company.accentColor || "#182818" }}
      >
        {/* Accent Color Strip Top */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: company.accentColor }}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-3 py-1 text-xs font-mono font-bold uppercase rounded-full border flex items-center gap-1.5"
                style={{
                  backgroundColor: `${company.accentColor}20`,
                  color: company.accentColor,
                  borderColor: `${company.accentColor}60`,
                }}
              >
                <Tag size={12} /> {company.category}
              </span>

              {isFocused && (
                <span className="px-3 py-1 text-xs font-mono font-bold uppercase bg-[#142614] text-[#22c55e] border border-[#22c55e]/50 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> FOCUS ACTIVE
                </span>
              )}

              <span className="px-2.5 py-1 text-[10px] font-mono text-slate-400 bg-[#050805] border border-[#182818] rounded-full uppercase">
                {company.status}
              </span>
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                {company.name}
              </h1>
              {company.location && (
                <span className="text-xs font-mono text-slate-400 mt-1 inline-flex items-center gap-1">
                  <MapPin size={13} className="text-cyan-400" /> {company.location}
                </span>
              )}
            </div>

            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {company.description}
            </p>
          </div>

          {/* Quick Vault Link */}
          {company.vaultPath && (
            <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl text-right space-y-1">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Vault Note Path</span>
              <span className="text-xs font-mono text-emerald-400 block truncate max-w-xs">
                📄 {company.vaultPath}
              </span>
            </div>
          )}
        </div>

        {/* Counter Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#182818]">
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Metas Estratégicas</span>
            <span className="text-2xl font-mono font-black text-emerald-400">
              {company.goals?.length || 0}
            </span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Squads Involucrados</span>
            <span className="text-2xl font-mono font-black text-cyan-400">
              {company.assignedSquads?.length || 0}
            </span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Agentes IA Asignados</span>
            <span className="text-2xl font-mono font-black text-purple-400">
              {company.assignedAgents?.length || 0}
            </span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Personas Clave</span>
            <span className="text-2xl font-mono font-black text-amber-400">
              {company.peopleInvolved?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Internal Tabs Bar */}
      <div className="flex items-center gap-2 bg-[#0c140c] border border-[#182818] p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers size={14} /> Visión General & Metas
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "team"
              ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users size={14} /> Squads & Agentes
        </button>

        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "kanban"
              ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LayoutDashboard size={14} /> Tareas & Kanban
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "vault"
              ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Brain size={14} /> Memoria & Vault Live
        </button>

        <button
          onClick={() => setActiveTab("galaxy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "galaxy"
              ? "bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles size={14} className="text-purple-400" /> 🌌 Memory Galaxy 3D
        </button>

        <button
          onClick={() => setActiveTab("archify")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap ${
            activeTab === "archify"
              ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Workflow size={14} /> 📐 Arquitectura & Diagramas
        </button>
      </div>

      {/* Tab: Memory Galaxy 3D */}
      {activeTab === "galaxy" && (
        <div className="w-full">
          <CompanyMemoryGalaxyWidget companySlug={company.id} companyName={company.name} height="600px" />
        </div>
      )}


      {/* Tab 1: Visión General & Metas */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <CompanyContextDigestWidget companySlug={company.id} companyName={company.name} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Main Goals & Context */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Target size={18} className="text-[#22c55e]" /> Metas Estratégicas
              </h2>
              {company.goals && company.goals.length > 0 ? (
                <div className="space-y-3">
                  {company.goals.map((goalText, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#050805] border border-[#182818] rounded-2xl flex items-start gap-3"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-xs shrink-0 font-bold mt-0.5"
                        style={{
                          backgroundColor: `${company.accentColor}20`,
                          color: company.accentColor,
                          border: `1px solid ${company.accentColor}60`,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-200 font-mono leading-relaxed">{goalText}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Sin metas estratégicas definidas.</p>
              )}
            </div>

            {/* People & Contacts */}
            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users size={18} className="text-blue-400" /> Personas Clave & Contactos
              </h2>
              {company.peopleInvolved && company.peopleInvolved.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {company.peopleInvolved.map((person, idx) => (
                    <div key={idx} className="p-3.5 bg-[#050805] border border-[#182818] rounded-2xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-mono text-white">{person.name}</strong>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-[#142614] text-[#22c55e] border border-[#22c55e]/30 rounded-full">
                          {person.type}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400">{person.role}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Sin contactos registrados.</p>
              )}
            </div>
          </div>

          {/* Sidebar Info & Resources */}
          <div className="space-y-6">
            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
              <h3 className="text-sm font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" /> Sitios Web & Enlaces
              </h3>
              {company.websites && company.websites.length > 0 ? (
                <div className="space-y-2">
                  {company.websites.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-[#050805] border border-[#182818] hover:border-cyan-500/50 rounded-2xl flex items-center justify-between text-xs font-mono text-cyan-300 transition group"
                    >
                      <span className="truncate">{url}</span>
                      <ExternalLink size={13} className="shrink-0 group-hover:scale-110 transition" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-mono">Sin sitios web configurados.</p>
              )}
            </div>

            {/* Timestamps */}
            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-3 font-mono text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Metadatos del Sistema</span>
              <div className="space-y-1.5 text-slate-300">
                <div>
                  <span className="text-slate-500">Slug ID:</span> {company.id}
                </div>
                <div>
                  <span className="text-slate-500">Alta:</span> {new Date(company.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="text-slate-500">Actualización:</span> {new Date(company.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}



      {/* Tab 2: Squads & Agentes */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assigned Squads */}
          <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users size={18} className="text-emerald-400" /> Squads Involucrados ({company.assignedSquads?.length || 0})
            </h2>
            {company.assignedSquads && company.assignedSquads.length > 0 ? (
              <div className="space-y-3">
                {company.assignedSquads.map((squadName, idx) => (
                  <div key={idx} className="p-4 bg-[#050805] border border-[#182818] rounded-2xl space-y-1">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">{squadName}</span>
                    <p className="text-xs text-slate-300 font-mono">
                      Equipo operativo asignado para ejecución de objetivos y sprints de la empresa.
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Sin Squads asignados.</p>
            )}
          </div>

          {/* Assigned Agents */}
          <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Bot size={18} className="text-purple-400" /> Agentes de IA Asignados ({company.assignedAgents?.length || 0})
            </h2>
            {company.assignedAgents && company.assignedAgents.length > 0 ? (
              <div className="space-y-3">
                {company.assignedAgents.map((agentName, idx) => (
                  <div key={idx} className="p-4 bg-[#050805] border border-[#182818] rounded-2xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono font-bold text-purple-300 block">@{agentName}</span>
                      <span className="text-[10px] font-mono text-slate-400">Agente Autónomo Nipëi OS</span>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/40 rounded-full">
                      ACTIVO
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Sin agentes asignados.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Tareas & Kanban */}
      {activeTab === "kanban" && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <LayoutDashboard size={18} className="text-[#22c55e]" /> Tablero Kanban de {company.name}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Tareas y metas filtradas únicamente para la empresa en foco.
              </p>
            </div>
          </div>
          <div className="pt-2">
            <AgentKanban />
          </div>
        </div>
      )}

      {/* Tab 4: Memoria & Hub de Conocimiento de Empresa */}
      {activeTab === "vault" && (
        <div className="space-y-6 font-sans">
          {/* Header & Quick Action Banner */}
          <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#182818] pb-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Brain size={20} className="text-emerald-400" /> Hub de Conocimiento de {company.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Gestión, vinculación y acrecentamiento de memoria viva en <code className="text-emerald-400">nipei-vault</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFastIngestOpen(true)}
                  className="px-3.5 py-2 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Zap size={14} className="animate-pulse" /> ⚡ Ingesta Rápida (1-Click)
                </button>

                <button
                  onClick={() => setIsCreateNoteModalOpen(true)}
                  className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-mono font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-green-950/40"
                >
                  <Plus size={15} /> ➕ Agregar Nota
                </button>

                <button
                  onClick={loadCompanyNotes}
                  className="p-2 text-slate-400 hover:text-white hover:bg-[#142614] rounded-xl border border-[#182818] transition"
                  title="Recargar conocimiento de empresa"
                >
                  <RefreshCw size={15} className={isLoadingCompanyNotes ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Hermes RAG Consultation Card (Scoped to Company) */}
            <div className="p-4 rounded-2xl border border-[#1f3a22] bg-[#050c06] text-xs font-mono space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#22c55e] animate-pulse" />
                  <span className="font-bold text-slate-200 text-[13px]">
                    Consultar a Hermes 2.0 <span className="text-[10px] text-[#22c55e] font-normal border border-[#22c55e]/30 px-1.5 py-0.5 rounded ml-1 bg-[#142614]">Contexto: {company.name}</span>
                  </span>
                </div>
                {hermesResponse && (
                  <button onClick={() => setHermesResponse(null)} className="text-[10px] text-slate-400 hover:text-white">
                    Limpiar consulta ✕
                  </button>
                )}
              </div>

              <form onSubmit={handleAskHermes} className="flex gap-2">
                <input
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  placeholder={`Haz una pregunta sobre los objetivos, infraestructura o notas de ${company.name}...`}
                  className="flex-1 bg-[#09120a] border border-[#182a1b] text-slate-200 placeholder:text-slate-500 rounded-xl px-3.5 py-2 outline-none focus:border-[#22c55e]/60 transition font-sans text-xs"
                />
                <button
                  type="submit"
                  disabled={askingHermes || !askQuestion.trim()}
                  className="px-4 py-2 bg-[#142614] hover:bg-[#1f381f] border border-[#22c55e]/40 disabled:opacity-50 text-[#22c55e] font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  {askingHermes ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {askingHermes ? "Buscando en Vault..." : "Consultar"}
                </button>
              </form>

              {hermesResponse && (
                <div className="mt-3 p-3.5 rounded-xl border bg-[#081009] border-[#1b351e]">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#182818]">
                    <span className="px-2 py-0.5 rounded bg-[#142614] border border-[#22c55e]/50 text-[#22c55e] text-[10px] font-bold flex items-center gap-1">
                      <ShieldCheck size={11} /> Certificado por Vault (Grounding: {(hermesResponse.groundingScore * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="text-slate-300 text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans mb-3">
                    {hermesResponse.answerText}
                  </div>
                  {hermesResponse.citations && hermesResponse.citations.length > 0 && (
                    <div className="pt-2 border-t border-[#182818] grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {hermesResponse.citations.map((cit) => (
                        <button
                          key={cit.path}
                          onClick={() => openNotePath(cit.path)}
                          className="text-left p-2 rounded-lg bg-[#0c160d] border border-[#1b331f] hover:border-[#22c55e]/60 transition"
                        >
                          <div className="text-[11px] font-bold text-[#22c55e] truncate">{cit.title}</div>
                          <div className="text-[9.5px] text-slate-500 font-mono truncate">{cit.path}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vault Todo Extractor Widget for this Company */}
          <VaultTodoExtractorWidget companySlug={company.id} companyName={company.name} />

          {/* Vault Freshness & Conflict Audit Widget */}
          <VaultConflictAuditWidget companySlug={company.id} companyName={company.name} />

          {/* Vault Semantic Linker Widget */}
          <VaultSemanticLinkerWidget
            companySlug={company.id}
            companyName={company.name}
            onLinksUpdated={loadCompanyNotes}
          />

          {/* Inbox Webhook Simulator & Future Roadmap Widget */}
          <InboxWebhookSimulatorWidget companySlug={company.id} companyName={company.name} />

          {/* Main Two-Column Layout: Left (Notes List), Right (Rich Note Viewer/Editor) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Linked Notes List (5 cols) */}
            <div className="lg:col-span-5 bg-[#0c140c] border border-[#182818] p-4 rounded-3xl space-y-3 flex flex-col max-h-[700px]">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-400" /> Notas Vinculadas ({companyNotes.length})
                </span>
              </div>

              {/* Search filter for notes */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#050805] border border-[#182818] rounded-xl text-xs font-mono">
                <Search size={13} className="text-slate-500" />
                <input
                  type="text"
                  value={companyNotesSearch}
                  onChange={(e) => setCompanyNotesSearch(e.target.value)}
                  placeholder="Filtrar notas..."
                  className="bg-transparent outline-none flex-1 text-slate-200 placeholder:text-slate-600"
                />
              </div>

              {/* Notes List */}
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 font-sans">
                {/* Main Vault Note Pin */}
                {company.vaultPath && (
                  <button
                    onClick={() => openNotePath(company.vaultPath)}
                    className={`w-full text-left p-3 rounded-2xl border transition ${
                      selectedNote?.path === company.vaultPath
                        ? "bg-[#142614] border-[#22c55e] text-white shadow-md shadow-green-950/40"
                        : "bg-[#050805] border-[#182818] hover:border-[#22c55e]/40 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-emerald-400 truncate">📄 Nota Viva Principal</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded">
                        PIN
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-1">{company.vaultPath}</p>
                  </button>
                )}

                {/* Dynamic Knowledge Notes */}
                {companyNotes
                  .filter((n) => n.path !== company.vaultPath)
                  .filter((n) => !companyNotesSearch || n.title.toLowerCase().includes(companyNotesSearch.toLowerCase()) || n.path.toLowerCase().includes(companyNotesSearch.toLowerCase()))
                  .map((note) => (
                    <button
                      key={note.path}
                      onClick={() => openNotePath(note.path)}
                      className={`w-full text-left p-3 rounded-2xl border transition ${
                        selectedNote?.path === note.path
                          ? "bg-[#142614] border-[#22c55e] text-white shadow-md shadow-green-950/40"
                          : "bg-[#050805] border-[#182818] hover:border-[#22c55e]/30 text-slate-300"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200 truncate">{note.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{note.path}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug font-sans">{note.preview}</div>
                    </button>
                  ))}

                {companyNotes.length === 0 && !isLoadingCompanyNotes && (
                  <div className="p-6 text-center text-xs font-mono text-slate-500 space-y-2">
                    <p>No se encontraron notas secundarias asociadas.</p>
                    <button
                      onClick={() => setIsCreateNoteModalOpen(true)}
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      ➕ Crear la primera nota
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Embedded Rich Markdown Viewer & Editor (7 cols) */}
            <div className="lg:col-span-7 min-h-[500px] flex flex-col">
              {selectedNote ? (
                <RichNoteViewerModal
                  path={selectedNote.path}
                  initialContent={selectedNote.content}
                  onClose={() => setSelectedNote(null)}
                  onSaveSuccess={(savedPath, newContent) => {
                    setSelectedNote({ path: savedPath, content: newContent });
                    loadCompanyNotes();
                  }}
                />
              ) : (
                <div className="flex-1 bg-[#0c140c] border border-[#182818] rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-3 font-mono text-xs text-slate-500">
                  <Brain size={40} className="text-emerald-400/30 animate-pulse" />
                  <p className="text-slate-300 font-bold text-sm">Selecciona una nota para ver su contenido Rich Markdown y editarla in-situ.</p>
                  <p className="max-w-md text-slate-500">Toda modificación se guarda atómicamente en el sistema de archivos del Vault y sincroniza con los agentes.</p>
                </div>
              )}
            </div>
          </div>

          {/* Create New Knowledge Note Modal */}
          {isCreateNoteModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0c140c] border border-[#1f3a22] p-6 md:p-8 rounded-3xl max-w-2xl w-full space-y-5 shadow-2xl font-sans"
              >
                <div className="flex items-center justify-between border-b border-[#182818] pb-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FolderPlus size={20} className="text-emerald-400" /> Crear Nueva Nota de Conocimiento para {company.name}
                  </h3>
                  <button
                    onClick={() => setIsCreateNoteModalOpen(false)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateNote} className="space-y-4">
                  {/* Template Selector Pills */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <label className="text-slate-300 font-bold block">Seleccionar Plantilla Estandarizada</label>
                    <div className="grid grid-cols-2 gap-2">
                      {COMPANY_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectTemplate(tpl.id)}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            selectedTemplateId === tpl.id
                              ? "bg-[#142614] border-[#22c55e] text-white font-bold shadow"
                              : "bg-[#050805] border-[#182818] text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <div className="text-[11px] text-[#22c55e] font-bold">{tpl.title}</div>
                          <div className="text-[9.5px] text-slate-500 font-sans truncate">{tpl.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    <label className="text-slate-300 font-bold">Título de la Nota</label>
                    <input
                      type="text"
                      required
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                      placeholder="Ej. Minuta de Arquitectura y Configuración VPS Hostinger"
                      className="w-full bg-[#050805] border border-[#182818] focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    <label className="text-slate-300 font-bold">Contenido Markdown</label>
                    <textarea
                      required
                      rows={10}
                      value={createContent}
                      onChange={(e) => setCreateContent(e.target.value)}
                      placeholder="Escribe el conocimiento en formato Markdown (encabezados, viñetas, fragmentos de código)..."
                      className="w-full bg-[#050805] border border-[#182818] focus:border-emerald-500/60 rounded-xl p-3.5 text-slate-200 outline-none font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {createError && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs font-mono text-red-200">
                      ⚠️ {createError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateNoteModalOpen(false)}
                      className="px-4 py-2 bg-[#050805] border border-[#182818] text-slate-300 hover:text-white rounded-xl text-xs font-mono"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingNote}
                      className="px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-mono font-bold text-xs rounded-xl transition flex items-center gap-2"
                    >
                      {isCreatingNote ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                      {isCreatingNote ? "Guardando en Vault..." : "Guardar en Vault"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Arquitectura & Diagramas Archify */}
      {activeTab === "archify" && (
        <div className="space-y-6">
          <ArchifyDiagramWidget
            prebuiltId={company.id === "ini-rau" ? "ini-rau-dataflow" : undefined}
            defaultTopic={`Empresa ${company.name}: ${company.description}`}
            defaultType={company.id === "ini-rau" ? "dataflow" : "architecture"}
            title={`Diagramas & Arquitectura — ${company.name}`}
            height="620px"
          />
        </div>
      )}

      {/* Fast Ingest Modal */}
      <FastIngestModal
        isOpen={isFastIngestOpen}
        onClose={() => setIsFastIngestOpen(false)}
        defaultCompanySlug={company.id}
        defaultCompanyName={company.name}
        onIngestSuccess={async (newPath) => {
          await loadCompanyNotes();
          if (newPath) await openNotePath(newPath);
        }}
      />

      {/* Edit Modal */}
      <CompanyEditModal
        company={company}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={async (id, updatedData) => {
          await updateCompany(id, updatedData);
        }}
        availableCategories={availableCategories}
      />

      {/* Executive Report Exporter Modal */}
      {isReportModalOpen && (
        <CompanyReportExporterModal
          companySlug={company.id}
          companyName={company.name}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Multimodal Ingestion Modal */}
      <MultimodalIngestionModal
        isOpen={isMultimodalIngestOpen}
        onClose={() => setIsMultimodalIngestOpen(false)}
        defaultCompanySlug={company.id}
        defaultCompanyName={company.name}
        onSuccess={() => {
          loadCompanyNotes();
        }}
      />
    </div>
  );
}

