// The Pinu's summary of the day (DS 10.5.1, phase 3): generated only when the person taps "Resumo do dia", kept for that
// day in <vault>/.jobs/assistente/resumos/<pessoa>.json (out of git), so opening Hoje again costs no AI call.

import fs from "fs";
import path from "path";
import { defaultVault } from "../config";

export type ResumoDia = { dia: string; em: string; texto: string };
const arq = (pessoa: string) => path.join(defaultVault()!, ".jobs", "assistente", "resumos", `${pessoa.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);

/** Today's summary of this person, or null (another day's summary doesn't count). */
export function getResumoDia(pessoa: string, dia: string): ResumoDia | null {
  try { const r = JSON.parse(fs.readFileSync(arq(pessoa), "utf-8")) as ResumoDia; return r.dia === dia && r.texto ? r : null; } catch { return null; }
}

export function salvarResumoDia(pessoa: string, dia: string, texto: string) {
  fs.mkdirSync(path.dirname(arq(pessoa)), { recursive: true });
  fs.writeFileSync(arq(pessoa), JSON.stringify({ dia, em: new Date().toISOString(), texto } satisfies ResumoDia));
}
