"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Network, ShieldCheck, Crown, Users, Brain, Workflow, Building2,
  Package, ShoppingBag, Wrench, FileSpreadsheet, ArrowUpRight, Plus,
  Edit3, ArrowUp, ArrowDown, CheckCircle2, ShieldAlert, Sparkles, Filter,
  AlertTriangle, Search, UserCheck
} from "lucide-react";
import {
  SQUADS, INITIAL_SQUADS, INITIAL_MEMBERS, type SquadMeta, type NucleusRole,
  type SquadId, type MemberProfile
} from "@/lib/nipeiStore";
import SquadEditDrawer from "./SquadEditDrawer";
import MemberProfileModal from "./MemberProfileModal";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

export default function OrganogramaView() {
  const [activeTab, setActiveTab] = useState<"squads" | "members">("squads");
  const [squadsList, setSquadsList] = useState<SquadMeta[]>(INITIAL_SQUADS);
  const [membersList, setMembersList] = useState<MemberProfile[]>(INITIAL_MEMBERS);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleusRole | "all">("all");
  const [memberFilterStatus, setMemberFilterStatus] = useState<"all" | "approved" | "pending" | "missing">("all");
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>("");

  const [showArchifyWorkflow, setShowArchifyWorkflow] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingSquad, setEditingSquad] = useState<SquadMeta | null>(null);

  const [selectedMemberModal, setSelectedMemberModal] = useState<MemberProfile | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Load Squads & Members from localStorage on mount
  useEffect(() => {
    const savedSquads = localStorage.getItem("nipei_squads_store");
    if (savedSquads) {
      try {
        const parsed = JSON.parse(savedSquads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSquadsList(parsed);
        }
      } catch (e) {
        console.error("Error loading saved squads", e);
      }
    }

    const savedMembers = localStorage.getItem("nipei_members_store");
    if (savedMembers) {
      try {
        const parsed = JSON.parse(savedMembers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembersList(parsed);
        }
      } catch (e) {
        console.error("Error loading saved members", e);
      }
    }
  }, []);

  const saveSquadsToStore = (newSquads: SquadMeta[]) => {
    const sorted = [...newSquads].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setSquadsList(sorted);
    localStorage.setItem("nipei_squads_store", JSON.stringify(sorted));
  };

  const saveMembersToStore = (newMembers: MemberProfile[]) => {
    setMembersList(newMembers);
    localStorage.setItem("nipei_members_store", JSON.stringify(newMembers));
  };

  const handleOpenAddSquad = () => {
    setEditingSquad(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditSquad = (sq: SquadMeta) => {
    setEditingSquad(sq);
    setIsDrawerOpen(true);
  };

  const handleSaveSquad = async (updatedSquad: SquadMeta) => {
    const exists = squadsList.some((s) => s.id === updatedSquad.id);
    let renameLog: any = undefined;

    if (exists && editingSquad && editingSquad.name !== updatedSquad.name) {
      renameLog = {
        previousName: editingSquad.name,
        newName: updatedSquad.name,
        changedAt: new Date().toISOString(),
        changedBy: "Ana Castro (CEO)",
      };
    }

    let newList: SquadMeta[];
    if (exists) {
      newList = squadsList.map((s) => (s.id === updatedSquad.id ? updatedSquad : s));
    } else {
      newList = [...squadsList, updatedSquad];
    }

    saveSquadsToStore(newList);

    // Sync to Nipëi Vault via API Route
    try {
      const res = await fetch("/api/squads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad: updatedSquad, renameLog }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✅ Squad "${updatedSquad.name}" sincronizado con Nipëi Vault.`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error al sincronizar Squad con Vault:", err);
    }
  };

  const handleDeleteSquad = (squadId: string) => {
    const newList = squadsList.filter((s) => s.id !== squadId);
    saveSquadsToStore(newList);
    setIsDrawerOpen(false);
    setSyncMessage(`🗑️ Squad archivado con éxito.`);
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const moveSquadOrder = (squadId: string, direction: "up" | "down") => {
    const index = squadsList.findIndex((s) => s.id === squadId);
    if (index < 0) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === squadsList.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newList = [...squadsList];

    // Swap sortOrder
    const tempOrder = newList[index].sortOrder ?? index;
    newList[index].sortOrder = newList[targetIndex].sortOrder ?? targetIndex;
    newList[targetIndex].sortOrder = tempOrder;

    // Swap position in array
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    saveSquadsToStore(newList);
  };

  const handleSaveMember = async (updatedMember: MemberProfile) => {
    const newList = membersList.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    saveMembersToStore(newList);
    if (selectedMemberModal?.id === updatedMember.id) {
      setSelectedMemberModal(updatedMember);
    }

    // Sync member dossier to Vault
    try {
      const res = await fetch("/api/members/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: updatedMember }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✅ Expediente de "${updatedMember.name}" sincronizado con Nipëi Vault.`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error al sincronizar Miembro con Vault:", err);
    }
  };

  const filteredSquads =
    selectedNucleus === "all"
      ? squadsList
      : squadsList.filter((s) => s.nucleus === selectedNucleus);

  const filteredMembers = membersList.filter((m) => {
    if (memberFilterStatus === "approved" && m.status !== "APPROVED") return false;
    if (memberFilterStatus === "pending" && m.status !== "PENDING_CONFIRMATION") return false;
    if (memberFilterStatus === "missing" && !m.hasMissingInfo) return false;

    if (memberSearchQuery.trim()) {
      const q = memberSearchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchNative = m.nativeName?.toLowerCase().includes(q);
      const matchSquad = m.squadAssignments.some((s) => s.roleTitle.toLowerCase().includes(q) || s.squadId.toLowerCase().includes(q));
      return matchName || matchNative || matchSquad;
    }
    return true;
  });

  const maxOrder = squadsList.reduce((max, s) => Math.max(max, s.sortOrder || 0), 0);

  const pendingMembersCount = membersList.filter((m) => m.status === "PENDING_CONFIRMATION").length;
  const missingInfoCount = membersList.filter((m) => m.hasMissingInfo).length;

  return (
    <div className="space-y-8 font-sans">
      {/* Sync Alert Banner */}
      {syncMessage && (
        <div className="p-3 rounded-lg border border-[#22c55e] bg-[#0c1c0c] text-xs font-mono text-[#4ade80] flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-[#a7f3d0] hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-xl border border-[#22c55e] bg-[#091409] relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
                Estrutura Organizacional Nipëi OS
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[#0f190f] border border-[#1e381e] text-[10px] font-mono text-[#a7f3d0]">
                10 Squads | 36 Integrantes Reais
              </span>
              {pendingMembersCount > 0 && (
                <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-600 text-[10px] font-mono font-bold text-amber-300 animate-pulse">
                  ⚠️ {pendingMembersCount} Pendientes de Confirmación Manual
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Organograma Global, Squads & Expedientes
            </h1>
            <p className="text-xs text-[#a7f3d0] max-w-2xl leading-relaxed font-mono">
              Gestão estratégica de Squads e diretório oficial de membros (humanos e agentes IA) com confirmação manual e sincronização automática com o Nipëi Vault.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddSquad}
              className="px-4 py-2 rounded-lg bg-[#22c55e] text-[#050805] text-xs font-mono font-bold hover:bg-[#16a34a] transition shadow flex items-center gap-1.5"
            >
              <Plus size={16} /> Agregar Nuevo Squad
            </button>
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Tabs (Squads vs Members) */}
      <div className="flex items-center justify-between gap-4 border-b border-[#1e381e] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("squads")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 border ${
              activeTab === "squads"
                ? "bg-[#22c55e] text-[#050805] border-[#22c55e] shadow-lg"
                : "bg-[#091409] text-[#a7f3d0] border-[#1e381e] hover:bg-[#142414]"
            }`}
          >
            <Building2 size={16} /> Estructura de Squads ({squadsList.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 border relative ${
              activeTab === "members"
                ? "bg-[#22c55e] text-[#050805] border-[#22c55e] shadow-lg"
                : "bg-[#091409] text-[#a7f3d0] border-[#1e381e] hover:bg-[#142414]"
            }`}
          >
            <Users size={16} /> Directorio de Integrantes ({membersList.length})
            {pendingMembersCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
            )}
          </button>
        </div>

        <button
          onClick={() => setShowArchifyWorkflow(!showArchifyWorkflow)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 flex items-center gap-1.5 border ${
            showArchifyWorkflow
              ? "bg-[#142614] text-[#22c55e] border-[#22c55e]"
              : "bg-[#091409] text-[#a7f3d0] border-[#1e381e] hover:bg-[#142414]"
          }`}
        >
          <Workflow size={13} />
          <span>{showArchifyWorkflow ? "Ocultar Diagrama Workflow" : "📐 Diagrama Archify Workflow"}</span>
        </button>
      </div>

      {/* Archify Interactive Workflow View */}
      {showArchifyWorkflow && (
        <div className="space-y-4">
          <ArchifyDiagramWidget
            prebuiltId="squads-operations-workflow"
            defaultTopic="Operaciones de Squads, Trazabilidad e Impacto"
            defaultType="workflow"
            title="Diagrama Interactivo Archify — Workflow Operacional dos Squads"
            height="580px"
          />
        </div>
      )}

      {/* VIEW MODE 1: SQUADS TAB */}
      {activeTab === "squads" && !showArchifyWorkflow && (
        <div className="space-y-6">
          {/* Nucleus Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll">
            <button
              onClick={() => setSelectedNucleus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
                selectedNucleus === "all"
                  ? "bg-[#22c55e] text-[#050805] shadow"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              🌐 Todos ({squadsList.length})
            </button>

            <button
              onClick={() => setSelectedNucleus("sagrado")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                selectedNucleus === "sagrado"
                  ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              🌿 Sagrado
            </button>

            <button
              onClick={() => setSelectedNucleus("comercial")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                selectedNucleus === "comercial"
                  ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              💼 Comercial
            </button>

            <button
              onClick={() => setSelectedNucleus("transversal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                selectedNucleus === "transversal"
                  ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              🔄 Transversal
            </button>

            <button
              onClick={() => setSelectedNucleus("soporte")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                selectedNucleus === "soporte"
                  ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              🛠️ Soporte
            </button>
          </div>

          {/* Squad Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSquads.map((sq, idx) => {
              // Find members assigned to this squad
              const squadMembers = membersList.filter((m) =>
                m.squadAssignments.some((sa) => sa.squadId === sq.id)
              );

              return (
                <div
                  key={sq.id}
                  className="p-5 rounded-xl border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] transition space-y-4 shadow-xl flex flex-col justify-between relative group"
                >
                  <div className="space-y-4">
                    {/* Header Badge */}
                    <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#050805] text-[#22c55e] border border-[#1e381e] font-bold">
                            #{sq.sortOrder ?? idx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                              sq.nucleus === "sagrado"
                                ? "text-[#4ade80]"
                                : sq.nucleus === "comercial"
                                ? "text-[#34d399]"
                                : sq.nucleus === "transversal"
                                ? "text-[#c084fc]"
                                : "text-[#fbbf24]"
                            }`}
                          >
                            {sq.nucleus.toUpperCase()}
                          </span>

                          {sq.vetoPower === "FULL_VETO" && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950/60 text-red-400 border border-red-800 font-bold">
                              Veto Total
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">{sq.name}</h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSquadOrder(sq.id, "up")}
                          className="p-1 rounded bg-[#050805] text-[#a7f3d0] hover:text-[#22c55e] transition"
                          title="Mover arriba"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => moveSquadOrder(sq.id, "down")}
                          className="p-1 rounded bg-[#050805] text-[#a7f3d0] hover:text-[#22c55e] transition"
                          title="Mover abajo"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEditSquad(sq)}
                          className="p-1.5 rounded bg-[#142414] text-[#22c55e] hover:bg-[#22c55e] hover:text-[#050805] transition"
                          title="Editar Squad"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed">
                      {sq.description}
                    </p>

                    {/* Assigned Real Members */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-[#22c55e] uppercase font-bold flex items-center justify-between">
                        <span>Integrantes Asignados ({squadMembers.length})</span>
                      </div>

                      <div className="space-y-1.5">
                        {squadMembers.slice(0, 4).map((m) => {
                          const assignment = m.squadAssignments.find((sa) => sa.squadId === sq.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMemberModal(m)}
                              className="w-full text-left p-2 rounded bg-[#050805] border border-[#1e381e] hover:border-[#22c55e]/50 transition flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span>{m.avatar}</span>
                                <div>
                                  <div className="font-bold text-white text-[11px]">{m.name}</div>
                                  <div className="text-[10px] text-[#a7f3d0]">{assignment?.roleTitle}</div>
                                </div>
                              </div>
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  m.status === "APPROVED"
                                    ? "bg-[#0c1c0c] text-[#4ade80]"
                                    : "bg-amber-950/60 text-amber-400"
                                }`}
                              >
                                {m.status === "APPROVED" ? "OK" : "Pendiente"}
                              </span>
                            </button>
                          );
                        })}

                        {squadMembers.length > 4 && (
                          <div className="text-[10px] text-center font-mono text-[#a7f3d0]">
                            + {squadMembers.length - 4} miembros más
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KPIs */}
                  {sq.kpis && sq.kpis.length > 0 && (
                    <div className="pt-3 border-t border-[#142414] flex flex-wrap gap-1.5">
                      {sq.kpis.map((kpi, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#050805] text-[#4ade80] border border-[#1e381e]"
                        >
                          📊 {kpi}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MEMBERS DIRECTORY TAB */}
      {activeTab === "members" && !showArchifyWorkflow && (
        <div className="space-y-6">
          {/* Member Search & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#1e381e] bg-[#091409]">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-[#a7f3d0]" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, linaje o squad..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              />
            </div>

            {/* Confirmation Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setMemberFilterStatus("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  memberFilterStatus === "all"
                    ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                    : "bg-[#050805] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
                }`}
              >
                Todos ({membersList.length})
              </button>

              <button
                onClick={() => setMemberFilterStatus("approved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  memberFilterStatus === "approved"
                    ? "bg-[#22c55e] text-[#050805] font-bold shadow"
                    : "bg-[#050805] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
                }`}
              >
                ✅ Confirmados ({membersList.filter((m) => m.status === "APPROVED").length})
              </button>

              <button
                onClick={() => setMemberFilterStatus("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  memberFilterStatus === "pending"
                    ? "bg-amber-600 text-white font-bold shadow"
                    : "bg-[#050805] text-amber-400 border border-amber-600/60 hover:bg-amber-950/40"
                }`}
              >
                ⚠️ Requer Confirmación ({pendingMembersCount})
              </button>

              <button
                onClick={() => setMemberFilterStatus("missing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition shrink-0 ${
                  memberFilterStatus === "missing"
                    ? "bg-red-600 text-white font-bold shadow"
                    : "bg-[#050805] text-red-400 border border-red-800/60 hover:bg-red-950/40"
                }`}
              >
                🔍 Info Incompleta ({missingInfoCount})
              </button>
            </div>
          </div>

          {/* Member Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMemberModal(m)}
                className="p-5 rounded-xl border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] transition space-y-4 shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badge */}
                  <div className="flex items-center justify-between border-b border-[#1e381e] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{m.avatar}</span>
                      <div>
                        <span className="text-[9px] font-mono text-[#4ade80] font-bold uppercase">
                          {m.type.replace("human_", "").toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">{m.name}</h4>
                        {m.nativeName && <div className="text-[10px] text-[#22c55e] font-mono">({m.nativeName})</div>}
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        m.status === "APPROVED"
                          ? "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]"
                          : "bg-amber-950/80 text-amber-300 border border-amber-600"
                      }`}
                    >
                      {m.status === "APPROVED" ? "Confirmado" : "Pendiente"}
                    </span>
                  </div>

                  {/* Missing Info Flag */}
                  {m.hasMissingInfo && (
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-600/60 text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>{m.missingInfoDetails}</span>
                    </div>
                  )}

                  {/* Lineage / Saberes snippet */}
                  <p className="text-[11px] text-[#a7f3d0] font-mono line-clamp-2 leading-relaxed">
                    {m.specialityOrLineage}
                  </p>

                  {/* Squad Assignments */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-[#22c55e] uppercase font-bold">Squads Asignados</div>
                    <div className="flex flex-wrap gap-1">
                      {m.squadAssignments.map((sa, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#050805] text-[#a7f3d0] border border-[#1e381e]"
                        >
                          {sa.squadId}: {sa.roleTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-[#142414] flex items-center justify-between text-[10px] font-mono text-[#4ade80]">
                  <span>Ver Expediente Completo</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawers & Modals */}
      <SquadEditDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        squadToEdit={editingSquad}
        onSave={handleSaveSquad}
        onDelete={handleDeleteSquad}
        maxSortOrder={maxOrder}
      />

      <MemberProfileModal
        isOpen={!!selectedMemberModal}
        onClose={() => setSelectedMemberModal(null)}
        member={selectedMemberModal}
        onSaveMember={handleSaveMember}
      />
    </div>
  );
}
