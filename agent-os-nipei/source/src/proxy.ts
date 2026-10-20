import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidApiToken, verifyToken } from "@/lib/auth";

// Routes reachable without a session. Only add routes that verify their own secret
// (or signed per-member token) inside the handler.
const PUBLIC_API = [
  "/api/auth/login",
  "/api/ingest/inbox-webhook", // checks NIPEI_WEBHOOK_SECRET itself
  "/api/agenda/ics", // Google Calendar feed: checks its signed "ics" token itself
];
const PUBLIC_PAGES = ["/login", "/entrar", "/cadastro"]; // /entrar and /cadastro check their link token

// A "member" session (non-gestão teams) only reaches the v2 pages; v1 and the internal API
// (agents, dispatch, vault writes…) stay gestão-only. Keep in sync with V2_PATHS in Shell.tsx.
const MEMBER_PAGES = ["/hoje", "/agenda", "/equipes", "/projetos", "/objetivos", "/pessoas", "/tarefas", "/acervo", "/eventos", "/conhecimento"]; // not /financas: gestão only
const isMemberPage = (p: string) => p === "/" || MEMBER_PAGES.some((m) => p === m || p.startsWith(m + "/"));

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if ((isApi ? PUBLIC_API : PUBLIC_PAGES).includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (verifyToken(token, "session")) return NextResponse.next();
  if (isApi && isValidApiToken(req.headers.get("authorization"))) return NextResponse.next();

  if (verifyToken(token, "member")) {
    if (!isApi && isMemberPage(pathname)) return NextResponse.next();
    if (isApi) return NextResponse.json({ ok: false, error: "Sem permissão" }, { status: 403 });
    return NextResponse.redirect(new URL("/hoje", req.url));
  }

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
