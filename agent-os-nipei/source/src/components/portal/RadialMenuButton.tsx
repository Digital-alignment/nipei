"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  LayoutGrid,
  Settings,
  Database,
  User,
  Box,
  Layers,
  X,
  Sparkles,
  Command,
} from "lucide-react";

export interface RadialMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  accentColor?: string;
}

const DEFAULT_RADIAL_ITEMS: RadialMenuItem[] = [
  { id: "3d_vault", label: "Vault 3D", sublabel: "Conhecimento", icon: <Box size={20} />, accentColor: "#10b981" },
  { id: "config", label: "Ajustes", sublabel: "Sistema", icon: <Settings size={20} />, accentColor: "#06b6d4" },
  { id: "database", label: "Base Datos", sublabel: "Registros", icon: <Database size={20} />, accentColor: "#8b5cf6" },
  { id: "perfil", label: "Perfil", sublabel: "Usuario", icon: <User size={20} />, accentColor: "#f59e0b" },
  { id: "modulos", label: "Módulos", sublabel: "Nipëi OS", icon: <Layers size={20} />, accentColor: "#ec4899" },
  { id: "dashboard", label: "Dashboard", sublabel: "Resumen", icon: <LayoutGrid size={20} />, accentColor: "#3b82f6" },
];

interface RadialMenuButtonProps {
  items?: RadialMenuItem[];
  onSelect?: (id: string) => void;
  menuTitle?: string;
  radius?: number; // Radial distance in pixels from center
}

export default function RadialMenuButton({
  items = DEFAULT_RADIAL_ITEMS,
  onSelect,
  menuTitle = "NIPËI MENU",
  radius = 140,
}: RadialMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Exactly 6 items spaced 60 degrees apart starting from top (-90 degrees)
  const totalItems = Math.min(items.length, 6);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. BOTÓN FLOTANTE ACTIVADOR (TRIGGER BUTTON)
         ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={toggleMenu}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 border-2 ${
            isOpen
              ? "bg-[#102915] border-emerald-400 rotate-90"
              : "bg-gradient-to-tr from-[#091a0c] via-[#0d2e14] to-[#12421c] border-emerald-500/60 hover:border-emerald-400"
          }`}
          title={isOpen ? "Fechar Menu Radial" : "Abrir Menu Radial HUD"}
        >
          {/* Ring pulse effect */}
          <span className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ping opacity-30 pointer-events-none" />

          {isOpen ? (
            <X size={24} className="text-emerald-300" />
          ) : (
            <Compass size={26} className="text-emerald-400 group-hover:rotate-45 transition-transform duration-500" />
          )}
        </motion.button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MENU OVERLAY RADIAL CIRCULAR (MODAL FULLSCREEN BACKDROP)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
              className="absolute inset-0 bg-[#030904]/80 backdrop-blur-md"
            />

            {/* RADIAL WHEEL CONTAINER */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-[360px] h-[360px] md:w-[420px] md:h-[420px] flex items-center justify-center select-none z-50 pointer-events-auto"
            >
              {/* Outer HUD Decorative Tech Ring */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/20 border-dashed animate-[spin_60s_linear_infinite] pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-emerald-500/10 pointer-events-none" />

              {/* Glowing Background Radial Core */}
              <div className="absolute w-[300px] h-[300px] md:w-[360px] md:h-[360px] rounded-full bg-[#08170c]/90 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex items-center justify-center backdrop-blur-xl" />

              {/* ─────────────────────────────────────────────────────────
                  2.1 CENTER INNER CORE (DISCO CENTRAL)
                 ───────────────────────────────────────────────────────── */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative z-20 w-32 h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-b from-[#0e2712] to-[#061208] border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center text-center p-2 cursor-pointer"
                onClick={toggleMenu}
              >
                <Sparkles size={20} className="text-emerald-400 mb-1 animate-pulse" />
                <span className="text-[11px] font-mono font-extrabold tracking-widest text-emerald-300 uppercase">
                  {hoveredIndex !== null ? items[hoveredIndex]?.label : menuTitle}
                </span>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                  {hoveredIndex !== null ? items[hoveredIndex]?.sublabel || "Seleccionar" : "6 Ícones UI"}
                </span>
              </motion.div>

              {/* ─────────────────────────────────────────────────────────
                  2.2 6 CIRCULAR SECTORS / ITEMS SPACED RADIALLY (60 deg)
                 ───────────────────────────────────────────────────────── */}
              {items.slice(0, totalItems).map((item, idx) => {
                // Calculate angle for 6 items: -90° (Top), -30°, 30°, 90°, 150°, 210°
                const angleDeg = -90 + idx * 60;
                const angleRad = (angleDeg * Math.PI) / 180;

                // Responsive radius
                const currentRadius = typeof window !== "undefined" && window.innerWidth < 768 ? 120 : radius;

                const x = Math.round(currentRadius * Math.cos(angleRad));
                const y = Math.round(currentRadius * Math.sin(angleRad));

                const isHovered = hoveredIndex === idx;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{ x, y, opacity: 1 }}
                    exit={{ x: 0, y: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 24,
                      delay: idx * 0.04,
                    }}
                    style={{
                      position: "absolute",
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => {
                      if (onSelect) onSelect(item.id);
                      setIsOpen(false);
                    }}
                    className="z-30 cursor-pointer group"
                  >
                    <div
                      className={`w-16 h-16 md:w-18 md:h-18 rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 border backdrop-blur-md ${
                        isHovered
                          ? "bg-[#14391a] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110"
                          : "bg-[#0b1d0e]/90 border-emerald-500/30 hover:border-emerald-400/80 shadow-lg"
                      }`}
                    >
                      <div
                        className="transition-transform duration-300 group-hover:scale-110"
                        style={{ color: item.accentColor || "#10b981" }}
                      >
                        {item.icon}
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-200 mt-1 truncate max-w-[55px] text-center">
                        {item.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
