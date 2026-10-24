import fs from "fs";
import path from "path";
import { vault } from "./data";
import { getConexoes, pessoasConectadas } from "./conexoes";
import { googleConfigurado, temGmail } from "./google";
import { semHash } from "./seguranca";

// Health of everything Nipëi depends on, for the admin panel. Each check is independent, has a timeout and
// never throws: it returns ok / atencao / erro / sem_dados with a one-line summary and details.
// Host scripts (vault sync, WhatsApp notices, Hermes worker) leave their last result in <vault>/.jobs/estado/.

export type Estado = "ok" | "atencao" | "erro" | "sem_dados";
export type Checagem = { id: string; grupo: string; nome: string; estado: Estado; resumo: string; detalhes: string[]; ms: number };

const T = 8000;
const idade = (iso: string) => (Date.now() - Date.parse(iso)) / 60_000; // minutes
const haQuanto = (iso: string) => { const m = idade(iso); return m < 1 ? "agora" : m < 60 ? `há ${Math.round(m)} min` : m < 48 * 60 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dias`; };
const lerJson = <X,>(f: string): X | null => { try { return JSON.parse(fs.readFileSync(f, "utf-8")); } catch { return null; } };
const estadoHost = (nome: string) => lerJson<{ em: string; resultado: string; msg?: string }>(path.join(vault(), ".jobs", "estado", `${nome}.json`));

async function medir(id: string, grupo: string, nome: string, f: () => Promise<Omit<Checagem, "id" | "grupo" | "nome" | "ms">>): Promise<Checagem> {
  const t0 = Date.now();
  try { return { id, grupo, nome, ...(await f()), ms: Date.now() - t0 }; }
  catch (e) { return { id, grupo, nome, estado: "erro", resumo: (e as Error).message.slice(0, 160), detalhes: [], ms: Date.now() - t0 }; }
}

function refGit(nome: string): string {
  const g = path.join(vault(), ".git");
  try { return fs.readFileSync(path.join(g, nome), "utf-8").trim(); } catch { /* packed */ }
  try { return fs.readFileSync(path.join(g, "packed-refs"), "utf-8").split("\n").find((l) => l.endsWith(` ${nome}`))?.split(" ")[0] ?? ""; } catch { return ""; }
}

const CHECAGENS: (() => Promise<Checagem>)[] = [
  () => medir("app", "Plataforma", "Aplicação", async () => {
    const pkg = lerJson<{ version: string }>(path.join(process.cwd(), "package.json"));
    const mem = Math.round(process.memoryUsage().rss / 1e6);
    return { estado: mem > 1500 ? "atencao" : "ok", resumo: `v${pkg?.version ?? "?"} · no ar há ${Math.round(process.uptime() / 3600)} h`, detalhes: [`Node ${process.version}`, `memória ${mem} MB`, `ambiente ${process.env.NODE_ENV}`] };
  }),
  () => medir("vault", "Plataforma", "Vault (dados)", async () => {
    const v = vault();
    const tarefas = fs.readdirSync(path.join(v, "Productivity", "Tarefas")).filter((f) => f.endsWith(".md")).length;
    const s = fs.statfsSync(v), livre = Math.round((s.bavail * s.bsize) / 1e9), pct = Math.round((s.bavail / s.blocks) * 100);
    const reflog = fs.readFileSync(path.join(v, ".git", "logs", "HEAD"), "utf-8").trim().split("\n").at(-1) ?? "";
    const ts = Number(reflog.match(/> (\d{9,}) /)?.[1] ?? 0);
    const head = refGit("refs/heads/main"), origin = refGit("refs/remotes/origin/main");
    const emDia = !!head && head === origin;
    return {
      estado: pct < 10 ? "erro" : !emDia || pct < 20 ? "atencao" : "ok", resumo: `${tarefas} tarefas · ${emDia ? "igual ao GitHub" : "commits ainda não enviados ao GitHub"}`,
      detalhes: [`último commit ${ts ? haQuanto(new Date(ts * 1000).toISOString()) : "?"}`, `disco: ${livre} GB livres (${pct}%)`],
    };
  }),
  () => medir("sync", "Servidor", "Sincronização do vault", async () => {
    const e = estadoHost("sync");
    if (!e) return { estado: "sem_dados", resumo: "o script do servidor ainda não deixou estado", detalhes: [] };
    const m = idade(e.em);
    return { estado: e.resultado === "CONFLICT" ? "erro" : e.resultado !== "ok" || m > 15 ? "atencao" : "ok", resumo: `${e.resultado} · ${haQuanto(e.em)}`, detalhes: [e.msg ?? "", "roda a cada 5 min e a cada gravação"].filter(Boolean) };
  }),
  () => medir("avisos", "Servidor", "Avisos por WhatsApp", async () => {
    const f = estadoHost("avisos-fila"), d = estadoHost("avisos-diario");
    if (!f && !d) return { estado: "sem_dados", resumo: "ainda sem estado dos avisos", detalhes: [] };
    const ruim = [f, d].some((x) => x && x.resultado !== "ok"), diarioVelho = !d || idade(d.em) > 26 * 60;
    return { estado: ruim ? "erro" : diarioVelho ? "atencao" : "ok", resumo: `diário ${d ? haQuanto(d.em) : "nunca"} · fila ${f ? haQuanto(f.em) : "nunca"}`, detalhes: [f?.msg, d?.msg].filter((x): x is string => !!x) };
  }),
  () => medir("hermes", "Servidor", "Hermes ('Fazer por mim')", async () => {
    const e = estadoHost("hermes-worker");
    const pend = (() => { try { return fs.readdirSync(path.join(vault(), ".jobs", "pendentes")).length; } catch { return 0; } })();
    if (!e) return { estado: pend ? "atencao" : "sem_dados", resumo: pend ? `${pend} trabalho(s) esperando` : "nenhum trabalho rodou ainda", detalhes: [] };
    return { estado: e.resultado !== "ok" ? "erro" : pend > 2 ? "atencao" : "ok", resumo: `última volta ${haQuanto(e.em)} · ${pend} na fila`, detalhes: [e.msg ?? ""].filter(Boolean) };
  }),
  () => medir("openrouter", "IA", "OpenRouter (IA da plataforma)", async () => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return { estado: "erro", resumo: "OPENROUTER_API_KEY não configurada", detalhes: [] };
    const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(T) });
    if (!r.ok) return { estado: "erro", resumo: `OpenRouter respondeu ${r.status}`, detalhes: [] };
    const d = (await r.json())?.data ?? {};
    const resta = typeof d.limit_remaining === "number" ? d.limit_remaining : null;
    return { estado: resta !== null && resta < 5 ? "atencao" : "ok", resumo: `${resta !== null ? `US$ ${resta.toFixed(2)} restantes · ` : ""}uso total US$ ${Number(d.usage ?? 0).toFixed(2)}`, detalhes: [`modelo ${process.env.NIPEI_IA_MODEL || "anthropic/claude-haiku-5.5"}`] };
  }),
  () => medir("gemini", "IA", "Gemini (voz e transcrição)", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { estado: "erro", resumo: "GEMINI_API_KEY não configurada", detalhes: [] };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${key}`, { signal: AbortSignal.timeout(T) });
    return { estado: r.ok ? "ok" : "erro", resumo: r.ok ? "chave válida" : `Gemini respondeu ${r.status}`, detalhes: [`transcrição: ${process.env.NIPEI_TRANSCRICAO_MODEL || "gemini-flash-lite-latest"}`] };
  }),
  () => medir("chaves", "IA", "Chaves de IA próprias", async () => {
    const com = pessoasConectadas().map((p) => ({ p, ia: getConexoes(p).ia })).filter((x) => x.ia);
    const erros = com.filter((x) => x.ia?.erro && !x.ia.pausada);
    return { estado: erros.length ? "atencao" : com.length ? "ok" : "sem_dados", resumo: com.length ? `${com.length} pessoa(s) · ${com.filter((x) => !x.ia?.pausada).length} em uso` : "ninguém usa chave própria", detalhes: com.map((x) => `${x.p}: ${x.ia!.provedor}${x.ia!.pausada ? " (pausada)" : ""}${x.ia!.erro ? ` — ${x.ia!.erro}` : ""}`) };
  }),
  () => medir("evolution", "WhatsApp", "Número do Nipëi (Evolution)", async () => {
    const { EVOLUTION_API_URL: u, EVOLUTION_API_KEY: k, EVOLUTION_INSTANCE_NAME: i } = process.env;
    if (!u || !k || !i) return { estado: "erro", resumo: "Evolution não configurado", detalhes: [] };
    const [c, w] = await Promise.all([
      fetch(`${u}/instance/connectionState/${i}`, { headers: { apikey: k }, signal: AbortSignal.timeout(T) }).then((r) => r.json()).catch(() => null),
      fetch(`${u}/webhook/find/${i}`, { headers: { apikey: k }, signal: AbortSignal.timeout(T) }).then((r) => r.json()).catch(() => null),
    ]);
    const estado = c?.instance?.state ?? c?.state ?? "?";
    const hook = String(w?.url ?? ""), hookOk = !!w?.enabled && hook.includes("/api/whatsapp/webhook");
    const ult = lerJson<{ em: string }>(path.join(vault(), ".jobs", "estado", "whatsapp-entrada.json"));
    return { estado: estado !== "open" ? "erro" : !hookOk ? "atencao" : "ok", resumo: `instância ${estado} · webhook ${hookOk ? "aponta para o Nipëi" : "NÃO aponta para o Nipëi"}`, detalhes: [`instância ${i}`, `última mensagem recebida ${ult ? haQuanto(ult.em) : "—"}`] };
  }),
  () => medir("google", "Contas", "Google (OAuth, Drive, Calendar, Gmail)", async () => {
    if (!googleConfigurado()) return { estado: "erro", resumo: "GOOGLE_CLIENT_ID/SECRET não configurados", detalhes: [] };
    const gs = pessoasConectadas().map((p) => ({ p, g: getConexoes(p).google })).filter((x) => x.g);
    const errosBackup = gs.filter((x) => x.g?.backup?.erro);
    const velhos = gs.filter((x) => !x.g?.backup?.ultimoEm || idade(x.g.backup.ultimoEm) > 30 * 60);
    return {
      estado: errosBackup.length ? "atencao" : "ok", resumo: `${gs.length} conta(s) · ${gs.filter((x) => temGmail(x.g)).length} com Gmail`,
      detalhes: gs.map((x) => `${x.p}: cópia ${x.g!.backup?.ultimoEm ? haQuanto(x.g!.backup.ultimoEm) : "nunca"}${x.g!.backup?.erro ? ` — erro: ${x.g!.backup.erro}` : ""}`).concat(velhos.length ? [`${velhos.length} sem cópia nas últimas 30 h`] : []),
    };
  }),
  () => medir("mcp", "Contas", "Apps de IA conectados (MCP)", async () => {
    const g = lerJson<{ pessoa: string; nomeCliente: string; usadoEm: string }[]>(path.join(vault(), ".jobs", "oauth", "concessoes.json")) ?? [];
    return { estado: g.length ? "ok" : "sem_dados", resumo: `${g.length} conexão(ões) ativa(s)`, detalhes: g.map((x) => `${x.pessoa} · ${x.nomeCliente} · uso ${haQuanto(x.usadoEm)}`) };
  }),
  () => medir("auth", "Segurança", "Login e segredos", async () => {
    const faltam = ["NIPEI_AUTH_SECRET", "NIPEI_CONEXOES_KEY", "NIPEI_WHATSAPP_WEBHOOK_SECRET", "NIPEI_ADMINS"].filter((k) => !process.env[k]);
    const pend = semHash();
    return {
      estado: faltam.length ? "erro" : pend.length ? "atencao" : "ok",
      resumo: faltam.length ? `faltam: ${faltam.join(", ")}` : pend.length ? `${pend.length} pessoa(s) ainda com a senha antiga do .env` : "segredos ok · todas as senhas com hash",
      detalhes: pend.length ? [`ainda não entraram com senha desde a v2.51: ${pend.join(", ")}`, "quando todos entrarem, dá para tirar NIPEI_OS_USERS do .env"] : [],
    };
  }),
];

let cache: { em: number; dados: Checagem[] } | null = null;
/** All checks in parallel; cached for a minute unless forced. */
export async function checarTudo(forcar = false): Promise<{ em: number; dados: Checagem[] }> {
  if (!forcar && cache && Date.now() - cache.em < 60_000) return cache;
  cache = { em: Date.now(), dados: await Promise.all(CHECAGENS.map((c) => c())) };
  return cache;
}
