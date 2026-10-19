import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidApiToken, verifyToken } from "@/lib/auth";

// Routes reachable without a session. Only add routes that verify their own secret
// (or signed per-member token) inside the handler.
const PUBLIC_API = [
  "/api/auth/login",
  "/api/ingest/inbox-webhook", // checks NIPEI_WEBHOOK_SECRET itself
  "/api/agenda/ics", // Google Calendar feed: checks its signed "ics" token itself
];
const PUBLIC_PAGES = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if ((isApi ? PUBLIC_API : PUBLIC_PAGES).includes(pathname)) return NextResponse.next();

  if (verifyToken(req.cookies.get(SESSION_COOKIE)?.value, "session")) return NextResponse.next();
  if (isApi && isValidApiToken(req.headers.get("authorization"))) return NextResponse.next();

  if (isApi) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // All of /api (including file-like paths such as /api/x/preview/index.html), plus
  // every page except Next internals and static files from /public (paths with a dot).
  matcher: ["/api/:path*", "/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
