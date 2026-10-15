"use client";

import React from "react";

export interface NipeiProgressBarProps {
  percent: number;
  label?: string;
  scope?: "personal" | "empresa" | "default";
  showPercentLabel?: boolean;
  className?: string;
}

export default function NipeiProgressBar({
  percent,
  label,
  scope = "default",
  showPercentLabel = true,
  className = "",
}: NipeiProgressBarProps) {
  const getGradientFill = () => {
    switch (scope) {
      case "personal":
        return "bg-gradient-to-r from-[#706c61] to-[#8D897C] shadow-[0_0_10px_rgba(141,137,124,0.4)]";
      case "empresa":
        return "bg-gradient-to-r from-[#B49B43] to-[#c2ac5b] shadow-[0_0_10px_rgba(194,172,91,0.4)]";
      default:
        return "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
    }
  };

  const getPercentTextColor = () => {
    switch (scope) {
      case "personal":
        return "text-[#8D897C]";
      case "empresa":
        return "text-[#c2ac5b]";
      default:
        return "text-emerald-300";
    }
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || showPercentLabel) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-google-sans text-slate-400">{label}</span>}
          {showPercentLabel && (
            <span className={`font-alata font-bold ${getPercentTextColor()}`}>
              {percent}% CONCLUÍDO
            </span>
          )}
        </div>
      )}

      <div className="w-full h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getGradientFill()}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
