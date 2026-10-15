"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { Building2, ChevronDown, Check, Plus, Globe } from "lucide-react";
import Link from "next/link";

export default function CompanySelector() {
  const { companies, activeCompanyId, activeCompany, setActiveCompanyId } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCompanies = companies.filter((c) => c.status === "active");

  return (
    <div className="relative font-mono text-xs" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition text-xs font-mono font-medium shadow-sm ${
          activeCompany
            ? "bg-[#0c1c0c] text-white border-[#22c55e]/60"
            : "bg-[#0a120c] text-zinc-300 border-white/10 hover:border-emerald-500/40 hover:bg-[#0f1a11]"
        }`}
        style={{
          borderColor: activeCompany ? activeCompany.accentColor : undefined,
        }}
      >
        <Building2
          size={13}
          style={{ color: activeCompany ? activeCompany.accentColor : "#22c55e" }}
        />
        <span className="truncate max-w-[130px] sm:max-w-[160px]">
          {activeCompany ? (
            <strong style={{ color: activeCompany.accentColor }}>{activeCompany.name}</strong>
          ) : (
            <span>Empresas: <span className="text-emerald-400 font-bold">Todas</span></span>
          )}
        </span>
        <ChevronDown size={12} className="text-zinc-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border border-[#1e381e] bg-[#0c140c] shadow-2xl z-50 p-2 space-y-2">
          {/* Global Option */}
          <button
            onClick={() => {
              setActiveCompanyId("all");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition ${
              activeCompanyId === "all"
                ? "bg-[#142614] text-[#22c55e] border border-[#22c55e]/40"
                : "text-slate-300 hover:bg-[#121f12]"
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#22c55e]" />
              <div>
                <div className="font-extrabold">Todas las Empresas (Global)</div>
                <div className="text-[10px] text-slate-400 font-normal">Vista consolidada del ecosistema</div>
              </div>
            </div>
            {activeCompanyId === "all" && <Check size={14} className="text-[#22c55e]" />}
          </button>

          {/* Clean List of Active Companies */}
          {activeCompanies.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#182818]">
              <div className="text-[9px] uppercase font-bold text-emerald-400/70 px-2.5 py-1 tracking-wider">
                🏢 Empresas ({activeCompanies.length})
              </div>
              {activeCompanies.map((c) => {
                const isSelected = activeCompanyId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCompanyId(c.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                      isSelected
                        ? "bg-[#142614] text-white border border-[#22c55e]/40 font-bold"
                        : "text-slate-300 hover:bg-[#121f12]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.accentColor }}
                      />
                      <span className="truncate">{c.name}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-[#22c55e]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Add New Company Button */}
          <div className="pt-2 border-t border-[#182818]">
            <Link
              href="/empresas/nueva"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 p-2 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs font-bold transition"
            >
              <Plus size={14} />
              <span>Alta de Nueva Empresa</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
