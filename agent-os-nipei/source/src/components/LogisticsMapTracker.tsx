"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Truck, MapPin, ShieldCheck, CheckCircle2, ChevronRight, Anchor, Factory, ShoppingBag } from "lucide-react";
import { INITIAL_TRACEABILITY, type TraceabilityRecord } from "@/lib/nipeiStore";

export default function LogisticsMapTracker() {
  const [batches] = useState<TraceabilityRecord[]>(INITIAL_TRACEABILITY);
  const [selectedBatch, setSelectedBatch] = useState<TraceabilityRecord>(batches[0]!);

  const STAGES = [
    { id: 1, title: "Aldeia Mutum (Acre)", desc: "Colheita Ritual & Extração Florestal", icon: <MapPin size={16} className="text-[#22c55e]" /> },
    { id: 2, title: "Transporte Fluvial (Rio Tarauacá)", desc: "Frete Barco & Armazenamento", icon: <Anchor size={16} className="text-[#4ade80]" /> },
    { id: 3, title: "Lab Boticário (Serra Grande)", desc: "Envasado & Frascos Âmbar", icon: <Factory size={16} className="text-[#10b981]" /> },
    { id: 4, title: "Estoque Inî Rau E-Commerce", desc: "Pronto para Envio & Retiros", icon: <ShoppingBag size={16} className="text-[#34d399]" /> },
  ];

  return (
    <div className="p-5 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e381e] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-[#22c55e]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Rastreador de Ruta Logística de Bioeconomia (Aldeia Mutum ➔ Bahía)
            </h3>
          </div>
          <p className="text-xs text-[#a7f3d0] mt-0.5 font-mono">
            Trazabilidade completa das matérias-primas rituais do Squad II.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {batches.map((b) => (
            <button
              key={b.batchId}
              onClick={() => setSelectedBatch(b)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                selectedBatch.batchId === b.batchId
                  ? "bg-[#22c55e] text-[#050805] font-bold"
                  : "bg-[#050805] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414]"
              }`}
            >
              {b.batchId}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Step Route Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative pt-2">
        {STAGES.map((stg, idx) => {
          const isCurrent = idx === 2; // Lab Boticario current stage for LOTE-2026-08A
          return (
            <div
              key={stg.id}
              className={`p-4 rounded-lg border space-y-2 relative transition ${
                isCurrent
                  ? "bg-[#0c1c0c] border-[#22c55e] shadow-lg"
                  : "bg-[#050805] border-[#1e381e]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#a7f3d0] font-bold">Etapa 0{stg.id}</span>
                {stg.icon}
              </div>
              <div className="text-xs font-bold text-white">{stg.title}</div>
              <div className="text-[10px] text-[#a7f3d0] font-mono">{stg.desc}</div>
              {isCurrent && (
                <div className="text-[9px] font-mono font-bold text-[#4ade80] bg-[#142414] px-2 py-0.5 rounded border border-[#22c55e]">
                  📍 Lote Atual Aqui
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Metadata Card */}
      <div className="p-4 rounded bg-[#050805] border border-[#1e381e] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono">
        <div className="space-y-1">
          <div className="text-white font-bold">Lote Selecionado: {selectedBatch.batchId} ({selectedBatch.productName})</div>
          <div className="text-[#a7f3d0]">Origem: {selectedBatch.locationOrigin} | Data Colheita: {selectedBatch.harvestDate}</div>
          <div className="text-[#4ade80] font-bold flex items-center gap-1">
            <ShieldCheck size={14} /> Validação Sagrada: {selectedBatch.pajeApprover}
          </div>
        </div>

        <div className="px-3 py-1.5 rounded bg-[#142414] border border-[#22c55e] text-[#4ade80] font-bold">
          QR: {selectedBatch.qrCode}
        </div>
      </div>
    </div>
  );
}
