import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const infraStatus = {
    primaryDomain: {
      domain: "nipeihu.app",
      provider: "Cloudflare DNS (Token Verificado)",
      status: "active",
      nameservers: ["adam.ns.cloudflare.com", "eva.ns.cloudflare.com"],
      subdomains: [
        { name: "kene.nipeihu.app", target: "Nipëi OS Control Hub (App Principal & Governance)", status: "active" },
        { name: "ai.nipeihu.app", target: "OmniRoute + OrcaRouter AI Gateway (Puerto 8090)", status: "active" },
        { name: "wa.nipeihu.app", target: "Evolution WhatsApp API Gateway (Puerto 8080)", status: "active" },
        { name: "n8n.nipeihu.app", target: "n8n Workflow Engine (Alias: panter.digital-alignment.com)", status: "active" },
        { name: "vps.nipeihu.app", target: "Hostinger VPS (85.31.61.100)", status: "active" }
      ]
    },
    cloudflare: {
      account: "Digital Alignment",
      services: [
        { name: "Cloudflare Managed DNS", desc: "Gestión en vivo de subdominios kene, ai, wa, n8n, vps", status: "active" },
        { name: "SSL / TLS Encryption", desc: "Encriptado de extremo a extremo para todos los subdominios", status: "active" },
        { name: "Cloudflare Proxy & Edge", desc: "Protección DDoS y caché de red global", status: "active" },
      ]
    },
    vps: {
      provider: "Hostinger VPS (srv1589080.hstgr.cloud)",
      ip: "85.31.61.100",
      location: "São Paulo, BR",
      specs: {
        cpu: "2 vCPU (KVM 2)",
        ram: "8 GB RAM",
        disk: "100 GB NVMe (40.2% Usado)",
        bandwidth: "Banda Ancha Ilimitada / 8 TB"
      },
      status: "online",
      sshKeys: [
        { name: "antigravity-nipei", type: "ssh-ed25519", status: "Verificado & Conectado", agent: "Antigravity Agent" },
        { name: "claude-muv-vps", type: "ssh-ed25519", status: "Verificado & Conectado", agent: "Claude Code Agent" }
      ],
      nipeiServices: [
        { id: "ai-gateway", name: "OmniRoute + OrcaRouter AI Gateway", container: "nipei-gateway", port: 8090, desc: "Gateway unificado con RTK Token Compression & Orca API Key", url: "https://ai.nipeihu.app/v1", status: "active" },
        { id: "n8n", name: "n8n Workflow Engine", container: "n8n", port: 5678, desc: "Orquestador de automatizaciones e IA para Nipëi OS", url: "https://n8n.nipeihu.app/", status: "active" },
        { id: "evolution", name: "Evolution API (WhatsApp Gateway)", container: "evolution-api", port: 8080, desc: "Instancia para WhatsApp API (nipei-santuario)", url: "https://wa.nipeihu.app/", status: "active" },
        { id: "traefik", name: "Traefik Reverse Proxy", container: "traefik-traefik-1", port: 80, desc: "Enrutador de tráfico SSL y certificados", status: "active" },
        { id: "postgres", name: "Evolution PostgreSQL DB", container: "evolution-postgres", port: 5432, desc: "Base de datos aislada para persistencia de chats", status: "active" },
        { id: "redis", name: "Evolution Redis Cache", container: "evolution-redis", port: 6379, desc: "Caché de memoria rápida para estado de sesiones", status: "active" }
      ],
      externalServices: [
        { name: "Oca Yary App", container: "oca-yary", desc: "Aplicación externa de cliente (No intervenida por Nipëi)", status: "isolated" },
        { name: "Vitta.io App", container: "vittaio", desc: "Aplicación externa de cliente (No intervenida por Nipëi)", status: "isolated" },
        { name: "LearnHouse Suite", container: "learnhouse-app / learnhouse-nginx", desc: "Plataforma educativa independiente", status: "isolated" },
        { name: "Rembg Service", container: "rembg", desc: "Herramienta externa de remoción de fondo", status: "isolated" }
      ]
    }
  };

  return NextResponse.json({ success: true, timestamp: new Date().toISOString(), infraStatus });
}
