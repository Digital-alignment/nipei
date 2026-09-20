"use client";

import { useState } from "react";
import { X, Bot, ShieldAlert, Sparkles, Plus, Trash2, Lock, EyeOff, Save, CheckCircle2 } from "lucide-react";
import { MemberProfile, SquadMeta, AIAgentConfig } from "@/lib/nipeiStore";

interface AgentProvisioningWizardProps {
  isOpen: boolean;
  onClose: () => void;
  squadsList: SquadMeta[];
  targetSquadId?: string;
  onSaveAgent: (newMemberAgent: MemberProfile) => void;
}

export default function AgentProvisioningWizard({
  isOpen,
  onClose,
  squadsList,
  targetSquadId,
  onSaveAgent,
}: AgentProvisioningWizardProps) {
  const [provisionType, setProvisionType] = useState<"NEW_CUSTOM_PROVISIONED" | "EXISTING_REUSED">("NEW_CUSTOM_PROVISIONED");
  const [selectedExistingHandle, setSelectedExistingHandle] = useState<string>("@antigravity");

  const [handle, setHandle] = useState<string>("@vaultkeeper");
  const [name, setName] = useState<string>("VaultKeeper — Master Auditor de Conhecimento");
  const [avatar, setAvatar] = useState<string>("🧠");
  const [selectedSquad, setSelectedSquad] = useState<string>(targetSquadId || "squad_vb_knowledge");
  const [roleTitle, setRoleTitle] = useState<string>("Auditor Principal do Nipëi Vault");
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "Eres el guardián absoluto del conocimiento en Nipëi OS. Tu misión es conocer cada carpeta del Vault, detectar vacíos de información, resolver consultas exactas y mantener el cortafuegos de privacidad activo."
  );

  const [capabilities, setCapabilities] = useState<string[]>([
    "Auditoría Semántica en Tiempo Real",
    "Detección de Vacíos de Información",
    "Curaduría de Galerías y Archivos Multimedia",
    "Sincronización Multicanal con Plataformas",
    "Firewall de Sensibilidad & Filtrado de Privacidad",
  ]);
  const [newCap, setNewCap] = useState("");

  const [restrictedTopics, setRestrictedTopics] = useState<string[]>([
    "Contraseñas SSH y llaves de VPS privadas",
    "Anamnesis médica detallada de pacientes (Datos protegidos LGPD)",
    "Tarjetas de crédito o cuentas bancarias personales",
    "Fórmulas secretas de laboratorio sin patente registrada",
  ]);
  const [newTopic, setNewTopic] = useState("");

  const [actionPolicy, setActionPolicy] = useState<"DENY_WITH_REASON" | "REDACT_SENSITIVE_DATA" | "ESCALATE_TO_SAGRADO">(
    "REDACT_SENSITIVE_DATA"
  );

  if (!isOpen) return null;

  const handleAddCap = () => {
    if (!newCap.trim()) return;
    setCapabilities([...capabilities, newCap.trim()]);
    setNewCap("");
  };

  const handleRemoveCap = (idx: number) => {
    setCapabilities(capabilities.filter((_, i) => i !== idx));
  };

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;
    setRestrictedTopics([...restrictedTopics, newTopic.trim()]);
    setNewTopic("");
  };

  const handleRemoveTopic = (idx: number) => {
    setRestrictedTopics(restrictedTopics.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isNew = provisionType === "NEW_CUSTOM_PROVISIONED";
    const agentHandle = isNew ? (handle.startsWith("@") ? handle : `@${handle}`) : selectedExistingHandle;
    const agentName = isNew ? name : `Agente ${selectedExistingHandle}`;
    const agentAvatar = isNew ? avatar : "🤖";

    const aiConfig: AIAgentConfig = {
      handle: agentHandle,
      name: agentName,
      squadId: selectedSquad,
      systemPrompt,
      capabilities,
      allowedVaultPaths: ["Ingested_Knowledge/*", "Squads/*", "Projects/*", "Especificaciones/*"],
      restrictedTopics,
      actionPolicy,
      createdType: provisionType,
    };

    const newMemberAgent: MemberProfile = {
      id: `agente_${agentHandle.replace("@", "")}_${Date.now()}`,
      name: agentName,
      avatar: agentAvatar,
      type: "ai_agent",
      contractType: "Fijo",
      status: "APPROVED",
      hasMissingInfo: false,
      specialityOrLineage: `Agente IA Especializado asignado a ${selectedSquad}.`,
      globalRole: "SUPER_USER",
      companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS Brain", positionTitle: "Agente IA Específico" }],
      squadAssignments: [
        { squadId: selectedSquad, roleTitle, confirmationStatus: "APPROVED", isPrimary: true },
      ],
      responsibilities: capabilities,
      aiAgentConfig: aiConfig,
    };

    onSaveAgent(newMemberAgent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="w-full max-w-3xl bg-[#091409] border border-[#22c55e]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#1e381e] bg-[#050805] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#142414] border border-[#22c55e]/40 text-[#22c55e]">
              <Bot size={24} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#22c55e] font-bold uppercase tracking-wider">
                Motor de Provisionamento IA — Nipëi OS
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Aprovisionar o Crear Nuevo Agente IA para Squad
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded text-[#a7f3d0] hover:bg-[#142414] transition">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 font-mono text-xs text-[#a7f3d0]">
          {/* Tipo de Provisionamiento */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setProvisionType("NEW_CUSTOM_PROVISIONED")}
              className={`p-4 rounded-xl border text-left transition flex flex-col gap-1 ${
                provisionType === "NEW_CUSTOM_PROVISIONED"
                  ? "bg-[#142414] border-[#22c55e] text-white shadow-lg"
                  : "bg-[#050805] border-[#1e381e] text-[#a7f3d0] hover:bg-[#0c1c0c]"
              }`}
            >
              <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                <Sparkles size={14} /> Crear Nuevo Agente IA Exclusivo
              </span>
              <span className="text-[11px] text-[#a7f3d0] leading-relaxed">
                Diseñar un agente personalizado desde cero con system prompt, capacidades y firewall propio.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProvisionType("EXISTING_REUSED")}
              className={`p-4 rounded-xl border text-left transition flex flex-col gap-1 ${
                provisionType === "EXISTING_REUSED"
                  ? "bg-[#142414] border-[#22c55e] text-white shadow-lg"
                  : "bg-[#050805] border-[#1e381e] text-[#a7f3d0] hover:bg-[#0c1c0c]"
              }`}
            >
              <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                <Bot size={14} /> Reutilizar Agente Existente
              </span>
              <span className="text-[11px] text-[#a7f3d0] leading-relaxed">
                Asignar un agente ya existente (@antigravity, @hermes, @openclaw, @claude, @glm) a este Squad.
              </span>
            </button>
          </div>

          {/* Si es reutilizado */}
          {provisionType === "EXISTING_REUSED" && (
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Seleccionar Agente Existente
              </label>
              <select
                value={selectedExistingHandle}
                onChange={(e) => setSelectedExistingHandle(e.target.value)}
                className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs font-mono focus:border-[#22c55e] focus:outline-none"
              >
                <option value="@antigravity">@antigravity (AI Mastermind & Orquestador)</option>
                <option value="@hermes">@hermes (AI Memória & Despachante OS)</option>
                <option value="@openclaw">@openclaw (AI Trazabilidade & Bioeconomia)</option>
                <option value="@claude">@claude (AI Concierge & Auditor Fiscal)</option>
                <option value="@glm">@glm (AI Growth & Automação de Vendas)</option>
              </select>
            </div>
          )}

          {/* Campos para Agente Nuevo */}
          {provisionType === "NEW_CUSTOM_PROVISIONED" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Handle (@nick)</label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@vaultkeeper"
                    className="w-full p-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Emoji / Avatar</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full p-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white mb-1">Squad Asignado</label>
                  <select
                    value={selectedSquad}
                    onChange={(e) => setSelectedSquad(e.target.value)}
                    className="w-full p-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
                  >
                    {squadsList.map((sq) => (
                      <option key={sq.id} value={sq.id}>
                        {sq.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">Nombre Completo del Agente</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VaultKeeper — Master Auditor de Conhecimento"
                  className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">Rol / Función en el Squad</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Ej: Auditor Principal do Nipëi Vault"
                  className="w-full p-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">System Prompt del Agente</label>
                <textarea
                  rows={3}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Capacidades Especializadas */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white uppercase">Capacidades del Agente</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCap}
                onChange={(e) => setNewCap(e.target.value)}
                placeholder="Añadir capacidad (ej. Auditoría Semántica)..."
                className="flex-1 p-2 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCap())}
              />
              <button
                type="button"
                onClick={handleAddCap}
                className="px-3 py-2 rounded bg-[#142414] text-[#22c55e] border border-[#22c55e] font-bold"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {capabilities.map((cap, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded bg-[#050805] border border-[#1e381e] text-[#a7f3d0] text-[11px] flex items-center gap-1.5"
                >
                  ⚡ {cap}
                  <button type="button" onClick={() => handleRemoveCap(i)} className="text-red-400 hover:text-red-300">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Firewall de Sensibilidad & Control de Alcance */}
          <div className="p-4 rounded-xl border border-red-900/60 bg-red-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-red-900/50 pb-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase">
                <Lock size={16} /> Firewall de Sensibilidad (Control de Alcance)
              </div>
              <span className="text-[10px] font-mono text-red-300">Palabras & Contextos Prohibidos</span>
            </div>

            <p className="text-[11px] text-red-200/90 leading-relaxed">
              Ingresa manualmente los temas, datos o contextos confidenciales que este Agente IA no tiene permitido revelar ni procesar.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Añadir tema/palabra prohibida (ej. Contraseñas SSH)..."
                className="flex-1 p-2 rounded bg-[#050805] border border-red-900/60 text-white text-xs focus:border-red-500 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="px-3 py-2 rounded bg-red-950 text-red-400 border border-red-800 font-bold hover:bg-red-900 transition"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-1.5 mt-2">
              {restrictedTopics.map((topic, i) => (
                <div
                  key={i}
                  className="p-2 rounded bg-[#050805] border border-red-900/60 text-red-300 text-xs flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <EyeOff size={13} className="text-red-400" /> {topic}
                  </span>
                  <button type="button" onClick={() => handleRemoveTopic(i)} className="text-red-400 hover:text-red-200">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Política de Acción */}
            <div className="pt-2 border-t border-red-900/40">
              <label className="block text-[11px] font-bold text-red-300 mb-1">
                Acción ante Detección de Contenido Sensible
              </label>
              <select
                value={actionPolicy}
                onChange={(e) => setActionPolicy(e.target.value as any)}
                className="w-full p-2 rounded bg-[#050805] border border-red-900/60 text-white text-xs font-mono focus:border-red-500 focus:outline-none"
              >
                <option value="REDACT_SENSITIVE_DATA">Enmascarar datos sensibles con [DATOS_RESTRICTOS]</option>
                <option value="DENY_WITH_REASON">Denegar la solicitud con justificación técnica</option>
                <option value="ESCALATE_TO_SAGRADO">Derivar a revisión del Veto Gate (Núcleo Sagrado)</option>
              </select>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-[#1e381e] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#050805] border border-[#1e381e] text-[#a7f3d0] font-bold hover:bg-[#142414] transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-[#22c55e] text-[#050805] font-bold hover:bg-[#16a34a] transition flex items-center gap-2 shadow-lg"
            >
              <Save size={16} /> Provisionar Agente & Sincronizar Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
