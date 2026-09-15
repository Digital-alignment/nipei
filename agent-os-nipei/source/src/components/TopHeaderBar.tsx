"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, Target, Layers, ChevronDown, Sparkles,
  Workflow, Brain, ShieldCheck, Kanban, MessagesSquare, MessageSquare,
  Crown, Clock, Zap, CheckCircle2, Network
} from "lucide-react";

export default function TopHeaderBar() {
  const [focusMode, setFocusMode] = useState(false);

  // Timer State (Default 25 minutes = 1500 seconds)
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "short_break">("focus");

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  function switchTimerMode(mode: "focus" | "short_break") {
    setTimerMode(mode);
    setTimerRunning(false);
    if (mode === "focus") setTimerSeconds(1500);
    else setTimerSeconds(300);
  }

  function resetTimer() {
    setTimerRunning(false);
    if (timerMode === "focus") setTimerSeconds(1500);
    else setTimerSeconds(300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      {/* Funcionalidades Dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142414] border border-[#22c55e] text-white hover:bg-[#1e381e] transition font-bold shadow-sm"
        >
          <Layers size={14} className="text-[#22c55e]" />
          <span>Funcionalidades & Módulos</span>
          <ChevronDown size={13} className="text-[#4ade80]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#22c55e] bg-[#0f190f] shadow-2xl z-50 p-2 space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#166534] px-2.5 py-1 border-b border-[#142414] tracking-widest">
              Módulos Core Nipëi OS
            </div>

            {[
              { href: "/", label: "Mission Control (Master Global)", icon: <Crown size={14} className="text-[#22c55e]" /> },
              { href: "/organograma", label: "Organograma Global & Squads", icon: <Network size={14} className="text-[#4ade80]" /> },
              { href: "/flow", label: "Nipëi Flow (Supply & Insumos)", icon: <Workflow size={14} className="text-[#22c55e]" /> },
              { href: "/people", label: "Nipëi People (CRM 360 & Anamnese)", icon: <Brain size={14} className="text-[#4ade80]" /> },
              { href: "/brain", label: "Nipëi Brain (DRE & Governança)", icon: <ShieldCheck size={14} className="text-[#10b981]" /> },
              { href: "/agent-kanban", label: "Multi-Squad Kanban Board", icon: <Kanban size={14} className="text-[#22c55e]" /> },
              { href: "/room", label: "AI Agent Mastermind", icon: <MessagesSquare size={14} className="text-[#a855f7]" /> },
              { href: "/paperclip", label: "Paperclip Vault Inbox", icon: <MessageSquare size={14} className="text-[#d4a574]" /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#162416] text-white transition text-xs font-bold"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Timer / Pomodoro Compact Widget */}
      <div className="flex items-center gap-2 bg-[#050805] px-2.5 py-1 rounded-lg border border-[#1e381e]">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#22c55e] animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wider">{formattedTime}</span>
        </div>

        <div className="flex items-center gap-1 border-l border-[#1e381e] pl-2">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-1 rounded bg-[#142414] text-[#4ade80] hover:bg-[#1e381e] transition"
            title={timerRunning ? "Pausar" : "Iniciar"}
          >
            {timerRunning ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-1 rounded bg-[#142414] text-[#a7f3d0] hover:bg-[#1e381e] transition"
            title="Reiniciar Timer"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => switchTimerMode("focus")}
            className={`px-1.5 py-0.5 rounded transition ${
              timerMode === "focus" ? "bg-[#22c55e] text-[#050805] font-bold" : "text-[#a7f3d0] hover:bg-[#142414]"
            }`}
          >
            Focus 25m
          </button>
          <button
            onClick={() => switchTimerMode("short_break")}
            className={`px-1.5 py-0.5 rounded transition ${
              timerMode === "short_break" ? "bg-[#22c55e] text-[#050805] font-bold" : "text-[#a7f3d0] hover:bg-[#142414]"
            }`}
          >
            Pausa 5m
          </button>
        </div>
      </div>

      {/* Focus Mode Toggle */}
      <button
        onClick={() => setFocusMode(!focusMode)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
          focusMode
            ? "bg-[#22c55e] text-[#050805] border-[#4ade80]"
            : "bg-[#050805] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
        }`}
      >
        <Target size={13} />
        <span>Focus: {focusMode ? "ON" : "OFF"}</span>
      </button>

      {/* Focus Mode Banner */}
      {focusMode && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-1 p-2 rounded-lg bg-[#0c1c0c] border border-[#22c55e] text-center text-xs text-[#4ade80] font-mono flex items-center justify-center gap-2"
        >
          <Target size={13} className="animate-spin text-[#22c55e]" />
          <span><strong>Focus Mode Ativado</strong> — Distrações minimizadas.</span>
        </motion.div>
      )}
    </div>
  );
}
