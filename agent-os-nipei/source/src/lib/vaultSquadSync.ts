import fs from "fs";
import path from "path";
import { SquadMeta } from "./nipeiStore";

const VAULT_PATH = process.env.NIPEI_VAULT_PATH || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

export interface SquadRenameLog {
  previousName: string;
  newName: string;
  changedAt: string;
  changedBy: string;
}

export function syncSquadToVault(squad: SquadMeta, renameLog?: SquadRenameLog): boolean {
  try {
    const squadsDir = path.join(VAULT_PATH, "Squads");
    if (!fs.existsSync(squadsDir)) {
      fs.mkdirSync(squadsDir, { recursive: true });
    }

    const filePath = path.join(squadsDir, `${squad.id}.md`);
    let existingContent = "";
    let existingHistory: SquadRenameLog[] = squad.renameHistory || [];

    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, "utf-8");
    }

    if (renameLog) {
      existingHistory.push(renameLog);
    }

    const yamlFrontmatter = [
      "---",
      `id: "${squad.id}"`,
      `code: "${squad.code || squad.id.toUpperCase()}"`,
      `name: "${squad.name}"`,
      `nucleus: "${squad.nucleus}"`,
      `module: "${squad.module}"`,
      `sort_order: ${squad.sortOrder ?? 1}`,
      `color_hex: "${squad.colorHex || "#22c55e"}"`,
      `veto_power: "${squad.vetoPower || "NONE"}"`,
      `status: "${squad.status || "ACTIVE"}"`,
      `updated_at: "${new Date().toISOString()}"`,
      "rename_history:",
      ...existingHistory.map(
        (h) =>
          `  - previous_name: "${h.previousName}"\n    new_name: "${h.newName}"\n    changed_at: "${h.changedAt}"\n    changed_by: "${h.changedBy}"`
      ),
      "---",
      "",
      `# ${squad.name}`,
      "",
      `**Núcleo**: ${squad.nucleus.toUpperCase()} | **Módulo**: ${squad.module} | **Código**: ${squad.code || squad.id}`,
      "",
      "## Descrição Operacional",
      squad.description || "Sem descrição fornecida.",
      "",
      "## Responsabilidades Principais",
      ...(squad.responsibilities && squad.responsibilities.length > 0
        ? squad.responsibilities.map((r) => `- ${r}`)
        : ["- Pendente de atribuição"]),
      "",
      "## Indicadores de Desempenho (KPIs)",
      ...(squad.kpis && squad.kpis.length > 0 ? squad.kpis.map((k) => `- ${k}`) : ["- Em definição"]),
      "",
      "---",
      `*Sincronizado automaticamente por Nipëi OS Core — ${new Date().toLocaleString()}*`,
    ].join("\n");

    fs.writeFileSync(filePath, yamlFrontmatter, "utf-8");
    console.log(`[VaultSquadSync] Nota sincronizada con éxito: ${filePath}`);
    return true;
  } catch (err) {
    console.error(`[VaultSquadSync] Error sincronizando Squad en Vault:`, err);
    return false;
  }
}
