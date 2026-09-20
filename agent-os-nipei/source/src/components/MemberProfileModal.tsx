"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertTriangle, Building2, Layers, ShieldCheck, UserCheck, Edit, Save, Plus, Trash2 } from "lucide-react";
import { MemberProfile, MemberSquadAssignment, MemberCompanyAssignment } from "@/lib/nipeiStore";

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberProfile | null;
  onSaveMember: (updatedMember: MemberProfile) => void;
}

export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
  onSaveMember,
}: MemberProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<MemberProfile>>({});

  if (!isOpen || !member) return null;

  const currentData = isEditing ? formData : member;

  const startEdit = () => {
    setFormData({
      ...member,
      squadAssignments: [...member.squadAssignments],
      companyAssignments: [...member.companyAssignments],
      responsibilities: [...member.responsibilities],
    });
    setIsEditing(true);
  };

  const handleToggleStatus = async () => {
    const newStatus = member.status === "APPROVED" ? "PENDING_CONFIRMATION" : "APPROVED";
    const updated: MemberProfile = {
      ...member,
      status: newStatus,
      squadAssignments: member.squadAssignments.map((sa) => ({
        ...sa,
        confirmationStatus: newStatus,
      })),
    };
    onSaveMember(updated);
  };

  const handleSave = () => {
    const updated: MemberProfile = {
      ...member,
      ...formData,
      id: member.id,
    } as MemberProfile;
    onSaveMember(updated);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="w-full max-w-3xl bg-[#091409] border border-[#22c55e]/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#1e381e] bg-[#050805] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#142414] border border-[#22c55e]/40 flex items-center justify-center text-3xl shadow">
              {member.avatar || "👥"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-[#142414] text-[10px] font-mono text-[#4ade80] border border-[#22c55e]/30 font-bold uppercase">
                  {member.type.replace("human_", "").toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0f190f] text-[10px] font-mono text-[#a7f3d0] border border-[#1e381e]">
                  Contrato: {member.contractType || "Estándar"}
                </span>

                {member.status === "APPROVED" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0c1c0c] text-[10px] font-mono font-bold text-[#4ade80] border border-[#22c55e] flex items-center gap-1">
                    <CheckCircle2 size={12} /> Confirmado Activo
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/60 text-[10px] font-mono font-bold text-amber-400 border border-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} /> Requer Confirmación Manual
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
                {member.name} {member.nativeName && <span className="text-[#22c55e]">({member.nativeName})</span>}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={startEdit}
                className="px-3 py-1.5 rounded bg-[#142414] text-[#22c55e] border border-[#22c55e] text-xs font-mono font-bold hover:bg-[#22c55e] hover:text-[#050805] transition flex items-center gap-1.5"
              >
                <Edit size={14} /> Editar Expediente
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded bg-[#22c55e] text-[#050805] text-xs font-mono font-bold hover:bg-[#16a34a] transition flex items-center gap-1.5"
              >
                <Save size={14} /> Guardar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded text-[#a7f3d0] hover:bg-[#142414] transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-mono text-xs text-[#a7f3d0]">
          {/* Missing Info Warning */}
          {member.hasMissingInfo && (
            <div className="p-4 rounded-xl border border-amber-600/60 bg-amber-950/30 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                <AlertTriangle size={16} /> Información Faltante por Completar
              </div>
              <p className="text-xs text-amber-200">{member.missingInfoDetails}</p>
            </div>
          )}

          {/* Manual Confirmation Toggle Control */}
          <div className="p-4 rounded-xl border border-[#1e381e] bg-[#050805] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <UserCheck size={16} className="text-[#22c55e]" /> Confirmación Manual de Integrante
              </div>
              <p className="text-[11px] text-[#a7f3d0]">
                Todos los usuarios requieren confirmación manual para validar sus asignaciones en Squads y Empresas.
              </p>
            </div>

            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 border ${
                member.status === "APPROVED"
                  ? "bg-amber-950/40 text-amber-400 border-amber-600 hover:bg-amber-900/50"
                  : "bg-[#22c55e] text-[#050805] border-[#22c55e] hover:bg-[#16a34a]"
              }`}
            >
              {member.status === "APPROVED" ? "Pausar / Solicitar Re-confirmación" : "✅ Confirmar Integrante Manualmente"}
            </button>
          </div>

          {/* Saberes, Linaje & Hitos Históricos */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1e381e] pb-1.5">
              <ShieldCheck size={16} className="text-[#22c55e]" /> Saberes Ancestrales, Linaje & Hitos Históricos
            </div>
            {!isEditing ? (
              <p className="p-3 rounded bg-[#050805] border border-[#1e381e] text-xs text-[#a7f3d0] leading-relaxed">
                {member.specialityOrLineage || "Sin registro de especialidad."}
              </p>
            ) : (
              <textarea
                rows={3}
                value={formData.specialityOrLineage || ""}
                onChange={(e) => setFormData({ ...formData, specialityOrLineage: e.target.value })}
                className="w-full p-3 rounded bg-[#050805] border border-[#1e381e] text-white text-xs focus:border-[#22c55e] focus:outline-none"
              />
            )}
          </div>

          {/* Asignación en Squads (Matriz Multisentido) */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center justify-between border-b border-[#1e381e] pb-1.5">
              <span className="flex items-center gap-2">
                <Layers size={16} className="text-[#22c55e]" /> Asignación en Squads ({member.squadAssignments.length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {member.squadAssignments.map((sa, i) => (
                <div key={i} className="p-3 rounded-lg border border-[#1e381e] bg-[#050805] space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4ade80] uppercase">{sa.squadId}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        sa.confirmationStatus === "APPROVED"
                          ? "bg-[#0c1c0c] text-[#4ade80] border border-[#22c55e]"
                          : "bg-amber-950/60 text-amber-400 border border-amber-600"
                      }`}
                    >
                      {sa.confirmationStatus === "APPROVED" ? "Confirmado" : "Pendiente"}
                    </span>
                  </div>
                  <div className="text-xs text-white font-bold">{sa.roleTitle}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vinculación con Empresas */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1e381e] pb-1.5">
              <Building2 size={16} className="text-[#22c55e]" /> Vinculación de Empresas & Entidades
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {member.companyAssignments.map((ca, i) => (
                <div key={i} className="p-3 rounded-lg border border-[#1e381e] bg-[#050805] space-y-1">
                  <div className="text-xs font-bold text-white">{ca.companyName}</div>
                  <div className="text-[11px] text-[#a7f3d0]">{ca.positionTitle}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Responsabilidades Objetivas */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1e381e] pb-1.5">
              🎯 Responsabilidades Objetivas
            </div>
            <ul className="space-y-1.5">
              {member.responsibilities.map((r, i) => (
                <li key={i} className="p-2 rounded bg-[#050805] border border-[#1e381e] text-xs text-[#a7f3d0]">
                  • {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
