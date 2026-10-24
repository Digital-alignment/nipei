import fs from "fs";
import path from "path";
import { getPessoas, vault } from "./data";
import { todosAcessos } from "./seguranca";

// What each person did, for the admin panel (Atividade). Three sources merged:
// 1) the event log written from now on (<vault>/.jobs/eventos/AAAA-MM.jsonl): assistant use, proposals,
//    MCP calls, WhatsApp, exports, connections — never message contents, only what kind of action;
// 2) "## Atividade" of every task and person note (already there, with history), actor name → person;
// 3) logins (lib/v2/seguranca.ts).

export type Canal = "plataforma" | "assistente" | "whatsapp" | "mcp" | "sistema";
export type Evento = { em: string; pessoa: string; tipo: string; detalhe: string; canal: Canal };

const DIR = () => path.join(vault(), ".jobs", "eventos");

/** Appends one event (never throws: logging must not break the action). */
export function registrarEvento(pessoa: string | null | undefined, tipo: string, detalhe: string, canal: Canal) {
  if (!pessoa) return;
  try {
    const em = new Date().toISOString();
    fs.mkdirSync(DIR(), { recursive: true });
    fs.appendFileSync(path.join(DIR(), `${em.slice(0, 7)}.jsonl`), JSON.stringify({ em, pessoa, tipo, detalhe: detalhe.replace(/\s+/g, " ").slice(0, 160), canal }) + "\n", { mode: 0o600 });
  } catch { /* ignore */ }
}

function doLog(desde: number): Evento[] {
  if (!fs.existsSync(DIR())) return [];
  return fs.readdirSync(DIR()).filter((f) => f.endsWith(".jsonl") && f.slice(0, 7) >= new Date(desde).toISOString().slice(0, 7)).flatMap((f) =>
    fs.readFileSync(path.join(DIR(), f), "utf-8").trim().split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as Evento]; } catch { return []; } }));
}

// "Jordão", "Ashuan (via Claude)", "Ashuan (IA)" → person id + channel; system actors → null
const SISTEMA = /^(migração|v1|api|hermes|agente)/i;
function quemE(nomes: Map<string, string>, autor: string): { pessoa: string; canal: Canal } | null {
  const base = autor.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
  if (!base || SISTEMA.test(base)) return null;
  const via = autor.match(/\(via ([^)]+)\)/i)?.[1]?.toLowerCase() ?? (/\(IA\)/.test(autor) ? "assistente" : "");
  const canal: Canal = !via ? "plataforma" : via === "whatsapp" ? "whatsapp" : via === "assistente" ? "assistente" : "mcp";
  const pessoa = nomes.get(base);
  return pessoa ? { pessoa, canal } : null;
}
function tipoDe(oque: string): string {
  if (/criou a tarefa/i.test(oque)) return "criou tarefa";
  if (/conclu/i.test(oque)) return "concluiu tarefa";
  if (/^status/i.test(oque) || /reabriu/i.test(oque)) return "mudou status";
  if (/^respons/i.test(oque)) return "atribuiu";
  if (/^prazo/i.test(oque)) return "mudou prazo";
  if (/comentou/i.test(oque)) return "comentou";
  if (/equipe|coordena|suspen|externo|função/i.test(oque)) return "organizou pessoas";
  return "editou tarefa";
}

let cacheHist: { em: number; ev: Evento[] } | null = null;
/** "## Atividade" of tasks and people (Bahia local time in the notes). Cached 1 minute. */
function historico(): Evento[] {
  if (cacheHist && Date.now() - cacheHist.em < 60_000) return cacheHist.ev;
  const nomes = new Map<string, string>();
  for (const p of getPessoas()) { const n = p.name.split(" (")[0].trim().toLowerCase(); nomes.set(n, p.id); nomes.set(n.split(" ")[0], nomes.get(n.split(" ")[0]) ?? p.id); }
  const ev: Evento[] = [];
  for (const [pasta, ehPessoa] of [["Productivity/Tarefas", false], ["Miembros", true]] as const) {
    const dir = path.join(vault(), pasta);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const t = fs.readFileSync(path.join(dir, f), "utf-8");
      const sec = t.split(/\n## Atividade\r?\n/)[1]?.split(/\n## /)[0] ?? "";
      const titulo = ehPessoa ? "" : (t.match(/^title: "?(.*?)"?\s*$/m)?.[1] ?? f);
      for (const l of sec.split(/\r?\n/)) { // notes may have Windows line endings (synced from Obsidian)
        const m = l.match(/^- (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) · ([^·]+?) · (.+)$/);
        if (!m) continue;
        const q = quemE(nomes, m[3]);
        if (!q) continue;
        ev.push({ em: new Date(`${m[1]}T${m[2]}:00-03:00`).toISOString(), pessoa: q.pessoa, tipo: ehPessoa ? "organizou pessoas" : tipoDe(m[4]), detalhe: ehPessoa ? `${f.slice(0, -3)}: ${m[4]}` : `“${titulo}” — ${m[4]}`, canal: q.canal });
      }
    }
  }
  cacheHist = { em: Date.now(), ev };
  return ev;
}

/** Everything since `dias` ago, newest first. */
export function atividade(dias: number): Evento[] {
  const desde = Date.now() - dias * 86_400_000;
  const logins: Evento[] = todosAcessos().map((a) => ({ em: a.em, pessoa: a.pessoa, tipo: "entrou", detalhe: `${a.metodo} · ${a.disp}`, canal: "plataforma" }));
  return [...doLog(desde), ...historico(), ...logins].filter((e) => Date.parse(e.em) >= desde).sort((a, b) => b.em.localeCompare(a.em));
}
