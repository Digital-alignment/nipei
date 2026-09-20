"use client";

import { useState, useEffect } from "react";
import { X, Save, Trash2, Shield, Layers, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { SquadMeta, NucleusRole } from "@/lib/nipeiStore";

interface SquadEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  squadToEdit: SquadMeta | null;
  onSave: (squad: SquadMeta) => void;
  onDelete?: (squadId: string) => void;
  maxSortOrder: number;
}

export default function SquadEditDrawer({
  isOpen,
  onClose,
  squadToEdit,
  onSave,
  onDelete,
  maxSortOrder,
}: SquadEditDrawerProps) {
  const [formData, setFormData] = useState<Partial<SquadMeta>>({
    id: "",
    code: "",
    name: "",
    nucleus: "comercial",
    module: "Nipëi Flow",
    description: "",
    iconName: "ShieldCheck",
    colorHex: "#22c55e",
    sortOrder: maxSortOrder + 1,
    vetoPower: "NONE",
    status: "ACTIVE",
    responsibilities: [],
    kpis: [],
  });

  const [newResp, setNewResp] = useState("");
  const [newKpi, setNewKpi] = useState("");

  useEffect(() => {
    if (squadToEdit) {
      setFormData({
        ...squadToEdit,
        responsibilities: squadToEdit.responsibilities ? [...squadToEdit.responsibilities] : [],
        kpis: squadToEdit.kpis ? [...squadToEdit.kpis] : [],
      });
    } else {
      setFormData({
        id: `squad_${Date.now().toString(36)}`,
        code: `SQ-0${maxSortOrder + 1}`,
        name: "",
        nucleus: "comercial",
        module: "Nipëi Flow",
        description: "",
        iconName: "ShieldCheck",
        colorHex: "#22c55e",
        sortOrder: maxSortOrder + 1,
        vetoPower: "NONE",
        status: "ACTIVE",
        responsibilities: [],
        kpis: [],
      });
    }
  }, [squadToEdit, isOpen, maxSortOrder]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const finalSquad: SquadMeta = {
      id: formData.id || `squad_${Date.now()}`,
      code: formData.code || `SQ-00`,
      name: formData.name.trim(),
      nucleus: formData.nucleus || "comercial",
      module: formData.module || "Nipëi Flow",
      description: formData.description || "",
      iconName: formData.iconName || "ShieldCheck",
      colorHex: formData.colorHex || "#22c55e",
      sortOrder: Number(formData.sortOrder) || 1,
      vetoPower: formData.vetoPower || "NONE",
      status: formData.status || "ACTIVE",
      responsibilities: formData.responsibilities || [],
      kpis: formData.kpis || [],
      renameHistory: squadToEdit?.renameHistory || [],
    };

    onSave(finalSquad);
    onClose();
  };

  const addResponsibility = () => {
    if (!newResp.trim()) return;
    setFormData((prev) => ({
      ...prev,
      responsibilities: [...(prev.responsibilities || []), newResp.trim()],
    }));
    setNewResp("");
  };

  const removeResponsibility = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: (prev.responsibilities || []).filter((_, i) => i !== idx),
    }));
  };

  const addKpi = () => {
    if (!newKpi.trim()) return;
    setFormData((prev) => ({
      ...prev,
      kpis: [...(prev.kpis || []), newKpi.trim()],
    }));
    setNewKpi("");
  };

  const removeKpi = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      kpis: (prev.kpis || []).filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-xl bg-[#091409] border-l border-[#22c55e]/40 h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#1e381e] flex items-center justify-between bg-[#050805]">
          <div>
            <span className="text-[10px] font-mono text-[#22c55e] font-bold uppercase tracking-wider">
              {squadToEdit ? "Editar Squad Existente" : "Crear Nuevo Squad"}
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {squadToEdit ? squadToEdit.name : "Nuevo Squad Nipëi OS"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#a7f3d0] hover:bg-[#142414] hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {/* Código e ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                Código Squad (ej. SQ-08)
              </label>
              <input
                type="text"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                ID Sistema (slug)
              </label>
              <input
                type="text"
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                disabled={!!squadToEdit}
                required
              />
            </div>
          </div>

          {/* Nombre del Squad */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
              Nombre Completo del Squad
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Squad VIII — Innovación & IA Generativa"
              className="w-full px-3 py-2.5 rounded bg-[#050805] border border-[#1e381e] text-white text-sm font-bold focus:border-[#22c55e] focus:outline-none"
              required
            />
          </div>

          {/* Núcleo de Trabajo & Módulo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                Núcleo de Trabajo
              </label>
              <select
                value={formData.nucleus || "comercial"}
                onChange={(e) => setFormData({ ...formData, nucleus: e.target.value as NucleusRole })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              >
                <option value="sagrado">🌿 Sagrado (Instituto Mutum)</option>
                <option value="comercial">💼 Comercial (Operaciones & Ventas)</option>
                <option value="transversal">🔄 Transversal (Dirección & Legal)</option>
                <option value="soporte">🛠️ Soporte (Infraestructura)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                Módulo Sistema
              </label>
              <select
                value={formData.module || "Nipëi Flow"}
                onChange={(e) => setFormData({ ...formData, module: e.target.value as any })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              >
                <option value="Nipëi Flow">Nipëi Flow</option>
                <option value="Nipëi People">Nipëi People</option>
                <option value="Nipëi Brain">Nipëi Brain</option>
                <option value="Cross-cutting">Cross-cutting</option>
              </select>
            </div>
          </div>

          {/* Orden Personalizado & Veto Power */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                Orden Personalizado (Posición)
              </label>
              <input
                type="number"
                min="0"
                value={formData.sortOrder ?? 1}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
                Veto Gate Ético
              </label>
              <select
                value={formData.vetoPower || "NONE"}
                onChange={(e) => setFormData({ ...formData, vetoPower: e.target.value as any })}
                className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              >
                <option value="NONE">Sin Veto (Estándar)</option>
                <option value="ETHICAL_REVIEW">Revisión Ética de Lotes</option>
                <option value="FULL_VETO">🔥 Veto Gate Comercial Total</option>
              </select>
            </div>
          </div>

          {/* Descripciones */}
          <div>
            <label className="block text-xs font-mono font-bold text-[#a7f3d0] mb-1.5">
              Descripción Operacional
            </label>
            <textarea
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el propósito del squad y su impacto operacional..."
              className="w-full px-3 py-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
            />
          </div>

          {/* Responsabilidades */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-[#a7f3d0]">
              Responsabilidades Principales
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                placeholder="Añadir responsabilidad..."
                className="flex-1 px-3 py-1.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addResponsibility())}
              />
              <button
                type="button"
                onClick={addResponsibility}
                className="px-3 py-1.5 rounded bg-[#142414] text-[#22c55e] border border-[#22c55e] hover:bg-[#22c55e] hover:text-[#050805] transition text-xs font-bold"
              >
                <Plus size={14} />
              </button>
            </div>

            <ul className="space-y-1 mt-2">
              {formData.responsibilities?.map((resp, i) => (
                <li
                  key={i}
                  className="p-2 rounded bg-[#050805] border border-[#1e381e] flex items-center justify-between text-xs text-[#a7f3d0] font-mono"
                >
                  <span>• {resp}</span>
                  <button
                    type="button"
                    onClick={() => removeResponsibility(i)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* KPIs */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-[#a7f3d0]">
              Indicadores de Desempeño (KPIs)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKpi}
                onChange={(e) => setNewKpi(e.target.value)}
                placeholder="Añadir KPI (ej. Meta Ejecución: 95%)..."
                className="flex-1 px-3 py-1.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKpi())}
              />
              <button
                type="button"
                onClick={addKpi}
                className="px-3 py-1.5 rounded bg-[#142414] text-[#22c55e] border border-[#22c55e] hover:bg-[#22c55e] hover:text-[#050805] transition text-xs font-bold"
              >
                <Plus size={14} />
              </button>
            </div>

            <ul className="space-y-1 mt-2">
              {formData.kpis?.map((kpi, i) => (
                <li
                  key={i}
                  className="p-2 rounded bg-[#050805] border border-[#1e381e] flex items-center justify-between text-xs text-[#4ade80] font-mono"
                >
                  <span>📊 {kpi}</span>
                  <button
                    type="button"
                    onClick={() => removeKpi(i)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#1e381e] flex items-center justify-between">
            {squadToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(squadToEdit.id)}
                className="px-3 py-2 rounded bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/60 transition text-xs font-mono flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Archivar Squad
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#050805] border border-[#1e381e] text-[#a7f3d0] hover:bg-[#142414] transition text-xs font-mono font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-[#22c55e] text-[#050805] font-bold hover:bg-[#16a34a] transition text-xs font-mono flex items-center gap-1.5 shadow"
              >
                <Save size={14} /> Guardar & Sincronizar Vault
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
