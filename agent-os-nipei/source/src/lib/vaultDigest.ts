export interface AIDigestResult {
  digestMarkdown: string;
  keyTakeaways: string[];
  entities: {
    people: string[];
    money: string[];
    tools: string[];
  };
  detectedTasks: string[];
}

export function extractAIDigest(rawText: string, title: string): AIDigestResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const textLower = rawText.toLowerCase();

  // 1. Key Takeaways Extraction
  const keyTakeaways: string[] = [];
  lines.forEach((line) => {
    if (
      (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("1.") || line.includes("importante") || line.includes("clave")) &&
      line.length > 15 &&
      keyTakeaways.length < 3
    ) {
      keyTakeaways.push(line.replace(/^[-*1-9.]+\s*/, ""));
    }
  });

  if (keyTakeaways.length === 0) {
    keyTakeaways.push(`Información ingesta relevante sobre ${title || "el documento"}.`);
    if (lines.length > 0) keyTakeaways.push(lines[0].slice(0, 120));
  }

  // 2. Entity Extraction
  const people: string[] = [];
  const money: string[] = [];
  const tools: string[] = [];
  const detectedTasks: string[] = [];

  // People / Roles heuristic
  const knownRoles = ["jefe", "ceo", "developer", "desarrollador", "hermes", "prime", "openclaw", "antigravity", "diseñador", "redactor"];
  knownRoles.forEach((role) => {
    if (textLower.includes(role)) {
      people.push(role.toUpperCase());
    }
  });

  // Money heuristic
  const moneyMatches = rawText.match(/(\$|R\$|USD|€|EUR|pesos|dólares|presupuesto|costo)\s*\d+([.,]\d+)?/gi);
  if (moneyMatches) {
    moneyMatches.forEach((m) => {
      if (!money.includes(m)) money.push(m);
    });
  }

  // Tech Tools heuristic
  const knownTools = ["Next.js", "Obsidian", "n8n", "WhatsApp", "Hostinger", "GitHub", "VPS", "Supabase", "React", "PostgreSQL", "Tailwind", "NotebookLM", "e-commerce"];
  knownTools.forEach((t) => {
    if (textLower.includes(t.toLowerCase())) {
      tools.push(t);
    }
  });

  // Tasks heuristic
  lines.forEach((line) => {
    const lLower = line.toLowerCase();
    if (
      (lLower.includes("hacer") ||
        lLower.includes("crear") ||
        lLower.includes("configurar") ||
        lLower.includes("revisar") ||
        lLower.includes("implementar") ||
        lLower.includes("publicar") ||
        lLower.includes("estudiar")) &&
      line.length > 10 &&
      detectedTasks.length < 5
    ) {
      detectedTasks.push(line.replace(/^[-*1-9.]+\s*/, ""));
    }
  });

  const digestMarkdown = `## ⚡ Resumen Ejecutivo (AI Knowledge Digest)
- **3 Conclusiones Principales**:
${keyTakeaways.map((k) => `  - 🎯 ${k}`).join("\n")}

- **Entidades Detectadas**:
  - 👥 **Roles/Personas**: ${people.length > 0 ? people.join(", ") : "Sin personas explícitas"}
  - 💰 **Valores Monetarios**: ${money.length > 0 ? money.join(", ") : "Sin presupuestos detectados"}
  - 🛠️ **Tecnologías/Herramientas**: ${tools.length > 0 ? tools.join(", ") : "Nipëi OS Stack"}

${
  detectedTasks.length > 0
    ? `- **📌 Acciones & Tareas Identificadas para Kanban**:\n${detectedTasks.map((t) => `  - [ ] ${t}`).join("\n")}`
    : ""
}
`;

  return {
    digestMarkdown,
    keyTakeaways,
    entities: { people, money, tools },
    detectedTasks,
  };
}
