import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidApiToken, verifyToken } from "@/lib/auth";
import { gestaoAgora, sessaoCortada } from "@/lib/v2/data";
import { subEhAdmin } from "@/lib/v2/admin";

// Routes reachable without a session. Only add routes that verify their own secret
// (or signed per-member token) inside the handler.
const PUBLIC_API = [
  "/api/auth/login",
  "/api/ingest/inbox-webhook", // checks NIPEI_WEBHOOK_SECRET itself
  "/api/agenda/ics", // Google Calendar feed: checks its signed "ics" token itself
  "/api/whatsapp/webhook", // Evolution webhook: checks NIPEI_WHATSAPP_WEBHOOK_SECRET itself
  "/api/auth/link-whatsapp", // "receive an access link": rate-limited, always answers the same
  "/api/uso", // one-minute usage pulse: checks the session itself and counts only the logged-in person
];
const PUBLIC_PAGES = ["/login", "/entrar", "/cadastro", "/privacidade", "/google/entrar", "/google/callback"]; // /google/callback checks its signed state itself // /entrar and /cadastro check their link token

// A "member" session (non-gestão teams) only reaches the v2 pages; v1 and the internal API
// (agents, dispatch, vault writes…) stay gestão-only. Keep in sync with V2_PATHS in Shell.tsx.
const MEMBER_PAGES = ["/hoje", "/agenda", "/equipes", "/projetos", "/objetivos", "/pessoas", "/tarefas", "/acervo", "/eventos", "/conhecimento", "/diagnosticos", "/pulso", "/google"]; // not /financas: gestão only. /google = each person's own Google connection
const isMemberPage = (p: string) => p === "/" || MEMBER_PAGES.some((m) => p === m || p.startsWith(m + "/"));

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  if ((isApi ? PUBLIC_API : PUBLIC_PAGES).includes(pathname)) return NextResponse.next();
  // MCP + its OAuth server: /mcp checks its Bearer token, /oauth/authorize asks for the Nipëi login itself
  if (pathname === "/mcp" || pathname.startsWith("/oauth/") || pathname.startsWith("/.well-known/")) return NextResponse.next();

  // a session issued before its person's cut-off (password change, "sign out everywhere") counts as none
  const bruto = req.cookies.get(SESSION_COOKIE)?.value;
  const token = bruto && !sessaoCortada(bruto) ? bruto : undefined;
  // A full session counts only while its person is still in a gestão team (checked on every request):
  // someone moved out of Equipe 1 keeps their login but falls back to the member pages at once.
  const full = verifyToken(token, "session");
  // the admin panel doesn't exist for anyone outside NIPEI_ADMINS: a real 404 before any page code runs
  if ((pathname === "/controle" || pathname.startsWith("/controle/")) && !subEhAdmin(full)) {
    return token ? NextResponse.rewrite(new URL("/_nao-existe", req.url), { status: 404 }) : NextResponse.redirect(new URL("/login", req.url));
  }
  if (full && gestaoAgora(full) !== false) return NextResponse.next();
  if (isApi && isValidApiToken(req.headers.get("authorization"))) return NextResponse.next();

  if (full || verifyToken(token, "member")) {
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
