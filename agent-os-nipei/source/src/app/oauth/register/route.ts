import { NextResponse } from "next/server";
import { registrarCliente } from "@/lib/v2/oauthMcp";
import { CORS } from "@/app/mcp/cors";

export const dynamic = "force-dynamic";

// RFC 7591 dynamic client registration (Claude/ChatGPT/Gemini register themselves). Public clients: PKCE, no secret.
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const c = registrarCliente(b);
    return NextResponse.json({
      client_id: c.id, client_name: c.nome, redirect_uris: c.redirects, client_id_issued_at: Math.floor(Date.parse(c.criadoEm) / 1000),
      grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none",
    }, { status: 201, headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: (e as Error).message }, { status: 400, headers: CORS });
  }
}
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
