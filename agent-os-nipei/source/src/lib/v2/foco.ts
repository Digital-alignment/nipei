import fs from "fs";
import path from "path";
import { vault } from "./data";

// Foco de hoje: up to 3 tasks a person commits to today. <vault>/.jobs/foco/<pessoa>.json = { dia, ids };
// a new day starts empty (the Hoje page then suggests the first 3 of the smart order).

export const MAX_FOCO = 3;
const ARQ = (id: string) => path.join(vault(), ".jobs", "foco", `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

export function getFoco(pessoa: string, hoje: string): string[] {
  try {
    const f = JSON.parse(fs.readFileSync(ARQ(pessoa), "utf-8"));
    return f.dia === hoje && Array.isArray(f.ids) ? f.ids.slice(0, MAX_FOCO) : [];
  } catch { return []; }
}

export function salvarFoco(pessoa: string, hoje: string, ids: string[]) {
  fs.mkdirSync(path.dirname(ARQ(pessoa)), { recursive: true });
  fs.writeFileSync(ARQ(pessoa), JSON.stringify({ dia: hoje, ids: [...new Set(ids)].slice(0, MAX_FOCO) }), "utf-8");
}
