"use client";

import React, { useState } from "react";
import {
  Palette,
  Type,
  ShieldCheck,
  Check,
  Copy,
  Layers,
  Sparkles,
  Zap,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Download,
  Terminal,
} from "lucide-react";
import { COLOR_TOKENS, TYPOGRAPHY_TOKENS, TONE_OF_VOICE_RULES, NIPEI_BRAND_RULES } from "@/lib/brandTokens";

export default function NipeiBrandStudio() {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "rules" | "components" | "export">("colors");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050805] text-[#e0e8e0] p-4 md:p-8 font-sans space-y-8">
      {/* Top Header Banner — SOLID NO GRADIENTS */}
      <div className="bg-[#0c140c] border border-[#1f381f] p-6 md:p-8 rounded-3xl shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-black tracking-widest uppercase bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
              NIPËI OS BRAND SYSTEM & DESIGN MANUAL
            </span>
            <span className="px-3 py-1 text-xs font-black uppercase bg-[#28180c] text-amber-400 border border-amber-500/40 rounded-full">
              🚫 CERO GRADIENTES (REGLA ESTRICTA)
            </span>
          </div>

          <span className="text-xs font-mono text-emerald-400/80 bg-[#050805] px-3 py-1 rounded-full border border-[#182818]">
            VERSIÓN 1.0 (OFICIAL)
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          Manual de Marca <span className="text-[#22c55e]">& Sistema de Diseño</span>
        </h1>
        <p className="text-xs md:text-sm text-[#8aa88a] mt-2 max-w-3xl leading-relaxed font-medium">
          Especificación oficial de tokens de diseño, paleta de colores sólidos, tipografías, componentes y reglas de comunicación inquebrantables de Nipëi OS.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#182818]">
        {[
          { key: "colors", label: "Paleta de Colores", icon: <Palette size={15} /> },
          { key: "typography", label: "Tipografía & Jerarquía", icon: <Type size={15} /> },
          { key: "rules", label: "Reglas & Tono de Voz", icon: <ShieldCheck size={15} /> },
          { key: "components", label: "Kit de Componentes UI", icon: <Layers size={15} /> },
          { key: "export", label: "Exportar & Tokens JSON", icon: <FileCode size={15} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                isActive
                  ? "bg-[#142614] text-[#22c55e] border-[#22c55e]/50 shadow-md"
                  : "bg-[#0c140c] text-slate-400 border-[#182818] hover:text-white hover:bg-[#101b10]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COLORS PALETTE */}
      {activeTab === "colors" && (
        <div className="space-y-6">
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="text-[#22c55e]" size={20} /> Tokens de Colores Planos (Flat Swatches)
            </h2>
            <p className="text-xs text-[#8aa88a] mt-1">
              Haz clic en cualquier muestra de color para copiar instantáneamente el código HEX al portapapeles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {COLOR_TOKENS.map((token) => (
              <div
                key={token.name}
                onClick={() => handleCopy(token.hex)}
                className="bg-[#0c140c] border border-[#182818] hover:border-[#22c55e]/50 rounded-2xl p-4 cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl border border-slate-700/50 shadow-inner flex items-center justify-center font-bold text-xs" style={{ backgroundColor: token.hex }}>
                    {copiedToken === token.hex ? <Check size={18} className="text-white drop-shadow" /> : null}
                  </div>
                  <button className="px-2.5 py-1 text-[10px] font-mono bg-[#050805] text-slate-300 border border-[#182818] rounded-lg group-hover:border-[#22c55e]/50 transition">
                    {copiedToken === token.hex ? "¡Copiado!" : token.hex}
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#22c55e] transition">{token.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{token.usage}</p>
                </div>

                <div className="pt-2 border-t border-[#182818] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>RGB: ({token.rgb})</span>
                  <span className="uppercase text-[#688a68]">{token.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TYPOGRAPHY */}
      {activeTab === "typography" && (
        <div className="space-y-6">
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Type className="text-cyan-400" size={20} /> Jerarquía Tipográfica de Nipëi OS
            </h2>
            <p className="text-xs text-[#8aa88a] mt-1">
              Uso estricto de fuentes certificadas para títulos (Outfit), cuerpo de texto (Manrope) y datos (JetBrains Mono).
            </p>
          </div>

          <div className="space-y-4">
            {TYPOGRAPHY_TOKENS.map((token, idx) => (
              <div key={idx} className="bg-[#0c140c] border border-[#182818] p-6 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182818] pb-3">
                  <span className="text-xs font-bold text-[#22c55e] font-mono">{token.role}</span>
                  <div className="flex gap-2 text-[11px] font-mono text-slate-400">
                    <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontFamily}</span>
                    <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontSize}</span>
                    <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontWeight}</span>
                  </div>
                </div>

                <div className="py-2">
                  <p
                    className="text-white leading-relaxed"
                    style={{
                      fontFamily: token.fontFamily.split(",")[0],
                      fontSize: idx === 0 ? "24px" : idx === 1 ? "18px" : "14px",
                    }}
                  >
                    Nipëi OS — Sistema Operacional de Inteligência Artificial e Governança Ancestral
                  </p>
                </div>

                <p className="text-xs text-slate-400 pt-1">{token.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RULES & TONE */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-purple-400" size={20} /> Reglas Inquebrantables de Diseño & Tono
            </h2>
            <p className="text-xs text-[#8aa88a] mt-1">
              Directrices obligatorias para diseñadores y agentes de código en Nipëi OS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={18} /> Directrices de Interfaz (Brand Guardrails)
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2.5 p-3 bg-[#050805] rounded-xl border border-[#182818]">
                  <XCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <strong className="text-white block">REGLA #1: PROHIBIDOS LOS GRADIENTES</strong>
                    Queda estrictamente prohibido el uso de gradientes. Todos los elementos deben usar colores planos sólidos (`#050805`, `#0c140c`, `#22c55e`).
                  </div>
                </li>

                <li className="flex items-start gap-2.5 p-3 bg-[#050805] rounded-xl border border-[#182818]">
                  <CheckCircle2 className="text-[#22c55e] shrink-0 mt-0.5" size={16} />
                  <div>
                    <strong className="text-white block">REGLA #2: ÍCONOS LUCIDE EXCLUSIVOS</strong>
                    No usar emojis informales en encabezados corporativos. Usar componentes oficiales de `lucide-react`.
                  </div>
                </li>

                <li className="flex items-start gap-2.5 p-3 bg-[#050805] rounded-xl border border-[#182818]">
                  <CheckCircle2 className="text-[#22c55e] shrink-0 mt-0.5" size={16} />
                  <div>
                    <strong className="text-white block">REGLA #3: CONTRASTE & BORDES NÍTIDOS</strong>
                    Cada panel debe estar delimitado por un borde sólido `1px solid #182818` o `border-emerald-500/30`.
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="text-[#22c55e]" size={18} /> Reglas de Tono & Lenguaje
              </h3>
              <div className="space-y-2 text-xs">
                {TONE_OF_VOICE_RULES.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-[#050805] border border-[#182818] rounded-xl text-slate-300 font-medium">
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UI COMPONENTS KIT SHOWCASE */}
      {activeTab === "components" && (
        <div className="space-y-6">
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-[#22c55e]" size={20} /> Muestrario del Kit de Componentes UI Sólidos
            </h2>
            <p className="text-xs text-[#8aa88a] mt-1">
              Ejemplos en vivo de botones, badges y tarjetas planas respetando la regla cero-gradientes.
            </p>
          </div>

          <div className="bg-[#0c140c] border border-[#182818] p-6 rounded-2xl space-y-6">
            <div>
              <h4 className="text-xs font-extrabold uppercase text-slate-400 mb-3">1. Botones Principales & Secundarios (Planos)</h4>
              <div className="flex flex-wrap gap-3">
                <button className="bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition">
                  Botón Primario Esmeralda
                </button>
                <button className="bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#1f381f] font-bold px-5 py-2.5 rounded-xl text-xs transition">
                  Botón Contorno Verde
                </button>
                <button className="bg-[#a855f7] hover:bg-[#9333ea] text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition">
                  Botón Venu / Retiros
                </button>
                <button className="bg-[#050805] text-slate-300 border border-[#182818] hover:bg-[#101b10] font-bold px-5 py-2.5 rounded-xl text-xs transition">
                  Botón Secundario
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-extrabold uppercase text-slate-400 mb-3">2. Badges de Estado & Squads</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 text-xs font-bold bg-[#142614] text-[#22c55e] border border-[#22c55e]/30 rounded-full">
                  🟢 Estado: Online
                </span>
                <span className="px-3 py-1 text-xs font-bold bg-[#1e1428] text-purple-300 border border-purple-500/30 rounded-full">
                  🧘 Squad III: Retiros
                </span>
                <span className="px-3 py-1 text-xs font-bold bg-[#0d1f24] text-cyan-300 border border-cyan-500/30 rounded-full">
                  💼 Squad V: DRE Contable
                </span>
                <span className="px-3 py-1 text-xs font-mono text-slate-400 bg-[#050805] border border-[#182818] rounded-full">
                  SHA256: d17a0483c2
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPORT JSON TOKENS */}
      {activeTab === "export" && (
        <div className="space-y-6">
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="text-[#22c55e]" size={20} /> Exportación de Tokens JSON de Nipëi OS
            </h2>
            <p className="text-xs text-[#8aa88a] mt-1">
              Especificación máquina ejecutable del sistema de diseño para agentes de IA y pipelines CI/CD.
            </p>
          </div>

          <div className="bg-[#050805] border border-[#182818] p-5 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto space-y-4">
            <div className="flex justify-between items-center text-slate-400 border-b border-[#182818] pb-2">
              <span>brand_tokens.json</span>
              <button
                onClick={() => handleCopy(JSON.stringify({ rules: NIPEI_BRAND_RULES, colors: COLOR_TOKENS, typography: TYPOGRAPHY_TOKENS }, null, 2))}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#142614] hover:bg-[#1e3b21] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs transition font-bold"
              >
                <Copy size={12} /> Copiar JSON Completo
              </button>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
              {JSON.stringify({ rules: NIPEI_BRAND_RULES, colors: COLOR_TOKENS, typography: TYPOGRAPHY_TOKENS }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
