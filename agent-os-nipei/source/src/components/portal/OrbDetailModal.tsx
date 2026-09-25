"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Bot,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  Target,
  FileText,
  Send,
} from "lucide-react";
import { OrbData, FlowStepItem } from "./OrbItem";

interface OrbDetailModalProps {
  orb: OrbData | null;
  onClose: () => void;
  onUpdateOrb: (updatedOrb: OrbData) => void;
}

export default function OrbDetailModal({ orb, onClose, onUpdateOrb }: OrbDetailModalProps) {
  if (!orb) return null;

  // New task form state
  const [newTaskText, setNewTaskText] = useState<string>("");
  const [newTaskTag, setNewTaskTag] = useState<string>("Ivy Lee");

  // Editing state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Agent chat quick prompt state
  const [agentPrompt, setAgentPrompt] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);

  // Recalculate percent and status based on steps
  const updateOrbSteps = (newSteps: FlowStepItem[], updatedLeadMeasure?: OrbData["leadMeasure"], updatedNotes?: string) => {
    const completedCount = newSteps.filter((s) => s.completed).length;
    const newPercent = newSteps.length > 0 ? Math.round((completedCount / newSteps.length) * 100) : 0;
    const newStatus = newPercent === 100 ? "concluido" : newPercent > 0 ? "en_curso" : "pendiente";

    const updatedOrb: OrbData = {
      ...orb,
      flowSteps: newSteps,
      progressPercent: newPercent,
      status: newStatus,
      leadMeasure: updatedLeadMeasure !== undefined ? updatedLeadMeasure : orb.leadMeasure,
      notes: updatedNotes !== undefined ? updatedNotes : orb.notes,
    };

    onUpdateOrb(updatedOrb);
  };

  // Handler: Toggle step completed
  const handleToggleStep = (stepId: string) => {
    const updatedSteps = orb.flowSteps.map((s) =>
      s.id === stepId ? { ...s, completed: !s.completed } : s
    );
    updateOrbSteps(updatedSteps);
  };

  // Handler: Add new task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newStepItem: FlowStepItem = {
      id: `step_${Date.now()}`,
      step: newTaskText.trim(),
      completed: false,
      methodologyTag: newTaskTag,
    };

    const updatedSteps = [...orb.flowSteps, newStepItem];
    setNewTaskText("");
    updateOrbSteps(updatedSteps);
  };

  // Handler: Delete task
  const handleDeleteTask = (stepId: string) => {
    const updatedSteps = orb.flowSteps.filter((s) => s.id !== stepId);
    updateOrbSteps(updatedSteps);
  };

  // Handler: Start editing task
  const handleStartEdit = (step: FlowStepItem) => {
    setEditingStepId(step.id);
    setEditingText(step.step);
  };

  // Handler: Save edited task
  const handleSaveEdit = (stepId: string) => {
    if (!editingText.trim()) return;
    const updatedSteps = orb.flowSteps.map((s) =>
      s.id === stepId ? { ...s, step: editingText.trim() } : s
    );
    setEditingStepId(null);
    updateOrbSteps(updatedSteps);
  };

  // Handler: Adjust Lead Measure counter
  const handleAdjustLeadMeasure = (delta: number) => {
    if (!orb.leadMeasure) return;
    const newCurrent = Math.max(0, Math.min(orb.leadMeasure.target, orb.leadMeasure.current + delta));
    const updatedLead = { ...orb.leadMeasure, current: newCurrent };
    updateOrbSteps(orb.flowSteps, updatedLead);
  };

  // Handler: Save notes
  const handleNotesChange = (val: string) => {
    updateOrbSteps(orb.flowSteps, orb.leadMeasure, val);
  };

  // Handler: Send instruction to Agent
  const handleSendAgentPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentPrompt.trim()) return;

    setAgentResponse(
      `🤖 Instrucción enviada a ${orb.activeAgents[0] || "@vaultkeeper"}: "${agentPrompt}". El agente ha sincronizado las notas en el Vault.`
    );
    setAgentPrompt("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#090d14] border rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col justify-between"
        style={{
          borderColor: orb.colorTheme.border,
          boxShadow: `0 20px 60px -15px ${orb.colorTheme.glow}`,
        }}
      >
        {/* Ambient Background Aura */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: orb.colorTheme.primary }}
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            {/* Sphere Icon Badge */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg shrink-0"
              style={{
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), ${orb.colorTheme.primary} 60%, rgba(0,0,0,0.9))`,
                borderColor: orb.colorTheme.border,
              }}
            >
              <Sparkles size={20} className="text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-slate-300">
                  {orb.phaseCategory}
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  {orb.timeframe}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                {orb.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 relative z-10 pr-1">
          {/* Description & Status Banner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Objetivo & Enfoque Metodológico
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {orb.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-mono font-bold text-white block">
                {orb.progressPercent}% Concluido
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Estado: {orb.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Active Methodologies Badges */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} className="text-emerald-400" />
              <span>Metodologías de Productividad Activas</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {orb.methodologies.map((m, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold"
                >
                  ⚡ {m}
                </span>
              ))}
            </div>
          </div>

          {/* 4DX Lead Measure Counter (If present) */}
          {orb.leadMeasure && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-blue-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">
                    Indicador Predictivo (4DX Lead Measure)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {orb.leadMeasure.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAdjustLeadMeasure(-1)}
                  className="w-7 h-7 rounded-lg bg-black/60 border border-white/20 text-white font-bold text-xs hover:bg-white/20 transition flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-blue-300">
                  {orb.leadMeasure.current} / {orb.leadMeasure.target} {orb.leadMeasure.unit}
                </span>
                <button
                  onClick={() => handleAdjustLeadMeasure(1)}
                  className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Checklist of Steps & Edit/Add Functionality */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tareas & Pasos del Orbe ({orb.flowSteps.length})
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Puedes agregar o editar tareas
              </span>
            </div>

            {/* List of Tasks */}
            <div className="space-y-2 mb-3">
              {orb.flowSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                    step.completed
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                      : "bg-white/5 border-white/10 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => handleToggleStep(step.id)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        step.completed
                          ? "bg-emerald-500 border-emerald-400 text-black"
                          : "border-slate-500 hover:border-emerald-400"
                      }`}
                    >
                      {step.completed && <CheckCircle2 size={14} />}
                    </button>

                    {editingStepId === step.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-black/60 border border-emerald-500 text-xs text-white rounded px-2 py-1 outline-none"
                        />
                        <button
                          onClick={() => handleSaveEdit(step.id)}
                          className="p-1 rounded bg-emerald-600 text-white"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium">{step.step}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5 shrink-0">
                      {step.methodologyTag}
                    </span>

                    {/* Action buttons: Edit & Delete */}
                    {editingStepId !== step.id && (
                      <button
                        onClick={() => handleStartEdit(step)}
                        className="p-1 text-slate-400 hover:text-white transition"
                        title="Editar tarea"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTask(step.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      title="Eliminar tarea"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to Add New Task */}
            <form onSubmit={handleAddTask} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="+ Agregar nueva tarea a este Orbe..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <select
                value={newTaskTag}
                onChange={(e) => setNewTaskTag(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="Ivy Lee">Ivy Lee</option>
                <option value="4DX">4DX</option>
                <option value="Deep Work">Deep Work</option>
                <option value="Triaje">Triaje</option>
                <option value="Kaizen">Kaizen</option>
                <option value="Estoicismo">Estoicismo</option>
                <option value="General">General</option>
              </select>

              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition"
              >
                <Plus size={14} />
                <span>Agregar</span>
              </button>
            </form>
          </div>

          {/* Kaizen Notes & Journaling Box */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={13} className="text-amber-400" />
              <span>Bitácora & Fricciones Kaizen del Orbe</span>
            </h4>
            <textarea
              rows={3}
              placeholder="Escribe notas, observaciones o fricciones detectadas durante este Orbe..."
              value={orb.notes || ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none font-mono"
            />
          </div>

          {/* Quick Agent Instruction Bar */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bot size={13} className="text-cyan-400" />
              <span>Instrucción Rápida a Agente ({orb.activeAgents[0] || "@vaultkeeper"})</span>
            </h4>
            <form onSubmit={handleSendAgentPrompt} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Enviar instrucción sobre "${orb.title}" a los agentes...`}
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                className="flex-1 bg-black/50 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 transition"
              >
                <Send size={13} />
                <span>Enviar</span>
              </button>
            </form>
            {agentResponse && (
              <div className="mt-2 p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300">
                {agentResponse}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
          <div className="text-[11px] font-mono text-slate-400">
            Nipëi OS • Sincronización en vivo con Mission Control
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <span>Cerrar Orbe</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
