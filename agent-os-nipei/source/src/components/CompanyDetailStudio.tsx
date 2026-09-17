"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useCompany } from "@/context/CompanyContext";
import { Company } from "@/types/company";
import CompanyEditModal from "./CompanyEditModal";
import AgentKanban from "./AgentKanban";
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
} from "lucide-react";
import Link from "next/link";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

interface CompanyDetailStudioProps {
  slug: string;
}

type TabType = "overview" | "team" | "kanban" | "vault" | "archify";

export default function CompanyDetailStudio({ slug }: CompanyDetailStudioProps) {
  const { companies, activeCompanyId, setActiveCompanyId, updateCompany } = useCompany();
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Vault live note state
  const [vaultContent, setVaultContent] = useState<string>("");
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultViewMode, setVaultViewMode] = useState<"rendered" | "raw">("rendered");

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

  useEffect(() => {
    if (activeTab === "vault" && company) {
      loadVaultNote();
    }
  }, [activeTab, company, loadVaultNote]);

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

      {/* Tab 1: Visión General & Metas */}
      {activeTab === "overview" && (
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

      {/* Tab 4: Memoria & Vault Live */}
      {activeTab === "vault" && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#182818] pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Brain size={18} className="text-emerald-400" /> Nota Viva del Vault (Sincronización en Tiempo Real)
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Archivo: <code className="text-emerald-400">{company.vaultPath}</code>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#050805] p-1 rounded-xl border border-[#182818]">
                <button
                  onClick={() => setVaultViewMode("rendered")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                    vaultViewMode === "rendered"
                      ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText size={12} className="inline mr-1" /> Renderizado
                </button>
                <button
                  onClick={() => setVaultViewMode("raw")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                    vaultViewMode === "raw"
                      ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Code2 size={12} className="inline mr-1" /> Raw Markdown
                </button>
              </div>

              <button
                onClick={loadVaultNote}
                className="p-2 text-slate-400 hover:text-white hover:bg-[#142614] rounded-xl border border-[#182818] transition"
                title="Recargar nota del Vault"
              >
                <RefreshCw size={14} className={isVaultLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Vault Note Viewer Content */}
          {isVaultLoading ? (
            <div className="p-12 text-center space-y-3 font-mono text-xs text-slate-400">
              <RefreshCw size={24} className="mx-auto text-emerald-400 animate-spin" />
              <p>Cargando archivo Markdown desde `nipei-vault`...</p>
            </div>
          ) : vaultError ? (
            <div className="p-6 bg-red-950/40 border border-red-500/40 rounded-2xl text-xs font-mono text-red-200">
              ⚠️ {vaultError}
            </div>
          ) : vaultViewMode === "rendered" ? (
            <div className="p-6 bg-[#050805] border border-[#182818] rounded-2xl prose prose-invert max-w-none text-xs leading-relaxed font-sans">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{vaultContent}</ReactMarkdown>
            </div>
          ) : (
            <pre className="p-6 bg-[#050805] border border-[#182818] rounded-2xl text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
              {vaultContent}
            </pre>
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
    </div>
  );
}
