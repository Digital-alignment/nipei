import { NextResponse } from "next/server";
import { base, metadadosServidor } from "@/lib/v2/oauthMcp";
import { CORS } from "@/app/mcp/cors";

export const dynamic = "force-dynamic";
// RFC 8414 — also answered under a path suffix (/.well-known/oauth-authorization-server/mcp), which some clients ask for.
export const GET = (req: Request) => NextResponse.json(metadadosServidor(base(new URL(req.url).origin)), { headers: CORS });
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
