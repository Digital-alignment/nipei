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
    <div className="w-full bg-[#080c14]/90 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Date Header & Today Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <CalendarIcon size={16} className="text-emerald-400" />
          <span>
            {SPANISH_DAYS_SHORT[currentDate.getDay()]},{" "}
            {currentDate.getDate()} {SPANISH_MONTHS_SHORT[currentDate.getMonth()]}{" "}
            {currentDate.getFullYear()}
          </span>
        </div>

        {isToday ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
            HOY (PRESENTE)
          </span>
        ) : (
          <button
            onClick={handleResetToday}
            className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold hover:bg-amber-900 transition flex items-center gap-1"
          >
            <RotateCcw size={10} />
            <span>Volver a Hoy</span>
          </button>
        )}
      </div>

      {/* Weekstrip Carousel */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 px-1">
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-lg bg-black/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition"
          title="Día anterior"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1">
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
                className={`flex flex-col items-center justify-center min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-500 text-black border-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105"
                    : isDayToday
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:border-emerald-400"
                    : "bg-black/30 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider">{dayName}</span>
                <span className="text-sm font-bold leading-none mt-0.5">{dayNum}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNextDay}
          className="p-1.5 rounded-lg bg-black/40 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition"
          title="Día siguiente"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
