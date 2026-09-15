"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Terminal, Zap, CheckCircle2, Play, RefreshCw, Cpu, Activity } from "lucide-react";

export default function AgentSwarmTerminal() {
  const [logs, setLogs] = useState<string[]>([
    "[09:50:12] @antigravity initialized NEXUS-Sprint multi-agent harness.",
    "[09:50:15] @hermes synchronized 1,261 vault memories & active tasks.",
    "[09:50:20] @claude streamed code audit for Squad IV Fichas Técnicas.",
    "[09:50:28] @openclaw verified local gateway endpoints: ALL SYSTEMS OK.",
  ]);
  const [isSwarming, setIsSwarming] = useState(false);

  function handleTriggerSwarm() {
    setIsSwarming(true);
    const newLogs = [
      `[${new Date().toLocaleTimeString()}] 🚀 DISPARANDO ENXAME DE AGENTES (SWARM AUDIT)...`,
    ];
    setLogs((prev) => [...newLogs, ...prev]);

    setTimeout(() => {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 🔍 @antigravity: Verificando alinhamento ético do Squad VII (Instituto)...`,
        ...prev,
      ]);
    }, 1200);

    setTimeout(() => {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 📦 @hermes: Auditando estoques de matérias-primas e frascos no Squad II (Mutum)...`,
        ...prev,
      ]);
    }, 2400);

    setTimeout(() => {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 💰 @claude: Calculando consolidação DRE no Squad V (Adm/Legal)...`,
        ...prev,
      ]);
    }, 3600);

    setTimeout(() => {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ✅ SWARM AUDIT CONCLUÍDO: 7 Squads auditados. 0 falhas encontradas.`,
        ...prev,
      ]);
      setIsSwarming(false);
    }, 4800);
  }

  return (
    <div className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e381e] pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[#22c55e]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Terminal de Telemetria da Flota de Agentes IA (Swarm)
          </h3>
        </div>

        <button
          onClick={handleTriggerSwarm}
          disabled={isSwarming}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#22c55e] text-xs font-bold text-[#050805] hover:bg-[#4ade80] transition disabled:opacity-50 font-mono shadow shrink-0"
        >
          <Zap size={14} /> {isSwarming ? "Executando Swarm Audit..." : "Disparar Enxame (Swarm Audit)"}
        </button>
      </div>

      {/* Terminal Display */}
      <div className="p-4 rounded-lg bg-[#050805] border border-[#1e381e] font-mono text-xs text-[#4ade80] space-y-1.5 max-h-48 overflow-y-auto scroll">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-[#166534] select-none">&gt;</span>
            <span className={log.includes("SWARM") ? "text-white font-bold" : ""}>{log}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-[#a7f3d0] pt-1 border-t border-[#142414]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
          <span>Agentes Ativos: @antigravity, @hermes, @claude, @openclaw, @glm</span>
        </div>
        <span>Velocidade Token: 142 tok/sec</span>
      </div>
    </div>
  );
}
