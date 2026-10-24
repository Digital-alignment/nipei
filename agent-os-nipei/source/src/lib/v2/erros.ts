import fs from "fs";
import path from "path";
import { vault } from "./data";

// Server errors nobody would otherwise see: one line each in <vault>/.jobs/erros/AAAA-MM.jsonl.
// Fed by src/instrumentation.ts (every unhandled error in a page, action or route) and by registrarErro
// where code catches a failure on purpose (e.g. the AI provider down). Shown in /controle → Erros.

export type ErroServidor = { em: string; onde: string; msg: string; digest?: string; pilha?: string };
const arq = (mes: string) => path.join(vault(), ".jobs", "erros", `${mes}.jsonl`);

export function registrarErro(onde: string, e: unknown, digest?: string) {
  try {
    const err = e instanceof Error ? e : new Error(String(e));
    const x: ErroServidor = { em: new Date().toISOString(), onde: onde.slice(0, 200), msg: err.message.slice(0, 500), ...(digest ? { digest } : {}), pilha: err.stack?.split("\n").slice(1, 6).map((l) => l.trim()).join(" | ").slice(0, 800) };
    fs.mkdirSync(path.dirname(arq(x.em.slice(0, 7))), { recursive: true });
    fs.appendFileSync(arq(x.em.slice(0, 7)), JSON.stringify(x) + "\n", { mode: 0o600 });
  } catch { /* the error log must never throw */ }
}

/** Errors of the last `dias` days, newest first. */
export function errosRecentes(dias: number): ErroServidor[] {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString(), meses = new Set<string>();
  for (let t = Date.parse(desde); t <= Date.now() + 86_400_000; t += 86_400_000) meses.add(new Date(t).toISOString().slice(0, 7));
  const out: ErroServidor[] = [];
  for (const m of meses) { try { for (const l of fs.readFileSync(arq(m), "utf-8").split("\n")) if (l) { const x = JSON.parse(l); if (x.em >= desde) out.push(x); } } catch { /* month without errors */ } }
  return out.sort((a, b) => b.em.localeCompare(a.em));
}
