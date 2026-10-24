import fs from "fs";
import path from "path";
import { vault } from "./data";

// Time of use: while a page is visible and the person moved in the last 2 minutes, the browser sends a
// pulse once a minute (components/v2/PulsoUso.tsx → /api/uso). Each pulse = 1 minute for that person and
// section, in <vault>/.jobs/uso/AAAA-MM.json: { "2026-10-24": { "ashuan_web": { "hoje": 12, ... } } }.
// Pulses closer than 50 s for the same person are ignored (two open tabs don't count double).

export const SECOES: Record<string, string> = {
  hoje: "Hoje", agenda: "Agenda", equipes: "Equipes", pessoas: "Pessoas", projetos: "Projetos", objetivos: "Objetivos", tarefas: "Tarefas",
  conhecimento: "Conhecimento", acervo: "Acervo", financas: "Finanças", eventos: "Eventos", diagnosticos: "Diagnósticos", pulso: "Pulso", controle: "Painel",
};
type Mes = Record<string, Record<string, Record<string, number>>>;

const arq = (mes: string) => path.join(vault(), ".jobs", "uso", `${mes}.json`);
const ler = (mes: string): Mes => { try { return JSON.parse(fs.readFileSync(arq(mes), "utf-8")); } catch { return {}; } };
const diaBahia = (d = new Date()) => d.toLocaleString("sv-SE", { timeZone: "America/Bahia" }).slice(0, 10);
const ultimo = new Map<string, number>();

export function contarMinuto(pessoa: string, caminho: string) {
  const agora = Date.now();
  if (agora - (ultimo.get(pessoa) ?? 0) < 50_000) return false;
  ultimo.set(pessoa, agora);
  const seg = caminho.split("/").filter(Boolean)[0] ?? "hoje";
  const secao = SECOES[seg] ? seg : "outros";
  const dia = diaBahia(), mes = dia.slice(0, 7), d = ler(mes);
  ((d[dia] ??= {})[pessoa] ??= {})[secao] = (d[dia][pessoa][secao] ?? 0) + 1;
  fs.mkdirSync(path.dirname(arq(mes)), { recursive: true });
  fs.writeFileSync(arq(mes), JSON.stringify(d), { encoding: "utf-8", mode: 0o600 });
  return true;
}

/** Minutes per day / person / section for the last `dias` days (Bahia days). */
export function usoPeriodo(dias: number): { dia: string; pessoa: string; secao: string; min: number }[] {
  const desde = diaBahia(new Date(Date.now() - (dias - 1) * 86_400_000));
  const meses = new Set<string>();
  for (let i = 0; i < dias; i += 15) meses.add(diaBahia(new Date(Date.now() - i * 86_400_000)).slice(0, 7));
  meses.add(desde.slice(0, 7)); meses.add(diaBahia().slice(0, 7));
  const out: { dia: string; pessoa: string; secao: string; min: number }[] = [];
  for (const m of meses) for (const [dia, ps] of Object.entries(ler(m))) if (dia >= desde) for (const [pessoa, ss] of Object.entries(ps)) for (const [secao, min] of Object.entries(ss)) out.push({ dia, pessoa, secao, min });
  return out;
}
