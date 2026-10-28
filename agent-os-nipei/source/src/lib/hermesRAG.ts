import fs from "fs";
import path from "path";
import crypto from "crypto";
import { defaultVault } from "@/lib/config";
import { extractAIDigest } from "@/lib/vaultDigest";
import { buscarConhecimento } from "@/lib/v2/conhecimento";

export interface VaultCitation {
  path: string;
  filename: string;
  title: string;
  sha256: string;
  relevanceScore: number;
  snippet: string;
}

export interface HermesRAGResult {
  groundedContent: string;
  citations: VaultCitation[];
  groundingScore: number; // 0.0 to 1.0
  isGrounded: boolean;
  missingInformation: boolean;
  suggestedSquad: string;
  answerText: string;
}

import { NIPEI_STRICT_DOMAIN_RULE } from "./nipeiDomainGuard";

/**
 * System Prompt for Hermes 2.0 with strict domain isolation and zero-hallucination policy.
 */
export const HERMES_SYSTEM_PROMPT = `
You are Hermes 2.0, the autonomous AI system orchestrator for Nipëi OS.

${NIPEI_STRICT_DOMAIN_RULE}

- If information is not present in Nipëi Vault, return a Zero-Hallucination response indicating a Knowledge Gap (Vacío de Ingesta).
`;


// People notes still carry the old v1 model (squad_assignments, company_assignments, global_role).
// For the AI they are described from the CURRENT fields only: teams, coordination, role, access, plus
// the note's change history. Equipe names come from Equipes/.
function nomesEquipes(vaultRoot: string): Record<string, string> {
  const dir = path.join(vaultRoot, "Equipes");
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const t = fs.readFileSync(path.join(dir, f), "utf-8");
    return [t.match(/^id:\s*"?([^"\r\n]+)"?/m)?.[1] ?? f.slice(0, -3), t.match(/^nome:\s*"?([^"\r\n]+)"?/m)?.[1] ?? f.slice(0, -3)];
  }));
}

export function resumoPessoa(content: string, equipes: Record<string, string>): string {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const um = (k: string) => fm.match(new RegExp(`^${k}:[ \\t]*"?([^"\\r\\n]*)"?`, "m"))?.[1].trim() ?? "";
  const lista = (k: string) => (fm.match(new RegExp(`^${k}:[ \\t]*\\[([^\\]]*)\\]`, "m"))?.[1] ?? "").split(",").map((x) => x.trim().replace(/^"|"$/g, "")).filter(Boolean);
  const nome = um("name");
  const eqs = lista("equipes").map((e) => equipes[e] ?? e);
  const coord = lista("coordena").map((e) => equipes[e] ?? e);
  const historico = content.match(/## Atividade\r?\n([\s\S]*?)(?=\r?\n## |$)/)?.[1].split(/\r?\n/).filter((l) => l.startsWith("- ")).slice(0, 5).join(" ") ?? "";
  return [
    `Pessoa: ${nome}${um("apelido") ? ` (${um("apelido")})` : ""}${um("native_name") ? ` — ${um("native_name")}` : ""}.`,
    um("tipo_contato") === "externo" ? "Contato externo (não é de nenhuma equipe)." : `Equipes atuais: ${eqs.join(", ") || "nenhuma ainda"}.`,
    coord.length ? `Coordena: ${coord.join(", ")}.` : "",
    um("funcao") ? `Função: ${um("funcao")}.` : "",
    um("area") ? `Área: ${um("area")}.` : "",
    /^acesso_suspenso:\s*true/m.test(fm) ? "Acesso à plataforma suspenso no momento." : "",
    historico ? `Mudanças recentes: ${historico}` : "",
  ].filter(Boolean).join(" ");
}

/**
 * Searches nipei-vault for notes relevant to the user query.
 * Scans Master_Sources, Ingested_Knowledge, Squads, Omi, and Generated_Content.
 */
export function queryVaultGrounding(
  userQuery: string,
  preferredSquad: string = "squad_1_ceo"
): HermesRAGResult {
  const vaultRoot = defaultVault();
  if (!vaultRoot) {
    return {
      groundedContent: "",
      citations: [],
      groundingScore: 0,
      isGrounded: false,
      missingInformation: true,
      suggestedSquad: preferredSquad,
      answerText: "⚠️ No se pudo acceder a nipei-vault para verificar esta consulta.",
    };
  }

  const queryTerms = userQuery
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]/)
    .filter((t) => t.length > 2);

  // Strictly limited to Nipëi Vault directories (Domain Isolation)
  const searchDirs = [
    path.join(vaultRoot, "Master_Sources"),
    path.join(vaultRoot, "Ingested_Knowledge"),
    path.join(vaultRoot, "Squads"),
    path.join(vaultRoot, "Conhecimento_Geral"),
    path.join(vaultRoot, "Clientes"),
    path.join(vaultRoot, "Miembros"),
    path.join(vaultRoot, "Nipei OS"),
    path.join(vaultRoot, "Productivity"),
    path.join(vaultRoot, "Omi"),
    path.join(vaultRoot, "Generated_Content"),
  ];

  const citations: VaultCitation[] = [];
  const equipesNomes = nomesEquipes(vaultRoot);

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const readFilesRecursively = (currentDir: string) => {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          readFilesRecursively(fullPath);
        } else if (item.isFile() && item.name.endsWith(".md")) {
          try {
            const bruto = fs.readFileSync(fullPath, "utf-8");
            const ehPessoa = path.basename(path.dirname(fullPath)) === "Miembros";
            const content = ehPessoa ? resumoPessoa(bruto, equipesNomes) : bruto;
            const lowerContent = content.toLowerCase();

            let matches = 0;
            for (const term of queryTerms) {
              if (lowerContent.includes(term)) matches++;
            }

            if (matches > 0) {
              const relevanceScore = Math.min(1.0, matches / Math.max(1, queryTerms.length));
              const titleMatch = bruto.match(/title:\s*"([^"]+)"/) || bruto.match(/#\s*(.+)/);
              const title = titleMatch ? titleMatch[1].trim() : item.name;
              const sha256 = crypto.createHash("sha256").update(content).digest("hex");
              const relativePath = path.relative(vaultRoot, fullPath).replace(/\\/g, "/");

              // Extract snippet
              const lines = content.split("\n").filter((l) => !l.startsWith("---") && l.trim().length > 0);
              const snippet = ehPessoa ? content.slice(0, 400) : lines.slice(0, 4).join(" ").slice(0, 200);

              citations.push({
                path: relativePath,
                filename: item.name,
                title,
                sha256,
                relevanceScore,
                snippet,
              });
            }
          } catch (e) {
            console.error("Error reading vault file for RAG:", fullPath, e);
          }
        }
      }
    };

    readFilesRecursively(dir);
  }

  // Sort citations by highest relevance score
  citations.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // K3: confirmed facts (Conhecimento) come first and count as fully grounded; old notes fill in after.
  let fatos: VaultCitation[] = [];
  try {
    fatos = buscarConhecimento(userQuery, { origem: "hermes", limite: 5 }).map(({ fato, fonte }) => ({
      path: fato.file.split(path.sep).join("/"), filename: path.basename(fato.file), title: `Fato confirmado${fonte ? ` · ${fonte}` : ""}`,
      sha256: crypto.createHash("sha256").update(fato.texto).digest("hex"), relevanceScore: 1, snippet: fato.texto,
    }));
  } catch (e) {
    console.warn("[hermesRAG] base de conhecimento indisponível:", (e as Error).message);
  }
  const topCitations = [...fatos, ...citations.slice(0, 3)];
  const highestScore = topCitations.length > 0 ? topCitations[0].relevanceScore : 0;

  // Threshold for Zero-Hallucination Policy
  const isGrounded = highestScore >= 0.25;

  if (!isGrounded || topCitations.length === 0) {
    return {
      groundedContent: "",
      citations: [],
      groundingScore: highestScore,
      isGrounded: false,
      missingInformation: true,
      suggestedSquad: preferredSquad,
      answerText: `🛡️ **Respuesta de Hermes 2.0 (Cero Alucinación)**:\n\nEsta información específica no se encuentra actualmente registrada ni certificada en el **Nipëi Vault**.\n\nPara preservar la integridad del conocimiento y evitar alucinaciones, se ha registrado automáticamente un **Vacío de Ingesta** en la lista de auditoría del \`${preferredSquad}\` para curaduría.`,
    };
  }

  // Build Grounded Answer with Citations
  const citationList = topCitations.map((c) => `- 📚 **[${c.title}]** (\`${c.path}\` | SHA256: \`${c.sha256.slice(0, 10)}\`)`).join("\n");
  const mainSnippet = topCitations[0].snippet;

  const answerText = `💬 **Respuesta de Hermes 2.0 (Sustentada en Vault)**:\n\n${mainSnippet}\n\n---\n\n### 🛡️ Citas de Origen del Vault:\n${citationList}`;

  return {
    groundedContent: topCitations.map((c) => c.snippet).join("\n\n"),
    citations: topCitations,
    groundingScore: highestScore,
    isGrounded: true,
    missingInformation: false,
    suggestedSquad: preferredSquad,
    answerText,
  };
}
