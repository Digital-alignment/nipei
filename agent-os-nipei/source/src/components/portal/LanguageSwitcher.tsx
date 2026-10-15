"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage, Language } from "@/context/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";

export interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
  short: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "es", label: "Español", flag: "🇪🇸", short: "ES" },
  { code: "en", label: "English", flag: "🇺🇸", short: "EN" },
  { code: "pt", label: "Português", flag: "🇧🇷", short: "PT" },
];

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-slate-200 font-mono text-[10px] sm:text-xs border border-white/10 hover:border-white/20 bg-black/60 backdrop-blur-md transition-all hover:bg-slate-900/80 active:scale-95 cursor-pointer select-none"
        title="Cambiar Idioma / Switch Language / Mudar Idioma"
      >
        <Globe size={13} className="text-emerald-400 shrink-0" />
        <span className="text-xs">{currentLang.flag}</span>
        <span className="font-extrabold hidden xs:inline tracking-wider">{currentLang.short}</span>
        <ChevronDown
          size={11}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 py-1 bg-[#0a0f18]/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1 border-b border-white/10 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Idioma / Language
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-google-sans transition-colors cursor-pointer ${
                language === lang.code
                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
              {language === lang.code && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
