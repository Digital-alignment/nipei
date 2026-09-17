"use client";

import React, { useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import {
  Building2,
  Plus,
  Search,
  Globe,
  Archive,
  Target,
  Users,
  Bot,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function CompanyHubStudio() {
  const { companies, activeCompanyId, setActiveCompanyId, archiveCompany, isLoading } = useCompany();
  const [filterCategory, setFilterCategory] = useState<"all" | "client" | "product">("all");
  const [filterStatus, setFilterStatus] = useState<"active" | "archived">("active");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompanies = companies.filter((c) => {
    const matchesCategory = filterCategory === "all" || c.category === filterCategory;
    const matchesStatus = c.status === filterStatus;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const activeCount = companies.filter((c) => c.status === "active").length;
  const clientCount = companies.filter((c) => c.category === "client" && c.status === "active").length;
  const productCount = companies.filter((c) => c.category === "product" && c.status === "active").length;
  const archivedCount = companies.filter((c) => c.status === "archived").length;

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest uppercase bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-full flex items-center gap-2">
              <Building2 size={14} />
              NIPËI OS — CENTRO DE GESTIÓN MULTI-EMPRESA
            </span>
            <span className="px-3 py-1 text-xs font-mono font-bold uppercase bg-[#050805] text-[#a7f3d0] border border-[#182818] rounded-full">
              AGENCY PORTFOLIO HUB
            </span>
          </div>

          <Link
            href="/empresas/nueva"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition shadow-lg"
          >
            <Plus size={16} />
            <span>Alta de Nueva Empresa</span>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Gestión Multi-Empresa <span className="text-[#22c55e]">& Clientes</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8aa88a] mt-2 max-w-3xl leading-relaxed font-medium">
            Supervisa el portafolio consolidado de Digital Alignment. Alterna entre la vista global o enfócate en una empresa específica para filtrar todo el sistema operacional.
          </p>
        </div>

        {/* Portfolio Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Empresas Activas</span>
            <span className="text-xl font-mono font-black text-[#22c55e]">{activeCount}</span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Clientes Externos</span>
            <span className="text-xl font-mono font-black text-emerald-400">{clientCount}</span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Productos Propios DA</span>
            <span className="text-xl font-mono font-black text-purple-400">{productCount}</span>
          </div>
          <div className="bg-[#050805] border border-[#182818] p-3 rounded-2xl text-center">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Archivadas</span>
            <span className="text-xl font-mono font-black text-amber-400">{archivedCount}</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0c140c] border border-[#182818] p-4 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-[#050805] p-1 rounded-xl border border-[#182818]">
            {[
              { key: "all", label: "Todas" },
              { key: "client", label: "Clientes Externos" },
              { key: "product", label: "Productos DA" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterCategory(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  filterCategory === tab.key
                    ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#050805] p-1 rounded-xl border border-[#182818]">
            <button
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                filterStatus === "active"
                  ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Activas ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus("archived")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                filterStatus === "archived"
                  ? "bg-[#281c0c] text-amber-400 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Archivadas ({archivedCount})
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empresa por nombre o ciudad..."
            className="w-full bg-[#050805] text-white border border-[#182818] pl-9 pr-3 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
          />
        </div>
      </div>

      {/* Grid of Companies */}
      {filteredCompanies.length === 0 ? (
        <div className="bg-[#0c140c] border border-[#182818] p-12 rounded-3xl text-center space-y-3">
          <Building2 size={40} className="mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-white">No se encontraron empresas</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No hay empresas que coincidan con los filtros seleccionados o el término de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((c) => {
            const isFocused = activeCompanyId === c.id;
            return (
              <div
                key={c.id}
                className={`bg-[#0c140c] border rounded-3xl p-6 space-y-4 transition-all relative flex flex-col justify-between group ${
                  isFocused
                    ? "border-[#22c55e] shadow-lg shadow-[#22c55e]/10"
                    : "border-[#182818] hover:border-[#22c55e]/40"
                }`}
                style={{
                  borderColor: isFocused ? c.accentColor : undefined,
                }}
              >
                {/* Card Top */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: c.accentColor }}
                      />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {c.category === "client" ? "Cliente Externo" : "Producto Propio DA"}
                      </span>
                    </div>

                    {isFocused ? (
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> ENFOCADA
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">{c.status}</span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-white group-hover:text-[#22c55e] transition">
                      {c.name}
                    </h2>
                    {c.location && (
                      <span className="text-xs font-mono text-slate-400">📍 {c.location}</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-snug line-clamp-3">
                    {c.description}
                  </p>

                  {/* Strategic Goals List */}
                  {c.goals && c.goals.length > 0 && (
                    <div className="pt-2 border-t border-[#182818] space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Metas Clave ({c.goals.length})
                      </span>
                      <ul className="text-xs text-slate-300 space-y-0.5 font-mono">
                        {c.goals.slice(0, 2).map((g, idx) => (
                          <li key={idx} className="truncate flex items-center gap-1.5">
                            <span style={{ color: c.accentColor }}>•</span>
                            <span className="truncate">{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Squads & Agents Badges */}
                  <div className="pt-2 border-t border-[#182818] space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {c.assignedSquads.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-mono bg-[#050805] text-emerald-400 border border-[#182818] rounded-md"
                        >
                          {s}
                        </span>
                      ))}
                      {c.assignedAgents.map((a, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-mono bg-[#050805] text-purple-300 border border-[#182818] rounded-md"
                        >
                          @{a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-[#182818] flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => setActiveCompanyId(isFocused ? "all" : c.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 border ${
                      isFocused
                        ? "bg-[#050805] text-slate-300 border-[#182818] hover:bg-[#142614]"
                        : "bg-[#142614] text-[#22c55e] border-[#22c55e]/40 hover:bg-[#1f381f]"
                    }`}
                  >
                    <Target size={13} />
                    {isFocused ? "Desenfocar (Ver Todas)" : "Focar nesta Empresa"}
                  </button>

                  {c.status === "active" && (
                    <button
                      onClick={() => archiveCompany(c.id)}
                      title="Archivar Empresa"
                      className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl border border-[#182818] transition"
                    >
                      <Archive size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
