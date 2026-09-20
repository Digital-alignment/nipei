"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Network, ShieldCheck, Crown, Users, Brain, Workflow, Building2,
  Package, ShoppingBag, Wrench, FileSpreadsheet, ArrowUpRight, Plus,
  Edit3, ArrowUp, ArrowDown, CheckCircle2, ShieldAlert, Sparkles, Filter
} from "lucide-react";
import { SQUADS, INITIAL_SQUADS, type SquadMeta, type NucleusRole, type SquadId } from "@/lib/nipeiStore";
import SquadEditDrawer from "./SquadEditDrawer";
import ArchifyDiagramWidget from "./ArchifyDiagramWidget";

export default function OrganogramaView() {
  const [squadsList, setSquadsList] = useState<SquadMeta[]>(INITIAL_SQUADS);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleusRole | "all">("all");
  const [showArchifyWorkflow, setShowArchifyWorkflow] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [editingSquad, setEditingSquad] = useState<SquadMeta | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Load from localStorage on mount if present
  useEffect(() => {
    const saved = localStorage.getItem("nipei_squads_store");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSquadsList(parsed);
        }
      } catch (e) {
        console.error("Error parsing saved squads", e);
      }
    }
  }, []);

  const saveSquadsToStore = (newSquads: SquadMeta[]) => {
    const sorted = [...newSquads].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setSquadsList(sorted);
    localStorage.setItem("nipei_squads_store", JSON.stringify(sorted));
  };

  const handleOpenAdd = () => {
    setEditingSquad(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (sq: SquadMeta) => {
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

  const filteredSquads =
    selectedNucleus === "all"
      ? squadsList
      : squadsList.filter((s) => s.nucleus === selectedNucleus);

  const maxOrder = squadsList.reduce((max, s) => Math.max(max, s.sortOrder || 0), 0);

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
                4 Núcleos: Sagrado, Comercial, Transversal, Soporte
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Organograma Global & Gestão de Squads
            </h1>
            <p className="text-xs text-[#a7f3d0] max-w-2xl leading-relaxed font-mono">
              Painel de administração dinámica de Squads com sincronização automática no Nipëi Vault e suporte a ordenação personalizada.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-lg bg-[#22c55e] text-[#050805] text-xs font-mono font-bold hover:bg-[#16a34a] transition shadow flex items-center gap-1.5"
            >
              <Plus size={16} /> Agregar Nuevo Squad
            </button>
          </div>
        </div>
      </div>

      {/* Filter Switcher & Nucleus Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scroll">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedNucleus("all");
              setShowArchifyWorkflow(false);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ${
              selectedNucleus === "all" && !showArchifyWorkflow
                ? "bg-[#22c55e] text-[#050805] shadow"
                : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
            }`}
          >
            🌐 Todos os Squads ({squadsList.length})
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

      {/* 4 Nuclei Overview Banner */}
      {selectedNucleus === "all" && !showArchifyWorkflow && (
        <div className="p-6 rounded-xl border border-[#1e381e] bg-[#0f190f] space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <div className="text-xs font-mono text-[#22c55e] font-bold uppercase tracking-widest">
              Alta Direção & Arquitetura de 4 Núcleos
            </div>
            <h2 className="text-lg font-bold text-white">Conselho de Governança Nipëi OS</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sagrado */}
            <div className="p-4 rounded-lg border border-[#22c55e] bg-[#0c1c0c] space-y-2">
              <span className="text-xs font-mono font-bold text-[#4ade80] flex items-center gap-1.5">
                <ShieldCheck size={14} /> SAGRADO
              </span>
              <p className="text-[11px] text-[#a7f3d0] font-mono leading-relaxed">
                Ritos, sabedoria ancestral, extrativismo ético e Veto Gate Total do Instituto Mutum.
              </p>
            </div>

            {/* Comercial */}
            <div className="p-4 rounded-lg border border-[#10b981] bg-[#091812] space-y-2">
              <span className="text-xs font-mono font-bold text-[#34d399] flex items-center gap-1.5">
                <Building2 size={14} /> COMERCIAL
              </span>
              <p className="text-[11px] text-[#a7f3d0] font-mono leading-relaxed">
                Botica Inî Rau, retiros Samakey, e-commerce, crescimento e vendas.
              </p>
            </div>

            {/* Transversal */}
            <div className="p-4 rounded-lg border border-[#a855f7] bg-[#140c1c] space-y-2">
              <span className="text-xs font-mono font-bold text-[#c084fc] flex items-center gap-1.5">
                <Brain size={14} /> TRANSVERSAL
              </span>
              <p className="text-[11px] text-[#a7f3d0] font-mono leading-relaxed">
                Estratégia CEO, governança global, finanças DRE e conformidade legal.
              </p>
            </div>

            {/* Soporte */}
            <div className="p-4 rounded-lg border border-[#f59e0b] bg-[#1c120c] space-y-2">
              <span className="text-xs font-mono font-bold text-[#fbbf24] flex items-center gap-1.5">
                <Wrench size={14} /> SOPORTE
              </span>
              <p className="text-[11px] text-[#a7f3d0] font-mono leading-relaxed">
                Manutenção de campo, infraestrutura, inventário de peças e CI/CD.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Squad Detailed Grid with Custom Ordering */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSquads.map((sq, idx) => (
          <div
            key={sq.id}
            className="p-5 rounded-xl border border-[#1e381e] bg-[#0f190f] hover:border-[#22c55e] transition space-y-4 shadow-xl flex flex-col justify-between relative group"
          >
            <div className="space-y-4">
              {/* Header Badge & Actions */}
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
                  <h3 className="text-sm font-bold text-white">{sq.name}</h3>
                </div>

                <div className="flex items-center gap-1">
                  {/* Order controls */}
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
                    onClick={() => handleOpenEdit(sq)}
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

              {/* Clean Slate Notice for Members */}
              <div className="p-3 rounded bg-[#050805] border border-[#1e381e] space-y-1">
                <div className="text-[10px] font-mono text-[#22c55e] uppercase font-bold flex items-center justify-between">
                  <span>Integrantes & Roles (Fase 2)</span>
                  <span className="text-[9px] text-[#a7f3d0]">Ficha limpia</span>
                </div>
                <p className="text-[11px] text-[#a7f3d0] font-mono italic">
                  Lista limpia lista para asignar integrantes reales y sus roles en la Fase 2.
                </p>
              </div>

              {/* Responsibilities */}
              {sq.responsibilities && sq.responsibilities.length > 0 && (
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] text-[#a7f3d0] uppercase font-bold">Responsabilidades</div>
                  <ul className="space-y-1 text-[11px] text-[#a7f3d0]">
                    {sq.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#22c55e] font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Squad KPIs Footer */}
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
        ))}
      </div>

      {/* Drawer Component */}
      <SquadEditDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        squadToEdit={editingSquad}
        onSave={handleSaveSquad}
        onDelete={handleDeleteSquad}
        maxSortOrder={maxOrder}
      />
    </div>
  );
}
