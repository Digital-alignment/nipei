import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { VER_COMO_COOKIE, verComoAtivo } from "@/lib/v2/data";
import { registrarAdmin } from "@/lib/v2/admin";

export const dynamic = "force-dynamic";

// Leaves "ver como" (a GET, so it works even though writes are blocked in that mode) and goes back to the panel.
export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const jar = await cookies();
  const vc = verComoAtivo(verifyToken(jar.get(SESSION_COOKIE)?.value, "session"), jar.get(VER_COMO_COOKIE)?.value);
  if (vc) registrarAdmin(vc.admin, `saiu do "ver como" ${vc.alvo}`);
  const res = NextResponse.redirect(new URL(vc ? "/controle?m=vercomo" : "/hoje", base));
  res.cookies.set({ name: VER_COMO_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
