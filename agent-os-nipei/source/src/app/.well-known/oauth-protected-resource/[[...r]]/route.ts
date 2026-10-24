import { NextResponse } from "next/server";
import { base, metadadosRecurso } from "@/lib/v2/oauthMcp";
import { CORS } from "@/app/mcp/cors";

export const dynamic = "force-dynamic";
// RFC 9728: tells MCP clients that /mcp is protected by Nipëi's own authorization server.
export const GET = (req: Request) => NextResponse.json(metadadosRecurso(base(new URL(req.url).origin)), { headers: CORS });
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
