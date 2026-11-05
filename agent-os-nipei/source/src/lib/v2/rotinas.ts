import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { defaultVault } from "@/lib/config";
import type { Equipe, Evento, Pessoa } from "./data";

// Team routines (plan equipes, fase 3): procedures (DS 10.17), the fixed-meeting reminder (DS 10.16)
// and "where I am this week" (DS 10.18). Business data lives in the vault; run state in <vault>/.jobs/.

const VAULT = () => defaultVault() ?? "";
const sem = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const somar = (dia: string, n: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** 1 = Monday … 7 = Sunday */
export const diaSemana = (dia: string) => ((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
export const segunda = (dia: string) => somar(dia, 1 - diaSemana(dia));

// ---------------------------------------------------------------- procedures (Equipes/_procedimentos/<id>.md)

export const GATILHOS = ["manual", "semanal", "evento"] as const;
export type Procedimento = {
  id: string; titulo: string; equipe: string; gatilho: (typeof GATILHOS)[number]; dia: number; antesDias: number; eventoContem: string;
  responsavel: string; passos: string[]; arquivado: boolean;
};
const DIR_PROC = () => path.join(VAULT(), "Equipes", "_procedimentos");

export function getProcedimentos(): Procedimento[] {
  if (!fs.existsSync(DIR_PROC())) return [];
  return fs.readdirSync(DIR_PROC()).filter((f) => f.endsWith(".md")).flatMap((f) => {
    const m = fs.readFileSync(path.join(DIR_PROC(), f), "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    try {
      const fm = (m && (yaml.load(m[1]) as Record<string, unknown>)) || {};
      const s = (k: string) => (fm[k] == null ? "" : String(fm[k]).trim());
      const g = s("gatilho");
      return [{
        id: s("id") || f.replace(/\.md$/, ""), titulo: s("titulo"), equipe: s("equipe"), gatilho: (GATILHOS as readonly string[]).includes(g) ? g as Procedimento["gatilho"] : "manual",
        dia: Number(fm.dia) || 1, antesDias: Number(fm.antes_dias) || 0, eventoContem: s("evento_contem"), responsavel: s("responsavel"),
        passos: Array.isArray(fm.passos) ? fm.passos.map(String).filter(Boolean) : [], arquivado: fm.arquivado === true,
      }];
    } catch { return []; }
  }).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
}

export function salvarProcedimento(p: Omit<Procedimento, "id"> & { id?: string }) {
  fs.mkdirSync(DIR_PROC(), { recursive: true });
  const slug = sem(p.titulo).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "procedimento";
  let id = p.id || `${p.equipe}-${slug}`;
  if (!p.id) for (let i = 2; fs.existsSync(path.join(DIR_PROC(), `${id}.md`)); i++) id = `${p.equipe}-${slug}-${i}`;
  const fm = { id, titulo: p.titulo, equipe: p.equipe, gatilho: p.gatilho, dia: p.dia, antes_dias: p.antesDias, evento_contem: p.eventoContem, responsavel: p.responsavel, passos: p.passos, arquivado: p.arquivado, updated_at: new Date().toISOString() };
  fs.writeFileSync(path.join(DIR_PROC(), `${id}.md`), `---\n${yaml.dump(fm, { lineWidth: -1 })}---\n\n<!-- agente: nipei-os v2 (procedimento da equipe) -->\n# ${p.titulo}\n`, "utf-8");
  try { fs.writeFileSync(path.join(VAULT(), ".sync-request"), new Date().toISOString()); } catch { /* sync is best effort */ }
  return id;
}

/** What should become a task now: weekly ones on their weekday, event ones N days before/after an event
 *  (looks back 3 days so a day nobody opened the app is not lost). `chave` = never twice. Pure. */
export function vencidos(procs: Procedimento[], eventos: Evento[], hoje: string) {
  const out: { p: Procedimento; chave: string; dia: string; evento?: Evento }[] = [];
  for (const p of procs.filter((x) => !x.arquivado && x.passos.length)) {
    for (let k = 0; k < 3; k++) {
      const dia = somar(hoje, -k);
      if (p.gatilho === "semanal" && diaSemana(dia) === p.dia) out.push({ p, chave: `s:${dia}`, dia });
      if (p.gatilho === "evento") for (const ev of eventos) {
        if (ev.inicio.length !== 10 || somar(ev.inicio, -p.antesDias) !== dia) continue;
        if (p.eventoContem ? !sem(ev.titulo).includes(sem(p.eventoContem)) : ev.equipe !== p.equipe) continue;
        out.push({ p, chave: `e:${ev.id}`, dia, evento: ev });
      }
    }
  }
  return out;
}

const ESTADO_PROC = () => path.join(VAULT(), ".jobs", "procedimentos.json");
let rodandoProc = false;
/** Lazy, from the v2 layout (production only): turns due procedures into team tasks. */
export async function rodarProcedimentos() {
  if (rodandoProc || process.env.NODE_ENV !== "production") return;
  rodandoProc = true;
  try {
    const { createTarefa, getEventos, today } = await import("./data");
    let feitos: Record<string, string[]> = {};
    try { feitos = JSON.parse(fs.readFileSync(ESTADO_PROC(), "utf-8")); } catch { /* first run */ }
    const novos = vencidos(getProcedimentos(), getEventos(), today()).filter((v) => !(feitos[v.p.id] ?? []).includes(v.chave));
    for (const v of novos) {
      feitos[v.p.id] = [...(feitos[v.p.id] ?? []), v.chave].slice(-60);
      fs.mkdirSync(path.dirname(ESTADO_PROC()), { recursive: true });
      fs.writeFileSync(ESTADO_PROC(), JSON.stringify(feitos)); // before creating: never twice
      gerarTarefa(createTarefa, v.p, v.dia, v.evento);
    }
  } finally { rodandoProc = false; }
}

type CriarTarefa = typeof import("./data").createTarefa;
export function gerarTarefa(createTarefa: CriarTarefa, p: Procedimento, prazo: string, evento?: Evento, actor = "Procedimento") {
  return createTarefa({ title: evento ? `${p.titulo} · ${evento.titulo}` : p.titulo, equipe: p.equipe, prazo, responsaveis: p.responsavel ? [p.responsavel] : [], projeto: "", objetivo: "", recorrencia: "" },
    actor, { checklist: p.passos.map((texto) => ({ feito: false, texto })), descricao: `Gerada pelo procedimento "${p.titulo}" da equipe.` });
}

// ---------------------------------------------------------------- fixed meeting reminder (the day before)

const ESTADO_REUNIAO = () => path.join(VAULT(), ".jobs", "lembrete-reuniao.json");
let rodandoReuniao = false;
/** Once a day from 17h (Bahia): WhatsApp to the coordination of each team that meets tomorrow. Production only. */
export async function lembreteReuniao() {
  if (rodandoReuniao || process.env.NODE_ENV !== "production") return;
  const agora = new Date().toLocaleString("sv-SE", { timeZone: "America/Bahia" });
  const hoje = agora.slice(0, 10), h = agora.slice(11, 13);
  if (h < "17" || h >= "21") return;
  let ultimo = "";
  try { ultimo = JSON.parse(fs.readFileSync(ESTADO_REUNIAO(), "utf-8")).dia ?? ""; } catch { /* first time */ }
  if (ultimo >= hoje) return;
  rodandoReuniao = true;
  try {
    fs.mkdirSync(path.dirname(ESTADO_REUNIAO()), { recursive: true });
    fs.writeFileSync(ESTADO_REUNIAO(), JSON.stringify({ dia: hoje }));
    const { getEquipes, getPessoas } = await import("./data");
    const { enviarWhatsApp } = await import("./whatsapp");
    const amanha = diaSemana(somar(hoje, 1)), pessoas = getPessoas();
    for (const e of getEquipes().filter((x) => x.reuniao.dia === amanha && !x.contatos))
      for (const p of avisados(e, pessoas))
        await enviarWhatsApp(p.whatsapp, `Amanhã${e.reuniao.hora ? ` às ${e.reuniao.hora}` : ""} tem a reunião da ${e.nome}. Pauta ao vivo: https://os.nipeihu.app/equipes/${e.id}/reuniao`).catch(() => false);
  } finally { rodandoReuniao = false; }
}
const avisados = (e: Equipe, ps: Pessoa[]) => ps.filter((p) => e.coordenadores.includes(p.id) && p.whatsapp && p.whatsappVerificado && p.avisosWhatsapp && !p.suspenso);

// ---------------------------------------------------------------- welcome to the team (DS 10.20)

/** Short WhatsApp with the team link when someone joins a team that can log in. Production only. */
export async function avisarBoasVindas(pessoaId: string, equipeId: string) {
  if (process.env.NODE_ENV !== "production") return;
  const { getEquipes, getPessoas } = await import("./data");
  const { enviarWhatsApp } = await import("./whatsapp");
  const { pt, en } = await import("./i18n").then((m) => ({ pt: m.dicionario("pt"), en: m.dicionario("en") }));
  const e = getEquipes().find((x) => x.id === equipeId), p = getPessoas().find((x) => x.id === pessoaId);
  if (!e || !p || e.contatos || !e.acesso || !p.whatsapp || !p.whatsappVerificado || !p.avisosWhatsapp || p.suspenso) return;
  const t = p.idioma === "en" ? en : pt;
  await enviarWhatsApp(p.whatsapp, t.ec.whats.replace("{nome}", p.name.split(/[\s(]/)[0]).replace("{equipe}", e.nome).replace("{link}", "https://os.nipeihu.app/hoje"));
}

// ---------------------------------------------------------------- where I am this week (Presenca/<monday>.md)

export const ESTADOS_PRESENCA = ["", "s", "r", "f"] as const; // — · Santuário · Remoto · Fora (tap cycles in this order)
export type Presenca = Record<string, string[]>; // pessoa → 7 states, Monday first
const ARQ_PRESENCA = (semana: string) => path.join(VAULT(), "Presenca", `${semana}.md`);

export function getPresenca(semana: string): Presenca {
  try {
    const m = fs.readFileSync(ARQ_PRESENCA(semana), "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const fm = (m && (yaml.load(m[1]) as Record<string, unknown>)) || {};
    const out: Presenca = {};
    for (const [k, v] of Object.entries((fm.pessoas as Record<string, unknown>) ?? {})) out[k] = normalizar(Array.isArray(v) ? v.map(String) : []);
    return out;
  } catch { return {}; }
}
const normalizar = (d: string[]) => Array.from({ length: 7 }, (_, i) => ((ESTADOS_PRESENCA as readonly string[]).includes(d[i] ?? "") ? d[i] : ""));

export function setPresenca(semana: string, pessoa: string, dias: string[]) {
  const atual = getPresenca(semana);
  atual[pessoa] = normalizar(dias);
  fs.mkdirSync(path.dirname(ARQ_PRESENCA(semana)), { recursive: true });
  fs.writeFileSync(ARQ_PRESENCA(semana), `---\n${yaml.dump({ semana, pessoas: atual }, { lineWidth: -1, flowLevel: 2 })}---\n\n<!-- agente: nipei-os v2 (onde cada pessoa está na semana: s = Santuário, r = remoto, f = fora) -->\n`, "utf-8");
  try { fs.writeFileSync(path.join(VAULT(), ".sync-request"), new Date().toISOString()); } catch { /* best effort */ }
}

/** Next state when a day is tapped. */
export const proximoEstado = (x: string) => ESTADOS_PRESENCA[(ESTADOS_PRESENCA.indexOf(x as never) + 1) % ESTADOS_PRESENCA.length];

// self-check: npx tsx src/lib/v2/rotinas.ts
if (typeof process !== "undefined" && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/v2/rotinas.ts")) {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error(m); };
  assert(diaSemana("2026-11-02") === 1 && diaSemana("2026-11-08") === 7 && segunda("2026-11-05") === "2026-11-02", "dias da semana");
  const base = { id: "", titulo: "", equipe: "equipe_3", gatilho: "manual" as const, dia: 1, antesDias: 0, eventoContem: "", responsavel: "", passos: ["a"], arquivado: false };
  const procs: Procedimento[] = [
    { ...base, id: "seg", gatilho: "semanal", dia: 1 },
    { ...base, id: "checkin", gatilho: "evento", antesDias: 1, eventoContem: "retiro", equipe: "equipe_4" },
    { ...base, id: "contas", gatilho: "evento", antesDias: -7, eventoContem: "Retiro" },
    { ...base, id: "vazio", gatilho: "semanal", dia: 4, passos: [] },
    { ...base, id: "arq", gatilho: "semanal", dia: 4, arquivado: true },
  ];
  const ev = (id: string, titulo: string, inicio: string): Evento => ({ id, file: "", titulo, inicio, fim: "", status: "confirmado", equipe: "equipe_3", hora: "" });
  const evs = [ev("r1", "Retiro Lynn", "2026-11-06"), ev("r2", "Retiro Luz", "2026-10-29"), ev("x", "Reunião", "2026-11-06"), ev("m", "Retiro mês", "2026-11")];
  const v = vencidos(procs, evs, "2026-11-05"); // Thursday; looks back to Tuesday
  const ids = v.map((x) => `${x.p.id}:${x.chave}`).sort();
  assert(JSON.stringify(ids) === JSON.stringify(["checkin:e:r1", "contas:e:r2"].sort()), `vencidos: ${ids}`);
  assert(vencidos(procs, [], "2026-11-03").some((x) => x.p.id === "seg" && x.chave === "s:2026-11-02"), "semanal recupera segunda");
  assert(proximoEstado("") === "s" && proximoEstado("f") === "", "ciclo de presença");
  console.log("rotinas: ok");
}
