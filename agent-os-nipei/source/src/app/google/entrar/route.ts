import { NextResponse } from "next/server";
import { googleConfigurado, linkLoginGoogle } from "@/lib/v2/google";

export const dynamic = "force-dynamic";

// "Entrar com Google" on the login page (public): identity only, then /google/callback opens the session.
export function GET(req: Request) {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  if (!googleConfigurado()) return NextResponse.redirect(new URL("/login?erro=google", base));
  const next = url.searchParams.get("next") ?? "";
  return NextResponse.redirect(linkLoginGoogle(base, next.startsWith("/") && !next.startsWith("//") ? next : "/hoje"));
}
