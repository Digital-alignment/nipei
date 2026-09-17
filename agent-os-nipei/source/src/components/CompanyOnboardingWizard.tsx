"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Globe,
  Sparkles,
  ShieldCheck,
  Target,
  Users,
  Bot,
  RefreshCw,
  XCircle,
} from "lucide-react";

export default function CompanyOnboardingWizard() {
  const router = useRouter();
  const { companies, addCompany, setActiveCompanyId } = useCompany();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const existingCategories = Array.from(new Set(companies.map((c) => c.category).filter(Boolean)));
  const [category, setCategory] = useState<string>(existingCategories[0] || "Fitoterapia & Medicina");
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const [location, setLocation] = useState("");
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [websiteInput, setWebsiteInput] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [description, setDescription] = useState("");

  const [goals, setGoals] = useState<string[]>([""]);
  const [people, setPeople] = useState<{ name: string; role: string; type: "client_contact" | "team_member" }[]>([
    { name: "", role: "", type: "client_contact" },
  ]);

  const AVAILABLE_SQUADS = [
    "Squad I (Estratégia/CEO)",
    "Squad II (Produção Mutum)",
    "Squad III (Retiros & Samakey)",
    "Squad IV (Vendas & Mkt)",
    "Squad V (Adm/Legal/DRE)",
    "Squad VI (Infraestrutura)",
    "Squad VII (Instituto Mutum)",
  ];

  const AVAILABLE_AGENTS = ["hermes", "venu", "antigravity", "claude", "openclaw", "codex"];

  const [selectedSquads, setSelectedSquads] = useState<string[]>(["Squad II (Produção Mutum)"]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["hermes"]);

  // Dynamic Goal Inputs
  const handleAddGoal = () => setGoals([...goals, ""]);
  const handleGoalChange = (idx: number, val: string) => {
    const updated = [...goals];
    updated[idx] = val;
    setGoals(updated);
  };
  const handleRemoveGoal = (idx: number) => setGoals(goals.filter((_, i) => i !== idx));

  // Dynamic Person Inputs
  const handleAddPerson = () =>
    setPeople([...people, { name: "", role: "", type: "client_contact" }]);
  const handlePersonChange = (
    idx: number,
    field: "name" | "role" | "type",
    val: string
  ) => {
    const updated = [...people];
    updated[idx] = { ...updated[idx], [field]: val as any };
    setPeople(updated);
  };
  const handleRemovePerson = (idx: number) => setPeople(people.filter((_, i) => i !== idx));

  // Toggle Squad Selection
  const toggleSquad = (squad: string) => {
    if (selectedSquads.includes(squad)) {
      setSelectedSquads(selectedSquads.filter((s) => s !== squad));
    } else {
      setSelectedSquads([...selectedSquads, squad]);
    }
  };

  // Toggle Agent Selection
  const toggleAgent = (agent: string) => {
    if (selectedAgents.includes(agent)) {
      setSelectedAgents(selectedAgents.filter((a) => a !== agent));
    } else {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const finalCategory = isCustomCategory ? customCategoryInput.trim() : category;
      if (!finalCategory) {
        setErrorMsg("Por favor especifica una categoría válida.");
        setIsSubmitting(false);
        setStep(1);
        return;
      }

      const websites = websiteInput
        ? websiteInput.split(",").map((w) => w.trim()).filter(Boolean)
        : [];
      const validGoals = goals.map((g) => g.trim()).filter(Boolean);
      const validPeople = people.filter((p) => p.name.trim() !== "");

      const newCompany = await addCompany({
        name: name.trim(),
        category: finalCategory,
        location: location.trim(),
        description: description.trim(),
        websites,
        socialMedia: {
          ...(instagram ? { instagram: instagram.trim() } : {}),
          ...(linkedin ? { linkedin: linkedin.trim() } : {}),
        },
        goals: validGoals,
        peopleInvolved: validPeople,
        assignedSquads: selectedSquads,
        assignedAgents: selectedAgents,
        accentColor,
      });

      // Set focus to new company and redirect to Hub
      setActiveCompanyId(newCompany.id);
      router.push("/empresas");
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocurrió un error al dar de alta la empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest uppercase bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-full flex items-center gap-2">
            <Building2 size={14} /> WIZARD DE ONBOARDING DE EMPRESAS
          </span>
          <span className="px-3 py-1 text-xs font-mono font-bold uppercase bg-[#050805] text-[#a7f3d0] border border-[#182818] rounded-full">
            PASO {step} DE 4
          </span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">
          Alta de Nueva Empresa <span className="text-[#22c55e]">& Sync con Vault</span>
        </h1>
        <p className="text-xs text-[#8aa88a] max-w-2xl leading-relaxed font-medium">
          Completa los datos para registrar la empresa en Nipëi OS. Se creará automáticamente la nota correspondiente en <code className="text-[#22c55e]">nipei-vault</code> con la firma del agente.
        </p>

        {/* Wizard Progress Bar */}
        <div className="grid grid-cols-4 gap-2 pt-3">
          {[
            { s: 1, label: "1. Identidad" },
            { s: 2, label: "2. Objetivos" },
            { s: 3, label: "3. Personas" },
            { s: 4, label: "4. Squads & Agentes" },
          ].map((item) => (
            <div
              key={item.s}
              onClick={() => step > item.s && setStep(item.s)}
              className={`p-2.5 rounded-xl border text-center font-mono text-xs font-bold transition cursor-pointer ${
                step === item.s
                  ? "bg-[#142614] text-[#22c55e] border-[#22c55e]/50"
                  : step > item.s
                  ? "bg-[#050805] text-emerald-400 border-[#182818]"
                  : "bg-[#050805] text-slate-600 border-[#182818]"
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[#280c0c] text-red-400 border border-red-500/40 flex items-center justify-between text-xs font-mono font-bold">
          <div className="flex items-center gap-2">
            <XCircle size={16} /> <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>✕</button>
        </div>
      )}

      {/* STEP 1: IDENTITY & CONTACT */}
      {step === 1 && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#182818] pb-3">
            <Building2 className="text-[#22c55e]" size={20} /> Paso 1: Identidad & Ubicación
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Ini Rau, MUV Gráfica, Samakey Retiros..."
                className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Categoría
              </label>
              {!isCustomCategory ? (
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
                  >
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__">➕ Crear Nueva Categoría...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Escribe el nombre de la nueva categoría (ej. Ecoturismo, SaaS)..."
                    className="flex-1 bg-[#050805] text-white border border-[#22c55e] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(false)}
                    className="px-3 py-2 bg-[#050805] text-slate-400 hover:text-white border border-[#182818] rounded-xl text-xs font-mono"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Ubicación Geográfica / Ciudad
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Aldeia Mutum, Serra Grande, Buenos Aires..."
                className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Color Distintivo de Marca
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-[#182818]"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="bg-[#050805] text-white border border-[#182818] px-3 py-2 rounded-xl text-xs font-mono w-28 uppercase"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Sitios Web (separados por coma)
              </label>
              <input
                type="text"
                value={websiteInput}
                onChange={(e) => setWebsiteInput(e.target.value)}
                placeholder="Ej. https://inirau.com, https://inirau.org"
                className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Instagram Handle
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@empresa.oficial"
                className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                LinkedIn Profile / URL
              </label>
              <input
                type="text"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/company/empresa"
                className="w-full bg-[#050805] text-white border border-[#182818] px-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (!name.trim()) {
                  setErrorMsg("El nombre de la empresa es obligatorio.");
                  return;
                }
                setErrorMsg(null);
                setStep(2);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition"
            >
              <span>Siguiente: Objetivos</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: OBJECTIVES & DESCRIPTION */}
      {step === 2 && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#182818] pb-3">
            <Target className="text-cyan-400" size={20} /> Paso 2: Descripción & Objetivos Estratégicos
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Descripción / Contexto General del Negocio
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Resumen del modelo de negocio, productos o servicios..."
                className="w-full bg-[#050805] text-white border border-[#182818] p-4 rounded-xl text-xs font-sans focus:outline-none focus:border-[#22c55e]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Objetivos Estratégicos del Trimestre
                </label>
                <button
                  onClick={handleAddGoal}
                  className="flex items-center gap-1 text-[#22c55e] hover:underline font-mono text-xs font-bold"
                >
                  <Plus size={12} /> Agregar Objetivo
                </button>
              </div>

              {goals.map((g, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={g}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    placeholder={`Objetivo #${idx + 1}...`}
                    className="flex-1 bg-[#050805] text-white border border-[#182818] px-4 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-[#22c55e]"
                  />
                  {goals.length > 1 && (
                    <button
                      onClick={() => handleRemoveGoal(idx)}
                      className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#182818]">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#050805] text-slate-300 border border-[#182818] hover:bg-[#142614] rounded-xl text-xs font-mono"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition"
            >
              <span>Siguiente: Personas</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PEOPLE INVOLVED */}
      {step === 3 && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#182818] pb-3">
            <Users className="text-purple-400" size={20} /> Paso 3: Contactos & Miembros del Equipo
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Registra representantes clave del cliente y miembros asignados de Digital Alignment.
              </span>
              <button
                onClick={handleAddPerson}
                className="flex items-center gap-1 text-[#22c55e] hover:underline font-mono text-xs font-bold"
              >
                <Plus size={12} /> Agregar Persona
              </button>
            </div>

            {people.map((p, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#050805] border border-[#182818] rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 items-center"
              >
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => handlePersonChange(idx, "name", e.target.value)}
                  placeholder="Nombre de la persona"
                  className="bg-[#0c140c] text-white border border-[#182818] px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                />
                <input
                  type="text"
                  value={p.role}
                  onChange={(e) => handlePersonChange(idx, "role", e.target.value)}
                  placeholder="Rol o Cargo (ej. CEO, Tech Lead)"
                  className="bg-[#0c140c] text-white border border-[#182818] px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={p.type}
                    onChange={(e) => handlePersonChange(idx, "type", e.target.value)}
                    className="flex-1 bg-[#0c140c] text-white border border-[#182818] px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                  >
                    <option value="client_contact">Contacto Cliente</option>
                    <option value="team_member">Miembro Equipo DA</option>
                  </select>
                  {people.length > 1 && (
                    <button
                      onClick={() => handleRemovePerson(idx)}
                      className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-[#182818]">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#050805] text-slate-300 border border-[#182818] hover:bg-[#142614] rounded-xl text-xs font-mono"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition"
            >
              <span>Siguiente: Squads & Agentes</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SQUADS & AGENTS ALLOCATION */}
      {step === 4 && (
        <div className="bg-[#0c140c] border border-[#182818] p-6 md:p-8 rounded-3xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#182818] pb-3">
            <Bot className="text-[#22c55e]" size={20} /> Paso 4: Asignación de Squads & Agentes de IA
          </h2>

          <div className="space-y-6">
            {/* Squads Selection */}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Selecciona los Squads Responsables (Duplo Núcleo)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_SQUADS.map((squad) => {
                  const isChecked = selectedSquads.includes(squad);
                  return (
                    <button
                      key={squad}
                      onClick={() => toggleSquad(squad)}
                      type="button"
                      className={`p-3 rounded-xl border text-left font-mono text-xs font-bold transition flex items-center justify-between ${
                        isChecked
                          ? "bg-[#142614] text-[#22c55e] border-[#22c55e]/50"
                          : "bg-[#050805] text-slate-400 border-[#182818] hover:text-white"
                      }`}
                    >
                      <span>{squad}</span>
                      {isChecked && <CheckCircle2 size={16} className="text-[#22c55e]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agents Selection */}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Selecciona los Agentes de IA Asignados
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_AGENTS.map((agent) => {
                  const isChecked = selectedAgents.includes(agent);
                  return (
                    <button
                      key={agent}
                      onClick={() => toggleAgent(agent)}
                      type="button"
                      className={`p-3 rounded-xl border text-left font-mono text-xs font-bold transition flex items-center justify-between ${
                        isChecked
                          ? "bg-[#1e1428] text-purple-300 border-purple-500/50"
                          : "bg-[#050805] text-slate-400 border-[#182818] hover:text-white"
                      }`}
                    >
                      <span>@{agent}</span>
                      {isChecked && <CheckCircle2 size={16} className="text-purple-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-between pt-4 border-t border-[#182818]">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#050805] text-slate-300 border border-[#182818] hover:bg-[#142614] rounded-xl text-xs font-mono"
            >
              <ArrowLeft size={14} /> Anterior
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Sincronizando con Vault...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>🚀 Dar de Alta & Sync con Vault</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
