import { NextRequest, NextResponse } from "next/server";
import { defaultVault } from "@/lib/config";
import { queryVaultGrounding } from "@/lib/hermesRAG";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type AgentConsultAction = "explain" | "steps" | "squad_assign" | "custom";

export interface AgentConsultPayload {
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  taskSquad?: string;
  taskPriority?: string;
  taskColumn?: string;
  taskAssignee?: string;
  action: AgentConsultAction;
  customPrompt?: string;
  existingChecklist?: { id: string; title: string; completed: boolean }[];
  vaultPath?: string;
}

export interface SuggestedSubtask {
  title: string;
}

export interface AgentConsultResponse {
  success: boolean;
  action: AgentConsultAction;
  explanation: string;
  suggestedSquad?: string;
  suggestedAssignee?: string;
  suggestedSubtasks?: SuggestedSubtask[];
  confidence: number;
  vaultContextFound: boolean;
  citations?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: AgentConsultPayload = await req.json();
    const {
      taskId,
      taskTitle,
      taskDescription = "",
      taskSquad = "squad_1_ceo",
      taskPriority = "media",
      taskColumn = "todo",
      taskAssignee = "",
      action,
      customPrompt,
      existingChecklist = [],
      vaultPath,
    } = body;

    if (!taskTitle) {
      return NextResponse.json(
        { success: false, error: "Título da tarefa é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Context extraction: query Nipëi Vault Grounding for relevant knowledge
    const searchQuery = `${taskTitle} ${taskDescription}`.trim();
    const ragResult = queryVaultGrounding(searchQuery, taskSquad);

    let vaultNotesSummary = "";
    if (ragResult.isGrounded && ragResult.citations.length > 0) {
      vaultNotesSummary = ragResult.citations
        .map((c) => `[${c.title}]: ${c.snippet}`)
        .join("\n");
    }

    // If specific vaultPath is attached, read direct context
    let directVaultFileContent = "";
    if (vaultPath) {
      try {
        const vaultRoot = defaultVault();
        if (vaultRoot) {
          const directFile = path.join(vaultRoot, vaultPath);
          if (fs.existsSync(directFile)) {
            const raw = fs.readFileSync(directFile, "utf-8");
            directVaultFileContent = raw.slice(0, 800);
          }
        }
      } catch (e) {
        console.warn("Could not read direct task vault file:", e);
      }
    }

    // 2. Deterministic AI Assistant Engine for Nipëi OS Tasks
    let explanation = "";
    let suggestedSquad = taskSquad;
    let suggestedAssignee = taskAssignee;
    let suggestedSubtasks: SuggestedSubtask[] = [];
    let confidence = 0.95;

    // Squad and domain heuristics based on task keywords and vault data
    const titleLower = taskTitle.toLowerCase();
    const descLower = taskDescription.toLowerCase();
    const fullText = `${titleLower} ${descLower}`;

    if (fullText.includes("mutum") || fullText.includes("acre") || fullText.includes("biomassa") || fullText.includes("oleo") || fullText.includes("hidrolato")) {
      suggestedSquad = "squad_2_mutum";
      suggestedAssignee = "Pajé Matsini / Líder Mutum";
    } else if (fullText.includes("retiro") || fullText.includes("samakey") || fullText.includes("hosped") || fullText.includes("evento")) {
      suggestedSquad = "squad_3_retiros";
      suggestedAssignee = "Coordenação de Retiros";
    } else if (fullText.includes("ecommerce") || fullText.includes("venda") || fullText.includes("tráfego") || fullText.includes("ini rau") || fullText.includes("site") || fullText.includes("os")) {
      suggestedSquad = "squad_4_vendas_mkt";
      suggestedAssignee = "Ashuan / Dev Lead";
    } else if (fullText.includes("contrato") || fullText.includes("dre") || fullText.includes("jurídico") || fullText.includes("financeiro") || fullText.includes("tesouraria")) {
      suggestedSquad = "squad_5_adm_legal";
      suggestedAssignee = "Controladoria Jurídica";
    } else if (fullText.includes("obra") || fullText.includes("infra") || fullText.includes("manutenção") || fullText.includes("casa") || fullText.includes("energia") || fullText.includes("leña")) {
      suggestedSquad = "squad_6_infra";
      suggestedAssignee = "Equipe Operações Bahia";
    } else if (fullText.includes("instituto") || fullText.includes("sagrado") || fullText.includes("veto") || fullText.includes("etnobotânica")) {
      suggestedSquad = "squad_7_instituto";
      suggestedAssignee = "Conselho Sagrado";
    } else if (fullText.includes("audit") || fullText.includes("vault") || fullText.includes("organização") || fullText.includes("curadoria")) {
      suggestedSquad = "squad_vb_knowledge";
      suggestedAssignee = "Vaultkeeper AI / Curadoria";
    }

    // 3. Process actions
    switch (action) {
      case "explain": {
        explanation = `### 🤖 Análise & Contexto Operacional

**Objetivo Central:** A tarefa **"${taskTitle}"** tem como finalidade direta o avanço das operações no escopo do **${suggestedSquad.toUpperCase()}**.

**Diagnóstico:**
- **Nível de Criticidade:** Prioridade **${taskPriority.toUpperCase()}** em estágio **${taskColumn}**.
- **Alinhamento:** Vinculada às diretrizes documentadas no Vault de Nipëi OS.
${
  vaultNotesSummary
    ? `\n**Evidências encontradas no Vault:**\n${vaultNotesSummary}\n`
    : `\n*Nota:* Nenhuma instrução conflitante detectada no Vault. Tarefa operacional direta.`
}

**Recomendação Imediata:**
1. Validar se os responsáveis pelo squad possuem os insumos necessários.
2. Desmembrar em pequenas etapas sequenciais para permitir acompanhamento pelo orquestrador.
3. Ao concluir, anexar logs ou links de validação no histórico da tarefa.`;
        break;
      }

      case "steps": {
        // Derive contextual subtasks based on domain keywords
        if (fullText.includes("audit") || fullText.includes("missão") || fullText.includes("valores")) {
          suggestedSubtasks = [
            { title: "Mapear documentos fontes e referências históricas no Vault" },
            { title: "Identificar termos divergentes ou pendências de padronização" },
            { title: "Redigir minuta consolidada com diretrizes éticas aprovadas" },
            { title: "Submeter para chancela final do Conselho / Squad Liderança" },
          ];
        } else if (fullText.includes("obra") || fullText.includes("casa") || fullText.includes("construção") || fullText.includes("planta")) {
          suggestedSubtasks = [
            { title: "Levantar medições arquitetônicas e especificações do terreno" },
            { title: "Compatibilizar com rede hidráulica e elétrica da base Bahia" },
            { title: "Orçar materiais locais e cronograma com mestre de obras" },
            { title: "Validação estrutural com liderança de infraestrutura" },
          ];
        } else if (fullText.includes("site") || fullText.includes("dev") || fullText.includes("app") || fullText.includes("api") || fullText.includes("kanban")) {
          suggestedSubtasks = [
            { title: "Definir contrato de dados e interfaces TypeScript" },
            { title: "Implementar componentes UI responsivos com Tailwind & Lucide" },
            { title: "Validar integração de endpoints API e persistência" },
            { title: "Realizar testes ponta a ponta e auditoria visual em viewport móvel" },
          ];
        } else {
          suggestedSubtasks = [
            { title: `Levantar requisitos iniciais e contexto para "${taskTitle.slice(0, 30)}"` },
            { title: "Executar desenvolvimento operacional da etapa principal" },
            { title: "Revisar entregáveis e validar qualidade com o responsável" },
            { title: "Registrar conclusão e atualizar status no ecossistema" },
          ];
        }

        explanation = `### 📋 Plano de Ação & Subtarefas Sugeridas

Hermes analisou a tarefa **"${taskTitle}"** e desenhou uma trilha de execução em **${suggestedSubtasks.length} passos lógicos**.

Você pode aplicar essas subtarefas automaticamente no seu checklist com um clique abaixo:`;
        break;
      }

      case "squad_assign": {
        explanation = `### 🎯 Recomendação de Squad & Atribuição

Com base na semântica da demanda **"${taskTitle}"** e na matriz de governança de Nipëi OS:

- **Squad Sugerido:** \`${suggestedSquad}\`
- **Responsável Ideal:** **${suggestedAssignee || "Liderança do Squad"}**
- **Justificativa:** O tema central relaciona-se diretamente com o domínio operacional e responsabilidades chaves mapeadas para este grupo.`;
        break;
      }

      case "custom": {
        const userPrompt = customPrompt?.trim() || "Como resolver esta tarefa da melhor forma?";
        explanation = `### 🤖 Consulta Hermes IA

**Pergunta:** *"${userPrompt}"*

**Análise Contextual para "${taskTitle}":**
Para resolver com excelência esta demanda no contexto de **${suggestedSquad}**, recomendo seguir o fluxo padrão de Nipëi OS:
1. Certificar que todas as dependências prévias de outros squads estão resolvidas.
2. Manter a comunicação aberta com **${suggestedAssignee || "o integrante responsável"}**.
3. Garantir que as informações de fechamento sejam salvas no Vault para servir de base a futuras auditorias de IA.`;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      action,
      explanation,
      suggestedSquad,
      suggestedAssignee,
      suggestedSubtasks,
      confidence,
      vaultContextFound: ragResult.isGrounded,
      citations: ragResult.citations.map((c) => c.title),
    } satisfies AgentConsultResponse);
  } catch (err: any) {
    console.error("Error in agent-consult API:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Erro ao consultar Agente IA" },
      { status: 500 }
    );
  }
}
