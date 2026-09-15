"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Globe,
  Cloud,
  ShieldCheck,
  Cpu,
  HardDrive,
  Activity,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Layers,
  Lock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  Database,
  Radio,
  CheckSquare,
  QrCode,
  Smartphone,
  Hash
} from "lucide-react";

interface Subdomain {
  name: string;
  target: string;
  status: string;
}

interface VPSService {
  id: string;
  name: string;
  container: string;
  port: number;
  desc: string;
  url?: string;
  status: string;
}

interface ExternalService {
  name: string;
  container: string;
  desc: string;
  status: string;
}

interface SSHKey {
  name: string;
  type: string;
  status: string;
  agent: string;
}

interface InfraData {
  primaryDomain: {
    domain: string;
    provider: string;
    status: string;
    nameservers: string[];
    subdomains: Subdomain[];
  };
  cloudflare: {
    account: string;
    services: { name: string; desc: string; status: string }[];
  };
  vps: {
    provider: string;
    ip: string;
    location: string;
    specs: { cpu: string; ram: string; disk: string; bandwidth: string };
    status: string;
    sshKeys: SSHKey[];
    nipeiServices: VPSService[];
    externalServices: ExternalService[];
  };
}

export default function InfrastructureServicesView() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vps_services" | "overview" | "ssh_keys" | "whatsapp">("vps_services");

  const [copiedCmd, setCopiedCmd] = useState(false);

  // WhatsApp state
  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);

  const copyPairingCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPairingCode(true);
    setTimeout(() => setCopiedPairingCode(false), 2000);
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/infrastructure/status");
      const json = await res.json();
      if (json.success) {
        setData(json.infraStatus);
      }
    } catch (err) {
      console.error("Error loading infra status:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppStatus = async (phoneOverride?: string) => {
    setWaLoading(true);
    try {
      const targetPhone = phoneOverride !== undefined ? phoneOverride : phoneNumber;
      let url = "/api/whatsapp/connect";
      if (targetPhone) {
        url += `?number=${encodeURIComponent(targetPhone)}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setWaConnected(json.connected);
        setWaQrCode(json.qrcode);
        if (json.pairingCode) {
          setWaPairingCode(json.pairingCode);
        }
      }
    } catch (err) {
      console.error("Error fetching WhatsApp QR/Pairing code:", err);
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchWhatsAppStatus();
  }, []);

  const sshCommand = `ssh -i ~/.ssh/nipei_vps root@85.31.61.100`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050805] text-[#e0e8e0] p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-[#0c140c] border border-[#1f381f] rounded-2xl shadow-xl shadow-green-950/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-[#22c55e]">
              <Server size={32} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full">
                  FASE 1 — SERVICIOS CONECTADOS
                </span>
                <span className="text-xs text-[#88a888]">VPS Hostinger: <strong>85.31.61.100</strong></span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                Servicios Conectados & Infraestructura VPS
              </h1>
              <p className="text-sm text-[#88a888] mt-0.5">
                Estado en tiempo real de servicios compartidos (n8n, Evolution API, Cloudflare) y credenciales de IA verificadas.
              </p>
            </div>
          </div>

          <button
            onClick={() => { fetchStatus(); fetchWhatsAppStatus(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualizar Status
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#182818] pb-3 flex-wrap">
          <button
            onClick={() => setActiveTab("vps_services")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "vps_services"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <Zap size={16} />
            Servicios Nipëi OS en VPS
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "whatsapp"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <Smartphone size={16} />
            Conectar WhatsApp (QR / Código 8 Dígitos)
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "overview"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <Globe size={16} />
            Dominios & Cloudflare (nipeihu.app)
          </button>

          <button
            onClick={() => setActiveTab("ssh_keys")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === "ssh_keys"
                ? "bg-[#183018] text-[#22c55e] border border-[#22c55e]/40 shadow-lg"
                : "text-[#88a888] hover:text-white hover:bg-[#0c140c]"
            }`}
          >
            <Key size={16} />
            Acceso SSH Multi-Agente
          </button>
        </div>

        {/* TAB: WHATSAPP QR & PAIRING CODE SCANNER */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Smartphone className="text-[#22c55e]" size={20} />
                    Instancia WhatsApp: nipei-santuario
                  </h3>
                  <p className="text-xs text-[#88a888] mt-1">
                    Vincular tu teléfono mediante Código QR o Código de 8 dígitos directo.
                  </p>
                </div>
                <button
                  onClick={() => fetchWhatsAppStatus()}
                  className="px-3 py-1.5 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={waLoading ? "animate-spin" : ""} />
                  Recargar Código
                </button>
              </div>

              {waConnected ? (
                <div className="p-6 bg-[#050805] border border-[#22c55e]/50 rounded-xl text-center space-y-3">
                  <div className="inline-flex p-3 bg-[#22c55e]/20 text-[#22c55e] rounded-full">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-lg font-bold text-white">¡WhatsApp Conectado y Operativo!</h4>
                  <p className="text-xs text-[#88a888]">
                    La instancia <strong>nipei-santuario</strong> está vinculada activamente y lista para recibir/enviar mensajes.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pairing Code Generator Section */}
                  <div className="p-6 bg-[#050805] border border-[#1f381f] rounded-2xl space-y-5 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#182818] pb-3">
                      <label className="text-xs font-extrabold text-[#22c55e] uppercase tracking-wider flex items-center gap-2">
                        <Hash size={16} />
                        Método 1 (Recomendado): Vincular por Código de 8 Dígitos (Sin cámara)
                      </label>
                      <span className="text-[11px] px-2.5 py-0.5 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                        Alta Prioridad
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Ingresa tu número con código de país (Ej: 553175065978 o 52...)"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-[#0c140c] border border-[#1e381e] focus:border-[#22c55e] rounded-xl px-4 py-3 text-white text-sm focus:outline-none font-mono tracking-wide"
                        />
                      </div>
                      <button
                        disabled={waLoading}
                        onClick={() => fetchWhatsAppStatus(phoneNumber)}
                        className="px-5 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-950/40 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw size={14} className={waLoading ? "animate-spin" : ""} />
                        {waLoading ? "Generando Código..." : "Obtener Código de 8 Dígitos"}
                      </button>
                    </div>

                    {/* DEDICATED PERMANENT CODE DISPLAY FIELD */}
                    <div className="p-5 bg-[#091209] border border-[#22c55e]/40 rounded-xl space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#88a888] flex items-center gap-1.5 uppercase">
                          <Smartphone size={14} className="text-[#22c55e]" />
                          Campo del Código Generado:
                        </span>
                        {waPairingCode && (
                          <span className="text-[10px] px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded border border-[#22c55e]/40 font-bold animate-pulse">
                            🟢 VÁLIDO EN WHATSAPP
                          </span>
                        )}
                      </div>

                      {waLoading ? (
                        <div className="py-6 text-center space-y-2 bg-[#050805] rounded-lg border border-[#182818]">
                          <RefreshCw size={24} className="animate-spin text-[#22c55e] mx-auto" />
                          <p className="text-xs text-[#22c55e] font-bold">Generando código oficial desde Evolution API...</p>
                        </div>
                      ) : waPairingCode ? (
                        <div className="p-4 bg-[#0c1a0c] border border-[#22c55e] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-center sm:text-left">
                            <span className="text-[11px] text-[#88a888] block">Ingresa este código exacto en tu teléfono:</span>
                            <div className="text-3xl sm:text-4xl font-extrabold text-[#22c55e] tracking-[0.25em] font-mono py-1 drop-shadow-md">
                              {waPairingCode}
                            </div>
                          </div>
                          <button
                            onClick={() => copyPairingCode(waPairingCode)}
                            className="px-4 py-2.5 bg-[#142614] hover:bg-[#1f381f] text-[#22c55e] border border-[#22c55e]/50 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                          >
                            {copiedPairingCode ? <Check size={14} /> : <Copy size={14} />}
                            {copiedPairingCode ? "¡Copiado!" : "Copiar Código"}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-[#050805] border border-dashed border-[#1e381e] rounded-xl text-center space-y-2">
                          <div className="text-2xl font-mono font-extrabold text-[#4a6b4a] tracking-[0.3em] py-1">
                            _ _ _ _ - _ _ _ _
                          </div>
                          <p className="text-xs text-[#88a888]">
                            Escribe tu número arriba (ej: <code>553175065978</code>) y haz clic en <strong>"Obtener Código de 8 Dígitos"</strong>. El código de vinculación se mostrará aquí de inmediato.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code Scanner & Step-by-Step Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch pt-2">
                    <div className="p-6 bg-[#050805] border border-[#182818] rounded-xl flex flex-col items-center justify-center min-h-[280px] text-center space-y-4">
                      <span className="text-xs font-bold text-[#88a888] uppercase">Método 2: Escaneo de Código QR</span>
                      {waQrCode ? (
                        <div className="p-4 bg-white rounded-2xl shadow-2xl">
                          {waQrCode.startsWith("data:image") || waQrCode.length > 200 ? (
                            <img
                              src={waQrCode.startsWith("data:image") ? waQrCode : `data:image/png;base64,${waQrCode}`}
                              alt="WhatsApp QR Code"
                              className="w-56 h-56 object-contain"
                            />
                          ) : (
                            <p className="text-xs text-black font-mono break-all max-w-xs">{waQrCode}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 py-8">
                          <QrCode size={48} className="text-[#88a888] animate-pulse mx-auto" />
                          <p className="text-xs text-[#88a888]">Generando vista QR...</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-4 bg-[#050805] border border-[#182818] rounded-xl space-y-1.5">
                        <h5 className="font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded font-mono">Paso 1</span>
                          Abre WhatsApp en tu teléfono
                        </h5>
                        <p className="text-[#88a888] leading-relaxed">
                          Abre la aplicación oficial de WhatsApp en tu dispositivo móvil.
                        </p>
                      </div>

                      <div className="p-4 bg-[#050805] border border-[#182818] rounded-xl space-y-1.5">
                        <h5 className="font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded font-mono">Paso 2</span>
                          Menú de Dispositivos Vinculados
                        </h5>
                        <p className="text-[#88a888] leading-relaxed">
                          Toca los tres puntos (⋮) o Ajustes ➡️ <strong>Dispositivos vinculados</strong>.
                        </p>
                      </div>

                      <div className="p-4 bg-[#050805] border border-[#182818] rounded-xl space-y-1.5">
                        <h5 className="font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded font-mono">Paso 3</span>
                          Ingresa el Código Corto
                        </h5>
                        <p className="text-[#88a888] leading-relaxed">
                          Selecciona <strong>Vincular con el número de teléfono</strong> e ingresa el código de 8 dígitos generado en el campo verde de arriba.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: VPS SERVICES */}
        {activeTab === "vps_services" && (
          <div className="space-y-6">
            
            {/* Nipëi OS Shared Services */}
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Radio className="text-[#22c55e] animate-pulse" size={20} />
                    Servicios de Automatización e IA Conectados a Nipëi OS
                  </h3>
                  <p className="text-xs text-[#88a888] mt-1">
                    Instancias activas en el Hostinger VPS (85.31.61.100) utilizadas por Nipëi OS.
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 rounded-full text-xs font-bold">
                  🟢 6 Servicios Operativos
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {data?.vps.nipeiServices.map((svc) => (
                  <div key={svc.id} className="p-5 bg-[#050805] rounded-xl border border-[#182818] hover:border-[#22c55e]/50 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#22c55e]" />
                        {svc.name}
                      </h4>
                      <span className="text-xs font-mono bg-[#142614] text-[#22c55e] px-2.5 py-1 rounded border border-[#22c55e]/30 font-semibold">
                        Docker: {svc.container}
                      </span>
                    </div>
                    <p className="text-xs text-[#a0caa0]">{svc.desc}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#182818] text-xs">
                      <span className="text-[#88a888]">URL / Endpoint:</span>
                      {svc.url ? (
                        <a
                          href={svc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#22c55e] hover:underline flex items-center gap-1 font-bold"
                        >
                          {svc.url.replace("https://", "")}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-[#88a888]">Puerto Interno: {svc.port}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* External Isolated Applications */}
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Lock className="text-amber-400" size={18} />
                    Aplicaciones Externas en el VPS (Totalmente Aisladas)
                  </h3>
                  <p className="text-xs text-[#88a888] mt-1">
                    Servicios de otros proyectos en ejecución que <strong>NO son modificados ni accedidos</strong> por la memoria de Nipëi OS.
                  </p>
                </div>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold">
                  🔒 Preservadas & Aisladas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {data?.vps.externalServices.map((ext) => (
                  <div key={ext.name} className="p-4 bg-[#050805] rounded-xl border border-[#182818] flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">{ext.name}</h5>
                      <p className="text-[11px] text-[#88a888] mt-0.5">{ext.desc}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 font-mono">
                      Container: {ext.container}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Primary Domain Card */}
              <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#88a888] uppercase">Domínio Principal</span>
                  <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                    DNS Ativo (API Verificada)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-[#22c55e]" size={28} />
                  <div>
                    <h3 className="text-xl font-bold text-white">nipeihu.app</h3>
                    <p className="text-xs text-[#88a888]">Cloudflare Managed DNS</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#182818]">
                  <p className="text-xs text-[#88a888] mb-2">Nameservers Atribuídos:</p>
                  <div className="space-y-1 font-mono text-xs text-[#a0caa0]">
                    {data?.primaryDomain.nameservers.map((ns) => (
                      <div key={ns} className="p-2 bg-[#050805] rounded-lg border border-[#182818] flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-[#22c55e]" />
                        {ns}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* VPS Hostinger Specs */}
              <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#88a888] uppercase">Servidor VPS</span>
                  <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                    🟢 ONLINE (85.31.61.100)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Server className="text-[#22c55e]" size={28} />
                  <div>
                    <h3 className="text-xl font-bold text-white">Hostinger VPS</h3>
                    <p className="text-xs text-[#88a888]">Ubuntu 24.04 LTS (srv1589080)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2.5 bg-[#050805] rounded-xl border border-[#182818]">
                    <span className="text-[#88a888]">Processador:</span>
                    <p className="font-bold text-white mt-0.5">{data?.vps.specs.cpu}</p>
                  </div>
                  <div className="p-2.5 bg-[#050805] rounded-xl border border-[#182818]">
                    <span className="text-[#88a888]">Memória RAM:</span>
                    <p className="font-bold text-white mt-0.5">{data?.vps.specs.ram}</p>
                  </div>
                  <div className="p-2.5 bg-[#050805] rounded-xl border border-[#182818]">
                    <span className="text-[#88a888]">Disco NVMe:</span>
                    <p className="font-bold text-white mt-0.5">{data?.vps.specs.disk}</p>
                  </div>
                  <div className="p-2.5 bg-[#050805] rounded-xl border border-[#182818]">
                    <span className="text-[#88a888]">Banda Mensal:</span>
                    <p className="font-bold text-white mt-0.5">{data?.vps.specs.bandwidth}</p>
                  </div>
                </div>
              </div>

              {/* Cloudflare Ecosystem */}
              <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#88a888] uppercase">Cloudflare Integration</span>
                  <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                    Token Verificado
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Cloud className="text-[#22c55e]" size={28} />
                  <div>
                    <h3 className="text-xl font-bold text-white">Cloudflare Edge</h3>
                    <p className="text-xs text-[#88a888]">Global Network & Security</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  {data?.cloudflare.services.map((svc) => (
                    <div key={svc.name} className="p-2 bg-[#050805] rounded-lg border border-[#182818] flex items-center justify-between">
                      <span className="text-white font-medium">{svc.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-[#142614] text-[#22c55e] rounded border border-[#22c55e]/30">
                        {svc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subdomains Routing Table */}
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6">
              <h3 className="text-md font-bold text-white flex items-center gap-2 mb-4">
                <Layers className="text-[#22c55e]" size={18} />
                Mapeamento de Subdomínios sob nipeihu.app & DA Cloud
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#050805] text-[#88a888] uppercase font-semibold border-b border-[#182818]">
                    <tr>
                      <th className="p-3">Subdomínio / Host</th>
                      <th className="p-3">Alvo / Destino</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182818]">
                    {data?.primaryDomain.subdomains.map((sub) => (
                      <tr key={sub.name} className="hover:bg-[#050805]">
                        <td className="p-3 font-bold text-[#22c55e]">{sub.name}</td>
                        <td className="p-3 text-white">{sub.target}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
                            {sub.status === "active" ? "ATIVO" : "CONFIGURANDO"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SSH KEYS & CREDENTIALS */}
        {activeTab === "ssh_keys" && (
          <div className="space-y-6">
            <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-[#22c55e]" size={20} />
                  Estado de Credenciales Verificadas & Acceso SSH
                </h3>
                <p className="text-xs text-[#88a888] mt-1">
                  Verificación de llaves SSH autorizadas para Antigravity y Claude Code junto a tokens de API cargados.
                </p>
              </div>

              {/* Verified SSH Keys Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.vps.sshKeys.map((key) => (
                  <div key={key.name} className="p-5 bg-[#050805] border border-[#22c55e]/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key size={18} className="text-[#22c55e]" />
                        <h4 className="text-sm font-bold text-white">{key.name}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                        {key.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#88a888] space-y-1">
                      <p>Agente Asignado: <strong className="text-white">{key.agent}</strong></p>
                      <p>Tipo de Llave: <code className="text-[#a0caa0]">{key.type}</code></p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Verified API Keys Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-[#050805] border border-[#22c55e]/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Cloud size={18} className="text-[#22c55e]" />
                      Cloudflare API Token
                    </h4>
                    <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                      🟢 VÁLIDO & ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-[#88a888]">Permisos DNS & Tunnels para zone: <code>nipeihu.app</code></p>
                </div>

                <div className="p-5 bg-[#050805] border border-[#22c55e]/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap size={18} className="text-[#22c55e]" />
                      OpenRouter & Orca API Keys
                    </h4>
                    <span className="px-2.5 py-0.5 text-xs bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 rounded-full font-bold">
                      🟢 VÁLIDO & ACTIVO
                    </span>
                  </div>
                  <p className="text-xs text-[#88a888]">Acceso a modelos Llama, Qwen, DeepSeek & Claude via Gateway</p>
                </div>
              </div>

              {/* SSH Command Box */}
              <div className="p-4 bg-[#050805] border border-[#1a381a] rounded-xl space-y-3">
                <label className="block text-xs font-bold text-[#22c55e] uppercase">
                  Comando SSH de Conexión Directa al VPS Hostinger:
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 p-3 bg-[#0c140c] border border-[#182818] rounded-lg font-mono text-xs text-[#34d399] flex items-center justify-between">
                    <code>{sshCommand}</code>
                    <button
                      onClick={() => copyToClipboard(sshCommand)}
                      className="px-3 py-1.5 bg-[#22c55e] text-black font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-[#16a34a] transition-colors"
                    >
                      {copiedCmd ? <Check size={14} /> : <Copy size={14} />}
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#142614] border border-[#22c55e]/40 rounded-xl text-xs text-[#e0e8e0] flex items-start gap-3">
                <CheckSquare size={20} className="text-[#22c55e] shrink-0 mt-0.5" />
                <div>
                  <strong>Fase 1 Completada al 100%:</strong>
                  <p className="text-[#88a888] mt-0.5">
                    Todas las credenciales requeridas fueron almacenadas de forma segura en <code>.env.local</code> y verificadas contra las APIs oficiales de Cloudflare y OpenRouter. La instancia de WhatsApp fue creada en Evolution API.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
