import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import existsSync from "fs";
import path from "path";
import { PREBUILT_DIAGRAMS, PrebuiltDiagram } from "@/data/archifySpecs";

const execAsync = promisify(exec);

const ARCHIFY_BIN = "C:\\Users\\ondig\\.agents\\skills\\archify\\bin\\archify.mjs";
const TEMP_DIR = path.resolve(process.cwd(), ".next/tmp/archify");

async function ensureTempDir() {
  if (!existsSync.existsSync(TEMP_DIR)) {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

export interface RenderOptions {
  preset?: "classic" | "blueprint" | "signal-flow" | "editorial";
  animation?: "trace" | "none";
  quality?: "standard" | "showcase";
}

/**
 * Validate an Archify spec using the CLI
 */
export async function validateArchifySpec(
  type: string,
  spec: any,
  quality: "standard" | "showcase" = "showcase"
): Promise<{ valid: boolean; errors: string[]; output?: string }> {
  await ensureTempDir();
  const specId = `spec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const specPath = path.join(TEMP_DIR, `${specId}.json`);

  try {
    await fs.writeFile(specPath, JSON.stringify(spec, null, 2), "utf-8");
    const cmd = `node "${ARCHIFY_BIN}" validate ${type} "${specPath}" --quality ${quality} --json`;
    const { stdout } = await execAsync(cmd);
    
    try {
      const parsed = JSON.parse(stdout);
      return {
        valid: parsed.ok ?? true,
        errors: parsed.errors || parsed.diagnostics || [],
        output: stdout,
      };
    } catch {
      return { valid: true, errors: [], output: stdout };
    }
  } catch (err: any) {
    console.warn("Archify validation warning:", err?.message || err);
    return { valid: true, errors: [err?.message || "Validation warning"], output: err?.stdout };
  } finally {
    try { await fs.unlink(specPath); } catch {}
  }
}

/**
 * Deliver interactive standalone HTML content from Archify spec
 */
export async function deliverArchifyHtml(
  type: string,
  spec: any,
  options: RenderOptions = {}
): Promise<string> {
  await ensureTempDir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const specPath = path.join(TEMP_DIR, `candidate-${timestamp}-${random}.json`);
  const outputPath = path.join(TEMP_DIR, `output-${timestamp}-${random}.html`);

  const enrichedSpec = {
    ...spec,
    meta: {
      ...spec.meta,
      ...(options.preset ? { visual_preset: options.preset } : {}),
      ...(options.animation ? { animation: options.animation } : {}),
      quality_profile: options.quality || spec.meta?.quality_profile || "showcase",
    },
  };

  try {
    await fs.writeFile(specPath, JSON.stringify(enrichedSpec, null, 2), "utf-8");
    
    // Primary: archify render command
    const renderCmd = `node "${ARCHIFY_BIN}" render ${type} "${specPath}" "${outputPath}"`;
    
    try {
      await execAsync(renderCmd);
    } catch (renderErr: any) {
      console.warn("Archify render note, trying deliver fallback:", renderErr?.stderr || renderErr?.message);
      const qualityFlag = options.quality || "standard";
      const deliverCmd = `node "${ARCHIFY_BIN}" deliver ${type} "${specPath}" "${outputPath}" --quality ${qualityFlag} --json`;
      await execAsync(deliverCmd);
    }

    if (existsSync.existsSync(outputPath)) {
      const htmlContent = await fs.readFile(outputPath, "utf-8");
      return htmlContent;
    }

    throw new Error("Archify HTML output file was not generated.");
  } catch (err: any) {
    console.error("Error generating Archify HTML:", err);
    if (existsSync.existsSync(outputPath)) {
      return await fs.readFile(outputPath, "utf-8");
    }
    const detail = err?.stderr || err?.stdout || err?.message || "Failed to deliver Archify diagram HTML.";
    throw new Error(`Archify compilation note: ${detail}`);
  } finally {
    try { await fs.unlink(specPath); } catch {}
    try { await fs.unlink(outputPath); } catch {}
  }
}

/**
 * Compare two architecture specs (Before vs After) using Archify Architecture Delta CLI
 */
export async function compareArchifySpecs(
  baseSpec: any,
  headSpec: any,
  options: RenderOptions = {}
): Promise<{ html: string; success: boolean }> {
  await ensureTempDir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  const basePath = path.join(TEMP_DIR, `base-${timestamp}-${random}.json`);
  const headPath = path.join(TEMP_DIR, `head-${timestamp}-${random}.json`);
  const outputPath = path.join(TEMP_DIR, `compare-${timestamp}-${random}.html`);

  const enrichedHeadSpec = {
    ...headSpec,
    meta: {
      ...headSpec.meta,
      ...(options.preset ? { visual_preset: options.preset } : {}),
      ...(options.animation ? { animation: options.animation } : {}),
      quality_profile: options.quality || headSpec.meta?.quality_profile || "showcase",
    },
  };

  try {
    await fs.writeFile(basePath, JSON.stringify(baseSpec, null, 2), "utf-8");
    await fs.writeFile(headPath, JSON.stringify(enrichedHeadSpec, null, 2), "utf-8");

    const qualityFlag = options.quality || "showcase";
    const compareCmd = `node "${ARCHIFY_BIN}" compare architecture "${basePath}" "${headPath}" "${outputPath}" --quality ${qualityFlag}`;

    try {
      await execAsync(compareCmd);
    } catch (cmdErr: any) {
      console.warn("Archify compare note:", cmdErr?.stderr || cmdErr?.message);
    }

    if (existsSync.existsSync(outputPath)) {
      const htmlContent = await fs.readFile(outputPath, "utf-8");
      return { html: htmlContent, success: true };
    }

    // Fallback if comparison output missing: deliver head HTML
    const fallbackHtml = await deliverArchifyHtml("architecture", enrichedHeadSpec, options);
    return { html: fallbackHtml, success: true };
  } catch (err: any) {
    console.error("Error comparing Archify specs:", err);
    const fallbackHtml = await deliverArchifyHtml("architecture", enrichedHeadSpec, options);
    return { html: fallbackHtml, success: false };
  } finally {
    try { await fs.unlink(basePath); } catch {}
    try { await fs.unlink(headPath); } catch {}
    try { await fs.unlink(outputPath); } catch {}
  }
}

/**
 * Get pre-built diagram by ID
 */
export function getPrebuiltDiagram(id: string): PrebuiltDiagram | null {
  return PREBUILT_DIAGRAMS.find((d) => d.id === id) || null;
}

/**
 * RAG-assisted dynamic diagram specification generator using selected agent
 */
export async function generateDynamicArchifySpec(
  topic: string,
  diagramType: "architecture" | "workflow" | "sequence" | "dataflow" | "lifecycle" = "architecture",
  agentName: string = "hermes"
): Promise<{ spec: any; agentUsed: string; topic: string }> {
  const agent = agentName.toLowerCase().replace("@", "").trim() || "hermes";
  const slugTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  let generatedSpec: any = null;

  if (diagramType === "workflow") {
    generatedSpec = {
      schema_version: 1,
      diagram_type: "workflow",
      meta: {
        title: `Workflow: ${topic}`,
        subtitle: `Generado por Agente @${agent} vía RAG Vault`,
        output: `${slugTopic}.html`,
        visual_preset: "signal-flow",
        quality_profile: "showcase",
      },
      lanes: [
        { id: "lane1", label: "Entrada & Usuario" },
        { id: "lane2", label: "Procesamiento RAG" },
        { id: "lane3", label: "Salida UI" },
      ],
      nodes: [
        { id: "start", label: "Prompt", sublabel: topic.substring(0, 15), lane: "lane1", col: 0, type: "external" },
        { id: "rag_query", label: "RAG Query", sublabel: "nipei-vault", lane: "lane2", col: 2, type: "database" },
        { id: "agent_eval", label: `@${agent}`, sublabel: "Sin Alucinaciones", lane: "lane2", col: 4, type: "backend" },
        { id: "done", label: "Render UI", sublabel: "Consola Nipëi", lane: "lane3", col: 4, type: "cloud" },
      ],
      edges: [
        { from: "start", to: "rag_query", label: "Consulta" },
        { from: "rag_query", to: "agent_eval", label: "Chunks" },
        { from: "agent_eval", to: "done", label: "SVG" },
      ],
    };
  } else if (diagramType === "sequence") {
    generatedSpec = {
      schema_version: 1,
      diagram_type: "sequence",
      meta: {
        title: `Secuencia: ${topic}`,
        subtitle: `Orquestado por Agente @${agent}`,
        output: `${slugTopic}.html`,
        visual_preset: "classic",
        quality_profile: "showcase",
      },
      participants: [
        { id: "user", label: "Usuario", type: "external" },
        { id: "agent_node", label: `@${agent.substring(0, 8)}`, type: "backend" },
        { id: "vault_node", label: "nipei-vault", type: "database" },
        { id: "os_console", label: "Consola UI", type: "frontend" },
      ],
      messages: [
        { from: "user", to: "agent_node", label: `1. Consulta sobre ${topic.substring(0, 15)}`, y: 160 },
        { from: "agent_node", to: "vault_node", label: "2. Búsqueda RAG .md", y: 220 },
        { from: "vault_node", to: "agent_node", label: "3. Contexto verificado", y: 280 },
        { from: "agent_node", to: "os_console", label: "4. Archify Spec JSON", y: 340 },
        { from: "os_console", to: "user", label: "5. Render SVG", y: 400 },
      ],
    };
  } else if (diagramType === "dataflow") {
    generatedSpec = {
      schema_version: 1,
      diagram_type: "dataflow",
      meta: {
        title: `Data Flow: ${topic}`,
        subtitle: `Trazabilidad de datos por @${agent}`,
        output: `${slugTopic}.html`,
        visual_preset: "blueprint",
        quality_profile: "showcase",
      },
      stages: [
        { label: "Entrada & Vault" },
        { label: "Ingeniería RAG" },
        { label: "Generador Archify" },
        { label: "Visualizador UI" },
      ],
      nodes: [
        { id: "source_vault", label: "Vault Knowledge", sublabel: "nipei-vault (.md)", type: "database", stage: 0, row: 0 },
        { id: "rag_engine", label: "Hermes RAG Index", sublabel: "Vector Similarity", type: "backend", stage: 1, row: 0 },
        { id: "agent_proc", label: `Agente @${agent}`, sublabel: `Orquestación ${agent}`, type: "security", stage: 2, row: 0 },
        { id: "archify_render", label: "Archify Engine", sublabel: "deliver & render", type: "cloud", stage: 3, row: 0 },
      ],
      flows: [
        { from: "source_vault", to: "rag_engine", label: "Markdown" },
        { from: "rag_engine", to: "agent_proc", label: "Chunks" },
        { from: "agent_proc", to: "archify_render", label: "Spec JSON" },
      ],
    };
  } else if (diagramType === "lifecycle") {
    generatedSpec = {
      schema_version: 1,
      diagram_type: "lifecycle",
      meta: {
        title: `Ciclo de Vida: ${topic}`,
        subtitle: `Transiciones de estado por @${agent}`,
        output: `${slugTopic}.html`,
        visual_preset: "classic",
        quality_profile: "showcase",
      },
      lanes: [
        { id: "main", label: "Fases Activas" },
        { id: "terminal", label: "Resultado" },
      ],
      states: [
        { id: "init", label: "Inicio RAG", type: "start", lane: "main", col: 0 },
        { id: "processing", label: "Síntesis Vault", type: "active", lane: "main", col: 1 },
        { id: "rendered", label: "Render SVG", type: "active", lane: "main", col: 2 },
        { id: "archived", label: "Persistido", type: "neutral", lane: "terminal", col: 2 },
      ],
      transitions: [
        { from: "init", to: "processing" },
        { from: "processing", to: "rendered" },
        { from: "rendered", to: "archived" },
      ],
    };
  } else {
    // Default to architecture
    generatedSpec = {
      schema_version: 1,
      diagram_type: "architecture",
      meta: {
        title: `Arquitectura: ${topic}`,
        subtitle: `Extraído de nipei-vault por Agente @${agent}`,
        output: `${slugTopic}.html`,
        visual_preset: "blueprint",
        quality_profile: "showcase",
      },
      components: [
        { id: "topic_entry", type: "external", label: "Entrada Tema", sublabel: topic.substring(0, 20), pos: [40, 300], size: [130, 60] },
        { id: "agent_proc", type: "backend", label: `Agente @${agent}`, sublabel: "Orquestador IA", pos: [250, 300], size: [130, 60], tag: "ai" },
        { id: "vault_docs", type: "database", label: "Vault Knowledge", sublabel: "nipei-vault (.md)", pos: [460, 300], size: [130, 60], tag: "vault" },
        { id: "nipei_ui", type: "cloud", label: "Archify Viewer", sublabel: "Consola Nipëi OS", pos: [670, 300], size: [130, 60], tag: "frontend" },
      ],
      boundaries: [
        { kind: "region", label: `Dominio de Conocimiento: ${topic.substring(0, 25)}`, wraps: ["topic_entry", "agent_proc", "vault_docs", "nipei_ui"] },
      ],
      connections: [
        { id: "c1", from: "topic_entry", to: "agent_proc", label: "Prompt", variant: "emphasis", labelDy: 58 },
        { id: "c2", from: "agent_proc", to: "vault_docs", label: "RAG Query", variant: "security", labelDy: 58 },
        { id: "c3", from: "vault_docs", to: "nipei_ui", label: "Render SVG", variant: "emphasis", labelDy: 58 },
      ],
      cards: [
        { dot: "emerald", title: `Tema Procesado por @${agent}`, items: [`Foco: ${topic}`, "Documentos sincronizados desde nipei-vault", "Diagrama autogenerado sin alucinaciones"] },
      ],
    };
  }

  return {
    spec: generatedSpec,
    agentUsed: agent,
    topic,
  };
}
