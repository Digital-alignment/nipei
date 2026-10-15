"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";

interface DateNavigatorProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
}

// Format Date object to "YYYY-MM-DD"
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Get array of 7 days around the target date
function getWeekDays(centerDate: Date) {
  const days = [];
  // 3 days before, center date, 3 days after
  for (let i = -3; i <= 3; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    days.push(d);
  }
  return days;
}

const SPANISH_DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const SPANISH_MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export default function DateNavigator({ selectedDate, onSelectDate }: DateNavigatorProps) {
  const todayStr = formatDateKey(new Date());
  const currentDate = new Date(selectedDate + "T12:00:00");
  const weekDays = getWeekDays(currentDate);

  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(formatDateKey(d));
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(formatDateKey(d));
  };

  const handleResetToday = () => {
    onSelectDate(todayStr);
  };

  return (
    <div className="w-full h-full bg-[#0a0f18]/80 border border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Date Header & Today Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-2.5 text-white font-semibold text-sm font-google-sans">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarIcon size={16} />
          </div>
          <span className="capitalize tracking-tight">
            {SPANISH_DAYS_SHORT[currentDate.getDay()]},{" "}
            {currentDate.getDate()} {SPANISH_MONTHS_SHORT[currentDate.getMonth()]}{" "}
            {currentDate.getFullYear()}
          </span>
        </div>

        {isToday ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-space-mono text-[10px] font-medium flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>HOY (PRESENTE)</span>
          </span>
        ) : (
          <button
            onClick={handleResetToday}
            className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-space-mono text-[10px] font-medium hover:bg-amber-500/25 transition flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw size={11} />
            <span>Volver a Hoy</span>
          </button>
        )}
      </div>

      {/* Weekstrip Carousel */}
      <div className="flex items-center justify-between gap-1.5 w-full pt-1 relative z-10">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition shrink-0"
          title="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 px-0.5 max-w-full justify-around flex-1">
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const isSelected = key === selectedDate;
            const isDayToday = key === todayStr;
            const dayNum = d.getDate();
            const dayName = SPANISH_DAYS_SHORT[d.getDay()];

            return (
              <button
                key={key}
                onClick={() => onSelectDate(key)}
                className={`flex flex-col items-center justify-center min-w-[38px] sm:min-w-[44px] px-2 py-1.5 sm:py-2 rounded-2xl border text-xs font-alata transition-all duration-200 ${
                  isSelected
                    ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-black border-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105"
                    : isDayToday
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-400"
                    : "bg-white/5 text-slate-400 border-white/5 hover:border-white/15 hover:text-slate-200"
                }`}
              >
                <span className="text-[9px] font-space-mono uppercase tracking-wider">{dayName}</span>
                <span className="text-xs sm:text-sm font-bold leading-none mt-0.5">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition shrink-0"
          title="Día siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
