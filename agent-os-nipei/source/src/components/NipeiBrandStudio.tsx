"use client";

import React, { useState } from "react";
import {
  Palette,
  Type,
  ShieldCheck,
  Check,
  Copy,
  Layers,
  FileCode,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  COLOR_TOKENS,
  TYPOGRAPHY_TOKENS,
  TONE_OF_VOICE_RULES,
  NIPEI_BRAND_RULES,
  ColorToken,
  TypographyToken,
} from "@/lib/brandTokens";

export default function NipeiBrandStudio() {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "rules" | "components" | "export">("colors");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Edit Mode & Local State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [colors, setColors] = useState<ColorToken[]>(COLOR_TOKENS);
  const [typography, setTypography] = useState<TypographyToken[]>(TYPOGRAPHY_TOKENS);
  const [toneOfVoice, setToneOfVoice] = useState<string[]>(TONE_OF_VOICE_RULES);

  // Status & Notification
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Color Mutations
  const handleColorChange = (index: number, field: keyof ColorToken, value: string) => {
    const updated = [...colors];
    updated[index] = { ...updated[index], [field]: value };
    setColors(updated);
  };

  const handleAddColor = () => {
    setColors([
      ...colors,
      {
        name: "Nuevo Color Nipëi",
        hex: "#22c55e",
        rgb: "34, 197, 94",
        usage: "Descripción de uso del nuevo color",
        category: "brand",
      },
    ]);
  };

  const handleDeleteColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  // Typography Mutations
  const handleTypoChange = (index: number, field: keyof TypographyToken, value: string) => {
    const updated = [...typography];
    updated[index] = { ...updated[index], [field]: value };
    setTypography(updated);
  };

  const handleAddTypo = () => {
    setTypography([
      ...typography,
      {
        role: "Nuevo Rol Tipográfico",
        fontFamily: "Outfit, sans-serif",
        fontSize: "14px",
        fontWeight: "600",
        letterSpacing: "0em",
        usage: "Uso de la nueva tipografía",
      },
    ]);
  };

  const handleDeleteTypo = (index: number) => {
    setTypography(typography.filter((_, i) => i !== index));
  };

  // Tone Mutations
  const handleToneChange = (index: number, value: string) => {
    const updated = [...toneOfVoice];
    updated[index] = value;
    setToneOfVoice(updated);
  };

  const handleAddTone = () => {
    setToneOfVoice([...toneOfVoice, `${toneOfVoice.length + 1}. Nueva regla de tono de voz.`]);
  };

  const handleDeleteTone = (index: number) => {
    setToneOfVoice(toneOfVoice.filter((_, i) => i !== index));
  };

  // Save to Server, Vault, and Agent Skill
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/brand/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors, typography, toneOfVoice }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar los cambios.");
      }

      setSaveMessage({
        type: "success",
        text: "¡Manual de Marca guardado con éxito! Se han actualizado el Vault (Obsidian), brandTokens.ts y la Skill de Agentes (.agents/skills/nipei-brand/SKILL.md).",
      });
      setIsEditing(false);
    } catch (err: any) {
      setSaveMessage({
        type: "error",
        text: err?.message || "Ocurrió un error inesperado al intentar guardar.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050805] text-[#e0e8e0] p-4 md:p-8 font-sans space-y-8">
      {/* Top Header Banner — SOLID NO GRADIENTS */}
      <div className="bg-[#0c140c] border border-[#1f381f] p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 text-xs font-black tracking-widest uppercase bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
              NIPËI OS BRAND SYSTEM & DESIGN MANUAL
            </span>
            <span className="px-3 py-1 text-xs font-black uppercase bg-[#28180c] text-amber-400 border border-amber-500/40 rounded-full">
              🚫 CERO GRADIENTES (REGLA ESTRICTA)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition border ${
                isEditing
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/50 hover:bg-amber-500/20"
                  : "bg-[#142614] text-[#22c55e] border-[#22c55e]/40 hover:bg-[#1f381f]"
              }`}
            >
              {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
              {isEditing ? "Modo Lectura" : "Modo Edición"}
            </button>

            {isEditing && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-slate-950 font-black rounded-xl text-xs transition shadow-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                {isSaving ? "Guardando en Vault..." : "Guardar Cambios"}
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Manual de Marca <span className="text-[#22c55e]">& Sistema de Diseño</span>
          </h1>
          <p className="text-xs md:text-sm text-[#8aa88a] mt-2 max-w-3xl leading-relaxed font-medium">
            Especificación oficial de tokens de diseño, paleta de colores sólidos, tipografías, componentes y reglas de comunicación inquebrantables de Nipëi OS.
          </p>
        </div>

        {saveMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
              saveMessage.type === "success"
                ? "bg-[#142614] text-[#22c55e] border-[#22c55e]/40"
                : "bg-[#280c0c] text-red-400 border-red-500/40"
            }`}
          >
            <div className="flex items-center gap-2">
              {saveMessage.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span>{saveMessage.text}</span>
            </div>
            <button onClick={() => setSaveMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
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
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette className="text-[#22c55e]" size={20} /> Tokens de Colores Planos (Flat Swatches)
              </h2>
              <p className="text-xs text-[#8aa88a] mt-1">
                {isEditing
                  ? "Edita los nombres, códigos HEX y usos de cada color. Al guardar se actualizará el Vault y la Skill de Agentes."
                  : "Haz clic en cualquier muestra de color para copiar instantáneamente el código HEX al portapapeles."}
              </p>
            </div>
            {isEditing && (
              <button
                onClick={handleAddColor}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-xl text-xs font-bold hover:bg-[#1f381f]"
              >
                <Plus size={14} /> Agregar Color
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {colors.map((token, idx) => (
              <div
                key={idx}
                className="bg-[#0c140c] border border-[#182818] hover:border-[#22c55e]/50 rounded-2xl p-4 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border border-slate-700/50 shadow-inner flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: token.hex }}
                    >
                      {copiedToken === token.hex ? <Check size={16} className="text-white drop-shadow" /> : null}
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        value={token.hex}
                        onChange={(e) => handleColorChange(idx, "hex", e.target.value)}
                        className="bg-[#050805] text-white border border-[#182818] px-2 py-1 rounded font-mono text-xs w-24 focus:outline-none focus:border-[#22c55e]"
                      />
                    ) : (
                      <button
                        onClick={() => handleCopy(token.hex)}
                        className="px-2.5 py-1 text-[10px] font-mono bg-[#050805] text-slate-300 border border-[#182818] rounded-lg group-hover:border-[#22c55e]/50 transition"
                      >
                        {copiedToken === token.hex ? "¡Copiado!" : token.hex}
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <button
                      onClick={() => handleDeleteColor(idx)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={token.name}
                      onChange={(e) => handleColorChange(idx, "name", e.target.value)}
                      className="w-full bg-[#050805] text-white border border-[#182818] px-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-[#22c55e]"
                      placeholder="Nombre del Token"
                    />
                    <textarea
                      value={token.usage}
                      onChange={(e) => handleColorChange(idx, "usage", e.target.value)}
                      rows={2}
                      className="w-full bg-[#050805] text-slate-300 border border-[#182818] p-2 rounded-xl text-xs focus:outline-none focus:border-[#22c55e]"
                      placeholder="Uso en Interfaz"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#22c55e] transition">{token.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{token.usage}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-[#182818] flex items-center justify-between text-[10px] font-mono text-slate-500">
                  {isEditing ? (
                    <input
                      type="text"
                      value={token.rgb}
                      onChange={(e) => handleColorChange(idx, "rgb", e.target.value)}
                      className="bg-[#050805] text-slate-400 border border-[#182818] px-2 py-0.5 rounded text-[10px] w-28 focus:outline-none"
                    />
                  ) : (
                    <span>RGB: ({token.rgb})</span>
                  )}
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
          <div className="bg-[#0c140c] border border-[#182818] p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Type className="text-cyan-400" size={20} /> Jerarquía Tipográfica de Nipëi OS
              </h2>
              <p className="text-xs text-[#8aa88a] mt-1">
                Uso estricto de fuentes certificadas para títulos (Outfit), cuerpo de texto (Manrope) y datos (JetBrains Mono).
              </p>
            </div>
            {isEditing && (
              <button
                onClick={handleAddTypo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-xl text-xs font-bold hover:bg-[#1f381f]"
              >
                <Plus size={14} /> Agregar Tipografía
              </button>
            )}
          </div>

          <div className="space-y-4">
            {typography.map((token, idx) => (
              <div key={idx} className="bg-[#0c140c] border border-[#182818] p-6 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#182818] pb-3">
                  {isEditing ? (
                    <input
                      type="text"
                      value={token.role}
                      onChange={(e) => handleTypoChange(idx, "role", e.target.value)}
                      className="bg-[#050805] text-[#22c55e] border border-[#182818] px-2.5 py-1 rounded font-mono text-xs font-bold focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-bold text-[#22c55e] font-mono">{token.role}</span>
                  )}

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={token.fontFamily}
                          onChange={(e) => handleTypoChange(idx, "fontFamily", e.target.value)}
                          className="bg-[#050805] text-slate-300 border border-[#182818] px-2 py-0.5 rounded text-[11px] font-mono w-32 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={token.fontSize}
                          onChange={(e) => handleTypoChange(idx, "fontSize", e.target.value)}
                          className="bg-[#050805] text-slate-300 border border-[#182818] px-2 py-0.5 rounded text-[11px] font-mono w-24 focus:outline-none"
                        />
                        <button
                          onClick={() => handleDeleteTypo(idx)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 text-[11px] font-mono text-slate-400">
                        <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontFamily}</span>
                        <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontSize}</span>
                        <span className="bg-[#050805] px-2 py-0.5 rounded border border-[#182818]">{token.fontWeight}</span>
                      </div>
                    )}
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

                {isEditing ? (
                  <input
                    type="text"
                    value={token.usage}
                    onChange={(e) => handleTypoChange(idx, "usage", e.target.value)}
                    className="w-full bg-[#050805] text-slate-400 border border-[#182818] px-2.5 py-1 rounded text-xs focus:outline-none"
                  />
                ) : (
                  <p className="text-xs text-slate-400 pt-1">{token.usage}</p>
                )}
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
                    Queda strictly prohibido el uso de gradientes. Todos los elementos deben usar colores planos sólidos (`#050805`, `#0c140c`, `#22c55e`).
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
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="text-[#22c55e]" size={18} /> Reglas de Tono & Lenguaje
                </h3>
                {isEditing && (
                  <button
                    onClick={handleAddTone}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#142614] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs font-bold hover:bg-[#1f381f]"
                  >
                    <Plus size={12} /> Agregar Regla
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {toneOfVoice.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-[#050805] border border-[#182818] rounded-xl text-slate-300 font-medium flex items-center justify-between gap-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => handleToneChange(idx, e.target.value)}
                        className="w-full bg-transparent text-slate-200 focus:outline-none"
                      />
                    ) : (
                      <span>{rule}</span>
                    )}

                    {isEditing && (
                      <button
                        onClick={() => handleDeleteTone(idx)}
                        className="text-red-400 hover:text-red-300 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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
                onClick={() => handleCopy(JSON.stringify({ rules: NIPEI_BRAND_RULES, colors, typography, toneOfVoice }, null, 2))}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#142614] hover:bg-[#1e3b21] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs transition font-bold"
              >
                <Copy size={12} /> Copiar JSON Completo
              </button>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
              {JSON.stringify({ rules: NIPEI_BRAND_RULES, colors, typography, toneOfVoice }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
