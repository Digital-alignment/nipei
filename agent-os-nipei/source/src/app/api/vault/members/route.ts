import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { MemberProfile } from "@/lib/nipeiStore";

export const dynamic = "force-dynamic";

const VAULT_PATH = process.env.NIPEI_VAULT_PATH || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

export async function GET() {
  try {
    const miembrosDir = path.join(VAULT_PATH, "Miembros");
    if (!fs.existsSync(miembrosDir)) {
      return NextResponse.json({ success: true, members: [], count: 0 });
    }

    const files = fs.readdirSync(miembrosDir).filter((f) => f.endsWith(".md"));
    const members: MemberProfile[] = [];

    files.forEach((f) => {
      const p = path.join(miembrosDir, f);
      const content = fs.readFileSync(p, "utf8");

      const idMatch = content.match(/id:\s*"([^"]+)"/);
      const nameMatch = content.match(/name:\s*"([^"]+)"/);
      const nativeNameMatch = content.match(/native_name:\s*"([^"]*)"/);
      const typeMatch = content.match(/type:\s*"([^"]+)"/);
      const contractMatch = content.match(/contract_type:\s*"([^"]+)"/);
      const statusMatch = content.match(/status:\s*"([^"]+)"/);
      const roleMatch = content.match(/global_role:\s*"([^"]+)"/);
      const missingInfoMatch = content.match(/has_missing_info:\s*(true|false)/);
      const missingDetailsMatch = content.match(/missing_info_details:\s*"([^"]*)"/);
      const areaMatch = content.match(/area:\s*"([^"]*)"/);
      const funcaoMatch = content.match(/funcao:\s*"([^"]*)"/);

      const id = idMatch ? idMatch[1] : f.replace(".md", "");
      const name = nameMatch ? nameMatch[1] : f.replace(".md", "");
      const nativeName = nativeNameMatch ? nativeNameMatch[1] : "";
      const type = (typeMatch ? typeMatch[1] : "human_staff") as any;
      const contractType = (contractMatch ? contractMatch[1] : "Fijo") as any;
      const status = (statusMatch ? statusMatch[1] : "APPROVED") as any;
      const globalRole = (roleMatch ? roleMatch[1] : "OPERATOR") as any;
      const hasMissingInfo = missingInfoMatch ? missingInfoMatch[1] === "true" : false;
      const missingInfoDetails = missingDetailsMatch ? missingDetailsMatch[1] : "";
      const area = areaMatch ? areaMatch[1] : "";
      const funcao = funcaoMatch ? funcaoMatch[1] : "";

      let avatar = "👤";
      const areaLower = (area || "").toLowerCase();
      const funcaoLower = (funcao || "").toLowerCase();
      if (type === "ai_agent" || id.startsWith("agente_")) avatar = "🤖";
      else if (type === "human_paje_cacique" || name.toLowerCase().includes("cacique") || name.toLowerCase().includes("pajé")) avatar = "👑";
      else if (type === "human_executive" || globalRole === "SQUAD_LEADER" || globalRole === "SUPER_USER") avatar = "⚡";
      else if (funcaoLower.includes("tech") || id.includes("tech") || id.includes("dev")) avatar = "💻";
      else if (funcaoLower.includes("retiro") || areaLower.includes("retiro")) avatar = "🌿";

      members.push({
        id,
        name,
        nativeName,
        avatar,
        type,
        contractType,
        status,
        hasMissingInfo,
        missingInfoDetails,
        specialityOrLineage: `${area} ${funcao}`.trim() || "Integrante do ecossistema Nipëi OS",
        globalRole,
        companyAssignments: [{ companyId: "nipei_os", companyName: "Nipëi OS", positionTitle: funcao || area || "Integrante" }],
        squadAssignments: [{ squadId: "squad_general", roleTitle: funcao || "Operacional", confirmationStatus: "APPROVED", isPrimary: true }],
        responsibilities: [funcao || area || "Atividades gerais no ecossistema"],
        vaultPath: `Miembros/${f}`,
      });
    });

    return NextResponse.json({ success: true, members, count: members.length });
  } catch (err: any) {
    console.error("API /api/vault/members CRITICAL ERROR:", err.stack || err);
    return NextResponse.json({ success: false, error: String(err.stack || err) }, { status: 500 });
  }
}
