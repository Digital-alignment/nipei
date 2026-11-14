import fs from "fs";
import path from "path";
import { vault } from "./data";

// Foco de hoje: up to 3 tasks a person commits to today. <vault>/.jobs/foco/<pessoa>.json = { dia, ids };
// a new day starts empty (the Hoje page then suggests the first 3 of the smart order).

export const MAX_FOCO = 3;
const ARQ = (id: string) => path.join(vault(), ".jobs", "foco", `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

// `amanha` = { dia, ids }: the focus chosen the evening before (day close); on that day it becomes the day's focus.
type Arquivo = { dia?: string; ids?: string[]; amanha?: { dia: string; ids: string[] } };
const ler = (pessoa: string): Arquivo => { try { return JSON.parse(fs.readFileSync(ARQ(pessoa), "utf-8")); } catch { return {}; } };
const gravar = (pessoa: string, f: Arquivo) => {
  fs.mkdirSync(path.dirname(ARQ(pessoa)), { recursive: true });
  fs.writeFileSync(ARQ(pessoa), JSON.stringify(f), "utf-8");
};
const lista = (ids: unknown) => (Array.isArray(ids) ? ids.map(String).slice(0, MAX_FOCO) : []);

export function getFoco(pessoa: string, hoje: string): string[] {
  const f = ler(pessoa);
  if (f.dia === hoje) return lista(f.ids);
  return f.amanha?.dia === hoje ? lista(f.amanha.ids) : [];
}
export const getFocoAmanha = (pessoa: string, amanha: string) => { const f = ler(pessoa); return f.amanha?.dia === amanha ? lista(f.amanha.ids) : []; };

export function salvarFoco(pessoa: string, hoje: string, ids: string[]) {
  gravar(pessoa, { ...ler(pessoa), dia: hoje, ids: [...new Set(ids)].slice(0, MAX_FOCO) });
}
export function salvarFocoAmanha(pessoa: string, amanha: string, ids: string[]) {
  gravar(pessoa, { ...ler(pessoa), amanha: { dia: amanha, ids: [...new Set(ids)].slice(0, MAX_FOCO) } });
}
