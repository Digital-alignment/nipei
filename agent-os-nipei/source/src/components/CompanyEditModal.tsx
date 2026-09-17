"use client";

import React, { useState, useEffect } from "react";
import { Company, CompanyPerson } from "@/types/company";
import { X, Plus, Trash2, Check, Building2, Tag, Target, Users, Bot, Globe, MapPin, Palette } from "lucide-react";

interface CompanyEditModalProps {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedData: Partial<Company>) => Promise<void>;
  availableCategories: string[];
}

const ACCENT_COLORS = [
  "#22c55e", // Emerald green
  "#38bdf8", // Cyan / Sky
  "#a855f7", // Purple / Amethyst
  "#f59e0b", // Amber / Gold
  "#ec4899", // Rose / Pink
  "#10b981", // Teal
  "#eab308", // Yellow
];

const AVAILABLE_SQUADS = [
  "Engenharia & Core",
  "Conteúdo & SEO",
  "Estrategia & Operações",
  "Fitoterapia & Alquimia",
  "Ecoturismo & Vivências",
  "Hospitalidade & Retiros",
  "Vendas & Marketing",
];

const AVAILABLE_AGENTS = [
  "hermes",
  "planner",
  "builder",
  "reviewer",
  "chaman",
  "curandero",
  "ayahuasca-guide",
  "marketing-bot",
  "seo-agent",
];

export default function CompanyEditModal({
  company,
  isOpen,
  onClose,
  onSave,
  availableCategories,
}: CompanyEditModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustomCat, setUseCustomCat] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState("");
  const [websites, setWebsites] = useState<string[]>([]);
  const [newWebsiteInput, setNewWebsiteInput] = useState("");
  const [assignedSquads, setAssignedSquads] = useState<string[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [peopleInvolved, setPeopleInvolved] = useState<CompanyPerson[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [newPersonType, setNewPersonType] = useState<"client_contact" | "team_member">("team_member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      if (availableCategories.includes(company.category)) {
        setCategory(company.category);
        setUseCustomCat(false);
      } else {
        setCategory(company.category || "");
        setCustomCategory(company.category || "");
        setUseCustomCat(true);
      }
      setLocation(company.location || "");
      setDescription(company.description || "");
      setAccentColor(company.accentColor || "#22c55e");
      setGoals(company.goals ? [...company.goals] : []);
      setWebsites(company.websites ? [...company.websites] : []);
      setAssignedSquads(company.assignedSquads ? [...company.assignedSquads] : []);
      setAssignedAgents(company.assignedAgents ? [...company.assignedAgents] : []);
      setPeopleInvolved(company.peopleInvolved ? [...company.peopleInvolved] : []);
    }
  }, [company, availableCategories]);

  if (!isOpen || !company) return null;

  const handleAddGoal = () => {
    if (newGoalInput.trim()) {
      setGoals([...goals, newGoalInput.trim()]);
      setNewGoalInput("");
    }
  };

  const handleRemoveGoal = (idx: number) => {
    setGoals(goals.filter((_, i) => i !== idx));
  };

  const handleAddWebsite = () => {
    if (newWebsiteInput.trim()) {
      setWebsites([...websites, newWebsiteInput.trim()]);
      setNewWebsiteInput("");
    }
  };

  const handleRemoveWebsite = (idx: number) => {
    setWebsites(websites.filter((_, i) => i !== idx));
  };

  const handleToggleSquad = (sq: string) => {
    if (assignedSquads.includes(sq)) {
      setAssignedSquads(assignedSquads.filter((s) => s !== sq));
    } else {
      setAssignedSquads([...assignedSquads, sq]);
    }
  };

  const handleToggleAgent = (ag: string) => {
    if (assignedAgents.includes(ag)) {
      setAssignedAgents(assignedAgents.filter((a) => a !== ag));
    } else {
      setAssignedAgents([...assignedAgents, ag]);
    }
  };

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      setPeopleInvolved([
        ...peopleInvolved,
        {
          name: newPersonName.trim(),
          role: newPersonRole.trim() || "Miembro de Equipo",
          type: newPersonType,
        },
      ]);
      setNewPersonName("");
      setNewPersonRole("");
    }
  };

  const handleRemovePerson = (idx: number) => {
    setPeopleInvolved(peopleInvolved.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.");
      return;
    }

    const finalCategory = useCustomCat ? customCategory.trim() : category;
    if (!finalCategory) {
      setErrorMsg("Debes especificar una categoría.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSave(company.id, {
        name: name.trim(),
        category: finalCategory,
        location: location.trim(),
        description: description.trim(),
        accentColor,
        goals,
        websites,
        assignedSquads,
        assignedAgents,
        peopleInvolved,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al actualizar la empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-[#0c140c] border border-[#182818] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#182818] flex items-center justify-between bg-[#050805]">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full border border-white/20"
              style={{ backgroundColor: accentColor }}
            />
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Editar Empresa: <span className="text-[#22c55e]">{company.name}</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">
                ID (Slug): {company.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#142614] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-[#22c55e]" /> Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#050805] border border-[#182818] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-cyan-400" /> Ubicación
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Aldeia Mutum, Acre, Brasil"
                className="w-full bg-[#050805] border border-[#182818] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>
          </div>

          {/* Category & Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={14} className="text-amber-400" /> Categoría
              </label>
              {!useCustomCat ? (
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setUseCustomCat(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-[#050805] border border-[#182818] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__">+ Crear Nueva Categoría...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Escribe el nombre de la nueva categoría"
                    className="w-full bg-[#050805] border border-[#182818] rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                  />
                  <button
                    type="button"
                    onClick={() => setUseCustomCat(false)}
                    className="px-3 py-2 bg-[#142614] border border-[#182818] rounded-xl text-slate-300 font-mono hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={14} className="text-purple-400" /> Color Distintivo
              </label>
              <div className="flex items-center gap-2 pt-1">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccentColor(c)}
                    className={`w-7 h-7 rounded-full border transition flex items-center justify-center ${
                      accentColor === c
                        ? "border-white scale-110 shadow-lg"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {accentColor === c && <Check size={12} className="text-slate-950 font-black" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider">
              Descripción & Contexto
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#050805] border border-[#182818] rounded-xl p-3 text-white font-sans focus:outline-none focus:border-[#22c55e]"
            />
          </div>

          {/* Goals */}
          <div className="space-y-2 pt-2 border-t border-[#182818]">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target size={14} className="text-rose-400" /> Metas Estratégicas ({goals.length})
            </label>
            <div className="space-y-2">
              {goals.map((g, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-[#050805] border border-[#182818] rounded-xl font-mono text-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <span style={{ color: accentColor }}>•</span>
                    <span>{g}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(idx)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddGoal();
                    }
                  }}
                  placeholder="Agregar nueva meta estratégica..."
                  className="flex-1 bg-[#050805] border border-[#182818] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                />
                <button
                  type="button"
                  onClick={handleAddGoal}
                  className="px-3 py-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e] font-mono font-bold flex items-center gap-1 hover:bg-[#1f381f]"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          </div>

          {/* Squads Assignment */}
          <div className="space-y-2 pt-2 border-t border-[#182818]">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-emerald-400" /> Squads Involucrados
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SQUADS.map((sq) => {
                const isSelected = assignedSquads.includes(sq);
                return (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => handleToggleSquad(sq)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-[#142614] text-[#22c55e] border-[#22c55e]"
                        : "bg-[#050805] text-slate-400 border-[#182818] hover:text-slate-200"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    {sq}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agents Assignment */}
          <div className="space-y-2 pt-2 border-t border-[#182818]">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bot size={14} className="text-purple-400" /> Agentes de IA Asignados
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_AGENTS.map((ag) => {
                const isSelected = assignedAgents.includes(ag);
                return (
                  <button
                    key={ag}
                    type="button"
                    onClick={() => handleToggleAgent(ag)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-purple-950/60 text-purple-300 border-purple-500/60"
                        : "bg-[#050805] text-slate-400 border-[#182818] hover:text-slate-200"
                    }`}
                  >
                    {isSelected && <Check size={12} />}
                    @{ag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key People / Contacts */}
          <div className="space-y-2 pt-2 border-t border-[#182818]">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-blue-400" /> Personas Clave ({peopleInvolved.length})
            </label>
            <div className="space-y-2">
              {peopleInvolved.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-[#050805] border border-[#182818] rounded-xl font-mono text-slate-200"
                >
                  <div>
                    <strong className="text-white">{p.name}</strong> — {p.role}
                    <span className="ml-2 text-[10px] text-slate-500 uppercase">({p.type})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(idx)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Nombre de la persona"
                  className="bg-[#050805] border border-[#182818] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                />
                <input
                  type="text"
                  value={newPersonRole}
                  onChange={(e) => setNewPersonRole(e.target.value)}
                  placeholder="Rol / Cargo"
                  className="bg-[#050805] border border-[#182818] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                />
                <div className="flex gap-2">
                  <select
                    value={newPersonType}
                    onChange={(e) =>
                      setNewPersonType(e.target.value as "client_contact" | "team_member")
                    }
                    className="bg-[#050805] border border-[#182818] rounded-xl px-2 py-2 text-white font-mono focus:outline-none focus:border-[#22c55e] flex-1"
                  >
                    <option value="team_member">Equipo</option>
                    <option value="client_contact">Contacto</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPerson}
                    className="px-3 py-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e] font-mono font-bold flex items-center gap-1 hover:bg-[#1f381f]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Websites */}
          <div className="space-y-2 pt-2 border-t border-[#182818]">
            <label className="font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-cyan-400" /> Sitios Web & Enlaces
            </label>
            <div className="space-y-2">
              {websites.map((w, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-[#050805] border border-[#182818] rounded-xl font-mono text-cyan-300"
                >
                  <span className="truncate">{w}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWebsite(idx)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWebsiteInput}
                  onChange={(e) => setNewWebsiteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddWebsite();
                    }
                  }}
                  placeholder="https://..."
                  className="flex-1 bg-[#050805] border border-[#182818] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#22c55e]"
                />
                <button
                  type="button"
                  onClick={handleAddWebsite}
                  className="px-3 py-2 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e] font-mono font-bold flex items-center gap-1 hover:bg-[#1f381f]"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[#182818] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#050805] border border-[#182818] rounded-xl text-slate-300 font-mono font-bold hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-mono font-black rounded-xl transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
