import fs from "fs";
import path from "path";
import { MemberProfile } from "./nipeiStore";
import { defaultVault } from "./config";

/**
 * For an existing note, only the keys this function manages are rewritten: every other
 * frontmatter key (whatsapp, email, area, photo…) and the whole body (incl. merged
 * historical records) are kept as-is. New notes get the full template.
 */
const V2_DONAS = ["name", "native_name", "whatsapp", "email"];

function mergeIntoExisting(existing: string, generated: string): string {
  const oldFm = existing.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const newFm = generated.match(/^---\n([\s\S]*?)\n---/);
  if (!oldFm || !newFm) return generated;
  // Fields owned by the v2 profile (the person confirms them, the WhatsApp is verified): when the note
  // already has a value, this legacy writer never replaces it with the old store's copy.
  const valor = (k: string) => oldFm[1].match(new RegExp(`^${k}:[ \\t]*(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  const protegidas = V2_DONAS.filter((k) => valor(k) !== "" && valor(k) !== "null");
  const chave = (b: string) => b.match(/^([a-z_]+):/)?.[1] ?? "";
  const novas = newFm[1].split(/\n(?=[a-z_]+:)/).filter((b) => !protegidas.includes(chave(b)));
  const newKeys = new Set(novas.map(chave));
  const kept = oldFm[1]
    .split(/\r?\n(?=[a-z_]+:)/)
    .filter((block) => {
      const key = chave(block);
      return key && !newKeys.has(key);
    });
  return `---\n${[...novas, ...kept].join("\n")}\n---${existing.slice(oldFm[0].length)}`;
}

export function syncMemberToVault(member: MemberProfile): boolean {
  try {
    const vaultRoot = defaultVault();
    if (!vaultRoot) throw new Error("Vault root not configured");
    const membersDir = path.join(vaultRoot, "Miembros");
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
      ...(member.email !== undefined ? [`email: "${member.email}"`] : []),
      ...(member.phone !== undefined ? [`whatsapp: "${member.phone}"`] : []),
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

    const out = fs.existsSync(filePath) ? mergeIntoExisting(fs.readFileSync(filePath, "utf-8"), yamlFrontmatter) : yamlFrontmatter;
    fs.writeFileSync(filePath, out, "utf-8");
    console.log(`[VaultMemberSync] Expediente con [[wikilinks]] sincronizado: ${filePath}`);
    return true;
  } catch (err) {
    console.error(`[VaultMemberSync] Error al sincronizar Miembro en Vault:`, err);
    return false;
  }
}
