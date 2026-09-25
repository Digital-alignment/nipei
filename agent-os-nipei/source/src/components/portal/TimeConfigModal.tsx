"use client";

import React, { useState } from "react";
import { X, Clock, Sun, Moon, Briefcase, User, ShieldAlert, Check, RefreshCw } from "lucide-react";

export interface TimeConfigSettings {
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  maxWorkHours: number; // 8
  maxPersonalHours: number; // 6
  bufferHours: number; // 2
}

interface TimeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TimeConfigSettings;
  onSaveSettings: (newSettings: TimeConfigSettings) => void;
}

export default function TimeConfigModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: TimeConfigModalProps) {
  if (!isOpen) return null;

  const [wakeTime, setWakeTime] = useState<string>(settings.wakeTime);
  const [sleepTime, setSleepTime] = useState<string>(settings.sleepTime);
  const [maxWorkHours, setMaxWorkHours] = useState<number>(settings.maxWorkHours);
  const [maxPersonalHours, setMaxPersonalHours] = useState<number>(settings.maxPersonalHours);
  const [bufferHours, setBufferHours] = useState<number>(settings.bufferHours);

  // Calculate total waking hours
  const calculateWakingHours = (wake: string, sleep: string) => {
    const [wH, wM] = wake.split(":").map(Number);
    const [sH, sM] = sleep.split(":").map(Number);
    let wakeMin = wH * 60 + wM;
    let sleepMin = sH * 60 + sM;
    if (sleepMin <= wakeMin) sleepMin += 24 * 60; // Overnight
    return Math.round(((sleepMin - wakeMin) / 60) * 10) / 10;
  };

  const totalWakingHours = calculateWakingHours(wakeTime, sleepTime);
  const totalAllocatedHours = maxWorkHours + maxPersonalHours + bufferHours;
  const isOverAllocated = totalAllocatedHours > totalWakingHours;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      wakeTime,
      sleepTime,
      maxWorkHours,
      maxPersonalHours,
      bufferHours,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#090e17] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden space-y-6">
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Ajustes Rígidos de Tiempo & Capacidad Diario
              </h3>
              <p className="text-xs text-slate-400">
                Define el presupuesto de horas disponibles para evitar sobrecargas
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Wake & Sleep Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Sun size={14} className="text-amber-400" />
                <span>Hora de Despertar</span>
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-black/60 border border-slate-700 text-white font-mono text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Moon size={14} className="text-indigo-400" />
                <span>Hora de Dormir</span>
              </label>
              <input
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
                className="w-full bg-black/60 border border-slate-700 text-white font-mono text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Total Waking Hours Summary */}
          <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Tiempo Despierto Disponible:</span>
            <span className="text-white font-bold text-sm">{totalWakingHours} Horas ({totalWakingHours * 60} min)</span>
          </div>

          {/* Max Allocation Sliders */}
          <div className="space-y-4 pt-1">
            {/* Work Hours Budget */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-purple-300 flex items-center gap-1">
                  <Briefcase size={12} /> Max Horas Empresa / Trabajo:
                </span>
                <span className="font-bold text-white">{maxWorkHours} hrs</span>
              </div>
              <input
                type="range"
                min={2}
                max={14}
                step={0.5}
                value={maxWorkHours}
                onChange={(e) => setMaxWorkHours(parseFloat(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Personal Hours Budget */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-emerald-300 flex items-center gap-1">
                  <User size={12} /> Max Horas Desarrollo Personal:
                </span>
                <span className="font-bold text-white">{maxPersonalHours} hrs</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={maxPersonalHours}
                onChange={(e) => setMaxPersonalHours(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Buffer / Rest Hours */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-amber-300 flex items-center gap-1">
                  <Clock size={12} /> Margen de Descanso & Imprevistos:
                </span>
                <span className="font-bold text-white">{bufferHours} hrs</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={6}
                step={0.5}
                value={bufferHours}
                onChange={(e) => setBufferHours(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Over-allocation warning */}
          {isOverAllocated && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2 animate-pulse">
              <ShieldAlert size={16} className="shrink-0" />
              <span>
                ¡ALERTA! El presupuesto ({totalAllocatedHours}h) supera tus horas despierto disponibles ({totalWakingHours}h).
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-mono transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Guardar Presupuesto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
