"use client";

import React, { useState } from "react";
import { X, Sparkles, Wand2, User, Building2, Layers, Clock } from "lucide-react";
import { OrbData } from "./OrbItem";

interface CreateOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateOrb: (newOrb: OrbData) => void;
  defaultScope?: "personal" | "empresa";
}

export default function CreateOrbModal({
  isOpen,
  onClose,
  onCreateOrb,
  defaultScope = "personal",
}: CreateOrbModalProps) {
  const [title, setTitle] = useState<string>("");
  const [scope, setScope] = useState<"personal" | "empresa">(defaultScope);
  const [subCategory, setSubCategory] = useState<string>("flujo_diario");
  const [timeframe, setTimeframe] = useState<string>("14:00 - 15:30");
  const [promptDescription, setPromptDescription] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateAndCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsGenerating(true);

    // Simulate AI Agent processing
    setTimeout(() => {
      const generatedId = `custom_orb_${Date.now()}`;
      
      // Color theme based on scope
      const primaryColor = scope === "personal" ? "#10b981" : "#3b82f6";
      const borderColor = scope === "personal" ? "rgba(16, 185, 129, 0.4)" : "rgba(59, 130, 246, 0.4)";
      const glowColor = scope === "personal" ? "rgba(16, 185, 129, 0.25)" : "rgba(59, 130, 246, 0.25)";

      const newOrb: OrbData = {
        id: generatedId,
        title: title.trim(),
        subtitle: promptDescription.trim().slice(0, 60) || "Orbe personalizado generado por IA",
        timeframe: timeframe.trim() || "Horario Libre",
        phaseCategory: scope === "personal" ? "Personal Custom" : "Empresa Custom",
        scope,
        subCategory,
        status: "pendiente",
        progressPercent: 0,
        methodologies: ["Ivy Lee", "Kaizen", "Deep Work"],
        activeAgents: ["@vaultkeeper"],
        colorTheme: {
          primary: primaryColor,
          border: borderColor,
          glow: glowColor,
          gradient: scope === "personal" ? "from-emerald-500/20 via-teal-950/40 to-black" : "from-blue-500/20 via-indigo-950/40 to-black",
          badgeBg: scope === "personal" ? "bg-emerald-950/80" : "bg-blue-950/80",
          badgeText: scope === "personal" ? "text-emerald-300" : "text-blue-300",
        },
        iconName: "Sparkles",
        description: promptDescription.trim() || "Orbe creado por el usuario para cumplimiento de metas.",
        flowSteps: [
          {
            id: `step_${generatedId}_1`,
            step: `Definir arquitectura inicial para: ${title}`,
            completed: false,
            methodologyTag: "Ivy Lee",
          },
          {
            id: `step_${generatedId}_2`,
            step: "Ejecutar primer bloque de foco sin interrupciones",
            completed: false,
            methodologyTag: "Deep Work",
          },
          {
            id: `step_${generatedId}_3`,
            step: "Registrar avance y fricciones en el Vault",
            completed: false,
            methodologyTag: "Kaizen",
          },
        ],
        notes: `Generado mediante IA a partir del prompt: "${promptDescription}"`,
        isMandatory: false, // Custom Orbs can be edited or deleted!
      };

      setIsGenerating(false);
      onCreateOrb(newOrb);
      onClose();

      // Reset form
      setTitle("");
      setPromptDescription("");
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#090d14] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.3)] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 bg-cyan-500 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
              <Wand2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Crear Nuevo Orbe de Foco
              </h2>
              <p className="text-xs text-slate-400">
                Describe la meta y los Agentes estructurarán las tareas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerateAndCreate} className="py-5 space-y-5 relative z-10">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Título del Orbe *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Proyecto Rediseño Branding DA / Aprender Rust..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          {/* Scope Selector: Personal vs Empresa */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Ámbito *
              </label>
              <div className="flex items-center gap-2 p-1 bg-black/50 border border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setScope("personal");
                    setSubCategory("flujo_diario");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                    scope === "personal"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope("empresa");
                    setSubCategory("flujo_diario");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                    scope === "empresa"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Empresa
                </button>
              </div>
            </div>

            {/* Sub-Category Selector */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Sub-Categoría *
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
              >
                {scope === "personal" ? (
                  <>
                    <option value="flujo_diario">✨ Flujo Diario</option>
                    <option value="areas_vida">🏋️ Áreas de Vida</option>
                    <option value="hobbies_filosofia">🎵 Hobbies & Filosofía</option>
                  </>
                ) : (
                  <>
                    <option value="flujo_diario">✨ Flujo Diario</option>
                    <option value="clientes_da">🏢 Clientes Externos DA</option>
                    <option value="productos_propios">🚀 Productos Propios</option>
                    <option value="squads_infra">🤖 Squads & Infra</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Franja Horaria / Período
            </label>
            <input
              type="text"
              placeholder="Ej. 14:00 - 16:00 / Área de Vida / Proyecto Trimestral"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Prompt Description for AI Generation */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              ¿Sobre qué es este Orbe? (Prompt de Generación por IA) *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explica qué quieres lograr. Los agentes de IA estructurarán las tareas iniciales, métodos y métricas..."
              value={promptDescription}
              onChange={(e) => setPromptDescription(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={15} />
              <span>{isGenerating ? "Generando con IA..." : "✨ Generar Orbe con IA"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
