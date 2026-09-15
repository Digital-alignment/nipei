"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, QrCode, FileText, CheckCircle2, ShieldCheck, MapPin, ArrowRight,
  Plus, Minus, RefreshCw, UploadCloud, Camera, Layers, Truck, AlertTriangle,
  Wrench, ShoppingBag, FileSpreadsheet, Check, Play
} from "lucide-react";
import {
  INITIAL_INVENTORY, INITIAL_TRACEABILITY, INITIAL_FICHAS_TECNICAS,
  INITIAL_ORDERS, INITIAL_MAINTENANCE, type InventoryItem, type TraceabilityRecord,
  type FichaTecnica, type ECommerceOrder, type MaintenanceOrder, type SquadId
} from "@/lib/nipeiStore";

export default function NipeiFlowView({ squadId = "super_user", nucleus = "comercial" }: { squadId?: SquadId; nucleus?: "sagrado" | "comercial" }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [traceability, setTraceability] = useState<TraceabilityRecord[]>(INITIAL_TRACEABILITY);
  const [recipes, setRecipes] = useState<FichaTecnica[]>(INITIAL_FICHAS_TECNICAS);
  const [orders, setOrders] = useState<ECommerceOrder[]>(INITIAL_ORDERS);
  const [maintenance, setMaintenance] = useState<MaintenanceOrder[]>(INITIAL_MAINTENANCE);

  const [activeTab, setActiveTab] = useState<"estoque" | "trazabilidade" | "fichas" | "vendas_pago" | "manutencao">("estoque");
  const [qrScanning, setQrScanning] = useState(false);
  const [qrResult, setQrResult] = useState<string | null>(null);
  const [ocrModal, setOcrModal] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  function adjustStock(id: string, delta: number) {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item))
    );
  }

  // Squad IV Automation: Mark Order "Pago" -> Auto deduct raw materials via Ficha Técnica
  function handlePayOrder(orderId: string) {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId && ord.status === "Pendente") {
          // Trigger automatic raw material deduction
          ord.items.forEach((item) => {
            const recipe = recipes.find((r) => r.productId === item.productId);
            if (recipe) {
              recipe.ingredients.forEach((ing) => {
                const totalNeeded = ing.quantityRequired * item.qty;
                adjustStock(ing.inventoryId, -totalNeeded);
              });
            }
          });
          return { ...ord, status: "Pago", inventoryDeducted: true };
        }
        return ord;
      })
    );
  }

  // Squad VI Automation: Complete Maintenance -> Auto deduct spare parts stock
  function handleCompleteMaintenance(mntId: string) {
    setMaintenance((prev) =>
      prev.map((mnt) => {
        if (mnt.id === mntId && mnt.status !== "concluido") {
          mnt.partsRequired.forEach((part) => {
            adjustStock(part.inventoryId, -part.qty);
          });
          return { ...mnt, status: "concluido" };
        }
        return mnt;
      })
    );
  }

  function handleSimulateQrScan() {
    setQrScanning(true);
    setTimeout(() => {
      setQrScanning(false);
      setQrResult("QR-MUTUM-08A: LOTE Nisurau (Aldeia Mutum -> Serra Grande) - Validado!");
    }, 1800);
  }

  function handleSimulateOcrUpload() {
    setOcrSuccess(false);
    setTimeout(() => {
      setOcrSuccess(true);
      const newItem: InventoryItem = {
        id: `INV-${Date.now().toString().slice(-3)}`,
        name: "Factura MUV Gráfica: 200 Frascos Âmbar 50ml",
        category: "empaque_ambar",
        origin: "MUV Gráfica",
        stock: 200,
        unit: "unidades",
        minStock: 30,
        unitCost: 4.2,
        ethicallyCertified: true,
        squad: "Squad I (Admin)",
      };
      setInventory((prev) => [newItem, ...prev]);
    }, 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-[#1e381e] bg-[#0c140c] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded bg-[#142414] border border-[#22c55e] text-[10px] font-mono font-bold text-[#4ade80] uppercase tracking-wider">
              Nipëi Flow
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#a7f3d0]">
              Supply Chain · Produção Mutum · Infraestrutura VI
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão Física, Baixa por Ficha Técnica & Manutenção</h2>
          <p className="text-xs text-[#a7f3d0] font-mono leading-relaxed max-w-2xl">
            Integração das operações físicas do Squad II (Mutum), Squad III (Retiros), Squad IV (Vendas) e Squad VI (Infra).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setQrScanning(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#091409] border border-[#1e381e] text-xs font-mono font-bold text-[#4ade80] hover:bg-[#142414] transition"
          >
            <QrCode size={15} className="text-[#22c55e]" /> Scanner QR Móvel
          </button>

          <button
            onClick={() => setOcrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#142414] border border-[#22c55e] text-xs font-mono font-bold text-white hover:bg-[#1e381e] transition shadow-md"
          >
            <FileText size={15} className="text-[#22c55e]" /> OCR Facturas Insumos
          </button>
        </div>
      </div>

      {/* Sub-Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e381e] pb-3 flex-wrap">
        {[
          { id: "estoque", label: "Inventário & Estoque", icon: <Package size={14} /> },
          { id: "fichas", label: "Fichas Técnicas (Receitas)", icon: <Layers size={14} /> },
          { id: "vendas_pago", label: "Squad IV: Baixa Automática Venda Pago", icon: <ShoppingBag size={14} /> },
          { id: "trazabilidade", label: "Squad II: Trazabilidade Mutum", icon: <Truck size={14} /> },
          { id: "manutencao", label: "Squad VI: Chamados Manutenção", icon: <Wrench size={14} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition ${
                isActive
                  ? "bg-[#162416] text-white font-bold border border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : "bg-[#091409] text-[#a7f3d0] border border-[#1e381e] hover:bg-[#142414] hover:text-white"
              }`}
            >
              <span className={isActive ? "text-[#22c55e]" : "text-[#a7f3d0]"}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* QR Scanner Drawer */}
      <AnimatePresence>
        {qrScanning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="animate-pulse text-[#22c55e]" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scanner QR Code Celular</h3>
              </div>
              <button onClick={() => { setQrScanning(false); setQrResult(null); }} className="text-xs text-[#4ade80]">✕ Fechar</button>
            </div>
            <div className="p-6 rounded border border-dashed border-[#1e381e] bg-[#050805] text-center space-y-3">
              <QrCode size={48} className="mx-auto text-[#22c55e] animate-bounce" />
              <button onClick={handleSimulateQrScan} className="px-4 py-2 rounded bg-[#142414] border border-[#22c55e] text-xs font-mono text-white hover:bg-[#1e381e]">
                [Simular Leitura de QR no Celular]
              </button>
            </div>
            {qrResult && (
              <div className="p-3 rounded bg-[#0c1c0c] border border-[#22c55e] text-xs font-mono text-[#4ade80] flex items-center gap-2">
                <CheckCircle2 size={16} /> {qrResult}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: ESTOQUE & INVENTARIO */}
      {activeTab === "estoque" && (
        <section className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-[#1e381e] bg-[#0f190f]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050805] text-[#4ade80] border-b border-[#1e381e] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Produto / Insumo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-center">Estoque Atual</th>
                  <th className="p-3">Squad Responsável</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#142414] text-[#e2f7e2]">
                {inventory.map((item) => {
                  const isLow = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-[#162416] transition">
                      <td className="p-3 font-bold text-[#22c55e]">{item.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-[#a7f3d0]">Origem: {item.origin}</div>
                      </td>
                      <td className="p-3 text-[#a7f3d0]">{item.category}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded font-bold ${isLow ? "bg-[#381c1c] text-[#ef4444] border border-[#ef4444]" : "bg-[#142414] text-[#4ade80]"}`}>
                          {item.stock} {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-[#a7f3d0]">{item.squad}</td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => adjustStock(item.id, -1)} className="p-1 rounded bg-[#142414] border border-[#1e381e] text-[#ef4444]">
                            <Minus size={13} />
                          </button>
                          <button onClick={() => adjustStock(item.id, 1)} className="p-1 rounded bg-[#142414] border border-[#1e381e] text-[#22c55e]">
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: FICHAS TECNICAS (RECEITAS DE PRODUÇÃO SQUAD II) */}
      {activeTab === "fichas" && (
        <section className="space-y-4">
          <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-[#22c55e]" /> Fichas Técnicas de Produção (Squad II Mutum)
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              Cadastramento dos insumos e matérias-primas necessários para cada produto final. Quando uma venda é alterada para "Pago", o sistema lê a ficha técnica e realiza a baixa automática dos insumos.
            </p>

            <div className="space-y-3 pt-2">
              {recipes.map((rec) => (
                <div key={rec.productId} className="p-4 rounded border border-[#22c55e] bg-[#050805] space-y-2">
                  <div className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{rec.productName}</span>
                    <span className="pill pill-ok">Ficha Ativa</span>
                  </div>

                  <div className="text-xs text-[#a7f3d0] font-mono">Insumos Necessários por Unidade:</div>
                  <ul className="space-y-1 pl-3 font-mono text-xs text-[#4ade80]">
                    {rec.ingredients.map((ing, idx) => (
                      <li key={idx}>
                        • {ing.inventoryName}: <strong className="text-white">{ing.quantityRequired} {ing.unit}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SQUAD IV - AUTOMACAO DE PEDIDO PAGO */}
      {activeTab === "vendas_pago" && (
        <section className="space-y-4">
          <div className="p-4 rounded-lg border border-[#22c55e] bg-[#0a140a] space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className="text-[#22c55e]" /> Automação Squad IV — Baixa Automática ao Mudar Status para "Pago"
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              Simulação de pedido e-commerce. Ao clicar em **"Confirmar Pagamento (Pago)"**, o backend consulta a Ficha Técnica e subtrai as matérias-primas do estoque instantaneamente.
            </p>

            <div className="space-y-3 pt-2">
              {orders.map((ord) => (
                <div key={ord.id} className="p-4 rounded border border-[#1e381e] bg-[#050805] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">{ord.id} · {ord.customerName} ({ord.customerEmail})</div>
                    <div className="text-xs font-mono text-[#a7f3d0]">
                      {ord.items.map(i => `${i.qty}x ${i.productName}`).join(", ")} — Total: R$ {ord.totalAmount.toFixed(2)}
                    </div>
                    {ord.inventoryDeducted && (
                      <div className="text-[10px] text-[#4ade80] font-mono flex items-center gap-1 font-bold">
                        <CheckCircle2 size={12} /> Estoque Baixado Automático via Ficha Técnica
                      </div>
                    )}
                  </div>

                  {ord.status === "Pendente" ? (
                    <button
                      onClick={() => handlePayOrder(ord.id)}
                      className="px-4 py-2 bg-[#22c55e] text-[#050805] text-xs font-bold rounded hover:bg-[#4ade80] flex items-center gap-1.5"
                    >
                      <Play size={12} /> Confirmar Pagamento (Pago)
                    </button>
                  ) : (
                    <span className="pill pill-ok">Pagamento Confirmado (Pago)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: TRAZABILIDADE SQUAD II */}
      {activeTab === "trazabilidade" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {traceability.map((item) => (
              <div key={item.batchId} className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#22c55e] font-bold">{item.batchId}</span>
                  <span className="pill pill-ok">{item.status}</span>
                </div>
                <h4 className="text-base font-bold text-white">{item.productName}</h4>
                <div className="text-xs text-[#a7f3d0] space-y-1 font-mono">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#22c55e]" /> Origem: {item.locationOrigin} ({item.harvestDate})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-[#4ade80]" /> Validação Sagrada: {item.pajeApprover}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 5: SQUAD VI MANUTENÇÃO */}
      {activeTab === "manutencao" && (
        <section className="space-y-4">
          <div className="p-4 rounded-lg border border-[#1e381e] bg-[#0f190f] space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench size={16} className="text-[#f59e0b]" /> Squad VI — Gestão de Infraestrutura & Peças de Reposição
            </h3>
            <p className="text-xs text-[#a7f3d0]">
              Chamados de manutenção preventiva e corretiva vinculados diretamente ao estoque de peças de reposição.
            </p>

            <div className="space-y-3 pt-2">
              {maintenance.map((mnt) => (
                <div key={mnt.id} className="p-4 rounded border border-[#1e381e] bg-[#050805] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">{mnt.id} · {mnt.assetName}</div>
                    <div className="text-xs text-[#a7f3d0]">{mnt.issueDescription} ({mnt.location})</div>
                    <div className="text-[10px] text-[#f59e0b] font-mono">
                      Peça Requerida: {mnt.partsRequired.map(p => `${p.qty}x ${p.partName}`).join(", ")}
                    </div>
                  </div>

                  {mnt.status !== "concluido" ? (
                    <button
                      onClick={() => handleCompleteMaintenance(mnt.id)}
                      className="px-3.5 py-1.5 bg-[#142414] border border-[#22c55e] text-[#4ade80] text-xs font-bold rounded hover:bg-[#1e381e]"
                    >
                      Concluir Reparo & Dar Baixa na Peça
                    </button>
                  ) : (
                    <span className="pill pill-ok font-mono">Manutenção Concluída</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
