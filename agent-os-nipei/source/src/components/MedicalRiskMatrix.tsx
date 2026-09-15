"use client";

import { useState } from "react";
import { Lock, Unlock, ShieldAlert, HeartPulse, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { INITIAL_CUSTOMERS } from "@/lib/nipeiStore";

export default function MedicalRiskMatrix() {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#1e381e] pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#22c55e]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Matriz de Risco Médico & Prontidão Emocional (Nipëi People)
          </h3>
        </div>

        <button
          onClick={() => setUnlocked(!unlocked)}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2 border ${
            unlocked ? "bg-[#0c1c0c] border-[#22c55e] text-[#4ade80]" : "bg-[#1c0c0c] border-[#ef4444] text-[#ef4444]"
          }`}
        >
          {unlocked ? <Unlock size={14} /> : <Lock size={14} />}
          Firewall Espiritual: {unlocked ? "DESBLOQUEADO" : "PROTEGIDO"}
        </button>
      </div>

      {unlocked ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {INITIAL_CUSTOMERS.map((c) => (
            <div key={c.id} className="p-4 rounded-lg bg-[#050805] border border-[#22c55e] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{c.name}</span>
                <span className="text-[10px] bg-[#142414] text-[#4ade80] px-2 py-0.5 rounded border border-[#22c55e]">
                  Score Emocional: {c.anamnesis.aiEmotionalScore}/100
                </span>
              </div>
              <div className="text-[#a7f3d0]">
                Alergias: {c.anamnesis.allergies.join(", ") || "Nenhuma contraindicação"}
              </div>
              <div className="text-[11px] text-[#4ade80] italic">
                "{c.anamnesis.aiNotes}"
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center space-y-2 rounded bg-[#050805] border border-dashed border-[#ef4444]">
          <ShieldAlert size={28} className="mx-auto text-[#ef4444]" />
          <div className="text-xs font-bold text-white">Dados Médicos Protegidos pelo Firewall Espiritual</div>
          <p className="text-[11px] text-[#a7f3d0] font-mono">
            Apenas terapeutas e médicos autorizados com login do Núcleo Sagrado pueden ver esta sección.
          </p>
        </div>
      )}
    </div>
  );
}
