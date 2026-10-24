import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/auth";
import { getPessoas, vault, type Me } from "./data";

// The technical admin panel (/controle). Who may open it comes ONLY from the server env
// (NIPEI_ADMINS = comma-separated person ids), never from the vault or the app, so nobody can add
// themselves. Everyone else gets a 404. Opening it also needs a fresh confirmation (password or Google)
// kept in a 30-minute cookie that only travels to /controle. Every opening and action is logged.

export const ADMIN_COOKIE = "nipei_admin";
export const ADMIN_TTL = 30 * 60;

const admins = () => (process.env.NIPEI_ADMINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
export const ehAdmin = (me: Me | null | undefined) => !!me?.pessoa && admins().includes(me.pessoa.id);
/** Same check from a session subject (username or person id) — used by the proxy. */
export const subEhAdmin = (sub: string | null) => !!sub && admins().some((id) => id === sub || getPessoas().find((p) => p.id === id)?.usuario === sub);

/** Confirmed in the last 30 minutes, by this same person. */
export async function adminConfirmado(me: Me) {
  return ehAdmin(me) && verifyToken((await cookies()).get(ADMIN_COOKIE)?.value, "admin-confirmado") === me.pessoa!.id;
}
export const cookieAdmin = (pessoaId: string) => ({
  name: ADMIN_COOKIE, value: signToken("admin-confirmado", pessoaId, ADMIN_TTL),
  httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/controle", maxAge: ADMIN_TTL,
});

// ---------------------------------------------------------------- panel log
const LOG = () => path.join(vault(), ".jobs", "admin", "registro.jsonl");
export function registrarAdmin(quem: string, oque: string) {
  try {
    fs.mkdirSync(path.dirname(LOG()), { recursive: true });
    fs.appendFileSync(LOG(), JSON.stringify({ em: new Date().toISOString(), quem, oque }) + "\n", { mode: 0o600 });
  } catch { /* never block the panel for its own log */ }
}
export function registroAdmin(max = 50): { em: string; quem: string; oque: string }[] {
  try { return fs.readFileSync(LOG(), "utf-8").trim().split("\n").filter(Boolean).slice(-max).reverse().map((l) => JSON.parse(l)); } catch { return []; }
}
