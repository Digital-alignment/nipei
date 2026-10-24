import { NextResponse } from "next/server";
import { renovar, trocarCodigo } from "@/lib/v2/oauthMcp";
import { CORS } from "@/app/mcp/cors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const f = new URLSearchParams(await req.text());
  // client_id in the body, or in HTTP Basic (a secret, if any, is ignored: clients are public and use PKCE)
  const basic = req.headers.get("authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  const clienteId = f.get("client_id") || (basic ? decodeURIComponent(Buffer.from(basic, "base64").toString().split(":")[0]) : "");
  const h = { ...CORS, "Cache-Control": "no-store" };
  try {
    if (f.get("grant_type") === "authorization_code") return NextResponse.json(trocarCodigo(f.get("code") ?? "", f.get("code_verifier") ?? "", clienteId, f.get("redirect_uri") ?? ""), { headers: h });
    if (f.get("grant_type") === "refresh_token") return NextResponse.json(renovar(f.get("refresh_token") ?? "", clienteId), { headers: h });
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: h });
  } catch {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400, headers: h });
  }
}
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: CORS });
