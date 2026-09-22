"use client";

import React from "react";
import { MemberProfile, SquadMeta } from "@/lib/nipeiStore";
import { UserCheck, Shield, Building2, Network, ExternalLink, ChevronDown } from "lucide-react";

interface PortalUserSelectorProps {
  members: MemberProfile[];
  squads: SquadMeta[];
  selectedMemberId: string;
  onSelectMember: (id: string) => void;
}

export default function PortalUserSelector({
  members,
  squads,
  selectedMemberId,
  onSelectMember,
}: PortalUserSelectorProps) {
  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0];

  if (!currentMember) return null;

  const squadMap = new Map(squads.map((s) => [s.id, s]));

  return (
    <div className="bg-[#0b170c] border border-[#1e381e] rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={currentMember.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={currentMember.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0b170c] ${
                currentMember.status === "APPROVED" ? "bg-emerald-500" : "bg-amber-500"
              }`}
              title={currentMember.status}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight">{currentMember.name}</h2>
              {currentMember.nativeName && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono">
                  {currentMember.nativeName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 flex-wrap">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <Shield size={13} />
                {currentMember.globalRole}
              </span>

              {currentMember.specialityOrLineage && (
                <span className="text-slate-400">
                  • {currentMember.specialityOrLineage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Member Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <label className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">
              Perfil Activo del Portal:
            </label>
            <div className="relative">
              <select
                value={selectedMemberId}
                onChange={(e) => onSelectMember(e.target.value)}
                className="w-full bg-[#122414] border border-[#234725] text-white text-xs rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-emerald-500 transition cursor-pointer font-medium"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.nativeName ? `(${m.nativeName})` : ""} — {m.globalRole}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
            </div>
          </div>

          {/* Obsidian Vault dossier link */}
          <a
            href={`file:///C:/Users/ondig/Code/Nipei/nipei-vault/Miembros/${currentMember.id}.md`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 mt-4 rounded-lg bg-[#142916] hover:bg-[#1c391f] text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            title="Abrir nota de conocimiento en el Vault"
          >
            <ExternalLink size={13} />
            <span>Vault Dossier</span>
          </a>
        </div>
      </div>

      {/* Squad & Company Badges */}
      <div className="mt-4 pt-4 border-t border-[#183019] flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">Vínculos:</span>

        {currentMember.squadAssignments.map((sq) => {
          const sqMeta = squadMap.get(sq.squadId);
          return (
            <span
              key={sq.squadId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-700/40 text-emerald-300 text-xs font-medium"
            >
              <Network size={12} className="text-emerald-400" />
              <span>{sqMeta ? sqMeta.name : sq.squadId}</span>
              <span className="text-[10px] text-emerald-400/70">({sq.roleTitle})</span>
            </span>
          );
        })}

        {currentMember.companyAssignments.map((ca) => (
          <span
            key={ca.companyId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/70 border border-cyan-700/40 text-cyan-300 text-xs font-medium"
          >
            <Building2 size={12} className="text-cyan-400" />
            <span>{ca.companyName}</span>
            <span className="text-[10px] text-cyan-400/70">({ca.positionTitle})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
