"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface BentoCardProps {
  title?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  level?: 1 | 2; // Level 1: Bento (#0a0f16), Level 2: Hero (#070705)
  className?: string;
  glowColor?: string;
  borderColor?: string;
}

export default function BentoCard({
  title,
  subtitle,
  icon,
  headerActions,
  children,
  collapsible = false,
  defaultCollapsed = false,
  level = 1,
  className = "",
  glowColor,
  borderColor,
}: BentoCardProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);

  const bgColor = level === 2 ? "#070705" : "#0a0f16";

  return (
    <div
      className={`w-full rounded-3xl p-4 sm:p-5 backdrop-blur-xl border transition-all duration-300 overflow-hidden ${className}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor || "rgba(255, 255, 255, 0.12)",
        boxShadow: glowColor ? `0 10px 30px -10px ${glowColor}` : "0 10px 25px rgba(0,0,0,0.4)",
      }}
    >
      {/* Optional Header Bar */}
      {(title || icon || headerActions || collapsible) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-xs sm:text-sm font-google-sans font-bold text-white tracking-tight flex items-center gap-2">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] font-google-sans text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/15 transition border border-white/10"
                title={isCollapsed ? "Expandir" : "Colapsar"}
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body Content */}
      {!isCollapsed && <div className="space-y-3 animate-fade-in">{children}</div>}
    </div>
  );
}
