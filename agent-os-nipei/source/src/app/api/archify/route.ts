import { NextRequest, NextResponse } from "next/server";
import {
  deliverArchifyHtml,
  validateArchifySpec,
  getPrebuiltDiagram,
  generateDynamicArchifySpec,
  compareArchifySpecs,
  RenderOptions,
} from "@/lib/archifyEngine";
import { PREBUILT_DIAGRAMS } from "@/data/archifySpecs";

export const dynamic = "force-dynamic";

const AVAILABLE_AGENTS = [
  { id: "hermes", name: "Hermes 2.0", role: "RAG & Conocimiento Cero-Alucinación" },
  { id: "planner", name: "Planner Agent", role: "Desglose de Objetivos y Workflows" },
  { id: "builder", name: "Builder Agent", role: "Construcción & Código de Arquitectura" },
  { id: "antigravity", name: "Antigravity OS", role: "Orquestador de Sistema & Vault" },
  { id: "chaman", name: "Chamán Yawanawá", role: "Conciencia Ritual & Fitoterapia" },
  { id: "venu", name: "Venu Voice", role: "Voz Ancestral & Agendamiento" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "nipei-ecosystem-architecture";
    const preset = (searchParams.get("preset") as RenderOptions["preset"]) || undefined;
    const animation = (searchParams.get("animation") as RenderOptions["animation"]) || "trace";
    const rawHtml = searchParams.get("raw") === "1";

    const prebuilt = getPrebuiltDiagram(id);
    if (!prebuilt) {
      return NextResponse.json(
        { success: false, error: `Diagrama con ID '${id}' no encontrado.` },
        { status: 404 }
      );
    }

    const html = await deliverArchifyHtml(prebuilt.type, prebuilt.spec, {
      preset: preset || prebuilt.spec.meta?.visual_preset || "blueprint",
      animation,
    });

    if (rawHtml) {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      success: true,
      id: prebuilt.id,
      name: prebuilt.name,
      category: prebuilt.category,
      type: prebuilt.type,
      description: prebuilt.description,
      spec: prebuilt.spec,
      html,
    });
  } catch (err: any) {
    console.error("Error in GET /api/archify:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to render diagram." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "render";

    if (action === "list_prebuilt") {
      return NextResponse.json({
        success: true,
        diagrams: PREBUILT_DIAGRAMS,
        agents: AVAILABLE_AGENTS,
      });
    }

    if (action === "list_agents") {
      return NextResponse.json({
        success: true,
        agents: AVAILABLE_AGENTS,
      });
    }

    if (action === "generate") {
      const topic = body.topic || "Ecosistema Nipëi OS";
      const diagramType = body.diagramType || "architecture";
      const agent = body.agent || "hermes";
      const preset = body.preset || "blueprint";
      const animation = body.animation || "trace";

      const { spec, agentUsed } = await generateDynamicArchifySpec(topic, diagramType, agent);

      const html = await deliverArchifyHtml(diagramType, spec, {
        preset,
        animation,
      });

      return NextResponse.json({
        success: true,
        generated: true,
        topic,
        diagramType,
        agentUsed,
        spec,
        html,
      });
    }

    if (action === "compare") {
      let baseSpec = body.baseSpec;
      let headSpec = body.headSpec;
      const preset = body.preset || "blueprint";
      const animation = body.animation || "trace";

      if (!baseSpec && body.baseId) {
        const foundBase = getPrebuiltDiagram(body.baseId);
        if (foundBase) baseSpec = foundBase.spec;
      }

      if (!headSpec && body.headId) {
        const foundHead = getPrebuiltDiagram(body.headId);
        if (foundHead) headSpec = foundHead.spec;
      }

      if (!baseSpec || !headSpec) {
        return NextResponse.json(
          { success: false, error: "Se requieren 'baseSpec' y 'headSpec' (o 'baseId' y 'headId') para comparar la arquitectura." },
          { status: 400 }
        );
      }

      const { html, success } = await compareArchifySpecs(baseSpec, headSpec, {
        preset,
        animation,
      });

      return NextResponse.json({
        success,
        compared: true,
        baseTitle: baseSpec?.meta?.title || "Base Architecture",
        headTitle: headSpec?.meta?.title || "Head Architecture",
        html,
      });
    }

    // Default action: "render" custom or prebuilt spec
    let spec = body.spec;
    let type = body.type || body.diagramType || "architecture";
    const preset = body.preset || undefined;
    const animation = body.animation || "trace";

    if (!spec && body.id) {
      const found = getPrebuiltDiagram(body.id);
      if (found) {
        spec = found.spec;
        type = found.type;
      }
    }

    if (!spec) {
      return NextResponse.json(
        { success: false, error: "Se requiere la especificación 'spec' en formato JSON de Archify." },
        { status: 400 }
      );
    }

    const html = await deliverArchifyHtml(type, spec, {
      preset,
      animation,
    });

    return NextResponse.json({
      success: true,
      type,
      spec,
      html,
    });
  } catch (err: any) {
    console.error("Error in POST /api/archify:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Error al procesar diagrama Archify." },
      { status: 500 }
    );
  }
}
