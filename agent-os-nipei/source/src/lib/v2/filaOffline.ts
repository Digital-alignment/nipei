// Changes made without signal (status, due date) wait on the device and are sent when it's back.
// Client-only (localStorage); each entry is replayed through the normal server actions.

export type Pendente = { tipo: "status" | "prazo"; id: string; valor: string; em: number };
const CHAVE = "nipei:fila";
const EVENTO = "nipei:fila";

export function pendentes(): Pendente[] {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? "[]"); } catch { return []; }
}

function salvar(p: Pendente[]) {
  try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new Event(EVENTO));
}

/** Last change per task and kind wins (tapping done twice offline must not send two toggles). */
export function enfileirar(x: Omit<Pendente, "em">) {
  salvar([...pendentes().filter((p) => !(p.id === x.id && p.tipo === x.tipo)), { ...x, em: Date.now() }]);
}

export const offline = () => typeof navigator !== "undefined" && !navigator.onLine;
export const aoMudarFila = (fn: () => void) => { window.addEventListener(EVENTO, fn); return () => window.removeEventListener(EVENTO, fn); };

/** Sends everything queued; keeps what failed. Returns how many were sent. */
export async function enviarFila(acoes: { status: (f: FormData) => Promise<unknown>; prazo: (f: FormData) => Promise<unknown> }) {
  let enviados = 0;
  const resto: Pendente[] = [];
  for (const p of pendentes()) {
    const f = new FormData();
    f.set("id", p.id);
    f.set(p.tipo === "status" ? "status" : "prazo", p.valor);
    try { await acoes[p.tipo](f); enviados++; } catch { resto.push(p); }
  }
  salvar(resto);
  return enviados;
}
