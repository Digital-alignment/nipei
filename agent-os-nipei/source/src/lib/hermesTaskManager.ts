import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { queryVaultGrounding, HermesRAGResult } from "@/lib/hermesRAG";

export interface HermesTaskActionResult {
  type: "TASK_CREATED" | "TASK_UPDATED" | "TASK_COMMENTED" | "TASK_LIST" | "CODE_EDIT_BLOCKED" | "VAULT_QUERY";
  success: boolean;
  message: string;
  taskData?: any;
  ragResult?: HermesRAGResult;
}

// ── 1. Security Check: Detect any attempt to alter source code or system files ──
export function isCodeModificationAttempt(prompt: string): boolean {
  const p = prompt.toLowerCase();
  const codePatterns = [
    /\b(modifica|cambia|edita|altera|reescribe|escribe|crea|borra|elimina)\b.*\b(c[oó]digo|c[oó]digo fuente|archivo|componente|layout|page|route|script|\.tsx|\.ts|\.js|\.css|\.json)\b/,
    /\b(modify|edit|change|rewrite|delete|remove)\b.*\b(code|source code|file|component|layout|page|route|script|\.tsx|\.ts|\.js|\.css|\.json)\b/,
    /\b(rm\s+-rf|npm\s+(install|run|build)|git\s+(commit|push|pull|checkout)|bash|sh|powershell|cmd|terminal)\b/,
    /\b(drop\s+table|delete\s+from|update\s+users|exec\s+|sudo\s+)\b/,
  ];
  return codePatterns.some((pattern) => pattern.test(p));
}

// Helper: load project-to-squad mapping
function getProjectToSquadMap(vaultRoot: string): Record<string, string> {
  const map: Record<string, string> = {};
  const squadsDir = path.join(vaultRoot, "Squads");
  if (!fs.existsSync(squadsDir)) return map;

  const files = fs.readdirSync(squadsDir).filter((f) => f.startsWith("squad_") && f.endsWith(".md"));
  for (const file of files) {
    const squadId = file.replace(".md", "");
    try {
      const content = fs.readFileSync(path.join(squadsDir, file), "utf-8");
      const matches = content.match(/\[\[(?:Nipei OS\/Projetos\/|Projetos\/)([^\|\]]+)(?:\|([^\]]+))?\]\]/g) || [];
      for (const m of matches) {
        const raw = m.replace(/\[\[/, "").replace(/\]\]/, "");
        const parts = raw.split("|");
        const projName = parts[parts.length - 1].trim().toLowerCase();
        map[projName] = squadId;
      }
    } catch {
      /* ignore */
    }
  }
  return map;
}

// Helper: find task by keyword or ID in Productivity/Tarefas
function findTaskFile(vaultRoot: string, query: string): { filename: string; filePath: string; content: string } | null {
  const dir = path.join(vaultRoot, "Productivity", "Tarefas");
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const qTerms = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]/)
    .filter((t) => t.length > 2);

  let bestMatch: { filename: string; filePath: string; content: string } | null = null;
  let maxScore = 0;

  for (const filename of files) {
    const filePath = path.join(dir, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const lowerName = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Check exact ID match (e.g. task_001, 001)
    for (const term of qTerms) {
      if (lowerName.includes(term) || lowerContent.includes(`id: "${term}"`) || lowerContent.includes(`id: "${term}`)) {
        return { filename, filePath, content };
      }
    }

    let score = 0;
    for (const term of qTerms) {
      if (lowerName.includes(term)) score += 5;
      if (lowerContent.includes(term)) score += 1;
    }

    if (score > maxScore && score >= 4) {
      maxScore = score;
      bestMatch = { filename, filePath, content };
    }
  }

  return bestMatch;
}

// ── 2. Process Natural Language Task Command ──
export async function processHermesTaskCommand(
  prompt: string,
  userIdentifier: string = "Usuario Liderança",
  targetSquad: string = "squad_1_ceo"
): Promise<HermesTaskActionResult> {
  const vaultRoot = defaultVault();
  if (!vaultRoot) {
    return {
      type: "VAULT_QUERY",
      success: false,
      message: "⚠️ Error de configuración: No se encontró el directorio nipei-vault.",
    };
  }

  const p = prompt.trim();
  const pLower = p
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // A. Check Security Constraint: Code editing attempts are strictly blocked
  if (isCodeModificationAttempt(p)) {
    return {
      type: "CODE_EDIT_BLOCKED",
      success: false,
      message:
        "⛔ **Restricción de Seguridad Operativa**:\nEn esta versión online MVP, Hermes tiene permisos exclusivos para gestionar tareas operativas, coordinar equipos y consultar el Vault. **Por política de seguridad del release, no se permite la modificación de código fuente desde la interfaz web.**",
    };
  }

  // B. Detect "CREATE TASK" Intent
  const isCreateIntent =
    /\b(crear|crea|nueva|nova|criar|adicionar|create|add)\b.*\b(tarea|tarefa|task)\b/.test(pLower) ||
    pLower.startsWith("crear ") ||
    pLower.startsWith("crea ") ||
    pLower.startsWith("nueva tarea") ||
    pLower.startsWith("nova tarefa");

  if (isCreateIntent) {
    // Extract assignee
    let assignee = "Time Liderança";
    if (pLower.includes("rodrigo")) assignee = "Rodrigo Andrade";
    else if (pLower.includes("jordao") || pLower.includes("jordão")) assignee = "Jordão Pekuti";
    else if (pLower.includes("ashuan")) assignee = "Ashuan (Dev Master)";
    else if (pLower.includes("ppr") || pLower.includes("paulo")) assignee = "PPR";
    else if (pLower.includes("ana") || pLower.includes("txini")) assignee = "Ana Castro (Txiní)";
    else if (pLower.includes("rivaldo")) assignee = "Rivaldo";
    else if (pLower.includes("camargo")) assignee = "Camargo";
    else if (pLower.includes("spencer")) assignee = "Spencer";

    // Extract Squad
    let squad = targetSquad;
    if (pLower.includes("squad 1") || pLower.includes("squad 01") || pLower.includes("ceo") || pLower.includes("estrategia")) squad = "squad_1_ceo";
    else if (pLower.includes("squad 2") || pLower.includes("squad 02") || pLower.includes("mutum") || pLower.includes("producao")) squad = "squad_2_mutum";
    else if (pLower.includes("squad 3") || pLower.includes("squad 03") || pLower.includes("retiro") || pLower.includes("hospitalidade")) squad = "squad_3_retiros";
    else if (pLower.includes("squad 4") || pLower.includes("squad 04") || pLower.includes("vendas") || pLower.includes("marketing") || pLower.includes("mkt")) squad = "squad_4_vendas_mkt";
    else if (pLower.includes("squad 5") || pLower.includes("squad 05") || pLower.includes("adm") || pLower.includes("legal") || pLower.includes("financeiro")) squad = "squad_5_adm_legal";
    else if (pLower.includes("squad 6") || pLower.includes("squad 06") || pLower.includes("infra") || pLower.includes("manutencao")) squad = "squad_6_infra";
    else if (pLower.includes("squad 7") || pLower.includes("squad 07") || pLower.includes("instituto")) squad = "squad_7_instituto";

    // Extract Priority
    let priority = "Média";
    if (pLower.includes("urgente")) priority = "Urgente";
    else if (pLower.includes("alta")) priority = "Alta";
    else if (pLower.includes("baixa")) priority = "Baixa";

    // Extract Title: strip lead-in phrases
    let taskTitle = p
      .replace(/^.*?(?:crear tarea|crea una tarea|crea tarea|nueva tarea|nova tarefa|criar tarefa|create task|add task)\s*(?:para\s+[A-Za-zÀ-ÿ0-9_]+)?(?::|-)?\s*/i, "")
      .trim();

    if (!taskTitle || taskTitle.length < 3) {
      taskTitle = `Demanda de ${assignee} (${new Date().toLocaleDateString("pt-BR")})`;
    }

    // Capitalize title
    taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

    const tarefasDir = path.join(vaultRoot, "Productivity", "Tarefas");
    if (!fs.existsSync(tarefasDir)) fs.mkdirSync(tarefasDir, { recursive: true });

    const timestamp = Date.now().toString().slice(-4);
    const cleanSlug = taskTitle.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 35);
    const filename = `task_${timestamp}_${cleanSlug}.md`;
    const filePath = path.join(tarefasDir, filename);
    const taskId = `task_${Date.now().toString().slice(-6)}`;

    const markdown = `---
id: "${taskId}"
title: "${taskTitle}"
type: "tarefa"
status: "A fazer"
priority: "${priority}"
responsible: "${assignee}"
squad: "${squad}"
project: "Demanda Operacional ${squad.toUpperCase()}"
tags:
  - tarefa
  - nipei-os
  - status-a-fazer
created_by: "Hermes 2.0 (Comando Natural)"
updated_at: "${new Date().toISOString()}"
---

<!-- agente: hermes-task-manager -->
# Tarefa: ${taskTitle}

**Status**: \`A fazer\` | **Prioridade**: \`${priority}\` | **Responsável**: \`${assignee}\`

> 📋 **Criada pelo Agente Hermes 2.0 para ${userIdentifier}**

## 👥 Responsáveis & Squad
- **Responsável**: \`${assignee}\`
- **Squad**: \`${squad}\`

## 📌 Descrição & Instruções
- ${taskTitle}
- Registrada via comando de linguagem natural no Nipëi OS.

## 🔗 Trazabilidad
- **Vault File**: \`Productivity/Tarefas/${filename}\`
- **Data**: ${new Date().toLocaleString()}
`;

    fs.writeFileSync(filePath, markdown, "utf-8");

    return {
      type: "TASK_CREATED",
      success: true,
      message: `✅ **Tarea creada exitosamente en el Vault**:\n- **Título**: ${taskTitle}\n- **Responsable**: ${assignee}\n- **Squad**: \`${squad}\`\n- **Prioridad**: ${priority}\n- **Archivo**: \`Productivity/Tarefas/${filename}\``,
      taskData: {
        id: taskId,
        title: taskTitle,
        assignee,
        squad,
        priority,
        columnStatus: "todo",
        status: "pendente",
        vaultPath: `Productivity/Tarefas/${filename}`,
      },
    };
  }

  // C. Detect "UPDATE TASK STATUS" Intent
  const isStatusUpdateIntent =
    /\b(marca|marcar|completar|completa|finalizar|finaliza|bloquear|bloqueia|concluir|concluida|concluido|feita|hecha)\b.*\b(tarea|tarefa|task|camargo|spencer|contrato|cisao|minuta|tubo)\b/.test(pLower) ||
    pLower.includes("marca como") ||
    pLower.includes("marcar como") ||
    pLower.includes("completar tarea") ||
    pLower.includes("finalizar tarefa");

  if (isStatusUpdateIntent) {
    let targetStatus = "Concluído";
    let targetColumn = "done";

    if (pLower.includes("bloque") || pLower.includes("travad")) {
      targetStatus = "Bloqueado";
      targetColumn = "review";
    } else if (pLower.includes("andamento") || pLower.includes("progresso") || pLower.includes("haciendo") || pLower.includes("doing")) {
      targetStatus = "Em andamento";
      targetColumn = "in_progress";
    } else if (pLower.includes("a fazer") || pLower.includes("pendiente") || pLower.includes("todo")) {
      targetStatus = "A fazer";
      targetColumn = "todo";
    }

    // Extract search query by removing command keywords
    const searchQuery = p
      .replace(/^.*?(?:marca como|marcar como|completa la tarea|completar la tarea|marca la tarea|finaliza la tarea|finalizar tarefa|bloquear tarea|marca como concluida|marca como hecha|marca como bloqueada)\s*(?:de|la|el|para)?\s*/i, "")
      .trim();

    const matchedTask = findTaskFile(vaultRoot, searchQuery || p);

    if (matchedTask) {
      let content = matchedTask.content;

      // Update status in frontmatter
      if (content.includes("status:")) {
        content = content.replace(/status:\s*"?([^"\n\r]+)"?/, `status: "${targetStatus}"`);
      } else {
        content = `---\nstatus: "${targetStatus}"\n---\n` + content;
      }

      // Append log entry
      content += `\n- ⚡ **Actualizado por Hermes 2.0**: Estado cambiado a \`${targetStatus}\` a solicitud de **${userIdentifier}** (${new Date().toLocaleString()})\n`;

      fs.writeFileSync(matchedTask.filePath, content, "utf-8");

      // Extract title from content
      const titleMatch = content.match(/title:\s*"?([^"\n\r]+)"?/);
      const title = titleMatch ? titleMatch[1].trim() : matchedTask.filename.replace(".md", "");

      return {
        type: "TASK_UPDATED",
        success: true,
        message: `✅ **Tarea actualizada en el Vault**:\n- **Título**: ${title}\n- **Nuevo Estado**: \`${targetStatus}\` (Columna Kanban: *${targetColumn}*)\n- **Archivo**: \`Productivity/Tarefas/${matchedTask.filename}\``,
        taskData: {
          filename: matchedTask.filename,
          title,
          status: targetStatus,
          columnStatus: targetColumn,
          vaultPath: `Productivity/Tarefas/${matchedTask.filename}`,
        },
      };
    } else {
      return {
        type: "TASK_UPDATED",
        success: false,
        message: `⚠️ No se encontró ninguna tarea en el Vault que coincida con "${searchQuery}". Puedes consultar la lista completa de tareas en **/kanban** o especificar el nombre exacto.`,
      };
    }
  }

  // D. Detect "ADD COMMENT / NOTE" Intent
  const isCommentIntent =
    pLower.includes("agrega comentario") ||
    pLower.includes("anota en la tarea") ||
    pLower.includes("comenta en la tarea") ||
    pLower.includes("adicionar comentario");

  if (isCommentIntent) {
    const commentMatch = p.match(/(?:comentario|nota|anota)(?:\s+a\s+la\s+tarea|\s+en\s+la\s+tarea)?\s*[:"-]?\s*(.+)/i);
    const commentText = commentMatch ? commentMatch[1].trim() : p;

    const matchedTask = findTaskFile(vaultRoot, p);

    if (matchedTask) {
      let content = matchedTask.content;
      content += `\n\n### 💬 Nota de Seguimiento — ${userIdentifier} (${new Date().toLocaleString()})\n> "${commentText}"\n`;
      fs.writeFileSync(matchedTask.filePath, content, "utf-8");

      const titleMatch = content.match(/title:\s*"?([^"\n\r]+)"?/);
      const title = titleMatch ? titleMatch[1].trim() : matchedTask.filename.replace(".md", "");

      return {
        type: "TASK_COMMENTED",
        success: true,
        message: `✅ **Nota agregada a la tarea**: **${title}**\n> "${commentText}"`,
        taskData: {
          filename: matchedTask.filename,
          title,
          vaultPath: `Productivity/Tarefas/${matchedTask.filename}`,
        },
      };
    }
  }

  // E. Fallback: Query Nipëi Vault via RAG Zero-Hallucination
  const ragResult = queryVaultGrounding(p, targetSquad);
  return {
    type: "VAULT_QUERY",
    success: true,
    message: ragResult.answerText,
    ragResult,
  };
}
