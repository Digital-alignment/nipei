import { NextResponse } from "next/server";
import fs from "fs/promises";
import existsSync from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { colors, typography, toneOfVoice } = body;

    if (!Array.isArray(colors) || !Array.isArray(typography) || !Array.isArray(toneOfVoice)) {
      return NextResponse.json(
        { error: "Invalid payload: colors, typography, and toneOfVoice arrays are required." },
        { status: 400 }
      );
    }

    // Resolve paths safely
    const cwd = process.cwd();

    // 1. brandTokens.ts
    const brandTokensPath = path.resolve(cwd, "src/lib/brandTokens.ts");

    // 2. Vault Path
    const possibleVaultPaths = [
      path.resolve(cwd, "../../../nipei-vault/Master_Sources/Corporate_Squads/Nipei_Brand_System_Manual.md"),
      "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault\\Master_Sources\\Corporate_Squads\\Nipei_Brand_System_Manual.md",
    ];
    const vaultPath = possibleVaultPaths.find((p) => existsSync.existsSync(p)) || possibleVaultPaths[0];

    // 3. Agent Skill Path
    const possibleSkillPaths = [
      path.resolve(cwd, "../../.agents/skills/nipei-brand/SKILL.md"),
      "C:\\Users\\ondig\\Code\\Nipei\\nipei-control\\.agents\\skills\\nipei-brand\\SKILL.md",
    ];
    const skillPath = possibleSkillPaths.find((p) => existsSync.existsSync(p)) || possibleSkillPaths[0];

    // --- REGENERATE brandTokens.ts CONTENT ---
    const brandTokensContent = `/**
 * NIPËI OS BRAND SYSTEM TOKENS & DESIGN SYSTEM RULES
 * Strictly Solid Colors (ZERO GRADIENTS POLICY)
 * Auto-generated and synced via Nipëi Brand Studio (/brand)
 */

export interface ColorToken {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
  category: "brand" | "squad" | "neutral" | "semantic";
}

export interface TypographyToken {
  role: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  letterSpacing: string;
  usage: string;
}

export const NIPEI_BRAND_RULES = {
  zeroGradients: true, // STRICT: No linear/radial gradients anywhere in UI
  solidPanelsOnly: true, // Solid #050805, #0c140c, #142614
  sharpCrispBorders: "1px solid #182818",
  noEmojiInHeaders: true, // Use Lucide React icons instead of emojis in corporate headers
  groundingRequired: true, // 100% Zero-Hallucination policy, grounded in nipei-vault
};

export const COLOR_TOKENS: ColorToken[] = ${JSON.stringify(colors, null, 2)};

export const TYPOGRAPHY_TOKENS: TypographyToken[] = ${JSON.stringify(typography, null, 2)};

export const TONE_OF_VOICE_RULES = ${JSON.stringify(toneOfVoice, null, 2)};
`;

    await fs.writeFile(brandTokensPath, brandTokensContent, "utf-8");

    // --- REGENERATE VAULT MARKDOWN CONTENT ---
    const colorRowsMarkdown = colors
      .map((c: any) => `| **${c.name}** | \`${c.hex}\` | \`(${c.rgb})\` | ${c.usage} | \`${c.category}\` |`)
      .join("\n");

    const typoRowsMarkdown = typography
      .map((t: any) => `| **${t.role}** | \`${t.fontFamily}\` | \`${t.fontSize}\` | \`${t.fontWeight}\` | ${t.usage} |`)
      .join("\n");

    const toneListMarkdown = toneOfVoice.map((rule: string) => `- ${rule}`).join("\n");

    const vaultContent = `<!-- agente: antigravity -->
# Nipëi OS — System Manual & Visual Identity Guidelines (Brand System)

> **Documento Oficial de Marca & Tokens de Diseño de Nipëi OS**
> *Última actualización sincronizada desde Nipëi Brand Studio: ${new Date().toISOString()}*

---

## 📌 1. Filosofía & Armonía Visual

Nipëi OS une la sabiduría botánica ancestral con la tecnología de vanguardia de agentes autónomos.

### 🚫 Regla Inquebrantable de UI: CERO GRADIENTES (\`zeroGradients: true\`)
- **Prohibición Absoluta**: Queda estrictamente prohibido el uso de gradientes de color (\`bg-gradient-to-*\`, \`linear-gradient\`, \`radial-gradient\`) en la interfaz de Nipëi OS.
- **Paleta Plana Sólida**: Todos los fondos de paneles, tarjetas, modales y botones deben utilizar colores planos sólidos (\`#050805\` Obsidiana Base, \`#0c140c\` Panel Elevado, \`#22c55e\` Esmeralda Nipëi).
- **Iconografía Oficial**: Se prohíbe el uso de emojis informales en encabezados corporativos. Se deben utilizar exclusivamente íconos oficiales de \`lucide-react\`.

---

## 🎨 2. Paleta de Colores Oficiales (Tokens Planos)

| Token | Código HEX | RGB | Uso en Interfaz | Categoría |
|---|---|---|---|---|
${colorRowsMarkdown}

---

## 🔤 3. Jerarquía Tipográfica

| Rol | Tipografía | Tamaño | Peso | Uso Principal |
|---|---|---|---|---|
${typoRowsMarkdown}

---

## 🗣️ 4. Tono de Voz & Reglas de Comunicación

${toneListMarkdown}

---

## ⚡ 5. Integración con Agentes (Hermes, Venu, Antigravity)

Los agentes de IA deben validar todo código generado contra la Skill \`.agents/skills/nipei-brand/SKILL.md\`.
`;

    await fs.writeFile(vaultPath, vaultContent, "utf-8");

    // --- REGENERATE AGENT SKILL MARKDOWN CONTENT ---
    const skillContent = `---
name: nipei-brand
description: Strict Nipëi OS brand rules, zero-gradients design system, solid obsidian color palette, typography hierarchy, tone of voice, and visual UI guardrails.
---

# Nipëi Brand System & Design Manual Agent Skill

You are **Nipëi Brand Guardian**, an expert brand and UI system auditor for **Nipëi OS**. Your job is to strictly enforce Nipëi OS visual design standards, color tokens, typography rules, tone of voice guidelines, and UI component architecture across all code generation, component design, and interface modifications.

---

## 🧠 Your Identity & Memory
- **Role**: Nipëi OS Brand System Architect & Visual Quality Auditor
- **Core Philosophy**: Bio-Technological Bio-Dark Aesthetics (Obsidian & Emerald) — bridging Yawanawá ethnobotanical wisdom with cutting-edge multi-agent OS technology.
- **Strict Policy**: ZERO GRADIENTS in UI components, 100% flat solid colors, high-contrast dark theme, crisp typography hierarchy, official Lucide icons, and 100% Vault-grounded tone.

---

## 🚨 Critical Rules You Must Always Enforce

### 1. 🚫 STRICT ZERO-GRADIENTS POLICY (\`zeroGradients: true\`)
- **NEVER** use Tailwind gradient classes (\`bg-gradient-to-r\`, \`bg-gradient-to-tr\`, \`from-*\`, \`via-*\`, \`to-*\`) in any Nipëi OS component or background.
- **NEVER** write CSS linear, radial, or conic gradients.
- **ALWAYS** use solid flat panel colors (\`bg-[#050805]\`, \`bg-[#0c140c]\`, \`bg-[#121f12]\`).

### 2. 🎨 Solid Color Palette Tokens
${colors.map((c: any) => `- **${c.name}**: \`${c.hex}\` (RGB: ${c.rgb}) — ${c.usage}`).join("\n")}

### 3. 🔤 Typography & Font Hierarchy
${typography.map((t: any) => `- **${t.role}**: \`${t.fontFamily}\` (\`${t.fontSize}\`, \`${t.fontWeight}\`) — ${t.usage}`).join("\n")}

### 4. 🖼️ Iconography & Visual Elements
- **Icons**: Use exclusively official **Lucide React Icons** (\`lucide-react\`).
- **No Emojis in Corporate Headers**: Informal emojis are prohibited in system headers, navigation bars, or official squad banners.
- **Corner Radii**: Standardized rounded corners using \`rounded-2xl\` for cards, \`rounded-3xl\` for main outer section panels, and \`rounded-xl\` for inner controls.

### 5. 🎙️ Tone of Voice & Conversational Style
${toneOfVoice.map((rule: string) => `- ${rule}`).join("\n")}

---

## 📋 Code Verification & Audit Checklist

When building or reviewing any Nipëi OS UI component:

\`\`\`tsx
// ✅ APPROVED NIPËI OS COMPONENT PATTERN (Solid flat colors, Outfit + Manrope + Lucide icons)
import React from 'react';
import { ShieldCheck, Terminal, Cpu } from 'lucide-react';

export const NipeiStatusCard: React.FC = () => {
  return (
    <div className="bg-[#0c140c] border border-[#182818] rounded-2xl p-6 hover:border-[#22c55e]/40 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#121f12] text-[#22c55e] rounded-xl border border-[#182818]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-white tracking-wide">
              Nipëi Core Engine
            </h3>
            <p className="font-sans text-xs text-emerald-400/70">
              Autonomous Squad Orchestrator
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-[#121f12] text-[#22c55e] border border-[#22c55e]/30 rounded-full font-mono text-xs font-semibold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> ONLINE
        </span>
      </div>
      <p className="font-sans text-sm text-gray-300 leading-relaxed mb-4">
        Operating in full alignment with Nipëi Vault master sources. All design tokens enforce zero-gradient solid panel backgrounds.
      </p>
      <div className="font-mono text-xs text-gray-400 bg-[#050805] p-3 rounded-xl border border-[#182818]">
        <code>Status: 0 errors | Synchronized via Nipëi Brand Studio</code>
      </div>
    </div>
  );
};
\`\`\`
`;

    await fs.writeFile(skillPath, skillContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "Brand System Tokens, Obsidian Vault, and Agent Skill updated successfully!",
      updatedPaths: [brandTokensPath, vaultPath, skillPath],
    });
  } catch (error: any) {
    console.error("Error saving brand tokens:", error);
    return NextResponse.json(
      { error: "Failed to save brand tokens: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
