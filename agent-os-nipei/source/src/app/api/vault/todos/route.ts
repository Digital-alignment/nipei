import { NextResponse } from "next/server";
import { extractVaultTodos, toggleVaultTodo } from "@/lib/vaultTodoExtractor";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companySlug = searchParams.get("company") || undefined;
    const squadId = searchParams.get("squad") || undefined;
    const statusParam = searchParams.get("status");

    const status = (statusParam === "pending" || statusParam === "completed") ? statusParam : "all";

    const data = await extractVaultTodos({ companySlug, squadId, status });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to extract vault todos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { relPath, line, completed } = body;

    if (!relPath || typeof line !== "number" || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request payload. Required: relPath (string), line (number), completed (boolean)" },
        { status: 400 }
      );
    }

    const result = await toggleVaultTodo(relPath, line, completed);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, updatedLineText: result.updatedLineText });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to toggle vault todo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
