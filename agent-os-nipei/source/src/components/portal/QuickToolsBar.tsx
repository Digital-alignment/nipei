"use client";

import React from "react";
import { MessageCircle, Calendar, FolderGit2, Kanban, Brain, ExternalLink, PlusCircle } from "lucide-react";

interface QuickToolsBarProps {
  selectedMemberId: string;
}

export default function QuickToolsBar({ selectedMemberId }: QuickToolsBarProps) {
  return (
    <div className="bg-[#0b170c] border border-[#1e381e] rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Integraciones & Accesos Rápidos:</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* WhatsApp Web */}
        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#122614] hover:bg-[#1a381d] text-emerald-400 border border-emerald-500/30 text-xs font-medium transition"
        >
          <MessageCircle size={14} className="text-emerald-400" />
          <span>WhatsApp Web</span>
          <ExternalLink size={11} className="opacity-60" />
        </a>

        {/* Google Calendar */}
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e2024] hover:bg-[#153238] text-cyan-400 border border-cyan-500/30 text-xs font-medium transition"
        >
          <Calendar size={14} className="text-cyan-400" />
          <span>Google Agenda</span>
          <ExternalLink size={11} className="opacity-60" />
        </a>

        {/* Google Drive */}
        <a
          href="https://drive.google.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#241c0e] hover:bg-[#382b15] text-amber-400 border border-amber-500/30 text-xs font-medium transition"
        >
          <FolderGit2 size={14} className="text-amber-400" />
          <span>Google Drive</span>
          <ExternalLink size={11} className="opacity-60" />
        </a>

        {/* Multi-Squad Kanban */}
        <a
          href="/agent-kanban"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181226] hover:bg-[#271d3e] text-purple-400 border border-purple-500/30 text-xs font-medium transition"
        >
          <Kanban size={14} className="text-purple-400" />
          <span>Kanban de Agentes</span>
        </a>

        {/* Vault Note */}
        <a
          href={`file:///C:/Users/ondig/Code/Nipei/nipei-vault/Miembros/${selectedMemberId}.md`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#122414] hover:bg-[#1a351d] text-emerald-300 border border-emerald-500/40 text-xs font-medium transition"
        >
          <Brain size={14} className="text-emerald-400" />
          <span>Ficha Vault</span>
          <ExternalLink size={11} className="opacity-60" />
        </a>
      </div>
    </div>
  );
}
