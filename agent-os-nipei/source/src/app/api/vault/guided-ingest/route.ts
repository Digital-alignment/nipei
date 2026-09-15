import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { defaultVault } from "@/lib/config";
import { extractAIDigest } from "@/lib/vaultDigest";

export const dynamic = "force-dynamic";

interface GuidedIngestPayload {
  category: string;
  categoryLabel: string;
  title: string;
  author?: string;
  description?: string;
  squad: string;
  sourceType: string;
  tags?: string[];
  ethicalCertifications: {
    originAudited: boolean;
    zeroHallucinationCompliant: boolean;
    aiCommunityApproved: boolean;
    commercialVetoChecked: boolean;
  };
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GuidedIngestPayload = await req.json();
    const {
      category,
      categoryLabel,
      title,
      author = "Líderes de Núcleo / Curador",
      description = "",
      squad = "squad_1_ceo",
      sourceType = "Fuente Maestra",
      tags = [],
      ethicalCertifications,
      content,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "El título de la fuente es obligatorio." },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "El contenido de la fuente no puede estar vacío." },
        { status: 400 }
      );
    }

    const vaultRoot = defaultVault();
    if (!vaultRoot) {
      return NextResponse.json(
        { success: false, error: "No se encontró la ruta del Vault nipei-vault." },
        { status: 500 }
      );
    }

    // Ensure category subfolder exists
    const targetDir = path.join(vaultRoot, category || "Master_Sources/General");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generate clean filename
    const datePrefix = new Date().toISOString().slice(0, 10);
    const cleanTitle = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);

    const filename = `${datePrefix}_master_${cleanTitle}.md`;
    const fullPath = path.join(targetDir, filename);

    // Compute SHA256 checksum
    const sha256 = crypto.createHash("sha256").update(content).digest("hex");

    // Extract AI Digest
    const aiDigest = extractAIDigest(content, title);

    // Build Frontmatter YAML
    const createdIso = new Date().toISOString();
    const tagList = Array.from(
      new Set([
        "fuente_maestra",
        "ingesta_guiada",
        squad,
        ...tags.map((t) => t.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")),
      ])
    );

    const markdownDoc = `---
title: "${title.replace(/"/g, '\\"')}"
type: "master_knowledge_source"
category: "${categoryLabel.replace(/"/g, '\\"')}"
author: "${author.replace(/"/g, '\\"')}"
squad_owner: "${squad}"
source_type: "${sourceType}"
sha256: "${sha256}"
created: "${createdIso}"
tags: [${tagList.map((t) => `"${t}"`).join(", ")}]
certifications:
  origin_audited: ${Boolean(ethicalCertifications?.originAudited)}
  zero_hallucination_compliant: ${Boolean(ethicalCertifications?.zeroHallucinationCompliant)}
  ai_community_approved: ${Boolean(ethicalCertifications?.aiCommunityApproved)}
  commercial_veto_checked: ${Boolean(ethicalCertifications?.commercialVetoChecked)}
---

<!-- agente: guided-ingestion-wizard -->

# 👑 Fuente Maestra: ${title}

- **Categoría**: ${categoryLabel}
- **Autor / Origen**: ${author}
- **Squad Responsable**: \`${squad}\`
- **Fecha de Carga**: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
- **SHA256 Checksum**: \`${sha256.slice(0, 16)}...\`

---

## 📝 Descripción & Resumen Ejecutivo
${description || "Documento maestro verificado de alta relevancia para Nipëi OS."}

---

## ⚡ Conclusiones Clave (AI Digest Automático)
${aiDigest.keyTakeaways.map((k) => `- 💡 ${k}`).join("\n")}

### 🏛️ Entidades & Referencias Extraídas
- **Personas / Roles**: ${aiDigest.entities.people.length > 0 ? aiDigest.entities.people.join(", ") : "N/A"}
- **Valores / Cifras**: ${aiDigest.entities.money.length > 0 ? aiDigest.entities.money.join(", ") : "N/A"}
- **Sistemas / Tecnologías**: ${aiDigest.entities.tools.length > 0 ? aiDigest.entities.tools.join(", ") : "N/A"}

---

## 🛡️ Certificación de Origen Ético & Gobernanza
- ${ethicalCertifications?.originAudited ? "🟢" : "🔴"} **Origen Auditado**: Fuente autenticada por líderes del Núcleo.
- ${ethicalCertifications?.zeroHallucinationCompliant ? "🟢" : "🔴"} **Cero Alucinación**: Texto de referencia estricto para RAG & Agentes IA.
- ${ethicalCertifications?.aiCommunityApproved ? "🟢" : "🔴"} **Aprobación de Consulta**: Habilitado para consulta de todos los Squads.
- ${ethicalCertifications?.commercialVetoChecked ? "🟢" : "🔴"} **Verificación de Veto Comercial**: Respeto al valor sagrado / corporativo.

---

## 📖 Contenido de la Fuente Maestra

${content}
`;

    fs.writeFileSync(fullPath, markdownDoc, "utf-8");

    const relativeVaultPath = path.relative(vaultRoot, fullPath).replace(/\\/g, "/");

    return NextResponse.json({
      success: true,
      message: "Fuente Maestra ingestada y certificada exitosamente en Nipëi Vault.",
      filename,
      vaultPath: relativeVaultPath,
      fullPath,
      sha256,
      aiDigest,
    });
  } catch (err: any) {
    console.error("Error in guided ingestion route:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Falló la ingestión guiada." },
      { status: 500 }
    );
  }
}
