"use client";

import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Target, Clock } from "lucide-react";

export default function TopHeaderBar() {
  const [focusMode, setFocusMode] = useState(false);

  // Timer State (Default 25 minutes = 1500 seconds)
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "short_break">("focus");

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
    <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
      {/* Pomodoro Compact Widget */}
      <div className="flex items-center gap-1.5 bg-[#0a120c] px-2 py-1 rounded-lg border border-white/10 text-zinc-300 shadow-sm">
        <Clock size={12} className={`text-[#22c55e] ${timerRunning ? "animate-pulse" : ""}`} />
        <span className="font-bold text-white tracking-wider text-[11px]">{formattedTime}</span>

        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-0.5">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition"
            title={timerRunning ? "Pausar timer" : "Iniciar timer"}
          >
            {timerRunning ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition"
            title="Reiniciar timer"
          >
            <RotateCcw size={10} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 text-[10px] border-l border-white/10 pl-1.5">
          <button
            onClick={() => switchTimerMode("focus")}
            className={`px-1.5 py-0.5 rounded transition ${
              timerMode === "focus"
                ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Sessão de Foco (25 min)"
          >
            25m
          </button>
          <button
            onClick={() => switchTimerMode("short_break")}
            className={`px-1.5 py-0.5 rounded transition ${
              timerMode === "short_break"
                ? "bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Pausa Curta (5 min)"
          >
            5m
          </button>
        </div>
      </div>

      {/* Focus Mode Button */}
      <button
        onClick={() => setFocusMode(!focusMode)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition border ${
          focusMode
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
            : "bg-[#0a120c] text-zinc-400 border-white/10 hover:text-zinc-200 hover:border-emerald-500/30"
        }`}
        title={focusMode ? "Modo Foco Ativo (Clique para desativar)" : "Ativar Modo Foco"}
      >
        <Target size={12} className={focusMode ? "text-emerald-400 animate-spin" : "text-zinc-500"} />
        <span>Focus <strong className={focusMode ? "text-emerald-400" : "text-zinc-400"}>{focusMode ? "ON" : "OFF"}</strong></span>
      </button>
    </div>
  );
}
