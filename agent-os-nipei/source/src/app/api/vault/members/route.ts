import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { MemberProfile, MemberSquadAssignment } from "@/lib/nipeiStore";
import { defaultVault } from "@/lib/config";

export const dynamic = "force-dynamic";

// Reads Miembros/*.md frontmatter as-is. Missing data stays missing — no default squads,
// roles or responsibilities are invented here (the vault is the source of truth).
const str = (fm: string, k: string) => fm.match(new RegExp(`^${k}:[ \\t]*"?([^"\\n\\r]*)"?`, "m"))?.[1].trim() ?? "";

function listOfMaps(fm: string, key: string): Record<string, string>[] {
  const block = fm.match(new RegExp(`^${key}:[ \\t]*\\r?\\n((?:[ \\t]+.*\\r?\\n?)*)`, "m"))?.[1] ?? "";
  return block
    .split(/^\s*-\s+/m)
    .slice(1)
    .map((item) => Object.fromEntries([...item.matchAll(/([a-z_]+):\s*"?([^"\n\r]*)"?/g)].map((m) => [m[1], m[2].trim()])));
}

export async function GET() {
  try {
    const vaultRoot = defaultVault();
    const miembrosDir = vaultRoot ? path.join(vaultRoot, "Miembros") : "";
    if (!miembrosDir || !fs.existsSync(miembrosDir)) {
      return NextResponse.json({ success: false, error: "Pasta Miembros não encontrada no vault", members: [], count: 0 }, { status: 500 });
    }

    const files = fs.readdirSync(miembrosDir).filter((f) => f.endsWith(".md"));
    const members: MemberProfile[] = files.map((f) => {
      const content = fs.readFileSync(path.join(miembrosDir, f), "utf8");
      const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";

      const id = str(fm, "id") || f.replace(".md", "");
      const name = str(fm, "name") || id;
      const type = (str(fm, "type") || "human_staff") as MemberProfile["type"];
      const globalRole = (str(fm, "global_role") || "OPERATOR") as MemberProfile["globalRole"];
      const area = str(fm, "area");
      const funcao = str(fm, "funcao");

      let avatar = "👤";
      if (type === "ai_agent" || id.startsWith("agente_")) avatar = "🤖";
      else if (type === "human_paje_cacique" || /cacique|pajé/i.test(name)) avatar = "👑";
      else if (type === "human_executive" || globalRole === "SQUAD_LEADER" || globalRole === "SUPER_USER") avatar = "⚡";
      else if (/tech|dev/i.test(`${funcao} ${id}`)) avatar = "💻";
      else if (/retiro/i.test(`${funcao} ${area}`)) avatar = "🌿";

      return {
        id,
        name,
        nativeName: str(fm, "native_name"),
        // email/whatsapp deliberately not returned: this route has no auth yet. Saving a member
        // without them keeps the values already in the note (see vaultMemberSync).
        avatar,
        type,
        contractType: (str(fm, "contract_type") || undefined) as MemberProfile["contractType"],
        status: (str(fm, "status") || "PENDING_CONFIRMATION") as MemberProfile["status"],
        hasMissingInfo: str(fm, "has_missing_info") === "true",
        missingInfoDetails: str(fm, "missing_info_details"),
        specialityOrLineage: [area, funcao].filter(Boolean).join(" · ") || undefined,
        globalRole,
        companyAssignments: listOfMaps(fm, "company_assignments").map((c) => ({
          companyId: c.company_id,
          companyName: c.company_name || c.company_id,
          positionTitle: c.position_title || "",
        })),
        squadAssignments: listOfMaps(fm, "squad_assignments").map((s) => ({
          squadId: s.squad_id,
          roleTitle: s.role_title || "",
          confirmationStatus: (s.confirmation_status || "PENDING_CONFIRMATION") as MemberSquadAssignment["confirmationStatus"],
          isPrimary: s.is_primary === "true",
        })),
        responsibilities: funcao ? [funcao] : [],
        vaultPath: `Miembros/${f}`,
      } as MemberProfile;
    });

    return NextResponse.json({ success: true, members, count: members.length });
  } catch (err: any) {
    console.error("API /api/vault/members CRITICAL ERROR:", err.stack || err);
    return NextResponse.json({ success: false, error: String(err.message || err) }, { status: 500 });
  }
}
