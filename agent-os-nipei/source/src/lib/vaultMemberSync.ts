import fs from "fs";
import path from "path";
import { MemberProfile } from "./nipeiStore";

const VAULT_PATH = process.env.NIPEI_VAULT_PATH || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

export function syncMemberToVault(member: MemberProfile): boolean {
  try {
    const membersDir = path.join(VAULT_PATH, "Miembros");
    if (!fs.existsSync(membersDir)) {
      fs.mkdirSync(membersDir, { recursive: true });
    }

    const filePath = path.join(membersDir, `${member.id}.md`);

    const aliasesYaml = [
      `  - "${member.name}"`,
      ...(member.nativeName ? [`  - "${member.nativeName}"`] : []),
    ].join("\n");

    const yamlFrontmatter = [
      "---",
      `id: "${member.id}"`,
      `name: "${member.name}"`,
      `native_name: "${member.nativeName || ""}"`,
      `type: "${member.type}"`,
      `contract_type: "${member.contractType || "Fijo"}"`,
      `status: "${member.status}"`,
      `has_missing_info: ${member.hasMissingInfo ? "true" : "false"}`,
      `missing_info_details: "${member.missingInfoDetails || ""}"`,
      `global_role: "${member.globalRole}"`,
      "tags:",
      "  - membro",
      "  - integrante-real",
      `  - tipo-${member.type}`,
      "aliases:",
      aliasesYaml,
      `updated_at: "${new Date().toISOString()}"`,
      "squad_assignments:",
      ...(member.squadAssignments || []).map(
        (sa) =>
          `  - squad_id: "${sa.squadId}"\n    role_title: "${sa.roleTitle}"\n    confirmation_status: "${sa.confirmationStatus}"`
      ),
      "company_assignments:",
      ...(member.companyAssignments || []).map(
        (ca) =>
          `  - company_id: "${ca.companyId}"\n    position_title: "${ca.positionTitle}"`
      ),
      "---",
      "",
      `# Expediente / Ficha Técnica: ${member.name} ${member.nativeName ? `(${member.nativeName})` : ""}`,
      "",
      `**Tipo de Integrante**: \`${member.type.toUpperCase()}\` | **Contrato**: \`${member.contractType || "N/A"}\``,
      `**Estado de Confirmación**: ${member.status === "APPROVED" ? "✅ CONFIRMADO" : "⏳ PENDIENTE DE CONFIRMACIÓN MANUAL"}`,
      "",
      member.hasMissingInfo
        ? `> ⚠️ **Información Faltante por Completar**: ${member.missingInfoDetails}`
        : "> ✅ **Expediente Completo sin Pendientes**",
      "",
      "## 📜 Saberes Ancestrales, Linaje & Hitos Históricos",
      member.specialityOrLineage || "Sin información registrada.",
      "",
      "## 💼 Asignación en Squads (Enlaces Grafo 3D)",
      ...(member.squadAssignments && member.squadAssignments.length > 0
        ? member.squadAssignments.map(
            (sa) =>
              `- [[Squads/${sa.squadId}|${sa.squadId}]] — *${sa.roleTitle}* [Estado: ${sa.confirmationStatus}]`
          )
        : ["- Sin squads asignados actualmente."]),
      "",
      "## 🏢 Vinculación con Empresas & Entidades",
      ...(member.companyAssignments && member.companyAssignments.length > 0
        ? member.companyAssignments.map(
            (ca) => `- [[Empresas/${ca.companyId}|${ca.companyName}]] — *${ca.positionTitle}*`
          )
        : ["- Sin empresas vinculadas."]),
      "",
      "## 🎯 Responsabilidades Objetivas",
      ...(member.responsibilities && member.responsibilities.length > 0
        ? member.responsibilities.map((r) => `- ${r}`)
        : ["- Pendiente de definir."]),
      "",
      member.aiAgentConfig
        ? [
            "## 🔒 Firewall de Sensibilidad & Control de Alcance (Agente IA)",
            `**Acción Ante Datos Restringidos**: \`${member.aiAgentConfig.actionPolicy}\``,
            "**Temas / Contextos Prohibidos**:",
            ...member.aiAgentConfig.restrictedTopics.map((t) => `- ⛔ ${t}`),
          ].join("\n")
        : "",
      "",
      "---",
      `*Expediente sincronizado con enlaces bidireccionales por Nipëi OS Core — ${new Date().toLocaleString()}*`,
    ].join("\n");

    fs.writeFileSync(filePath, yamlFrontmatter, "utf-8");
    console.log(`[VaultMemberSync] Expediente con [[wikilinks]] sincronizado: ${filePath}`);
    return true;
  } catch (err) {
    console.error(`[VaultMemberSync] Error al sincronizar Miembro en Vault:`, err);
    return false;
  }
}
