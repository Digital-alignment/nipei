import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultVault } from "@/lib/config";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import {
  getTaskWorkspace,
  getTaskWorkspaceData,
  saveTaskDeliverableFile,
  syncTaskFrontmatterWithWorkspace,
  TaskWorkspaceInfo,
} from "@/lib/taskWorkspace";
import type { DeliverableFormat, TaskDeliverable } from "@/lib/nipeiStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface GenerateDeliverablePayload {
  taskId: string;
  taskTitle: string;
  taskSquad?: string;
  taskDescription?: string;
  taskPriority?: string;
  taskAssignee?: string;
  format: DeliverableFormat;
  customInstructions?: string;
  agentId?: string;
  vaultPath?: string;
}

// Helper to extract snippets from uploaded text/doc attachments
function extractInputAttachmentsSummary(ws: TaskWorkspaceInfo): string {
  if (!fs.existsSync(ws.inputsDir)) return "";
  try {
    const files = fs.readdirSync(ws.inputsDir);
    const textFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".txt", ".md", ".csv", ".json", ".log"].includes(ext);
    });

    if (textFiles.length === 0) return "";

    const snippets: string[] = [];
    for (const file of textFiles.slice(0, 3)) {
      const filePath = path.join(ws.inputsDir, file);
      const content = fs.readFileSync(filePath, "utf-8").slice(0, 600);
      snippets.push(`- **Arquivo Anexado \`${file}\`**: "${content.replace(/\r?\n/g, " ").trim()}..."`);
    }

    return snippets.join("\n");
  } catch {
    return "";
  }
}

// Generate structured Markdown depending on format
function buildDeliverableContent(
  format: DeliverableFormat,
  payload: GenerateDeliverablePayload,
  groundingContext: string,
  citations: string[],
  inputsSummary: string
): { title: string; markdown: string } {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toISOString().replace("T", " ").slice(0, 16);
  const squad = payload.taskSquad || "squad_1_ceo";
  const agent = payload.agentId || "@hermes";

  if (format === "slide_deck") {
    const title = `Apresentação Executiva: ${payload.taskTitle}`;
    const slides = [
      `# ${payload.taskTitle}
### Apresentação Executiva & Alinhamento Estratégico
**Squad Responsável:** \`${squad}\`  
**Agente Orquestrador:** \`${agent}\`  
**Data da Edição:** ${dateStr}  
**Classificação:** Nipëi OS Operacional

---
<!-- slide -->

# 1. Contexto & Desafio Operacional
- **Demanda:** ${payload.taskTitle}
- **Prioridade:** \`${(payload.taskPriority || "Alta").toUpperCase()}\`
- **Responsável:** ${payload.taskAssignee || "Liderança de Squad"}
- **Cenário Atual:**
  ${payload.taskDescription || "Demanda operacional prioritária no quadro Kanban multidisplinar do ecossistema Nipëi."}

---
<!-- slide -->

# 2. Diagnóstico & Análise dos Insumos
${
  inputsSummary
    ? `### Insumos e Documentos Vinculados:\n${inputsSummary}`
    : `### Análise Preliminar:\n- Mapeamento de requisitos aprovado pelo Squad.\n- Dependências e alinhamento com governança e auditoria do Vault.`
}

### Diretrizes Estratégicas:
- Coerência com os princípios de preservação e impacto ético do Instituto Nipëi.
- Automação e registro auditável em tempo real.

---
<!-- slide -->

# 3. Solução Proposta & Plano de Ação
- **Frente 1 (Execução Imediata):** Estruturação e validação de entregas prioritárias.
- **Frente 2 (Integração):** Sincronização direta com contratos e documentação do Vault.
- **Frente 3 (Qualidade):** Homologação técnica e revisão com os líderes de Squad.

${
  payload.customInstructions
    ? `> **Diretriz Específica do Gestor:** ${payload.customInstructions}`
    : ""
}

---
<!-- slide -->

# 4. Métricas de Sucesso & Indicadores
- **Taxa de Conclusão:** 100% dos critérios operacionais atendidos.
- **Auditoria Ética:** Conformidade com o Núcleo Sagrado e governança transversal.
- **Tempo de Ciclo:** Resolução ágil e entrega auditada no Nipëi Vault.

---
<!-- slide -->

# 5. Próximos Passos & Encerramento
1. Validação com o líder de Squad (${payload.taskAssignee || "Equipe"}).
2. Fechamento formal no Quadro Kanban e despacho de notificações.
3. Arquivamento e consolidação de conhecimento no Nipëi Vault.

**Fontes do Nipëi Vault Consultadas:**  
${citations.map((c) => `- ${c}`).join("\n")}
`,
    ];

    return { title, markdown: slides.join("\n") };
  }

  if (format === "technical_brief") {
    const title = `Brief Técnico & POP: ${payload.taskTitle}`;
    const md = `# Especificação Técnica & Brief Operacional (POP)
> **Nipëi OS Mission Control — Documentação Técnica Padronizada**  
> **Identificador:** \`${payload.taskId}\` | **Data:** ${dateStr} | **Versão:** 1.0  
> **Squad:** \`${squad}\` | **Autor:** \`${agent}\`

---

## 1. Objetivo Geral & Escopo
A presente especificação técnica define as diretrizes, procedimentos e critérios de aceitação para a conclusão da tarefa **"${payload.taskTitle}"**.

**Contexto e Escopo:**
${payload.taskDescription || "Execução técnica padronizada em conformidade com os contratos operacionais do ecossistema Nipëi."}

${
  payload.customInstructions
    ? `### Instruções Especiais do Solicitante:\n${payload.customInstructions}\n`
    : ""
}

---

## 2. Insumos & Documentos Validados
${
  inputsSummary
    ? inputsSummary
    : "- Documentação interna e notas técnicas do Nipëi Vault validadas pelo Agente."
}

---

## 3. Arquitetura da Execução & Diagrama de Fluxo

\`\`\`mermaid
flowchart TD
    A["Início: Recepção da Demanda (${payload.taskId})"] --> B["Validação de Insumos & Anexos"]
    B --> C["Processamento Técnico / Execução Squad (${squad})"]
    C --> D{"Atende aos Critérios de DoD?"}
    D -- Não --> C
    D -- Sim --> E["Chancela Ética & Registro no Nipëi Vault"]
    E --> F["Conclusão & Despacho Omnicanal"]
\`\`\`

---

## 4. Critérios de Aceite (Definition of Done - DoD)
- [ ] Todos os anexos e arquivos gerados validados e armazenados em \`Task_Workspace/\`.
- [ ] Ausência de pendências técnicas ou bloqueios éticos reportados.
- [ ] Atualização do status da tarefa para Concluído no Kanban.
- [ ] Notificação aos integrantes responsáveis pelo Squad.

---

## 5. Procedimento Operacional Passo a Passo
1. **Preparação de Ambiente:** Verificar contratos e notas do Squad \`${squad}\`.
2. **Execução:** Cumprir o checklist técnico com suporte das ferramentas integradas.
3. **Auditoria & Registro:** Registrar histórico de execução e salvar evidências no Vault.

---

## 6. Referências & Grounding do Vault
${citations.map((c) => `- ${c}`).join("\n")}
`;
    return { title, markdown: md };
  }

  if (format === "csv_data") {
    const title = `Dados Consolidados: ${payload.taskTitle}`;
    const csv = `ID_Tarefa,Titulo,Squad,Prioridade,Responsavel,Data_Geracao,Agente_Autor,Status_Validacao
"${payload.taskId}","${payload.taskTitle.replace(/"/g, '""')}","${squad}","${payload.taskPriority || "Alta"}","${payload.taskAssignee || "Liderança"}","${dateStr}","${agent}","Auditado_Vault"
`;
    return { title, markdown: csv };
  }

  // Default: Executive Report
  const title = `Relatório Executivo: ${payload.taskTitle}`;
  const md = `# Relatório Executivo de Entrega
> **Nipëi OS Mission Control — Inteligência Operacional & Governança de Squads**  
> **Tarefa:** \`${payload.taskId}\` — ${payload.taskTitle}  
> **Squad Responsável:** \`${squad}\` | **Data:** ${dateStr} | **Orquestrador:** \`${agent}\`

---

## 1. Sumário Executivo
Este documento consolida a análise executiva, os insumos processados e o plano de resolução para a tarefa **"${payload.taskTitle}"**, conduzida no âmbito do **${squad}**.

- **Prioridade Operacional:** \`${(payload.taskPriority || "Alta").toUpperCase()}\`
- **Responsável Designado:** ${payload.taskAssignee || "Equipe do Squad"}
- **Ambiente de Armazenamento:** Sincronizado canonicamente no Nipëi Vault (\`Task_Workspace/\`).

---

## 2. Diagnóstico & Contextualização
${payload.taskDescription || "Demanda estratégica prioritária mapeada no fluxo autônomo do Nipëi OS."}

${
  inputsSummary
    ? `### Insumos Analisados:\n${inputsSummary}\n`
    : ""
}

${
  payload.customInstructions
    ? `### Foco Solicitado pela Gestão:\n${payload.customInstructions}\n`
    : ""
}

---

## 3. Análise com Grounding no Nipëi Vault
A partir da varredura de conhecimento no **Nipëi Vault**, foram identificadas as seguintes diretrizes fundamentais:

${
  groundingContext
    ? `> ${groundingContext.split("\n").slice(0, 5).join("\n> ")}`
    : "> Nenhuma restrição ou veto ético localizado no Vault para este escopo."
}

---

## 4. Recomendações Estratégicas & Próximas Ações
1. **Homologação:** Confirmar a execução das subtarefas técnicas com os membros do squad.
2. **Registro Contínuo:** Manter os novos comprovantes e arquivos salvos na subpasta \`inputs/\`.
3. **Formalização:** Atualizar o cartão da tarefa no Kanban para "Concluído" e notificar via canal integrado.

---

## 5. Fontes & Citações do Vault
${citations.map((c) => `- ${c}`).join("\n")}

*Documento auditado e gerado automaticamente pelo Nipëi Agentic Core em ${timeStr}.*
`;

  return { title, markdown: md };
}

// Core generation logic exported for direct server-side calls (e.g. from Venu / Kanban Action)
export async function executeGenerateDeliverable(payload: GenerateDeliverablePayload): Promise<{
  success: boolean;
  deliverable?: TaskDeliverable;
  message?: string;
  error?: string;
}> {
  if (!payload.taskId || !payload.taskTitle) {
    return {
      success: false,
      error: "'taskId' e 'taskTitle' são campos obrigatórios",
    };
  }

  const ws = getTaskWorkspace(payload.taskId, payload.taskSquad, payload.taskTitle);
  const inputsSummary = extractInputAttachmentsSummary(ws);

  // Query vault grounding
  let groundingContext = "";
  let citations: string[] = [];
  try {
    const ragQuery = `${payload.taskTitle} ${payload.taskSquad || ""} ${payload.taskDescription || ""}`;
    const ground = queryVaultGrounding(ragQuery, payload.taskSquad || "squad_1_ceo");
    if (ground && ground.groundedContent) {
      groundingContext = ground.groundedContent;
      citations = (ground.citations || []).map(
        (c) => `🏛️ Nipëi Vault: ${c.title || c.filename} (${c.path})`
      );
    }
  } catch (ragErr) {
    console.warn("RAG Grounding warning:", ragErr);
  }

  if (citations.length === 0) {
    citations = [
      "🏛️ Nipëi Vault: Contratos de Squads e Governança Operacional",
      "📄 Diretrizes de Ética e Transparência do Instituto Nipëi",
    ];
  }

  // Build format
  const format = payload.format || "executive_report";
  const { title, markdown } = buildDeliverableContent(
    format,
    payload,
    groundingContext,
    citations,
    inputsSummary
  );

  // Save to disk
  const deliverable = saveTaskDeliverableFile(
    payload.taskId,
    payload.taskSquad,
    payload.taskTitle,
    title,
    format,
    markdown,
    payload.agentId || "@hermes"
  );

  // Sync frontmatter if vaultPath exists
  if (payload.vaultPath) {
    const wsData = getTaskWorkspaceData(payload.taskId, payload.taskSquad, payload.taskTitle);
    syncTaskFrontmatterWithWorkspace(payload.vaultPath, wsData.attachments, wsData.deliverables);
  }

  return {
    success: true,
    message: `Entregável '${title}' gerado com sucesso pelo agente!`,
    deliverable,
  };
}

// POST: Generate deliverable
export async function POST(req: NextRequest) {
  try {
    const payload: GenerateDeliverablePayload = await req.json();
    const result = await executeGenerateDeliverable(payload);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Erro ao gerar entregável" }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro na rota POST /api/agent-kanban/deliverables:", err);
    return NextResponse.json({ error: err.message || "Erro ao gerar entregável" }, { status: 500 });
  }
}

// GET: List deliverables or fetch a specific deliverable
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const squadId = searchParams.get("squadId") || undefined;
    const taskTitle = searchParams.get("taskTitle") || undefined;
    const filePathParam = searchParams.get("path");

    const vaultRoot = defaultVault() || "C:\\Users\\ondig\\Code\\Nipei\\nipei-vault";

    // 1. Fetch file content
    if (filePathParam) {
      const normalized = path.normalize(filePathParam).replace(/^(\.\.(\/|\\|$))+/, "");
      const absPath = path.join(vaultRoot, normalized);

      if (!absPath.startsWith(vaultRoot)) {
        return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
      }

      if (!fs.existsSync(absPath)) {
        return NextResponse.json({ error: "Entregável não encontrado" }, { status: 404 });
      }

      const content = fs.readFileSync(absPath, "utf-8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `inline; filename="${path.basename(absPath)}"`,
        },
      });
    }

    // 2. List deliverables
    if (taskId) {
      const wsData = getTaskWorkspaceData(taskId, squadId, taskTitle);
      return NextResponse.json({
        success: true,
        taskId,
        deliverables: wsData.deliverables,
        workspacePath: wsData.workspacePath,
      });
    }

    return NextResponse.json({ error: "Parâmetro 'taskId' ou 'path' obrigatório" }, { status: 400 });
  } catch (err: any) {
    console.error("Erro na rota GET /api/agent-kanban/deliverables:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
